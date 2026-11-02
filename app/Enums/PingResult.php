<?php

namespace App\Enums;

enum PingResult: string
{
    case InZone = 'in_zone';
    case OutOfZone = 'out_of_zone';
    case NoResponse = 'no_response';

    public function label(): string
    {
        return match ($this) {
            self::InZone => 'Dans la zone',
            self::OutOfZone => 'Hors zone',
            self::NoResponse => 'Sans réponse',
        };
    }
}