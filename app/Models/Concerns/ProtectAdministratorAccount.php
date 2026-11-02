<?php

namespace App\Models\Concerns;

use LogicException;
use App\Enums\Role;

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
            if ($user->role === Role::Administrator) {
                throw new LogicException("Le compte administrateur ne peut pas etre supprime.");
            }
        });

        static::updating(function ($user) {
            if ($user->getOriginal('role') === Role::Administrator
                && ($user->role !== Role::Administrator || ! $user->active)) {
                throw new LogicException("Le compte administrateur ne peut pas etre desactive ni change de role.");
            }
        });
    }
}
