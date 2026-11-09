<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;

class RequireOtp
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if ($user?->hasRole(Role::Administrator)
            && ! $user->must_change_password
            && ! $request->session()->get('otp_verified')
            && ! $request->routeIs('otp.*', 'logout')) {
            return redirect()->route('otp.show');
        }

        return $next($request);
    }
}