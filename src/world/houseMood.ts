/**
 * The villain's mood, laid over a house room at run time.
 *
 * No room art is villain-specific (content/house/house.ts): the bedroom after
 * the bad news, the hub and the side rooms all get the villain's
 * `CharacterSpec.house` on top instead. That is a faint full-screen tint, the
 * things it left lying about (`decal_<id>`), and one ambient effect (frost,
 * embers, a quake every few seconds...). So EvilRilla's footprints and cracked
 * windows follow her from room to room, and a new villain is data only.
 *
 * Decals are scattered deterministically from a seed, so a room looks the same
 * each time she comes back to it. They keep to the edges: the strip of wall
 * above the back-wall doors and the margins of the floor, never over a door
 * or an answer spot, and they lie flat under everything that stands.
 *
 * `reveal` is the bedroom's "bad news" moment: the tint darkens in and the
 * decals thump in one by one before the ambient effect starts.
 */

import Phaser from 'phaser';

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import type { HouseMood } from '../../content/battle/types';
import { sfxHit, sfxStomp } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { burst, fitImage, shake } from '../fx/juice';
import { TEX } from '../fx/textures';
import { scatterDecals } from '../rules/decals';
import { seededRand } from '../rules/random';

export interface HouseMoodOptions {
  /** Scatter seed: one per room, so each room has its own stable mess. */
  seed?: number;
  /** The room's walkable floor; decals keep to its margins. */
  floor: Phaser.Geom.Rectangle;
  /** Animate in (the bedroom's bad-news moment). */
  reveal?: boolean;
  /**
   * A room where she is reading (a side room's game): the effect must not
   * shake the banner or thump over the voice. 'quake' keeps only small dust
   * puffs at the floor edges.
   */
  calm?: boolean;
  /**
   * Where no decal may land (item 030): the spell scroll on the wall, the
   * spots the grown-ups stand on. A decal keeps its whole size clear of them.
   */
  avoid?: Phaser.Geom.Rectangle[];
  /** An outdoor place (item 030): no wall to hang things on, so every decal lies on the floor. */
  floorOnly?: boolean;
}

export interface HouseMoodHandle {
  /** Resolves when everything is in (at once without `reveal`). */
  readonly revealed: Promise<void>;
}

const TINT_ALPHA = 0.16;

/**
 * A side room's scatter seed (FNV-1a of its id), so each room has its own
 * stable mess whatever game it plays (item 090: the word machine, Charge and
 * the bridge had one fixed seed each, the same decals in every room).
 */
