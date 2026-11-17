// banner.js — the wave banner: one big centred announcement that names the
// moment — a wave arriving, a wave cleared, the Gloom Moth coming — and then
// fades. The waves director raises it, the simulation ages it, the renderer
// paints it; floating score text stays small and local by contrast.

/**
 * Raises the banner with a title and a smaller line beneath it. A new banner
 * replaces the old at once, so the latest news always wins.
 */
export function raiseBanner(state, title, subtitle = '', seconds = 2.3) {
  state.banner = { title, subtitle, timer: seconds, duration: seconds };
}

/** Ages the banner by one step; a spent banner clears itself. */
export function stepBanner(state, dt) {
  const banner = state.banner;
  if (!banner) return;
  banner.timer -= dt;
  if (banner.timer <= 0) state.banner = null;
}

/**
 * How visible the banner is right now, 0 to 1: a quick rise, a steady hold,
 * a gentle fade — the renderer multiplies its alpha by this.
 */
export function bannerStrength(banner) {
  if (!banner) return 0;
  const elapsed = banner.duration - banner.timer;
  const rise = Math.min(1, elapsed / 0.25);
  const fade = Math.min(1, banner.timer / 0.6);
  return Math.min(rise, fade);
}
