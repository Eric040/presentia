<?php

namespace App\Models;

use App\Enums\LeaveStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Le statut, l'approbateur et la décision sont affectés explicitement, jamais en masse.
#[Fillable(['type_id', 'start', 'end', 'reason', 'supporting_document'])]
class LeaveRequest extends Model
{
    protected function casts(): array
    {
        return [
            'start' => 'datetime',
            'end' => 'datetime',
            'status' => LeaveStatus::class,
            'reminder_count' => 'integer',
            'escalated_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class, 'type_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', LeaveStatus::Pending);
    }
}