<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('anomalies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('type', 30);
            $table->date('date');
            // to_process, validated, rejected
            $table->string('status', 20)->default('to_process');
            $table->text('justification')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users');
            $table->dateTime('processed_at')->nullable();
            $table->string('reference_type', 30)->nullable(); // ping, session, time_log
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anomalies');
    }
};
