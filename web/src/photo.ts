// Personal photos in the browser: reading the file the carer took or chose, and drawing the square they framed.
// Everything here happens in this page: a file is read with the File API and drawn on a canvas. Nothing is uploaded,
// and no model looks at the picture (core/photos.ts). The framed square is 320 px, a JPEG on white.

import { cropRect, type Frame } from '../../core/photos';

export interface Loaded { src: string; w: number; h: number }
const MAX_SIDE = 1280;
export const TILE = 320;

const fileUrl = (file: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('could not read the file')); r.readAsDataURL(file); });
const image = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('not a picture this browser can open')); i.src = src; });

/** The chosen file as a picture this page can frame: turned the right way up by the browser, at most 1280 px on its longer side. */
export async function loadPhoto(file: Blob): Promise<Loaded> {
  const img = await image(await fileUrl(file));
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return { src: canvas.toDataURL('image/jpeg', 0.9), w, h };
}

/** The framed square as a 320 px JPEG on white. */
export async function framed(p: Loaded, f: Frame): Promise<string> {
  const img = await image(p.src);
  const r = cropRect(f, p.w, p.h);
  const canvas = document.createElement('canvas');
  canvas.width = TILE; canvas.height = TILE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, TILE, TILE);
  ctx.drawImage(img, r.x, r.y, r.side, r.side, 0, 0, TILE, TILE);
  return canvas.toDataURL('image/jpeg', 0.85);
}
