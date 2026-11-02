<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case InProgress = 'in_progress';
    case Complete = 'complete';
    case Incomplete = 'incomplete';
    case Absence = 'absence';

    public function label(): string
    {
        return match ($this) {
            self::InProgress => 'En cours',
            self::Complete => 'Complète',
            self::Incomplete => 'Incomplète',
            self::Absence => 'Absence',
        };
    }
}