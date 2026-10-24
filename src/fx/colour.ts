/** Colour helpers for 0xRRGGBB numbers. */

/** A colour as Phaser text wants it: `#rrggbb`. */
export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** A colour's red, green and blue, each 0..255. */
function rgb(c: number): [number, number, number] {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

/** A dark colour lifted towards white, so a beam on a night sky still reads. */
export function bright(c: number): number {
  const [r, g, b] = rgb(c);
  if ((0.3 * r + 0.59 * g + 0.11 * b) / 255 >= 0.35) return c;
  const up = (v: number) => Math.round(v + (255 - v) * 0.5);
  return (up(r) << 16) | (up(g) << 8) | up(b);
}

/** A colour a quarter darker (the cook-off's layer undersides). */
export function shade(c: number): number {
  const [r, g, b] = rgb(c).map((v) => Math.round(v * 0.72));
  return (r! << 16) | (g! << 8) | b!;
}

/** How far apart two colours are, roughly as the eye sees it. */
export function colourGap(a: number, b: number): number {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}
