<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;
use App\Enums\Role;

class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            if ($conversation->type === 'service' && $conversation->service_id === $user->service_id) {
                return true;
            }
        }

        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Conversation $conversation): bool
    {
        if ($conversation->type === 'service') {
            return $user->hasRole(Role::Administrator, Role::Hr)
                || ($user->hasRole(Role::Manager) && $conversation->service_id === $user->service_id);
        }

        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Conversation $conversation): bool
    {
        if ($conversation->type === 'service') {
            return $user->hasRole(Role::Administrator, Role::Hr)
                || ($user->hasRole(Role::Manager) && $conversation->service_id === $user->service_id);
        }

        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    public function addUser(User $user, Conversation $conversation): bool
    {
        if ($conversation->type === 'direct') {
            return false;
        }

        if ($conversation->type === 'service') {
            return $user->hasRole(Role::Administrator, Role::Hr)
                || ($user->hasRole(Role::Manager) && $conversation->service_id === $user->service_id);
        }

        return $conversation->users()->where('user_id', $user->id)->exists();
    }
}
