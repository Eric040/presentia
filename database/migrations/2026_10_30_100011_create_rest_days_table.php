<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rest_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->date('date');
            // pending, approved, rejected, cancelled
            $table->string('status', 20)->default('pending');
            $table->text('justification')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users');
            $table->dateTime('decided_at')->nullable();
            $table->unsignedSmallInteger('reminder_count')->default(0);
            $table->dateTime('last_reminded_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rest_days');
    }
};
