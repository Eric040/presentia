<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

// assigned_by est affecté explicitement par le code, jamais depuis une saisie.
#[Fillable(['code'])]
class Capacity extends Model
{
    public function beneficiary(): MorphTo
    {
        return $this->morphTo();
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}