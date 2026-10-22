/**
 * The idle stick hint: a pulsing stick beside her character that shows she
 * may walk. The rooms show it when she has not moved yet; the battle's move
 * choice when she has stood still (item 043, M5). `STICK_HINT_MS` in
 * src/config.ts is the wait.
 */

import Phaser from 'phaser';

import { DEPTH } from '../config';

/** Where the hint sits from her feet: up and to her right. */
const STICK_HINT_OFFSET = { x: 90, y: -70 } as const;

/** Keep the hint beside her as she is placed or moves (`x`, `y` her feet). */
export function placeStickHint(hint: Phaser.GameObjects.Container, x: number, y: number): void {
  hint.setPosition(x + STICK_HINT_OFFSET.x, y + STICK_HINT_OFFSET.y);
}

export function makeStickHint(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const ring = scene.add.circle(0, 0, 30, 0x222233, 0.85).setStrokeStyle(4, 0xffffff, 0.9);
  const nub = scene.add.circle(0, 0, 14, 0xdddddd, 1);
  const arrows = scene.add.text(0, 0, '↔', { fontSize: '44px', color: '#ffd23f', stroke: '#000000', strokeThickness: 6 }).setOrigin(0.5, 0.55);
  // The arrows over the nub: under it they were hidden and the hint read as a dark ball (item 039).
  const hint = scene.add.container(0, 0, [ring, nub, arrows]).setDepth(DEPTH.prompt);
  placeStickHint(hint, x, y);
  // The nub sways on the wall clock, 450 ms each way: in the battle's move choice the scene's
  // tweens run at the frozen fight's 0.04x, and a tween took 11 s a sway (item 092).
  const sway = () => nub.setX(-14 * Math.cos((performance.now() / 900) * Math.PI * 2));
  sway();
  scene.events.on(Phaser.Scenes.Events.UPDATE, sway);
  hint.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off(Phaser.Scenes.Events.UPDATE, sway));
  return hint;
}
