<?php

namespace App\Http\Controllers;

use App\Models\PresencePing;
use App\Models\Anomaly;
use App\Models\WorkZone;
use App\Enums\PingResult;
use App\Enums\PingDeliverability;
use App\Enums\AnomalyStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class PresencePingController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = PresencePing::with('user');

        if (!$user->can('viewAny', PresencePing::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(\App\Enums\Role::Manager)) {
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

        return $query->orderBy('sent_at', 'desc')->paginate(20);
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
            return response()->json(['message' => 'Vous ne pouvez répondre qu\'à vos propres pings'], 403);
        }

        if ($ping->responded_at || $ping->expires_at->lt(now())) {
            return response()->json(['message' => 'Ce ping a déjà expiré ou a déjà reçu une réponse'], 400);
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric|min:0',
        ]);

        $user = Auth::user();
        $workZone = $this->getUserWorkZone($user);
        $inZone = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);

        $result = $inZone ? PingResult::InZone : PingResult::OutOfZone;

        $ping->update([
            'responded_at' => now(),
            'result' => $result,
        ]);

        if ($result === PingResult::OutOfZone) {
            $this->createAnomaly($ping, 'ping', 'Hors zone lors du ping de présence');
        }

        return response()->json($ping);
    }

    public function sendPing(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $user = Auth::user();
        if (!$user->hasRole(\App\Enums\Role::Administrator, \App\Enums\Role::Hr)) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $targetUser = \App\Models\User::find($validated['user_id']);

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

        if (!$ping->user->hasActivePushSubscription()) {
            $ping->update(['deliverability' => PingDeliverability::Undeliverable]);
            $this->createAnomaly($ping, 'ping', 'Ping non délivrable (abonnement push inactif)');
            return response()->json($ping);
        }

        return response()->json(['message' => 'L\'utilisateur a un abonnement push actif'], 400);
    }

    private function getUserWorkZone($user): ?WorkZone
    {
        return $user->workZones()->where('active', true)->first();
    }

    private function isInZone(float $lat, float $lng, ?WorkZone $zone): bool
    {
        if (!$zone) {
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
