/**
 * The spell-beam clash (item 031): magic against magic, on a moonlit tower top.
 *
 * The heroes stand on the left (her hero in front, the ally beside and
 * behind), the villain on the right, and a wobbling beam pours from each
 * side; they meet at the clash point, a sparkler of rings, sparks and stars.
 * The ally's beam braids into her hero's. Where the clash point sits is the
 * contest: towards the villain when the heroes are winning. It follows the
 * steered health (`heroFrac` against `villainFrac`) with a little shove and
 * sway, plus the beats' own pushes, so the outcome stays the director's.
 *
 * The simulation keeps running underneath: abilities fire, minions roam and
 * hits land (each one flickers the clash point towards the side that was hit).
 * Beats: a super surges the picker's beam in the move's colour; the combo
 * twists both beams into one rainbow; the part 1 ultimate swells the villain's
 * beam enormous and the clash point races over the heroes and bursts; part 2's
 * counter flips the beams, and the finish rams the clash point into the villain.
 */

import Phaser from 'phaser';

import type { AbilitySpec } from '../../../content/battle/types';
import { sfxBoom, sfxPoof, sfxShield, sfxSummon, sfxWhoosh, sfxZap } from '../../audio/sfx';
import { DEPTH } from '../../config';
import { bright, colourGap, hex } from '../../fx/colour';
import { burst, fitImage, floatText, fxQuality, shake, shockwave } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_RIGHT } from '../movement';
import { BaseStage, ease, lerpPt, type Pt } from './stage';

type Mode = 'off' | 'clash' | 'ultimate' | 'counter' | 'finish' | 'done';
/** One caster's beam: `p` is how far out and how strong (0..1), `w` its width multiplier. Both eased. */
interface Beam {
  p: number;
  w: number;
}

/** Her hero in front, the ally beside and a step back. */
const HERO_SPOTS: Pt[] = [
  { x: 330, y: 585 },
  { x: 215, y: 495 },
];
const VILLAIN_SPOT: Pt = { x: 975, y: 570 };
/**
 * The power meter in the free band under the names and the fetched things,
 * centred, and narrow enough that its portraits clear a long second hero name
 * (18 px type from x 30 at y 58).
 */
const METER = { x: 400, y: 76, w: 480, h: 22 };
const RAINBOW = [0xff4a6a, 0xff9a3c, 0xffd23f, 0x5aff8a, 0x7ad9ff, 0xb04aff];
const GOLD = 0xffd23f;

/** The spell-beam clash: two beams and the point where they meet. */
export class ClashStage extends BaseStage {
  override readonly anchored = true;

  /** The stage's own clock (simulation seconds): wobbles freeze with the move choice. */
  private t = 0;
  private mode: Mode = 'off';
  /** The contest, −1..1 (beats push past to ±1.25): positive is the heroes winning. */
  private lead = 0;
  /** The eased part of the lead; `kick` (supers, the combo) and `flick` (hits) decay on top. */
  private base = 0;
  private kick = 0;
  private flick = 0;
  private clash: Pt = { x: 640, y: 450 };
  private beams = new Map<Fighter, Beam>();
  /** Her super: the picker's beam in the move's colours for a moment. */
  private surge: { f: Fighter; colors: number[]; until: number } | null = null;
  /** The combo (and the finish): the hero side's beams as one rainbow. */
  private rainbowUntil = 0;
  private pair: Fighter[] = [];
  private ultColors: number[] | null = null;
  /** Part 1, after the ultimate's burst: the heroes' beams are out until the retreat. */
  private heroesDown = false;
  /** Part 2, after the finish's explosion: the villain's beam is gone. */
  private villainOut = false;
  private nextRing = 0;
  private braceAt = new Map<number, number>();
  private sparkQ = 0;
  /** Each live beam's ends as last drawn, for the retreat's fizzle. */
  private paths: { a: Pt; b: Pt; color: number }[] = [];

  private heroCol = 0x7ad9ff;
  private villainCol = 0xff4a6a;
  private beamG!: Phaser.GameObjects.Graphics;
  private glowG!: Phaser.GameObjects.Graphics;
  private floorG!: Phaser.GameObjects.Graphics;
  private core!: Phaser.GameObjects.Image;
  private halo!: Phaser.GameObjects.Image;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private winds: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private heads: Phaser.GameObjects.Image[] = [];

