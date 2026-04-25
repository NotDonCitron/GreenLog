const STATIC_CACHE = 'greenlog-static-v3';
const API_CACHE = 'greenlog-api-v3';

const MAX_STATIC = 100;
const MAX_API = 50;
const IMAGE_EXTENSIONS = ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'];
const STATIC_DESTINATIONS = new Set(['audio', 'font', 'image', 'manifest', 'script', 'style', 'video']);
const BYPASS_IMAGE_HOSTS = new Set([
  'leafly-public.imgix.net',
  'uwjyvvvykyueuxtdkscs.supabase.co',
]);

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/offline',
];

// Install: cache static assets only
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// LRU eviction helper
async function evictLRU(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length >= maxEntries) {
    await cache.delete(keys[0]);
  }
}

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  const pathname = url.pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

function shouldBypassExternalImageRequest(request, url) {
  return url.origin !== self.location.origin &&
    BYPASS_IMAGE_HOSTS.has(url.hostname) &&
    isImageRequest(request, url);
}

function isHtmlLikeRequest(request) {
  if (request.destination === 'document') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html') || accept.includes('text/x-component');
}

function shouldCacheSameOriginRequest(request, url) {
  if (url.origin !== self.location.origin) return false;
  if (STATIC_ASSETS.includes(url.pathname)) return true;
  return STATIC_DESTINATIONS.has(request.destination);
}

function shouldCacheResponse(response) {
  if (!response.ok) return false;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) return false;
  if (contentType.includes('text/x-component')) return false;
  return true;
}

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (isHtmlLikeRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  // Bypass Clerk completely to avoid issues with 307 redirects and clerk-js
  if (url.hostname.includes('clerk')) return;

  // API routes → network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, clone);
              evictLRU(API_CACHE, MAX_API);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigation requests → network only, fallback to /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    );
    return;
  }

  // Next.js dev chunks → never cache, always network
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request));
    return;
  }

  // CannaLOG media route → network only. These URLs can be replaced by admin/user uploads
  // while keeping the same path, so the service worker must not pin stale images.
  if (url.origin === self.location.origin && url.pathname.startsWith('/media/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Let the browser handle external image requests for imgix and Supabase Storage natively.
  // Rebuilding the Request in the SW can change fetch metadata in ways those CDNs reject.
  if (shouldBypassExternalImageRequest(request, url)) {
    return;
  }

  // Dynamic app routes → NEVER cache, always network.
  // These contain user-specific data (strains, grows, profile, etc.)
  // and must always be fetched fresh. The SW's Cache-First strategy
  // would serve stale data otherwise.
  if (
    url.pathname.startsWith('/strains') ||
    url.pathname.startsWith('/grows') ||
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/collection') ||
    url.pathname.startsWith('/harvest') ||
    request.headers.has('service-worker-navigation-preload')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets → cache first, fall back to network.
  // Never cache HTML/RSC shells to prevent stale chunk manifests across deploys.
  if (shouldCacheSameOriginRequest(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (shouldCacheResponse(response)) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
              evictLRU(STATIC_CACHE, MAX_STATIC);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Same-origin dynamic requests we do not explicitly cache should always hit network.
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(request));
  } else {
    // External images/CDNs (Supabase Storage, imgix, etc.) → Network only, never cache.
    //
    // IMPORTANT: we must pass cache:'no-store' so the browser's HTTP cache does NOT
    // serve a previously cached 404 / error response for these URLs (e.g. from when
    // the Referer header was wrong). Without this, the browser serves the stale
    // cached error even though our fetch() is now correct.
    //
    // referrerPolicy:'no-referrer' ensures imgix does not receive a Referer header
    // (imgix blocks requests that send one).
    try {
      const req = new Request(request, {
        referrerPolicy: 'no-referrer',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',          // bypass browser HTTP cache
      });
      event.respondWith(fetch(req));
    } catch (_) {
      // NetworkError or similar — pass through so the img onError fires
      event.respondWith(fetch(request));
    }
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Neue Benachrichtigung',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GreenLog', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ==========================================
// IndexedDB helpers for offline action queue
// ==========================================
const DB_NAME = 'greenlog-offline';
const DB_VERSION = 1;
const STORE_NAME = 'action-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function enqueueAction(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({ ...action, createdAt: Date.now() });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getQueuedActions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removeAction(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// Background sync – flush offline queue
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'greenlog-sync') {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  console.log('[SW] Background sync triggered – flushing offline queue');
  const actions = await getQueuedActions();
  if (!actions.length) return;

  for (const action of actions) {
    try {
      const res = await fetch(action.url, {
        method: action.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...action.headers
        },
        body: JSON.stringify(action.body)
      });

      if (res.ok || res.status === 409) {
        // Success or duplicate – remove from queue
        await removeAction(action.id);
        console.log(`[SW] Flushed action ${action.id} (${action.type})`);
      } else {
        console.warn(`[SW] Action ${action.id} failed with ${res.status}, will retry`);
      }
    } catch (err) {
      console.error(`[SW] Action ${action.id} network error:`, err);
      // Keep in queue for next sync
    }
  }
}

// ==========================================
// Message handler from main thread
// ==========================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
    event.waitUntil(flushOfflineQueue());
  }
});
