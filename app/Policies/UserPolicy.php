<?php

namespace App\Policies;

use App\Models\User;
use App\Enums\Role;

class UserPolicy
{
    public function view(User $user, User $target): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $target->service_id === $user->service_id
                || $target->manager_id === $user->id;
        }

        return $target->id === $user->id;
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
        return $user->hasRole(Role::Administrator);
    }

    public function update(User $user, User $target): bool
    {
        if ($user->hasRole(Role::Administrator)) {
            return true;
        }

        if ($user->hasRole(Role::Hr)) {
            return $target->id === $user->id;
        }

        if ($user->hasRole(Role::Manager)) {
            return $target->id === $user->id;
        }

        return $target->id === $user->id;
    }

    public function delete(User $user, User $target): bool
    {
        if ($target->hasRole(Role::Administrator)) {
            return false;
        }

        return $user->hasRole(Role::Administrator);
    }

    public function changeRole(User $user, User $target): bool
    {
        if ($target->hasRole(Role::Administrator)) {
            return false;
        }

        return $user->hasRole(Role::Administrator);
    }

    public function deactivate(User $user, User $target): bool
    {
        if ($target->hasRole(Role::Administrator)) {
            return false;
        }

        return $user->hasRole(Role::Administrator);
    }

    public function manageService(User $user, User $target): bool
    {
        return $user->hasRole(Role::Administrator);
    }

    public function manageQuota(User $user, User $target): bool
    {
        return $user->hasRole(Role::Administrator);
    }
}
