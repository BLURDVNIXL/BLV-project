/**
 * BLV — IndexedDB & Local Persistence + Scoped RGPD Art. 17 Purge
 */

import { PlayerState } from '../types/game';

const DB_NAME = 'blv_babi_life_vibes_db';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'current_player_state';
const LOCAL_FALLBACK_KEY = 'blv_babi_life_vibes_save_v3';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGameStateAsync(state: PlayerState): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(state));
    }
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(state, SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback already saved synchronously if localStorage available
  }
}

export function loadGameStateSync(): PlayerState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerState;
  } catch {
    return null;
  }
}

export async function loadGameStateAsync(): Promise<PlayerState | null> {
  try {
    const db = await openDB();
    const res = await new Promise<PlayerState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SAVE_KEY);
      req.onsuccess = () => resolve((req.result as PlayerState) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (res) return res;
  } catch {
    // Fallback to sync storage
  }
  return loadGameStateSync();
}

/**
 * RGPD Article 17: Right to Erasure / Purge Intégrale Scopée
 * Deletes only BLV-scoped keys (blv_*), IndexedDB blv_babi_life_vibes_db,
 * BLV caches, and the authenticated server session.
 */
export async function purgeAllDataRGPD(playerId?: string, sessionToken?: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('blv_')) {
          localStorage.removeItem(k);
        }
      }
    }
    if (typeof sessionStorage !== 'undefined') {
      for (const k of Object.keys(sessionStorage)) {
        if (k.startsWith('blv_')) {
          sessionStorage.removeItem(k);
        }
      }
    }
    if (typeof indexedDB !== 'undefined') {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('blv') || k.includes('workbox'))
          .map((k) => caches.delete(k))
      );
    }
    if (playerId && typeof fetch !== 'undefined') {
      const headers: Record<string, string> = {};
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      await fetch(`/api/session/${encodeURIComponent(playerId)}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    }
  } catch {
    // Best-effort scoped purge
  }
}
