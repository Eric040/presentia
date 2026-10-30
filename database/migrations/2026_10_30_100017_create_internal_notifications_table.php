<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('internal_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_id')->constrained('users');
            $table->string('type', 40);
            $table->string('channel', 20); // application, push, email
            $table->string('minimal_content');
            $table->json('data')->nullable();
            $table->string('send_status', 20)->default('pending');
            $table->dateTime('read_at')->nullable();
            $table->timestamps();
            $table->index(['recipient_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internal_notifications');
    }
};
