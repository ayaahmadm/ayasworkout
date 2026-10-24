/* Service worker: caches the app shell so it opens offline.
 * Bump CACHE when you change any file so phones pick up the new version. */
const CACHE = 'workout-tracker-v1';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/storage.js',
  'js/ui.js',
  'js/data.js',
  'js/diagram.js',
  'js/charts.js',
  'js/screens/today.js',
  'js/screens/plan.js',
  'js/screens/library.js',
  'js/screens/progress.js',
  'js/screens/settings.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from cache, refresh the cache in the background (stale-while-revalidate).
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(cached => {
        const network = fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
        return cached || network;
      })
    )
  );
});
