<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\HttpException;

class HandleInertiaErrors
{
    /**
     * Codes d'erreur avec pages dédiées
     */
    private const CUSTOM_ERROR_PAGES = [403, 404, 419, 500, 503];

    public function handle(Request $request, \Closure $next)
    {
        $response = $next($request);

        // Ne gérer que les requêtes Inertia
        if (!$request->header('X-Inertia')) {
            return $response;
        }

        $status = $response->status();

        // Ignorer les réponses OK
        if ($status >= 200 && $status < 300) {
            return $response;
        }

        // Gérer les pages d'erreur avec code HTTP approprié
        if ($status >= 400) {
            $page = in_array($status, self::CUSTOM_ERROR_PAGES)
                ? "errors/{$status}"
                : 'errors/default';

            return Inertia::render($page, ['status' => $status])
                ->toResponse($request)
                ->setStatusCode($status);
        }

        return $response;
    }
}
