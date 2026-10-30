<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->nullable()->constrained('services');
            $table->foreignId('user_id')->nullable()->constrained('users');
            $table->json('days'); // e.g. [1,2,3,4,5]
            $table->time('start_time');
            $table->time('end_time');
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
