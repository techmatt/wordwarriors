/**
 * The rope pull (item 031): a tug-of-war over the Serpent Sea.
 *
 * The heroes stand in a line on the left on a thick twisted rope, the villain
 * holds the other end on the right with great coils of its own colours heaving
 * out of the floor behind it, and a pool of sea water splashes either side of
 * a glowing centre line. The red knot on the rope is the contest: towards the
 * heroes when they are winning. It is steered by the battle's cosmetic health
 * (`heroFrac` against `villainFrac`) plus each beat's own push, so the outcome
 * stays the director's.
 *
 * Everyone leans and heaves on a shared rhythm while the simulation runs on:
 * abilities fire, minions roam, hits make a puller stumble towards the line.
 * Part 1's ultimate yanks the heroes into the water (never "lost": they are
 * dizzy and soaked, then run off to get ready); part 2's counter digs them in
 * and the finish hauls the villain over the line into a giant splash.
 *
 * The word for this contest's own move is never shown: it is the ROPE PULL.
 */

import Phaser from 'phaser';

import type { AbilitySpec } from '../../../content/battle/types';
import { sfxBoom, sfxShout, sfxWhoosh } from '../../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../../config';
import { burst, floatText, fxQuality, shake } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_LEFT, ARENA_RIGHT } from '../movement';
import { BaseStage, ease, type Pt } from './stage';

/** The centre line, and the pool of sea water either side of it. */
const MID = GAME_WIDTH / 2;
const POOL_HALF = 120;
/** How far the whole line of pullers slides with the lead, and the knot with it. */
const SHIFT = 70;
const KNOT_SWING = 200;
/** One heave of the rhythm, seconds. */
const HEAVE_PERIOD = 1.15;
const HERO_SIDE = 0x3ac0ff;
const VILLAIN_SIDE = 0xff4a6a;
const WATER = [0x7ad9ff, 0xffffff, 0x2a8ad4, 0x9ad8ff];
const ROPE_DARK = 0x5a3a1a;
const ROPE_MAIN = 0xc8964a;
const ROPE_LIGHT = 0xf0d090;

/** A beat that carries fighters somewhere in an arc, overriding their steering: the yank, the haul. */
interface Fling {
  at: number;
  ms: number;
  arc: number;
  /** `lift0`: where a flyer started in the air, so the arc does not snap it to the floor first. */
  moves: { f: Fighter; x0: number; x1: number; lift0: number }[];
}

export class TugStage extends BaseStage {
  override readonly anchored: boolean = true;

  /** The stage's own simulation clock, seconds. */
  private t = 0;
  /** Who is winning, -1 (villain) .. 1 (heroes), eased; `kick` is a beat's push that fades. */
  private lead = 0;
  private kick = 0;
  /** A beat's fixed lead (the ultimate, the counter, the finish) and how fast the knot runs to it. */
  private lock: number | null = null;
  private leadRate = 2.5;
  private heave = 0;
  /** Extra heave strength for a moment after a super or the combo. */
  private boost = 0;
  /** How high the villain's coils rise (1 normal; the ultimate surges them). */
  private surge = 1;
  private surgeTo = 1;
  /** 1 while the villain pulls; sinks to 0 once it has turned good. */
  private coilsUp = 1;
  /** Stumbles towards the line from hits, per fighter, fading. */
  private stumble = new Map<number, number>();
  /** Smoothed rope grips per fighter, so a dash stretches the rope instead of snapping it. */
  private grips = new Map<number, Pt>();
  private fling: Fling | null = null;
  /** The rope appears, snapping taut, once the pullers have reached their places. */
  private ropeOn = 0;
  private slackAt = -1;
  private slackPts: Pt[] = [];
  private splashedRope = false;
  private pts: Pt[] = [];
  private knot: Pt = { x: MID, y: 470 };

