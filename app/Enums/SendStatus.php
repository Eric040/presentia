<?php

namespace App\Enums;

enum SendStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Sent => 'Envoyée',
            self::Failed => 'Échec',
        };
    }
}
