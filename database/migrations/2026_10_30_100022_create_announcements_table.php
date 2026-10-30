<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users');
            $table->foreignId('service_id')->nullable()->constrained('services');
            $table->string('scope', 20)->default('service'); // service, general
            $table->text('content');
            $table->dateTime('published_at');
            $table->timestamps();
        });

        Schema::create('announcement_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('announcement_id')->constrained('announcements')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->dateTime('read_at');
            $table->unique(['announcement_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcement_reads');
        Schema::dropIfExists('announcements');
    }
};