  override setup(): void {
    const s = this.scene;
    const h = this.host.heroes[0];
    const v = this.host.villain;
    // The meter's two colours: the sides' own, unless they are too alike to tell apart.
    const hc = bright(h?.init.palette[1] ?? this.heroCol);
    const vc = bright(v.init.palette[1]);
    if (colourGap(hc, vc) > 140) {
      this.heroCol = hc;
      this.villainCol = vc;
    }
    this.floorG = s.add.graphics().setDepth(FLOOR_TOP - 3.8);
    this.beamG = s.add.graphics().setDepth(DEPTH.fx - 60);
    this.glowG = s.add.graphics().setDepth(DEPTH.fx - 50).setBlendMode(Phaser.BlendModes.ADD);
    this.halo = s.add.image(0, 0, TEX.glow).setTint(GOLD).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx - 45).setVisible(false);
    this.core = s.add.image(0, 0, TEX.glow).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx - 40).setVisible(false);
    const tint = [this.heroCol, this.villainCol, 0xffffff, GOLD];
    // The sparkler: sparks spraying out and raining down, stars tumbling off it.
    this.sparks = s.add
      .particles(0, 0, TEX.spark, { speed: { min: 120, max: 440 }, angle: { min: 0, max: 360 }, gravityY: 650, scale: { start: 0.9, end: 0 }, lifespan: { min: 400, max: 900 }, frequency: 20, quantity: 2, tint, blendMode: Phaser.BlendModes.ADD, emitting: false })
      .setDepth(DEPTH.fx - 30);
    this.stars = s.add
      .particles(0, 0, TEX.star, { speedX: { min: -160, max: 160 }, speedY: { min: -260, max: 40 }, gravityY: 420, rotate: { min: 0, max: 360 }, scale: { start: 0.7, end: 0 }, lifespan: 1100, frequency: 90, tint, blendMode: Phaser.BlendModes.ADD, emitting: false })
      .setDepth(DEPTH.fx - 30);
    // The wind off the clash, blowing past each side's hair and robes.
    this.winds = [-1, 1].map((dir) =>
      s.add
        .particles(0, 0, TEX.streak, {
          speedX: dir < 0 ? { min: -720, max: -380 } : { min: 380, max: 720 },
          speedY: { min: -30, max: 30 },
          // The streak's bright end leads: flipped for the gust blowing left.
          scaleX: { start: 1.3 * dir, end: 0.4 * dir },
          scaleY: { start: 1.3, end: 0.4 },
          alpha: { start: 0.45, end: 0 },
          lifespan: 800,
          frequency: 45,
          tint: [0xffffff, dir < 0 ? this.villainCol : this.heroCol],
          blendMode: Phaser.BlendModes.ADD,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-10, -150, 20, 220) } as never,
          emitting: false,
        })
        .setDepth(DEPTH.fx - 70),
    );
    // Little portraits at the meter's ends: whose side is whose.
    const my = METER.y + METER.h / 2;
    if (h) this.heads.push(fitImage(s.add.image(METER.x - 34, my, h.init.art), 46, 46).setDepth(DEPTH.hud + 1));
    this.heads.push(fitImage(s.add.image(METER.x + METER.w + 34, my, v.init.art), 46, 46).setDepth(DEPTH.hud + 1));
  }

  override home(f: Fighter, i: number): Pt | null {
    if (f === this.host.villain) {
      // A giant stands at the front, kept wholly on screen; everybody else mid-floor.
      const giant = f.giant;
      return { x: Math.min(VILLAIN_SPOT.x, ARENA_RIGHT - f.height * 0.45 - 10), y: giant ? FLOOR_BOTTOM - 30 : VILLAIN_SPOT.y };
    }
    const spot = HERO_SPOTS[Math.min(i, HERO_SPOTS.length - 1)]!;
    return { x: spot.x, y: spot.y };
  }

  /** Where a placed fighter stands, or null for those left to roam (minions, clones, the combo's cameo). */
  private spot(f: Fighter): Pt | null {
    if (f === this.host.villain) return this.home(f, 0);
    const i = this.host.heroes.indexOf(f);
    return i >= 0 ? this.home(f, i) : null;
  }

  override holds(f: Fighter): boolean {
    return this.spot(f) !== null;
  }

  override steer(f: Fighter, dt: number): boolean {
    // Her hero is hers to walk during a move choice; eased back to her place after.
    if (this.host.choosing && f === this.host.heroes[0]) return false;
    const spot = this.spot(f);
    if (!spot) return false;
    if (f.floored) return true;
    const k = ease(3.5, dt);
    // The losing side gives ground a little; knockback from hits eases back.
    const give = f.team === 'hero' ? Math.min(0, this.lead) * 45 : Math.max(0, this.lead) * 45;
    // Her stick still sways her hero about her spot, so the pad always answers.
    const n = this.nudge(f);
    f.x += (spot.x + give + n.x - f.x) * k;
    f.y += (spot.y + n.y - f.y) * k;
    f.vx = 0;
    f.vy = 0;
    // Height: flyers and hoverers float as they would; the villain's own scare leap is left alone.
    const v = f === this.host.villain;
    if (!(v && (this.host.phase === 'counter' || this.host.phase === 'finish'))) {
      const want = f.init.style === 'fly' ? 100 + Math.sin(this.t * 1.6 + f.uid) * 30 : f.init.style === 'hover' ? 40 + Math.sin(this.t * 2.5 + f.uid) * 12 : 0;
      f.lift += (want - f.lift) * k;
    }
    // Bracing against the push: a straining stretch and little squash pulses.
    const beam = this.beams.get(f);
    if (beam && beam.p > 0.3) {
      f.lean = 0.08 + 0.08 * Math.abs(Math.sin(this.t * 7 + f.uid)) * (0.5 + Math.abs(this.lead));
      if (this.t >= (this.braceAt.get(f.uid) ?? 0)) {
        f.squash(0.05 + 0.04 * Math.abs(this.lead));
        this.braceAt.set(f.uid, this.t + 0.5 + Math.random() * 0.5);
      }
    } else f.lean *= 1 - k;
    return true;
  }

  /** The hero side's casters: the heroes and, in a combo, its cameo partner. */
  private heroSide(): Fighter[] {
    const list = [...this.host.heroes];
    if (this.t < this.rainbowUntil) for (const f of this.pair) if (f.team === 'hero' && !list.includes(f)) list.push(f);
    return list;
  }

  /** How strong a caster's beam should be right now. */
  private want(f: Fighter): number {
    if (this.mode === 'off' || this.mode === 'done' || !f.active || f.floored) return 0;
    const st = f.status?.kind;
    if (f.team === 'villain') {
      if (this.villainOut) return 0;
      if (this.heroesDown) return 0.55;
      return st && st !== 'burn' ? 0.35 : 1;
    }
    if (this.heroesDown) return 0;
    if (st === 'freeze' || st === 'bubble' || st === 'stun') return 0.3;
    return st === 'pig' ? 0.6 : 1;
  }

  private heroTip(f: Fighter): Pt {
    return { x: f.x + f.height * f.scaleMul * 0.28, y: f.cy - f.height * 0.08 };
  }

  private villainTip(v: Fighter): Pt {
    return { x: v.x - v.height * v.scaleMul * 0.3, y: v.cy - v.height * 0.08 };
  }

  /** The clash point's place along the line between the two main casters, 0 (her hand) to 1 (the villain's). */
  private get u(): number {
    return Phaser.Math.Clamp(0.5 + 0.4 * this.lead, 0, 1);
  }

  override update(dt: number): void {
    this.t += dt;
    const host = this.host;
    if (this.mode === 'off' && host.phase === 'fight') this.ignite();

    // The contest: the steered health with a shove and sway, or a beat's own push.
    let target: number;
    if (this.mode === 'ultimate') target = this.heroesDown ? -0.6 : -1.25;
    else if (this.mode === 'counter') target = 0.85;
    else if (this.mode === 'finish') target = 1.25;
    else if (host.phase === 'ultimate' || host.phase === 'counter') target = host.part === 1 ? -0.35 : -0.45;
    else target = Phaser.Math.Clamp((host.heroFrac() - host.villainFrac()) * 1.6, -0.75, 0.75) + Math.sin(this.t * 0.7) * 0.15 + Math.sin(this.t * 1.9) * 0.05;
    const rate = this.mode === 'ultimate' ? 2.2 : this.mode === 'counter' || this.mode === 'finish' ? 3 : 1.2;
    this.base += (target - this.base) * ease(rate, dt);
    this.kick *= Math.exp(-1.1 * dt);
    this.flick *= Math.exp(-6 * dt);
    this.lead = Phaser.Math.Clamp(this.base + this.kick + this.flick, -1.3, 1.3);

    // Each beam eases towards its strength and width.
    const rainbow = this.t < this.rainbowUntil;
    if (this.surge && this.t > this.surge.until) this.surge = null;
    const hSwell = this.mode === 'counter' || this.mode === 'finish' ? 2.6 : rainbow ? 1.9 : 1;
    const vSwell = this.mode === 'ultimate' ? (this.heroesDown ? 0.9 : 3.6) : this.mode === 'counter' || this.mode === 'finish' ? 0.7 : host.phase === 'ultimate' || host.phase === 'counter' ? 1.8 : 1;
    const side = this.heroSide();
    const v = host.villain;
    for (const f of [...side, v]) {
      let b = this.beams.get(f);
      if (!b) this.beams.set(f, (b = { p: 0, w: 1 }));
      const w = f === v ? vSwell : hSwell * (this.surge?.f === f ? 2.2 : 1);
      b.p += (this.want(f) - b.p) * ease(5, dt);
      b.w += (w - b.w) * ease(4, dt);
    }
    for (const [f, b] of this.beams) if (!f.active && b.p < 0.02) this.beams.delete(f);

    // The clash point, between her hand (or whoever on her side still casts) and the villain's.
    const lit = side.filter((f) => f.active && (this.beams.get(f)?.p ?? 0) > 0.05);
    const main = lit.includes(host.heroes[0]!) ? host.heroes[0]! : lit[0];
    const ht = main ? this.heroTip(main) : { x: 330, y: 470 };
    const vt = v.active ? this.villainTip(v) : { x: 960, y: 470 };
    const c = lerpPt(ht, vt, this.u);
    c.y += Math.sin(this.t * 3.1) * 10;
    this.clash = c;

    this.draw(lit, main, ht, vt, rainbow);
    this.sparkle(lit);
    this.drawFloor([...lit, v]);
  }

  /** Every beam this frame: strands in the caster's colours, a glow and a white core. */
  private draw(lit: Fighter[], main: Fighter | undefined, ht: Pt, vt: Pt, rainbow: boolean): void {
    const vis = this.host.choosing ? 0.3 : 1;
    this.beamG.clear().setAlpha(vis);
    this.glowG.clear().setAlpha(vis);
    this.paths = [];
    const v = this.host.villain;
    const vb = this.beams.get(v);
    if (vb && vb.p > 0.02 && v.active) {
      const cols = this.ultColors ?? [bright(v.init.palette[0]), bright(v.init.palette[1]), 0xffffff];
      this.beam(vt, this.clash, cols, vb, 7.3, 1);
    }
    if (!main) return;
    const mb = this.beams.get(main)!;
    const cols = (f: Fighter, shift: number): number[] => {
      if (rainbow) return [...RAINBOW.slice(shift), ...RAINBOW.slice(0, shift)];
      if (this.surge?.f === f) return this.surge.colors;
      return [bright(f.init.palette[0]), bright(f.init.palette[1]), 0xffffff];
    };
    this.beam(ht, this.clash, cols(main, 0), mb, 1.7, 1);
    // The others braid in: a beam to a point along hers, then a twist round it to the clash.
    const join = lerpPt(ht, this.clash, 0.35);
    lit.forEach((f, i) => {
      if (f === main) return;
      const b = this.beams.get(f)!;
      const fc = cols(f, (i * 2) % RAINBOW.length);
      this.beam(this.heroTip(f), join, fc, b, 3.1 + i, 1);
      if (b.p > 0.6) this.beam(join, this.clash, fc.slice(0, 2), { p: b.p, w: b.w * 0.8 }, 5.9 + i, 2.2, true);
    });
  }

  /**
   * One beam from `a` towards `b`: it reaches out as `p` grows (and pulls back
   * as it fades), each strand on its own sine wobble, the width flickering.
   * `braid` makes the strands a helix round the line (the ally's twist).
   */
  private beam(a: Pt, b: Pt, colors: number[], beam: Beam, seed: number, amp: number, braid = false): void {
    const { p } = beam;
    const end = lerpPt(a, b, Math.min(1, p * 1.25));
    const dx = end.x - a.x;
    const dy = end.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const segs = Math.max(8, Math.round(len / 22));
    const t = this.t;
    const w = beam.w * p * (0.85 + 0.12 * Math.sin(t * 37 + seed) + 0.08 * Math.sin(t * 23.3 + seed * 2));
    const path = (g: Phaser.GameObjects.Graphics, off: (u: number) => number) => {
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const u = i / segs;
        const o = off(u);
        const x = a.x + dx * u + nx * o;
        const y = a.y + dy * u + ny * o;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    };
    if (!braid) {
      this.glowG.lineStyle(w * 44, colors[0]!, 0.26 * p);
      this.glowG.lineBetween(a.x, a.y, end.x, end.y);
    }
    colors.forEach((col, k) => {
      this.beamG.lineStyle(Math.max(2, w * (braid ? 6 : 12 - 2 * k)), col, 0.9 * p);
      const phase = braid ? k * Math.PI : k * 2.1;
      const spin = braid ? 16 : 13 + k * 3;
      path(this.beamG, (u) => Math.sin(u * (len / 45) - t * spin + phase + seed) * (7 + 5 * k) * amp * Math.max(0.6, w) * Math.sin(Math.PI * u));
    });
    if (!braid) {
      this.glowG.lineStyle(Math.max(3, w * 7), 0xffffff, 0.95 * p);
      path(this.glowG, (u) => Math.sin(u * 9 - t * 20 + seed) * 2 * Math.sin(Math.PI * u));
      this.paths.push({ a, b: end, color: colors[0]! });
    }
  }

  /** The sparkler at the clash point, the rings it pulses out and the wind off it. */
  private sparkle(lit: Fighter[]): void {
    const v = this.host.villain;
    const hp = Math.max(0, ...lit.map((f) => this.beams.get(f)?.p ?? 0));
    const vp = v.active ? (this.beams.get(v)?.p ?? 0) : 0;
    const meet = Math.min(hp, vp);
    const live = meet > 0.6 && this.mode !== 'off' && this.mode !== 'done';
    const { x, y } = this.clash;
    const vis = this.host.choosing ? 0.35 : 1;
    const big = Math.max(this.beams.get(v)?.w ?? 1, 1) * meet;
    this.core.setVisible(meet > 0.05).setPosition(x, y).setAlpha(meet * vis).setScale(0.9 + 0.5 * big + 0.25 * Math.sin(this.t * 21));
    this.halo.setVisible(meet > 0.05).setPosition(x, y).setAlpha(0.7 * meet * vis).setScale(1.8 + big + 0.4 * Math.sin(this.t * 9));
    for (const e of [this.sparks, this.stars, ...this.winds]) {
      e.setPosition(x, y);
      e.emitting = live && !this.host.choosing;
    }
    // Thinner when the frame rate sags.
    const q = fxQuality.level < 0.6 ? 1 : 2;
    if (q !== this.sparkQ) {
      this.sparkQ = q;
      this.sparks.setQuantity(q);
    }
    if (live && this.t >= this.nextRing) {
      this.nextRing = this.t + 0.3 / fxQuality.level;
      shockwave(this.scene, x, y, Math.floor(this.t / 0.3) % 2 ? this.heroCol : this.villainCol, 60 + 30 * big, 380);
    }
  }

  /** Rune circles glowing under each caster's feet. */
  private drawFloor(casters: Fighter[]): void {
    const g = this.floorG.clear();
    for (const f of casters) {
      const p = this.beams.get(f)?.p ?? 0;
      if (p < 0.05 || !f.active) continue;
      const col = f.team === 'villain' ? this.villainCol : this.heroCol;
      const rx = f.height * 0.55;
      const ry = rx * 0.32;
      g.lineStyle(5, col, 0.6 * p).strokeEllipse(f.x, f.y, rx * 2, ry * 2);
      g.lineStyle(2, 0xffffff, 0.5 * p).strokeEllipse(f.x, f.y, rx * 1.5, ry * 1.5);
      g.fillStyle(0xffffff, 0.85 * p);
      for (let i = 0; i < 6; i++) {
        const a = this.t * 1.5 * (f.team === 'villain' ? -1 : 1) + (i / 6) * Math.PI * 2;
        g.fillCircle(f.x + Math.cos(a) * rx * 0.87, f.y + Math.sin(a) * ry * 0.87, 4);
      }
    }
  }

  /** The beams switch on as the fight starts: they shoot out and meet with a crack. */
  private ignite(): void {
    this.mode = 'clash';
    sfxZap();
    this.later(250, () => {
      const { x, y } = this.clash;
      shockwave(this.scene, x, y, 0xffffff, 220, 500);
      burst(this.scene, x, y, { count: 50, speed: 480, colors: [this.heroCol, this.villainCol, 0xffffff], texture: TEX.star });
    });
  }

  override drawHud(g: Phaser.GameObjects.Graphics): boolean {
    // "PICK A MOVE!" sits in this band during a choice: the meter steps aside.
    const show = !this.host.choosing;
    for (const h of this.heads) h.setVisible(show);
    if (!show) return true;
    const { x, y, w, h } = METER;
    const split = x + w * this.u;
    g.fillStyle(0x000000, 0.55).fillRoundedRect(x - 6, y - 6, w + 12, h + 12, 14);
    g.fillStyle(this.villainCol, 1).fillRoundedRect(x, y, w, h, 10);
    g.fillStyle(this.heroCol, 1).fillRoundedRect(x, y, Math.max(20, split - x), h, 10);
    g.fillStyle(0xffffff, 0.3).fillRect(x + 8, y + 3, w - 16, 5);
    // The clash point on the meter: a pulsing star where the colours meet.
    const cy = y + h / 2;
    const r = 17 + 3 * Math.sin(this.t * 18);
    g.fillStyle(GOLD, 0.55).fillCircle(split, cy, r + 8);
    const pts: Pt[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + this.t * 2;
      const rr = i % 2 === 0 ? r : r * 0.45;
      pts.push({ x: split + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    g.fillStyle(0xffffff, 1).fillPoints(pts, true);
    return true;
  }

  override onHit(target: Fighter, power: number, _from: Fighter | null): void {
    if (!target.isMain || this.mode !== 'clash') return;
    // The clash point flickers towards whoever was hit.
    this.flick = Phaser.Math.Clamp(this.flick + (target.team === 'villain' ? 1 : -1) * Math.min(0.12, 0.03 * power), -0.25, 0.25);
    if (power >= 2) burst(this.scene, this.clash.x, this.clash.y, { count: 10, speed: 260, colors: [target.team === 'villain' ? this.heroCol : this.villainCol, 0xffffff] });
  }

  override superMove(f: Fighter, ab: AbilitySpec, _word: string): void {
    this.surge = { f, colors: [bright(ab.color), bright(ab.color2 ?? 0xffffff), 0xffffff], until: this.t + 1.8 };
    if (this.mode === 'clash') this.kick += 0.45;
    // The surge reaches the clash point, which jumps the villain's way. Never the move word.
    this.later(250, () => {
      const { x, y } = this.clash;
      sfxZap();
      shockwave(this.scene, x, y, ab.color, 280, 600);
      burst(this.scene, x, y, { count: 60, speed: 520, colors: [ab.color, GOLD, 0xffffff], texture: TEX.star });
      floatText(this.scene, x, y - 90, 'BOOST!', hex(bright(ab.color)), 48);
    });
  }

  override combo(a: Fighter, b: Fighter): void {
    this.rainbowUntil = this.t + 2.6;
    this.pair = [a, b];
    if (this.mode === 'clash') this.kick += 0.6;
    sfxSummon();
    // After the director's own punch (360 ms) has settled, or the two zooms fight.
    this.later(380, () => {
      const { x, y } = this.clash;
      this.host.focus(x, y, 1.12, 300);
      shockwave(this.scene, x, y, 0xffffff, 340, 700);
      this.later(140, () => shockwave(this.scene, this.clash.x, this.clash.y, GOLD, 260, 600));
      burst(this.scene, x, y, { count: 90, speed: 640, colors: RAINBOW, texture: TEX.star, life: 1000 });
      floatText(this.scene, x, y - 100, 'WOW!', '#ffd23f', 60);
    });
  }

  override async ultimate1(v: Fighter, ult: AbilitySpec): Promise<void> {
    // The villain's beam swells enormous in its ultimate's colours and races over the heroes.
    this.mode = 'ultimate';
    this.kick = 0;
    this.flick = 0;
    this.ultColors = [bright(ult.color), bright(ult.color2 ?? 0xffffff), bright(v.init.palette[1])];
    sfxZap();
    // Rings crackle off the clash point as it races across.
    for (let i = 0; i < 5; i++) {
      this.later(i * 240, () => {
        shockwave(this.scene, this.clash.x, this.clash.y, i % 2 ? 0xffffff : ult.color, 120 + i * 30, 420);
        if (i % 2 === 0) sfxZap();
      });
    }
    await this.host.wait(1.25);
    const team = this.host.team();
    const x = team.length ? team.reduce((s, f) => s + f.x, 0) / team.length : 300;
    const y = team.length ? team.reduce((s, f) => s + f.cy, 0) / team.length : 470;
    const cols = [...this.ultColors, 0xffffff];
    burst(this.scene, x, y, { count: 120, speed: 720, colors: cols, texture: TEX.star, life: 1100, gravity: 250 });
    burst(this.scene, x, y, { count: 80, speed: 500, colors: cols });
    shockwave(this.scene, x, y, ult.color, 340, 700);
    this.later(150, () => shockwave(this.scene, x, y, 0xffffff, 260, 600));
    // Back to 1x (300 in, hold, 400 out) before the director's punch at the end of the wait.
    this.host.focus(x, y, 1.15, 150);
    sfxBoom(2);
    shake(this.scene, 4, 300);
    floatText(this.scene, x, y - 140, 'KABOOM!', hex(bright(ult.color)), 60);
    this.heroesDown = true;
    await this.host.wait(0.95);
  }

  override async counter2(_v: Fighter): Promise<void> {
    // The beams flip: the heroes' beams swell and drive the clash point back.
    this.mode = 'counter';
    this.kick = 0;
    this.heroesDown = false;
    this.ultColors = null;
    sfxShield();
    sfxWhoosh();
    this.later(350, () => {
      const { x, y } = this.clash;
      // A quick push in on the turn; back to 1x well inside the beat.
      this.host.focus(x, y, 1.1, 120);
      shockwave(this.scene, x, y, this.heroCol, 320, 650);
      this.later(160, () => shockwave(this.scene, this.clash.x, this.clash.y, GOLD, 240, 550));
      burst(this.scene, x, y, { count: 70, speed: 560, colors: [this.heroCol, GOLD, 0xffffff], texture: TEX.star });
      floatText(this.scene, x, y - 100, 'WHOOSH!', hex(this.heroCol), 56);
    });
    await this.host.wait(1.3);
  }

  override async finish(v: Fighter): Promise<void> {
    // All the magic together, one rainbow, and the clash point rams the villain.
    this.mode = 'finish';
    this.kick = 0;
    this.rainbowUntil = this.t + 1.4;
    this.pair = this.host.team();
    await this.host.wait(0.55);
    const x = v.cx;
    const y = v.cy;
    burst(this.scene, x, y, { count: 160, speed: 900, colors: [...RAINBOW, 0xffffff], texture: TEX.star, life: 1300, gravity: 200, scale: 1.3 });
    burst(this.scene, x, y, { count: 90, speed: 600, colors: [GOLD, 0xffffff] });
    for (let i = 0; i < 3; i++) this.later(i * 120, () => shockwave(this.scene, x, y, RAINBOW[i * 2]!, 380, 700));
    // Settled (300 in, hold, 400 out) inside the 0.8 s wait, before the last hit's punch.
    this.host.focus(x, y, 1.15, 80);
    sfxBoom(3);
    shake(this.scene, 5, 300);
    floatText(this.scene, x, v.top - 40, 'WOW!', '#ffd23f', 72);
    this.villainOut = true;
    await this.host.wait(0.8);
    this.mode = 'done';
  }

  override retreat(): void {
    // The beams fizzle out in sparks along their length.
    sfxPoof();
    // The clash point itself goes out with a puff and a last spray of sparks.
    const { x, y } = this.clash;
    burst(this.scene, x, y, { count: 30, speed: 220, colors: [0xbbbbcc, 0xffffff], texture: TEX.smoke, gravity: -60, life: 900, blend: false });
    burst(this.scene, x, y, { count: 36, speed: 380, colors: [this.heroCol, this.villainCol, GOLD], gravity: 600 });
    for (const { a, b, color } of this.paths) {
      for (let i = 1; i <= 4; i++) {
        const p = lerpPt(a, b, i / 4);
        burst(this.scene, p.x, p.y, { count: 14, speed: 200, colors: [color, 0xcccccc, 0xffffff], gravity: 500 });
      }
    }
    this.mode = 'done';
  }

  override info(): Record<string, unknown> {
    return { clash: Math.round(this.clash.x), lead: Math.round(this.lead * 100) / 100, mode: this.mode, beams: [...this.beams.values()].filter((b) => b.p > 0.05).length };
  }
}
