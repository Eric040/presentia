<?php

namespace App\Enums;

enum TimeLogFlag: string
{
    case OutsideSchedule = 'outside_schedule';
    case OutsideAuthorizedSite = 'outside_authorized_site';
    case WorkedOnRestDay = 'worked_on_rest_day';

    public function label(): string
    {
        return match ($this) {
            self::OutsideSchedule => 'Hors horaire',
            self::OutsideAuthorizedSite => 'Hors site autorisé',
            self::WorkedOnRestDay => 'Jour de repos travaillé',
        };
    }
}
