<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Anomaly;
use App\Models\User;

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
        // Tous les rôles peuvent accéder à la liste — le contrôleur filtre par périmètre.
        // Les employés ne voient que leurs propres anomalies (filtre dans le contrôleur).
        return true;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Anomaly $anomaly): bool
    {
        // L'employé peut justifier sa propre anomalie
        if ($anomaly->user_id === $user->id) {
            return true;
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