export function roomSeed(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/** Everything it adds lasts until the scene ends: nothing takes it off sooner. */
export function applyHouseMood(scene: Phaser.Scene, villainId: string, opts: HouseMoodOptions): HouseMoodHandle {
  const mood: HouseMood | undefined = CHARACTER_BY_ID[villainId]?.house;
  if (!mood) return { revealed: Promise.resolve() };

  // Seeded (mulberry32), so a room's scatter is stable.
  const rand = seededRand(opts.seed ?? 1);
  const floor = opts.floor;

  // The tint sits just above the background, under everything that stands.
  const alpha = mood.tintAlpha ?? TINT_ALPHA;
  const tint = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, mood.tint, opts.reveal ? 0 : alpha)
    .setDepth(DEPTH.ground + 1);
  // Reveal: darken past the resting tint, hold, then settle back to it (never
  // through clear, which a yoyo back to the start would do).
  if (opts.reveal) {
    scene.tweens.chain({
      targets: tint,
      tweens: [
        { fillAlpha: Math.min(0.6, alpha * 1.6), duration: 500, hold: 300 },
        { fillAlpha: alpha, duration: 500 },
      ],
    });
  }

  // Where each decal goes: the wall strip, or a floor margin, clear of `avoid`;
  // one with no clear spot is not drawn (M58, src/rules/decals.ts).
  const placed = scatterDecals(mood.decals, { floor, ...(opts.avoid ? { avoid: opts.avoid } : {}), ...(opts.floorOnly ? { floorOnly: true } : {}), rand });
  // Footprints walk in from one side: lay floor decals left to right.
  const order = [...placed].sort((p, q) => p.x - q.x);

  const showDecal = (p: (typeof placed)[number], animate: boolean) => {
    if (!scene.textures.exists(p.key)) return;
    const img = fitImage(scene.add.image(p.x, p.y, p.key).setOrigin(0.5, p.onFloor ? 0.7 : 0.5), p.size, p.size);
    img.setDepth(p.onFloor ? DEPTH.floor + 1 : DEPTH.ground + 2).setAlpha(p.onFloor ? 0.85 : 0.95);
    if (!animate) return;
    const s = img.scale;
    img.setScale(s * 1.8).setAlpha(0);
    scene.tweens.add({ targets: img, scale: s, alpha: p.onFloor ? 0.85 : 0.95, duration: 160, ease: 'Quad.easeIn' });
    scene.time.delayedCall(150, () => {
      if (p.onFloor) {
        sfxStomp();
        shake(scene, 2, 120);
        burst(scene, p.x, p.y, { count: 10, colors: [0xb8a890, 0x8a7a66], texture: TEX.smoke, scale: 0.35, speed: 120, gravity: -40, life: 500, blend: false, depth: DEPTH.floor + 2 });
      } else {
        sfxHit(1);
        burst(scene, p.x, p.y, { count: 8, colors: [0xffffff, 0xcfd8e8], speed: 160, scale: 0.6, life: 400 });
      }
    });
  };

  let revealed: Promise<void>;
  if (opts.reveal) {
    const gap = 260;
    revealed = new Promise((resolve) => {
      order.forEach((p, i) => scene.time.delayedCall(450 + i * gap, () => showDecal(p, true)));
      scene.time.delayedCall(450 + order.length * gap + 200, () => {
        startFx(scene, mood.fx, floor, !!opts.calm, rand);
        resolve();
      });
    });
  } else {
    for (const p of order) showDecal(p, false);
    startFx(scene, mood.fx, floor, !!opts.calm, rand);
    revealed = Promise.resolve();
  }
  return { revealed };
}

