<?php

namespace App\Models;

use App\Enums\SendStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['type', 'channel', 'minimal_content', 'data'])]
class InternalNotification extends Model
{
    protected function casts(): array
    {
        return [
            'data' => 'array',
            'send_status' => SendStatus::class,
            'read_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }
}
