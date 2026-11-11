<?php

namespace App\Http\Controllers;

use App\Enums\RestDayStatus;
use App\Enums\Role;
use App\Models\Holiday;
use App\Models\RestDay;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RestDayController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RestDay::with(['user', 'decider']);

        if (! $user->can('viewAny', RestDay::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(Role::Manager)) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                    ->orWhere('manager_id', $user->id);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('month')) {
            $query->whereMonth('date', $request->month);
        }

        $restDays = $query->orderBy('date', 'desc')->get()->each(function ($item) use ($user) {
            $item->setAttribute('can', [
                'approve' => $user->can('approve', $item),
                'cancel' => $user->can('update', $item),
            ]);
        });

        $statsBase = RestDay::query();
        if (! $user->can('viewAny', RestDay::class)) {
            $statsBase->where('user_id', $user->id);
        } elseif ($user->hasRole(Role::Manager)) {
            $statsBase->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                    ->orWhere('manager_id', $user->id);
            });
        }

        $stats = [
            'total'    => (clone $statsBase)->count(),
            'pending'  => (clone $statsBase)->where('status', RestDayStatus::Pending)->count(),
            'approved' => (clone $statsBase)->where('status', RestDayStatus::Approved)->count(),
            'rejected' => (clone $statsBase)->where('status', RestDayStatus::Rejected)->count(),
        ];

        // For employees: expose quota info and admissibility data
        $quotaInfo = null;
        if ($user->rest_quota > 0 || $user->hasRole(Role::Employee)) {
            $now = Carbon::now();
            $approvedThisMonth = RestDay::where('user_id', $user->id)
                ->where('status', RestDayStatus::Approved)
                ->whereMonth('date', $now->month)
                ->whereYear('date', $now->year)
                ->count();

            $pendingThisMonth = RestDay::where('user_id', $user->id)
                ->where('status', RestDayStatus::Pending)
                ->whereMonth('date', $now->month)
                ->whereYear('date', $now->year)
                ->count();

            $quotaInfo = [
                'quota'              => $user->rest_quota,
                'approved_this_month' => $approvedThisMonth,
                'pending_this_month'  => $pendingThisMonth,
                'remaining'          => max(0, $user->rest_quota - $approvedThisMonth),
                'can_propose'        => ($approvedThisMonth + $pendingThisMonth) < $user->rest_quota,
            ];
        }

        return Inertia::render('rest-days/index', [
            'restDays'  => $restDays,
            'stats'     => $stats,
            'quotaInfo' => $quotaInfo,
            'filters'   => $request->only('status', 'month'),
            'canCreate' => $user->can('create', RestDay::class) && $user->rest_quota > 0,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', RestDay::class);

        $validated = $request->validate([
            'date' => 'required|date|after_or_equal:today',
        ]);

        $user = Auth::user();

        if ($user->rest_quota <= 0) {
            return back()->withErrors(['date' => 'Votre quota de jours de repos est épuisé.']);
        }

        $date = Carbon::parse($validated['date']);
        $now  = Carbon::now();

        // Check minimum notice period (3 calendar days per F7.4)
        $minDate = $now->copy()->addDays(3)->startOfDay();
        if ($date->lt($minDate)) {
            return back()->withErrors(['date' => 'Le délai minimum de prévenance est de 3 jours calendaires.']);
        }

        // Must not be a holiday (F7.4)
        if (Holiday::where('date', $date->toDateString())->exists()) {
            return back()->withErrors(['date' => 'Ce jour est un jour férié.']);
        }

        // Must not already be proposed/approved this month quota
        $approvedCount = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Approved)
            ->whereMonth('date', $date->month)
            ->whereYear('date', $date->year)
            ->count();

        $pendingCount = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Pending)
            ->whereMonth('date', $date->month)
            ->whereYear('date', $date->year)
            ->count();

        if (($approvedCount + $pendingCount) >= $user->rest_quota) {
            return back()->withErrors(['date' => 'Vous avez atteint le quota de demandes pour ce mois.']);
        }

        // Must not be an already-approved or pending rest day on that date
        if (RestDay::where('user_id', $user->id)
            ->whereDate('date', $date->toDateString())
            ->whereIn('status', [RestDayStatus::Pending, RestDayStatus::Approved])
            ->exists()) {
            return back()->withErrors(['date' => 'Une demande existe déjà pour cette date.']);
        }

        // Must not have been rejected this month for the same date (F7.4)
        if (RestDay::where('user_id', $user->id)
            ->whereDate('date', $date->toDateString())
            ->where('status', RestDayStatus::Rejected)
            ->exists()) {
            return back()->withErrors(['date' => 'Cette date a déjà été refusée ce mois-ci.']);
        }

        $restDay = new RestDay(['date' => $date->toDateString()]);
        $restDay->user_id = $user->id;
        $restDay->status  = RestDayStatus::Pending;
        $restDay->save();

        // Notify the administrator (F7.5)
        $this->notifyApprovers($user, $restDay);

        return back();
    }

    public function approve(Request $request, RestDay $restDay)
    {
        $this->authorize('approve', $restDay);

        if (! $restDay->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être approuvées.']);
        }

        $restDay->forceFill([
            'status'     => RestDayStatus::Approved,
            'decided_by' => Auth::id(),
            'decided_at' => now(),
        ])->save();

        return back();
    }

    public function reject(Request $request, RestDay $restDay)
    {
        $this->authorize('reject', $restDay);

        $validated = $request->validate([
            'justification' => 'required|string|max:1000',
        ]);

        if (! $restDay->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être refusées.']);
        }

        // F7.17 — block rejection if admissible days <= remaining quota
        $employee        = $restDay->user;
        $admissibleDays  = $this->calculateAdmissibleDays($employee, $restDay->date->format('Y-m'));
        $remainingQuota  = $this->remainingQuota($employee, $restDay->date->format('Y-m'));

        if ($admissibleDays <= $remainingQuota) {
            return back()->withErrors([
                'justification' => 'Refus impossible : les jours admissibles restants ('.$admissibleDays.') sont inférieurs ou égaux au quota restant ('.$remainingQuota.'). Vous ne pouvez qu\'approuver.',
            ]);
        }

        $restDay->forceFill([
            'status'        => RestDayStatus::Rejected,
            'decided_by'    => Auth::id(),
            'decided_at'    => now(),
            'justification' => $validated['justification'],
        ])->save();

        return back();
    }

    public function cancel(RestDay $restDay)
    {
        $this->authorize('update', $restDay);

        if (! $restDay->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être annulées.']);
        }

        $restDay->forceFill(['status' => RestDayStatus::Cancelled])->save();

        return back();
    }

    // ─────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────

    /**
     * Count admissible days remaining in the given year-month for an employee.
     * Per F7.16: days that are future, past the notice period, not holidays,
     * not already approved or pending or rejected this month.
     * Pending proposals count as admissible (F7.16 last sentence).
     */
    private function calculateAdmissibleDays(User $user, string $yearMonth): int
    {
        [$year, $month] = explode('-', $yearMonth);
        $now = Carbon::now()->startOfDay();
        $minDate = $now->copy()->addDays(3);

        // All days in the month
        $firstDay = Carbon::create((int) $year, (int) $month, 1);
        $lastDay  = $firstDay->copy()->endOfMonth();

        // Load holidays and rejected dates for the month
        $holidayDates = Holiday::whereYear('date', $year)
            ->whereMonth('date', $month)
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $approvedDates = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Approved)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $rejectedDates = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Rejected)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->toArray();

        $admissible = 0;
        $cursor = $firstDay->copy();

        while ($cursor->lte($lastDay)) {
            $dateStr = $cursor->toDateString();

            if ($cursor->gte($minDate)
                && ! in_array($dateStr, $holidayDates, true)
                && ! in_array($dateStr, $approvedDates, true)
                && ! in_array($dateStr, $rejectedDates, true)
            ) {
                $admissible++;
            }

            $cursor->addDay();
        }

        return $admissible;
    }

    /**
     * Quota remaining = monthly quota - days already approved this month.
     */
    private function remainingQuota(User $user, string $yearMonth): int
    {
        [$year, $month] = explode('-', $yearMonth);

        $approved = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Approved)
            ->whereYear('date', $year)
            ->whereMonth('date', $month)
            ->count();

        return max(0, $user->rest_quota - $approved);
    }

    /**
     * Notify the administrator (and HR if admin unavailable) of a new rest day proposal.
     */
    private function notifyApprovers(User $employee, RestDay $restDay): void
    {
        $admin = User::where('role', Role::Administrator->value)->first();

        if ($admin) {
            $admin->internalNotifications()->create([
                'type'            => 'rest_day_proposed',
                'channel'         => 'application',
                'minimal_content' => "{$employee->name} a proposé le {$restDay->date->format('d/m/Y')} comme jour de repos.",
                'data'            => ['rest_day_id' => $restDay->id, 'user_id' => $employee->id],
            ]);
        }
    }
}
