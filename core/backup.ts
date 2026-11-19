// A copy of About them in a file, and loading it back: the names, the people (with their photos), the lists, the
// facts the carer kept, the family's own photos, the emergency number, and the health notes only when the carer ticks
// "Include health notes". Why: About them lives in one browser, and a cleared browser or a new phone loses it
// (design/DISCOVERY_2026-11-17.md, 1d); a second carer's phone needs the same names and photos.
//
// The file is versioned JSON (`format: "talk-partner-about"`, `version: 1`), made on this device and saved where the
// carer chooses; photos are in it as data URLs. The app sends it nowhere. Loading a file checks every field, drops
// what the app does not keep, treats every word as text, and shows what the file has before anything changes: then
// "Replace what is here", "Add to what is here" or "Cancel". The diary, the answers and what was learned are never in
// the file. Pure: no DOM, no storage, no network; rules only, no model.
//
// Phase 10 (19 Nov 2026): the format name, health notes off by default, a smaller size limit, "Add to what is here".
// A file of phase 3 to 9 (`app: "talk-partner"`, `kind: "about-them"`, health notes always in it) still loads.

import { cleanHealth, hasHealth, HEALTH_TOGGLES, type HealthNotes } from './insights';
import { PHOTO_CAP, cleanWord, type Photo } from './photos';
import { EMPTY_PROFILE, type Person, type Profile } from './types';

export const BACKUP_FORMAT = 'talk-partner-about';
/** The older way a file named itself (phase 3 to 9): still read, and still written, so an older copy of the app reads a new file. */
export const BACKUP_APP = 'talk-partner';
export const BACKUP_KIND = 'about-them';
export const BACKUP_VERSION = 1;
/**
 * A file bigger than this is refused before it is read. The biggest About them the app keeps is 60 family photos and
 * 60 people with a photo each, every photo a 320 px JPEG (about 30 to 45 kB as a data URL): about 5.5 MB. 8 MB leaves
 * room for a full family and refuses anything much bigger.
 */
export const BACKUP_MAX_BYTES = 8 * 1024 * 1024;
/** How many people and how many words in each list a file may hold: the most About them keeps. */
export const PEOPLE_CAP = 60;
export const LIST_CAP = 200;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  version: number;
  /** When the file was made (ISO, from this device's clock). */
  savedAt: string;
  profile: Profile;
  photos: Photo[];
  /** The number the call buttons use ('' = the default). Always in the file: a second carer needs it most. */
  emergency: string;
  /** The health notes, only when the carer ticked "Include health notes"; null when they are not in the file. */
  health: HealthNotes | null;
}

/** The file for this About them. Health notes go in only with `withHealth` (the box on the screen, off every time). */
export function makeBackup(profile: Profile, photos: Photo[], health: HealthNotes, now: number, withHealth = false): Backup {
  const h = cleanHealth(health);
  return {
    format: BACKUP_FORMAT, app: BACKUP_APP, kind: BACKUP_KIND, version: BACKUP_VERSION, savedAt: new Date(now).toISOString(),
    profile: cleanProfile(profile)!, photos: photos.map((p) => ({ id: p.id, word: p.word, data: p.data, at: p.at })), emergency: h.emergency,
    health: withHealth ? h : null,
  };
}
/** The file's text. A file without health notes has no `health` field at all. */
export function backupText(b: Backup): string {
  const { health, ...rest } = b;
  return JSON.stringify(health ? { ...rest, health } : rest, null, 1);
}

export type BackupError = 'json' | 'kind' | 'version' | 'shape' | 'big';
export interface BackupPreview {
  name: string; people: number; places: number; foods: number; shows: number; photos: number; facts: number;
  /** What the health notes hold ('text' for the carer's own words); null when the file has none. */
  health: string[] | null;
  savedAt: string;
}

const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const strs = (v: unknown, n = LIST_CAP): string[] | null => (Array.isArray(v) && v.length <= n && v.every((x) => str(x) !== null) ? (v as string[]) : null);
const image = (v: unknown): v is string => typeof v === 'string' && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

