<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * While must_change_password is true, only the password change page,
 * its update action, and logout are accessible.
 *
 * TO ADAPT: the route names below are hypotheses, verify them
 * with "php artisan route:list" in your project.
 *
 * Registration (bootstrap/app.php):
 *   ->withMiddleware(function (Middleware $middleware) {
 *       $middleware->web(append: [\App\Http\Middleware\ForcePasswordChange::class]);
 *   })
 *
 * Order of barriers after login: 1) password, 2) two-factor authentication
 * (mandatory for administrator and HR), 3) push notifications (F4.6).
 */
class ForcePasswordChange
{
    private const ROUTES_AUTORISEES = [
        'security.edit',
        'user-password.update',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password && ! $request->routeIs(...self::ROUTES_AUTORISEES)) {
            return redirect()->route('user-password.edit');
        }

        return $next($request);
    }
}
