<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\LeaveCharacteristic;
use App\Enums\LeaveStatus;
use App\Enums\Role;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        if ($user->hasRole(Role::Administrator)) {
            return Inertia::render('dashboard', ['view' => 'admin', ...$this->admin()]);
        }

        return Inertia::render('dashboard', ['view' => 'personal', ...$this->personal($user)]);
    }

    private function admin(): array
    {
        $today = today();

        $headcount = User::where('active', true)->where('role', '!=', Role::Administrator)->count();

        $sessions = AttendanceSession::whereDate('date', $today)->whereNotNull('arrival');
        $present = (clone $sessions)->distinct()->count('user_id');
        $late = (clone $sessions)->where('late_minutes', '>', 0);
        $lateCount = (clone $late)->count();
        $lateMinutes = (int) (clone $late)->sum('late_minutes');

        $remote = LeaveRequest::where('status', LeaveStatus::Approved)
            ->where('start', '<=', $today->copy()->endOfDay())
            ->where('end', '>=', $today)
            ->whereHas('type', fn ($q) => $q->where('characteristic', LeaveCharacteristic::RemoteWork))
            ->distinct()
            ->count('user_id');

        $pending = LeaveRequest::pending()->count();

        $counts = AttendanceSession::whereDate('date', '>=', $today->copy()->subDays(89))
            ->whereDate('date', '<=', $today)
            ->whereNotNull('arrival')
            ->selectRaw('date, COUNT(DISTINCT user_id) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->mapWithKeys(fn ($total, $date) => [Carbon::parse($date)->toDateString() => (int) $total]);

        $requests = LeaveRequest::with(['user', 'type'])->pending()->oldest()->limit(5)->get();

        return [
            'stats' => [
                ['label' => 'Présents aujourd\'hui', 'value' => "{$present} / {$headcount}", 'title' => 'Pointages du jour', 'note' => 'Employés actifs, hors administrateur'],
                ['label' => 'En télétravail', 'value' => (string) $remote, 'title' => 'Télétravail approuvé', 'note' => 'Aujourd\'hui'],
                ['label' => 'Retards', 'value' => (string) $lateCount, 'title' => $lateCount > 0 ? 'Arrivées tardives du jour' : 'Aucun retard aujourd\'hui', 'note' => "{$lateMinutes} min cumulées"],
                ['label' => 'Demandes à valider', 'value' => (string) $pending, 'title' => 'En attente de décision', 'note' => 'Toutes les demandes en attente'],
            ],
            'chartData' => $this->series($today, $counts),
            'requests' => $this->rows($requests),
        ];
    }

    private function personal(User $user): array
    {
        $today = today();
        $month = $today->copy()->startOfMonth();

        $sessions = AttendanceSession::where('user_id', $user->id)
            ->whereDate('date', '>=', $month)
            ->whereDate('date', '<=', $today);

        $present = (clone $sessions)->where('status', AttendanceStatus::Complete)->count();
        $lateCount = (clone $sessions)->where('late_minutes', '>', 0)->count();
        $lateMinutes = (int) (clone $sessions)->sum('late_minutes');
        $absentSessions = (clone $sessions)->where('status', AttendanceStatus::Absence)->count();

        $approvedLeaves = LeaveRequest::where('user_id', $user->id)
            ->where('status', LeaveStatus::Approved)
            ->whereDate('start', '>=', $month)
            ->whereDate('start', '<=', $today)
            ->whereHas('type', fn ($q) => $q->whereNotIn('characteristic', [
                LeaveCharacteristic::RemoteWork->value,
                LeaveCharacteristic::ExternalMission->value,
            ]))
            ->count();

        $absences = $absentSessions + $approvedLeaves;
        /** @var \Illuminate\Support\Collection<int, \Carbon\Carbon> $dates */
        $dates = collect($month->daysUntil($today));
        $workingDays = $dates->filter(fn ($day) => $day->isWeekday())->count();
        $pending = LeaveRequest::pending()->where('user_id', $user->id)->count();

        $hours = AttendanceSession::where('user_id', $user->id)
            ->whereDate('date', '>=', $today->copy()->subDays(89))
            ->whereDate('date', '<=', $today)
            ->whereNotNull('arrival')
            ->whereNotNull('departure')
            ->get(['date', 'arrival', 'departure'])
            ->groupBy(fn ($session) => Carbon::parse($session->date)->toDateString())
            ->map(fn ($day) => round($day->sum(fn ($s) => $s->arrival->diffInMinutes($s->departure)) / 60, 1));

        $requests = LeaveRequest::with(['type', 'approver'])
            ->where('user_id', $user->id)
            ->latest()
            ->limit(5)
            ->get();

        return [
            'stats' => [
                ['label' => 'Jours présents', 'value' => "{$present} / {$workingDays}", 'title' => 'Jours complets ce mois-ci', 'note' => 'Jours ouvrés depuis le 1er du mois'],
                ['label' => 'Retards', 'value' => (string) $lateCount, 'title' => $lateCount > 0 ? "{$lateCount} retard(s) ce mois-ci" : 'Aucun retard ce mois-ci', 'note' => "{$lateMinutes} min cumulées"],
                ['label' => 'Absences', 'value' => (string) $absences, 'title' => $absences > 0 ? "{$absences} absence(s) ce mois-ci" : 'Aucune absence ce mois-ci', 'note' => 'Absences et permissions approuvées'],
                ['label' => 'Demandes en attente', 'value' => (string) $pending, 'title' => 'En attente de réponse', 'note' => 'Demandes non encore traitées'],
            ],
            'chartData' => $this->series($today, $hours),
            'requests' => $this->rows($requests),
        ];
    }

    private function series(CarbonInterface $today, Collection $values): array
    {
        return collect(range(89, 0))->map(function ($i) use ($today, $values) {
            $date = $today->copy()->subDays($i)->toDateString();

            return ['date' => $date, 'value' => $values[$date] ?? 0];
        })->all();
    }

    private function rows(Collection $requests): array
    {
        return $requests->map(fn ($r) => [
            'id' => $r->id,
            'user' => $r->relationLoaded('user') ? $r->user->name : null,
            'type' => $r->type->label,
            'date' => $r->start->toDateString(),
            'status' => $r->status->label(),
            'approver' => $r->approver?->name,
        ])->all();
    }
}