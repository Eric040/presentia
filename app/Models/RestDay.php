<?php

namespace App\Models;

use App\Enums\RestDayStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// L'employé ne propose que la date ; la décision (statut, justification du refus) est affectée explicitement.
#[Fillable(['date'])]
class RestDay extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'status' => RestDayStatus::class,
            'decided_at' => 'datetime',
            'reminder_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', RestDayStatus::Pending);
    }
}