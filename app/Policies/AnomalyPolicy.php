<?php

namespace App\Policies;

use App\Models\Anomaly;
use App\Models\User;
use App\Enums\Role;

class AnomalyPolicy
{
    public function view(User $user, Anomaly $anomaly): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $anomaly->user->service_id === $user->service_id
                || $anomaly->user->manager_id === $user->id;
        }

        return $anomaly->user_id === $user->id;
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

    public function update(User $user, Anomaly $anomaly): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $anomaly->user->service_id === $user->service_id
                || $anomaly->user->manager_id === $user->id;
        }

        return false;
    }

    public function delete(User $user, Anomaly $anomaly): bool
    {
        return false;
    }

    public function process(User $user, Anomaly $anomaly): bool
    {
        if ($anomaly->user_id === $user->id) {
            return false;
        }

        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            return $anomaly->user->service_id === $user->service_id
                || $anomaly->user->manager_id === $user->id;
        }

        return false;
    }
}
