/* Movie Night Mahjong: keeps the game playable offline once it has been opened.
 *
 * Every file comes from the network when it answers within a few seconds, so updates arrive
 * straight away; otherwise from the copy kept on the phone. Whatever the network brings is kept
 * for next time. Change VERSION when files are added or removed.
 */
var VERSION = 'movie-night-v1';
var FILES = [
  './', 'index.html', 'privacy.html', 'manifest.webmanifest', 'css/style.css',
  'fonts/atkinson-hyperlegible-400.woff2', 'fonts/atkinson-hyperlegible-700.woff2', 'fonts/bungee-400.woff2',
  'js/content.js', 'js/engine.js', 'js/endless.js', 'js/chess.js', 'js/puzzle.js', 'js/playtest.js', 'js/art.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
var WAIT = 3000;

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(VERSION).then(function (cache) { return cache.addAll(FILES); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fresh(request, VERSION));
});

function fresh(request, name) {
  return caches.open(name).then(function (cache) {
    var network = fetch(request).then(function (response) {
      if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
      return response;
    });
    // Pages are kept without their ?query, so a friend's link or ?playtest=1 still opens offline.
    var saved = cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    var late = new Promise(function (resolve) { setTimeout(resolve, WAIT); });
    return Promise.race([network.catch(function () { return null; }), late.then(function () { return null; })])
      .then(function (response) {
        return response || saved.then(function (hit) { return hit || network; });
      });
  });
}