function cleanPerson(v: unknown): Person | null {
  const x = v as Partial<Person> | null;
  if (!x || typeof x !== 'object' || str(x.id, 60) === null || str(x.name) === null || str(x.relation) === null) return null;
  if (x.nickname !== undefined && str(x.nickname) === null) return null;
  if (x.photo !== undefined && !image(x.photo)) return null;
  return { id: x.id!, name: x.name!, relation: x.relation!, household: x.household === true, ...(x.nickname ? { nickname: x.nickname } : {}), ...(x.photo ? { photo: x.photo } : {}) };
}
/** The profile with exactly the fields the app keeps, or null when a field is not what the app would have saved. */
function cleanProfile(v: unknown): Profile | null {
  const x = v as Partial<Profile> | null;
  if (!x || typeof x !== 'object') return null;
  const personName = str(x.personName ?? '');
  const partnerName = str(x.partnerName ?? '');
  const lists = (['foods', 'places', 'tv', 'music', 'other'] as const).map((k) => strs(x[k] ?? []));
  const people = Array.isArray(x.people ?? []) && (x.people ?? []).length <= PEOPLE_CAP ? (x.people ?? []).map(cleanPerson) : null;
  if (personName === null || partnerName === null || lists.some((l) => l === null) || !people || people.some((p) => p === null)) return null;
  return { ...EMPTY_PROFILE, personName, partnerName, people: people as Person[], foods: lists[0]!, places: lists[1]!, tv: lists[2]!, music: lists[3]!, other: lists[4]! };
}
function cleanPhoto(v: unknown): Photo | null {
  const x = v as Partial<Photo> | null;
  if (!x || typeof x !== 'object' || str(x.id, 60) === null || str(x.word, 60) === null || !image(x.data) || typeof x.at !== 'number' || !Number.isFinite(x.at)) return null;
  const word = cleanWord(x.word!);
  return word ? { id: x.id!, word, data: x.data, at: x.at } : null;
}

/**
 * A file's text, read as a copy of About them: the checked copy and what it has (for the preview), or why it cannot
 * be used. Nothing is taken on trust: every field is checked, a photo must be a small picture as a data URL, and
 * anything the app does not keep is dropped. `bytes` is the file's size, when the caller knows it before reading.
 */
export function readBackup(text: string, bytes = text.length): { ok: true; backup: Backup; preview: BackupPreview } | { ok: false; error: BackupError } {
  if (bytes > BACKUP_MAX_BYTES || text.length > BACKUP_MAX_BYTES) return { ok: false, error: 'big' };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
  const x = raw as (Partial<Backup> & { health?: unknown; emergency?: unknown }) | null;
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, error: 'kind' };
  // (a file that names itself one way and another in its older fields is not ours either)
  const named = (x.format === BACKUP_FORMAT || (x.format === undefined && x.app === BACKUP_APP && x.kind === BACKUP_KIND)) && (x.app === undefined || x.app === BACKUP_APP) && (x.kind === undefined || x.kind === BACKUP_KIND);
  if (!named) return { ok: false, error: 'kind' };
  if (typeof x.version !== 'number' || !Number.isInteger(x.version) || x.version < 1) return { ok: false, error: 'shape' };
  if (x.version > BACKUP_VERSION) return { ok: false, error: 'version' };
  const profile = cleanProfile(x.profile);
  const photos = Array.isArray(x.photos) && x.photos.length <= PHOTO_CAP ? x.photos.map(cleanPhoto) : null;
  const savedAt = str(x.savedAt, 40);
  if (!profile || !photos || photos.some((p) => p === null) || savedAt === null || Number.isNaN(Date.parse(savedAt))) return { ok: false, error: 'shape' };
  if (x.health !== undefined && (x.health === null || typeof x.health !== 'object' || Array.isArray(x.health))) return { ok: false, error: 'shape' };
  const health = x.health === undefined ? null : cleanHealth(x.health);
  const emergency = cleanHealth({ emergency: typeof x.emergency === 'string' ? x.emergency : health?.emergency ?? '' }).emergency;
  const backup: Backup = { format: BACKUP_FORMAT, app: BACKUP_APP, kind: BACKUP_KIND, version: BACKUP_VERSION, savedAt, profile, photos: photos as Photo[], emergency, health };
  return { ok: true, backup, preview: previewOf(backup) };
}

