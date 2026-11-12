/**
 * Presentia Service Worker
 * Stratégie : Network-first pour les requêtes Inertia/API,
 * Cache-first pour les assets statiques (JS, CSS, fonts, images).
 */

const CACHE_NAME = 'presentia-v1';
const STATIC_CACHE = 'presentia-static-v1';

// Assets à pré-cacher au moment de l'installation
const PRECACHE_URLS = [
    '/offline.html',
];

// Préfixes d'URL qui doivent toujours passer par le réseau
const NETWORK_ONLY = [
    '/attendance/clock-in',
    '/attendance/clock-out',
    '/attendance/break/start',
    '/attendance/break/end',
    '/pings/',
    '/leave-requests',
    '/rest-days',
    '/push-subscriptions',
];

// ── Installation ────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS).catch(() => {
                // offline.html peut ne pas exister encore — on ignore
            });
        })
    );
    self.skipWaiting();
});

// ── Activation ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
                    .map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET et les requêtes cross-origin
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // Assets statiques (JS, CSS, fonts, images) → cache-first
    if (
        url.pathname.startsWith('/build/') ||
        url.pathname.startsWith('/assets/') ||
        url.pathname.startsWith('/fonts/') ||
        /\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/i.test(url.pathname)
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Routes sensibles (pointage, pings…) → toujours réseau, pas de cache
    const isNetworkOnly = NETWORK_ONLY.some((prefix) =>
        url.pathname.startsWith(prefix)
    );
    if (isNetworkOnly) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(
                    JSON.stringify({ message: 'Hors ligne. Cette action nécessite une connexion réseau.' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                )
            )
        );
        return;
    }

    // Pages Inertia et autres → network-first avec repli cache
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(request).then(
                    (cached) =>
                        cached ||
                        caches.match('/offline.html') ||
                        new Response('Hors ligne', { status: 503 })
                )
            )
    );
});

// ── Push notifications ───────────────────────────────────────
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'Presentia', body: event.data.text() };
    }

    const title   = data.title   ?? 'Presentia';
    const options = {
        body:    data.body    ?? data.minimal_content ?? '',
        icon:    '/assets/logo.png',
        badge:   '/assets/logo.png',
        vibrate: [200, 100, 200],
        data:    data.data ?? {},
        tag:     data.tag  ?? 'presentia-notification',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ───────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const target = event.notification.data?.url ?? '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            const existing = windowClients.find((c) => c.url.includes(target));
            if (existing) return existing.focus();
            return clients.openWindow(target);
        })
    );
});
