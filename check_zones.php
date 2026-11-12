<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$zones = \App\Models\WorkZone::with('users')->get();
foreach ($zones as $z) {
    echo "[Zone {$z->id}] {$z->name} — lat={$z->latitude} lng={$z->longitude} radius={$z->radius_m}m active={$z->active}\n";
    foreach ($z->users as $u) {
        echo "  -> {$u->name} ({$u->role->value})\n";
    }
}
