<?php

namespace App\Enums;

enum TimeLogType: string
{
    case Arrival = 'arrival';
    case Departure = 'departure';
    case BreakStart = 'break_start';
    case BreakEnd = 'break_end';
    case Resume = 'resume';

    public function label(): string
    {
        return match ($this) {
            self::Arrival => 'Arrivée',
            self::Departure => 'Départ',
            self::BreakStart => 'Début de pause',
            self::BreakEnd => 'Fin de pause',
            self::Resume => 'Reprise du travail',
        };
    }
}
