/**
 * Emoji drawn as Text keep their tops and bottoms (item 085).
 *
 * Phaser sizes a Text's canvas from its style's metrics, measured on a test
 * string (its default is `|MÃ‰qgy`, a mis-encoded `|MÉqgy`), not on the text
 * itself. A colour emoji's box is taller than those letters (in Chrome on
 * Windows 14% of the font size higher and 3% lower), so its canvas was too short
 * and the glyph was cut flat: the journey map's 🏰 lost its spire tops. Item 039
 * padded a few sites by hand; this fixes every Text at once. Whenever a Text's
 * content holds an emoji, its test string becomes the default plus those emoji,
 * so the metrics (Chrome's `actualBoundingBoxAscent` / `Descent` of that string)
 * cover them exactly. Text without emoji keeps Phaser's default, so no caption
 * or label moves.
 *
 * Installed once at boot, before any scene makes a Text (`main.ts`).
 */

import type Phaser from 'phaser';

/** One emoji: a pictograph with any variation selector, skin tone or ZWJ partners. */
const EMOJI = /\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}]|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;

/** The test string a Text with this content should be measured on: `base` plus each emoji in it, once. Exported for the unit test. */
export function testStringFor(base: string, text: string): string {
  const found = text.match(EMOJI);
  return found ? base + [...new Set(found)].join('') : base;
}

let installed = false;

/** `Text` is passed in (`Phaser.GameObjects.Text`) so this module stays Phaser-free for the unit test. */
export function installGlyphMetrics(Text: typeof Phaser.GameObjects.Text): void {
  if (installed) return;
  installed = true;
  // Per style: the test string it started with, and the last one set here.
  const seen = new WeakMap<Phaser.GameObjects.TextStyle, { base: string; set: string }>();
  const proto = Text.prototype;
  const setText = proto.setText;
  proto.setText = function (this: Phaser.GameObjects.Text, value: string | string[]) {
    const out = setText.call(this, value);
    const style = this.style;
    let mine = seen.get(style);
    if (!mine) seen.set(style, (mine = { base: style.testString, set: style.testString }));
    // A Text that chose its own test string since keeps it.
    if (style.testString !== mine.set) return out;
    const want = testStringFor(mine.base, this.text);
    if (want !== mine.set) {
      mine.set = want;
      style.setTestString(want);
    }
    return out;
  };
}
