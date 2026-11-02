<?php

namespace App\Jobs;

use App\Models\LeaveRequest;
use App\Models\RestDay;
use App\Models\InternalNotification;
use App\Models\Substitution;
use App\Models\Setting;
use App\Enums\LeaveStatus;
use App\Enums\RestDayStatus;
use App\Enums\SendStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct()
    {
        //
    }

    public function handle(): void
    {
        $reminderInterval = (int) Setting::get('reminders.interval_hours', 4);
        $maxReminders = (int) Setting::get('reminders.max_count', 3);

        $this->remindLeaveRequests($reminderInterval, $maxReminders);
        $this->remindRestDays($reminderInterval, $maxReminders);
    }

    private function remindLeaveRequests(int $intervalHours, int $maxReminders): void
    {
        $pendingRequests = LeaveRequest::where('status', LeaveStatus::Pending)
            ->where('reminder_count', '<', $maxReminders)
            ->where(function ($query) use ($intervalHours) {
                $query->whereNull('created_at')
                    ->orWhere('created_at', '<=', now()->subHours($intervalHours));
            })
            ->where(function ($query) use ($intervalHours) {
                $lastReminder = now()->subHours($intervalHours);
                $query->whereNull('escalated_at')
                    ->orWhere('escalated_at', '<=', $lastReminder);
            })
            ->get();

        foreach ($pendingRequests as $request) {
            $approver = $this->getApprover($request->user);

            if (!$approver) {
                $this->escalate($request);
                continue;
            }

            $notification = InternalNotification::create([
                'recipient_id' => $approver->id,
                'title' => 'Rappel : Permission en attente',
                'content' => "La permission de {$request->user->name} du {$request->start->format('d/m/Y')} est en attente d'approbation.",
                'related_type' => 'leave_request',
                'related_id' => $request->id,
                'send_status' => SendStatus::Pending,
            ]);

            $request->increment('reminder_count');
            $request->update(['escalated_at' => now()]);

            Log::info("Reminder sent for leave request {$request->id} to approver {$approver->id}");
        }
    }

    private function remindRestDays(int $intervalHours, int $maxReminders): void
    {
        $pendingRestDays = RestDay::where('status', RestDayStatus::Pending)
            ->where('reminder_count', '<', $maxReminders)
            ->where(function ($query) use ($intervalHours) {
                $query->whereNull('created_at')
                    ->orWhere('created_at', '<=', now()->subHours($intervalHours));
            })
            ->where(function ($query) use ($intervalHours) {
                $lastReminder = now()->subHours($intervalHours);
                $query->whereNull('escalated_at')
                    ->orWhere('escalated_at', '<=', $lastReminder);
            })
            ->get();

        foreach ($pendingRestDays as $restDay) {
            $approver = $this->getApprover($restDay->user);

            if (!$approver) {
                $this->escalateRestDay($restDay);
                continue;
            }

            $notification = InternalNotification::create([
                'recipient_id' => $approver->id,
                'title' => 'Rappel : Jour de repos en attente',
                'content' => "Le jour de repos de {$restDay->user->name} pour le {$restDay->date->format('d/m/Y')} est en attente d'approbation.",
                'related_type' => 'rest_day',
                'related_id' => $restDay->id,
                'send_status' => SendStatus::Pending,
            ]);

            $restDay->increment('reminder_count');
            $restDay->update(['escalated_at' => now()]);

            Log::info("Reminder sent for rest day {$restDay->id} to approver {$approver->id}");
        }
    }

    private function getApprover($user): ?\App\Models\User
    {
        if ($user->manager_id) {
            return \App\Models\User::find($user->manager_id);
        }

        return \App\Models\User::where('role', \App\Enums\Role::Administrator)->first();
    }

    private function escalate(LeaveRequest $request): void
    {
        $substitution = Substitution::where('delegator_id', $request->user->manager_id)
            ->where('scope', 'validations')
            ->orderBy('order')
            ->first();

        if ($substitution) {
            $notification = InternalNotification::create([
                'recipient_id' => $substitution->substitute_id,
                'title' => 'Escalade : Permission en attente',
                'content' => "La permission de {$request->user->name} a été escaladée suite à l'absence de réponse de l'approbateur.",
                'related_type' => 'leave_request',
                'related_id' => $request->id,
                'send_status' => SendStatus::Pending,
            ]);

            Log::info("Leave request {$request->id} escalated to substitute {$substitution->substitute_id}");
        } else {
            $admin = \App\Models\User::where('role', \App\Enums\Role::Administrator)->first();
            if ($admin) {
                $notification = InternalNotification::create([
                    'recipient_id' => $admin->id,
                    'title' => 'Escalade : Permission en attente',
                    'content' => "La permission de {$request->user->name} a été escaladée à l'administrateur.",
                    'related_type' => 'leave_request',
                    'related_id' => $request->id,
                    'send_status' => SendStatus::Pending,
                ]);

                Log::info("Leave request {$request->id} escalated to administrator");
            }
        }
    }

    private function escalateRestDay(RestDay $restDay): void
    {
        $substitution = Substitution::where('delegator_id', $restDay->user->manager_id)
            ->where('scope', 'validations')
            ->orderBy('order')
            ->first();

        if ($substitution) {
            $notification = InternalNotification::create([
                'recipient_id' => $substitution->substitute_id,
                'title' => 'Escalade : Jour de repos en attente',
                'content' => "Le jour de repos de {$restDay->user->name} a été escaladé suite à l'absence de réponse de l'approbateur.",
                'related_type' => 'rest_day',
                'related_id' => $restDay->id,
                'send_status' => SendStatus::Pending,
            ]);

            Log::info("Rest day {$restDay->id} escalated to substitute {$substitution->substitute_id}");
        } else {
            $admin = \App\Models\User::where('role', \App\Enums\Role::Administrator)->first();
            if ($admin) {
                $notification = InternalNotification::create([
                    'recipient_id' => $admin->id,
                    'title' => 'Escalade : Jour de repos en attente',
                    'content' => "Le jour de repos de {$restDay->user->name} a été escaladé à l'administrateur.",
                    'related_type' => 'rest_day',
                    'related_id' => $restDay->id,
                    'send_status' => SendStatus::Pending,
                ]);

                Log::info("Rest day {$restDay->id} escalated to administrator");
            }
        }
    }
}
