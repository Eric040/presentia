<?php

namespace App\Http\Controllers;

use App\Enums\LeaveStatus;
use App\Enums\Role;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Illuminate\Http\Request;
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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type_id')) {
            $query->where('type_id', $request->type_id);
        }

        $leaveRequests = $query->orderBy('created_at', 'desc')->get();

        $stats = [
            'total' => $leaveRequests->count(),
            'pending' => $leaveRequests->where('status', LeaveStatus::Pending)->count(),
            'approved' => $leaveRequests->where('status', LeaveStatus::Approved)->count(),
            'rejected' => $leaveRequests->where('status', LeaveStatus::Rejected)->count(),
        ];

        return Inertia::render('leave-requests/index', [
            'leaveRequests' => $leaveRequests,
            'stats' => $stats,
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
            'end' => 'required|date|after:start',
            'reason' => 'nullable|string|max:1000',
            'supporting_document' => 'nullable|file|max:10240',
        ]);

        $leaveRequest = LeaveRequest::create([
            'user_id' => Auth::id(),
            'type_id' => $validated['type_id'],
            'start' => $validated['start'],
            'end' => $validated['end'],
            'reason' => $validated['reason'] ?? null,
            'status' => LeaveStatus::Pending,
        ]);

        if ($request->hasFile('supporting_document')) {
            $path = $request->file('supporting_document')->store('documents', 'public');
            $leaveRequest->supporting_document = $path;
            $leaveRequest->save();
        }

        return response()->json($leaveRequest->load('type'), 201);
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

        $leaveRequest->update($validated);

        if ($request->hasFile('supporting_document')) {
            $path = $request->file('supporting_document')->store('documents', 'public');
            $leaveRequest->supporting_document = $path;
            $leaveRequest->save();
        }

        return response()->json($leaveRequest->load('type'));
    }

    public function destroy(LeaveRequest $leaveRequest)
    {
        $this->authorize('delete', $leaveRequest);
        $leaveRequest->delete();

        return response()->noContent();
    }

    public function approve(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('approve', $leaveRequest);

        if (! $leaveRequest->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être approuvées'], 400);
        }

        $leaveRequest->update([
            'status' => LeaveStatus::Approved,
            'approver_id' => Auth::id(),
            'decided_at' => now(),
            'comment' => $request->input('comment'),
        ]);

        return response()->json($leaveRequest->load('user', 'type', 'approver'));
    }

    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('reject', $leaveRequest);

        $validated = $request->validate([
            'comment' => 'required|string|max:1000',
        ]);

        if (! $leaveRequest->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être refusées'], 400);
        }

        $leaveRequest->update([
            'status' => LeaveStatus::Rejected,
            'approver_id' => Auth::id(),
            'decided_at' => now(),
            'comment' => $validated['comment'],
        ]);

        return response()->json($leaveRequest->load('user', 'type', 'approver'));
    }

    public function cancel(LeaveRequest $leaveRequest)
    {
        $this->authorize('update', $leaveRequest);

        if (! $leaveRequest->status->isPending()) {
            return response()->json(['message' => 'Seules les demandes en attente peuvent être annulées'], 400);
        }

        $leaveRequest->update(['status' => LeaveStatus::Cancelled]);

        return response()->json($leaveRequest);
    }

    public function types()
    {
        return LeaveType::where('active', true)->get();
    }
}
