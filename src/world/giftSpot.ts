/**
 * The hub's gift spot (item 138): what she stands at to take the gift word,
 * fitted to the helper's story scene (`spot` in content/house/scenes.ts).
 *
 * A spell keeps the rune circle (`prop_magic_circle`). Anything else is a
 * pickup, drawn in code: a floor piece that belongs to the story (a plate on a
 * picnic cloth, a builder's tool table, a charging pad, a training spot, a
 * blanket, a straw nest, a heap of gold) with the scene's own prop bobbing on
 * it like a power-up, under a glow in the spot's colour. The colours carry
 * into the burst as the word flies into her.
 *
 * Everything is drawn round (0, 0), where she stands: the floor piece's middle
 * about 25 px above it, the magic circle's footprint (200 x 90).
 */

import Phaser from 'phaser';

import type { GiftSpot } from '../../content/house/scenes';
import { bob } from '../fx/juice';
import { TEX } from '../fx/textures';

export interface GiftSpotLook {
  /** The container's children, back to front. */
  children: Phaser.GameObjects.GameObject[];
  /** The pickup bobbing on it (null for the magic circle), to fly into her with the word. */
  pickup: Phaser.GameObjects.GameObject | null;
  /** Its glow, shockwave and flash colour. */
  color: number;
  /** Its bursts' colours. */
  colors: number[];
  /** How far its steady top stands over where she stands (the pickup's halo; the steam and the bob left out), for the green dot. Null: the circle's own bounds. */
  dotAbove: number | null;
}

/** Each spot's colours: the glow first. The magic circle's are the violet it always had. */
const COLORS: Record<GiftSpot, number[]> = {
  magic: [0x9a7aff, 0xffd23f, 0xffffff, 0xff9ad5],
  plate: [0xffa040, 0xffe08a, 0xffffff, 0xff6a6a],
  tools: [0x4fb4ff, 0xffd23f, 0xffffff, 0xff8a3a],
  charger: [0x3ae8ff, 0x9affff, 0xffffff, 0x4f7aff],
  training: [0xffd23f, 0xff5a5a, 0xffffff, 0x4f8aff],
  blanket: [0xff9ad5, 0xb48aff, 0xffffff, 0xffd23f],
  nest: [0xffd27a, 0xff9ad5, 0xffffff, 0xc8963c],
  treasure: [0xffd23f, 0xfff2a0, 0xffffff, 0x7adfff],
};

/** The floor piece's middle, above where she stands. */
const MID = -25;

/**
 * The spot's look. `circleArt` draws the magic circle's art (the scene's
 * `art`); `pickup` is the scene's prop as a pickup, made by the caller (an
 * emoji, or a prop's art), standing at its feet at (0, 0). `hot`: a plate's
 * dish steams (hunt 11: a cupcake, strawberries and a banana steamed too).
 */
