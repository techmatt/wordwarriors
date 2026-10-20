/**
 * The idle stick hint: a pulsing stick beside her character that shows she
 * may walk. The rooms show it when she has not moved yet; the battle's move
 * choice when she has stood still (item 043, M5). `STICK_HINT_MS` in
 * src/config.ts is the wait.
 */

import Phaser from 'phaser';

import { DEPTH } from '../config';

/** Where the hint sits from her feet: up and to her right. */
export const STICK_HINT_OFFSET = { x: 90, y: -70 } as const;

export function makeStickHint(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const ring = scene.add.circle(0, 0, 30, 0x222233, 0.85).setStrokeStyle(4, 0xffffff, 0.9);
  const nub = scene.add.circle(0, 0, 14, 0xdddddd, 1);
  const arrows = scene.add.text(0, 0, '↔', { fontSize: '44px', color: '#ffd23f', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5, 0.55);
  // The arrows over the nub: under it they were hidden and the hint read as a dark ball (item 039).
  const hint = scene.add.container(x + STICK_HINT_OFFSET.x, y + STICK_HINT_OFFSET.y, [ring, nub, arrows]).setDepth(DEPTH.prompt);
  scene.tweens.add({ targets: nub, x: { from: -14, to: 14 }, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return hint;
}
