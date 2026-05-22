/**
 * CacheService.js
 * A unified caching service supporting in-memory and IndexedDB storage.
 */
import { useSettingsStore } from '../store/settingsStore';

const DB_NAME = 'navivibe-cache';
const STORE_NAME = 'cache-store';
const DB_VERSION = 1;

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.dbPromise = null;
  }

  _getDb() {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  async _enforceQuota() {
    const provider = useSettingsStore.getState().cacheProvider || 'indexeddb';
    if (provider !== 'indexeddb') return; // Memory cache clears on reload anyway

    const maxMb = useSettingsStore.getState().cacheMaxSizeMb || 500;
    const maxBytes = maxMb * 1024 * 1024;

    try {
      const usedBytes = await this.getUsedMb() * 1024 * 1024;
      if (usedBytes > maxBytes) {
        console.warn(`[CacheService] Quota exceeded (${(usedBytes/1024/1024).toFixed(1)}MB > ${maxMb}MB). Clearing old cache...`);
        // For simplicity, we just clear the whole store when over quota.
        // A more complex implementation would delete oldest LRU items.
        await this.clear();
      }
    } catch (e) {
      console.error('[CacheService] Quota enforcement failed', e);
    }
  }

  async set(key, value) {
    const provider = useSettingsStore.getState().cacheProvider || 'indexeddb';

    if (provider === 'memory') {
      this.memoryCache.set(key, value);
      return;
    }

    try {
      const db = await this._getDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('[CacheService] IDB set failed, falling back to memory', e);
      this.memoryCache.set(key, value);
    }
    
    // Check quota after write asynchronously
    this._enforceQuota();
  }

  async get(key) {
    const provider = useSettingsStore.getState().cacheProvider || 'indexeddb';

    if (provider === 'memory') {
      return this.memoryCache.get(key);
    }

    // Always check memory first even if provider is indexeddb (faster)
    if (this.memoryCache.has(key)) return this.memoryCache.get(key);

    try {
      const db = await this._getDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          if (request.result !== undefined) {
            this.memoryCache.set(key, request.result); // populate L1 cache
          }
          resolve(request.result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return this.memoryCache.get(key);
    }
  }

  async clear() {
    this.memoryCache.clear();
    try {
      const db = await this._getDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('[CacheService] Failed to clear IndexedDB', e);
    }
  }

  async getUsedMb() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage ? (estimate.usage / 1024 / 1024) : 0;
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }
}

export const cacheService = new CacheService();
