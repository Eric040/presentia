<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$users = \App\Models\User::all();
foreach ($users as $u) {
    $zones = $u->workZones()->count();
    $schedule = $u->schedule ? $u->schedule->id : ($u->service?->schedules()->first()?->id ?? 'none');
    $sessions = \App\Models\AttendanceSession::where('user_id', $u->id)->orderByDesc('id')->first();
    $tlCount = $sessions ? \App\Models\TimeLog::where('session_id', $sessions->id)->count() : 0;
    echo "User [{$u->id}] {$u->name} role={$u->role->value} zones={$zones} schedule={$schedule}\n";
    if ($sessions) {
        echo "  Last session [{$sessions->id}] date={$sessions->date} arrival={$sessions->arrival} status={$sessions->status->value} timelogs={$tlCount}\n";
    } else {
        echo "  No sessions\n";
    }
}

$zones = \App\Models\WorkZone::all();
echo "\nWork zones:\n";
foreach ($zones as $z) {
    echo "  [{$z->id}] {$z->name} active={$z->active} lat={$z->latitude} lng={$z->longitude} radius={$z->radius_m}m\n";
}