export function giftSpotLook(
  scene: Phaser.Scene,
  kind: GiftSpot,
  circleArt: () => Phaser.GameObjects.Image,
  pickup: () => Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform,
  hot = false,
): GiftSpotLook {
  const colors = COLORS[kind];
  const color = colors[0]!;
  const glow = scene.add.image(0, -20, TEX.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 0.7).setAlpha(0.5);
  scene.tweens.add({ targets: glow, alpha: 0.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  if (kind === 'magic') return { children: [glow, circleArt()], pickup: null, color, colors, dotAbove: null };

  const g = scene.add.graphics();
  // Where the pickup stands: on the table top, or on the floor piece.
  let top = MID + 4;
  const extra: Phaser.GameObjects.GameObject[] = [];
  switch (kind) {
    case 'plate': {
      // A red-and-white picnic cloth, a plate on it.
      cloth(g, 0xffffff, 0xff6a6a, 0xd94a4a);
      g.fillStyle(0xdedede, 1).fillEllipse(0, MID + 4, 132, 44);
      g.fillStyle(0xffffff, 1).fillEllipse(0, MID, 128, 40);
      g.lineStyle(4, 0xffc070, 1).strokeEllipse(0, MID, 104, 30);
      if (hot) for (let i = 0; i < 3; i++) extra.push(steam(scene, -24 + i * 24, MID - 70, i * 500));
      break;
    }
    case 'tools': {
      // A sturdy wooden tool table, a wrench and a hammer's handle by the gadget.
      g.fillStyle(0x000000, 0.18).fillEllipse(0, 6, 200, 34);
      g.fillStyle(0x7a4a24, 1).fillRect(-84, MID - 30, 16, 52).fillRect(68, MID - 30, 16, 52);
      g.fillStyle(0xb9773d, 1).fillRoundedRect(-100, MID - 52, 200, 28, 6);
      g.fillStyle(0xd69a5c, 1).fillRoundedRect(-100, MID - 52, 200, 10, 5);
      g.lineStyle(4, 0x4a2a14, 1).strokeRoundedRect(-100, MID - 52, 200, 28, 6);
      g.fillStyle(0x9aa6b4, 1).fillCircle(-70, MID - 38, 4).fillCircle(70, MID - 38, 4);
      top = MID - 50;
      const wrench = scene.add.text(-74, top + 2, '🔧', { fontSize: '30px' }).setOrigin(0.5, 1);
      extra.push(wrench);
      break;
    }
    case 'charger': {
      // A round metal pad, its rings lit and pulsing, a bolt on the front.
      g.fillStyle(0x2a3348, 1).fillEllipse(0, MID + 6, 196, 72);
      g.fillStyle(0x3d4a66, 1).fillEllipse(0, MID, 188, 64);
      g.lineStyle(6, 0x3ae8ff, 1).strokeEllipse(0, MID, 150, 48);
      g.lineStyle(3, 0x9affff, 1).strokeEllipse(0, MID, 96, 30);
      g.fillStyle(0xffd23f, 1).fillPoints([p(-6, MID + 18), p(6, MID + 18), p(0, MID + 26), p(10, MID + 26), p(-8, MID + 40), p(-2, MID + 30), p(-12, MID + 30)], true);
      const ring = scene.add.image(0, MID, TEX.ring).setTint(0x3ae8ff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6, 0.2).setAlpha(0.9);
      scene.tweens.add({ targets: ring, scaleX: 1.6, scaleY: 0.55, alpha: 0, duration: 1100, repeat: -1, ease: 'Sine.easeOut' });
      extra.push(ring);
      break;
    }
    case 'training': {
      // A padded blue training square with a gold star on it.
      g.fillStyle(0x23468c, 1).fillRoundedRect(-100, MID - 28, 200, 64, 16);
      g.fillStyle(0x3d7ae0, 1).fillRoundedRect(-96, MID - 30, 192, 56, 14);
      g.lineStyle(4, 0xffffff, 0.9).strokeRoundedRect(-84, MID - 22, 168, 40, 10);
      // The star at the front, the pickup standing behind it.
      g.fillStyle(0xffd23f, 1).fillPoints(star(0, MID + 8, 34, 15, 0.42), true);
      top = MID - 12;
      break;
    }
    case 'blanket': {
      // A soft lilac blanket with pink spots.
      g.fillStyle(0x8a62c8, 1).fillRoundedRect(-102, MID - 28, 204, 64, 22);
      g.fillStyle(0xc4a6ff, 1).fillRoundedRect(-98, MID - 30, 196, 58, 20);
      g.fillStyle(0xff9ad5, 1);
      for (const [x, y] of [[-70, -14], [-30, 10], [10, -16], [50, 8], [78, -12], [-62, 14], [30, -4]] as const) g.fillEllipse(x, MID + y, 14, 7);
      break;
    }
    case 'nest': {
      // A ring of golden straw, soft hay in the middle.
      g.fillStyle(0x8a5a24, 1).fillEllipse(0, MID + 6, 190, 70);
      g.fillStyle(0xe8c070, 1).fillEllipse(0, MID, 176, 58);
      g.fillStyle(0xf8e0a0, 1).fillEllipse(0, MID - 2, 112, 32);
      g.lineStyle(3, 0xa8742c, 1);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const x = Math.cos(a) * 80;
        const y = MID + Math.sin(a) * 24;
        g.lineBetween(x - 10 * Math.sin(a + 1), y - 4, x + 10 * Math.sin(a + 1), y + 4);
      }
      break;
    }
    case 'treasure': {
      // A heap of gold coins, a gem or two catching the light.
      g.fillStyle(0xb8860b, 1).fillEllipse(0, MID + 8, 196, 60);
      g.fillStyle(0xffc21f, 1).fillEllipse(0, MID, 176, 48);
      g.fillStyle(0xffe066, 1).fillEllipse(0, MID - 10, 110, 32);
      // Coins lying every which way, each with its edge showing and a glint.
      g.lineStyle(2, 0x9a6a08, 1);
      for (const [x, y] of [[-52, -8], [44, -8], [0, -18], [-70, 4], [-40, 12], [-10, 16], [26, 12], [60, 6]] as const) {
        g.fillStyle(0xc8901a, 1).fillEllipse(x, MID + y + 3, 28, 12);
        g.fillStyle(0xffe680, 1).fillEllipse(x, MID + y, 28, 12);
        g.strokeEllipse(x, MID + y, 28, 12);
        g.fillStyle(0xffffff, 0.9).fillEllipse(x - 6, MID + y - 2, 7, 3);
      }
      g.fillStyle(0xff5aa0, 1).fillCircle(-80, MID + 2, 6);
      g.fillStyle(0x5ad8ff, 1).fillCircle(82, MID - 2, 6);
      for (const [x, y] of [[-30, -30], [50, -24], [-64, -16]] as const) extra.push(twinkle(scene, x, MID + y));
      break;
    }
  }

  // The scene's prop on it, bobbing like a power-up, a little light of its own behind it.
  const thing = pickup();
  thing.setPosition(0, top);
  const halo = scene.add.image(0, top - 36, TEX.glow).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0.7);
  bob(scene, thing, 7, 800);
  // The halo's top (the glow texture is 128 px, at 0.9).
  const dotAbove = -(top - 36) + (128 * 0.9) / 2;
  return { children: [glow, g, ...extra, halo, thing], pickup: thing, color, colors, dotAbove };
}

