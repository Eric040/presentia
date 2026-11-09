<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// order : 1 = RH, 2 = personne désignée. Créée uniquement par l'administrateur.
#[Fillable(['delegator_id', 'substitute_id', 'start', 'end', 'order', 'scope'])]
class Substitution extends Model
{
    protected function casts(): array
    {
        return [
            'start' => 'datetime',
            'end' => 'datetime',
            'order' => 'integer',
        ];
    }

    public function delegator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'delegator_id');
    }

    public function substitute(): BelongsTo
    {
        return $this->belongsTo(User::class, 'substitute_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where(fn ($q) => $q->whereNull('start')->orWhere('start', '<=', now()))
            ->where(fn ($q) => $q->whereNull('end')->orWhere('end', '>=', now()));
    }

    public static function isAdministratorUnavailable(string $scope = 'validations'): bool
    {
        return static::whereHas('delegator', fn ($q) => $q->where('role', Role::Administrator->value))
            ->where('scope', $scope)
            ->active()
            ->exists();
    }

    public static function isHrUnavailable(string $scope = 'validations'): bool
    {
        return static::whereHas('delegator', fn ($q) => $q->where('role', Role::Hr->value))
            ->where('scope', $scope)
            ->active()
            ->exists();
    }

    public static function isActiveSubstitute(int $substituteId, string $scope = 'validations'): bool
    {
        return static::where('substitute_id', $substituteId)
            ->where('scope', $scope)
            ->active()
            ->exists();
    }

    public static function isActiveSubstituteForAdminOrHr(int $substituteId, string $scope = 'validations'): bool
    {
        return static::where('substitute_id', $substituteId)
            ->where('scope', $scope)
            ->whereHas('delegator', fn ($q) => $q->whereIn('role', [Role::Administrator->value, Role::Hr->value]))
            ->active()
            ->exists();
    }

    public static function canApproveAsSubstitute(int $substituteId, string $scope = 'validations'): bool
    {
        $substitutions = static::where('substitute_id', $substituteId)
            ->where('scope', $scope)
            ->active()
            ->with('delegator')
            ->get();

        foreach ($substitutions as $substitution) {
            if ($substitution->delegator->hasRole(Role::Administrator)) {
                if ($substitution->order !== 2) {
                    return true;
                }
                if ($substitution->order === 2 && static::isHrUnavailable($scope)) {
                    return true;
                }
            }

            if ($substitution->delegator->hasRole(Role::Hr)) {
                if (static::isAdministratorUnavailable($scope)) {
                    return true;
                }
            }
        }

        return false;
    }
}
