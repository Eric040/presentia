<?php

namespace App\Enums;

enum AnomalyStatus: string
{
    case ToProcess = 'to_process';
    case Validated = 'validated';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::ToProcess => 'À traiter',
            self::Validated => 'Validée',
            self::Rejected => 'Rejetée',
        };
    }
}