  private floorG!: Phaser.GameObjects.Graphics;
  private lineG!: Phaser.GameObjects.Graphics;
  private coilG!: Phaser.GameObjects.Graphics;
  private ropeG!: Phaser.GameObjects.Graphics;
  private knotGlow!: Phaser.GameObjects.Image;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  override setup(): void {
    const s = this.scene;
    // The pool under the darkening (an eclipse dims it), the line over it (it glows on).
    this.floorG = s.add.graphics().setDepth(FLOOR_TOP - 6);
    this.lineG = s.add.graphics().setDepth(FLOOR_TOP - 4).setBlendMode(Phaser.BlendModes.ADD);
    this.coilG = s.add.graphics();
    this.ropeG = s.add.graphics().setDepth(10_000);
    this.knotGlow = s.add.image(MID, 470, TEX.glow).setTint(0xff3a5a).setBlendMode(Phaser.BlendModes.ADD).setDepth(10_000).setAlpha(0);
    this.sparks = s.add
      .particles(0, 0, TEX.spark, {
        speed: { min: 60, max: 220 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 300, max: 600 },
        gravityY: 200,
        tint: [0xffd23f, 0xffffff, 0x7ad9ff, 0xff9ad5],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    // The pool's own spray, for the whole fight (the scene's shutdown takes it).
    s.add
      .particles(0, 0, TEX.spark, {
        speedY: { min: -90, max: -30 },
        speedX: { min: -20, max: 20 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 900,
        frequency: 110,
        tint: WATER,
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(MID - POOL_HALF, FLOOR_TOP + 15, POOL_HALF * 2, FLOOR_BOTTOM - FLOOR_TOP - 20) } as never,
      })
      .setDepth(FLOOR_TOP - 3.9);
  }

  /** Where each puller stands with the lead at nought: the heroes in a line, the villain at its end. */
  private slot(f: Fighter, i: number): Pt {
    if (f.team === 'villain') {
      // A giant stands so all of her stays on screen as the lead swings her about.
      const x = Math.min(965, ARENA_RIGHT - f.height * 0.45 - SHIFT);
      return { x, y: 565 };
    }
    return { x: 430 - i * 135, y: 548 + i * 42 };
  }

  /** Which place on the rope `f` has: its index in the line, or null for minions, clones and cameos. */
  private placeOf(f: Fighter): number | null {
    if (f === this.host.villain) return 0;
    const i = this.host.heroes.indexOf(f);
    return i >= 0 ? i : null;
  }

  override home(f: Fighter, i: number): Pt {
    return this.slot(f, i);
  }

  override holds(f: Fighter): boolean {
    return this.placeOf(f) !== null;
  }

  override steer(f: Fighter, dt: number): boolean {
    const i = this.placeOf(f);
    if (i === null) return false;
    // Her hero is hers to walk during a move choice; she eases back on afterwards.
    if (this.host.choosing && f === this.host.heroes[0]) return false;
    // The intro's run-in tweens them there; the floored lie where they fell.
    if (f.floored || this.host.phase === 'intro') return true;
    // The rest hold where the choice found them: the pads were placed off them there, and on the slowed clock an
    // end still easing to its place slid on under a sign (hunt 11: the serpent's coils under PIG).
    if (this.host.choosing) {
      f.vx = 0;
      f.vy = 0;
      return true;
    }
    const home = this.slot(f, i);
    const villain = f.team === 'villain';
    // Each side rocks back on its own beat: the heroes on the heave, the villain on the off-beat.
    const pull = Math.max(0, Math.sin(this.heave + (villain ? Math.PI : 0)));
    const rock = (villain ? 1 : -1) * pull * (10 + this.boost * 16);
    // Her stick sways her a little on her end of the rope.
    const n = this.nudge(f);
    const tx = Phaser.Math.Clamp(home.x - this.lead * SHIFT + (this.stumble.get(f.uid) ?? 0) + rock + n.x, ARENA_LEFT, ARENA_RIGHT);
    const k = ease(5, dt);
    f.x += (tx - f.x) * k;
    f.y += (home.y + n.y - f.y) * k;
    f.vx = 0;
    f.vy = 0;
    // Flyers and hoverers pull from the air, bobbing.
    const air = f.init.style === 'fly' ? 70 : f.init.style === 'hover' ? 35 : 0;
    f.lift += (air + (air ? Math.sin(this.t * 2 + f.uid) * 10 : 0) - f.lift) * k;
    // Lean is a stretch on the card: it strains harder on each heave.
    f.lean = 0.1 + pull * (0.1 + this.boost * 0.1);
    return true;
  }

  override update(dt: number): void {
    const { heroes, villain } = this.host;
    this.t += dt;
    this.boost = Math.max(0, this.boost - dt * 0.8);
    // The heave rhythm: a squash and a shimmer of sparks on every beat, the villain on the off-beat.
    const turn = Math.PI * 2;
    const before = Math.floor(this.heave / turn);
    const beforeOff = Math.floor((this.heave + Math.PI) / turn);
    this.heave += (dt * turn) / HEAVE_PERIOD;
    const pulling = this.ropeOn > 0.9 && this.slackAt < 0;
    if (Math.floor(this.heave / turn) !== before && pulling) {
      for (const f of this.host.team()) if (!f.floored && (!this.host.choosing || f !== heroes[0])) f.squash(0.1 + this.boost * 0.12);
      this.sparkleRope(Math.round(4 + this.boost * 8));
    }
    if (Math.floor((this.heave + Math.PI) / turn) !== beforeOff && pulling && villain.canAct(villain.now)) villain.squash(0.08);
    // The lead: the steered health, a beat's fading push, or a beat's fixed swing.
    this.kick += (0 - this.kick) * ease(0.4, dt);
    const base = Phaser.Math.Clamp((this.host.heroFrac() - this.host.villainFrac()) * 1.5, -0.7, 0.7);
    const want = this.lock ?? Phaser.Math.Clamp(base + this.kick, -1, 1);
    this.lead += (want - this.lead) * ease(this.lock === null ? 2.5 : this.leadRate, dt);
    for (const [uid, s] of this.stumble) this.stumble.set(uid, s * Math.exp(-2.5 * dt));
    // While the ultimate charges (before a beat takes over) the coils already swell with it.
    const surgeWant = this.lock === null && this.host.phase === 'ultimate' ? 1.5 : this.surgeTo;
    this.surge += (surgeWant - this.surge) * ease(4, dt);
    // Beaten and turned good, its coils sink back into the sea instead of vanishing.
    this.coilsUp = villain.active ? 1 : Math.max(0, this.coilsUp - dt * 2.5);
    this.flingStep();

    // The rope appears once the front hero and the villain are in place.
    const h0 = heroes[0];
    if (this.ropeOn === 0 && h0 && villain.active && Math.abs(h0.x - this.slot(h0, 0).x) < 120 && Math.abs(villain.x - this.slot(villain, 0).x) < 150) {
      this.ropeOn = 0.01;
      sfxWhoosh();
      this.host.after(120, () => this.sparkleRope(20));
    }
    if (this.ropeOn > 0) this.ropeOn = Math.min(1, this.ropeOn + dt * 3);
    // Beaten and turned good, the villain lets go of its end: the rope drops as on a retreat.
    if (!villain.active && this.ropeOn > 0 && this.slackAt < 0) this.dropRope();
    this.drawFloor();
    this.drawCoils();
    this.drawRope();
  }

  /** Move the fighters a beat is carrying (the yank, the haul), over their own steering. */
  private flingStep(): void {
    const fl = this.fling;
    if (!fl) return;
    const p = Phaser.Math.Clamp(((this.t - fl.at) * 1000) / fl.ms, 0, 1);
    for (const m of fl.moves) {
      if (!m.f.active || m.f.floored) continue;
      m.f.x = Phaser.Math.Linear(m.x0, m.x1, Phaser.Math.Easing.Quadratic.Out(p));
      m.f.lift = m.lift0 * (1 - p) + Math.sin(p * Math.PI) * fl.arc;
      m.f.lean = 0.25 * (1 - p);
      m.f.vx = 0;
    }
  }

  /** Where `f` holds the rope: a hand in front for the heroes, the mouth or coils for the villain. */
  private gripOf(f: Fighter): Pt {
    const villain = f.team === 'villain';
    const raw = villain
      ? { x: f.x - f.height * 0.28, y: f.y - f.lift - Math.min(f.height * 0.5, 130) }
      : { x: f.x + f.height * 0.2, y: f.y - f.lift - f.hop - f.height * 0.42 };
    // Off on a dash or her own walk, the rope stays near its place; a beat's fling
    // carries it all the way, and a floored puller keeps hold where it landed.
    // A stunned villain is not steered back to its place (knocked off it, it keeps hold where it is).
    if (!this.fling && !f.floored && !(villain && f.status?.kind === 'stun')) {
      const i = this.placeOf(f) ?? 0;
      const sx = this.slot(f, i).x - this.lead * SHIFT + (villain ? -f.height * 0.28 : f.height * 0.2);
      raw.x = Phaser.Math.Clamp(raw.x, sx - 140, sx + 140);
    }
    let g = this.grips.get(f.uid);
    if (!g) this.grips.set(f.uid, (g = { ...raw }));
    g.x += (raw.x - g.x) * 0.35;
    g.y += (raw.y - g.y) * 0.35;
    return g;
  }

  /** The rope: anchors left to right, sagging a little between them, trembling when taut. */
  private ropePoints(): Pt[] {
    const team = this.host.team().filter((f) => this.placeOf(f) !== null);
    const v = this.host.villain;
    if (!team.length || !v.active) return this.pts;
    const anchors = team.map((f) => this.gripOf(f)).sort((a, b) => a.x - b.x);
    const last = anchors[0]!;
    anchors.unshift({ x: last.x - 90, y: last.y + 40 });
    anchors.push(this.gripOf(v));
    const pts: Pt[] = [];
    const taut = this.lock === null ? 0.8 : 1;
    for (let a = 0; a < anchors.length - 1; a++) {
      const p = anchors[a]!;
      const q = anchors[a + 1]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      const sag = (a === 0 ? 18 : 5 + (1 - taut) * 20) * (len / 300);
      const n = Math.max(4, Math.round(len / 12));
      for (let k = a === 0 ? 0 : 1; k <= n; k++) {
        const u = k / n;
        const buzz = taut * 1.8 * Math.sin(this.t * 55 + (a * n + k) * 0.7) * Math.sin(u * Math.PI);
        pts.push({ x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u + Math.sin(u * Math.PI) * sag + buzz });
      }
    }
    return pts;
  }

  private drawRope(): void {
    const g = this.ropeG;
    g.clear();
    if (this.ropeOn <= 0) return;
    // Faded back while a move choice is open, as the other contests' gear (hunt 11: the rope and its knot ran
    // fully lit across the pads' upper row).
    let alpha = this.ropeOn * (this.host.choosing ? 0.35 : 1);
    let pts: Pt[];
    if (this.slackAt >= 0) {
      // Let go: the rope drops to the floor in a heap, a splash where it hits the pool, then fades.
      const p = Phaser.Math.Clamp((this.t - this.slackAt) / 0.45, 0, 1);
      const fall = Phaser.Math.Easing.Bounce.Out(p);
      pts = this.slackPts.map((q, k) => ({ x: q.x, y: Phaser.Math.Linear(q.y, 610 + Math.sin(k * 0.9) * 8, fall) }));
      if (p >= 1 && !this.splashedRope) {
        this.splashedRope = true;
        this.splash(MID, 600, 0.6);
      }
      alpha = 1 - Phaser.Math.Clamp((this.t - this.slackAt - 1) / 0.7, 0, 1);
    } else pts = this.pts = this.ropePoints();
    if (pts.length < 2 || alpha <= 0) {
      this.knotGlow.setAlpha(0);
      return;
    }
    g.lineStyle(15, ROPE_DARK, alpha).strokePoints(pts);
    g.lineStyle(10, ROPE_MAIN, alpha).strokePoints(pts);
    g.lineStyle(3, ROPE_LIGHT, alpha * 0.8).strokePoints(pts.map((q) => ({ x: q.x, y: q.y - 2.5 })));
    // The twisted strands: short diagonal ticks along the rope.
    g.lineStyle(2.5, 0x7a5228, alpha);
    for (let k = 1; k < pts.length - 1; k += 2) {
      const a = pts[k - 1]!;
      const b = pts[k + 1]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const tx = (b.x - a.x) / d;
      const ty = (b.y - a.y) / d;
      const q = pts[k]!;
      g.lineBetween(q.x - ty * 5 - tx * 3, q.y + tx * 5 - ty * 3, q.x + ty * 5 + tx * 3, q.y - tx * 5 + ty * 3);
    }
    // The knot rides on the rope at the lead's place, never past either end.
    const lo = pts[0]!.x + 40;
    const hi = pts[pts.length - 1]!.x - 30;
    const kx = lo < hi ? Phaser.Math.Clamp(MID - this.lead * KNOT_SWING, lo, hi) : (lo + hi) / 2;
    let near = pts[0]!;
    for (const q of pts) if (Math.abs(q.x - kx) < Math.abs(near.x - kx)) near = q;
    this.knot = { x: kx, y: near.y };
    this.drawBow(g, kx, near.y, 1, alpha);
    this.knotGlow.setPosition(kx, near.y).setAlpha(alpha * 0.8).setScale(0.9 + 0.15 * Math.sin(this.t * 6));
  }

  /** The red knot ribbon: two loops, a knot and two tails. */
  private drawBow(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number, alpha: number): void {
    g.fillStyle(0xe8203a, alpha);
    g.fillTriangle(x, y, x - 18 * s, y - 13 * s, x - 18 * s, y + 13 * s);
    g.fillTriangle(x, y, x + 18 * s, y - 13 * s, x + 18 * s, y + 13 * s);
    g.fillTriangle(x - 2 * s, y, x - 9 * s, y + 24 * s, x - 1 * s, y + 22 * s);
    g.fillTriangle(x + 2 * s, y, x + 9 * s, y + 24 * s, x + 1 * s, y + 22 * s);
    g.fillStyle(0xff5a6a, alpha).fillCircle(x, y, 7 * s);
    g.lineStyle(2, 0xffffff, alpha * 0.9).strokeCircle(x, y, 7 * s);
  }

  /** The pool of sea water with its ripples, and the glowing centre line through it. */
  private drawFloor(): void {
    const g = this.floorG;
    g.clear();
    const x0 = MID - POOL_HALF;
    const y0 = FLOOR_TOP + 10;
    const h = FLOOR_BOTTOM - y0 - 4;
    // Bright sea blue, opaque enough to read as water on any floor (on sand it read grey).
    g.fillStyle(0x0a78d8, 0.78).fillRoundedRect(x0, y0, POOL_HALF * 2, h, 26);
    g.fillStyle(0x3ac8ff, 0.5).fillRoundedRect(x0 + 14, y0 + 10, POOL_HALF * 2 - 28, h - 20, 20);
    // Foam along both edges, wobbling.
    g.lineStyle(4, 0xffffff, 0.7);
    for (const ex of [x0, x0 + POOL_HALF * 2]) {
      g.beginPath();
      for (let y = y0 + 6; y <= y0 + h - 6; y += 12) {
        const wx = ex + Math.sin(this.t * 4 + y * 0.08) * 5;
        if (y === y0 + 6) g.moveTo(wx, y);
        else g.lineTo(wx, y);
      }
      g.strokePath();
    }
    // Ripples spreading and fading on a loop.
    for (let r = 0; r < 6; r++) {
      const p = (this.t * 0.6 + r / 6) % 1;
      const rx = x0 + 30 + ((r * 97) % (POOL_HALF * 2 - 60));
      const ry = y0 + 25 + ((r * 61) % (h - 50));
      g.lineStyle(3, 0xffffff, 0.5 * (1 - p)).strokeEllipse(rx, ry, 20 + p * 70, 7 + p * 22);
    }
    const l = this.lineG;
    l.clear();
    const glow = 0.75 + 0.25 * Math.sin(this.t * 5);
    l.lineStyle(22, 0xffd23f, 0.22 * glow).lineBetween(MID, y0 - 4, MID, y0 + h + 2);
    l.lineStyle(10, 0xffd23f, 0.5 * glow).lineBetween(MID, y0 - 4, MID, y0 + h + 2);
    l.lineStyle(4, 0xffffff, 0.95).lineBetween(MID, y0 - 4, MID, y0 + h + 2);
  }

  /** The villain's whole body pulling: humps of its colours heaving out of the floor behind it. */
  private drawCoils(): void {
    const g = this.coilG;
    g.clear();
    const v = this.host.villain;
    if (this.coilsUp <= 0) return;
    const [main, accent] = v.init.palette;
    const s = Phaser.Math.Clamp(v.init.size / 1.4, 0.65, 1.5);
    g.setDepth(v.y - 4).setAlpha(this.coilsUp);
    const pull = Math.max(0, Math.sin(this.heave + Math.PI));
    for (let i = 0; i < 3; i++) {
      const hx = v.x + (70 + i * 82) * s;
      const by = v.y - 4 - i * 10 * s;
      const rw = 36 * s;
      const th = 26 * s;
      const hh = (50 + 16 * Math.sin(this.t * 2.4 + i * 1.3) + pull * 18) * s * this.surge * this.coilsUp;
      const outer: Pt[] = [];
      const inner: Pt[] = [];
      for (let k = 0; k <= 16; k++) {
        const a = Math.PI + (k / 16) * Math.PI;
        outer.push({ x: hx + Math.cos(a) * rw, y: by + Math.sin(a) * hh });
        inner.push({ x: hx + Math.cos(a) * (rw - th), y: by + Math.sin(a) * Math.max(4, hh - th) });
      }
      const shape = [...outer, ...inner.reverse()];
      g.fillStyle(main, 1).fillPoints(shape, true);
      g.lineStyle(4, accent, 1).strokePoints(shape, true);
      // Belly stripes across the hump.
      g.lineStyle(3, accent, 0.6);
      for (let k = 3; k <= 13; k += 3) g.lineBetween(outer[k]!.x, outer[k]!.y, inner[16 - k]!.x, inner[16 - k]!.y);
      // Foam where it breaks the floor.
      g.fillStyle(0xffffff, 0.75);
      for (const fx of [hx - rw + th / 2, hx + rw - th / 2]) g.fillEllipse(fx, by + 2, th * 1.6, 8 * s);
    }
  }

  override drawHud(g: Phaser.GameObjects.Graphics): boolean {
    // "PICK A MOVE!" has this band during a move choice: nothing drawn, no health bars either.
    if (this.host.choosing) return true;
    const x0 = 380;
    const w = 520;
    const y = 80;
    const mid = x0 + w / 2;
    const mx = mid - (this.lead * w) / 2;
    g.fillStyle(0x000000, 0.6).fillRoundedRect(x0 - 6, y - 6, w + 12, 32, 12);
    g.fillStyle(HERO_SIDE, 0.3).fillRect(x0, y, w / 2, 20);
    g.fillStyle(VILLAIN_SIDE, 0.3).fillRect(mid, y, w / 2, 20);
    // The winning side's colour grows from the middle towards its own end.
    const win = this.lead >= 0 ? HERO_SIDE : VILLAIN_SIDE;
    g.fillStyle(win, 1).fillRect(Math.min(mx, mid), y, Math.abs(mx - mid), 20);
    g.fillStyle(0xffffff, 0.35).fillRect(Math.min(mx, mid), y + 3, Math.abs(mx - mid), 5);
    g.fillStyle(0xffffff, 1).fillRect(mid - 2, y - 9, 4, 38);
    // End caps in each side's colour; the winner's glows bigger.
    g.fillStyle(HERO_SIDE, 1).fillCircle(x0 - 14, y + 10, 12 + Math.max(0, this.lead) * 5);
    g.fillStyle(VILLAIN_SIDE, 1).fillCircle(x0 + w + 14, y + 10, 12 + Math.max(0, -this.lead) * 5);
    this.drawBow(g, mx, y + 10 + Math.sin(this.t * 6) * 2, 1.1, 1);
    return true;
  }

  override onHit(target: Fighter, power: number): void {
    if (this.placeOf(target) === null || this.lock !== null) return;
    // A hit puller stumbles a little towards the line, and the knot gives a touch.
    const dir = target.team === 'villain' ? -1 : 1;
    this.stumble.set(target.uid, (this.stumble.get(target.uid) ?? 0) + dir * Math.min(50, power * 15));
    this.kick = Phaser.Math.Clamp(this.kick - dir * 0.03 * power, -0.6, 0.6);
  }

  override superMove(f: Fighter, _ab: AbilitySpec, _word: string): void {
    this.heaveAll(0.35);
    floatText(this.scene, f.cx, f.top - 30, 'HEAVE!', '#ffd23f', 52);
  }

  override combo(a: Fighter, b: Fighter): void {
    // A double heave, the two of them glowing together.
    const glow = (f: Fighter) => {
      const img = this.scene.add.image(f.cx, f.cy, TEX.glow).setTint(0xffd23f).setScale(f.height / 55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx - 1).setAlpha(0.9);
      this.scene.tweens.add({ targets: img, alpha: 0, scale: img.scale * 1.5, duration: 1100, onComplete: () => img.destroy() });
    };
    glow(a);
    glow(b);
    this.heaveAll(0.25);
    floatText(this.scene, (a.cx + b.cx) / 2, Math.min(a.top, b.top) - 30, 'HEAVE!', '#ffd23f', 50);
    this.later(450, () => {
      this.heaveAll(0.25);
      floatText(this.scene, (a.x + b.x) / 2, Math.min(a.y, b.y) - 220, 'HO!', '#7ad9ff', 56);
    });
  }

  /** One mighty heave: everybody squashes and strains, a sparkle wave runs down the rope, the knot jumps, the villain's feet splash. */
  private heaveAll(push: number): void {
    this.kick = Phaser.Math.Clamp(this.kick + push, -0.6, 0.8);
    this.boost = 1;
    for (const f of this.host.team()) if (!f.floored) f.squash(0.3);
    sfxShout(1.2);
    this.sparkleWave();
    const v = this.host.villain;
    if (v.active) {
      this.stumble.set(v.uid, (this.stumble.get(v.uid) ?? 0) - 40);
      this.splash(v.x, v.y, 0.5);
    }
  }

  override async ultimate1(v: Fighter, _ult: AbilitySpec): Promise<void> {
    // Its whole body heaves: the coils rise huge and the knot starts to slide its way.
    this.surgeTo = 1.8;
    this.lock = -0.6;
    this.leadRate = 2;
    v.squash(0.3);
    this.sparkleRope(16);
    await this.host.wait(0.55);
    // The gigantic yank: the knot races over and the heroes are dragged off their feet into the water.
    this.lock = -1;
    this.leadRate = 9;
    sfxWhoosh();
    shake(this.scene, 5, 400);
    this.sparkleWave(true);
    const team = this.host.team().filter((f) => !f.floored && this.placeOf(f) !== null);
    team.sort((a, b) => b.x - a.x);
    this.fling = { at: this.t, ms: 750, arc: 120, moves: team.map((f, i) => ({ f, x0: f.x, x1: MID - 45 - i * 55, lift0: f.lift })) };
    floatText(this.scene, MID, 300, 'YANK!', '#ff9ad5', 64);
    await this.host.wait(0.75);
    const xs = team.map((f) => f.x);
    const sx = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : MID - 60;
    const sy = team.length ? team.reduce((a, f) => a + f.y, 0) / team.length : 570;
    this.splash(sx, sy, 1.6);
    for (const f of team) this.splash(f.x, f.y, 0.6);
    this.host.focus(sx, sy - 60, 1.25, 100);
    sfxBoom(3);
    floatText(this.scene, sx, sy - 220, 'SPLOOSH!', '#7ad9ff', 70);
    await this.host.wait(0.9);
    this.fling = null;
    this.surgeTo = 1.2;
  }

  override async counter2(): Promise<void> {
    // The heroes dig in their heels...
    this.lock = Math.max(this.lead, 0);
    this.leadRate = 3;
    this.surgeTo = 0.8;
    for (const f of this.host.team()) {
      if (f.floored) continue;
      f.squash(0.35);
      burst(this.scene, f.x, f.y, { count: 22, speed: 220, colors: [0xd9c7a0, 0xffffff], gravity: 500, blend: false, scale: 1.3 });
    }
    const h = this.host.heroes[0];
    if (h?.active) floatText(this.scene, h.cx, h.top - 40, 'HOLD ON!', '#ffffff', 50);
    await this.host.wait(0.5);
    // ...and a mega heave drags the knot back their way.
    this.lock = 0.75;
    this.leadRate = 6;
    this.heaveAll(0);
    shake(this.scene, 4, 300);
    floatText(this.scene, MID, 280, 'SUPER HEAVE!', '#ffd23f', 64);
    await this.host.wait(0.8);
  }

  override async finish(v: Fighter): Promise<void> {
    // All together: the villain is hauled over the line, high in the air, into a giant splash.
    this.lock = 1;
    this.leadRate = 8;
    this.heaveAll(0);
    floatText(this.scene, 300, 320, 'PULL!', '#ffd23f', 70);
    await this.host.wait(0.25);
    sfxWhoosh();
    this.surgeTo = 0.3;
    // Over the line, but not onto the front hero's head (a giant's card is wide).
    const front = Math.max(...this.host.team().map((f) => f.x), ARENA_LEFT);
    const x1 = Math.min(MID - 30, Math.max(MID - 60 - v.height * 0.15, front + 40 + v.height * 0.4));
    this.fling = { at: this.t, ms: 800, arc: v.giant ? 60 : 150, moves: v.active ? [{ f: v, x0: v.x, x1, lift0: v.lift }] : [] };
    this.sparkleWave(true);
    await this.host.wait(0.8);
    this.fling = null;
    if (v.active) {
      v.lift = 0;
      this.splash(v.x, v.y, 2);
      floatText(this.scene, v.x, v.top - 40, 'SPLOOSH!', '#7ad9ff', 84);
    }
    sfxBoom(3);
    await this.host.wait(0.35);
  }

  override retreat(): void {
    // Let go! The rope goes slack and drops.
    this.dropRope();
    this.lock = -1;
  }

  private dropRope(): void {
    this.slackAt = this.t;
    this.slackPts = this.pts.map((p) => ({ ...p }));
  }

  /** A burst of sparkles at random points along the rope: tension. */
  private sparkleRope(n: number): void {
    if (this.pts.length < 2 || !this.sparks.active) return;
    const count = Math.max(1, Math.round(n * fxQuality.level));
    for (let k = 0; k < count; k++) {
      const p = this.pts[Math.floor(Math.random() * this.pts.length)]!;
      this.sparks.emitParticleAt(p.x, p.y, 2);
    }
  }

  /** A wave of sparkles running along the rope, from the heroes to the villain (or back on a yank). */
  private sparkleWave(back = false): void {
    const steps = 10;
    for (let k = 0; k <= steps; k++) {
      this.host.after(k * 40, () => {
        if (!this.sparks.active || this.pts.length < 2) return;
        const u = back ? 1 - k / steps : k / steps;
        const p = this.pts[Math.round(u * (this.pts.length - 1))]!;
        this.sparks.emitParticleAt(p.x, p.y, Math.max(2, Math.round(7 * fxQuality.level)));
      });
    }
  }

  /** A splash of sea water at (x, y): a fountain of drops, bubbles and a ring on the floor. */
  private splash(x: number, y: number, size: number): void {
    const s = this.scene;
    const q = fxQuality.level;
    const drops = s.add
      .particles(x, y, TEX.spark, {
        angle: { min: 238, max: 302 },
        speed: { min: 250 * size, max: 700 * Math.sqrt(size) + 150 },
        gravityY: 1200,
        scale: { start: 1.5 + size * 0.3, end: 0.3 },
        alpha: { start: 1, end: 0.2 },
        lifespan: { min: 600, max: 1100 },
        tint: WATER,
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    drops.explode(Math.max(8, Math.round(70 * size * q)));
    const bubbles = s.add
      .particles(x, y - 20, TEX.bubble, {
        angle: { min: 220, max: 320 },
        speed: { min: 120 * size, max: 380 * size },
        gravityY: 700,
        scale: { min: 0.15, max: 0.45 },
        alpha: { start: 0.9, end: 0 },
        lifespan: { min: 700, max: 1200 },
        emitting: false,
      })
      .setDepth(DEPTH.fx);
    bubbles.explode(Math.max(3, Math.round(16 * size * q)));
    const ring = s.add.image(x, y, TEX.ring).setTint(0xbfefff).setDepth(FLOOR_TOP - 3).setScale(0.2, 0.07).setBlendMode(Phaser.BlendModes.ADD);
    s.tweens.add({ targets: ring, scaleX: 2.2 * size, scaleY: 0.75 * size, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.host.after(1400, () => {
      drops.destroy();
      bubbles.destroy();
    });
  }

  override info(): Record<string, unknown> {
    return {
      knot: Math.round(this.knot.x),
      lead: Math.round(this.lead * 100) / 100,
      rope: this.ropeOn > 0 && this.slackAt < 0 ? 'taut' : this.slackAt >= 0 ? 'dropped' : 'none',
      surge: Math.round(this.surge * 100) / 100,
    };
  }
}
