/* Night Shift — offline cache.
   The whole game is one HTML file plus photographs, so it is small enough to
   store outright. Installed to a home screen it launches with no connection at
   all, which matters if the building's wifi is the thing you are hiding from. */
const CACHE = "night-shift-v18";
const ASSETS = [
  "index.html",
  "manifest.json",
  "images/ani_auditor.png",
  "images/ani_phantom.png",
  "images/ani_warden.png",
  "images/cam_01.jpg",
  "images/cam_02.jpg",
  "images/cam_03.jpg",
  "images/cam_04.jpg",
  "images/cam_05.jpg",
  "images/cam_06.jpg",
  "images/cam_07.jpg",
  "images/cam_08.jpg",
  "images/cam_09.jpg",
  "images/cam_10.jpg",
  "images/cam_11.jpg",
  "images/cam_12.jpg",
  "images/cam_13.jpg",
  "images/icon-180.png",
  "images/icon-192.png",
  "images/icon-512.png",
  "images/office.jpg",
  "images/position_map.png",
  "images/scare_auditor.jpg",
  "images/scare_phantom.jpg",
  "images/scare_warden.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

/* Cache first: nothing here changes without a new version, and a photograph
   that loads instantly is worth more than one that is fresh. */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("index.html")))
  );
});
