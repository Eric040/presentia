<?php

namespace App\Policies;

use App\Models\PresencePing;
use App\Models\User;
use App\Enums\Role;

class PresencePingPolicy
{
    public function view(User $user, PresencePing $ping): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $ping->user->service_id === $user->service_id
                || $ping->user->manager_id === $user->id;
        }

        return $ping->user_id === $user->id;
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

    public function update(User $user, PresencePing $ping): bool
    {
        return false;
    }

    public function delete(User $user, PresencePing $ping): bool
    {
        return false;
    }
}
