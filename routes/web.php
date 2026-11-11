<?php

use App\Http\Controllers\AnomalyController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\PresencePingController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\RestDayController;
use App\Http\Controllers\SubstitutionController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified', 'push'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::prefix('leave-requests')->name('leave-requests.')->group(function () {
        Route::get('/', [LeaveRequestController::class, 'index'])->name('index');
        Route::get('/types', [LeaveRequestController::class, 'types'])->name('types');
        Route::get('/{leaveRequest}', [LeaveRequestController::class, 'show'])->name('show');
        Route::post('/', [LeaveRequestController::class, 'store'])->name('store');
        Route::patch('/{leaveRequest}', [LeaveRequestController::class, 'update'])->name('update');
        Route::delete('/{leaveRequest}', [LeaveRequestController::class, 'destroy'])->name('destroy');
        Route::patch('/{leaveRequest}/approve', [LeaveRequestController::class, 'approve'])->name('approve');
        Route::patch('/{leaveRequest}/reject', [LeaveRequestController::class, 'reject'])->name('reject');
        Route::patch('/{leaveRequest}/cancel', [LeaveRequestController::class, 'cancel'])->name('cancel');
    });

    Route::prefix('rest-days')->name('rest-days.')->group(function () {
        Route::get('/', [RestDayController::class, 'index'])->name('index');
        Route::post('/', [RestDayController::class, 'store'])->name('store');
        Route::patch('/{restDay}/approve', [RestDayController::class, 'approve'])->name('approve');
        Route::patch('/{restDay}/reject', [RestDayController::class, 'reject'])->name('reject');
        Route::patch('/{restDay}/cancel', [RestDayController::class, 'cancel'])->name('cancel');
    });

    // User management (admin only)
    Route::prefix('users')->name('users.')->group(function () {
        Route::get('/', [UserController::class, 'index'])->name('index');
        Route::post('/', [UserController::class, 'store'])->name('store');
        Route::patch('/{user}/quota', [UserController::class, 'updateQuota'])->name('quota');
        Route::patch('/{user}/role', [UserController::class, 'updateRole'])->name('role');
        Route::patch('/{user}/service', [UserController::class, 'updateService'])->name('service');
        Route::patch('/{user}/deactivate', [UserController::class, 'deactivate'])->name('deactivate');
        Route::patch('/{user}/activate', [UserController::class, 'activate'])->name('activate');
    });

    Route::resource('substitutions', SubstitutionController::class)->except(['create', 'show', 'edit']);

    Route::controller(AttendanceController::class)->prefix('attendance')->name('attendance.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{attendanceSession}', 'show')->name('show')->whereNumber('attendanceSession');
        Route::post('clock-in', 'clockIn')->name('clock-in');
        Route::post('clock-out', 'clockOut')->name('clock-out');
        Route::post('break/start', 'startBreak')->name('break.start');
        Route::post('break/end', 'endBreak')->name('break.end');
    });

    Route::controller(PresencePingController::class)->prefix('pings')->name('pings.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{presencePing}', 'show')->name('show')->whereNumber('presencePing');
        Route::post('/', 'sendPing')->name('send');
        Route::post('{presencePing}/respond', 'respond')->name('respond');
        Route::patch('{presencePing}/undeliverable', 'markUndeliverable')->name('undeliverable');
    });

    Route::controller(AnomalyController::class)->prefix('anomalies')->name('anomalies.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('{anomaly}', 'show')->name('show');
        Route::patch('{anomaly}/justify', 'justify')->name('justify');
        Route::patch('{anomaly}/process', 'process')->name('process');
    });
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('push/required', 'push/required')->name('push.required');
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('push-subscriptions/{pushSubscription}', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
});

require __DIR__.'/settings.php';
