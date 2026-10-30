<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('substitutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delegator_id')->constrained('users');
            $table->foreignId('substitute_id')->constrained('users');
            $table->dateTime('start')->nullable();
            $table->dateTime('end')->nullable();
            $table->unsignedTinyInteger('order')->default(1); // 1 = HR, 2 = designated person
            $table->string('scope', 30)->default('validations');
            $table->timestamps();
            $table->index(['delegator_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('substitutions');
    }
};
