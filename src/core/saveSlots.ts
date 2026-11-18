/**
 * BLV — Sauvegardes multiples (5 emplacements), stockées uniquement sur l'appareil du joueur.
 * Chaque emplacement est écrit à deux endroits indépendants (localStorage + IndexedDB) :
 * si l'un échoue (quota, navigation privée…), l'autre garde la partie. À la lecture, on garde le plus récent.
 * Les clés commencent par « blv_ » : la purge RGPD (storage.ts) les efface avec le reste.
 */

import { PlayerState } from '../types/game';
import { openDB, STORE_NAME, SAVE_KEY, LOCAL_FALLBACK_KEY } from './storage';

export const SLOT_COUNT = 5;
const WORLD_LIMIT = 3072;

export interface SavePosition {
  x: number;
  z: number;
  rotY: number;
}

export interface SaveSlot {
  /** Nom affiché dans l'écran « Continuer » (modifiable par le joueur). */
  name: string;
  /** Date de la dernière sauvegarde (ms depuis 1970). */
  savedAt: number;
  state: PlayerState;
  /** Dernière position connue dehors (si le joueur était dans un intérieur : devant la porte). */
  position?: SavePosition;
}

export type SlotList = (SaveSlot | null)[];

const lsKey = (slot: number) => `blv_slot_${slot}`;
const idbKey = (slot: number) => `slot_${slot}`;

function isValidSlot(v: unknown): v is SaveSlot {
  const s = v as SaveSlot | null;
  return Boolean(
    s &&
      typeof s === 'object' &&
      s.state &&
      s.state.destiny &&
      typeof s.state.destiny.id === 'string' &&
      Number.isFinite(s.savedAt)
  );
}

/** Valide une position extérieure : dans les bornes du monde et hors de la bande d'intérieurs. */
export function cleanPosition(p: unknown): SavePosition | undefined {
  const q = p as SavePosition | undefined;
  if (!q || typeof q !== 'object') return undefined;
  if (!Number.isFinite(q.x) || !Number.isFinite(q.z)) return undefined;
  if (Math.abs(q.x) > WORLD_LIMIT || Math.abs(q.z) > WORLD_LIMIT) return undefined;
  // Bande hors-carte réservée aux intérieurs (x >= 2450, z >= 2800) : jamais une position extérieure valide.
  if (q.x >= 2450 && q.z >= 2800) return undefined;
  return { x: q.x, z: q.z, rotY: Number.isFinite(q.rotY) ? q.rotY : 0 };
}

export function defaultSlotName(state: PlayerState): string {
  return (state.playerName && state.playerName.trim()) || state.destiny.name;
}

export function makeSlot(state: PlayerState, name: string, position?: SavePosition): SaveSlot {
  return { name, savedAt: Date.now(), state, position: cleanPosition(position) };
}

/** Fusionne deux copies d'un même emplacement en gardant la plus récente sans perdre une position valide. */
export function mergeSlotPair(fromDb: SaveSlot | null, fromLs: SaveSlot | null): SaveSlot | null {
  if (!fromDb && !fromLs) return null;
  if (!fromDb) return { ...fromLs!, position: cleanPosition(fromLs!.position) };
  if (!fromLs) return { ...fromDb, position: cleanPosition(fromDb.position) };
  const winner = fromDb.savedAt >= fromLs.savedAt ? fromDb : fromLs;
  const loser = winner === fromDb ? fromLs : fromDb;
  let pos = cleanPosition(winner.position);
  if (!pos && loser.state.destiny.id === winner.state.destiny.id) {
    pos = cleanPosition(loser.position);
  }
  return { ...winner, position: pos };
}

function readLocal(slot: number): SaveSlot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(lsKey(slot));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!isValidSlot(v)) return null;
    return { ...v, position: cleanPosition(v.position) };
  } catch {
    return null;
  }
}

