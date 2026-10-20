/**
 * Juice: the motion and impact vocabulary every scene shares.
 *
 * Sprites only ever bob and squash/scale (Matt, 2026-10-18: placeholder cards
 * have no animation frames, so motion is light bob and squash). Impact is
 * shake, flash, hit-stop and slow-mo, with one shared particle burst helper.
 *
 * Hit-stop and slow-mo work on a scene-level time scale that the battle
 * multiplies into its own simulation step (`timeScale(scene)`), so tweens and
 * particles slow together.
 */

import Phaser from 'phaser';

import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { fitText } from '../ui/fitText';
import { TEX } from './textures';

/**
 * Effects quality, 0.35..1. The battle lowers it when the frame rate sags
 * (a slow machine, or headless tests) and raises it back when there is room;
 * every burst scales its particle count by it. Spectacle is the reward, but a
 * stuttering battle is worse than a slightly thinner one.
 */
export const fxQuality = { level: 1 };

/** Live particle count high-water mark, for tests. */
export const fxStats = { bursts: 0, shakes: 0, hitstops: 0, slowmos: 0, flashes: 0 };

/** A gentle idle bob. Returns the tween so callers can stop it. */
export function bob(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, amount = 6, ms = 900): Phaser.Tweens.Tween {
  return scene.tweens.add({
    targets: target,
    y: `-=${amount}`,
    duration: ms,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Math.random() * ms,
  });
}

/** Squash then stretch back: a landing, a hit, a press. */
export function squash(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, baseX: number, baseY: number, amount = 0.25, ms = 120): void {
  scene.tweens.add({
    targets: target,
    scaleX: baseX * (1 + amount),
    scaleY: baseY * (1 - amount),
    duration: ms,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      target.setScale(baseX, baseY);
    },
  });
}

/** Pop in from nothing with an overshoot. */
export function popIn(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, scale = 1, delay = 0): void {
  target.setScale(0);
  scene.tweens.add({ targets: target, scale, duration: 380, delay, ease: 'Back.easeOut' });
}

/** A side-to-side wiggle: the "no, try again" motion. */
export function wiggle(scene: Phaser.Scene, target: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject): void {
  const x = target.x;
  scene.tweens.add({
    targets: target,
    x: { from: x - 10, to: x + 10 },
    duration: 60,
    yoyo: true,
    repeat: 3,
    onComplete: () => {
      target.x = x;
    },
  });
}

