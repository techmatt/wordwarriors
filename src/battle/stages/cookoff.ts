/**
 * The cook-off (item 031): a TV cooking contest where the yummiest dish wins.
 *
 * Two cooking stations face us, the heroes' on the left and the villain's on
 * the right, each cook standing behind theirs (a giant further down the floor,
 * so even grown for her ultimate her head stays on screen). On each counter a
 * dish grows: a stack of bright pancake layers with cream and a cherry, whose
 * height is that side's score, steered from the battle's health (so the
 * outcome stays fixed). Ingredients fly in arcs from the cooks into their own
 * dish, faster for the side ahead; hits wobble the hit cook's dish. Three
 * judges hold up score cards (numbers only) at the big beats: the villain's
 * monster dish takes 10, 10, 10 at the end of part 1 while the heroes' stack
 * topples with a soft splat; in part 2 the heroes' dish rises tallest and the
 * trophy pops over her station. The fight itself keeps running underneath.
 */

import Phaser from 'phaser';

import { fightPropArt } from '../../../content/battle/fights';
import type { AbilitySpec } from '../../../content/battle/types';
import { sfxBoing, sfxBoom, sfxFanfare, sfxGrow, sfxHeal, sfxPoof, sfxStep, sfxWhoosh } from '../../audio/sfx';
import { DEPTH, FONT_HEAVY } from '../../config';
import { shade } from '../../fx/colour';
import { burst, fitImage, fitPicture, floatText, fxQuality, popIn, shockwave } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import type { Fighter } from '../Fighter';
import { BaseStage } from './stage';

/** One side of the contest: its station, its dish and the score the dish shows. */
interface Side {
  team: 'hero' | 'villain';
  /** The station's centre, and the dish's spot on the counter (its plate). */
  stationX: number;
  stationTop: number;
  dishX: number;
  baseY: number;
  station: Phaser.GameObjects.Image;
  dish: Phaser.GameObjects.Graphics;
  steam: Phaser.GameObjects.Particles.ParticleEmitter;
  sparkle: Phaser.GameObjects.Particles.ParticleEmitter;
  colours: number[];
  food: string[];
  /** The score shown (0..1), eased towards the target every frame. */
  disp: number;
  /** A beat's fixed target, or null to follow the steered health. */
  override: number | null;
  /** Ease fast (a beat) rather than gently (the fight). */
  fast: boolean;
  /** Her pick and the combo add layers of their own. */
  bonus: number;
  /** Extra height and width past the scale: the monster dish, the winning dish. */
  monster: number;
  monsterTarget: number;
  wob: number;
  pop: number;
  /** 0..1 while the stack topples; -1 when standing. */
  topple: number;
  /** The cherry's place on screen, for toppings, trophies and sparkles. */
  topX: number;
  topY: number;
  nextFood: number;
  lastSplat: number;
}

const STATION_W = 230;
const STATION_H = 200;
const LAYER_H = 24;
const HERO_COLOURS = [0xffd23f, 0xff7eb6, 0x7ef0c0, 0xffa64d, 0xb48cff, 0x5ad1ff];
const VILLAIN_COLOURS = [0xb04aff, 0x4dd6ff, 0xff4d6d, 0x8cff5a, 0xff9a3c, 0xff5ab4];
const HERO_FOOD = ['🍓', '🥚', '🧈', '🍫', '🍌', '🧀', '🥕', '🍯', '🍒'];
const VILLAIN_FOOD = ['🌶️', '🍄', '🧅', '🫐', '🍇', '🍋', '🥦'];

/** The heroes' meter icon, a five-pointed star: made once, not every frame. */
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 20 : 9;
  const th = (i / 10) * Math.PI * 2 - Math.PI / 2;
  return new Phaser.Math.Vector2(278 + Math.cos(th) * r, 85 + Math.sin(th) * r);
});

/** The cook-off's staging: stations, growing dishes, flying food, judges and a trophy. */
export class CookoffStage extends BaseStage {
  override readonly anchored = true;

