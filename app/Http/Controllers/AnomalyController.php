<?php

namespace App\Http\Controllers;

use App\Enums\AnomalyStatus;
use App\Enums\Role;
use App\Models\ActivityLog;
use App\Models\Anomaly;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AnomalyController extends Controller
{
    private const TYPE_LABELS = [
        'ping_out_of_zone'   => 'Hors zone (ping)',
        'ping_no_response'   => 'Ping sans réponse',
        'ping_undeliverable' => 'Ping non délivrable',
        'ping'               => 'Ping',
        'session_incomplete' => 'Session incomplète',
        'absence'            => 'Absence',
    ];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Anomaly::class);

        $user = $request->user();

        $anomalies = Anomaly::query()
            ->with('user:id,name', 'processor:id,name')
            ->when(! $user->hasRole(Role::Administrator, Role::Hr), function ($query) use ($user) {
                $ids = $user->hasRole(Role::Manager)
                    ? $user->team()->pluck('id')->push($user->id)
                    : collect([$user->id]);
                $query->whereIn('user_id', $ids);
            })
            ->when(
                AnomalyStatus::tryFrom((string) $request->query('status')),
                fn ($query, $status) => $query->where('status', $status)
            )
            ->latest('date')
            ->get();

        $stats = [
            'total'     => $anomalies->count(),
            'pending'   => $anomalies->where('status', AnomalyStatus::ToProcess)->count(),
            'justified' => $anomalies->whereNotNull('justification')->count(),
            'processed' => $anomalies->whereIn('status', [AnomalyStatus::Validated, AnomalyStatus::Rejected])->count(),
        ];

        $serialized = $anomalies->map(fn ($a) => [
            'id'            => $a->id,
            'user'          => $a->user ? ['id' => $a->user->id, 'name' => $a->user->name] : null,
            'type'          => $a->type,
            'type_label'    => self::TYPE_LABELS[$a->type] ?? $a->type,
            'date'          => $a->date->toDateString(),
            'status'        => $a->status->value,
            'justification' => $a->justification,
            'processor'     => $a->processor
                ? ['id' => $a->processor->id, 'name' => $a->processor->name]
                : null,
            'can_justify'   => $a->status === AnomalyStatus::ToProcess
                && $a->user_id === $user->id,
            'can_process'   => $a->status === AnomalyStatus::ToProcess
                && $a->user_id !== $user->id
                && $user->can('process', $a),
        ]);

        return Inertia::render('anomalies/index', [
            'anomalies' => $serialized,
            'stats'     => $stats,
            'filters'   => $request->only('status'),
        ]);
    }

    public function show(Anomaly $anomaly): Response
    {
        Gate::authorize('view', $anomaly);

        $anomaly->load('user:id,name', 'processor:id,name');

        return Inertia::render('anomalies/show', [
            'anomaly' => [
                'id'            => $anomaly->id,
                'user'          => $anomaly->user ? ['id' => $anomaly->user->id, 'name' => $anomaly->user->name] : null,
                'type'          => $anomaly->type,
                'type_label'    => self::TYPE_LABELS[$anomaly->type] ?? $anomaly->type,
                'date'          => $anomaly->date->toDateString(),
                'status'        => $anomaly->status->value,
                'justification' => $anomaly->justification,
                'processor'     => $anomaly->processor
                    ? ['id' => $anomaly->processor->id, 'name' => $anomaly->processor->name]
                    : null,
                'processed_at'  => $anomaly->processed_at?->toIso8601String(),
            ],
        ]);
    }

    public function justify(Request $request, Anomaly $anomaly): RedirectResponse
    {
        Gate::authorize('update', $anomaly);

        abort_unless($anomaly->status === AnomalyStatus::ToProcess, 422);

        $anomaly->update($request->validate([
            'justification' => ['required', 'string', 'max:1000'],
        ]));

        ActivityLog::record('anomaly.justified', $anomaly, null, ['justified' => true]);

        return back();
    }

    public function process(Request $request, Anomaly $anomaly): RedirectResponse
    {
        Gate::authorize('process', $anomaly);

        abort_if($anomaly->user_id === $request->user()->id, 403);
        abort_unless($anomaly->status === AnomalyStatus::ToProcess, 422);

        $data = $request->validate([
            'decision' => ['required', Rule::in([AnomalyStatus::Validated->value, AnomalyStatus::Rejected->value])],
        ]);

        $anomaly->status       = AnomalyStatus::from($data['decision']);
        $anomaly->processed_by = $request->user()->id;
        $anomaly->processed_at = now();
        $anomaly->save();

        ActivityLog::record(
            'anomaly.processed',
            $anomaly,
            ['status' => AnomalyStatus::ToProcess->value],
            ['status' => $data['decision']],
        );

        return back();
    }
}
