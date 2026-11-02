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
        $user = Auth::user();

        if (!$user) {
            return $next($request);
        }

        $excludedRoutes = [
            'settings.push-subscription.store',
            'settings.push-subscription.destroy',
            'push-subscription.verify',
        ];

        if (in_array($request->route()?->getName(), $excludedRoutes, true)) {
            return $next($request);
        }

        if (!$user->hasActivePushSubscription()) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Les notifications push sont obligatoires pour accéder à cette fonctionnalité',
                    'requires_push_subscription' => true,
                ], 403);
            }

            return redirect()->route('settings.push-subscription')->with(
                'warning',
                'Les notifications push sont obligatoires. Veuillez les activer pour continuer.'
            );
        }

        return $next($request);
    }
}
