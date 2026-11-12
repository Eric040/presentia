<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'light' ? false : true])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#e8720c">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Presentia">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';
                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }
            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" href="/assets/logo.png" sizes="any">
        <link rel="apple-touch-icon" href="/assets/logo.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />

        {{-- Service Worker registration --}}
        <script>
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js', { scope: '/' })
                        .catch(function (err) {
                            console.warn('SW registration failed:', err);
                        });
                });
            }
        </script>
    </body>
</html>
