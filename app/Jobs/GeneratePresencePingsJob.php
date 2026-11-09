<?php

namespace App\Jobs;

use App\Enums\AttendanceStatus;
use App\Enums\PingDeliverability;
use App\Enums\TimeLogType;
use App\Models\AttendanceSession;
use App\Models\PresencePing;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class GeneratePresencePingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const GAP_MINUTES = 30;

    private const TICK_MINUTES = 5;

    public function handle(): void
    {
        $perDay = (int) Setting::get('pings_per_day', 2);
        $timeout = (int) Setting::get('ping_timeout_min', 10);
        $timezone = config('presentia.timezone');

        $now = now($timezone);
        $dayStart = $now->copy()->startOfDay()->utc();
        $dayEnd = $now->copy()->endOfDay()->utc();

        $sessions = AttendanceSession::query()
            ->where('date', $now->toDateString())
            ->where('status', AttendanceStatus::InProgress)
            ->whereNotNull('arrival')
            ->whereNull('departure')
            ->whereHas('user', fn ($q) => $q->where('active', true)
                ->whereHas('pushSubscriptions', fn ($q) => $q->active()))
            ->with(['user.schedule', 'user.service.schedules'])
            ->get();

        foreach ($sessions as $session) {
            $user = $session->user;
            $schedule = $user->schedule ?? $user->service?->schedules->first();

            if (! $schedule || $session->arrival->gt(now()->subMinutes(self::GAP_MINUTES))) {
                continue;
            }

            if ($session->timeLogs()->latest('timestamp')->first()?->type === TimeLogType::BreakStart) {
                continue;
            }

            $sentToday = PresencePing::where('user_id', $user->id)->whereBetween('sent_at', [$dayStart, $dayEnd])->count();
            $recent = PresencePing::where('user_id', $user->id)->where('sent_at', '>', now()->subMinutes(self::GAP_MINUTES))->exists();
            $needed = $perDay - $sentToday;

            if ($needed <= 0 || $recent) {
                continue;
            }

            // Probabilité = pings restants / créneaux de 5 min restants : l'heure d'envoi reste aléatoire.
            $minutesLeft = $now->diffInMinutes(Carbon::parse($schedule->end_time, $timezone), false);
            $slots = (int) floor($minutesLeft / self::TICK_MINUTES);

            if ($slots < 1 || random_int(1, $slots) > $needed) {
                continue;
            }

            $ping = $user->presencePings()->create([
                'sent_at' => now(),
                'expires_at' => now()->addMinutes($timeout),
                'deliverability' => PingDeliverability::Sent,
            ]);

            $user->internalNotifications()->create([
                'type' => 'presence_ping',
                'channel' => 'push',
                'minimal_content' => 'Confirmez votre présence.',
                'data' => ['ping_id' => $ping->id],
            ]);
        }
    }
}
