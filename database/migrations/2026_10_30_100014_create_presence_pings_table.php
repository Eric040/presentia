<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presence_pings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->dateTime('sent_at');
            $table->dateTime('expires_at');
            $table->dateTime('responded_at')->nullable();
            // in_zone, out_of_zone, no_response
            $table->string('result', 30)->nullable();
            // sent, undeliverable
            $table->string('deliverability', 30)->default('sent');
            $table->timestamps();
            $table->index(['user_id', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presence_pings');
    }
};