/** One-shot particle burst. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: { count?: number; colors?: number[]; speed?: number; scale?: number; life?: number; texture?: string; gravity?: number; depth?: number; blend?: boolean } = {},
): void {
  const { count = 24, colors = [0xffffff, 0xffd23f, 0xff5ab4, 0x7ad9ff], speed = 320, scale = 1, life = 650, texture = TEX.spark, gravity = 300, depth = DEPTH.fx, blend = true } = opts;
  fxStats.bursts++;
  const n = Math.max(3, Math.round(count * fxQuality.level));
  const emitter = scene.add.particles(x, y, texture, {
    speed: { min: speed * 0.3, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: scale, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: life * 0.5, max: life },
    gravityY: gravity,
    tint: colors,
    blendMode: blend ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
    emitting: false,
  });
  emitter.setDepth(depth);
  emitter.explode(n);
  scene.time.delayedCall(life + 100, () => emitter.destroy());
}

/** An expanding ring shockwave. */
export function shockwave(scene: Phaser.Scene, x: number, y: number, color: number, radius = 200, ms = 450): void {
  const ring = scene.add.image(x, y, TEX.ring).setTint(color).setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
  ring.setScale(0.1);
  scene.tweens.add({
    targets: ring,
    scale: radius / 60,
    alpha: { from: 1, to: 0 },
    duration: ms,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
}

/**
 * A landing's ring lying on the floor (item 034): squashed to the floor's
 * perspective, tinted, drawn just under whoever stands at `y` so the
 * fighters in front stay in front. Not a white disc.
 */
export function groundRing(scene: Phaser.Scene, x: number, y: number, color: number, radius = 200, ms = 450): void {
  const ring = scene.add.image(x, y, TEX.ring).setTint(color).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9).setScale(0.1, 0.035);
  scene.tweens.add({
    targets: ring,
    scaleX: radius / 60,
    scaleY: (radius / 60) * 0.32,
    alpha: 0,
    duration: ms,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });
}

/** A soft puff of dust thrown out sideways along the floor: a heavy landing. */
export function dustPuff(scene: Phaser.Scene, x: number, y: number, radius = 120, colors = [0xc8b89a, 0x8a7a5a], count = 14): void {
  fxStats.bursts++;
  const n = Math.max(4, Math.round(count * fxQuality.level));
  const e = scene.add.particles(x, y, TEX.smoke, {
    speedX: { min: -radius * 2, max: radius * 2 },
    speedY: { min: -radius * 0.45, max: radius * 0.05 },
    scale: { start: 0.45, end: 1.3 },
    alpha: { start: 0.6, end: 0 },
    lifespan: { min: 380, max: 680 },
    gravityY: -20,
    tint: colors,
    emitting: false,
  });
  e.setDepth(y + 1);
  e.explode(n);
  scene.time.delayedCall(800, () => e.destroy());
}

export function shake(scene: Phaser.Scene, strength: number, ms = 220): void {
  fxStats.shakes++;
  scene.cameras.main.shake(ms, Math.min(0.03, strength * 0.004));
}

/** A quick camera zoom-in and back: the "punch" on a big hit. */
export function punch(scene: Phaser.Scene, amount = 0.06, ms = 160): void {
  const cam = scene.cameras.main;
  scene.tweens.add({ targets: cam, zoom: 1 + amount, duration: ms, yoyo: true, ease: 'Quad.easeOut', onComplete: () => cam.setZoom(1) });
}

/**
 * Anime speed lines: thin streaks rushing in from the screen edge towards a
 * point, for supers and ultimates. Drawn in screen space over everything.
 */
export function speedLines(scene: Phaser.Scene, cx: number, cy: number, color = 0xffffff, ms = 450): void {
  const g = scene.add.graphics().setDepth(DEPTH.sparkles - 2).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
  const W = scene.scale.width;
  const H = scene.scale.height;
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
    const outer = Math.hypot(W, H);
    const inner = 170 + Math.random() * 160;
    const w = 2 + Math.random() * 5;
    g.lineStyle(w, i % 3 === 0 ? color : 0xffffff, 0.75);
    g.lineBetween(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
  }
  g.setAlpha(0);
  scene.tweens.add({ targets: g, alpha: 1, duration: 70, yoyo: true, hold: ms - 140, onComplete: () => g.destroy() });
}

export function flash(scene: Phaser.Scene, color = 0xffffff, ms = 140): void {
  // Never more than about two full-screen flashes a second, whatever asks
  // (item 039: a busy battle asked for twelve in one second; three is the
  // photosensitivity line, WCAG 2.3.1). The rest are simply skipped.
  const now = performance.now();
  if (now - lastFlash < FLASH_GAP_MS) return;
  lastFlash = now;
  fxStats.flashes++;
  const c = Phaser.Display.Color.IntegerToRGB(color);
  scene.cameras.main.flash(ms, c.r, c.g, c.b);
}

/** The least time between two full-screen flashes (ms). */
export const FLASH_GAP_MS = 450;
let lastFlash = -Infinity;

/** Time scale shared by a scene's simulation, tweens and particles. */
const scales = new WeakMap<Phaser.Scene, { hitstopUntil: number; slowUntil: number; slow: number }>();

function state(scene: Phaser.Scene) {
  let s = scales.get(scene);
  if (!s) {
    s = { hitstopUntil: 0, slowUntil: 0, slow: 1 };
    scales.set(scene, s);
  }
  return s;
}

/** Freeze the action for a few frames on impact. */
export function hitstop(scene: Phaser.Scene, ms = 70): void {
  fxStats.hitstops++;
  const s = state(scene);
  s.hitstopUntil = Math.max(s.hitstopUntil, performance.now() + ms);
}

/** Slow everything for a big moment. */
export function slowmo(scene: Phaser.Scene, factor = 0.3, ms = 900): void {
  fxStats.slowmos++;
  const s = state(scene);
  s.slow = factor;
  s.slowUntil = performance.now() + ms;
}

/** The current time scale (0 during hit-stop). Applies itself to tweens and the clock. */
export function timeScale(scene: Phaser.Scene): number {
  const s = state(scene);
  const now = performance.now();
  let t = 1;
  if (now < s.hitstopUntil) t = 0.02;
  else if (now < s.slowUntil) t = s.slow;
  scene.tweens.timeScale = t;
  scene.time.timeScale = t;
  return t;
}

/** Floating text that rises and fades ("POW!", "+1"). */
export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffffff', size = 40, depth: number = DEPTH.sparkles): void {
  const t = scene.add
    .text(x, y, text, { fontFamily: '"Arial Black", sans-serif', fontSize: `${size}px`, color, stroke: '#000000', strokeThickness: 8, align: 'center' })
    .setOrigin(0.5)
    .setDepth(depth);
  // Wrapped and shrunk to the screen, and kept inside it (it rises 70 px).
  fitText(t, GAME_WIDTH - 40, GAME_HEIGHT / 3);
  t.setPosition(Phaser.Math.Clamp(x, t.width / 2 + 10, GAME_WIDTH - t.width / 2 - 10), Phaser.Math.Clamp(y, t.height / 2 + 80, GAME_HEIGHT - t.height / 2 - 10));
  y = t.y;
  t.setScale(0.3);
  scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, y: y - 70, alpha: 0, delay: 450, duration: 500, onComplete: () => t.destroy() });
}

/** Fit an image into a box, keeping aspect: real art can be any pixel size. */
export function fitImage(img: Phaser.GameObjects.Image, w: number, h: number): Phaser.GameObjects.Image {
  const s = Math.min(w / img.width, h / img.height);
  img.setScale(s);
  return img;
}
