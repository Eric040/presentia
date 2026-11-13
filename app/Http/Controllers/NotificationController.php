<?php

namespace App\Http\Controllers;

use App\Models\InternalNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Récupère les notifications de l'utilisateur connecté (API pour bell)
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $notifications = InternalNotification::where('recipient_id', $user->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn($n) => [
                'id'          => $n->id,
                'type'        => $n->type,
                'content'     => $n->minimal_content,
                'data'        => $n->data,
                'read_at'     => $n->read_at?->toIso8601String(),
                'created_at'  => $n->created_at->toIso8601String(),
                'is_unread'   => is_null($n->read_at),
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $notifications->where('is_unread', true)->count(),
        ]);
    }

    /**
     * Récupère les notifications pour la page dédiée (avec filtres et pagination)
     */
    public function page(Request $request)
    {
        $user = Auth::user();
        $status = $request->query('status', 'all');

        $query = InternalNotification::where('recipient_id', $user->id);

        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        $notifications = $query->latest()->paginate(20);

        $notifications->getCollection()->transform(function ($n) {
            return [
                'id'          => $n->id,
                'type'        => $n->type,
                'content'     => $n->minimal_content,
                'data'        => $n->data,
                'read_at'     => $n->read_at?->toIso8601String(),
                'created_at'  => $n->created_at->toIso8601String(),
                'is_unread'   => is_null($n->read_at),
            ];
        });

        $stats = [
            'total'   => InternalNotification::where('recipient_id', $user->id)->count(),
            'unread'  => InternalNotification::where('recipient_id', $user->id)->whereNull('read_at')->count(),
        ];

        return inertia('notifications/index', [
            'notifications' => [
                'data' => $notifications->items(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
            'stats'         => $stats,
            'filters'       => ['status' => $status === 'all' ? null : $status],
        ]);
    }

    /**
     * Marque une notification comme lue
     */
    public function markAsRead(Request $request, InternalNotification $notification)
    {
        if ($notification->recipient_id !== Auth::id()) {
            abort(403, 'Non autorisé');
        }

        if (is_null($notification->read_at)) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Marque toutes les notifications comme lues
     */
    public function markAllAsRead(Request $request)
    {
        InternalNotification::where('recipient_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    /**
     * Supprime une notification
     */
    public function destroy(InternalNotification $notification)
    {
        if ($notification->recipient_id !== Auth::id()) {
            abort(403, 'Non autorisé');
        }

        $notification->delete();

        return response()->json(['success' => true]);
    }
}
