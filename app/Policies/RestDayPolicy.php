<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\RestDay;
use App\Models\Substitution;
use App\Models\User;

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
            return Substitution::isAdministratorUnavailable('validations');
        }

        if ($user->hasRole(Role::Manager)) {
            if ($restDay->user->manager_id === $user->id) {
                return true;
            }
        }

        if (Substitution::canApproveAsSubstitute($user->id, 'validations')) {
            return true;
        }

        return false;
    }

    public function reject(User $user, RestDay $restDay): bool
    {
        return $this->approve($user, $restDay);
    }
}