/** The ambient effect, running until the scene ends. */
function startFx(scene: Phaser.Scene, fx: HouseMood['fx'], floor: Phaser.Geom.Rectangle, calm: boolean, rand: () => number): void {
  const depth = DEPTH.fx - 10;
  const zone = (r: Phaser.Geom.Rectangle) => ({ type: 'random', source: r }) as never;
  if (fx === 'frost' || fx === 'freeze') {
    const thick = fx === 'freeze';
    scene.add
      .particles(0, 0, TEX.spark, {
        emitZone: zone(new Phaser.Geom.Rectangle(0, -10, GAME_WIDTH, 10)),
        speedY: { min: 40, max: 90 },
        speedX: { min: -25, max: 25 },
        scale: thick ? { min: 0.5, max: 1.4 } : { min: 0.4, max: 1.1 },
        alpha: { start: 0.9, end: 0.2 },
        lifespan: 9000,
        // Calm (she is reading): half as many flakes over the pictures and stones.
        frequency: (thick ? 70 : 120) * (calm ? 2 : 1),
        tint: [0xffffff, 0xdff4ff],
      })
      .setDepth(depth);
    if (thick) frostEdges(scene, depth, rand);
  } else if (fx === 'embers') {
    scene.add
      .particles(0, 0, TEX.spark, {
        emitZone: zone(new Phaser.Geom.Rectangle(0, GAME_HEIGHT - 20, GAME_WIDTH, 20)),
        speedY: { min: -110, max: -50 },
        speedX: { min: -20, max: 20 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: 4500,
        frequency: 140,
        tint: [0xff7b00, 0xffd23f, 0xff3d00],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(depth);
  } else if (fx === 'sparkle') {
    scene.add
      .particles(0, 0, TEX.star, {
        emitZone: zone(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT)),
        scale: { start: 0, end: 0.6, ease: 'Sine.easeOut' },
        alpha: { start: 1, end: 0 },
        lifespan: 900,
        frequency: 220,
        tint: [0xffffff, 0xff9ad5, 0xffd23f],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(depth);
  } else if (fx === 'smoke') {
    scene.add
      .particles(0, 0, TEX.smoke, {
        emitZone: zone(new Phaser.Geom.Rectangle(0, floor.bottom - 40, GAME_WIDTH, 60)),
        speedX: { min: 10, max: 35 },
        speedY: { min: -12, max: -4 },
        scale: { start: 1.5, end: 3 },
        alpha: { start: 0.18, end: 0 },
        lifespan: 7000,
        frequency: 350,
        tint: [0x666677, 0x887788],
      })
      .setDepth(depth);
  } else if (fx === 'quake') {
    // Something big walking about the house: a thump, a shake, dust from the
    // floor and bits from the ceiling, every few seconds.
    // Calm (she is reading): no thump, no shake, just a little dust at the
    // floor's edges, clear of the banner and the answer spots.
    const thump = () => {
      if (calm) {
        const x = Math.random() < 0.5 ? floor.left + Math.random() * 100 : floor.right - Math.random() * 100;
        burst(scene, x, floor.bottom - Math.random() * 30, { count: 6, colors: [0xb8a890, 0x8a7a66], texture: TEX.smoke, scale: 0.35, speed: 70, gravity: -30, life: 600, blend: false, depth });
        scene.time.delayedCall(4000 + Math.random() * 2500, thump);
        return;
      }
      sfxStomp();
      shake(scene, 4, 380);
      for (let i = 0; i < 3; i++) {
        const x = floor.left + Math.random() * floor.width;
        burst(scene, x, floor.bottom - Math.random() * 30, { count: 10, colors: [0xb8a890, 0x8a7a66], texture: TEX.smoke, scale: 0.5, speed: 140, gravity: -30, life: 700, blend: false, depth });
      }
      burst(scene, 200 + Math.random() * (GAME_WIDTH - 400), 10, { count: 8, colors: [0xcbbfa8, 0x9a8a76], texture: TEX.square, scale: 0.6, speed: 60, gravity: 700, life: 900, blend: false, depth });
      scene.time.delayedCall(4000 + Math.random() * 2500, thump);
    };
    scene.time.delayedCall(2500, thump);
  }
  // 'none': nothing ambient.
}

/**
 * Frost creeping in from every edge of the screen, like a frozen window
 * (`freeze`, item 115: Evil Elsa freezes the house white). Bands of white
 * fading inwards, and frost crystals scattered along them; still, so it never
 * moves under a reading game.
 */
function frostEdges(scene: Phaser.Scene, depth: number, rand: () => number): void {
  const g = scene.add.graphics().setDepth(depth);
  const BANDS = 11;
  const BAND = 7;
  for (let k = 0; k < BANDS; k++) {
    const a = 0.5 * (1 - k / BANDS);
    const o = k * BAND;
    g.fillStyle(0xffffff, a);
    g.fillRect(o, o, GAME_WIDTH - 2 * o, BAND);
    g.fillRect(o, GAME_HEIGHT - o - BAND, GAME_WIDTH - 2 * o, BAND);
    g.fillRect(o, o + BAND, BAND, GAME_HEIGHT - 2 * o - 2 * BAND);
    g.fillRect(GAME_WIDTH - o - BAND, o + BAND, BAND, GAME_HEIGHT - 2 * o - 2 * BAND);
  }
  // Frost crystals along the edges, thickest in the corners.
  for (let i = 0; i < 36; i++) {
    const side = i % 4;
    const along = rand();
    const into = rand() * rand() * 55;
    const corner = Math.min(along, 1 - along) < 0.15 ? 1.4 : 1;
    const x = side === 0 ? along * GAME_WIDTH : side === 1 ? along * GAME_WIDTH : side === 2 ? into : GAME_WIDTH - into;
    const y = side === 0 ? into : side === 1 ? GAME_HEIGHT - into : along * GAME_HEIGHT;
    scene.add
      .image(x, y, TEX.star)
      .setTint(0xffffff)
      .setAlpha(0.45 + rand() * 0.35)
      .setScale((0.35 + rand() * 0.5) * corner)
      .setAngle(rand() * 90)
      .setDepth(depth);
  }
}
