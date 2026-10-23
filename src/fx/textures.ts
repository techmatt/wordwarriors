/**
 * Particle and glow textures, generated once at boot (BootScene).
 *
 * In Seraphina the spark texture was only made by the title scene, so a scene
 * reached without the title broke. Here every texture is made in one place
 * that every route through the game passes, including `?scene=` fast boots.
 */

import Phaser from 'phaser';

export const TEX = {
  spark: 'fx_spark',
  glow: 'fx_glow',
  ring: 'fx_ring',
  star: 'fx_star',
  square: 'fx_square',
  smoke: 'fx_smoke',
  streak: 'fx_streak',
  pixel: 'fx_pixel',
  /** A see-through soap bubble, white so a tint colours it (Ellie's bubbles; AbilitySpec.art `fx_bubble`). */
  bubble: 'fx_bubble',
  /** Free play's fun shots (item 060): white, so a tint colours them. */
  heart: 'fx_heart',
  snowball: 'fx_snowball',
  /** Arena ambience candidates (item 134, AMBIENCE_TRIALS): white, so a tint colours them. */
  block: 'fx_block',
  leaf: 'fx_leaf',
  fluff: 'fx_fluff',
  butterfly: 'fx_butterfly',
} as const;

export function makeTextures(scene: Phaser.Scene): void {
  const make = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  make(TEX.spark, 16, 16, (g) => {
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 4);
  });

  make(TEX.glow, 128, 128, (g) => {
    const steps = 32;
    for (let i = steps; i > 0; i--) {
      const t = i / steps;
      g.fillStyle(0xffffff, 0.06 * (1 - t) ** 2 + 0.004);
      g.fillCircle(64, 64, 64 * t);
    }
  });

  make(TEX.ring, 128, 128, (g) => {
    g.lineStyle(10, 0xffffff, 1);
    g.strokeCircle(64, 64, 56);
  });

  make(TEX.star, 32, 32, (g) => {
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 15 : 6;
      const t = (i / 10) * Math.PI * 2 - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(16 + Math.cos(t) * r, 16 + Math.sin(t) * r));
    }
    g.fillPoints(pts, true);
  });

  make(TEX.square, 10, 10, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 10, 10);
  });

  make(TEX.smoke, 64, 64, (g) => {
    for (let i = 16; i > 0; i--) {
      g.fillStyle(0xffffff, 0.05);
      g.fillCircle(32, 32, 2 * i);
    }
  });

  make(TEX.streak, 64, 8, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle(0xffffff, (i + 1) / 8);
      g.fillRect(i * 8, 2, 8, 4);
    }
  });

  make(TEX.pixel, 4, 4, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
  });

  make(TEX.bubble, 96, 96, (g) => {
    g.fillStyle(0xffffff, 0.16);
    g.fillCircle(48, 48, 44);
    g.lineStyle(7, 0xffffff, 0.3);
    g.strokeCircle(48, 48, 40);
    g.lineStyle(3, 0xffffff, 0.95);
    g.strokeCircle(48, 48, 45);
    // The shine: a bright crescent top left and a dot below it.
    g.fillStyle(0xffffff, 0.9);
    g.fillEllipse(32, 28, 20, 11);
    g.fillCircle(22, 42, 4);
  });

  make(TEX.heart, 32, 32, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 11, 8);
    g.fillCircle(22, 11, 8);
    g.fillTriangle(3, 14, 29, 14, 16, 29);
  });

  make(TEX.snowball, 32, 32, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0xd8ecff, 1);
    g.fillCircle(19, 19, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(11, 10, 4);
  });

  // A toy block: lit top and left, shaded bottom and right, a raised dot in the middle.
  make(TEX.block, 28, 28, (g) => {
    g.fillStyle(0xd8d8d8, 1);
    g.fillRect(0, 0, 28, 28);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 28, 5);
    g.fillRect(0, 0, 5, 28);
    g.fillStyle(0x8a8a8a, 1);
    g.fillRect(0, 23, 28, 5);
    g.fillRect(23, 0, 5, 28);
    g.fillStyle(0xf0f0f0, 1);
    g.fillCircle(14, 14, 6);
  });

  // A leaf: a pointed oval with a paler midrib.
  make(TEX.leaf, 32, 20, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(15, 10, 26, 14);
    g.fillTriangle(24, 6, 24, 14, 31, 10);
    g.lineStyle(2, 0xffffff, 0.45);
    g.lineBetween(1, 10, 28, 10);
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(15, 13, 20, 5);
  });

  // A dandelion seed: a tiny body under a fan of fine white hairs.
  make(TEX.fluff, 32, 32, (g) => {
    g.lineStyle(1.5, 0xffffff, 0.9);
    for (let i = 0; i < 9; i++) {
      const t = Math.PI + (i / 8) * Math.PI;
      g.lineBetween(16, 14, 16 + Math.cos(t) * 13, 14 + Math.sin(t) * 13);
    }
    g.lineStyle(1.5, 0xffffff, 1);
    g.lineBetween(16, 14, 16, 27);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(16, 28, 4, 6);
  });

  // A butterfly from the front: two wings a side round a dark body.
  make(TEX.butterfly, 32, 28, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(9, 9, 15, 14);
    g.fillEllipse(23, 9, 15, 14);
    g.fillEllipse(10, 20, 11, 10);
    g.fillEllipse(22, 20, 11, 10);
    g.fillStyle(0x3a2a4a, 1);
    g.fillEllipse(16, 14, 4, 20);
  });
}
