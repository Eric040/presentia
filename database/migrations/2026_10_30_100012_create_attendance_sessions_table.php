<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->date('date');
            $table->dateTime('arrival')->nullable();
            $table->dateTime('departure')->nullable();
            // in_progress, complete, incomplete, absence
            $table->string('status', 20)->default('in_progress');
            $table->unsignedInteger('late_minutes')->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'date']); // RG3: one session per day
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
