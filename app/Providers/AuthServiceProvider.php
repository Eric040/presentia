<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Models\LeaveRequest;
use App\Models\RestDay;
use App\Models\AttendanceSession;
use App\Models\TimeLog;
use App\Models\PresencePing;
use App\Models\Anomaly;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Policies\LeaveRequestPolicy;
use App\Policies\RestDayPolicy;
use App\Policies\AttendanceSessionPolicy;
use App\Policies\TimeLogPolicy;
use App\Policies\PresencePingPolicy;
use App\Policies\AnomalyPolicy;
use App\Policies\ConversationPolicy;
use App\Policies\MessagePolicy;
use App\Policies\UserPolicy;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        LeaveRequest::class => LeaveRequestPolicy::class,
        RestDay::class => RestDayPolicy::class,
        AttendanceSession::class => AttendanceSessionPolicy::class,
        TimeLog::class => TimeLogPolicy::class,
        PresencePing::class => PresencePingPolicy::class,
        Anomaly::class => AnomalyPolicy::class,
        Conversation::class => ConversationPolicy::class,
        Message::class => MessagePolicy::class,
        User::class => UserPolicy::class,
    ];

    public function boot(): void
    {
        //
    }
}
