<?php

namespace App\Console\Commands;

use App\Models\AttendanceSession;
use App\Models\TimeLog;
use App\Enums\TimeLogType;
use Illuminate\Console\Command;

class CleanupOrphanedSessions extends Command
{
    protected $signature = 'attendance:cleanup-orphaned';
    protected $description = 'Supprime les sessions de pointage sans time_logs d\'arrivée (sessions orphelines)';

    public function handle()
    {
        $sessions = AttendanceSession::with('timeLogs')
            ->whereNull('arrival')
            ->get();

        if ($sessions->isEmpty()) {
            $this->info('Aucune session orpheline trouvée.');
            return 0;
        }

        $this->warn("{$sessions->count()} session(s) orpheline(s) trouvée(s):");

        foreach ($sessions as $session) {
            $this->line("  - ID {$session->id} - User {$session->user_id} - Date {$session->date}");
        }

        if ($this->confirm('Voulez-vous supprimer ces sessions ?')) {
            foreach ($sessions as $session) {
                $session->timeLogs()->delete();
                $session->delete();
            }
            $this->info('Sessions supprimées avec succès.');
            return 0;
        }

        $this->info('Opération annulée.');
        return 1;
    }
}
