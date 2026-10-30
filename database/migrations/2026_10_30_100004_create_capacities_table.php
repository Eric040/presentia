<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capacities', function (Blueprint $table) {
            $table->id();
            $table->string('code', 60);
            $table->string('beneficiary_type', 20); // service or user
            $table->unsignedBigInteger('beneficiary_id');
            $table->foreignId('assigned_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['code', 'beneficiary_type', 'beneficiary_id']);
            $table->index(['beneficiary_type', 'beneficiary_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capacities');
    }
};
