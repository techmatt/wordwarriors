/**
 * Free play (item 060): her character's own toys, wherever she is free to
 * move and no answer is open. Green jumps (a tap hops, a hold goes higher
 * and floats down); blue, red and yellow cast (a tap is one shot, a hold
 * charges one big one):
 *
 * - **blue**: zig-zag bolts with a crackling trail;
 * - **red**: spinning sparkle stars;
 * - **yellow**: lobbed fun things, stars, hearts and snowballs (her outfit adds
 *   its own: donuts and cookies for the chef, stars for the knight).
 *
 * Each button's shots, trails and bursts are all in its own pad colour
 * (`castPalette`, item 085), so the three look clearly different; an outfit's
 * shapes keep their shapes and take the colour.
 *
 * Pure play: a shot hits nothing, a jump moves nothing; the scene only reads
 * `height` to lift her sprite. The scene decides when play is open and which
 * buttons are free (a button with a meaning there keeps it). Dad lock
 * silences it all: presses never arrive (Controls), and a charge or a held
 * float is dropped while it is on. Live shots are capped (`FREE_PLAY.maxShots`):
 * one more removes the oldest quietly. Bursts come from pooled emitters.
 */

import Phaser from 'phaser';

import { DEPTH, FREE_PLAY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { sfxBoom, sfxJump, sfxPew, sfxTwinkle, sfxZap } from '../audio/sfx';
import type { Controls } from '../input/Controls';
import { dadLock } from '../input/dadLock';
import { CAST_COLORS, castPalette, castPower, overCap, startJump, stepJump, type CastColor, type CastPalette, type Jump } from '../rules/freePlay';
import { burst, fxQuality, shockwave } from './juice';
import { TEX } from './textures';

/** For tests: what free play has done in this scene and how many shots fly now. */
export const playStats = { jumps: 0, shots: 0, big: 0, live: 0, maxLive: 0 };

/** A shot's look: its texture and its trail's; the tints are its button's (`castPalette`). */
interface Look {
  tex: string;
  trail: string;
}

/**
 * The shapes per button. Item 085 (Matt): each button's shots, trails and
 * bursts are in its own pad colour, so blue, red and yellow look clearly
 * different; a shape (the chef's donut) keeps its shape and takes the colour.
 */
const SHAPES: Record<CastColor, Look[]> = {
  blue: [{ tex: TEX.glow, trail: TEX.spark }],
  red: [
    { tex: TEX.star, trail: TEX.star },
    { tex: TEX.star, trail: TEX.spark },
  ],
  yellow: [
    { tex: TEX.star, trail: TEX.spark },
    { tex: TEX.heart, trail: TEX.heart },
    { tex: TEX.snowball, trail: TEX.spark },
  ],
};

/** Her outfit's own extra shapes (cheap: existing textures, her button's tints). */
const OUTFIT_SHAPES: Record<string, Partial<Record<CastColor, Look[]>>> = {
  chef: {
    // A donut and a cookie; sprinkles.
    yellow: [
      { tex: TEX.ring, trail: TEX.square },
      { tex: TEX.snowball, trail: TEX.square },
    ],
    red: [{ tex: TEX.square, trail: TEX.square }],
  },
  knight: {
    // A flashing sword-swipe of light and stars.
    blue: [{ tex: TEX.streak, trail: TEX.spark }],
    yellow: [{ tex: TEX.star, trail: TEX.star }],
  },
};

const PALETTE: Record<CastColor, CastPalette> = { blue: castPalette('blue'), red: castPalette('red'), yellow: castPalette('yellow') };

/** Base on-screen size of each texture at scale 1 (they differ wildly). */
const TEX_SCALE: Record<string, number> = { [TEX.glow]: 0.4, [TEX.ring]: 0.32, [TEX.streak]: 1.2 };

interface Shot {
  color: CastColor;
  obj: Phaser.GameObjects.Image;
  look: Look;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Lobbed shots fall and pop at this height. */
  floorY: number | null;
  age: number;
  life: number;
  big: boolean;
  scale: number;
  spin: number;
  seed: number;
}

interface Charge {
  heldMs: number;
  orb: Phaser.GameObjects.Image | null;
}

/** Where her character is this frame. */
export interface PlayBody {
  /** Her feet. */
  x: number;
  y: number;
  /** Her middle, above her feet, before any jump. */
  mid: number;
  /** Which way she faces when she is not moving (1 right, -1 left). */
  face: number;
}

export class FreePlay {
  private jump: Jump | null = null;
  private readonly charges = new Map<CastColor, Charge>();
  private shots: Shot[] = [];
  private readonly aim = new Phaser.Math.Vector2(1, 0);
  private readonly trails = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly puffs = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private readonly turn: Record<CastColor, number> = { blue: 0, red: 0, yellow: 0 };
  private frame = 0;
  private aimed = false;

  /** `outfit`: her outfit this episode (`chef`, `knight`), for its extra shots. */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly outfit: string | null = null,
  ) {
    playStats.jumps = 0;
    playStats.shots = 0;
    playStats.big = 0;
    playStats.live = 0;
    playStats.maxLive = 0;
  }

  /** How high she is off the floor (px): the scene lifts her sprite by it. */
  get height(): number {
    return this.jump?.h ?? 0;
  }

  get airborne(): boolean {
    return this.jump !== null;
  }

  /**
   * Once per frame. `open`: play is allowed now. `green` / `cast`: which
   * buttons are free (a scene where green or yellow means something keeps it).
   * `dt` in seconds, real time.
   */
  update(controls: Controls, dt: number, body: PlayBody, open: boolean, free: { green: boolean; cast: CastColor[] }): void {
    this.frame++;
    const live = open && !dadLock.locked;
    // She shoots the way she last pushed the stick; before that, the way she faces.
    if (controls.move.lengthSq() > 0.04) {
      this.aim.copy(controls.move).normalize();
      this.aimed = true;
    } else if (!this.aimed) this.aim.set(body.face, 0);

    // Jump.
    if (live && free.green && !this.jump && controls.pressed('green')) {
      this.jump = startJump();
      playStats.jumps++;
      sfxJump();
      burst(this.scene, body.x, body.y, { count: 10, speed: 160, colors: [0xffffff, 0xffd23f], gravity: 200, life: 380 });
    }
    if (this.jump) {
      const was = this.jump;
      this.jump = stepJump(was, dt, live && controls.held('green'));
      if (!this.jump && was.v < -300) burst(this.scene, body.x, body.y, { count: 8, speed: 140, colors: [0xffffff], gravity: 0, life: 300 });
    }

    // Casts: a press starts a charge, letting go fires it.
    const from = { x: body.x + this.aim.x * 34, y: body.y - body.mid - this.height };
    for (const c of CAST_COLORS) {
      const charge = this.charges.get(c);
      if (!live || !free.cast.includes(c)) {
        if (charge) this.drop(c);
        continue;
      }
      if (!charge) {
        if (controls.pressed(c)) this.charges.set(c, { heldMs: 0, orb: null });
        continue;
      }
      if (controls.held(c)) {
        charge.heldMs += dt * 1000;
        const p = castPower(charge.heldMs);
        if (p.charged) {
          charge.orb ??= this.scene.add.image(from.x, from.y, TEX.glow).setDepth(DEPTH.fx).setTint(PALETTE[c].body);
          const pulse = 1 + 0.12 * Math.sin(charge.heldMs / 50);
          charge.orb.setPosition(from.x, from.y).setScale((0.3 + 0.9 * p.power) * pulse);
          if (this.frame % 3 === 0) this.trail(c, SHAPES[c][0]!, from.x + Phaser.Math.Between(-50, 50), from.y + Phaser.Math.Between(-50, 50));
        }
        continue;
      }
      const p = castPower(charge.heldMs);
      this.drop(c);
      this.fire(c, from.x, from.y, p.charged, p.power, body.y);
    }

    this.step(dt);
  }

  /** Forget a charge, its orb with it. */
  private drop(c: CastColor): void {
    this.charges.get(c)?.orb?.destroy();
    this.charges.delete(c);
  }

  /**
   * Put down everything in hand (the scene closed play: a choice opened).
   * Shots in flight vanish quietly too: a pop made after the battle veils its
   * effects would hang over the move pads (item 039's frozen-effect bug).
   */
  reset(): void {
    for (const c of CAST_COLORS) this.drop(c);
    this.jump = null;
    for (const s of this.shots) s.obj.destroy();
    this.shots = [];
    playStats.live = 0;
  }

  /**
   * A burst from a pooled emitter (one per look of burst), so mashing makes
   * particles, not emitters. Marked `freePlay`: the battle leaves its clock
   * alone (the shots fly on real time, so do their sparks).
   */
  private puff(x: number, y: number, o: { count: number; speed: number; colors: number[]; texture: string; scale: number; life: number; gravity: number }): void {
    const key = `${o.texture}|${o.colors.join(',')}|${o.speed}|${o.scale}|${o.life}|${o.gravity}`;
    let e = this.puffs.get(key);
    if (!e || !e.active) {
      e = this.scene.add
        .particles(0, 0, o.texture, {
          speed: { min: o.speed * 0.3, max: o.speed },
          angle: { min: 0, max: 360 },
          scale: { start: o.scale, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: { min: o.life * 0.5, max: o.life },
          gravityY: o.gravity,
          tint: o.colors,
          emitting: false,
        })
        .setDepth(DEPTH.fx + 2)
        .setData('freePlay', true);
      this.puffs.set(key, e);
    }
    e.explode(Math.max(3, Math.round(o.count * fxQuality.level)), x, y);
  }

  private look(c: CastColor): Look {
    const extra = (this.outfit && OUTFIT_SHAPES[this.outfit]?.[c]) || [];
    const all = [...SHAPES[c], ...extra, ...extra];
    return all[this.turn[c]++ % all.length]!;
  }

  private fire(c: CastColor, x: number, y: number, big: boolean, power: number, feetY: number): void {
    // Over the cap the oldest just goes (no pop: a press makes one burst, not two).
    for (let n = overCap(this.shots.length); n > 0; n--) this.pop(this.shots[0]!, true);
    const look = this.look(c);
    const scale = (TEX_SCALE[look.tex] ?? 1.3) * (big ? 2.2 + 1.6 * power : 1);
    const pal = PALETTE[c];
    // Normal blend, not additive: over a pale room an additive shot washed out
    // toward white and the three buttons looked alike (item 085).
    const obj = this.scene.add.image(x, y, look.tex).setDepth(DEPTH.fx + 1).setScale(scale).setTint(pal.body);
    const speed = FREE_PLAY.shotSpeed * (big ? 0.8 : 1);
    const lob = c === 'yellow';
    const shot: Shot = {
      color: c,
      obj,
      look,
      x,
      y,
      vx: this.aim.x * speed * (lob ? 0.75 : 1),
      vy: this.aim.y * speed * (lob ? 0.5 : 1) - (lob ? 620 : 0),
      floorY: lob ? Math.max(feetY, y + 40) + Math.max(0, this.aim.y) * 160 : null,
      age: 0,
      life: FREE_PLAY.shotLifeMs * (big ? 1.4 : 1),
      big,
      scale,
      spin: c === 'blue' ? 0 : Phaser.Math.FloatBetween(6, 12) * (Math.random() < 0.5 ? -1 : 1),
      seed: Math.random() * 10,
    };
    if (look.tex === TEX.streak) obj.setRotation(Math.atan2(shot.vy, shot.vx));
    this.shots.push(shot);
    playStats.shots++;
    if (big) playStats.big++;
    playStats.live = this.shots.length;
    playStats.maxLive = Math.max(playStats.maxLive, this.shots.length);
    // The muzzle flash, and a sound per colour.
    this.puff(x, y, { count: big ? 26 : 8, speed: big ? 360 : 180, colors: pal.trail, texture: look.trail, scale: 0.7, life: 320, gravity: 0 });
    if (big) {
      shockwave(this.scene, x, y, pal.body, 140, 380);
      sfxBoom(1);
    }
    if (c === 'blue') sfxZap();
    else if (c === 'red') sfxTwinkle();
    else sfxPew();
  }

  private step(dt: number): void {
    const margin = 30;
    for (const s of [...this.shots]) {
      s.age += dt * 1000;
      if (s.floorY !== null) s.vy += 1500 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // Bolts zig-zag across their path.
      let wx = 0;
      let wy = 0;
      if (s.color === 'blue' && s.look.tex !== TEX.streak) {
        const z = Math.sin(s.age / 28 + s.seed) * (s.big ? 22 : 12);
        const len = Math.hypot(s.vx, s.vy) || 1;
        wx = (-s.vy / len) * z;
        wy = (s.vx / len) * z;
      }
      const pulse = 1 + 0.15 * Math.sin(s.age / 45 + s.seed);
      s.obj.setPosition(s.x + wx, s.y + wy).setScale(s.scale * pulse);
      if (s.spin) s.obj.rotation += s.spin * dt;
      // A trail, thinned when frames drop.
      if (this.frame % (fxQuality.level < 0.7 ? 3 : 1) === 0) this.trail(s.color, s.look, s.x + wx, s.y + wy, s.big ? 2 : 1);
      const out = s.x < margin || s.x > GAME_WIDTH - margin || s.y < margin || s.y > GAME_HEIGHT - margin;
      if (out || s.age > s.life || (s.floorY !== null && s.vy > 0 && s.y >= s.floorY)) this.pop(s);
    }
  }

  private trail(c: CastColor, look: Look, x: number, y: number, n = 1): void {
    const tints = PALETTE[c].trail;
    const key = `${look.trail}|${tints.join(',')}`;
    let e = this.trails.get(key);
    if (!e || !e.active) {
      e = this.scene.add
        .particles(0, 0, look.trail, {
          speed: { min: 10, max: 90 },
          angle: { min: 0, max: 360 },
          scale: { start: look.trail === TEX.spark ? 1.1 : 0.55, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 320,
          tint: tints,
          emitting: false,
        })
        .setDepth(DEPTH.fx)
        .setData('freePlay', true);
      this.trails.set(key, e);
    }
    e.emitParticleAt(x, y, n);
  }

  /** A shot ends in a burst of its own things. */
  private pop(s: Shot, quiet = false): void {
    this.shots = this.shots.filter((o) => o !== s);
    playStats.live = this.shots.length;
    const { x, y } = s.obj;
    s.obj.destroy();
    if (quiet) return;
    const tex = s.look.tex === TEX.glow || s.look.tex === TEX.streak ? s.look.trail : s.look.tex;
    this.puff(x, y, {
      count: s.big ? 40 : 12,
      speed: s.big ? 420 : 220,
      colors: [PALETTE[s.color].body, ...PALETTE[s.color].trail],
      texture: tex,
      scale: tex === TEX.spark ? 1.2 : 0.6,
      life: s.big ? 700 : 450,
      gravity: s.color === 'yellow' ? 500 : 120,
    });
    if (s.big) shockwave(this.scene, x, y, PALETTE[s.color].body, 220, 450);
  }
}
