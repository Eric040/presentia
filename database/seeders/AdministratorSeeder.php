<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the administrator account (the director) from .env:
 *   PRESENTIA_ADMIN_NAME, PRESENTIA_ADMIN_IDENTIFIER,
 *   PRESENTIA_ADMIN_EMAIL, PRESENTIA_ADMIN_PASSWORD (minimum 12 characters)
 * Re-running the seeder does not rewrite the password of an existing account.
 */
class AdministratorSeeder extends Seeder
{
    public function run(): void
    {
        $name = env('PRESENTIA_ADMIN_NAME');
        $identifier = env('PRESENTIA_ADMIN_IDENTIFIER');
        $email = env('PRESENTIA_ADMIN_EMAIL');
        $password = env('PRESENTIA_ADMIN_PASSWORD');

        if (! $name || ! $identifier || ! $email || ! $password) {
            $this->command?->error('Missing PRESENTIA_ADMIN_* variables in .env: administrator not created.');
            return;
        }

        if (strlen($password) < 12) {
            $this->command?->error('PRESENTIA_ADMIN_PASSWORD: minimum 12 characters (S2.1).');
            return;
        }

        $user = User::firstOrNew(['email' => $email]);
        $exists = $user->exists;

        $user->forceFill([
            'name' => $name,
            'identifier' => $identifier,
            'role' => 'administrateur',
            'rest_quota' => 0,
            'active' => true,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ]);

        if (! $exists) {
            $user->password = Hash::make($password);
        }

        $user->save();

        $this->command?->info($exists ? 'Administrator updated.' : 'Administrator created.');
    }
}
