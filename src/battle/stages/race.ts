/**
 * The sky race (item 031): everyone races through the treasure cave in the
 * air, left to right, and the steered health shows as the race lead.
 *
 * Every racer has a lane (a floor row) and flies: walkers ride a little cloud,
 * flyers fly as they always do, a giant skims low so her head stays in view.
 * The pack's x positions are the lead (heroes further right when they are
 * ahead), and a track across the top band carries each racer's face from
 * START to the chequered flag. The cave sweeps past right to left in three
 * parallax layers (stalactites, lantern strings, coin piles) with wind streaks
 * and glittering coins, so the still background reads as a fast flight.
 *
 * Beats: a super is a turbo boost; the combo is a shared rainbow slipstream;
 * part 1's ultimate rockets the villain over the finish line to the trophy
 * while the heroes tumble; part 2's counter is the heroes' turbo, and the
 * finish is the heroes crossing the line first, the trophy over her hero.
 */

import Phaser from 'phaser';

import { fightPropArt } from '../../../content/battle/fights';
import type { AbilitySpec } from '../../../content/battle/types';
import { sfxFanfare, sfxWhoosh } from '../../audio/sfx';
import { DEPTH, FONT_HEAVY, GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { burst, fitImage, floatText, fxQuality, popIn, shockwave, speedLines } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import { FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_RIGHT } from '../movement';
import { BaseStage, ease } from './stage';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** One racer's lane, trails and place on the track. */
interface Racer {
  f: Fighter;
  /** The little cloud a walker rides (null for flyers and the giant). */
  cloud: Emitter | null;
  /** The jet trail streaming out behind it. */
  jet: Emitter;
  /** A boost's flame or star trail, while it lasts. */
  flame: Emitter | null;
  flameUntil: number;
  /** Its face on the track. */
  icon: Phaser.GameObjects.Image;
  /** Shown progress along the track, 0..1, eased. */
  prog: number;
  /** A boost pushes it ahead of its place until this time (stage seconds). */
  boostUntil: number;
  /** Pushed back by hits, px; decays. */
  wobble: number;
}

/** One piece of a parallax layer, wrapping round as it scrolls. */
interface Scroller {
  g: Phaser.GameObjects.Graphics;
  /** Pixels per second at race speed 1. */
  speed: number;
}

/** The track across the top band: clear of the names, the item icons and "PICK A MOVE!". */
const TRACK = { x0: 380, x1: 900, y: 98 };
/**
 * The pack's x by the lead: level at 0 (heroes a step behind), and far enough
 * apart at the ends that whoever leads is plainly further right.
 */
const HERO_X = 600;
const VILLAIN_X = 680;
const LEAD_PX = 330;
/** Where the finish banner stands on the floor. */
const FLAG_X = 980;
const RAINBOW = [0xff4d4d, 0xffa34d, 0xffe14d, 0x5ee35e, 0x4dc3ff, 0xb26bff];
const CONFETTI = [0x111111, 0xffffff, 0x111111, 0xffffff, 0xffd23f, 0xff5ab4, 0x7ad9ff];

export class RaceStage extends BaseStage {
  override readonly anchored = true;

  /** Stage clock, simulation seconds. */
  private t = 0;
  private racers: Racer[] = [];
  private layers: Scroller[] = [];
  private wind: Emitter | null = null;
  private glitter: Emitter | null = null;
  /** The race lead, -1..1, heroes ahead positive; eased towards its target. */
  private lead = 0;
  /** A beat's fixed lead, overriding the health. */
  private override: number | null = null;
  /** A short-lived push to the heroes' lead from a boost or the combo; decays. */
  private surge = 0;
  /** Scroll speed, 1 = cruising; boosted for a while by the big beats. */
  private speed = 1;
  private speedMul = 1;
  private speedUntil = 0;
  /** How far round the course the pack has flown, 0..1. */
  private pack = 0.05;
  /** The shared rainbow trail of the combo. */
  private slip: { a: Fighter; b: Fighter; fx: Emitter; until: number } | null = null;
  private beat = 'race';
  private tumbleAt = -1;
  private rocketAt = -1;
  private zoomAt = -1;
  private villainWon = false;
  private heroesWon = false;
  private loopAt = -1;
  private flag: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null = null;
  private trophy: { obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text; on: Fighter } | null = null;
  private lastCoins = 0;
  private startLabel: Phaser.GameObjects.Text | null = null;

  override setup(): void {
    const s = this.scene;
    this.makeLayers();
    // Wind streaks across the whole cave, and glittering coins along the floor.
    this.wind = s.add
      .particles(GAME_WIDTH + 80, 0, TEX.streak, {
        y: { min: 130, max: GAME_HEIGHT - 20 },
        speedX: { min: -1500, max: -900 },
        scaleX: { min: 1.5, max: 4 },
        scaleY: { min: 0.3, max: 0.6 },
        alpha: { start: 0.45, end: 0 },
        lifespan: 1500,
        frequency: 60,
        tint: [0xffffff, 0xfff1c0, 0xffd23f],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(FLOOR_TOP - 4);
    this.glitter = s.add
      .particles(GAME_WIDTH + 20, 0, TEX.star, {
        y: { min: FLOOR_TOP + 10, max: GAME_HEIGHT },
        speedX: { min: -700, max: -400 },
        scale: { min: 0.3, max: 0.7 },
        alpha: { start: 1, end: 0.2 },
        lifespan: 2600,
        frequency: 90,
        tint: [0xffd23f, 0xffe98a, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(FLOOR_TOP - 4);
    for (const f of [...this.host.heroes, this.host.villain]) this.addRacer(f);
    this.startLabel = s.add
      .text(TRACK.x0 - 12, TRACK.y, 'START', { fontFamily: FONT_HEAVY, fontSize: '15px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 })
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud + 1);
  }

  /** A racer's trails and face icon. */
  private addRacer(f: Fighter): void {
    const s = this.scene;
    const [c0, c1] = f.init.palette;
    const walker = f.init.style !== 'fly' && f.init.size < 2;
    const cloud = walker
      ? s.add.particles(0, 0, TEX.smoke, {
          speedX: { min: -260, max: -120 },
          speedY: { min: -10, max: 20 },
          scale: { start: f.height / 260, end: 0.1 },
          alpha: { start: 0.85, end: 0 },
          lifespan: 520,
          frequency: 35,
          tint: [0xffffff, 0xf4f0ff],
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-f.height * 0.3, -6, f.height * 0.6, 12) } as never,
        })
      : null;
    const jet = s.add.particles(0, 0, TEX.streak, {
      speedX: { min: -520, max: -380 },
      scaleX: { start: 1.6, end: 0.4 },
      scaleY: 0.8,
      alpha: { start: 0.7, end: 0 },
      lifespan: 360,
      frequency: 40,
      tint: [c0, c1, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-10, -f.height * 0.25, 10, f.height * 0.5) } as never,
    });
    const icon = fitImage(s.add.image(TRACK.x0, TRACK.y, f.init.art), 30, 30).setDepth(DEPTH.hud + 2);
    this.racers.push({ f, cloud, jet, flame: null, flameUntil: 0, icon, prog: 0.05, boostUntil: 0, wobble: 0 });
  }

  /** The cave sweeping past: far stalactites, lantern strings, near coin piles. */
  private makeLayers(): void {
    const s = this.scene;
    const span = GAME_WIDTH + 400;
    for (let i = 0; i < 7; i++) {
      const g = s.add.graphics().setDepth(DEPTH.floor).setPosition(-200 + (i * span) / 7, 0);
      for (let k = 0; k < 3; k++) {
        const x = k * 46 - 46;
        const len = 60 + Math.random() * 110;
        g.fillStyle(0x24160c, 0.85).fillTriangle(x - 22, 0, x + 22, 0, x, len);
        g.fillStyle(0x6a4a2a, 0.5).fillTriangle(x - 6, 0, x + 2, 0, x - 2, len * 0.7);
      }
      this.layers.push({ g, speed: 90 });
    }
    for (let i = 0; i < 4; i++) {
      const g = s.add.graphics().setDepth(DEPTH.floor + 1).setPosition(-200 + (i * span) / 4, 150 + Math.random() * 90);
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(-150, 0), new Phaser.Math.Vector2(0, 60), new Phaser.Math.Vector2(150, 0));
      g.lineStyle(3, 0x3a2414, 0.9);
      curve.draw(g, 24);
      for (let k = 1; k <= 5; k++) {
        const p = curve.getPoint(k / 6);
        const c = RAINBOW[(i + k) % RAINBOW.length]!;
        g.fillStyle(c, 0.25).fillCircle(p.x, p.y + 10, 16);
        g.fillStyle(c, 1).fillCircle(p.x, p.y + 10, 7);
      }
      this.layers.push({ g, speed: 210 });
    }
    for (let i = 0; i < 6; i++) {
      const g = s.add.graphics().setDepth(FLOOR_TOP - 6).setPosition(-200 + (i * span) / 6, GAME_HEIGHT + 6);
      const w = 120 + Math.random() * 90;
      const h = 34 + Math.random() * 24;
      g.fillStyle(0xc8901a, 1).fillEllipse(0, 0, w + 10, h * 2 + 8);
      g.fillStyle(0xffc23a, 1).fillEllipse(0, 0, w, h * 2);
      for (let k = 0; k < 6; k++) g.fillStyle(k % 2 ? 0xffffff : 0xff5ab4, 0.9).fillCircle((Math.random() - 0.5) * w * 0.7, -Math.random() * h * 0.8, 3);
      this.layers.push({ g, speed: 520 });
    }
  }

  private racer(f: Fighter): Racer | undefined {
    return this.racers.find((r) => r.f === f);
  }

  /** The floor row each racer flies along. */
  private laneY(f: Fighter): number {
    if (f === this.host.villain) return f.init.size >= 2 ? 655 : 570;
    if (f === this.host.helper) return 455;
    const i = this.host.heroes.indexOf(f);
    // Her lane in front: a grown-up ally behind her shows over her head, where
    // in front he hid her (item 034).
    return [625, 505][i] ?? 560;
  }

  /** Height off the floor: everybody is airborne; a giant only skims, so her head stays on screen. */
  private liftFor(f: Fighter): number {
    const wave = Math.sin(this.t * 2.2 + f.uid) * 10;
    if (this.tumbleAt >= 0 && f.team === 'hero') return 12;
    const grown = f.growUntil > f.now;
    if (f.init.size >= 2) return grown ? 0 : 16 + wave * 0.5;
    // A big flyer grown for its ultimate sinks a little, or its head leaves the top (a grown-up by
    // how tall he is drawn, item 093: the chef's 1.65 reached the HUD band).
    if (grown && (f.init.tall ?? f.init.size) >= 1.4) return 30;
    if (f.init.style === 'fly') return 105 + wave * 2;
    return 62 + wave;
  }

  private maxX(f: Fighter): number {
    return f.init.size >= 2 ? ARENA_RIGHT - f.height * 0.45 : ARENA_RIGHT - 60;
  }

  /** The finish line, nearer the middle when a giant has to fit past it. */
  private flagX(): number {
    return Math.min(FLAG_X, this.maxX(this.host.villain) - 110);
  }

  override home(f: Fighter, i: number): { x: number; y: number } | null {
    if (f === this.host.villain) return { x: VILLAIN_X, y: this.laneY(f) };
    return { x: HERO_X - i * 80, y: this.laneY(f) };
  }

  override holds(f: Fighter): boolean {
    return Boolean(this.racer(f));
  }

  override steer(f: Fighter, dt: number): boolean {
    const r = this.racer(f);
    // Minions, clones and the combo's cameo dad roam as in the brawl.
    if (!r) return false;
    if (f.floored) return true;
    const her = f === this.host.heroes[0];
    if (her && this.host.choosing) return false;
    const villain = f === this.host.villain;
    // The villain's fright leap at the counter is the battle's own lift.
    // The victory loop sets its own lift below.
    if (!(villain && (this.host.phase === 'counter' || this.loopAt >= 0))) f.lift += (this.liftFor(f) - f.lift) * ease(4, dt);
    // The intro's run-in is the battle's tween.
    if (this.host.phase === 'intro') return true;
    const L = this.lead;
    const wave = Math.sin(this.t * 1.3 + f.uid * 2.1) * 22;
    const boost = this.t < r.boostUntil ? 170 : 0;
    let tx: number;
    let ty = this.laneY(f);
    let k = 4;
    if (villain) {
      tx = VILLAIN_X - L * LEAD_PX + wave - r.wobble;
      if (this.rocketAt >= 0) {
        tx = this.flagX() + 130;
        k = 6;
      }
      if (this.loopAt >= 0) {
        // The victory loop, made of positions: round in a big circle, never a turn of the art.
        // Eased in, so the loop's first lift does not jump it 90 px.
        const a = (this.t - this.loopAt) * Math.PI * 1.6;
        const ramp = Math.min(1, (this.t - this.loopAt) / 0.4);
        tx = this.flagX() + 40 + Math.cos(a) * 150;
        const lift = this.liftFor(f) + (90 - Math.sin(a) * 90) * ramp;
        f.lift += (lift - f.lift) * ease(10, dt);
        k = 10;
      }
    } else if (f === this.host.helper) {
      tx = HERO_X - 160 + L * LEAD_PX + wave - r.wobble;
    } else {
      const i = this.host.heroes.indexOf(f);
      tx = HERO_X + L * LEAD_PX - i * 80 + wave + boost - r.wobble;
      const lead = this.host.heroes[0];
      if (i === 1 && this.slip && this.t < this.slip.until && lead?.active) {
        // Slipstreaming: tucked in right behind her hero.
        tx = lead.x - 110;
        ty = lead.y + 30;
        k = 7;
      }
      if (this.tumbleAt >= 0) tx -= 110;
      if (this.zoomAt >= 0) {
        tx = this.flagX() + 140 - i * 90;
        k = 7;
      }
    }
    // Her stick sways her about her place in the pack.
    const n = this.nudge(f);
    tx = Phaser.Math.Clamp(tx + n.x, 90, this.maxX(f));
    ty += n.y;
    f.x += (tx - f.x) * ease(k, dt);
    f.y += (ty - f.y) * ease(3, dt);
    // A forward stretch, more when boosting.
    f.lean = boost || k > 5 ? 0.3 : 0.12;
    return true;
  }

  override update(dt: number): void {
    this.t += dt;
    const h = this.host;
    if (h.helper?.active && !this.racer(h.helper)) this.addRacer(h.helper);

    // The lead: the steered health, or the beat's own.
    this.surge *= Math.exp(-0.6 * dt);
    let target = Phaser.Math.Clamp((h.heroFrac() - h.villainFrac()) * 2.2, -0.85, 0.85) + this.surge;
    if (this.override !== null) target = this.override;
    target = Phaser.Math.Clamp(target, -1, 1);
    this.lead += (target - this.lead) * ease(2.5, dt);

    // Speed: cruising, boosted at the big beats, gliding once the race is won.
    let want = this.t < this.speedUntil ? this.speedMul : 1;
    if (this.villainWon || this.heroesWon || h.phase === 'end') want = 0.4;
    this.speed += (want - this.speed) * ease(3, dt);
    const span = GAME_WIDTH + 400;
    for (const l of this.layers) {
      l.g.x -= l.speed * this.speed * dt;
      if (l.g.x < -200) l.g.x += span;
    }
    if (this.wind) this.wind.frequency = 60 / (this.speed * fxQuality.level);
    if (this.glitter) this.glitter.frequency = 90 / (this.speed * fxQuality.level);

    // Round the course: the pack flies on; each face sits by the lead.
    if (h.phase !== 'intro' && !this.villainWon && !this.heroesWon) this.pack = Math.min(0.8, this.pack + dt * 0.011);
    for (const r of this.racers) {
      const f = r.f;
      const live = f.active && !f.floored;
      r.wobble *= Math.exp(-2.5 * dt);
      const body = f.y - f.lift - f.height * 0.5;
      if (r.cloud) {
        r.cloud.setPosition(f.x, f.y - f.lift).setDepth(f.y + 0.5);
        r.cloud.emitting = live && f.lift > 20;
      }
      r.jet.setPosition(f.x - f.height * 0.3, body).setDepth(f.y - 1);
      r.jet.emitting = live && f.onStage;
      if (r.flame) {
        r.flame.setPosition(f.x - f.height * 0.25, body).setDepth(f.y - 0.5);
        if (this.t > r.flameUntil || !f.active) {
          const fx = r.flame;
          fx.stop();
          r.flame = null;
          h.after(700, () => fx.destroy());
        }
      }
      let p: number;
      if (f.team === 'hero') p = this.heroesWon ? 1 : this.pack + 0.12 * this.lead - (this.villainWon ? 0.1 : 0);
      else p = this.villainWon ? 1 : this.pack - 0.12 * this.lead;
      r.prog += (Phaser.Math.Clamp(p, 0.02, 1) - r.prog) * ease(3, dt);
      const i = h.heroes.indexOf(f);
      // The ally's face a little behind her hero's, so both show.
      r.icon.setPosition(TRACK.x0 + r.prog * (TRACK.x1 - TRACK.x0) - Math.max(0, i) * 24,f.team === 'hero' ? TRACK.y - 12 : TRACK.y + 12);
      r.icon.setVisible(f.active || f === h.villain).setAlpha(h.choosing ? 0.35 : 1);
    }
    this.startLabel?.setAlpha(h.choosing ? 0.35 : 1);

    // The combo's rainbow, streaming out between the two.
    if (this.slip) {
      const { a, b, fx } = this.slip;
      if (a.active && b.active) fx.setPosition((a.x + b.x) / 2 - 40, (a.cy + b.cy) / 2).setDepth(Math.max(a.y, b.y) + 1);
      if (this.t > this.slip.until || !a.active || !b.active) {
        fx.stop();
        h.after(900, () => fx.destroy());
        this.slip = null;
      }
    }
    // The trophy rides over its winner.
    if (this.trophy) {
      const { obj, on } = this.trophy;
      // Never above the top of the screen: a grown giant's head is near it already.
      if (obj.active && on.root.active) obj.setPosition(on.x, Math.max(on.top - 70, 140) + Math.sin(this.t * 5) * 6);
    }
  }

  override drawHud(g: Phaser.GameObjects.Graphics): boolean {
    const { x0, x1, y } = TRACK;
    const a = this.host.choosing ? 0.35 : 1;
    g.fillStyle(0x000000, 0.5 * a).fillRoundedRect(x0 - 72, y - 30, x1 - x0 + 120, 58, 14);
    g.fillStyle(0xffffff, 0.3 * a).fillRoundedRect(x0, y - 4, x1 - x0, 8, 4);
    // Dashes along the track, sliding left with the race.
    const off = (this.t * 60 * this.speed) % 24;
    g.fillStyle(0xffd23f, 0.9 * a);
    for (let x = x0 + 24 - off; x < x1; x += 24) g.fillRect(x, y - 1, 10, 2);
    // The chequered flag at the end.
    g.lineStyle(3, 0xffffff, a).lineBetween(x1 + 10, y - 24, x1 + 10, y + 22);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillStyle((r + c) % 2 ? 0x111111 : 0xffffff, a).fillRect(x1 + 12 + c * 7, y - 24 + r * 7, 7, 7);
    // A ring round each face: green for the heroes, red for the villain.
    for (const r of this.racers) {
      if (!r.icon.visible) continue;
      const hero = r.f.team === 'hero';
      g.fillStyle(0x000000, 0.6 * a).fillCircle(r.icon.x, r.icon.y, 18);
      g.lineStyle(3, hero ? 0x44d95a : 0xe8483f, a).strokeCircle(r.icon.x, r.icon.y, 18);
    }
    return true;
  }

  override onHit(target: Fighter, power: number, _from: Fighter | null): void {
    const r = this.racer(target);
    if (!r) return;
    // The battle's hit() has squashed it already; this only knocks it back in the race.
    r.wobble = Math.min(120, r.wobble + 22 * power);
    if (target === this.host.villain && this.t - this.lastCoins > 0.15) {
      // Coins spill out of the dragon's hoard (whoever the villain is).
      this.lastCoins = this.t;
      burst(this.scene, target.cx, target.cy, { count: 8 + power * 5, speed: 320, texture: TEX.star, gravity: 700, scale: 0.8, colors: [0xffd23f, 0xffe98a, 0xffb703] });
    }
  }

  override superMove(f: Fighter, ab: AbilitySpec, _word: string): void {
    const r = this.racer(f);
    if (r) r.boostUntil = this.t + 1.6;
    this.surge += 0.35;
    this.speedUp(2.4, 1.6);
    this.ghosts(f, 0xffd23f, 14);
    this.flameOn(f, [ab.color, 0xffd23f, 0xff7b00, 0xffffff], 1.6, TEX.star);
    floatText(this.scene, f.cx, f.top - 30, 'BOOST!', '#ffd23f', 54);
    sfxWhoosh();
  }

  override combo(a: Fighter, b: Fighter): void {
    for (const f of [a, b]) {
      const r = this.racer(f);
      if (r) r.boostUntil = this.t + 2;
    }
    this.surge += 0.45;
    this.speedUp(2.2, 2);
    this.slip?.fx.destroy();
    const fx = this.scene.add.particles(0, 0, TEX.spark, {
      speedX: { min: -700, max: -450 },
      speedY: { min: -30, max: 30 },
      scale: { start: 2.2, end: 0.4 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 700,
      frequency: Math.round(8 / fxQuality.level),
      quantity: 2,
      tint: RAINBOW,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-80, -40, 160, 80) } as never,
    });
    this.slip = { a, b, fx, until: this.t + 2.2 };
    floatText(this.scene, (a.cx + b.cx) / 2, Math.min(a.top, b.top) - 30, 'SLIPSTREAM!', '#ffffff', 50);
    sfxWhoosh();
  }

  override async ultimate1(v: Fighter, ult: AbilitySpec): Promise<void> {
    const h = this.host;
    this.beat = 'ultimate1';
    this.override = -1;
    this.speedUp(2, 1.2);
    // The ultimate lands on the heroes' lanes; they tumble back (a card flip, never a turn).
    for (const f of h.team()) {
      this.laneFlash(f, ult.color);
      f.spin = 3;
      f.squash(0.35);
      burst(this.scene, f.cx, f.cy, { count: 24, speed: 300, colors: [ult.color, 0xffffff] });
    }
    this.tumbleAt = this.t;
    // And the villain rockets for the line.
    this.rocketAt = this.t;
    this.ghosts(v, ult.color, 16);
    this.flameOn(v, [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]], 1.8, TEX.spark);
    speedLines(this.scene, v.cx, v.cy, ult.color, 800);
    sfxWhoosh();
    h.after(200, () => this.sweepFlag());
    await h.wait(1.0);
    this.villainWon = true;
    this.cross(v, 450);
    await h.wait(1.2);
  }

  override async counter2(_v: Fighter): Promise<void> {
    this.beat = 'counter';
    this.override = 0.3;
    this.speedUp(2.4, 1.4);
    for (const f of this.host.team()) {
      const r = this.racer(f);
      if (r) r.boostUntil = this.t + 1.3;
      this.ghosts(f, 0x7ad9ff, 10);
      this.flameOn(f, [0x7ad9ff, 0xffd23f, 0xffffff], 1.4, TEX.star);
      shockwave(this.scene, f.x - 60, f.cy, 0x7ad9ff, 160);
    }
    const her = this.host.heroes[0];
    if (her?.active) floatText(this.scene, her.cx, her.top - 30, 'TURBO!', '#7ad9ff', 58);
    sfxWhoosh();
    await this.host.wait(1.2);
  }

  /** The flag comes in as the narrator says "There's the finish line!", not after the finishers (item 069). */
  override finishLine(): void {
    this.sweepFlag();
  }

  override async finish(_v: Fighter): Promise<void> {
    const h = this.host;
    this.beat = 'finish';
    this.override = 1;
    this.speedUp(2.8, 1.5);
    this.sweepFlag();
    for (const f of h.team()) {
      this.ghosts(f, 0xffd23f, 12);
      this.flameOn(f, RAINBOW, 1.4, TEX.star);
    }
    await h.wait(0.25);
    this.zoomAt = this.t;
    sfxWhoosh();
    const her = h.heroes[0];
    if (her?.active) {
      speedLines(this.scene, her.cx, her.cy, 0xffd23f, 500);
      floatText(this.scene, her.cx, her.top - 30, 'GO GO GO!', '#ffd23f', 54);
    }
    await h.wait(0.45);
    this.heroesWon = true;
    if (her?.active) this.cross(her, 50);
    await h.wait(0.75);
  }

  override retreat(): void {
    const v = this.host.villain;
    if (!v.active) return;
    // A showy victory loop with the trophy, coins flying off it.
    this.loopAt = this.t;
    for (let i = 0; i < 6; i++) {
      this.host.after(i * 200, () => {
        if (v.active) burst(this.scene, v.cx, v.cy, { count: 10, speed: 260, texture: TEX.star, gravity: 500, colors: [0xffd23f, 0xffffff, ...RAINBOW] });
      });
    }
  }

  override info(): Record<string, unknown> {
    const prog = (team: 'hero' | 'villain') => this.racers.filter((r) => r.f.team === team).map((r) => Math.round(r.prog * 100) / 100);
    return { lead: Math.round(this.lead * 100) / 100, beat: this.beat, speed: Math.round(this.speed * 100) / 100, heroes: prog('hero'), villain: prog('villain')[0] ?? 0, winner: this.heroesWon ? 'heroes' : this.villainWon ? 'villain' : null, flag: Boolean(this.flag) };
  }

  // -- the beats' pieces --------------------------------------------------------------

  private speedUp(mul: number, secs: number): void {
    this.speedMul = mul;
    this.speedUntil = this.t + secs;
  }

  /** Fading copies streaming off a boosted racer. */
  private ghosts(f: Fighter, color: number, n: number): void {
    for (let i = 0; i < n; i++) this.later(i * 80, () => {
      if (f.active) f.afterimage(color);
    });
  }

  /** A boost's flame or star trail behind `f` for `secs`. */
  private flameOn(f: Fighter, tint: number[], secs: number, tex: string): void {
    const r = this.racer(f);
    if (!r || !f.active) return;
    r.flame?.destroy();
    r.flame = this.scene.add.particles(0, 0, tex, {
      speedX: { min: -620, max: -360 },
      speedY: { min: -60, max: 60 },
      scale: { start: 1.3, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 520,
      frequency: Math.round(12 / fxQuality.level),
      quantity: 2,
      tint,
      blendMode: Phaser.BlendModes.ADD,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-20, -f.height * 0.3, 20, f.height * 0.6) } as never,
    });
    r.flameUntil = this.t + secs;
  }

  /** A streak of the ultimate's colour along a hero's lane. */
  private laneFlash(f: Fighter, color: number): void {
    const band = this.scene.add.rectangle(GAME_WIDTH / 2, f.cy, GAME_WIDTH, f.height * 0.7, color, 0).setDepth(FLOOR_TOP - 2).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: band, fillAlpha: 0.5, duration: 160, yoyo: true, repeat: 2, onComplete: () => band.destroy() });
  }

  /** A prop's art, or its glyph if the art has not loaded. */
  private prop(id: string, glyph: string, w: number, h: number): Phaser.GameObjects.Image | Phaser.GameObjects.Text {
    const key = fightPropArt(id);
    if (this.scene.textures.exists(key)) return fitImage(this.scene.add.image(0, 0, key), w, h);
    return this.scene.add.text(0, 0, glyph, { fontSize: `${Math.round(h * 0.8)}px` });
  }

  /** The finish banner sweeps in from the right and plants itself on the floor. */
  private sweepFlag(): void {
    if (this.flag || !this.scene.sys.isActive()) return;
    const flag = this.prop('finish_flag', '🏁', 240, 340).setOrigin(0.5, 1).setDepth(FLOOR_TOP - 3);
    flag.setPosition(GAME_WIDTH + 200, 668);
    this.flag = flag;
    this.scene.tweens.add({ targets: flag, x: this.flagX(), duration: 480, ease: 'Back.easeOut' });
    sfxWhoosh();
  }

  /** `f` crosses the line first: chequered confetti, the trophy pops over it, a short push in. */
  private cross(f: Fighter, holdMs: number): void {
    const s = this.scene;
    const x = this.flagX();
    burst(s, x, 330, { count: 120, speed: 650, texture: TEX.square, gravity: 600, life: 1400, blend: false, colors: CONFETTI });
    burst(s, x, 330, { count: 60, speed: 500, texture: TEX.star, colors: RAINBOW });
    shockwave(s, x, 400, 0xffd23f, 260);
    if (!this.trophy) {
      const obj = this.prop('trophy', '🏆', 110, 120).setOrigin(0.5, 1).setDepth(DEPTH.fx + 3);
      obj.setPosition(f.x, Math.max(f.top - 70, 140));
      popIn(s, obj, obj.scale, 0, 420);
      this.trophy = { obj, on: f };
    }
    sfxFanfare();
    // The push in is back out (300 + hold + 400 ms) before the director's own punch after the beat.
    this.host.focus(x, 420, 1.2, holdMs);
  }
}
