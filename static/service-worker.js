const CACHE_VERSION = "3";
const OFFLINE_PAGE_URL = "/offline.html";
const CACHES = {
  offline: `offline-v${CACHE_VERSION}`
};
const CACHE_NAMES = Object.values(CACHES);

const activate = async () => {
  if (self.registration.navigationPreload) {
    console.log("navigationPreload supported");
    await self.registration.navigationPreload.enable();
  }

  const cacheNames = await caches.keys();

  return Promise.all(
    cacheNames.map(cacheName => {
      if (!CACHE_NAMES.includes(cacheName)) {
        return caches.delete(cacheName);
      }
    })
  );
};

const fetchResponder = async event => {
  const cache = await caches.open(CACHES.offline);

  let response = await event.preloadResponse;

  if (!response) {
    try {
      response = await fetch(event.request);
    } catch {
      // Fetch should only throw when it gets an invalid response of some sort,
      // so there shouldn't be any problem showing the offline page without
      // any real checks
      return cache.match(OFFLINE_PAGE_URL);
    }
  }

  const clonedResponse = response.clone();

  // Add to the cache if the response code is in the 200 range
  if (response.ok) {
    cache.put(event.request, clonedResponse);
  }

  const cachedResponse = await caches.match(event.request);

  return cachedResponse || response;
};

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHES.offline).then(cache => cache.addAll([OFFLINE_PAGE_URL]))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(activate());
});

/*
  Intercept requests and attempt to serve from the cache if possible
*/
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(fetchResponder(event));
});
