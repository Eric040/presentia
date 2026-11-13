<?php

namespace App\Services;

use App\Enums\SendStatus;
use App\Models\InternalNotification;
use App\Models\User;

class NotificationService
{
    /**
     * Envoie une notification de reprise du travail (14h30)
     */
    public function sendResumeReminder(User $user): void
    {
        InternalNotification::create([
            'recipient_id'     => $user->id,
            'type'             => 'resume_reminder',
            'channel'          => 'push',
            'minimal_content'  => 'Il est 14h30 - Pensez à pointer votre reprise du travail',
            'data'             => [
                'action_url' => route('attendance.index'),
                'action_label' => 'Pointer maintenant',
            ],
            'send_status'      => SendStatus::Pending,
        ]);
    }

    /**
     * Notifie l'employé qu'une anomalie a été créée
     */
    public function sendAnomalyCreated(User $user, string $anomalyType, string $date, int $anomalyId): void
    {
        $typeLabels = [
            'absence'       => 'Absence détectée',
            'late_arrival'  => 'Retard enregistré',
            'out_of_zone'   => 'Pointage hors zone',
            'missing_resume'=> 'Reprise non pointée',
        ];

        $label = $typeLabels[$anomalyType] ?? 'Anomalie détectée';

        InternalNotification::create([
            'recipient_id'     => $user->id,
            'type'             => 'anomaly_created',
            'channel'          => 'application',
            'minimal_content'  => "{$label} le {$date}",
            'data'             => [
                'anomaly_id'   => $anomalyId,
                'anomaly_type' => $anomalyType,
                'date'         => $date,
                'action_url'   => route('anomalies.index'),
                'action_label' => 'Voir l\'anomalie',
            ],
            'send_status'      => SendStatus::Pending,
        ]);
    }

    /**
     * Notifie les administrateurs/RH d'une nouvelle anomalie à traiter
     */
    public function notifyAdminsOfAnomaly(int $userId, string $userName, string $anomalyType, string $date, int $anomalyId): void
    {
        $typeLabels = [
            'absence'       => 'Absence',
            'late_arrival'  => 'Retard',
            'out_of_zone'   => 'Hors zone',
            'missing_resume'=> 'Reprise manquée',
        ];

        $label = $typeLabels[$anomalyType] ?? 'Anomalie';

        // Récupérer tous les administrateurs et RH
        $admins = User::whereHas('roles', function ($query) {
            $query->whereIn('name', ['administrator', 'hr']);
        })->get();

        foreach ($admins as $admin) {
            InternalNotification::create([
                'recipient_id'     => $admin->id,
                'type'             => 'anomaly_pending',
                'channel'          => 'application',
                'minimal_content'  => "{$label} - {$userName} ({$date})",
                'data'             => [
                    'user_id'      => $userId,
                    'user_name'    => $userName,
                    'anomaly_id'   => $anomalyId,
                    'anomaly_type' => $anomalyType,
                    'date'         => $date,
                    'action_url'   => route('anomalies.index'),
                    'action_label' => 'Traiter',
                ],
                'send_status'      => SendStatus::Pending,
            ]);
        }
    }

    /**
     * Notifie l'employé que son anomalie a été traitée
     */
    public function notifyAnomalyProcessed(User $user, string $decision, string $anomalyType, string $date): void
    {
        $emoji = $decision === 'validated' ? '✅' : '❌';
        $status = $decision === 'validated' ? 'validée' : 'rejetée';

        InternalNotification::create([
            'recipient_id'     => $user->id,
            'type'             => 'anomaly_processed',
            'channel'          => 'application',
            'minimal_content'  => "{$emoji} Anomalie {$status} ({$date})",
            'data'             => [
                'decision'     => $decision,
                'anomaly_type' => $anomalyType,
                'date'         => $date,
                'action_url'   => route('anomalies.index'),
                'action_label' => 'Voir le détail',
            ],
            'send_status'      => SendStatus::Pending,
        ]);
    }
}