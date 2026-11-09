<?php

namespace App\Models;

use App\Enums\PingDeliverability;
use App\Enums\PingResult;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// La réponse (responded_at, result) est affectée explicitement par la logique de pointage.
#[Fillable(['sent_at', 'expires_at', 'deliverability'])]
class PresencePing extends Model
{
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
            'responded_at' => 'datetime',
            'result' => PingResult::class,
            'deliverability' => PingDeliverability::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeAwaitingResponse(Builder $query): Builder
    {
        return $query->whereNull('responded_at')->where('expires_at', '>', now());
    }
}
