<?php

use App\Enums\AttendanceStatus;
use App\Jobs\ExpirePresencePingsJob;
use App\Jobs\GeneratePresencePingsJob;
use App\Jobs\SendReminderJob;
use App\Models\AttendanceSession;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::job(new GeneratePresencePingsJob)->everyFiveMinutes()->withoutOverlapping();
Schedule::job(new ExpirePresencePingsJob)->everyMinute()->withoutOverlapping();
Schedule::job(new SendReminderJob)->hourly()->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    AttendanceSession::whereDate('date', '<', today())
        ->whereNotNull('arrival')
        ->whereNull('departure')
        ->where('status', AttendanceStatus::InProgress->value)
        ->update(['status' => AttendanceStatus::Incomplete->value]);
})->dailyAt('00:10');