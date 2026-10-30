<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('attendance_sessions');
            // arrival, departure, break_start, break_end
            $table->string('type', 20);
            $table->dateTime('timestamp');
            $table->boolean('in_zone');
            // RG2: never exact coordinates, only result and approximate values
            $table->unsignedInteger('approx_distance')->nullable();
            $table->unsignedInteger('approx_accuracy')->nullable();
            // outside_schedule, outside_authorized_site, worked_on_rest_day
            $table->string('flag', 30)->nullable();
            $table->timestamps();
            $table->index(['session_id', 'timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('time_logs');
    }
};
