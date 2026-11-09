<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Test data for development only (local environment).
 * Password for all test accounts: "password-de-test-1".
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('DemoSeeder ignored: non-local environment.');

            return;
        }

        $now = now();
        $admin = User::where('role', Role::Administrator)->first();

        DB::table('services')->insertOrIgnore([
            ['name' => 'Direction', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Ressources Humaines', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Developpement', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Marketing', 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Comptabilite', 'created_at' => $now, 'updated_at' => $now],
        ]);
        $direction = DB::table('services')->where('name', 'Direction')->value('id');
        $rhService = DB::table('services')->where('name', 'Ressources Humaines')->value('id');
        $developpement = DB::table('services')->where('name', 'Developpement')->value('id');
        $marketing = DB::table('services')->where('name', 'Marketing')->value('id');
        $comptabilite = DB::table('services')->where('name', 'Comptabilite')->value('id');

        $creer = function (string $name, string $identifier, Role $role, int $service, ?int $managerId, int $quota) {
            $u = User::firstOrNew(['email' => "$identifier@exemple.test"]);
            $u->forceFill([
                'name' => $name, 'identifier' => $identifier, 'role' => $role,
                'service_id' => $service, 'manager_id' => $managerId,
                'rest_quota' => $quota, 'active' => true,
                'email_verified_at' => now(),
            ]);
            if (! $u->exists) {
                $u->password = Hash::make('password-de-test-1');
            }
            $u->save();

            return $u;
        };

        if ($admin) {
            $admin->forceFill(['service_id' => $direction])->save();
        }

        $rh = $creer('Secretaire Test', 'secretaire', Role::Hr, $rhService, $admin?->id, 2);
        $respDev = $creer('Responsable Dev Test', 'resp_dev', Role::Manager, $developpement, $admin?->id, 2);
        $creer('Employe Un', 'dev_front', Role::Employee, $developpement, $respDev->id, 2);
        $creer('Employe Deux', 'dev_back', Role::Employee, $developpement, $respDev->id, 0);
        $respMkt = $creer('Responsable Marketing Test', 'resp_mkt', Role::Manager, $marketing, $admin?->id, 2);
        $creer('Community Manager Test', 'community_manager', Role::Employee, $marketing, $respMkt->id, 2);
        $creer('Graphiste Test', 'graphiste', Role::Employee, $marketing, $respMkt->id, 2);
        $creer('Comptable Test', 'comptable', Role::Accountant, $comptabilite, $admin?->id, 2);

        DB::table('services')->where('id', $direction)->update(['manager_id' => $admin?->id]);
        DB::table('services')->where('id', $rhService)->update(['manager_id' => $rh->id]);
        DB::table('services')->where('id', $developpement)->update(['manager_id' => $respDev->id]);
        DB::table('services')->where('id', $marketing)->update(['manager_id' => $respMkt->id]);
        DB::table('services')->where('id', $comptabilite)->update(['manager_id' => $admin?->id]);

        // Administrator substitution: HR first
        if ($admin) {
            DB::table('substitutions')->insertOrIgnore([
                'delegator_id' => $admin->id, 'substitute_id' => $rh->id,
                'order' => 1, 'scope' => 'validations',
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Fictitious zone and schedule
        if (! DB::table('work_zones')->exists()) {
            DB::table('work_zones')->insert([
                'name' => 'Site de test', 'latitude' => 6.4489000, 'longitude' => 2.3556000,
                'radius_m' => 100, 'active' => true, 'created_at' => $now, 'updated_at' => $now,
            ]);
        }
        if (! DB::table('schedules')->exists()) {
            DB::table('schedules')->insert([
                'service_id' => $developpement, 'days' => json_encode([1, 2, 3, 4, 5]),
                'start_time' => '08:00', 'end_time' => '17:00',
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }
}
