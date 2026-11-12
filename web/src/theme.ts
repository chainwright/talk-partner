// Design-direction preview (devlog/DESIGN_DIRECTIONS.md): `?theme=signal|marker|twosides` sets <html data-theme>.
// Without the parameter nothing happens: the default look. The directions' fonts are self-hosted (web/src/fonts.css,
// files in web/public/fonts/), and a font file is only requested once a rendered element uses that family, so the
// default look requests no font at all and no request ever goes to a font service (scripts/fonts-check.mjs).
const THEMES = new Set(['signal', 'marker', 'twosides']);

export function applyPreviewTheme(): void {
  const t = new URLSearchParams(location.search).get('theme');
  if (!t || !THEMES.has(t)) return;
  document.documentElement.dataset.theme = t;
}
