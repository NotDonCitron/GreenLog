// Client-side helper for offline action queuing and sync
// Works with the Service Worker's IndexedDB queue

interface QueuedAction {
  id?: number;
  type: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body: Record<string, unknown>;
  createdAt?: number;
}

const DB_NAME = 'greenlog-offline';
const DB_VERSION = 1;
const STORE_NAME = 'action-queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Queue an action to be synced when back online.
 * If online, returns { queued: false } so the caller can execute immediately.
 * If offline, stores in IndexedDB and registers background sync.
 */
export async function queueAction(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<{ queued: boolean; id?: number }> {
  if (isOnline()) {
    return { queued: false };
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add({ ...action, createdAt: Date.now() });
    req.onsuccess = () => {
      const id = req.result as number;
      // Try to register background sync
      registerBackgroundSync().catch(() => {
        // Background sync not supported — queued action will be flushed
        // manually when the app comes back online via the online event
      });
      resolve({ queued: true, id });
    };
    req.onerror = () => reject(req.error);
  });
}

// Extend ServiceWorkerRegistration for Background Sync API
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
}

/**
 * Register a background sync tag with the service worker
 */
async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    throw new Error('Background sync not supported');
  }
  const registration = await navigator.serviceWorker.ready;
  const regWithSync = registration as ServiceWorkerRegistrationWithSync;
  await regWithSync.sync.register('greenlog-sync');
}

/**
 * Manually trigger the service worker to flush the offline queue.
 * Call this when the app detects it's back online.
 */
export async function flushOfflineQueue(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const regWithSync = registration as ServiceWorkerRegistrationWithSync;

  if ('sync' in registration && regWithSync.sync) {
    try {
      await regWithSync.sync.register('greenlog-sync');
    } catch {
      // Fallback: send message to SW
      if (registration.active) {
        registration.active.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
      }
    }
  } else if (registration.active) {
    registration.active.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
  }
}

/**
 * Execute a fetch with automatic offline queuing fallback.
 * If online: executes fetch normally.
 * If offline: queues the action and returns a synthetic "queued" response.
 *
 * Usage:
 *   const res = await fetchWithOfflineFallback('/api/grows', { method: 'POST', body: {...} });
 */
export async function fetchWithOfflineFallback(
  url: string,
  init: RequestInit & { jsonBody?: Record<string, unknown> }
): Promise<Response> {
  if (isOnline()) {
    return fetch(url, init);
  }

  const queued = await queueAction({
    type: 'fetch',
    url,
    method: init.method || 'POST',
    headers: init.headers as Record<string, string> || {},
    body: init.jsonBody || {},
  });

  if (queued.queued) {
    // Return a synthetic "Accepted" response so the UI can show "queued" state
    return new Response(
      JSON.stringify({ queued: true, message: 'Action queued for sync' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return fetch(url, init);
}
