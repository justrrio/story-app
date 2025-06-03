const CACHE_NAME = "dicoding-story-v1.2";
const ASSETS_CACHE = "assets-v1.2";
const API_CACHE = "api-v1.2";

// Assets to cache for offline use - adjust paths for Vite build output
const urlsToCache = [
  // Core app files
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",

  // App styles and scripts - Vite builds these differently, so we need to cache dynamically
  // We'll handle these with a runtime caching strategy

  // Icons and images
  "/icons/app-icon.svg",
  "/icons/icon-144x144.svg",

  // Third-party resources
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css",
  "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker installed successfully");
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Error during service worker installation:", error);
      })
  );
});

// Clean up old caches when a new service worker is activated
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  const currentCaches = [CACHE_NAME, ASSETS_CACHE, API_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activated and cache cleaned");
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Handle different types of requests
  // 1. API requests (story API calls)
  if (event.request.url.includes("dicoding.com/api")) {
    // For API requests, use network first, fallback to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response for caching
          const responseToCache = response.clone();

          caches.open(API_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If offline, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Static assets (JS, CSS, images)
  if (
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "image"
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response for future use
            caches.open(ASSETS_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // For images, could return a placeholder
            if (event.request.destination === "image") {
              // Return a placeholder image or null
              return new Response("Image unavailable", {
                status: 503,
                statusText: "Service Unavailable",
              });
            }
            return new Response("Resource unavailable offline", {
              status: 503,
              statusText: "Service Unavailable",
            });
          });
      })
    );
    return;
  }

  // 3. HTML navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version of the page
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline, show offline page or cached version
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match("/offline.html");
          });
        })
    );
    return;
  }

  // 4. Default strategy for everything else
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response for caching
          const responseToCache = response.clone();

          // Cache the response for future use
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, show offline page for navigation requests
          if (event.request.destination === "document") {
            return caches.match("/offline.html");
          }
          // For other resources, return a generic offline response
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activated");
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});
