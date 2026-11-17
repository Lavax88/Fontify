/**
 * Fontify - Font & Emoji Blob Cache (IndexedDB)
 * Database: FontifyCacheDB
 * Persists downloaded font and emoji binaries locally for instant offline preview and zero-latency switching.
 */

import type { BrowseItem, CachedFontEntry } from './types';

const DB_NAME = 'FontifyCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'fonts';

// In-memory fallback if IndexedDB is not available (e.g. Node tests or restricted webview)
const memoryCache = new Map<string, CachedFontEntry>();

function getIndexedDB(): IDBFactory | null {
  if (typeof indexedDB !== 'undefined') return indexedDB;
  if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB;
  return null;
}

function openDB(): Promise<IDBDatabase> {
  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB not supported in current environment'));
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
 * Retrieves a cached font or emoji entry (including buffer and item metadata) by item ID.
 */
export async function getCachedFont(id: string): Promise<CachedFontEntry | null> {
  const idb = getIndexedDB();
  if (!idb) {
    const entry = memoryCache.get(id);
    return entry || null;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const val = req.result as CachedFontEntry | undefined;
        resolve(val || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    const fallback = memoryCache.get(id);
    return fallback || null;
  }
}

/**
 * Convenience helper to retrieve just the raw ArrayBuffer from cache.
 */
export async function getCachedFontBuffer(id: string): Promise<ArrayBuffer | null> {
  const entry = await getCachedFont(id);
  return entry ? entry.buffer : null;
}

/**
 * Persists a downloaded font or emoji ArrayBuffer and its BrowseItem metadata to local cache.
 */
export async function saveCachedFont(
  id: string,
  item: BrowseItem,
  buffer: ArrayBuffer
): Promise<void> {
  const entry: CachedFontEntry = {
    id,
    item,
    buffer,
    size: buffer.byteLength,
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
 * Checks whether a given font or emoji ID exists in cache.
 */
export async function isFontCached(id: string): Promise<boolean> {
  if (memoryCache.has(id)) {
    return true;
  }

  const idb = getIndexedDB();
  if (!idb) {
    return false;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getKey(id);

      req.onsuccess = () => {
        resolve(req.result !== undefined);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return memoryCache.has(id);
  }
}

/**
 * Lists all cached font and emoji IDs.
 */
export async function getAllCachedFontIds(): Promise<string[]> {
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
        const idbKeys = (req.result as string[]) || [];
        const merged = new Set([...idbKeys, ...memoryCache.keys()]);
        resolve(Array.from(merged));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return Array.from(memoryCache.keys());
  }
}

/**
 * Removes a single cached font or emoji from the store by ID.
 */
export async function deleteCachedFont(id: string): Promise<void> {
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
 * Clears all cached fonts and emojis from storage.
 */
export async function clearAllCachedFonts(): Promise<void> {
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
 * Computes storage summary (item count and total bytes) for cached fonts.
 */
export async function getFontCacheSummary(): Promise<{ count: number; totalBytes: number }> {
  const idb = getIndexedDB();
  if (!idb) {
    let total = 0;
    memoryCache.forEach((entry) => {
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
        const entries = (req.result as CachedFontEntry[]) || [];
        let total = 0;
        entries.forEach((e) => {
          total += e.size;
        });
        resolve({ count: entries.length, totalBytes: total });
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    let total = 0;
    memoryCache.forEach((entry) => {
      total += entry.size;
    });
    return { count: memoryCache.size, totalBytes: total };
  }
}
