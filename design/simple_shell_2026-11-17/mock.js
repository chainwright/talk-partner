// Mockup helper: draws the app's own pictograms (paths copied from web/src/pictos.ts), shows the screen the address
// names (a.html#3), and sets the theme from ?theme=light|dark. Nothing here is app code.
const P = {
  coffee: '<path d="M22 36h44l-5 44H27z"/><path d="M66 46h5a8 8 0 010 16h-7"/><path d="M36 26c-3-5 3-8 0-13M48 26c-3-5 3-8 0-13" stroke-width="4"/>',
  tea: '<path d="M18 40h48v16c0 14-11 24-24 24S18 70 18 56z"/><path d="M66 46h6a8 8 0 010 16h-8"/><path d="M14 86h60"/><path d="M42 40V22h10v10h-10" stroke-width="3"/>',
  else: '<rect x="14" y="22" width="68" height="52" rx="10" stroke-dasharray="8 7"/><circle cx="34" cy="48" r="4" fill="currentColor"/><circle cx="48" cy="48" r="4" fill="currentColor"/><circle cx="62" cy="48" r="4" fill="currentColor"/>',
  yes: '<path d="M20 50l18 18 38-40" stroke="var(--yes, currentColor)" stroke-width="9"/>',
  no: '<path d="M24 24l48 48M72 24L24 72" stroke-width="9"/>',
  mic: '<rect x="36" y="10" width="24" height="44" rx="12"/><path d="M22 44a26 26 0 0052 0M48 70v16M34 86h28"/>',
  toilet: '<path d="M20 12h22v36H20z"/><path d="M20 48h58c0 15-10 26-24 26H40c-11 0-20-9-20-20z"/><path d="M38 74l-3 12h30l-3-12"/>',
  drink: '<path d="M26 26h44l-6 60H32z"/><path d="M29 48h38"/><path d="M50 74l10-64h14" stroke-width="4"/>',
  pain: '<path d="M56 10L28 52h18l-6 34 28-44H52z"/>',
  // mockup-only signs (not in the app's set yet): a lock, a person, an arrow, a pencil, a grid, dots
  lock: '<rect x="20" y="42" width="56" height="42" rx="8"/><path d="M32 42V30a16 16 0 0132 0v12"/>',
  person: '<circle cx="48" cy="30" r="14"/><path d="M20 84c2-18 14-28 28-28s26 10 28 28"/>',
  back: '<path d="M56 20L28 48l28 28"/>',
  ask: '<path d="M14 18h68v46H44L26 80V64H14z"/>',
  grid: '<rect x="14" y="14" width="28" height="28" rx="6"/><rect x="54" y="14" width="28" height="28" rx="6"/><rect x="14" y="54" width="28" height="28" rx="6"/><rect x="54" y="54" width="28" height="28" rx="6"/>',
  more: '<circle cx="20" cy="48" r="5" fill="currentColor"/><circle cx="48" cy="48" r="5" fill="currentColor"/><circle cx="76" cy="48" r="5" fill="currentColor"/>',
  cloud: '<path d="M28 72a16 16 0 01-2-32 22 22 0 0142-6 18 18 0 014 38z"/>',
};
document.querySelectorAll('i[data-p]').forEach((el) => {
  el.outerHTML = `<svg class="p" viewBox="0 0 96 96" aria-hidden="true">${P[el.dataset.p] ?? P.else}</svg>`;
});
const theme = new URLSearchParams(location.search).get('theme');
if (theme) document.documentElement.dataset.theme = theme;
function show() {
  const n = location.hash.replace('#', '') || '1';
  document.querySelectorAll('section[data-s]').forEach((s) => s.classList.toggle('on', s.dataset.s === n));
  document.body.dataset.screen = n;
  scrollTo(0, 0);
}
addEventListener('hashchange', show);
show();
