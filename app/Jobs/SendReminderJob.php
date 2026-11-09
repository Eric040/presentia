<?php

namespace App\Jobs;

use App\Enums\Role;
use App\Models\LeaveRequest;
use App\Models\RestDay;
use App\Models\Setting;
use App\Models\Substitution;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class SendReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $hours = (int) Setting::get('reminder_delay_hours', 4);
        $max = max(1, (int) Setting::get('reminders_before_escalation', 3));

        $this->remind(LeaveRequest::pending(), 'leave_request', $hours, $max);
        $this->remind(RestDay::pending(), 'rest_day', $hours, $max);
    }

    // Chaque tranche de $max rappels fait passer la demande au niveau suivant de la chaîne.
    private function remind(Builder $query, string $kind, int $hours, int $max): void
    {
        $threshold = now()->subHours($hours);

        $items = $query
            ->where(function ($q) use ($threshold) {
                $q->where('last_reminded_at', '<=', $threshold)
                    ->orWhere(fn ($q) => $q->whereNull('last_reminded_at')->where('created_at', '<=', $threshold));
            })
            ->with('user.manager')
            ->get();

        foreach ($items as $item) {
            $chain = $this->chain($item, $kind);
            $level = intdiv($item->reminder_count, $max);

            if ($level >= $chain->count()) {
                continue;
            }

            $chain[$level]->internalNotifications()->create([
                'type' => $level === 0 ? 'reminder' : 'escalation',
                'channel' => 'push',
                'minimal_content' => 'Une demande attend votre décision.',
                'data' => ['kind' => $kind, 'id' => $item->id],
            ]);

            $item->reminder_count++;
            $item->last_reminded_at = now();

            if ($level > 0 && $item instanceof LeaveRequest) {
                $item->escalated_at ??= now();
            }

            $item->save();
        }
    }

    // Permission : responsable, administrateur, puis suppléants. Jour de repos : administrateur, puis suppléants.
    private function chain(Model $item, string $kind): Collection
    {
        $admin = User::where('role', Role::Administrator)->where('active', true)->first();

        $substitutes = $admin
            ? Substitution::active()
                ->where('delegator_id', $admin->id)
                ->where('scope', 'validations')
                ->orderBy('order')
                ->with('substitute')
                ->get()
                ->pluck('substitute')
            : collect();

        $manager = $kind === 'leave_request' ? $item->user->manager : null;

        return collect([$manager, $admin])
            ->merge($substitutes)
            ->filter(fn ($user) => $user && $user->active && $user->id !== $item->user_id)
            ->unique('id')
            ->values();
    }
}
