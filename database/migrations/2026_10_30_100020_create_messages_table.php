<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users');
            $table->foreignId('conversation_id')->nullable()->constrained('conversations');
            $table->foreignId('service_id')->nullable()->constrained('services');
            $table->string('name');
            $table->string('storage_name')->unique(); // random name, storage outside public folder
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size');
            $table->string('hash', 64);
            $table->string('antivirus_status', 20)->default('not_verified');
            $table->dateTime('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