export function previewOf(b: Backup): BackupPreview {
  const p = b.profile;
  return {
    name: p.personName.trim(), people: p.people.length, places: p.places.length, foods: p.foods.length, shows: p.tv.length + p.music.length,
    photos: b.photos.length + p.people.filter((x) => x.photo).length, facts: p.other.length,
    health: b.health ? (hasHealth(b.health) ? [...HEALTH_TOGGLES.filter((k) => b.health![k]), ...(b.health.text.trim() ? ['text'] : [])] : []) : null,
    savedAt: b.savedAt,
  };
}

/** What is on this device: About them, the family's photos, the health notes (with the emergency number). */
export interface AboutHere { profile: Profile; photos: Photo[]; health: HealthNotes }

/**
 * "Replace what is here": About them and the photos become the file's. The health notes become the file's only when
 * the file has them; otherwise the ones here stay. The emergency number is the file's when it has one.
 */
export function replaceWith(here: AboutHere, b: Backup): AboutHere {
  const health = b.health ?? here.health;
  return { profile: b.profile, photos: b.photos, health: cleanHealth({ ...health, emergency: b.emergency || health.emergency }) };
}

const k = (s: string) => s.trim().toLowerCase();
const union = (a: string[], b: string[], cap = LIST_CAP) => { const seen = new Set(a.map(k)); return [...a, ...b.filter((x) => x.trim() && !seen.has(k(x)) && (seen.add(k(x)), true))].slice(0, cap); };

/**
 * "Add to what is here": nothing here is removed or changed; what the file has and this device does not is added. A
 * name that is here stays; a person is new when no one here has that name; a word is new in its list; a photo is new
 * when no photo here is the same picture. Health notes: a toggle that is on in either is on (a swallowing difficulty
 * is never lost), and the file's own words are added under the words here when they differ. The caps hold: a photo
 * that does not fit is left out, and `skipped` says how many.
 */
export function addTo(here: AboutHere, b: Backup): AboutHere & { skipped: number } {
  const p = here.profile; const f = b.profile;
  const ids = new Set(p.people.map((x) => x.id));
  const names = new Set(p.people.map((x) => k(x.name)));
  const fresh = (id: string, used: Set<string>) => { let n = id; let i = 2; while (used.has(n)) n = `${id}-${i++}`; used.add(n); return n; };
  const people = [...p.people, ...f.people.filter((x) => !names.has(k(x.name)) && (names.add(k(x.name)), true)).map((x) => ({ ...x, id: fresh(x.id, ids) }))].slice(0, PEOPLE_CAP);
  const profile: Profile = {
    ...p, personName: p.personName.trim() ? p.personName : f.personName, partnerName: p.partnerName.trim() ? p.partnerName : f.partnerName, people,
    foods: union(p.foods, f.foods), places: union(p.places, f.places), tv: union(p.tv, f.tv), music: union(p.music, f.music), other: union(p.other, f.other),
  };
  const pids = new Set(here.photos.map((x) => x.id));
  const pics = new Set(here.photos.map((x) => x.data));
  const newPhotos = b.photos.filter((x) => !pics.has(x.data) && (pics.add(x.data), true)).map((x) => ({ ...x, id: fresh(x.id, pids) }));
  const room = Math.max(0, PHOTO_CAP - here.photos.length);
  const photos = [...here.photos, ...newPhotos.slice(0, room)];
  const h = here.health; const o = b.health;
  const text = !o || !o.text.trim() || h.text.includes(o.text.trim()) ? h.text : h.text.trim() ? `${h.text.trim()}\n${o.text.trim()}` : o.text;
  const health = cleanHealth(o ? { ...h, text, diabetes: h.diabetes || o.diabetes, swallowing: h.swallowing || o.swallowing, fluidLimit: h.fluidLimit || o.fluidLimit, reminders: h.reminders || o.reminders, emergency: h.emergency || b.emergency, helpline: h.helpline || o.helpline } : { ...h, emergency: h.emergency || b.emergency });
  return { profile, photos, health, skipped: newPhotos.length - Math.min(room, newPhotos.length) };
}
