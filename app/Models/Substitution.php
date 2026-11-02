<?php

namespace App\Models;

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
}