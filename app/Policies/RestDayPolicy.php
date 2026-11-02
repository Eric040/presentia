<?php

namespace App\Policies;

use App\Models\RestDay;
use App\Models\User;
use App\Enums\Role;

class RestDayPolicy
{
    public function view(User $user, RestDay $restDay): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $restDay->user->service_id === $user->service_id
                || $restDay->user->manager_id === $user->id;
        }

        return $restDay->user_id === $user->id;
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

    public function update(User $user, RestDay $restDay): bool
    {
        return $restDay->user_id === $user->id && $restDay->status->isPending();
    }

    public function delete(User $user, RestDay $restDay): bool
    {
        return $restDay->user_id === $user->id && $restDay->status->isPending();
    }

    public function approve(User $user, RestDay $restDay): bool
    {
        if ($restDay->user_id === $user->id) {
            return false;
        }

        if ($user->hasRole(Role::Administrator)) {
            return true;
        }

        if ($user->hasRole(Role::Hr)) {
            return $restDay->user->manager_id === $user->id;
        }

        if ($user->hasRole(Role::Manager)) {
            return $restDay->user->manager_id === $user->id;
        }

        return false;
    }

    public function reject(User $user, RestDay $restDay): bool
    {
        return $this->approve($user, $restDay);
    }
}
