/** Colour helpers for 0xRRGGBB numbers. */

/** A colour as Phaser text wants it: `#rrggbb`. */
export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

/** A colour's red, green and blue, each 0..255. */
export function rgb(c: number): [number, number, number] {
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}
