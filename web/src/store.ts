// Everything local lives in IndexedDB on this device (build spec §1.2): the About me profile (with photos as small
// data URLs) and the settings (support level, cloud help consent, first run). No backend of our own, nothing synced.
// If IndexedDB is unavailable (private mode, blocked storage), an in-memory map stands in for the session.

const DB = 'talk-partner';
const STORE = 'kv';
const mem = new Map<string, unknown>();
let dbp: Promise<IDBDatabase | null> | null = null;

/**
 * The sample family ("Try it with the Millers", judge mode; 23 Nov 2026). While it is open, every read and write goes
 * to a map of its own in memory: it never reads the family's own lists on this device and never writes over them, and
 * "Delete everything" there empties only that map. Leaving it drops the map. Only this browser's settings (the view,
 * the support level, the cloud help switch) and the hidden trial log are the device's own and pass through.
 */
const sampleMem = new Map<string, unknown>();
const PASS_THROUGH = new Set(['settings', 'trial']);
let sample = false;
export function setSampleScope(on: boolean): void {
  sample = on;
  sampleMem.clear();
}
export const inSampleScope = () => sample;
const sampled = (key: string) => sample && !PASS_THROUGH.has(key);

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch {
      res(null);
    }
  });
  return dbp;
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  if (sampled(key)) return structuredClone(sampleMem.get(key)) as T | undefined;
  const db = await open();
  if (!db) return mem.get(key) as T | undefined;
  return new Promise((res) => {
    try {
      const rq = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result as T | undefined);
      rq.onerror = () => res(undefined);
    } catch {
      res(undefined);
    }
  });
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  if (sampled(key)) { sampleMem.set(key, structuredClone(value)); return; }
  const db = await open();
  mem.set(key, value);
  if (!db) return;
  return new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    } catch {
      res();
    }
  });
}

/** "Delete everything on this computer": lists, photos, settings and the cloud help consent. */
export async function kvClear(): Promise<void> {
  if (sample) { sampleMem.clear(); return; }
  mem.clear();
  const db = await open();
  if (!db) return;
  return new Promise((res) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    } catch {
      res();
    }
  });
}
