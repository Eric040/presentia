<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use App\Models\TimeLog;
use App\Models\WorkZone;
use App\Models\RestDay;
use App\Models\Schedule;
use App\Models\Holiday;
use App\Enums\AttendanceStatus;
use App\Enums\TimeLogType;
use App\Enums\TimeLogFlag;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = AttendanceSession::with(['user', 'timeLogs']);

        if (!$user->can('viewAny', AttendanceSession::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(\App\Enums\Role::Manager)) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                  ->orWhere('manager_id', $user->id);
            });
        }

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $query->orderBy('date', 'desc')->paginate(20);
    }

    public function show(AttendanceSession $session)
    {
        $this->authorize('view', $session);
        return $session->load(['user', 'timeLogs']);
    }

    public function clockIn(Request $request)
    {
        $user = Auth::user();
        $today = Carbon::today();

        $session = AttendanceSession::firstOrCreate(
            ['user_id' => $user->id, 'date' => $today],
            ['status' => AttendanceStatus::InProgress]
        );

        if ($session->arrival && !$session->departure) {
            return response()->json(['message' => 'Vous avez déjà pointé votre arrivée aujourd\'hui'], 400);
        }

        if ($session->departure) {
            return response()->json(['message' => 'Session déjà terminée pour aujourd\'hui'], 400);
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric|min:0',
        ]);

        $workZone = $this->getUserWorkZone($user);
        $inZone = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        $flag = $this->determineFlag($user, $today, $inZone);

        $timeLog = TimeLog::create([
            'session_id' => $session->id,
            'type' => TimeLogType::Arrival,
            'timestamp' => now(),
            'in_zone' => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
            'flag' => $flag,
        ]);

        $session->update(['arrival' => $timeLog->timestamp]);

        $lateMinutes = $this->calculateLateMinutes($user, $timeLog->timestamp);
        if ($lateMinutes > 0) {
            $session->update(['late_minutes' => $lateMinutes]);
        }

        return response()->json($session->load('timeLogs'));
    }

    public function clockOut(Request $request)
    {
        $user = Auth::user();
        $today = Carbon::today();

        $session = AttendanceSession::where('user_id', $user->id)->where('date', $today)->first();

        if (!$session || !$session->arrival) {
            return response()->json(['message' => 'Aucune session en cours pour aujourd\'hui'], 400);
        }

        if ($session->departure) {
            return response()->json(['message' => 'Vous avez déjà pointé votre départ aujourd\'hui'], 400);
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric|min:0',
        ]);

        $workZone = $this->getUserWorkZone($user);
        $inZone = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        $flag = $this->determineFlag($user, $today, $inZone);

        $timeLog = TimeLog::create([
            'session_id' => $session->id,
            'type' => TimeLogType::Departure,
            'timestamp' => now(),
            'in_zone' => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
            'flag' => $flag,
        ]);

        $session->update([
            'departure' => $timeLog->timestamp,
            'status' => $this->determineSessionStatus($session),
        ]);

        return response()->json($session->load('timeLogs'));
    }

    public function startBreak(Request $request)
    {
        $user = Auth::user();
        $today = Carbon::today();

        $session = AttendanceSession::where('user_id', $user->id)->where('date', $today)->first();

        if (!$session || !$session->arrival) {
            return response()->json(['message' => 'Aucune session en cours'], 400);
        }

        $lastLog = $session->timeLogs()->latest()->first();
        if ($lastLog && $lastLog->type === TimeLogType::BreakStart) {
            return response()->json(['message' => 'Pause déjà en cours'], 400);
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric|min:0',
        ]);

        $workZone = $this->getUserWorkZone($user);
        $inZone = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        TimeLog::create([
            'session_id' => $session->id,
            'type' => TimeLogType::BreakStart,
            'timestamp' => now(),
            'in_zone' => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
        ]);

        return response()->json($session->load('timeLogs'));
    }

    public function endBreak(Request $request)
    {
        $user = Auth::user();
        $today = Carbon::today();

        $session = AttendanceSession::where('user_id', $user->id)->where('date', $today)->first();

        if (!$session || !$session->arrival) {
            return response()->json(['message' => 'Aucune session en cours'], 400);
        }

        $lastLog = $session->timeLogs()->latest()->first();
        if (!$lastLog || $lastLog->type !== TimeLogType::BreakStart) {
            return response()->json(['message' => 'Aucune pause en cours'], 400);
        }

        $validated = $request->validate([
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'accuracy' => 'required|numeric|min:0',
        ]);

        $workZone = $this->getUserWorkZone($user);
        $inZone = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        TimeLog::create([
            'session_id' => $session->id,
            'type' => TimeLogType::BreakEnd,
            'timestamp' => now(),
            'in_zone' => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
        ]);

        return response()->json($session->load('timeLogs'));
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

    private function calculateApproxDistance(float $lat, float $lng, ?WorkZone $zone): ?int
    {
        if (!$zone) {
            return null;
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

        return (int) round($distance / 10) * 10;
    }

    private function determineFlag($user, Carbon $date, bool $inZone): ?TimeLogFlag
    {
        $flags = [];

        $isRestDay = RestDay::where('user_id', $user->id)
            ->where('date', $date)
            ->where('status', \App\Enums\RestDayStatus::Approved)
            ->exists();

        if ($isRestDay) {
            $flags[] = TimeLogFlag::WorkedOnRestDay;
        }

        if (!$inZone) {
            $flags[] = TimeLogFlag::OutsideAuthorizedSite;
        }

        $schedule = $this->getUserSchedule($user);
        $now = now();
        if ($schedule && !$this->isWithinSchedule($now, $schedule)) {
            $flags[] = TimeLogFlag::OutsideSchedule;
        }

        return $flags ? $flags[0] : null;
    }

    private function getUserSchedule($user): ?Schedule
    {
        $serviceSchedule = $user->service?->schedules()->first();
        if ($serviceSchedule) {
            return $serviceSchedule;
        }

        return $user->schedule;
    }

    private function isWithinSchedule(Carbon $time, Schedule $schedule): bool
    {
        $days = json_decode($schedule->days, true);
        $dayOfWeek = $time->dayOfWeek;

        if (!in_array($dayOfWeek, $days)) {
            return false;
        }

        $startTime = Carbon::parse($schedule->start_time);
        $endTime = Carbon::parse($schedule->end_time);
        $currentTime = $time->format('H:i');

        return $currentTime >= $startTime->format('H:i') && $currentTime <= $endTime->format('H:i');
    }

    private function calculateLateMinutes($user, Carbon $arrivalTime): int
    {
        $schedule = $this->getUserSchedule($user);
        if (!$schedule) {
            return 0;
        }

        $startTime = Carbon::parse($schedule->start_time);
        $arrival = $arrivalTime->copy()->setTimeFromTimeString($startTime->format('H:i'));

        if ($arrivalTime->gt($arrival)) {
            return $arrivalTime->diffInMinutes($arrival);
        }

        return 0;
    }

    private function determineSessionStatus(AttendanceSession $session): AttendanceStatus
    {
        if (!$session->arrival || !$session->departure) {
            return AttendanceStatus::Incomplete;
        }

        $hasArrival = $session->timeLogs()->where('type', TimeLogType::Arrival)->exists();
        $hasDeparture = $session->timeLogs()->where('type', TimeLogType::Departure)->exists();

        if ($hasArrival && $hasDeparture) {
            return AttendanceStatus::Complete;
        }

        return AttendanceStatus::Incomplete;
    }
}
