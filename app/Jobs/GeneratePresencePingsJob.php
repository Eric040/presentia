<?php

namespace App\Jobs;

use App\Models\PresencePing;
use App\Models\Setting;
use App\Models\User;
use App\Enums\PingDeliverability;
use App\Enums\Role;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

class GeneratePresencePingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct()
    {
        //
    }

    public function handle(): void
    {
        $pingsPerDay = (int) Setting::get('pings.per_day', 2);
        $pingResponseMinutes = (int) Setting::get('pings.response_minutes', 10);

        $today = Carbon::today();
        $activeUsers = User::where('active', true)
            ->whereHas('pushSubscriptions', function ($query) {
                $query->where('active', true);
            })
            ->get();

        foreach ($activeUsers as $user) {
            $existingPingsCount = PresencePing::where('user_id', $user->id)
                ->whereDate('sent_at', $today)
                ->count();

            if ($existingPingsCount >= $pingsPerDay) {
                continue;
            }

            $pingsToGenerate = $pingsPerDay - $existingPingsCount;

            for ($i = 0; $i < $pingsToGenerate; $i++) {
                $this->generateRandomPing($user, $pingResponseMinutes);
            }
        }

        Log::info("Generated presence pings for {$activeUsers->count()} users");
    }

    private function generateRandomPing(User $user, int $responseMinutes): void
    {
        $now = now();
        $workStart = $this->getWorkStart($user, $now);
        $workEnd = $this->getWorkEnd($user, $now);

        if (!$workStart || !$workEnd) {
            return;
        }

        $minTime = $workStart->copy()->addHours(1);
        $maxTime = $workEnd->copy()->subHours(1);

        if ($minTime->gte($maxTime)) {
            return;
        }

        $randomMinutes = rand(0, $maxTime->diffInMinutes($minTime));
        $pingTime = $minTime->copy()->addMinutes($randomMinutes);

        if ($pingTime->lt(now()) || $pingTime->gt(now()->addHours(8))) {
            return;
        }

        $expiresAt = $pingTime->copy()->addMinutes($responseMinutes);

        PresencePing::create([
            'user_id' => $user->id,
            'sent_at' => $pingTime,
            'expires_at' => $expiresAt,
            'deliverability' => PingDeliverability::Sent,
        ]);

        Log::info("Generated ping for user {$user->id} at {$pingTime}");
    }

    private function getWorkStart(User $user, ?Carbon $date = null): ?Carbon
    {
        $schedule = $this->getUserSchedule($user);
        if (!$schedule) {
            return null;
        }

        $time = Carbon::parse($schedule->start_time);
        if ($date) {
            $time->setDateFrom($date);
        }

        return $time;
    }

    private function getWorkEnd(User $user, ?Carbon $date = null): ?Carbon
    {
        $schedule = $this->getUserSchedule($user);
        if (!$schedule) {
            return null;
        }

        $time = Carbon::parse($schedule->end_time);
        if ($date) {
            $time->setDateFrom($date);
        }

        return $time;
    }

    private function getUserSchedule(User $user): ?\App\Models\Schedule
    {
        $serviceSchedule = $user->service?->schedules()->first();
        if ($serviceSchedule) {
            return $serviceSchedule;
        }

        return $user->schedule;
    }
}
