/**
 * Green-screen keying for generated sprites. Pure and self-contained (no
 * runtime imports, no module-level references) because the generator also ships it
 * into a Playwright page as source text.
 *
 * The key colour is the median of the border pixels (the model's "#00FF00" is
 * rarely exact). Background is what a flood fill from the border reaches over
 * near-key pixels, plus any near-exact key pixel anywhere (holes between arms).
 * The dark outline stops the fill, so green inside the subject (a leaf) stays.
 * Pixels within two rings of the background get a soft alpha from their
 * distance to the key, are un-mixed from it, and lose any green spill.
 * `noGreen` (a subject with no green in it) un-mixes every green-leaning pixel.
 * `lightGreen` (a subject in dark green, item 049) un-mixes only the bright,
 * light greens of the screen showing through (between whisk wires, a lime glow),
 * by how bright they are, and leaves dark greens alone.
 *
 * Returns `fringe`: visible pixels touching transparency that are still
 * clearly green, plus visible near-key pixels. 0 is clean.
 */

import type { KeyMode } from '../../content/art/prompts.js';

export function keyGreen(px: Uint8ClampedArray, w: number, h: number, mode: KeyMode = 'keep'): { fringe: number; cleared: number } {
  const n = w * h;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const sample = (i: number) => {
    rs.push(px[i * 4]!);
    gs.push(px[i * 4 + 1]!);
    bs.push(px[i * 4 + 2]!);
  };
  for (let x = 0; x < w; x++) {
    sample(x);
    sample((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    sample(y * w);
    sample(y * w + w - 1);
  }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1]!;
  const kr = med(rs);
  const kg = med(gs);
  const kb = med(bs);
  const NEAR = 110;
  const EXACT = 40;
  const FULL = 230;
  const dist = (i: number) => Math.hypot(px[i * 4]! - kr, px[i * 4 + 1]! - kg, px[i * 4 + 2]! - kb);

  const bg = new Uint8Array(n);
  const stack: number[] = [];
  const push = (i: number) => {
    if (!bg[i] && dist(i) < NEAR) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  for (let i = 0; i < n; i++) if (!bg[i] && dist(i) < EXACT) bg[i] = 1;
  // Near-key pixels anywhere (faint back bars of a cage over enclosed green) are
  // treated as mixed edge pixels; a cartoon leaf, (60,200,60), is ~100 away.
  const MIXED = 90;

  // Two rings of edge band around the background.
  const band = new Uint8Array(n);
  let ring = bg;
  for (let r = 0; r < 2; r++) {
    const next = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      if (bg[i] || band[i]) continue;
      const x = i % w;
      if ((x > 0 && ring[i - 1]) || (x < w - 1 && ring[i + 1]) || (i >= w && ring[i - w]) || (i < n - w && ring[i + w])) next[i] = 1;
    }
    for (let i = 0; i < n; i++) if (next[i]) band[i] = 1;
    ring = next;
  }
  for (let i = 0; i < n; i++) if (!bg[i] && dist(i) < MIXED) band[i] = 1;

  let cleared = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (bg[i]) {
      px[o] = 0;
      px[o + 1] = 0;
      px[o + 2] = 0;
      px[o + 3] = 0;
      cleared++;
      continue;
    }
    if (!band[i]) continue;
    const a = Math.min(1, dist(i) / FULL);
    if (a <= 0.02) {
      px[o + 3] = 0;
      continue;
    }
    let r = (px[o]! - (1 - a) * kr) / a;
    let g = (px[o + 1]! - (1 - a) * kg) / a;
    let b = (px[o + 2]! - (1 - a) * kb) / a;
    r = Math.max(0, Math.min(255, r));
    b = Math.max(0, Math.min(255, b));
    g = Math.max(0, Math.min(255, Math.min(g, Math.max(r, b))));
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    px[o + 3] = Math.round(px[o + 3]! * a);
  }

  // A subject with no green of its own: every green lean is screen showing
  // through (a cage's faint back bars), so un-mix it by how much it leans.
  // A subject in dark green: only a light green is screen, weighted from none
  // at green LIGHT_LO to full at LIGHT_HI, so his forest green stays solid.
  if (mode !== 'keep') {
    const keyLean = kg - Math.max(kr, kb);
    // Measured on Jason's six images: his greens are under 120, screen leaks 160 up.
    const LIGHT_LO = 120;
    const LIGHT_HI = 170;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (!px[o + 3]) continue;
      const lean = px[o + 1]! - Math.max(px[o]!, px[o + 2]!);
      if (lean <= 0) continue;
      const light = mode === 'lightGreen' ? Math.max(0, Math.min(1, (px[o + 1]! - LIGHT_LO) / (LIGHT_HI - LIGHT_LO))) : 1;
      if (!light) continue;
      const f = Math.min(1, lean / keyLean) * light;
      if (f > 0.95) {
        px[o + 3] = 0;
        continue;
      }
      const r = Math.max(0, Math.min(255, (px[o]! - f * kr) / (1 - f)));
      const b = Math.max(0, Math.min(255, (px[o + 2]! - f * kb) / (1 - f)));
      const g = Math.max(0, Math.min(255, (px[o + 1]! - f * kg) / (1 - f), Math.max(r, b)));
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = Math.round(px[o + 3]! * (1 - f));
    }
  }

  let fringe = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (px[o + 3]! < 32) continue;
    if (dist(i) < NEAR) {
      fringe++;
      continue;
    }
    const x = i % w;
    const clear = (j: number) => px[j * 4 + 3]! < 32;
    const edge = (x > 0 && clear(i - 1)) || (x < w - 1 && clear(i + 1)) || (i >= w && clear(i - w)) || (i < n - w && clear(i + w));
    if (edge && px[o + 1]! - Math.max(px[o]!, px[o + 2]!) > 50) fringe++;
  }
  return { fringe, cleared };
}
