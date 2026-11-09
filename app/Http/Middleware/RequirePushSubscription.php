<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class RequirePushSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        // Désactivable localement tant que la page d'abonnement push n'existe pas (config/presentia.php).
        if (! config('presentia.push_required')) {
            return $next($request);
        }

        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        $excludedRoutes = [
            'push-subscriptions.store',
            'push-subscriptions.destroy',
        ];

        if (in_array($request->route()?->getName(), $excludedRoutes, true)) {
            return $next($request);
        }

        if (! $user->hasActivePushSubscription()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Les notifications push sont obligatoires pour accéder à cette fonctionnalité',
                    'requires_push_subscription' => true,
                ], 403);
            }

            return redirect()->route('push.required')->with(
                'warning',
                'Les notifications push sont obligatoires. Veuillez les activer pour continuer.'
            );
        }

        return $next($request);
    }
}
