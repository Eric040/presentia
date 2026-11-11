<?php

namespace App\Http\Controllers;

use App\Enums\AnomalyStatus;
use App\Enums\PingDeliverability;
use App\Enums\PingResult;
use App\Enums\Role;
use App\Models\Anomaly;
use App\Models\PresencePing;
use App\Models\User;
use App\Models\WorkZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PresencePingController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = PresencePing::with('user');

        if (! $user->can('viewAny', PresencePing::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(Role::Manager)) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                    ->orWhere('manager_id', $user->id);
            });
        }

        if ($request->filled('result')) {
            $query->where('result', $request->result);
        }

        if ($request->filled('date_from')) {
            $query->where('sent_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('sent_at', '<=', $request->date_to);
        }

        $pings = $query->orderBy('sent_at', 'desc')->get();

        $stats = [
            'total'         => $pings->count(),
            'pending'       => $pings->whereNull('responded_at')->where('deliverability', PingDeliverability::Sent)->count(),
            'responded'     => $pings->whereNotNull('responded_at')->count(),
            'undeliverable' => $pings->where('deliverability', PingDeliverability::Undeliverable)->count(),
        ];

        // Serialize to a shape the frontend understands
        $serialized = $pings->map(fn ($p) => [
            'id'            => $p->id,
            'user'          => ['id' => $p->user->id, 'name' => $p->user->name],
            'sent_at'       => $p->sent_at->toIso8601String(),
            'expires_at'    => $p->expires_at->toIso8601String(),
            'responded_at'  => $p->responded_at?->toIso8601String(),
            'result'        => $p->result?->value,
            'deliverability' => $p->deliverability->value,
            // Computed frontend status
            'status'        => match (true) {
                $p->deliverability === PingDeliverability::Undeliverable => 'undeliverable',
                $p->responded_at !== null                                 => 'responded',
                default                                                   => 'pending',
            },
            'can_respond'   => $p->user_id === $user->id
                && $p->responded_at === null
                && $p->expires_at->gt(now()),
        ]);

        return Inertia::render('pings/index', [
            'pings'  => $serialized,
            'stats'  => $stats,
            'isAdmin' => $user->hasRole(Role::Administrator, Role::Hr),
        ]);
    }

    public function show(PresencePing $ping)
    {
        $this->authorize('view', $ping);

        return $ping->load('user');
    }

    public function respond(Request $request, PresencePing $ping)
    {
        $this->authorize('update', $ping);

        if ($ping->user_id !== Auth::id()) {
            return back()->withErrors(['ping' => 'Vous ne pouvez répondre qu\'à vos propres pings.']);
        }

        if ($ping->responded_at || $ping->expires_at->lt(now())) {
            return back()->withErrors(['ping' => 'Ce ping a déjà expiré ou a déjà reçu une réponse.']);
        }

        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'required|numeric|min:0',
        ]);

        $user     = Auth::user();
        $workZone = $this->getUserWorkZone($user);
        $inZone   = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $result   = $inZone ? PingResult::InZone : PingResult::OutOfZone;

        $ping->forceFill([
            'responded_at' => now(),
            'result'       => $result,
        ])->save();

        if ($result === PingResult::OutOfZone) {
            $this->createAnomaly($ping, 'ping_out_of_zone', 'Hors zone lors du ping de présence');
        }

        return back();
    }

    public function sendPing(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = Auth::user();
        if (! $user->hasRole(Role::Administrator, Role::Hr)) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $targetUser = User::find($validated['user_id']);

        $expiresAt = now()->addMinutes(10);

        $ping = PresencePing::create([
            'user_id' => $targetUser->id,
            'sent_at' => now(),
            'expires_at' => $expiresAt,
            'deliverability' => PingDeliverability::Sent,
        ]);

        return response()->json($ping, 201);
    }

    public function checkExpired()
    {
        $expiredPings = PresencePing::whereNull('responded_at')
            ->where('expires_at', '<', now())
            ->whereNull('result')
            ->get();

        foreach ($expiredPings as $ping) {
            $ping->update(['result' => PingResult::NoResponse]);
            $this->createAnomaly($ping, 'ping', 'Ping sans réponse');
        }

        return response()->json(['processed' => $expiredPings->count()]);
    }

    public function markUndeliverable(PresencePing $ping)
    {
        $this->authorize('update', $ping);

        if (! $ping->user->hasActivePushSubscription()) {
            $ping->forceFill(['deliverability' => PingDeliverability::Undeliverable])->save();
            $this->createAnomaly($ping, 'ping_undeliverable', 'Ping non délivrable (abonnement push inactif)');

            return back();
        }

        return back()->withErrors(['ping' => 'L\'utilisateur a un abonnement push actif.']);
    }

    private function getUserWorkZone($user): ?WorkZone
    {
        return $user->workZones()->where('active', true)->first();
    }

    private function isInZone(float $lat, float $lng, ?WorkZone $zone): bool
    {
        if (! $zone) {
            return false;
        }

        $earthRadius = 6371000;
        $latFrom = deg2rad($lat);
        $lonFrom = deg2rad($lng);
        $latTo = deg2rad($zone->latitude);
        $lonTo = deg2rad($zone->longitude);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $a = sin($latDelta / 2) * sin($latDelta / 2) +
             cos($latFrom) * cos($latTo) *
             sin($lonDelta / 2) * sin($lonDelta / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $distance = $earthRadius * $c;

        return $distance <= $zone->radius_m;
    }

    private function createAnomaly(PresencePing $ping, string $type, string $description): void
    {
        Anomaly::create([
            'user_id' => $ping->user_id,
            'type' => $type,
            'date' => $ping->sent_at->toDateString(),
            'reference_type' => 'ping',
            'reference_id' => $ping->id,
            'status' => AnomalyStatus::ToProcess,
        ]);
    }
}
