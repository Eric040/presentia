<?php

namespace App\Models;

use App\Enums\TimeLogFlag;
use App\Enums\TimeLogType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// RG2 : seules des valeurs approximatives sont stockées, jamais de coordonnées exactes.
#[Fillable(['type', 'timestamp', 'in_zone', 'approx_distance', 'approx_accuracy', 'flag'])]
class TimeLog extends Model
{
    protected function casts(): array
    {
        return [
            'type' => TimeLogType::class,
            'timestamp' => 'datetime',
            'in_zone' => 'boolean',
            'approx_distance' => 'integer',
            'approx_accuracy' => 'integer',
            'flag' => TimeLogFlag::class,
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'session_id');
    }
}