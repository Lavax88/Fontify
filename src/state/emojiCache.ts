/**
 * Fontify - Emoji Font Blob Cache (IndexedDB)
 * Stores downloaded emoji font binaries locally on the device
 * for instantaneous offline preview and zero-latency switching.
 */

const DB_NAME = 'fontify_emoji_db';
const DB_VERSION = 1;
const STORE_NAME = 'emoji_blobs';

export interface CachedEmojiEntry {
  id: string;
  name: string;
  size: number;
  buffer: ArrayBuffer;
  cachedAt: number;
}

// In-memory fallback if IndexedDB is not available (e.g. Node tests or restricted webview)
const memoryCache = new Map<string, CachedEmojiEntry>();

function getIndexedDB(): IDBFactory | null {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
  return null;
}

function openDB(): Promise<IDBDatabase> {
  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves a cached emoji font ArrayBuffer by preset ID.
 */
export async function getCachedEmoji(id: string): Promise<ArrayBuffer | null> {
  const idb = getIndexedDB();
  if (!idb) {
    const entry = memoryCache.get(id);
    return entry ? entry.buffer : null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const val = req.result as CachedEmojiEntry | undefined;
        resolve(val ? val.buffer : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    const fallback = memoryCache.get(id);
    return fallback ? fallback.buffer : null;
  }
}

/**
 * Persists an emoji font ArrayBuffer to local device cache.
 */
export async function saveCachedEmoji(id: string, name: string, buffer: ArrayBuffer): Promise<void> {
  const entry: CachedEmojiEntry = {
    id,
    name,
    size: buffer.byteLength,
    buffer,
    cachedAt: Date.now()
  };

  memoryCache.set(id, entry);

  const idb = getIndexedDB();
  if (!idb) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    // Memory cache remains available
  }
}

/**
 * Removes a single cached emoji font from the store.
 */
export async function removeCachedEmoji(id: string): Promise<void> {
  memoryCache.delete(id);

  const idb = getIndexedDB();
  if (!idb) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_) {}
}

/**
 * Lists all cached emoji preset IDs.
 */
export async function listCachedEmojiIds(): Promise<string[]> {
  const idb = getIndexedDB();
  if (!idb) {
    return Array.from(memoryCache.keys());
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        resolve((req.result as string[]) || []);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return Array.from(memoryCache.keys());
  }
}

/**
 * Clears all cached emoji fonts to reclaim storage space.
 */
export async function clearAllEmojiCache(): Promise<void> {
  memoryCache.clear();

  const idb = getIndexedDB();
  if (!idb) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_) {}
}

/**
 * Computes storage summary for all cached emojis.
 */
export async function getEmojiCacheSummary(): Promise<{ count: number; totalBytes: number }> {
  const idb = getIndexedDB();
  if (!idb) {
    let total = 0;
    memoryCache.forEach(entry => {
      total += entry.size;
    });
    return { count: memoryCache.size, totalBytes: total };
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const entries = (req.result as CachedEmojiEntry[]) || [];
        let total = 0;
        entries.forEach(e => {
          total += e.size;
        });
        resolve({ count: entries.length, totalBytes: total });
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    let total = 0;
    memoryCache.forEach(entry => {
      total += entry.size;
    });
    return { count: memoryCache.size, totalBytes: total };
  }
}
