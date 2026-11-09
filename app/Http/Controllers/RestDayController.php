<?php

namespace App\Http\Controllers;

use App\Enums\RestDayStatus;
use App\Enums\Role;
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

        $restDays = $query->orderBy('date', 'desc')->get();

        $stats = [
            'total' => $restDays->count(),
            'pending' => $restDays->where('status', RestDayStatus::Pending)->count(),
            'approved' => $restDays->where('status', RestDayStatus::Approved)->count(),
            'rejected' => $restDays->where('status', RestDayStatus::Rejected)->count(),
        ];

        return Inertia::render('rest-days/index', [
            'restDays' => $restDays,
            'stats' => $stats,
        ]);
    }

    public function show(RestDay $restDay)
    {
        $this->authorize('view', $restDay);

        return $restDay->load(['user', 'decider']);
    }

    public function store(Request $request)
    {
        $this->authorize('create', RestDay::class);

        $validated = $request->validate([
            'date' => 'required|date|after_or_equal:today',
        ]);

        $user = Auth::user();

        if ($user->rest_quota <= 0) {
            return response()->json(['message' => 'Votre quota de jours de repos est épuisé'], 400);
        }

        $restDay = RestDay::create([
            'user_id' => $user->id,
            'date' => $validated['date'],
            'status' => RestDayStatus::Pending,
        ]);

        return response()->json($restDay, 201);
    }

    public function update(Request $request, RestDay $restDay)
    {
        $this->authorize('update', $restDay);

        $validated = $request->validate([
            'date' => 'sometimes|date|after_or_equal:today',
        ]);

        $restDay->update($validated);

        return response()->json($restDay);
    }

    public function destroy(RestDay $restDay)
    {
        $this->authorize('delete', $restDay);
        $restDay->delete();

        return response()->noContent();
    }

    public function approve(Request $request, RestDay $restDay)
    {
        $this->authorize('approve', $restDay);

        if (! $restDay->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être approuvées'], 400);
        }

        $restDay->update([
            'status' => RestDayStatus::Approved,
            'decided_by' => Auth::id(),
            'decided_at' => now(),
        ]);

        $restDay->user->decrement('rest_quota');

        return response()->json($restDay->load('user', 'decider'));
    }

    public function reject(Request $request, RestDay $restDay)
    {
        $this->authorize('reject', $restDay);

        $validated = $request->validate([
            'justification' => 'required|string|max:1000',
        ]);

        if (! $restDay->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être refusées'], 400);
        }

        $user = $restDay->user;
        $admissibleDays = $this->calculateAdmissibleDays($user);
        $remainingQuota = $user->rest_quota;

        if ($admissibleDays <= $remainingQuota) {
            return response()->json([
                'message' => 'Refus impossible : les jours admissibles restants sont inférieurs ou égaux au quota restant',
                'admissible_days' => $admissibleDays,
                'remaining_quota' => $remainingQuota,
            ], 400);
        }

        $restDay->update([
            'status' => RestDayStatus::Rejected,
            'decided_by' => Auth::id(),
            'decided_at' => now(),
            'justification' => $validated['justification'],
        ]);

        return response()->json($restDay->load('user', 'decider'));
    }

    public function cancel(RestDay $restDay)
    {
        $this->authorize('update', $restDay);

        if (! $restDay->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être annulées'], 400);
        }

        $restDay->update(['status' => RestDayStatus::Cancelled]);

        return response()->json($restDay);
    }

    private function calculateAdmissibleDays(User $user): int
    {
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $approvedThisMonth = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Approved)
            ->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->count();

        $pendingThisMonth = RestDay::where('user_id', $user->id)
            ->where('status', RestDayStatus::Pending)
            ->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->count();

        return $user->rest_quota - $approvedThisMonth - $pendingThisMonth;
    }
}
