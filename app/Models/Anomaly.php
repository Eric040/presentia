<?php

namespace App\Models;

use App\Enums\AnomalyStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// reference_type vaut 'ping', 'session' ou 'time_log' : ce ne sont pas des noms de classes, donc pas de morphTo.
#[Fillable(['type', 'date', 'justification', 'reference_type', 'reference_id'])]
class Anomaly extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'status' => AnomalyStatus::class,
            'processed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function scopeToProcess(Builder $query): Builder
    {
        return $query->where('status', AnomalyStatus::ToProcess);
    }
}
