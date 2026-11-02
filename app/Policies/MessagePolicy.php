<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;
use App\Models\Conversation;
use App\Enums\Role;

class MessagePolicy
{
    public function view(User $user, Message $message): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($user->hasRole(Role::Manager)) {
            $conversation = $message->conversation;
            if ($conversation->type === 'service' && $conversation->service_id === $user->service_id) {
                return true;
            }
        }

        return $message->conversation->users()->where('user_id', $user->id)->exists();
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user, Conversation $conversation): bool
    {
        if ($user->hasRole(Role::Administrator, Role::Hr)) {
            return true;
        }

        if ($conversation->type === 'service') {
            return $user->hasRole(Role::Manager) && $conversation->service_id === $user->service_id;
        }

        return $conversation->users()->where('user_id', $user->id)->exists();
    }

    public function update(User $user, Message $message): bool
    {
        return $message->author_id === $user->id;
    }

    public function delete(User $user, Message $message): bool
    {
        return $message->author_id === $user->id;
    }
}
