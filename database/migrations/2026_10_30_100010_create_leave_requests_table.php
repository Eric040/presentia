<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('type_id')->constrained('leave_types');
            $table->dateTime('start');
            $table->dateTime('end');
            $table->text('reason')->nullable();
            // pending, approved, rejected, cancelled, expired
            $table->string('status', 20)->default('pending');
            $table->text('comment')->nullable();
            $table->unsignedSmallInteger('reminder_count')->default(0);
            $table->dateTime('last_reminded_at')->nullable();
            $table->dateTime('escalated_at')->nullable();
            $table->foreignId('approver_id')->nullable()->constrained('users');
            $table->dateTime('decided_at')->nullable();
            $table->string('supporting_document')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
            $table->index(['status', 'start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
