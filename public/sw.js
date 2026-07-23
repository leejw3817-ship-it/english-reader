// English Reader — Service Worker
// Caches shell assets for offline use and handles fetch strategies

const CACHE_NAME = 'english-reader-v1';
const DATA_CACHE = 'english-reader-data-v1';

// Shell assets to pre-cache on install
const SHELL_ASSETS = [
  '/english-reader/',
  '/english-reader/index.html',
  '/english-reader/css/style.css',
  '/english-reader/js/router.js',
  '/english-reader/js/search.js',
  '/english-reader/js/app.js',
  '/english-reader/manifest.json',
  '/english-reader/favicon.svg',
];

// Install: pre-cache all shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell assets...');
      return cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache strategies based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't cache external API calls
  if (url.hostname === 'api.dictionaryapi.dev') {
    return; // Let browser handle normally
  }

  // Don't cache Google Fonts requests
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Data files (articles.json): Network first, cache fallback
  if (url.pathname.includes('/data/') || url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Shell assets: Cache first, network fallback
  event.respondWith(cacheFirst(event.request));
});

/**
 * Cache-first strategy: Return cached version, fall back to network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline with no cache — return a simple offline page for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      return new Response(
        `<!DOCTYPE html>
        <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Offline — English Reader</title>
        <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#5f6368;text-align:center}
        h2{font-weight:400}</style></head>
        <body><div><h2>📡 You're offline</h2><p>Check your connection and try again.</p></div></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html' } }
      );
    }
    return new Response('', { status: 503 });
  }
}

/**
 * Network-first strategy: Try network, fall back to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return empty JSON as last resort
    if (request.headers.get('Accept')?.includes('application/json')) {
      return new Response('{"articles":[],"lastUpdated":null,"totalArticles":0}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('', { status: 503 });
  }
}
