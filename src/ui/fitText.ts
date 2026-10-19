/**
 * Keep a text on screen at any length (item 020): wrap it to a width, between
 * words only, then shrink the font until it fits the box. A word wider than
 * the box on its own shrinks too; nothing is ever split inside a word or cut
 * off. Phaser's basic word wrap breaks at spaces only, which is what we want.
 */

import type Phaser from 'phaser';

export function fitText(t: Phaser.GameObjects.Text, width: number, height = Infinity, minSize = 10): Phaser.GameObjects.Text {
  t.setWordWrapWidth(width, false);
  let size = parseFloat(String(t.style.fontSize)) || 16;
  while ((t.width > width || t.height > height) && size > minSize) {
    size = Math.max(minSize, size - 2);
    t.setFontSize(size);
  }
  return t;
}

/** The font size a text ended up at, in pixels. */
export function fontPx(t: Phaser.GameObjects.Text): number {
  return parseFloat(String(t.style.fontSize)) || 16;
}
