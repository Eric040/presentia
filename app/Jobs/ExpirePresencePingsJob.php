<?php

namespace App\Jobs;

use App\Enums\PingDeliverability;
use App\Enums\PingResult;
use App\Models\PresencePing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ExpirePresencePingsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        PresencePing::query()
            ->whereNull('responded_at')
            ->whereNull('result')
            ->where('deliverability', PingDeliverability::Sent)
            ->where('expires_at', '<', now())
            ->with('user')
            ->get()
            ->each(function (PresencePing $ping) {
                $ping->result = PingResult::NoResponse;
                $ping->save();

                $ping->user->anomalies()->create([
                    'type' => 'ping_no_response',
                    'date' => $ping->sent_at->copy()->timezone(config('presentia.timezone'))->toDateString(),
                    'reference_type' => 'ping',
                    'reference_id' => $ping->id,
                ]);
            });
    }
}