/** A picnic cloth of checks, seen flat on the floor. */
function cloth(g: Phaser.GameObjects.Graphics, a: number, b: number, edge: number): void {
  const w = 208;
  const h = 64;
  const x0 = -w / 2;
  const y0 = MID - h / 2 + 6;
  g.fillStyle(edge, 1).fillRoundedRect(x0 - 3, y0 - 3, w + 6, h + 6, 10);
  const n = 8;
  const m = 3;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) g.fillStyle((i + j) % 2 ? a : b, 1).fillRect(x0 + (i * w) / n, y0 + (j * h) / m, w / n, h / m);
}

/** A puff of steam rising off a dish, over and over. */
function steam(scene: Phaser.Scene, x: number, y: number, delay: number): Phaser.GameObjects.Image {
  const puff = scene.add.image(x, y, TEX.smoke).setAlpha(0).setScale(0.5);
  scene.tweens.add({ targets: puff, y: y - 40, alpha: { from: 0.7, to: 0 }, scale: { from: 0.4, to: 0.9 }, duration: 1500, delay, repeat: -1 });
  return puff;
}

/** A sparkle on the gold, winking. */
function twinkle(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Image {
  const s = scene.add.image(x, y, TEX.star).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setScale(0.2);
  scene.tweens.add({ targets: s, scale: 0.8, duration: 500, yoyo: true, repeat: -1, repeatDelay: 600 + Math.abs(x) * 8, ease: 'Sine.easeInOut' });
  return s;
}

function p(x: number, y: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x, y);
}

/** A five-pointed star, squashed flat (`flat`) as if lying on the floor. */
function star(cx: number, cy: number, outer: number, inner: number, flat: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    pts.push(p(cx + Math.cos(a) * r, cy + Math.sin(a) * r * flat));
  }
  return pts;
}