  private sides: Side[] = [];
  /** Simulation seconds since setup. */
  private t = 0;
  /** Part 2: the counter has knocked the villain's ultimate dish back down. */
  private countered = false;
  /** The combo's two heroes are left where the battle put them until then. */
  private comboHold: { a: Fighter; b: Fighter; until: number } | null = null;
  private trophyFor: 'hero' | 'villain' | null = null;
  private cup: { side: Side; img: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image } | null = null;
  private toppled = false;
  private judged = 0;
  private foodFlown = 0;

  private get hero(): Side {
    return this.sides[0]!;
  }
  private get villainSide(): Side {
    return this.sides[1]!;
  }

  override setup(): void {
    const h = this.host;
    const heroTops = h.heroes.map((f, i) => this.spot(f, i).y - f.height * 0.42);
    const vs = this.spot(h.villain, 0);
    // A giant's counter slides right with her, so it still hides her legs.
    const vx = 950 + Phaser.Math.Clamp((h.villain.init.tall ?? h.villain.init.size) - 1, 0, 1.4) * 25;
    // Each dish sits on the counter's inner end (towards the middle), wholly on the counter.
    this.sides = [
      this.makeSide('hero', 330, 380, Math.max(...heroTops, 430), Math.max(...h.heroes.map((f, i) => this.spot(f, i).y)) + 20),
      this.makeSide('villain', vx, vx - 50, vs.y - h.villain.height * 0.42, vs.y + 20),
    ];
    // The villain's own glyphs join its basket now and then.
    for (const ab of h.villain.init.abilities) if (ab.glyph) this.villainSide.food.push(ab.glyph);
  }

