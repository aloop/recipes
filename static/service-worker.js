const CACHE_VERSION = "5";
const OFFLINE_PAGE_URL = "/offline.html";
const CACHES = {
  offline: `offline-v${CACHE_VERSION}`
};
const CACHE_NAMES = Object.values(CACHES);

const activate = async () => {
  if ("navigationPreload" in self.registration) {
    await self.registration.navigationPreload.enable();
  }

  const cacheNames = await caches.keys();

  return Promise.all([
    ...cacheNames.map(cacheName => {
      if (!CACHE_NAMES.includes(cacheName)) {
        return caches.delete(cacheName);
      }
    }),
    self.clients.claim()
  ]);
};

const fetchResponder = async event => {
  const cache = await caches.open(CACHES.offline);

  let response;

  try {
    if ("preloadResponse" in event) {
      response = await event.preloadResponse;
    }

    if (!response) {
      response = await fetch(event.request);
    }
  } catch {
    // Fetch should only throw when it gets an invalid response of some sort,
    // so when it does we'll try to serve the page from the cache, otherwise
    // show our offline page.
    return (await cache.match(event.request)) || cache.match(OFFLINE_PAGE_URL);
  }

  if (response.status === 200) {
    const clonedResponse = response.clone();
    await cache.put(event.request, clonedResponse);
  }

  return response || cache.match(event.request);
};

self.addEventListener("install", event => {
  self.skipWaiting();

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
