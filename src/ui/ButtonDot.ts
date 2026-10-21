/**
 * The only way this game asks for a button press: a glowing coloured dot,
 * never a letter label. Copied from Seraphina's ButtonDot.
 */

import Phaser from 'phaser';

import { PAD_COLOR, type PadColorName } from '../config';
import { TEX } from '../fx/textures';

function makeGlow(scene: Phaser.Scene, x: number, y: number, radius: number, color: number, alpha = 1): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, TEX.glow)
    .setScale(radius / 64)
    .setTint(color)
    .setAlpha(alpha)
    .setBlendMode(Phaser.BlendModes.ADD);
}

export function makeButtonDot(scene: Phaser.Scene, x: number, y: number, color: PadColorName = 'green', radius = 20, pulse = true): Phaser.GameObjects.Container {
  const c = PAD_COLOR[color];
  const halo = makeGlow(scene, 0, 0, radius * 3.2, c, 0.75);
  const face = scene.add.circle(0, 0, radius, c).setStrokeStyle(radius * 0.16, 0xffffff, 0.9);
  const shine = scene.add.circle(-radius * 0.3, -radius * 0.34, radius * 0.3, 0xffffff, 0.55);
  const dot = scene.add.container(x, y, [halo, face, shine]);
  if (pulse) {
    scene.tweens.add({ targets: halo, scale: { from: halo.scale * 0.85, to: halo.scale * 1.2 }, alpha: { from: 0.55, to: 1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: face, scale: { from: 1, to: 1.1 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return dot;
}
