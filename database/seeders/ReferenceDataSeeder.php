<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Reference data (production and development): leave types,
 * default parameters from specifications, fixed-date holidays.
 * Moving holidays (Easter, Ascension, Pentecost, Muslim holidays...)
 * must be entered by the administrator each year (F6.10).
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        foreach ([
            ['Sortie', 'partial'],
            ['Rendez-vous', 'partial'],
            ['Journee complete', 'full_day'],
            ['Mission externe', 'external_mission'],
            ['Teletravail', 'remote_work'],
        ] as [$label, $characteristic]) {
            DB::table('leave_types')->updateOrInsert(
                ['label' => $label],
                ['characteristic' => $characteristic, 'active' => true, 'created_at' => $now, 'updated_at' => $now]
            );
        }

        $settings = [
            ['late_tolerance_min', '10', 'schedules'],
            ['absence_threshold_hours', '2', 'schedules'],
            ['default_radius_m', '100', 'pings'],
            ['max_accuracy_m', '100', 'pings'],
            ['pings_per_day', '2', 'pings'],
            ['ping_timeout_min', '10', 'pings'],
            ['reminder_delay_hours', '4', 'reminders'],
            ['reminders_before_escalation', '3', 'reminders'],
            ['notice_days', '3', 'rest_days'],
            ['employee_idle_min', '30', 'security'],
            ['admin_idle_min', '15', 'security'],
            ['max_file_size_mb', '10', 'messaging'],
            ['writing_assistant_enabled', '1', 'messaging'],
        ];
        foreach ($settings as [$key, $value, $group]) {
            DB::table('settings')->insertOrIgnore([
                'key' => $key, 'value' => $value, 'group' => $group,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Fixed-date holidays (to be verified with the official calendar in force)
        $fixed = [
            '01-01' => "Jour de l'an",
            '01-10' => 'Fete des religions endogenes',
            '05-01' => 'Fete du travail',
            '08-01' => "Fete de l'Independance",
            '08-15' => 'Assomption',
            '11-01' => 'Toussaint',
            '12-25' => 'Noel',
        ];
        foreach ([2026, 2027, 2028] as $year) {
            foreach ($fixed as $dayMonth => $label) {
                DB::table('holidays')->insertOrIgnore([
                    'date' => "$year-$dayMonth", 'label' => $label,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }
    }
}
