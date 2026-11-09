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
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Anomaly::class);

        $user = $request->user();

        $anomalies = Anomaly::query()
            ->with('user:id,name')
            ->when(! $user->hasRole(Role::Administrator, Role::Hr), function ($query) use ($user) {
                $ids = $user->hasRole(Role::Manager)
                    ? $user->team()->pluck('id')->push($user->id)
                    : [$user->id];

                $query->whereIn('user_id', $ids);
            })
            ->when(
                AnomalyStatus::tryFrom((string) $request->query('status')),
                fn ($query, $status) => $query->where('status', $status)
            )
            ->latest('date')
            ->get();

        $stats = [
            'total' => $anomalies->count(),
            'pending' => $anomalies->where('status', AnomalyStatus::ToProcess)->count(),
            'justified' => $anomalies->whereNotNull('justification')->count(),
            'processed' => $anomalies->whereIn('status', [AnomalyStatus::Validated, AnomalyStatus::Rejected])->count(),
        ];

        return Inertia::render('anomalies/index', [
            'anomalies' => $anomalies,
            'stats' => $stats,
        ]);
    }

    public function show(Anomaly $anomaly): Response
    {
        Gate::authorize('view', $anomaly);

        return Inertia::render('anomalies/show', [
            'anomaly' => $anomaly->load('user:id,name', 'processor:id,name'),
        ]);
    }

    public function justify(Request $request, Anomaly $anomaly): RedirectResponse
    {
        Gate::authorize('update', $anomaly);

        abort_unless($anomaly->status === AnomalyStatus::ToProcess, 422);

        $anomaly->update($request->validate([
            'justification' => ['required', 'string', 'max:1000'],
        ]));

        // Le texte libre reste hors du journal : on trace seulement le fait.
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

        $anomaly->status = AnomalyStatus::from($data['decision']);
        $anomaly->processed_by = $request->user()->id;
        $anomaly->processed_at = now();
        $anomaly->save();

        ActivityLog::record('anomaly.processed', $anomaly, ['status' => AnomalyStatus::ToProcess->value], ['status' => $data['decision']]);

        return back();
    }
}
