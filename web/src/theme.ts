// Design-direction preview (devlog/DESIGN_DIRECTIONS.md): `?theme=signal|marker|twosides` sets <html data-theme>.
// Without the parameter nothing happens: the default look, and no font request leaves the page.
// The webfonts load only with a preview theme; the chosen direction will ship its fonts self-hosted.
const FONTS: Record<string, string> = {
  signal: 'family=Overpass:wght@600;800&family=Atkinson+Hyperlegible+Next:wght@400;700',
  marker: 'family=Lexend:wght@400;500;700&family=Public+Sans:wght@400;600',
  twosides: 'family=Instrument+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&family=Atkinson+Hyperlegible+Next:wght@400;700',
};

export function applyPreviewTheme(): void {
  const t = new URLSearchParams(location.search).get('theme');
  if (!t || !(t in FONTS)) return;
  document.documentElement.dataset.theme = t;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${FONTS[t]}&display=swap`;
  document.head.append(link);
}
