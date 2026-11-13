<?php

namespace App\Console\Commands;

use App\Models\AttendanceSession;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendResumeReminders extends Command
{
    protected $signature = 'attendance:send-resume-reminders';
    protected $description = 'Envoie une notification à 14h30 pour rappeler de pointer la reprise';

    public function handle(NotificationService $notificationService): int
    {
        $today = Carbon::today();
        
        // Récupérer tous les employés qui ont pointé aujourd'hui mais pas encore la reprise
        $sessions = AttendanceSession::with(['user', 'timeLogs'])
            ->whereDate('date', $today)
            ->whereNotNull('arrival')
            ->whereNull('departure')
            ->get();

        $count = 0;

        foreach ($sessions as $session) {
            // Vérifier que l'utilisateur a un horaire avec pause déjeuner
            $schedule = $session->user->schedule ?? $session->user->service?->schedules()->whereNull('user_id')->first();
            
            if (!$schedule || !$schedule->break_end) {
                continue; // Pas d'horaire avec pause
            }

            // Vérifier si la reprise a déjà été pointée
            $hasResumed = $session->timeLogs->contains(fn($log) => $log->type->value === 'resume');
            
            if ($hasResumed) {
                continue; // Déjà pointé
            }

            // Envoyer la notification
            $notificationService->sendResumeReminder($session->user);
            $count++;
        }

        $this->info("✅ {$count} notification(s) de reprise envoyée(s)");

        return Command::SUCCESS;
    }
}
