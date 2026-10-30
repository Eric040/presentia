<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations');
            $table->foreignId('author_id')->constrained('users');
            $table->text('content');
            $table->string('related_type', 30)->nullable(); // leave_request, anomaly...
            $table->unsignedBigInteger('related_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['conversation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
