/// <reference lib="webworker" />
// BC Auto Service Worker v1.0
const CACHE_NAME = 'bcauto-cache-v1';

// Static assets to pre-cache on install
const PRECACHE_URLS = [
    '/',
    '/favicon.ico',
    '/pages/main/index.html',
    '/pages/admin/index.html',
    '/pages/hr/index.html',
    '/pages/dashboard/index.html',
    '/assets/css/design-system.css',
    '/assets/css/app-shell.css',
    '/icons/bc_auto_logo.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/screenshots/screenshot_desktop.png',
    '/icons/screenshots/screenshot_mobile.png'
];

/** @type {ServiceWorkerGlobalScope} */
const sw = /** @type {any} */ (self);

// Install: pre-cache essential shell
sw.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => sw.skipWaiting())
    );
});

// Activate: clean up old caches
sw.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => sw.clients.claim())
    );
});

// Fetch strategy
sw.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Network-first for API calls (PocketBase)
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache successful API responses for offline fallback
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for static assets (CSS, JS, fonts, images, SVG)
    if (
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.webp') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.woff')
    ) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for HTML pages (always get fresh, fall back to cache)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => caches.match(event.request).then(cached => {
                return cached || caches.match('/') || new Response('', { status: 404 });
            }))
    );
});
