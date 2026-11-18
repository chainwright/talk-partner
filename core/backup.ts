// A copy of About them in a file, and bringing it back: the names, the people (with their photos), the lists, the
// facts the carer kept, the family's own photos and the health notes. Why: About them lives in one browser, and a
// cleared browser or a new phone loses it (design/DISCOVERY_2026-11-17.md, 1d).
//
// The file is JSON, made on this device and saved where the carer chooses; photos are in it as data URLs. The app
// sends it nowhere. Bringing a file back shows what it holds first, and replaces only after a yes. The diary, the
// answers and what was learned are not in the file. Pure: no DOM, no storage, no network; rules only, no model.

import { cleanHealth, hasHealth, HEALTH_TOGGLES, type HealthNotes } from './insights';
import { PHOTO_CAP, cleanWord, type Photo } from './photos';
import { EMPTY_PROFILE, type Person, type Profile } from './types';

export const BACKUP_APP = 'talk-partner';
export const BACKUP_KIND = 'about-them';
export const BACKUP_VERSION = 1;
/** Sixty photos of about 40 kB and the lists: well under this. A bigger file is not one of ours. */
export const BACKUP_MAX_BYTES = 12 * 1024 * 1024;

export interface Backup {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  version: number;
  /** When the file was made (ISO, from this device's clock). */
  savedAt: string;
  profile: Profile;
  photos: Photo[];
  health: HealthNotes;
}

export function makeBackup(profile: Profile, photos: Photo[], health: HealthNotes, now: number): Backup {
  return { app: BACKUP_APP, kind: BACKUP_KIND, version: BACKUP_VERSION, savedAt: new Date(now).toISOString(), profile: cleanProfile(profile)!, photos: photos.map((p) => ({ id: p.id, word: p.word, data: p.data, at: p.at })), health: cleanHealth(health) };
}
export function backupText(b: Backup): string {
  return JSON.stringify(b, null, 1);
}

export type BackupError = 'json' | 'kind' | 'version' | 'shape' | 'big';
export interface BackupPreview { name: string; people: number; lists: number; photos: number; facts: number; health: string[]; savedAt: string }

const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.length <= max ? v : null);
const strs = (v: unknown, n = 200): string[] | null => (Array.isArray(v) && v.length <= n && v.every((x) => str(x) !== null) ? (v as string[]) : null);
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
  const people = Array.isArray(x.people ?? []) && (x.people ?? []).length <= 60 ? (x.people ?? []).map(cleanPerson) : null;
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
 * A file's text, read as a copy of About them: the checked copy and what it holds (for the preview), or why it cannot
 * be used. Nothing is taken on trust: every field is checked, a photo must be a small picture as a data URL, and
 * anything the app does not keep is dropped.
 */
export function readBackup(text: string): { ok: true; backup: Backup; preview: BackupPreview } | { ok: false; error: BackupError } {
  if (text.length > BACKUP_MAX_BYTES) return { ok: false, error: 'big' };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
  const x = raw as Partial<Backup> | null;
  if (!x || typeof x !== 'object' || x.app !== BACKUP_APP || x.kind !== BACKUP_KIND) return { ok: false, error: 'kind' };
  if (typeof x.version !== 'number' || x.version < 1) return { ok: false, error: 'shape' };
  if (x.version > BACKUP_VERSION) return { ok: false, error: 'version' };
  const profile = cleanProfile(x.profile);
  const photos = Array.isArray(x.photos) && x.photos.length <= PHOTO_CAP ? x.photos.map(cleanPhoto) : null;
  const savedAt = str(x.savedAt, 40);
  if (!profile || !photos || photos.some((p) => p === null) || savedAt === null || Number.isNaN(Date.parse(savedAt))) return { ok: false, error: 'shape' };
  const health = cleanHealth(x.health);
  const backup: Backup = { app: BACKUP_APP, kind: BACKUP_KIND, version: BACKUP_VERSION, savedAt, profile, photos: photos as Photo[], health };
  return { ok: true, backup, preview: previewOf(backup) };
}

export function previewOf(b: Backup): BackupPreview {
  const p = b.profile;
  return {
    name: p.personName.trim(), people: p.people.length, lists: p.foods.length + p.places.length + p.tv.length + p.music.length,
    photos: b.photos.length + p.people.filter((x) => x.photo).length, facts: p.other.length,
    health: hasHealth(b.health) ? [...HEALTH_TOGGLES.filter((k) => b.health[k]), ...(b.health.text.trim() ? ['text'] : [])] : [], savedAt: b.savedAt,
  };
}
