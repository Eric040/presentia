<?php

namespace App\Enums;

enum RestDayStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'En attente',
            self::Approved => 'Approuvé',
            self::Rejected => 'Refusé',
            self::Cancelled => 'Annulé',
        };
    }

    public function isPending(): bool
    {
        return $this === self::Pending;
    }
}
