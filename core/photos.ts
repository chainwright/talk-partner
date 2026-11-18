// Personal photos: the family's own photo of a person, a food or drink, or a place, shown on a card instead of the
// generic drawing wherever the word under it is one of the choices. Why: adults with aphasia match words to their
// own, familiar photos more accurately than to generic pictures (McKelvey et al. 2010; design/IMAGES_RESEARCH_2026-11-17.md).
//
// Rules only. The carer takes or chooses a photo in About them, frames it by hand (a square crop: move and zoom), and
// labels it with one word or a short name. A card uses it when a choice's label IS that word (compared without
// capitals, without "the / a / your", and whatever the plural). No model looks at a photo to do this: nothing recognises,
// describes, labels or cuts it out. (The one place a model may be shown a photo is "Talk about a photo",
// core/phototalk.ts: the on-device model only, after the carer's tap, and never a cloud model.) (A cut-out by an on-device segmentation model was designed and NOT built: the
// contest's rule is that all of the app's AI inference goes through Firebase AI Logic, and a segmentation model called
// directly would be inference outside it. README, "Personal photos".)
//
// Privacy: the photos are kept in IndexedDB on this device (web/src/store.ts, key 'photos') and nowhere else. This
// file is pure (no DOM, no storage, no network) and imports nothing; no file that builds a prompt or a request imports
// it (tests/unit/photos.test.ts), so a photo cannot be in a request to a model.

export interface Photo {
  id: string;
  /** The word the carer gave it: what a choice's label must be for the card to use it. */
  word: string;
  /** The framed picture, a small JPEG as a data URL (320 px square). On this device only. */
  data: string;
  /** When it was added (ms since the epoch, this device's clock). */
  at: number;
}

/** A family keeps a few dozen photos at most; each is about 20 to 40 kB. */
export const PHOTO_CAP = 60;
export const WORD_MAX = 24;

/** The carer's label, tidied: no line breaks, no double spaces, no end punctuation, three words and 24 letters at most. */
export function cleanWord(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/g, '').trim().split(' ').slice(0, 3).join(' ').slice(0, WORD_MAX).trim();
}

/** How a label and a photo's word are compared: lower case, no article or "your", no punctuation, singular. */
export function photoKey(s: string): string {
  const k = s.toLowerCase().replace(/[^\p{L}\p{N}' -]+/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:the|a|an|my|your|our|his|her|their|some)\s+/, '');
  return k.length > 3 && k.endsWith('s') && !k.endsWith('ss') ? k.slice(0, -1) : k;
}

/** The family's photo for this choice label, or null: the newest photo whose word is the label. Never a near match. */
export function photoFor(label: string, photos: Photo[]): Photo | null {
  const k = photoKey(label);
  if (!k) return null;
  let hit: Photo | null = null;
  for (const p of photos) if (photoKey(p.word) === k && (!hit || p.at >= hit.at)) hit = p;
  return hit;
}

/** A new list with the photo added (the newest last); null when the word is empty or the list is full. */
export function addPhoto(photos: Photo[], p: Photo, cap = PHOTO_CAP): Photo[] | null {
  const word = cleanWord(p.word);
  if (!word || !p.data.startsWith('data:image/') || photos.length >= cap) return null;
  return [...photos, { ...p, word }];
}

export function removePhoto(photos: Photo[], id: string): Photo[] {
  return photos.filter((p) => p.id !== id);
}

// ---------------------------------------------------------------- framing by hand (the crop), as pure arithmetic
export interface Frame {
  /** Zoom: 1 shows the whole shorter side, up to ZOOM_MAX. */
  zoom: number;
  /** How far the picture is moved from the middle, as a share of the picture's own width and height (-0.5 … 0.5). */
  dx: number;
  dy: number;
}
export const ZOOM_MAX = 4;
export const START_FRAME: Frame = { zoom: 1, dx: 0, dy: 0 };

/** The frame kept inside the picture: the zoom within 1 … ZOOM_MAX, and the square never past an edge. */
export function clampFrame(f: Frame, w: number, h: number): Frame {
  const zoom = Math.min(ZOOM_MAX, Math.max(1, f.zoom));
  const side = Math.min(w, h) / zoom;
  const mx = Math.max(0, (w - side) / 2 / w);
  const my = Math.max(0, (h - side) / 2 / h);
  return { zoom, dx: Math.min(mx, Math.max(-mx, f.dx)), dy: Math.min(my, Math.max(-my, f.dy)) };
}

/** The square of the picture the frame shows, in the picture's own pixels: what is drawn onto the 320 px tile. */
export function cropRect(f: Frame, w: number, h: number): { x: number; y: number; side: number } {
  const c = clampFrame(f, w, h);
  const side = Math.min(w, h) / c.zoom;
  return { x: w / 2 + c.dx * w - side / 2, y: h / 2 + c.dy * h - side / 2, side };
}
