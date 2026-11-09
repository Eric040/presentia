<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Substitution;
use App\Models\User;

class SubstitutionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole(Role::Administrator);
    }

    public function create(User $user): bool
    {
        return $user->hasRole(Role::Administrator);
    }

    public function update(User $user, Substitution $substitution): bool
    {
        return $user->hasRole(Role::Administrator) && $substitution->delegator_id === $user->id;
    }

    public function delete(User $user, Substitution $substitution): bool
    {
        return $this->update($user, $substitution);
    }
}
