<?php

namespace App\Models\Concerns;

use LogicException;

/**
 * Le compte administrateur ne peut etre ni supprime, ni desactive, ni change de role.
 * Les evenements Eloquent ne couvrent pas les requetes SQL directes : voir aussi
 * la migration 2026_10_30_100026 (garde-fous au niveau de la base).
 */
trait ProtectAdministratorAccount
{
    public static function bootProtectAdministratorAccount(): void
    {
        static::deleting(function ($user) {
            if ($user->role === 'administrateur') {
                throw new LogicException("Le compte administrateur ne peut pas etre supprime.");
            }
        });

        static::updating(function ($user) {
            if ($user->getOriginal('role') === 'administrateur'
                && ($user->role !== 'administrateur' || ! $user->actif)) {
                throw new LogicException("Le compte administrateur ne peut pas etre desactive ni change de role.");
            }
        });
    }
}
