/* Service worker: la app abre sin conexión; los datos siempre vienen de Firebase. */
var CACHE = "etiquetas-v1";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
var CDN = ["cdn.jsdelivr.net", "www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;
  if (!same && CDN.indexOf(url.hostname) === -1) return;       /* Firebase Database: sin caché */
  if (req.mode === "navigate") {                                 /* página: red primero, caché si falla */
    e.respondWith(fetch(req).then(function (r) {
      var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put("./index.html", copy); }); return r;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {          /* resto: caché y actualización en segundo plano */
    var net = fetch(req).then(function (r) {
      if (r && (r.ok || r.type === "opaque")) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return r;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
