<?php

namespace App\Models;

use App\Enums\PushSubscriptionState;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['device', 'endpoint', 'public_key', 'auth_token'])]
class PushSubscription extends Model
{
    protected static function booted(): void
    {
        // L'empreinte sert à l'unicité : endpoint est un texte trop long pour un index.
        static::saving(function (self $subscription) {
            $subscription->endpoint_hash = hash('sha256', $subscription->endpoint);
        });

        static::creating(function (self $subscription) {
            $subscription->subscribed_at ??= now();
        });
    }

    protected function casts(): array
    {
        return [
            'auth_token' => 'encrypted',
            'state' => PushSubscriptionState::class,
            'subscribed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('state', PushSubscriptionState::Active);
    }
}