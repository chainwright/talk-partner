// A copy of About them in a file (core/backup.ts). Pinned here: save, clear, bring back = identical (names, people and
// their photos, lists, kept facts, the family's photos, health notes); the preview; and that a file is never taken on
// trust.
import { describe, expect, it } from 'vitest';
import { BACKUP_MAX_BYTES, BACKUP_VERSION, backupText, makeBackup, readBackup, type Backup } from '../../core/backup';
import { NO_HEALTH } from '../../core/insights';
import type { Photo } from '../../core/photos';
import { EMPTY_PROFILE, type Profile } from '../../core/types';
import { WEEK } from './week';

const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const profile: Profile = { ...WEEK.profile, people: WEEK.profile.people.map((p, i) => (i === 2 ? { ...p, photo: JPEG, nickname: 'Tommy' } : p)) };
const photos: Photo[] = [{ id: 'ph1', word: 'Bo', data: JPEG, at: 1700000000000 }, { id: 'ph2', word: 'tea', data: PNG, at: 1700000001000 }];
const NOW = new Date(2026, 10, 22, 12, 0).getTime();
const ok = (text: string) => { const r = readBackup(text); if (!r.ok) throw new Error(r.error); return r; };

describe('save, clear, bring back', () => {
  it('what comes back is identical to what was saved', () => {
    const text = backupText(makeBackup(profile, photos, WEEK.health, NOW));
    // (cleared: nothing of the state below comes from anywhere but the file's text)
    const back = ok(text).backup;
    expect(back.profile).toEqual(profile);
    expect(back.photos).toEqual(photos);
    // (phase 5: the emergency number is kept with the health notes; the week's fixture has none, which reads as '')
    expect(back.health).toEqual({ ...WEEK.health, emergency: '' });
    expect(ok(backupText(makeBackup(profile, photos, { ...WEEK.health, emergency: '999' }, NOW))).backup.health.emergency).toBe('999');
    expect(back.profile.people[2].photo).toBe(JPEG);
    expect(backupText(makeBackup(back.profile, back.photos, back.health, NOW))).toBe(text);
  });
  it('an empty About them goes and comes back too', () => {
    const back = ok(backupText(makeBackup({ ...EMPTY_PROFILE }, [], NO_HEALTH, NOW))).backup;
    expect(back.profile).toEqual(EMPTY_PROFILE);
    expect(back.photos).toEqual([]);
    expect(back.health).toEqual(NO_HEALTH);
  });
  it('the file says what it is, and photos are in it as data URLs', () => {
    const b = JSON.parse(backupText(makeBackup(profile, photos, WEEK.health, NOW))) as Backup;
    expect(b).toMatchObject({ app: 'talk-partner', kind: 'about-them', version: BACKUP_VERSION, savedAt: new Date(NOW).toISOString() });
    expect(b.photos.every((p) => p.data.startsWith('data:image/'))).toBe(true);
    expect(Object.keys(b).sort()).toEqual(['app', 'health', 'kind', 'photos', 'profile', 'savedAt', 'version']);
  });
  it('the preview says what the file holds, before anything is replaced', () => {
    expect(ok(backupText(makeBackup(profile, photos, WEEK.health, NOW))).preview).toEqual({ name: 'Frank', people: 3, lists: 5, photos: 3, facts: 1, health: ['diabetes', 'text'], savedAt: new Date(NOW).toISOString() });
    expect(ok(backupText(makeBackup({ ...EMPTY_PROFILE }, [], NO_HEALTH, NOW))).preview).toMatchObject({ name: '', people: 0, photos: 0, health: [] });
  });
});

describe('a file is never taken on trust', () => {
  const good = () => JSON.parse(backupText(makeBackup(profile, photos, WEEK.health, NOW))) as Record<string, any>;
  const err = (o: unknown) => { const r = readBackup(typeof o === 'string' ? o : JSON.stringify(o)); return r.ok ? 'ok' : r.error; };
  it('not JSON, not ours, from a newer version, too big', () => {
    expect(err('hello')).toBe('json');
    expect(err({ some: 'file' })).toBe('kind');
    expect(err([1, 2])).toBe('kind');
    expect(err({ ...good(), kind: 'diary' })).toBe('kind');
    expect(err({ ...good(), version: BACKUP_VERSION + 1 })).toBe('version');
    expect(err('x'.repeat(BACKUP_MAX_BYTES + 1))).toBe('big');
  });
  it.each([
    ['a profile that is not one', (g: Record<string, any>) => { g.profile = 'Frank'; }],
    ['a list that holds a number', (g: Record<string, any>) => { g.profile.foods = ['tea', 3]; }],
    ['a person with no name field', (g: Record<string, any>) => { delete g.profile.people[0].name; }],
    ['a photo that is a link, not a picture in the file', (g: Record<string, any>) => { g.photos[0].data = 'https://example.com/x.jpg'; }],
    ['a photo that is a script', (g: Record<string, any>) => { g.photos[0].data = 'data:text/html;base64,PHNjcmlwdD4='; }],
    ['a picture of a kind the app does not make', (g: Record<string, any>) => { g.profile.people[2].photo = 'data:image/svg+xml;base64,PHN2Zz4='; }],
    ['more photos than the app keeps', (g: Record<string, any>) => { g.photos = Array.from({ length: 61 }, (_, i) => ({ ...g.photos[0], id: `p${i}` })); }],
    ['a photo with no word', (g: Record<string, any>) => { g.photos[0].word = '  '; }],
    ['no date', (g: Record<string, any>) => { g.savedAt = 'yesterday'; }],
  ])('refused as damaged: %s', (_n, breakIt) => {
    const g = good(); breakIt(g);
    expect(err(g)).toBe('shape');
  });
  it('what the app does not keep is dropped, and markup in a name stays text', () => {
    const g = good();
    g.profile.extra = { anything: true }; g.profile.people[0].admin = true; g.health.extra = 'x'; g.junk = [1];
    g.profile.personName = '<img src=x onerror=alert(1)>';
    const back = ok(JSON.stringify(g)).backup;
    expect(Object.keys(back.profile).sort()).toEqual(Object.keys(EMPTY_PROFILE).sort());
    expect('admin' in back.profile.people[0]).toBe(false);
    expect(Object.keys(back.health).sort()).toEqual(Object.keys(NO_HEALTH).sort());
    expect(back.profile.personName).toBe('<img src=x onerror=alert(1)>');
  });
});
