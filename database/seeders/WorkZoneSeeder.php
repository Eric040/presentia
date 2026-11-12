<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkZone;
use Illuminate\Database\Seeder;

class WorkZoneSeeder extends Seeder
{
    public function run(): void
    {
        // Coordonnées réelles d'Adiva (JTG MULTISERVICE)
        $zone = WorkZone::updateOrCreate(
            ['name' => 'Siège Adiva'],
            [
                'latitude'  => 6.4201687,
                'longitude' => 2.3377783,
                'radius_m'  => 150,
                'active'    => true,
            ]
        );

        // Supprimer la zone de test si elle existe encore
        WorkZone::where('name', 'Site de test')->delete();

        // Assigner tous les utilisateurs actifs à cette zone
        $userIds = User::where('active', true)->pluck('id');
        $zone->users()->syncWithoutDetaching($userIds);
    }
}
