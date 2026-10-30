<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('identifier', 60)->nullable()->unique();
            // employee, manager, hr, administrator (and later: accountant)
            $table->string('role', 30)->default('employee');
            // SQLite cannot add a foreign key after the fact: simple index here.
            // For MySQL in production, a dedicated migration can add the constraints.
            $table->unsignedBigInteger('service_id')->nullable()->index();
            $table->unsignedBigInteger('manager_id')->nullable()->index();
            $table->unsignedTinyInteger('rest_quota')->default(0);
            $table->boolean('active')->default(true);
            $table->string('trusted_device', 128)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['identifier']);
            $table->dropIndex(['service_id']);
            $table->dropIndex(['manager_id']);
            $table->dropColumn([
                'identifier', 'role', 'service_id', 'manager_id',
                'rest_quota', 'active', 'trusted_device',
            ]);
        });
    }
};
