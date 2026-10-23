/**
 * The hanging banner words are printed on (item 128): the sentence game's and
 * the parked Word → Picture's.
 *
 * The art (`prop_banner`, 672×300) is a pole, a red and gold trim and tassels
 * around a cream panel that is only a band across its middle: stretched whole
 * to a banner's size, the words ran over the trim (Matt: the attic's key word,
 * lit red, over the red edge). So it is drawn in three strips: the pole and
 * top trim, and the bottom trim and tassels, each at a fixed height, and the
 * cream band between them stretched to whatever the words need. `panel` is
 * where words may sit; the bug-hunt checker's probe reads it (`qaPanel`).
 *
 * The strips are cut where `prop_banner` measured (scripted, from its pixels):
 * the cream runs x 0.09-0.91 the whole way down the band, and from row 124 (its
 * top, sagging lowest in the middle) to row 190 (its bottom, highest at the
 * ends). A new pick of the art (`art:pick prop_banner`) means measuring again.
 */

import Phaser from 'phaser';

const ART = { w: 672, h: 300, top: 128, bottom: 188, inset: 0.09 };
/** How tall the pole and top trim, and the bottom trim and tassels, are drawn: a share of the art's own height. */
const TRIM_SCALE = 0.45;

export type Rect = [number, number, number, number];

export interface BannerArt {
  /** The strips, top to bottom, centred on the banner's middle: put them in its container. */
  parts: Phaser.GameObjects.Image[];
  /** The whole banner's height. */
  height: number;
  /** Where words may sit, around the banner's middle: left, top, right, bottom. */
  panel: Rect;
}

/** How wide the cream band is on a banner `width` wide. */
export function bannerPanelWidth(width: number): number {
  return width * (1 - 2 * ART.inset);
}

/** The banner art at `width`, its cream band `panelH` tall; `trim` scales the strips above and below it (a smaller banner, a slimmer trim). */
export function bannerArt(scene: Phaser.Scene, width: number, panelH: number, trim = TRIM_SCALE): BannerArt {
  const tex = scene.textures.get('prop_banner');
  const strips: [string, number, number][] = [
    ['ww_top', 0, ART.top],
    ['ww_band', ART.top, ART.bottom],
    ['ww_foot', ART.bottom, ART.h],
  ];
  // The art as loaded may be another size than measured (a placeholder): cut at the same fractions.
  const sy = tex.source[0]!.height / ART.h;
  for (const [name, y0, y1] of strips) if (!tex.has(name)) tex.add(name, 0, 0, Math.round(y0 * sy), tex.source[0]!.width, Math.round((y1 - y0) * sy));
  const topH = trim * ART.top;
  const footH = trim * (ART.h - ART.bottom);
  const height = topH + panelH + footH;
  let y = -height / 2;
  const parts = strips.map(([name], i) => {
    const h = i === 0 ? topH : i === 1 ? panelH : footH;
    const img = scene.add.image(0, y, 'prop_banner', name).setOrigin(0.5, 0).setDisplaySize(width, h);
    y += h;
    return img;
  });
  const half = bannerPanelWidth(width) / 2;
  return { parts, height, panel: [-half, -height / 2 + topH, half, -height / 2 + topH + panelH] };
}

/**
 * The bug-hunt checker's panel (`qaPanel`, src/qa/probe.ts): `panel` (around
 * the container's middle) in world coordinates, wherever the container is and
 * however it is scaled (it pops in from nothing).
 */
export function tagPanel(box: Phaser.GameObjects.Container, kind: string, panel: Rect): void {
  box.setData('qaPanel', (): [string, Rect] => {
    const m = box.getWorldTransformMatrix();
    const a = m.transformPoint(panel[0], panel[1]);
    const b = m.transformPoint(panel[2], panel[3]);
    return [kind, [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)]];
  });
}

let ctx: CanvasRenderingContext2D | null = null;

/**
 * A one-line text's ink, not its box (the box carries the font's whole line
 * height: an upper-case word fills less than three quarters of it): left,
 * top, right, bottom around the text's own position, unscaled.
 */
export function inkOf(t: Phaser.GameObjects.Text): Rect {
  ctx ??= document.createElement('canvas').getContext('2d')!;
  const s = t.style;
  ctx.font = `${s.fontStyle} ${s.fontSize} ${s.fontFamily}`.trim();
  const m = ctx.measureText(t.text);
  const left = -t.originX * t.width;
  const top = -t.originY * t.height;
  const baseline = top + (t.padding.top ?? 0) + s.strokeThickness / 2 + t.getTextMetrics().ascent;
  const x0 = left + (t.padding.left ?? 0) + s.strokeThickness / 2;
  return [x0 - m.actualBoundingBoxLeft, baseline - m.actualBoundingBoxAscent, x0 + m.actualBoundingBoxRight, baseline + m.actualBoundingBoxDescent];
}

/** `inkOf` in world coordinates (no rotation): the probe's box for a word on a panel. */
export function worldInk(t: Phaser.GameObjects.Text): Rect {
  const r = inkOf(t);
  const m = t.getWorldTransformMatrix();
  const a = m.transformPoint(r[0], r[1]);
  const b = m.transformPoint(r[2], r[3]);
  return [Math.min(a.x, b.x), Math.min(a.y, b.y), Math.max(a.x, b.x), Math.max(a.y, b.y)];
}
