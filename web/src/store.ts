// Everything local lives in IndexedDB on this device (REBUILD_SPEC §1.2): the About me profile (with photos as small
// data URLs) and the settings (support level, cloud help consent, first run). No backend of our own, nothing synced.
// If IndexedDB is unavailable (private mode, blocked storage), an in-memory map stands in for the session.

const DB = 'talk-partner';
const STORE = 'kv';
const mem = new Map<string, unknown>();
let dbp: Promise<IDBDatabase | null> | null = null;

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
