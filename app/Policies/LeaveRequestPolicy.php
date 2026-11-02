<?php

namespace App\Policies;

use App\Models\LeaveRequest;
use App\Models\User;
use App\Enums\Role;
use Illuminate\Auth\Access\Response;

class LeaveRequestPolicy
{
    public function view(User $user, LeaveRequest $request): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $request->user->service_id === $user->service_id
                || $request->user->manager_id === $user->id;
        }

        return $request->user_id === $user->id;
    }

    public function viewAny(User $user): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return true;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, LeaveRequest $request): bool
    {
        return $request->user_id === $user->id && $request->status->isPending();
    }

    public function delete(User $user, LeaveRequest $request): bool
    {
        return $request->user_id === $user->id && $request->status->isPending();
    }

    public function approve(User $user, LeaveRequest $request): bool
    {
        if ($request->user_id === $user->id) {
            return false;
        }

        if ($user->hasRole(Role::Administrator)) {
            return true;
        }

        if ($user->hasRole(Role::Hr)) {
            return $request->user->manager_id === $user->id;
        }

        if ($user->hasRole(Role::Manager)) {
            return $request->user->manager_id === $user->id;
        }

        return false;
    }

    public function reject(User $user, LeaveRequest $request): bool
    {
        return $this->approve($user, $request);
    }
}
