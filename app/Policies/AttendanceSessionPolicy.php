<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\AttendanceSession;
use App\Models\User;

class AttendanceSessionPolicy
{
    public function view(User $user, AttendanceSession $session): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $session->user->service_id === $user->service_id
                || $session->user->manager_id === $user->id;
        }

        return $session->user_id === $user->id;
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
        return false;
    }

    public function update(User $user, AttendanceSession $session): bool
    {
        return false;
    }

    public function delete(User $user, AttendanceSession $session): bool
    {
        return false;
    }
}
