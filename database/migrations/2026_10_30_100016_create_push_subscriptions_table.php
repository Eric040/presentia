<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('device', 100)->nullable();
            $table->text('endpoint');
            $table->string('endpoint_hash', 64)->unique(); // sha256 of endpoint
            $table->text('public_key')->nullable();      // to be encrypted in model
            $table->text('auth_token')->nullable();        // to be encrypted in model
            $table->string('state', 20)->default('active');  // active, expired
            $table->dateTime('subscribed_at');
            $table->timestamps();
            $table->index(['user_id', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
