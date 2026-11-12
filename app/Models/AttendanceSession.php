<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Créée et mise à jour par la logique de pointage uniquement, jamais depuis une saisie directe.
#[Fillable(['date', 'arrival', 'departure', 'status', 'late_minutes', 'justification'])]
class AttendanceSession extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'arrival' => 'datetime',
            'departure' => 'datetime',
            'status' => AttendanceStatus::class,
            'late_minutes' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function timeLogs(): HasMany
    {
        return $this->hasMany(TimeLog::class, 'session_id');
    }
}