  private makeSide(team: 'hero' | 'villain', stationX: number, dishX: number, top: number, depth: number): Side {
    const s = this.scene;
    const stationTop = Phaser.Math.Clamp(Math.round(top), 430, 480);
    // Drawn over the cooks' legs: just above the cook's own depth (y).
    const station = fitImage(s.add.image(stationX, stationTop, fightPropArt('cook_station')).setOrigin(0.5, 0), STATION_W, STATION_H).setDepth(depth);
    const baseY = stationTop + STATION_H * 0.28;
    const dish = s.add.graphics({ x: dishX, y: baseY }).setDepth(depth + 1);
    // The pot's steam on the station's outer end, sparkles off the dish.
    const potX = stationX + (team === 'hero' ? -60 : 60);
    const steam = s.add
      .particles(potX, stationTop + 12, TEX.smoke, { speedY: { min: -70, max: -35 }, speedX: { min: -12, max: 12 }, scale: { start: 0.35, end: 1.1 }, alpha: { start: 0.45, end: 0 }, lifespan: 1800, frequency: 260 })
      .setDepth(depth + 2);
    const sparkle = s.add
      .particles(dishX, baseY, TEX.star, { speed: { min: 30, max: 110 }, angle: { min: 200, max: 340 }, scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, frequency: 280, gravityY: 120, tint: [0xffffff, 0xffd23f, 0xff9ad5], blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.fx);
    return {
      team, stationX, stationTop, dishX, baseY, station, dish, steam, sparkle,
      colours: team === 'hero' ? HERO_COLOURS : VILLAIN_COLOURS,
      food: [...(team === 'hero' ? HERO_FOOD : VILLAIN_FOOD)],
      disp: 0.12, override: null, fast: false, bonus: 0, monster: 0, monsterTarget: 0,
      wob: 0, pop: 0, topple: -1, topX: dishX, topY: baseY - 40, nextFood: 1 + Math.random(), lastSplat: 0,
    };
  }

  /** Behind each station: her hero at the front, the ally just behind; a giant villain further down so she fits. */
  private spot(f: Fighter, i: number): { x: number; y: number } {
    if (f.team === 'villain') {
      // A grown-up by how tall he is drawn (item 093: the chef, 1.65 at size 1.2, grown for his ultimate reached the HUD band).
      const big = Phaser.Math.Clamp((f.init.tall ?? f.init.size) - 1, 0, 1.4);
      return { x: 1020 + big * 15, y: 505 + big * 80 };
    }
    if (this.host.heroes.length < 2) return { x: 260, y: 500 };
    // Her in front, left of the dish; her ally a step back and to her left,
    // so a grown-up shows over her shoulder and neither hides the other or
    // stands behind the dish (item 034).
    return i === 0 ? { x: 265, y: 505 } : { x: 150, y: 450 };
  }

  override home(f: Fighter, i: number): { x: number; y: number } | null {
    return this.spot(f, i);
  }

  override holds(f: Fighter): boolean {
    const h = this.host;
    return f === h.villain || h.heroes.includes(f);
  }

  override steer(f: Fighter, dt: number): boolean {
    const h = this.host;
    // Floored heroes stay where they lie; her hero is hers during a move choice.
    if (f.floored) return true;
    if (h.choosing && f === h.heroes[0]) return false;
    if (!this.holds(f)) return false;
    const i = h.heroes.indexOf(f);
    if (this.comboHold && this.t < this.comboHold.until && (f === this.comboHold.a || f === this.comboHold.b)) return true;
    const to = this.spot(f, Math.max(0, i));
    // Busy cooks: a little stirring sway at the counter.
    const sway = Math.sin(this.t * 3 + f.uid) * 8;
    const k = 1 - Math.pow(0.03, dt);
    // Her stick sways her about her station.
    const n = this.nudge(f);
    f.x += (to.x + sway + n.x - f.x) * k;
    f.y += (to.y + n.y - f.y) * k;
    const bob = Math.sin(this.t * 2.5 + f.uid) * 6;
    const lift = f.init.style === 'fly' ? 34 + bob : f.init.style === 'hover' ? 16 + bob * 0.6 : 0;
    f.lift += (lift - f.lift) * k;
    f.lean += (Math.sin(this.t * 6 + f.uid) * 0.05 - f.lean) * k;
    return true;
  }

  /** Where a side's score is heading: a beat's override, else the other side's lost health plus its bonus layers. */
  private targetOf(s: Side): number {
    if (s.override !== null) return s.override;
    const other = s.team === 'hero' ? this.host.villainFrac() : this.host.heroFrac();
    return Phaser.Math.Clamp(0.15 + 0.6 * (1 - other) + s.bonus, 0.05, 0.92);
  }

  override update(dt: number): void {
    const h = this.host;
    this.t += dt;
    // Either ultimate cooks the villain a towering dish while it charges.
    if (h.phase === 'ultimate' && !this.countered && this.villainSide.override === null) {
      this.villainSide.override = 0.85;
      this.villainSide.monsterTarget = 0.4;
    }
    for (const s of this.sides) {
      const k = 1 - Math.pow(s.fast ? 0.02 : 0.3, dt);
      s.disp += (this.targetOf(s) - s.disp) * k;
      s.monster += (s.monsterTarget - s.monster) * k;
      s.wob *= Math.pow(0.06, dt);
      s.pop *= Math.pow(0.002, dt);
      if (s.topple >= 0) {
        s.topple += dt / 0.6;
        if (s.topple >= 1) this.splat(s);
      }
      // The stations step aside (see-through) while the move pads are out.
      const alpha = h.choosing ? 0.3 : 1;
      // The clock is nearly frozen in a choice, so that fade goes by frames.
      s.station.alpha += (alpha - s.station.alpha) * (h.choosing ? 0.25 : Math.min(1, dt * 8));
      s.dish.setAlpha(s.station.alpha);
      s.steam.setAlpha(s.station.alpha);
      this.drawDish(s);
      s.sparkle.setPosition(s.topX, s.topY);
      s.sparkle.emitting = !h.choosing && fxQuality.level > 0.4;
      this.feed(s, dt);
    }
    // The trophy sits on the winning dish, riding it as it grows.
    const cup = this.cup;
    if (cup?.img.active) {
      const y = Math.max(160, cup.side.topY - 50) + Math.sin(this.t * 3) * 6;
      cup.img.setPosition(cup.side.topX, y);
      cup.glow.setPosition(cup.side.topX, y);
    }
  }

  /** The stack, bottom up: a plate, pancake layers with cream between, a cherry on top. */
  private drawDish(s: Side): void {
    const g = s.dish;
    g.clear();
    const total = 18 + s.disp * 200 + s.monster * 110;
    const n = Math.max(1, total / LAYER_H);
    const count = Math.ceil(n);
    g.fillStyle(0xffffff, 1).fillEllipse(0, 0, 140, 22);
    g.lineStyle(3, 0xb8b8cc, 1).strokeEllipse(0, 0, 140, 22);
    let y = -4;
    let topX = 0;
    let topY = y;
    const p = s.topple >= 0 ? s.topple * s.topple : 0;
    const dir = s.team === 'hero' ? 1 : -1;
    for (let i = 0; i < count; i++) {
      const lh = i < Math.floor(n) ? LAYER_H : Math.max(6, (n - Math.floor(n)) * LAYER_H);
      const up = (i + 1) / count;
      // A hit makes the stack sway like jelly, more at the top; a topple shears it over.
      const dx = s.wob * Math.sin(this.t * 16 + i * 0.8) * up * 18 + dir * p * (i + 1) * 16;
      const top = y - lh + p * i * LAYER_H * 0.85;
      const w = 118 * Math.pow(0.985, i);
      const col = s.colours[i % s.colours.length]!;
      g.fillStyle(shade(col), 1).fillRoundedRect(dx - w / 2, top + 3, w, lh, 9);
      g.fillStyle(col, 1).fillRoundedRect(dx - w / 2, top, w, Math.max(4, lh - 3), 9);
      g.fillStyle(0xffffff, 0.35).fillRect(dx - w / 2 + 10, top + 3, w - 20, 3);
      if (i % 2 === 1) for (let c = -2; c <= 2; c++) g.fillStyle(0xfffaf0, 1).fillCircle(dx + (c * w) / 5.5, top + 1, 6);
      y -= lh;
      topX = dx;
      topY = top;
    }
    g.fillStyle(0xfffaf0, 1).fillCircle(topX - 11, topY - 3, 10).fillCircle(topX + 11, topY - 3, 10).fillCircle(topX, topY - 12, 11);
    g.fillStyle(0xe8102e, 1).fillCircle(topX, topY - 28, 11);
    g.fillStyle(0xffffff, 0.8).fillCircle(topX - 4, topY - 32, 3);
    g.lineStyle(3, 0x2a8a2a, 1).lineBetween(topX, topY - 38, topX + 7, topY - 50);
    const sx = (1 + s.pop) * (1 + 0.3 * s.monster);
    const sy = 1 - s.pop;
    g.setScale(sx, sy);
    s.topX = s.dishX + topX * sx;
    s.topY = s.baseY + (topY - 28) * sy;
  }

  /** Ingredients from the side's cooks into its dish, quicker for the side that is ahead. */
  private feed(s: Side, dt: number): void {
    const h = this.host;
    if (h.phase !== 'fight' && h.phase !== 'combo') return;
    s.nextFood -= dt;
    if (s.nextFood > 0) return;
    const other = s === this.hero ? this.villainSide : this.hero;
    s.nextFood = Phaser.Math.Clamp(1.1 - (s.disp - other.disp) * 1.5, 0.45, 1.6) * (0.8 + Math.random() * 0.4);
    const cooks = (s.team === 'hero' ? h.team() : [h.villain]).filter((f) => f.active && !f.floored);
    const cook = cooks[Math.floor(Math.random() * cooks.length)];
    if (!cook) return;
    const glyph = s.food[Math.floor(Math.random() * s.food.length)]!;
    const item = this.scene.add.text(cook.x, cook.cy, glyph, { fontSize: '38px' }).setOrigin(0.5).setDepth(DEPTH.fx);
    this.foodFlown++;
    this.fling(item, cook.x, cook.cy, () => s.topX, () => s.topY, 140, 620, () => {
      s.pop = Math.max(s.pop, 0.1);
      burst(this.scene, s.topX, s.topY, { count: 10, speed: 180, gravity: 200, colors: [0xffffff, s.colours[0]!, 0xffd23f] });
    });
  }

  /** Throw a thing in a tumbling arc onto a (moving) dish top, then land it. */
  private fling(obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Container, x0: number, y0: number, tx: () => number, ty: () => number, arc: number, ms: number, land: () => void): void {
    const spin = (Math.random() < 0.5 ? -1 : 1) * 540;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      onUpdate: (tw) => {
        if (!obj.active) return;
        const v = tw.getValue() ?? 0;
        obj.setPosition(x0 + (tx() - x0) * v, y0 + (ty() - y0) * v - Math.sin(v * Math.PI) * arc);
        if (!(obj instanceof Phaser.GameObjects.Container)) obj.setAngle(spin * v);
      },
      onComplete: () => {
        if (!obj.active) return;
        obj.destroy();
        land();
      },
    });
  }

  override drawHud(g: Phaser.GameObjects.Graphics): boolean {
    // Two yum-meters in the free band under the names and the fetched things.
    const a = this.host.choosing ? 0.35 : 1;
    const meter = (x: number, w: number, frac: number, color: number, fromRight: boolean) => {
      g.fillStyle(0x000000, 0.55 * a).fillRoundedRect(x - 4, 70, w + 8, 30, 12);
      g.fillStyle(0xffffff, 0.18 * a).fillRoundedRect(x, 74, w, 22, 9);
      const fw = Math.max(0, Math.min(1, frac)) * w;
      if (fw > 2) {
        g.fillStyle(color, a).fillRoundedRect(fromRight ? x + w - fw : x, 74, fw, 22, 9);
        g.fillStyle(0xffffff, 0.4 * a).fillRect((fromRight ? x + w - fw : x) + 6, 77, Math.max(0, fw - 12), 5);
      }
    };
    meter(300, 310, this.hero.disp, 0xffb703, false);
    meter(670, 310, this.villainSide.disp, 0xb04aff, true);
    // Her side's star, the villain's spoon.
    const pts = STAR_POINTS;
    g.fillStyle(0xffd23f, a).fillPoints(pts, true);
    g.lineStyle(3, 0x000000, 0.6 * a).strokePoints(pts, true);
    g.fillStyle(0xe8e8f0, a).fillEllipse(1004, 78, 18, 24).fillRect(1001, 86, 6, 22);
    g.lineStyle(3, 0x000000, 0.6 * a).strokeEllipse(1004, 78, 18, 24);
    return true;
  }

  override onHit(target: Fighter, power: number): void {
    // A shot landing on the frozen clock: no flourish to hang over the faded fight while she picks (hunt 11).
    if (this.host.choosing) return;
    const h = this.host;
    const s = target === h.villain ? this.villainSide : target.team === 'hero' && target.isMain ? this.hero : null;
    if (!s) return;
    s.wob = Math.min(1.2, s.wob + 0.2 + power * 0.1);
    // A splat of sauce, at most a few a second: a whole team hits every frame.
    if (this.t - s.lastSplat < 0.35) return;
    s.lastSplat = this.t;
    const x = s.dishX + (Math.random() - 0.5) * 90;
    const y = s.baseY - Math.random() * Math.max(30, s.baseY - s.topY);
    burst(this.scene, x, y, { count: 12, speed: 220, gravity: 650, blend: false, texture: TEX.spark, colors: [0xd62828, 0xff6a3d, 0xffb703] });
    const blob = this.scene.add.graphics({ x, y }).setDepth(s.dish.depth + 1);
    blob.fillStyle(0xd62828, 0.9).fillCircle(0, 0, 11).fillCircle(10, 5, 6).fillCircle(-9, 7, 5).fillCircle(3, -10, 4);
    this.scene.tweens.add({ targets: blob, alpha: 0, y: y + 30, duration: 900, onComplete: () => blob.destroy() });
  }

  override superMove(f: Fighter, ab: AbilitySpec, word: string): void {
    // The word's own picture, flung into her dish like a magic ingredient.
    const pic = `pic_${word}`;
    const s = this.scene;
    const item = s.textures.exists(pic)
      ? fitPicture(s.add.image(f.x, f.cy, pic), 110, 110).setDepth(DEPTH.fx + 5)
      : s.add.text(f.x, f.cy, ab.glyph ?? '⭐', { fontSize: '80px' }).setOrigin(0.5).setDepth(DEPTH.fx + 5);
    sfxWhoosh();
    const side = this.hero;
    this.fling(item, f.x, f.cy, () => side.topX, () => side.topY, 260, 750, () => {
      side.bonus = Math.min(0.25, side.bonus + 0.1);
      side.pop = 0.3;
      sfxGrow();
      // Never a bank word (YUM was, item 039): it would show a move pad's word before she reads it.
      floatText(s, side.topX, side.topY - 40, 'MMM!', '#ffd23f', 64);
      shockwave(s, side.topX, side.topY, ab.color, 160);
      this.fountain(side, [ab.color, ab.color2 ?? 0xffffff, 0xffd23f, 0xff5ab4], 700);
    });
  }

  /** A sparkle fountain off a dish's top. */
  private fountain(s: Side, tint: number[], ms: number): void {
    const e = this.scene.add
      .particles(s.topX, s.topY, TEX.star, { speedY: { min: -620, max: -300 }, speedX: { min: -160, max: 160 }, gravityY: 700, scale: { start: 1, end: 0 }, lifespan: 1100, frequency: Math.round(22 / fxQuality.level), tint, blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.fx + 3);
    this.later(ms, () => e.stop());
    this.later(ms + 1300, () => e.destroy());
  }

  override combo(a: Fighter, b: Fighter): void {
    // The two flip a giant pancake together, high, onto their stack.
    const s = this.scene;
    this.comboHold = { a, b, until: this.t + 1.9 };
    const cake = s.add.graphics().setDepth(DEPTH.fx + 4);
    cake.fillStyle(0x9a5a1a, 1).fillEllipse(0, 4, 170, 46);
    cake.fillStyle(0xf2b544, 1).fillEllipse(0, 0, 166, 40);
    cake.fillStyle(0xffe08a, 1).fillEllipse(-10, -4, 110, 20);
    cake.fillStyle(0xfff3a0, 1).fillRect(-14, -12, 28, 14);
    const x0 = (a.x + b.x) / 2;
    const y0 = Math.min(a.top, b.top) - 10;
    cake.setPosition(x0, y0);
    for (const f of [a, b]) f.squash(0.35);
    sfxWhoosh();
    burst(s, x0, y0, { count: 30, speed: 300, colors: [0xffd23f, 0xffffff, 0xff9a3c] });
    // Up it goes, flipping (scaleY through zero), then down onto the dish.
    s.tweens.add({ targets: cake, scaleY: -1, duration: 130, yoyo: true, repeat: 3 });
    s.tweens.add({
      targets: cake,
      x: (x0 + this.hero.dishX) / 2,
      y: 150,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (!cake.active) return;
        s.tweens.add({
          targets: cake,
          x: this.hero.dishX,
          y: this.hero.topY,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (!cake.active) return;
            s.tweens.killTweensOf(cake);
            cake.destroy();
            const side = this.hero;
            side.bonus = Math.min(0.25, side.bonus + 0.08);
            side.pop = 0.35;
            sfxBoing();
            floatText(s, side.topX, side.topY - 40, 'WHEE!', '#ffb703', 56);
            burst(s, side.topX, side.topY, { count: 50, speed: 380, texture: TEX.star, colors: [0xffd23f, 0xffffff, 0xff7eb6] });
            this.judge(side.dishX, [8, 9, 8]);
          },
        });
      },
    });
  }

  override async ultimate1(v: Fighter, ult: AbilitySpec): Promise<void> {
    const vs = this.villainSide;
    const hs = this.hero;
    // The ultimate turns into a monster dish, cheered by fireworks.
    vs.override = 1;
    vs.monsterTarget = 1;
    vs.fast = true;
    vs.pop = 0.3;
    sfxGrow();
    const colours = [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1], 0xffd23f];
    [0, 250, 500, 800, 1100].forEach((ms, i) => this.later(ms, () => this.firework(vs.topX + (i % 2 ? 90 : -90) * Math.random(), 150 + Math.random() * 90, colours)));
    this.fountain(vs, colours, 1200);
    this.later(600, () => this.confetti(700, 1240, colours, 1000));
    this.later(300, () => this.host.focus(vs.dishX, Math.max(260, vs.topY + 60), 1.15, 700));
    this.later(900, () => {
      // Clear of the trophy, which lands on the villain's dish.
      this.judge(680, [10, 10, 10]);
      this.judge(hs.dishX, [3, 2, 4]);
    });
    // The heroes' stack topples over, comically: a soft splat, nothing sad.
    this.later(1150, () => {
      hs.override = 0.08;
      hs.topple = 0;
      this.toppled = true;
      sfxWhoosh();
    });
    this.later(1400, () => this.trophy(vs));
    await this.host.wait(2.2);
  }

  override async counter2(): Promise<void> {
    const hs = this.hero;
    const vs = this.villainSide;
    this.countered = true;
    // The heroes' dish glows with magic and builds back up, bigger.
    hs.override = 0.78;
    hs.monsterTarget = 0.3;
    hs.fast = true;
    vs.override = 0.45;
    vs.monsterTarget = 0;
    vs.wob = 1.2;
    vs.fast = true;
    sfxHeal();
    const glow = this.scene.add.image(hs.dishX, hs.baseY - 100, TEX.glow).setTint(0xfff3a0).setBlendMode(Phaser.BlendModes.ADD).setScale(3.4).setAlpha(0).setDepth(DEPTH.fx);
    this.scene.tweens.add({ targets: glow, alpha: 0.9, duration: 250, yoyo: true, repeat: 2 });
    for (let i = 0; i < 6; i++) {
      this.later(i * 180, () => burst(this.scene, hs.dishX + (Math.random() - 0.5) * 120, hs.baseY - i * 40, { count: 18, speed: 200, texture: TEX.star, gravity: -120, colors: [0xfff3a0, 0xffffff, 0x80ffdb, 0xff9ad5] }));
    }
    this.later(600, () => {
      sfxGrow();
      hs.pop = 0.3;
      floatText(this.scene, hs.topX, hs.topY - 40, 'WOW!', '#80ffdb', 60);
    });
    await this.host.wait(1.4);
    this.scene.tweens.killTweensOf(glow);
    glow.destroy();
  }

  override async finish(_v: Fighter): Promise<void> {
    const hs = this.hero;
    const vs = this.villainSide;
    // Her dish rises tallest, with a firework topping.
    hs.override = 1;
    hs.monsterTarget = 0.9;
    hs.fast = true;
    vs.override = 0.3;
    vs.fast = true;
    hs.pop = 0.3;
    sfxFanfare();
    const colours = [0xffd23f, 0xff5ab4, 0x7ad9ff, 0xffffff];
    [0, 300, 600, 900].forEach((ms) => this.later(ms, () => this.firework(hs.topX + (Math.random() - 0.5) * 160, 150 + Math.random() * 80, colours)));
    this.fountain(hs, colours, 1100);
    this.later(150, () => this.host.focus(hs.dishX, Math.max(260, hs.topY + 60), 1.12, 500));
    this.later(350, () => this.judge(640, [10, 10, 10]));
    this.later(700, () => {
      this.trophy(hs);
      this.confetti(40, 1240, [...colours, 0x8cff5a, 0xff9a3c], 1400);
    });
    await this.host.wait(1.4);
  }

  override retreat(): void {
    // The villain takes a bow behind its giant dish.
    const v = this.host.villain;
    const vs = this.villainSide;
    this.later(200, () => {
      if (!v.active) return;
      v.squash(0.3);
      floatText(this.scene, v.cx, v.top - 30, 'TA-DA!', '#ff9ad5', 48);
      burst(this.scene, vs.topX, vs.topY, { count: 40, speed: 360, texture: TEX.square, colors: VILLAIN_COLOURS });
    });
    this.later(650, () => {
      if (v.active) v.squash(0.3);
    });
  }

  /** The studio's confetti cannons: a coloured shower over the winning half for `ms`. */
  private confetti(x0: number, x1: number, colours: number[], ms: number): void {
    const e = this.scene.add
      .particles(0, 0, TEX.square, {
        x: { min: x0, max: x1 },
        y: -20,
        speedY: { min: 120, max: 320 },
        speedX: { min: -90, max: 90 },
        gravityY: 160,
        scaleX: { min: 0.4, max: 0.9 },
        scaleY: { start: 0.9, end: 0.15, ease: 'Sine.easeInOut' },
        rotate: { min: 0, max: 360 },
        lifespan: 2400,
        frequency: Math.round(14 / fxQuality.level),
        quantity: 2,
        tint: colours,
      })
      .setDepth(DEPTH.fx + 20);
    this.later(ms, () => e.stop());
    this.later(ms + 2500, () => e.destroy());
  }

  /** A rocket off a dish top that bursts into stars. */
  private firework(x: number, y: number, colors: number[]): void {
    const s = this.scene;
    const rocket = s.add.image(x, 420, TEX.spark).setScale(1.4).setTint(colors[0]!).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx + 1);
    s.tweens.add({
      targets: rocket,
      y,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => {
        rocket.destroy();
        sfxBoom(1);
        burst(s, x, y, { count: 50, speed: 420, texture: TEX.star, gravity: 140, life: 900, colors });
        shockwave(s, x, y, colors[1] ?? 0xffffff, 110, 400);
      },
    });
  }

  /** Three judges hold up their cards, centred on `cx`: numbers only. */
  private judge(cx: number, scores: number[]): void {
    const sc = this.scene;
    this.judged++;
    scores.forEach((n, i) => {
      const x = cx + (i - 1) * 88;
      const stick = sc.add.rectangle(0, 52, 10, 50, 0x8a5a2a);
      const card = sc.add.rectangle(0, 0, 76, 92, 0xffffff).setStrokeStyle(6, n >= 8 ? 0xffd23f : 0x9ad8ff);
      const num = sc.add.text(0, 2, String(n), { fontFamily: FONT_HEAVY, fontSize: n >= 10 ? '44px' : '54px', color: n >= 8 ? '#e8102e' : '#2a5ab4' }).setOrigin(0.5);
      const c = sc.add.container(x, 230, [stick, card, num]).setDepth(DEPTH.fx + 50).setScale(0).setAngle((i - 1) * 7);
      sc.tweens.add({ targets: c, y: 175, scale: 1, duration: 320, delay: i * 140, ease: 'Back.easeOut' });
      this.later(i * 140, () => sfxStep(i));
      sc.tweens.add({ targets: c, y: 240, alpha: 0, duration: 300, delay: 1900 + i * 80, onComplete: () => c.destroy() });
    });
  }

  /** The trophy pops onto the winning dish and stays there, bobbing and twinkling (update places it). */
  private trophy(s: Side): void {
    const sc = this.scene;
    this.trophyFor = s.team;
    sfxPoof();
    const y = Math.max(160, s.topY - 50);
    const glow = sc.add.image(s.topX, y, TEX.glow).setTint(0xffd23f).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.8).setDepth(DEPTH.fx + 9);
    const img = fitImage(sc.add.image(s.topX, y, fightPropArt('trophy')), 110, 120).setDepth(DEPTH.fx + 10);
    popIn(sc, img, img.scale, 0, 450);
    sc.tweens.add({ targets: glow, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
    this.cup = { side: s, img, glow };
    burst(sc, s.topX, y, { count: 60, speed: 420, texture: TEX.star, colors: [0xffd23f, 0xffffff, 0xff9a3c] });
  }

  /** The topple's end: the stack lands in a soft splat and starts again small. */
  private splat(s: Side): void {
    s.topple = -1;
    s.disp = 0.08;
    s.wob = 1;
    sfxBoing();
    burst(this.scene, s.dishX + 70, s.baseY, { count: 40, speed: 320, texture: TEX.square, blend: false, gravity: 700, colors: s.colours });
    floatText(this.scene, s.dishX + 60, s.baseY - 90, 'SPLAT!', '#ffb8e6', 50);
  }

  override info(): Record<string, unknown> {
    return {
      heroScore: this.hero.disp,
      villainScore: this.villainSide.disp,
      heroTarget: this.targetOf(this.hero),
      villainTarget: this.targetOf(this.villainSide),
      monster: this.villainSide.monster,
      toppled: this.toppled,
      trophy: this.trophyFor,
      judged: this.judged,
      foodFlown: this.foodFlown,
    };
  }
}
