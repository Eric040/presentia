<?php

namespace App\Http\Controllers;

use App\Enums\AnomalyStatus;
use App\Enums\AttendanceStatus;
use App\Enums\RestDayStatus;
use App\Enums\Role;
use App\Enums\TimeLogFlag;
use App\Enums\TimeLogType;
use App\Models\Anomaly;
use App\Models\AttendanceSession;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\RestDay;
use App\Models\Schedule;
use App\Models\TimeLog;
use App\Models\WorkZone;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    // Tolérance de retard par défaut (minutes) - F3.9
    private const LATE_TOLERANCE_MIN = 10;

    // Seuil d'absence par défaut (heures) - F3.10
    private const ABSENCE_THRESHOLD_HOURS = 2;

    public function index(Request $request)
    {
        $user = Auth::user();
        $query = AttendanceSession::with(['user', 'timeLogs']);

        if (! $user->can('viewAny', AttendanceSession::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(Role::Manager)) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                    ->orWhere('manager_id', $user->id);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sessions = $query->orderBy('date', 'desc')->orderBy('id', 'desc')->get();

        $stats = [
            'active'    => $sessions->where('status', AttendanceStatus::InProgress)->count(),
            'completed' => $sessions->where('status', AttendanceStatus::Complete)->count(),
            'on_break'  => $sessions->filter(function ($s) {
                $last = $s->timeLogs->sortBy('id')->last();
                return $last && $last->type === TimeLogType::BreakStart;
            })->count(),
        ];

        // Session du jour pour l'employé courant (si non-admin)
        $todaySession = null;
        if (! $user->hasRole(Role::Administrator, Role::Hr)) {
            $raw = AttendanceSession::with('timeLogs')
                ->where('user_id', $user->id)
                ->whereDate('date', Carbon::today())
                ->first();

            if ($raw) {
                $lastLog = $raw->timeLogs->sortBy('id')->last();
                $onBreak    = $lastLog && $lastLog->type === TimeLogType::BreakStart;
                $hasArrived = ! is_null($raw->arrival);
                $hasDeparted = ! is_null($raw->departure);

                // Determine next available action label
                $nextAction = match (true) {
                    $hasDeparted            => 'done',       // session complete
                    $onBreak                => 'break_end',  // end break
                    $hasArrived && ! $onBreak => 'break_start_or_clock_out', // can break or clock out
                    default                 => 'clock_in',   // nothing done yet today
                };

                $todaySession = [
                    'id'           => $raw->id,
                    'arrival'      => $raw->arrival?->toIso8601String(),
                    'departure'    => $raw->departure?->toIso8601String(),
                    'status'       => $raw->status->value,
                    'late_minutes' => $raw->late_minutes,
                    'on_break'     => $onBreak,
                    'has_arrived'  => $hasArrived,
                    'has_departed' => $hasDeparted,
                    'next_action'  => $nextAction,
                ];
            }
        }

        // Serialise les sessions pour le frontend
        $serialized = $sessions->map(function ($s) {
            $lastLog = $s->timeLogs->sortBy('id')->last();
            $derivedStatus = match (true) {
                ! is_null($s->departure) => $s->status->value, // complete or incomplete
                $lastLog && $lastLog->type === TimeLogType::BreakStart => 'on_break',
                ! is_null($s->arrival)   => 'in_progress',
                default                  => $s->status->value,
            };
            return [
                'id'           => $s->id,
                'user'         => ['id' => $s->user->id, 'name' => $s->user->name],
                'date'         => $s->date->toDateString(),
                'arrival'      => $s->arrival?->toIso8601String(),
                'departure'    => $s->departure?->toIso8601String(),
                'status'       => $derivedStatus,
                'late_minutes' => $s->late_minutes,
                'time_logs'    => $s->timeLogs->map(fn ($tl) => [
                    'id'               => $tl->id,
                    'type'             => $tl->type->value,
                    'timestamp'        => $tl->timestamp->toIso8601String(),
                    'in_zone'          => $tl->in_zone,
                    'approx_distance'  => $tl->approx_distance,
                    'flag'             => $tl->flag?->value,
                    'flag_label'       => $tl->flag?->label(),
                ])->values(),
            ];
        });

        return Inertia::render('attendance/index', [
            'sessions'     => $serialized,
            'stats'        => $stats,
            'todaySession' => $todaySession,
            'filters'      => $request->only('date_from', 'date_to', 'status'),
            'canClockIn'   => ! $user->hasRole(Role::Administrator, Role::Hr),
            'schedule'     => $user->hasRole(Role::Administrator, Role::Hr)
                ? null
                : ($this->getUserSchedule($user) ? [
                    'start_time' => substr($this->getUserSchedule($user)->start_time, 0, 5),
                ] : null),
        ]);
    }

    public function show(AttendanceSession $attendanceSession)
    {
        $this->authorize('view', $attendanceSession);

        $attendanceSession->load(['user', 'timeLogs']);

        return Inertia::render('attendance/show', [
            'session' => [
                'id'           => $attendanceSession->id,
                'user'         => ['id' => $attendanceSession->user->id, 'name' => $attendanceSession->user->name],
                'date'         => $attendanceSession->date->toDateString(),
                'arrival'      => $attendanceSession->arrival?->toIso8601String(),
                'departure'    => $attendanceSession->departure?->toIso8601String(),
                'status'       => $attendanceSession->status->value,
                'late_minutes' => $attendanceSession->late_minutes,
                'time_logs'    => $attendanceSession->timeLogs->map(fn ($tl) => [
                    'id'               => $tl->id,
                    'type'             => $tl->type->value,
                    'type_label'       => $tl->type->label ?? $tl->type->value,
                    'timestamp'        => $tl->timestamp->toIso8601String(),
                    'in_zone'          => $tl->in_zone,
                    'approx_distance'  => $tl->approx_distance,
                    'flag'             => $tl->flag?->value,
                    'flag_label'       => $tl->flag?->label(),
                ])->values(),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────
    // Clock actions (all return Inertia back())
    // ─────────────────────────────────────────────────────────

    public function clockIn(Request $request)
    {
        $user  = Auth::user();
        $today = Carbon::today();

        $session = AttendanceSession::where('user_id', $user->id)->whereDate('date', $today)->first();

        if (! $session) {
            $session          = new AttendanceSession(['date' => $today, 'status' => AttendanceStatus::InProgress]);
            $session->user_id = $user->id;
            $session->save();
        }

        if ($session->arrival && ! $session->departure) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Vous avez déjà pointé votre arrivée aujourd\'hui.']);
        }

        if ($session->departure) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Session déjà terminée pour aujourd\'hui.']);
        }

        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'required|numeric|min:0',
        ]);

        if ($validated['accuracy'] > 100) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Position trop imprécise. Réessayez ou régularisez.']);
        }

        $workZone       = $this->getUserWorkZone($user);
        $inZone         = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        if (! $inZone && ! $this->hasAuthorizedOffsite($user, now())) {
            return redirect()->route('attendance.index')->withErrors([
                'clock' => 'Vous êtes hors de la zone de travail ('
                    . ($approxDistance !== null ? $approxDistance . ' m du site' : 'zone inconnue')
                    . '). Pointage refusé. Vous pouvez régulariser.',
            ]);
        }

        $flag    = $this->determineFlag($user, $today, $inZone);
        $timeLog = TimeLog::create([
            'session_id'      => $session->id,
            'type'            => TimeLogType::Arrival,
            'timestamp'       => now(),
            'in_zone'         => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
            'flag'            => $flag,
        ]);

        $session->update(['arrival' => $timeLog->timestamp]);

        $lateMinutes = $this->calculateLateMinutes($user, $timeLog->timestamp);
        if ($lateMinutes > 0) {
            $session->update(['late_minutes' => $lateMinutes]);
        }

        return redirect()->route('attendance.index');
    }

    public function clockOut(Request $request)
    {
        $user    = Auth::user();
        $today   = Carbon::today();
        $session = AttendanceSession::where('user_id', $user->id)->whereDate('date', $today)->first();

        if (! $session || ! $session->arrival) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Aucune session en cours pour aujourd\'hui.']);
        }

        if ($session->departure) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Vous avez déjà pointé votre départ.']);
        }

        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'required|numeric|min:0',
        ]);

        if ($validated['accuracy'] > 100) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Position trop imprécise. Réessayez ou régularisez.']);
        }

        $workZone       = $this->getUserWorkZone($user);
        $inZone         = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        if (! $inZone && ! $this->hasAuthorizedOffsite($user, now())) {
            return redirect()->route('attendance.index')->withErrors([
                'clock' => 'Vous êtes hors de la zone de travail ('
                    . ($approxDistance !== null ? $approxDistance . ' m du site' : 'zone inconnue')
                    . '). Départ refusé. Vous pouvez régulariser.',
            ]);
        }

        $flag    = $this->determineFlag($user, $today, $inZone);
        $timeLog = TimeLog::create([
            'session_id'      => $session->id,
            'type'            => TimeLogType::Departure,
            'timestamp'       => now(),
            'in_zone'         => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
            'flag'            => $flag,
        ]);

        $session->update([
            'departure' => $timeLog->timestamp,
            'status'    => $this->determineSessionStatus($session),
        ]);

        return redirect()->route('attendance.index');
    }

    public function startBreak(Request $request)
    {
        $user    = Auth::user();
        $today   = Carbon::today();
        $session = AttendanceSession::where('user_id', $user->id)->whereDate('date', $today)->first();

        if (! $session || ! $session->arrival) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Aucune session en cours.']);
        }

        $lastLog = $session->timeLogs()->latest('timestamp')->first();
        if ($lastLog && $lastLog->type === TimeLogType::BreakStart) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Pause déjà en cours.']);
        }

        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'required|numeric|min:0',
        ]);

        $workZone       = $this->getUserWorkZone($user);
        $inZone         = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        TimeLog::create([
            'session_id'      => $session->id,
            'type'            => TimeLogType::BreakStart,
            'timestamp'       => now(),
            'in_zone'         => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
        ]);

        return redirect()->route('attendance.index');
    }

    public function endBreak(Request $request)
    {
        $user    = Auth::user();
        $today   = Carbon::today();
        $session = AttendanceSession::where('user_id', $user->id)->whereDate('date', $today)->first();

        if (! $session || ! $session->arrival) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Aucune session en cours.']);
        }

        $lastLog = $session->timeLogs()->latest('timestamp')->first();
        if (! $lastLog || $lastLog->type !== TimeLogType::BreakStart) {
            return redirect()->route('attendance.index')
                ->withErrors(['clock' => 'Aucune pause en cours.']);
        }

        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy'  => 'required|numeric|min:0',
        ]);

        $workZone       = $this->getUserWorkZone($user);
        $inZone         = $this->isInZone($validated['latitude'], $validated['longitude'], $workZone);
        $approxDistance = $this->calculateApproxDistance($validated['latitude'], $validated['longitude'], $workZone);
        $approxAccuracy = min((int) round($validated['accuracy']), 100);

        TimeLog::create([
            'session_id'      => $session->id,
            'type'            => TimeLogType::BreakEnd,
            'timestamp'       => now(),
            'in_zone'         => $inZone,
            'approx_distance' => $approxDistance,
            'approx_accuracy' => $approxAccuracy,
        ]);

        return redirect()->route('attendance.index');
    }

    // ─────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────

    private function getUserWorkZone($user): ?WorkZone
    {
        return $user->workZones()->where('active', true)->first();
    }

    /** Haversine distance in metres */
    private function distanceTo(float $lat, float $lng, WorkZone $zone): float
    {
        $R   = 6371000;
        $φ1  = deg2rad($lat);
        $φ2  = deg2rad($zone->latitude);
        $Δφ  = deg2rad($zone->latitude - $lat);
        $Δλ  = deg2rad($zone->longitude - $lng);
        $a   = sin($Δφ / 2) ** 2 + cos($φ1) * cos($φ2) * sin($Δλ / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function isInZone(float $lat, float $lng, ?WorkZone $zone): bool
    {
        if (! $zone) {
            return false;
        }
        return $this->distanceTo($lat, $lng, $zone) <= $zone->radius_m;
    }

    private function calculateApproxDistance(float $lat, float $lng, ?WorkZone $zone): ?int
    {
        if (! $zone) {
            return null;
        }
        return (int) round($this->distanceTo($lat, $lng, $zone) / 10) * 10;
    }

    private function getUserSchedule($user): ?Schedule
    {
        return $user->schedule ?? $user->service?->schedules()->whereNull('user_id')->first();
    }

    private function isWithinSchedule(Carbon $time, Schedule $schedule): bool
    {
        $days = is_array($schedule->days) ? $schedule->days : json_decode($schedule->days, true);

        // days are ISO weekday (1=Mon…7=Sun); PHP dayOfWeek: 0=Sun…6=Sat
        $isoDay = $time->dayOfWeek === 0 ? 7 : $time->dayOfWeek;
        if (! in_array($isoDay, $days, true)) {
            return false;
        }

        $cur = $time->format('H:i');
        if ($cur < substr($schedule->start_time, 0, 5) || $cur > substr($schedule->end_time, 0, 5)) {
            return false;
        }

        if ($schedule->break_start && $schedule->break_end) {
            if ($cur >= substr($schedule->break_start, 0, 5) && $cur <= substr($schedule->break_end, 0, 5)) {
                return false;
            }
        }

        return true;
    }

    /** F3.9 — late = arrival more than LATE_TOLERANCE_MIN after schedule start */
    private function calculateLateMinutes($user, Carbon $arrivalTime): int
    {
        $schedule = $this->getUserSchedule($user);
        if (! $schedule) {
            return 0;
        }

        $scheduleStart = $arrivalTime->copy()->setTimeFromTimeString($schedule->start_time);
        $threshold     = $scheduleStart->addMinutes(self::LATE_TOLERANCE_MIN);

        if ($arrivalTime->gt($threshold)) {
            return $arrivalTime->diffInMinutes($scheduleStart->subMinutes(self::LATE_TOLERANCE_MIN));
        }

        return 0;
    }

    private function determineSessionStatus(AttendanceSession $session): AttendanceStatus
    {
        $logs   = $session->timeLogs()->pluck('type');
        $hasArr = $logs->contains(TimeLogType::Arrival);
        $hasDep = $logs->contains(TimeLogType::Departure);

        return ($hasArr && $hasDep) ? AttendanceStatus::Complete : AttendanceStatus::Incomplete;
    }

    private function isHoliday(Carbon $date): bool
    {
        return Holiday::where('date', $date->toDateString())->exists();
    }

    private function isOnApprovedLeave($user, Carbon $time): bool
    {
        return LeaveRequest::where('user_id', $user->id)
            ->where('status', 'approved')
            ->where('start', '<=', $time)
            ->where('end', '>=', $time)
            ->exists();
    }

    /** True if user has an approved external mission or remote work for now (F2.9 / F3.21) */
    private function hasAuthorizedOffsite($user, Carbon $time): bool
    {
        return LeaveRequest::where('user_id', $user->id)
            ->where('status', 'approved')
            ->whereHas('type', function ($q) {
                $q->whereIn('characteristic', ['external_mission', 'remote_work']);
            })
            ->where('start', '<=', $time)
            ->where('end', '>=', $time)
            ->exists();
    }

    private function determineFlag($user, Carbon $date, bool $inZone): ?TimeLogFlag
    {
        // Priority: holiday > leave > rest day > offsite > outside schedule
        if ($this->isHoliday($date)) {
            return TimeLogFlag::WorkedOnHoliday;
        }

        if ($this->isOnApprovedLeave($user, now())) {
            return TimeLogFlag::WorkedDuringLeave;
        }

        if (RestDay::where('user_id', $user->id)
            ->where('date', $date->toDateString())
            ->where('status', RestDayStatus::Approved)
            ->exists()) {
            return TimeLogFlag::WorkedOnRestDay;
        }

        if (! $inZone) {
            return TimeLogFlag::OutsideAuthorizedSite;
        }

        $schedule = $this->getUserSchedule($user);
        if ($schedule && ! $this->isWithinSchedule(now(), $schedule)) {
            return TimeLogFlag::OutsideSchedule;
        }

        return null;
    }
}