/** Ancienne sauvegarde unique (avant les emplacements) : reprise dans l'emplacement 1 si celui-ci est vide. */
function migrateLegacyLocal(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (!raw) return;
    if (!readLocal(1)) {
      const st = JSON.parse(raw) as PlayerState;
      if (st && st.destiny) {
        localStorage.setItem(lsKey(1), JSON.stringify(makeSlot(st, defaultSlotName(st))));
      }
    }
    localStorage.removeItem(LOCAL_FALLBACK_KEY);
  } catch {
    // migration au mieux
  }
}

/** Lecture rapide (localStorage) pour l'affichage immédiat. */
export function loadSlotsSync(): SlotList {
  migrateLegacyLocal();
  return Array.from({ length: SLOT_COUNT }, (_, i) => readLocal(i + 1));
}

/** Lecture complète : fusionne localStorage et IndexedDB, garde le plus récent de chaque emplacement. */
export async function loadSlotsAsync(): Promise<SlotList> {
  const local = loadSlotsSync();
  try {
    const db = await openDB();
    let legacyPresent = false;
    let migratedSlot1 = false;
    const result = await new Promise<SlotList>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const reqs = Array.from({ length: SLOT_COUNT }, (_, i) => store.get(idbKey(i + 1)));
      const legacyReq = store.get(SAVE_KEY);
      tx.oncomplete = () => {
        const merged: SlotList = reqs.map((r, i) => {
          const fromDb = isValidSlot(r.result) ? (r.result as SaveSlot) : null;
          return mergeSlotPair(fromDb, local[i]);
        });
        const legacy = legacyReq.result as PlayerState | undefined;
        if (legacy && legacy.destiny) {
          legacyPresent = true;
          if (!merged[0]) {
            merged[0] = makeSlot(legacy, defaultSlotName(legacy));
            migratedSlot1 = true;
          }
        }
        resolve(merged);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    // Ancienne sauvegarde IndexedDB reprise : on ne réécrit le slot 1 que si la migration a eu lieu, puis on purge la clé héritée.
    if (migratedSlot1 && result[0]) {
      void writeSlot(1, result[0]).then(() => removeLegacyIdb());
    } else if (legacyPresent) {
      void removeLegacyIdb();
    }
    return result;
  } catch {
    return local;
  }
}

async function removeLegacyIdb(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SAVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // au mieux
  }
}

/** Écrit un emplacement aux deux endroits, indépendamment. Renvoie vrai si au moins un a réussi. */
export async function writeSlot(slot: number, data: SaveSlot): Promise<boolean> {
  let ok = false;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(lsKey(slot), JSON.stringify(data));
      ok = true;
    }
  } catch {
    // quota ou stockage bloqué : IndexedDB prend le relais
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, idbKey(slot));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    ok = true;
  } catch {
    // localStorage garde la partie si disponible
  }
  return ok;
}

export async function deleteSlot(slot: number): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(lsKey(slot));
  } catch {
    // au mieux
  }
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(idbKey(slot));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // au mieux
  }
}

/** Premier emplacement vide ; s'ils sont tous pleins, le moins récent (il sera remplacé). */
export function pickSlotForNewGame(slots: SlotList): { slot: number; replaces: boolean } {
  const free = slots.findIndex((s) => !s);
  if (free >= 0) return { slot: free + 1, replaces: false };
  let oldest = 0;
  slots.forEach((s, i) => {
    if (s && slots[oldest] && s.savedAt < slots[oldest]!.savedAt) oldest = i;
  });
  return { slot: oldest + 1, replaces: true };
}

/** Sauvegarde la plus récente que l'on peut reprendre (partie non terminée). */
export function mostRecentPlayable(slots: SlotList): { slot: number; data: SaveSlot } | null {
  let best: { slot: number; data: SaveSlot } | null = null;
  slots.forEach((s, i) => {
    if (s && !s.state.isGameOver && (!best || s.savedAt > best.data.savedAt)) best = { slot: i + 1, data: s };
  });
  return best;
}
