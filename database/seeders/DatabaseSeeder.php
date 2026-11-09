<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            ReferenceDataSeeder::class,   // données de référence : types de permission, etc. — avant tout le reste
            AdministratorSeeder::class,   // crée le compte admin protégé à partir du .env
        ]);

        if (app()->environment('local')) {
            $this->call(DemoSeeder::class); // jeu de données de démo, jamais en prod
        }
    }
}
