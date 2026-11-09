<?php

namespace App\Models;

use App\Enums\LeaveCharacteristic;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['label', 'characteristic', 'active'])]
class LeaveType extends Model
{
    protected function casts(): array
    {
        return [
            'characteristic' => LeaveCharacteristic::class,
            'active' => 'boolean',
        ];
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'type_id');
    }
}
