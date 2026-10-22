const CACHE_NAME = 'festibites-v95-smart-cache';
const CACHE_PREFIX = 'festibites-';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './preview.html',
  './how-to-use.html',
  './weekly-meal-planner.html',
  './weekly-meal-planner.js',
  './recipes.json',
  './recipe-of-the-day.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './sitemap.xml'
];

// Pre-cache the core pages and assets so the app remains useful offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Remove only older FestiBites caches; leave unrelated apps' caches alone.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Do not intercept third-party requests such as Supabase or image CDN calls.
  if (url.origin !== self.location.origin) return;

  const isPageNavigation = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');
  const isRecipeData = /\/(recipes|recipe-of-the-day)\.json$/.test(url.pathname);

  if (isPageNavigation || isRecipeData) {
    // Network-first keeps pages and recipe data up to date, with an offline fallback.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        // If the home/maintenance entry cannot be reached, prefer the actual app offline.
        const isHomeEntry = /\/(?:index\.html)?$/.test(url.pathname);
        if (isPageNavigation && isHomeEntry) {
          const appPage = await caches.match('./preview.html');
          if (appPage) return appPage;
        }

        const cached = await caches.match(request, { ignoreSearch: isRecipeData });
        if (cached) return cached;

        if (isPageNavigation) {
          return (await caches.match('./preview.html')) ||
            (await caches.match('./index.html')) ||
            Response.error();
        }

        return Response.error();
      }
    })());
    return;
  }

  // Cache-first for static assets avoids an unnecessary network request on every hit.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
