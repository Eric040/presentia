<?php

namespace App\Enums;

enum LeaveCharacteristic: string
{
    case Partial = 'partial';
    case FullDay = 'full_day';
    case ExternalMission = 'external_mission';
    case RemoteWork = 'remote_work';

    public function label(): string
    {
        return match ($this) {
            self::Partial => 'Partielle',
            self::FullDay => 'Journée complète',
            self::ExternalMission => 'Mission externe',
            self::RemoteWork => 'Télétravail',
        };
    }
}