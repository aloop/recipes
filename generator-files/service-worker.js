const CACHE_VERSION = "1";
const OFFLINE_PAGE_URL = "/offline.html";
const CACHES = {
  offline: `offline-v${CACHE_VERSION}`
};

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHES.offline).then(cache => cache.addAll([OFFLINE_PAGE_URL]))
  );
});

self.addEventListener("activate", event => {
  const currentCacheNames = Object.values(CACHES);

  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCacheNames.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

/*
  Intercept requests and attempt to serve from the cache if possible
*/
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.open(CACHES.offline).then(cache => {
      return cache.match(event.request).then(cached => {
        const request = fetch(event.request)
          .then(response => {
            const clonedResponse = response.clone();
            // Add to the cache if the response code is in the 200 range
            if (response.ok) {
              cache.put(event.request, clonedResponse);
            }

            return response;
          })
          // Fetch should only throw when it gets an invalid response of some sort,
          // so there shouldn't be any problem showing the offline page without
          // any real checks
          .catch(() => cache.match(OFFLINE_PAGE_URL));

        return cached || request;
      });
    })
  );
});
