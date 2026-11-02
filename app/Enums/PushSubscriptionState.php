<?php

namespace App\Enums;

enum PushSubscriptionState: string
{
    case Active = 'active';
    case Expired = 'expired';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Expired => 'Expirée',
            self::Revoked => 'Révoquée',
        };
    }
}