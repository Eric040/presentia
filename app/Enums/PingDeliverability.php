<?php

namespace App\Enums;

enum PingDeliverability: string
{
    case Sent = 'sent';
    case Undeliverable = 'undeliverable';

    public function label(): string
    {
        return match ($this) {
            self::Sent => 'Envoyé',
            self::Undeliverable => 'Non délivrable',
        };
    }
}