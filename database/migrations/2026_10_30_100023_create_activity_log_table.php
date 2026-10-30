<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_log', function (Blueprint $table) {
            $table->id();
            // No FK: the log must never depend on a deletable row.
            $table->unsignedBigInteger('author_id')->nullable()->index();
            $table->string('role', 30)->nullable();
            $table->string('action', 60)->index();
            $table->string('related_type', 60)->nullable();
            $table->unsignedBigInteger('related_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('timestamp')->useCurrent()->index();
            $table->string('ip_address', 45)->nullable();
            $table->string('device', 255)->nullable();
            $table->string('result', 10)->default('success');
            $table->string('previous_hash', 64)->nullable();
            $table->string('hash', 64);
            $table->index(['related_type', 'related_id']);
            // RG2 / S3.2: never write GPS coordinates or message content there.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }
};
