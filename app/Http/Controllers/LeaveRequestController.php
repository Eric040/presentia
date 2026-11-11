<?php

namespace App\Http\Controllers;

use App\Enums\LeaveCharacteristic;
use App\Enums\LeaveStatus;
use App\Enums\Role;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LeaveRequestController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = LeaveRequest::with(['user', 'type', 'approver']);

        if (! $user->can('viewAny', LeaveRequest::class)) {
            $query->where('user_id', $user->id);
        } elseif ($user->hasRole(Role::Manager)) {
            $query->whereHas('user', function ($q) use ($user) {
                $q->where('service_id', $user->service_id)
                    ->orWhere('manager_id', $user->id);
            });
        }

        $stats = [
            'total' => (clone $query)->count(),
            'pending' => (clone $query)->where('status', LeaveStatus::Pending)->count(),
            'approved' => (clone $query)->where('status', LeaveStatus::Approved)->count(),
            'rejected' => (clone $query)->where('status', LeaveStatus::Rejected)->count(),
        ];

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type_id')) {
            $query->where('type_id', $request->type_id);
        }

        $leaveRequests = $query->orderByDesc('created_at')->get()->each(function ($item) use ($user) {
            $item->setAttribute('can', [
                'approve' => $user->can('approve', $item),
                'cancel' => $user->can('update', $item),
            ]);
        });

        $schedule = $this->scheduleFor($user);

        return Inertia::render('leave-requests/index', [
            'leaveRequests' => $leaveRequests,
            'types' => LeaveType::where('active', true)->get(['id', 'label', 'characteristic']),
            'stats' => $stats,
            'filters' => $request->only('status', 'type_id'),
            'canCreate' => $user->can('create', LeaveRequest::class),
            'schedule' => $schedule ? [
                'days' => $schedule->days,
                'start_time' => $schedule->start_time,
                'end_time' => $schedule->end_time,
                'break_start' => $schedule->break_start,
                'break_end' => $schedule->break_end,
            ] : null,
        ]);
    }

    public function show(LeaveRequest $leaveRequest)
    {
        $this->authorize('view', $leaveRequest);

        return $leaveRequest->load(['user', 'type', 'approver']);
    }

    public function store(Request $request)
    {
        $this->authorize('create', LeaveRequest::class);

        $validated = $request->validate([
            'type_id' => 'required|exists:leave_types,id',
            'start' => 'required|date|after:now',
            'end' => 'required|date|after_or_equal:start',
            'reason' => 'nullable|string|max:1000',
            'supporting_document' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $type = LeaveType::findOrFail($validated['type_id']);

        if (in_array($type->characteristic, [LeaveCharacteristic::Partial, LeaveCharacteristic::ExternalMission], true)) {
            $error = $this->validateWithinSchedule(
                Carbon::parse($validated['start']),
                Carbon::parse($validated['end']),
                $this->scheduleFor($request->user()),
            );

            if ($error) {
                return back()->withErrors(['start' => $error])->withInput();
            }
        }

        $leaveRequest = new LeaveRequest(Arr::except($validated, 'supporting_document'));
        $leaveRequest->user_id = Auth::id();
        $leaveRequest->status = LeaveStatus::Pending;

        if ($request->hasFile('supporting_document')) {
            $leaveRequest->supporting_document = $request->file('supporting_document')->store('documents', 'public');
        }

        $leaveRequest->save();

        return back();
    }

    public function update(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('update', $leaveRequest);

        $validated = $request->validate([
            'type_id' => 'sometimes|exists:leave_types,id',
            'start' => 'sometimes|date|after:now',
            'end' => 'sometimes|date|after:start',
            'reason' => 'nullable|string|max:1000',
            'supporting_document' => 'nullable|file|max:10240',
        ]);

        $leaveRequest->fill(Arr::except($validated, 'supporting_document'));

        if ($request->hasFile('supporting_document')) {
            $leaveRequest->supporting_document = $request->file('supporting_document')->store('documents', 'public');
        }

        $leaveRequest->save();

        return back();
    }

    public function destroy(LeaveRequest $leaveRequest)
    {
        $this->authorize('delete', $leaveRequest);
        $leaveRequest->delete();

        return back();
    }

    public function approve(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('approve', $leaveRequest);

        if (! $leaveRequest->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être approuvées.']);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        $leaveRequest->forceFill([
            'status' => LeaveStatus::Approved,
            'approver_id' => Auth::id(),
            'decided_at' => now(),
            'comment' => $validated['comment'] ?? null,
        ])->save();

        return back();
    }

    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('reject', $leaveRequest);

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        if (! $leaveRequest->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être refusées.']);
        }

        $leaveRequest->forceFill([
            'status' => LeaveStatus::Rejected,
            'approver_id' => Auth::id(),
            'decided_at' => now(),
            'comment' => $validated['comment'],
        ])->save();

        return back();
    }

    public function cancel(LeaveRequest $leaveRequest)
    {
        $this->authorize('update', $leaveRequest);

        if (! $leaveRequest->status->isPending()) {
            return back()->withErrors(['status' => 'Seules les demandes en attente peuvent être annulées.']);
        }

        $leaveRequest->forceFill(['status' => LeaveStatus::Cancelled])->save();

        return back();
    }

    public function types()
    {
        return LeaveType::where('active', true)->get();
    }

    private function scheduleFor(User $user): ?Schedule
    {
        return Schedule::where('user_id', $user->id)->first()
            ?? ($user->service_id ? Schedule::where('service_id', $user->service_id)->whereNull('user_id')->first() : null);
    }

    private function validateWithinSchedule(Carbon $start, Carbon $end, ?Schedule $schedule): ?string
    {
        if (! $schedule) {
            return null;
        }

        if (! $start->isSameDay($end)) {
            return 'Une permission ou une sortie doit se dérouler sur une seule journée.';
        }

        if (! in_array($start->isoWeekday(), $schedule->days, true)) {
            return 'Ce jour ne fait pas partie des jours travaillés.';
        }

        $dayStart = $start->copy()->setTimeFromTimeString($schedule->start_time);
        $dayEnd = $start->copy()->setTimeFromTimeString($schedule->end_time);

        if ($start->lt($dayStart) || $end->gt($dayEnd)) {
            return sprintf(
                'Choisissez une heure entre %s et %s.',
                substr($schedule->start_time, 0, 5),
                substr($schedule->end_time, 0, 5),
            );
        }

        // Validate break time
        if ($schedule->break_start && $schedule->break_end) {
            $breakStart = $start->copy()->setTimeFromTimeString($schedule->break_start);
            $breakEnd = $start->copy()->setTimeFromTimeString($schedule->break_end);

            // Check if the entire period is within break time
            if ($start->gte($breakStart) && $end->lte($breakEnd)) {
                return sprintf(
                    'Les horaires de pause sont de %s à %s.',
                    substr($schedule->break_start, 0, 5),
                    substr($schedule->break_end, 0, 5),
                );
            }

            // Check if the period overlaps with break time
            if (($start->lt($breakEnd) && $end->gt($breakStart))) {
                return sprintf(
                    'La période ne doit pas inclure la pause de %s à %s.',
                    substr($schedule->break_start, 0, 5),
                    substr($schedule->break_end, 0, 5),
                );
            }
        }

        return null;
    }
}