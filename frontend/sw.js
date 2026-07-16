/**
 * samrosa — Service Worker v1.0.0
 *
 * Strategy:
 *   Static shell (HTML, CSS, JS, manifest) → Cache-first with network fallback
 *   API requests (POST /api/donations/upload) → Network-only
 *     • On network failure: enqueue in IndexedDB outbox for Background Sync
 *     • Background Sync tag: 'samrosa-donation-sync'
 *
 * Cache versioning: bump CACHE_VERSION on every deployment to force
 * the activate handler to purge stale caches on all client devices.
 */

const CACHE_VERSION  = 'v1.0.0';
const CACHE_NAME     = `samrosa-shell-${CACHE_VERSION}`;
const SYNC_TAG       = 'samrosa-donation-sync';
const DB_NAME        = 'samrosa-outbox';
const DB_VERSION     = 1;
const STORE_NAME     = 'pending-donations';
const API_PATH       = '/api/donations/upload';

/** Assets to pre-cache during install — the application shell */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => {
        console.log(`[SW] Shell cached: ${CACHE_NAME}`);
        return self.skipWaiting(); // Activate immediately on install
      })
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('samrosa-shell-') && key !== CACHE_NAME)
            .map((key) => {
              console.log(`[SW] Purging stale cache: ${key}`);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// ─── Fetch Interceptor ────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API mutations: network-only with offline outbox fallback
  if (url.pathname === API_PATH && request.method === 'POST') {
    event.respondWith(handleApiPost(request.clone()));
    return;
  }

  // Static shell: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((networkResponse) => {
        // Cache only successful same-origin GET responses
        if (
          networkResponse.ok &&
          request.method === 'GET' &&
          url.origin === self.location.origin
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// ─── API POST Handler ─────────────────────────────────────────────────────────

/**
 * Try the network first. On failure, enqueue the request body into the
 * IndexedDB outbox and register a Background Sync task if the API is available.
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleApiPost(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    // Network unavailable — persist to outbox
    const body = await request.json();
    await enqueueOutbox(body);

    // Register Background Sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register(SYNC_TAG);
    }

    // Return a synthetic offline response the app JS can detect
    return new Response(
      JSON.stringify({
        success:  false,
        offline:  true,
        queued:   true,
        message:  'You are offline. Your donation has been saved locally and will sync automatically when connectivity is restored.',
      }),
      {
        status:  202,
        headers: { 'Content-Type': 'application/json', 'X-Samrosa-Offline': '1' },
      }
    );
  }
}

// ─── Background Sync ──────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(flushOutbox());
  }
});

/**
 * Drain all pending donations from IndexedDB and replay them against the API.
 * Successfully synced records are deleted from the outbox.
 */
async function flushOutbox() {
  const db      = await openOutboxDB();
  const tx      = db.transaction(STORE_NAME, 'readonly');
  const store   = tx.objectStore(STORE_NAME);
  const records = await idbGetAll(store);
  await tx.done;

  for (const record of records) {
    try {
      const response = await fetch(API_PATH, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(record.payload),
      });

      if (response.ok) {
        const delTx    = db.transaction(STORE_NAME, 'readwrite');
        const delStore = delTx.objectStore(STORE_NAME);
        await idbDelete(delStore, record.id);
        await delTx.done;
        console.log(`[SW] Synced outbox record: ${record.id}`);
      }
    } catch {
      console.warn(`[SW] Failed to sync outbox record ${record.id} — will retry on next sync event`);
    }
  }
}

// ─── IndexedDB Helpers (no external lib) ─────────────────────────────────────

function openOutboxDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db    = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function enqueueOutbox(payload) {
  return new Promise(async (resolve, reject) => {
    const db    = await openOutboxDB();
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add({ payload, queuedAt: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
