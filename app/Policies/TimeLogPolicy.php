<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\TimeLog;
use App\Models\User;

class TimeLogPolicy
{
    public function view(User $user, TimeLog $log): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            $sessionUser = $log->session->user;

            return $sessionUser->service_id === $user->service_id
                || $sessionUser->manager_id === $user->id;
        }

        return $log->session->user_id === $user->id;
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

    public function update(User $user, TimeLog $log): bool
    {
        return false;
    }

    public function delete(User $user, TimeLog $log): bool
    {
        return false;
    }
}
