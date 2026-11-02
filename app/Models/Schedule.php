<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Un horaire vise soit un service, soit un employé précis.
#[Fillable(['service_id', 'user_id', 'days', 'start_time', 'end_time', 'break_start', 'break_end'])]
class Schedule extends Model
{
    protected function casts(): array
    {
        return [
            'days' => 'array',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}