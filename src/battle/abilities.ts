/**
 * Every ability kind, as one function each, parameterised by AbilitySpec.
 *
 * This is what makes the roster data: a new ability is a line in roster.ts
 * using one of these kinds with its own colours, counts, glyphs and statuses.
 * A new *kind* is one new function here.
 *
 * `mult` scales everything: 1 normal, ~1.3-1.8 for the fetched things and
 * runes, 2.4 for the supercharged pick, 2-2.6 for ultimates. Particles are deliberately
 * overdone, because the spectacle is the reward.
 */

import Phaser from 'phaser';

import type { AbilitySpec, MinionSpec, Status } from '../../content/battle/types';
import { MINIONS, abilityCallout } from '../../content/battle/roster';
import {
  sfxBoom,
  sfxFire,
  sfxFreeze,
  sfxGrow,
  sfxHeal,
  sfxLaser,
  sfxOink,
  sfxPew,
  sfxPoof,
  sfxShield,
  sfxShout,
  sfxStomp,
  sfxSummon,
  sfxWhoosh,
  sfxZap,
} from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { burst, dustPuff, flash, groundRing, shake, shockwave } from '../fx/juice';
import { TEX } from '../fx/textures';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter, type FighterInit, type Team } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT } from './movement';

export interface Projectile {
  obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform;
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  target: Fighter | null;
  homing: boolean;
  power: number;
  color: number;
  status?: { kind: Status; duration: number };
  life: number;
  from: Fighter;
  trail?: Phaser.GameObjects.Particles.ParticleEmitter;
  spinRate: number;
}

export interface Trap {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  x: number;
  y: number;
  team: Team;
  power: number;
  color: number;
  from: Fighter;
  armedAt: number;
}

export interface BattleWorld {
  stage: Phaser.Scene;
  now: number;
  enemiesOf(f: Fighter): Fighter[];
  alliesOf(f: Fighter): Fighter[];
  hit(target: Fighter, power: number, color: number, from: Fighter | null, status?: { kind: Status; duration: number }): void;
  addProjectile(p: Projectile): void;
  addTrap(t: Trap): void;
  spawn(init: FighterInit, x: number, y: number): Fighter;
  banner(text: string, color: number, big?: boolean): void;
  /** Hold the caster in place while an animation plays. */
  busy(f: Fighter, ms: number): void;
  /** Run after `ms` of simulation time (respects slow-mo/hit-stop). */
  after(ms: number, fn: () => void): void;
  darken(alpha: number, ms: number): void;
  /**
   * Is `f` held to its place by a contest (item 034)? A race's lane, a rope's
   * end, a clash's spot, a cooking station: its melee moves (slam, spin, dash,
   * teleport) then play where it stands and send their force across, instead
   * of carrying it over to the villain.
   */
  held(f: Fighter): boolean;
}

const MINION_CAP = 7;

/**
 * How far from `t`'s centre `f` lands beside it, at least `min`: their bodies
 * side by side, never one inside the other (item 034: Julia's stomp landed
 * inside a giant).
 */
function besideGap(f: Fighter, t: Fighter, min: number): number {
  return Math.max(min, f.bodyHalf + t.bodyHalf + 10);
}

/**
 * Where `f` lands beside `t` on side `dir` (-1 left, 1 right), `besideGap`
 * away; on the other side when that side has no room before the arena's edge
 * (a giant stands near the edge: landing past her put Julia inside her).
 */
function besideX(f: Fighter, t: Fighter, min: number, dir: number): number {
  const gap = besideGap(f, t, min);
  const x = t.x + dir * gap;
  return x - f.bodyHalf < ARENA_LEFT || x + f.bodyHalf > ARENA_RIGHT ? Phaser.Math.Clamp(t.x - dir * gap, ARENA_LEFT, ARENA_RIGHT) : x;
}

function nearestEnemy(w: BattleWorld, f: Fighter): Fighter | null {
  let best: Fighter | null = null;
  let bestD = Infinity;
  for (const e of w.enemiesOf(f)) {
    const d = Phaser.Math.Distance.Between(f.x, f.y, e.x, e.y);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function pickTargets(w: BattleWorld, f: Fighter, target: Fighter | null, n: number): Fighter[] {
  const enemies = w.enemiesOf(f);
  if (!enemies.length) return [];
  const out: Fighter[] = target && target.active ? [target] : [];
  const rest = Phaser.Utils.Array.Shuffle(enemies.filter((e) => e !== target));
  while (out.length < n && rest.length) out.push(rest.pop()!);
  while (out.length < n) out.push(enemies[Math.floor(Math.random() * enemies.length)]!);
  return out;
}

/** An `art` thing (Ellie's sword) `h` pixels tall, or null when the ability has none or it is not loaded. */
function artObj(w: BattleWorld, ab: AbilitySpec, x: number, y: number, h: number): Phaser.GameObjects.Image | null {
  if (!ab.art || !w.stage.textures.exists(ab.art)) return null;
  const img = w.stage.add.image(x, y, ab.art).setDepth(DEPTH.fx);
  // A built-in fx texture (fx_bubble) is white: the ability's colours tint it.
  if (ab.art.startsWith('fx_')) img.setTint(Math.random() < 0.5 ? ab.color : (ab.color2 ?? ab.color));
  return img.setScale(h / Math.max(1, img.height));
}

/** A projectile object: the ability's art, else an emoji glyph, else a glowing orb. */
function projectileObj(w: BattleWorld, ab: AbilitySpec, x: number, y: number, mult: number) {
  const s = w.stage;
  // Bubbles are giant ones.
  const art = artObj(w, ab, x, y, (ab.art === 'fx_bubble' ? 88 : 64) * Math.sqrt(mult));
  if (art) return art;
  if (ab.glyph) {
    return s.add
      .text(x, y, ab.glyph, { fontSize: `${Math.round(34 * Math.sqrt(mult))}px` })
      .setOrigin(0.5)
      .setDepth(DEPTH.fx);
  }
  const orb = s.add.image(x, y, TEX.glow).setTint(ab.color).setScale(0.45 * Math.sqrt(mult)).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx);
  return orb;
}

function trail(w: BattleWorld, color: number, mult: number) {
  return w.stage.add
    .particles(0, 0, TEX.spark, {
      speed: { min: 10, max: 60 },
      scale: { start: 0.9 * Math.sqrt(mult), end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 350,
      frequency: 16,
      tint: [color, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.fx - 1);
}

function fireBolt(w: BattleWorld, f: Fighter, ab: AbilitySpec, target: Fighter, mult: number, spread: number, delay: number): void {
  w.after(delay, () => {
    if (!f.active) return;
    const from = f.castFrom ?? { x: f.cx, y: f.cy };
    const angle = Phaser.Math.Angle.Between(from.x, from.y, target.cx, target.cy) + spread;
    const speed = 620 + Math.random() * 120;
    const obj = projectileObj(w, ab, from.x, from.y, mult);
    const t = trail(w, ab.color, mult);
    t.startFollow(obj);
    sfxPew();
    w.addProjectile({
      obj,
      x: from.x,
      y: from.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      team: f.team,
      target,
      homing: Boolean(ab.homing) || mult > 1.5,
      power: ab.power * mult * f.power,
      color: ab.color,
      ...(ab.status ? { status: { kind: ab.status, duration: ab.duration ?? 3 } } : {}),
      life: 2.2,
      from: f,
      trail: t,
      spinRate: ab.upright ? 0 : ab.art ? 16 : ab.glyph ? 8 : 0,
    });
  });
}

// -- the kinds -------------------------------------------------------------------

type Cast = (w: BattleWorld, f: Fighter, ab: AbilitySpec, target: Fighter, mult: number) => void;

const bolt: Cast = (w, f, ab, target, mult) => {
  const n = Math.round((ab.count ?? 1) * (mult > 1.5 ? 2 : 1));
  w.busy(f, 250);
  f.squash(0.2);
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.7;
    fireBolt(w, f, ab, pickTargets(w, f, target, 1)[0] ?? target, mult, spread, i * 70);
  }
};

const beam: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 800);
  sfxLaser();
  const g = s.add.graphics().setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
  const width = 18 * mult;
  let t = 0;
  const ev = s.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      t += 16;
      g.clear();
      if (!f.active || !target.active) return;
      const j = () => (Math.random() - 0.5) * 10 * mult;
      g.lineStyle(width * 1.8, ab.color, 0.35);
      g.lineBetween(f.cx, f.cy, target.cx + j(), target.cy + j());
      g.lineStyle(width, ab.color2 ?? ab.color, 0.9);
      g.lineBetween(f.cx, f.cy, target.cx + j(), target.cy + j());
      g.lineStyle(width * 0.35, 0xffffff, 1);
      g.lineBetween(f.cx, f.cy, target.cx, target.cy);
      if (t % 96 < 16) burst(s, target.cx, target.cy, { count: 8, speed: 260, colors: [ab.color, 0xffffff], life: 400 });
    },
  });
  w.after(150, () => target.active && w.hit(target, ab.power * mult * f.power * 0.5, ab.color, f));
  w.after(600, () => target.active && w.hit(target, ab.power * mult * f.power * 0.6, ab.color, f));
  w.after(750, () => {
    ev.remove();
    g.destroy();
  });
};

const cone: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 800);
  sfxFire();
  const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(f.cx, f.cy, target.cx, target.cy));
  const em = s.add
    .particles(f.cx, f.cy, TEX.smoke, {
      speed: { min: 450 * Math.sqrt(mult), max: 750 * Math.sqrt(mult) },
      angle: { min: angle - 16, max: angle + 16 },
      scale: { start: 0.3, end: 2.2 * Math.sqrt(mult) },
      alpha: { start: 0.9, end: 0 },
      lifespan: 650,
      frequency: 8,
      tint: [ab.color, ab.color2 ?? 0xffffff, ab.color],
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.fx);
  w.after(650, () => em.stop());
  w.after(1400, () => em.destroy());
  const hitAll = () => {
    for (const e of w.enemiesOf(f)) {
      const a = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(f.cx, f.cy, e.cx, e.cy));
      const d = Phaser.Math.Distance.Between(f.cx, f.cy, e.cx, e.cy);
      if (Math.abs(Phaser.Math.Angle.ShortestBetween(a, angle)) < 22 && d < 520 * Math.sqrt(mult)) w.hit(e, ab.power * mult * f.power * 0.5, ab.color, f);
    }
  };
  w.after(250, hitAll);
  w.after(550, hitAll);
};

const lightning: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  const n = Math.round((ab.count ?? 1) * (mult > 1.5 ? 2 : 1));
  w.busy(f, 400);
  f.squash(0.25);
  pickTargets(w, f, target, n).forEach((t, i) => {
    w.after(i * 110, () => {
      if (!t.active) return;
      const g = s.add.graphics().setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
      const pts: Phaser.Math.Vector2[] = [];
      let x = t.cx + (Math.random() - 0.5) * 120;
      for (let y = -20; y < t.cy; y += 40) {
        pts.push(new Phaser.Math.Vector2(x, y));
        x += (Math.random() - 0.5) * 60;
      }
      pts.push(new Phaser.Math.Vector2(t.cx, t.cy));
      g.lineStyle(16 * mult, ab.color, 0.4).strokePoints(pts);
      g.lineStyle(5 * mult, 0xffffff, 1).strokePoints(pts);
      s.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
      sfxZap();
      flash(s, ab.color, 60);
      burst(s, t.cx, t.cy, { count: 30, speed: 420, colors: [ab.color, 0xffffff] });
      w.hit(t, ab.power * mult * f.power, ab.color, f, ab.status ? { kind: ab.status, duration: ab.duration ?? 2 } : undefined);
    });
  });
};

const slam: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 900);
  if (ab.shout) sfxShout(f.init.size > 1.2 ? 0.7 : 1);
  const held = w.held(f);
  const leap = f.init.style !== 'stomp' && !held;
  const fromX = f.x;
  const toX = leap ? besideX(f, target, 90, f.team === 'hero' ? -1 : 1) : f.x;
  const toY = leap ? target.y : f.y;
  const fromY = f.y;
  let p = 0;
  const ev = s.time.addEvent({
    delay: 16,
    repeat: 30,
    callback: () => {
      p += 1 / 30;
      f.x = Phaser.Math.Linear(fromX, toX, p);
      f.y = Phaser.Math.Linear(fromY, toY, p);
      f.lift = Math.sin(p * Math.PI) * (leap ? 220 : 90);
    },
  });
  w.after(520, () => {
    ev.remove();
    f.lift = 0;
    f.squash(0.4);
    sfxStomp();
    sfxBoom(Math.min(3, ab.power * mult));
    shake(s, 4 * mult, 300);
    // On the floor: a ring in the move's colours and a puff of dust (item 034:
    // a white ring here read as a flat white disc).
    groundRing(s, f.x, f.y, ab.color, 220 * mult);
    groundRing(s, f.x, f.y, ab.color2 ?? ab.color, 130 * mult, 320);
    dustPuff(s, f.x, f.y, 130 * mult, [0xc8b89a, 0x8a7a5a, ab.color], 16);
    burst(s, f.x, f.y - 20, { count: 40, speed: 460, colors: [ab.color, ab.color2 ?? ab.color, 0xc8b89a], gravity: 700 });
    const status = ab.status ? { kind: ab.status, duration: ab.duration ?? 2 } : undefined;
    if (held) {
      // Held in a contest: the stomp's tremor runs along the floor to the target.
      const fx = f.x;
      const fy = f.y;
      for (let k = 1; k <= 4; k++) w.after(k * 70, () => dustPuff(s, Phaser.Math.Linear(fx, target.x, k / 5), Phaser.Math.Linear(fy, target.y, k / 5), 70 * mult, [0xc8b89a, ab.color], 8));
      w.after(350, () => {
        if (!target.active) return;
        groundRing(s, target.x, target.y, ab.color, 180 * mult);
        for (const e of w.enemiesOf(f)) {
          if (Phaser.Math.Distance.Between(target.x, target.y, e.x, e.y) < 230 * Math.sqrt(mult)) w.hit(e, ab.power * mult * f.power, ab.color, f, status);
        }
      });
      return;
    }
    for (const e of w.enemiesOf(f)) {
      if (Phaser.Math.Distance.Between(f.x, f.y, e.x, e.y) < 230 * Math.sqrt(mult) + e.bodyHalf) w.hit(e, ab.power * mult * f.power, ab.color, f, status);
    }
  });
};

const spin: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  const victims = pickTargets(w, f, target, Math.round((ab.count ?? 3) * (mult > 1.5 ? 1.5 : 1)));
  if (ab.shout) sfxShout();
  w.busy(f, victims.length * 280 + 200);
  // Held in a contest, it spins where it stands and the whirl flies across.
  const held = w.held(f);
  victims.forEach((v, i) => {
    w.after(i * 280, () => {
      if (!v.active || !f.active) return;
      sfxWhoosh();
      const fx = f.x;
      const fy = f.y;
      const tx = held ? fx : besideX(f, v, 40 * Math.random(), -(Math.sign(v.x - fx) || 1));
      const ty = held ? fy : v.y;
      if (held) shockwave(s, f.cx, f.cy, ab.color, 110, 300);
      let p = 0;
      const ev = s.time.addEvent({
        delay: 16,
        repeat: 14,
        callback: () => {
          p += 1 / 14;
          f.x = Phaser.Math.Linear(fx, tx, p);
          f.y = Phaser.Math.Linear(fy, ty, p);
          f.spin += 0.9;
          f.afterimage(ab.color);
        },
      });
      w.after(240, () => {
        ev.remove();
        burst(s, v.cx, v.cy, { count: 26, speed: 380, colors: [ab.color, ab.color2 ?? 0xffffff] });
        w.hit(v, ab.power * mult * f.power * 0.7, ab.color, f);
      });
    });
  });
};

const dash: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  if (ab.shout) sfxShout();
  const n = ab.count ?? 1;
  w.busy(f, n * 420 + 100);
  for (let i = 0; i < n; i++) {
    w.after(i * 420, () => {
      const t = i === 0 ? target : pickTargets(w, f, null, 1)[0];
      if (!t?.active || !f.active) return;
      sfxWhoosh();
      const fx = f.x;
      const fy = f.y;
      const dir = Math.sign(t.x - f.x) || 1;
      if (w.held(f)) {
        // Held in a contest: a lunge on the spot, and the charge's streak flies across.
        let q = 0;
        const lunge = s.time.addEvent({
          delay: 16,
          repeat: 16,
          callback: () => {
            q += 1 / 16;
            f.x = fx + dir * 40 * Math.sin(q * Math.PI);
            f.lean = dir * 0.45 * Math.sin(q * Math.PI);
            if (q > 0.2 && q < 0.6) f.afterimage(ab.color);
          },
        });
        fireBolt(w, f, ab, t, mult, 0, 90);
        w.after(300, () => {
          lunge.remove();
          f.x = fx;
          f.lean = 0;
        });
        return;
      }
      const tx = besideX(f, t, 120, dir);
      let p = 0;
      const ev = s.time.addEvent({
        delay: 16,
        repeat: 16,
        callback: () => {
          p += 1 / 16;
          f.x = Phaser.Math.Linear(fx, tx, p);
          f.y = Phaser.Math.Linear(fy, t.y, p);
          f.lean = dir * 0.45;
          if (p > 0.2) f.afterimage(ab.color);
        },
      });
      w.after(150, () => {
        burst(s, t.cx, t.cy, { count: 30, speed: 420, colors: [ab.color, 0xffffff] });
        shake(s, 2 * mult, 120);
        w.hit(t, ab.power * mult * f.power, ab.color, f);
        t.x = Phaser.Math.Clamp(t.x + dir * 50 * mult, ARENA_LEFT, ARENA_RIGHT);
      });
      w.after(300, () => ev.remove());
    });
  }
};

const summon: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  const spec: MinionSpec | undefined = MINIONS[ab.minion ?? ''];
  if (!spec) return;
  const existing = w.alliesOf(f).filter((a) => a.init.kind === 'minion').length;
  // A finisher or ultimate always gets its crowd, a little past the usual cap.
  const cap = mult >= 2 ? MINION_CAP + 6 : MINION_CAP;
  const n = Math.max(0, Math.min(Math.round((ab.count ?? 1) * (mult > 1.5 ? 1.5 : 1)), cap - existing));
  if (!n) return;
  w.busy(f, 600);
  sfxSummon();
  // A magic circle on the floor, then the minions pop out of it one by one.
  const cx = Phaser.Math.Clamp(f.x + (f.team === 'hero' ? 120 : -120), ARENA_LEFT, ARENA_RIGHT);
  // Drawn at its full size and scaled up from small, so its rim stays a thin
  // line in the move's colour (scaling a 10×4 ellipse up 26× made the white
  // rim a thick, flat white disc).
  const circle = s.add.ellipse(cx, f.y, 260, 72, ab.color, 0.35).setStrokeStyle(4, ab.color2 ?? ab.color, 0.9).setDepth(f.y - 1).setScale(0.04);
  s.tweens.add({ targets: circle, scale: 1, duration: 300, ease: 'Back.easeOut' });
  s.tweens.add({ targets: circle, alpha: 0, delay: 300 + n * 120, duration: 400, onComplete: () => circle.destroy() });
  for (let i = 0; i < n; i++) {
    w.after(250 + i * 120, () => {
      const x = cx + (Math.random() - 0.5) * 200;
      const y = Phaser.Math.Clamp(f.y + (Math.random() - 0.5) * 160, FLOOR_TOP, FLOOR_BOTTOM);
      const m = w.spawn({ id: spec.id, name: spec.name, art: `minion_${spec.id}`, team: f.team, style: spec.style, speed: spec.speed, size: spec.size, hp: spec.hp * mult, abilities: [spec.ability], ultimate: null, palette: spec.palette, kind: 'minion' }, x, y);
      m.root.setScale(0);
      s.tweens.add({ targets: m.root, scale: 1, duration: 300, ease: 'Back.easeOut' });
      burst(s, x, y - 40, { count: 24, speed: 260, colors: [ab.color, 0xffffff] });
    });
  }
};

const statusBolt = (kind: Status): Cast => (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 400);
  const victims = pickTargets(w, f, target, Math.round((ab.count ?? 1) * (mult > 1.5 ? 2 : 1)));
  victims.forEach((v, i) => {
    w.after(i * 90, () => {
      if (!v.active) return;
      const orb = s.add.image(f.cx, f.cy, TEX.glow).setTint(ab.color).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx);
      const t = trail(w, ab.color, mult);
      t.startFollow(orb);
      s.tweens.add({
        targets: orb,
        x: v.cx,
        y: v.cy,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => {
          orb.destroy();
          t.stop();
          s.time.delayedCall(400, () => t.destroy());
          if (!v.active) return;
          burst(s, v.cx, v.cy, { count: 40, speed: 360, colors: [ab.color, 0xffffff, ab.color2 ?? ab.color] });
          if (kind === 'pig') sfxOink();
          else if (kind === 'freeze') sfxFreeze();
          else sfxZap();
          w.hit(v, ab.power * mult * f.power * 0.4, ab.color, f, { kind, duration: (ab.duration ?? 3) * (mult > 1.5 ? 1.3 : 1) });
        },
      });
    });
  });
};

const teleport: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 500);
  f.afterimage(ab.color);
  sfxPoof();
  burst(s, f.cx, f.cy, { count: 30, speed: 260, colors: [ab.color, 0xffffff] });
  // Held in a contest, it pops out and back in on its own spot.
  const held = w.held(f);
  w.after(160, () => {
    if (!target.active) return;
    if (!held) {
      f.x = besideX(f, target, 100, Math.random() < 0.5 ? -1 : 1);
      f.y = target.y;
    }
    burst(s, f.cx, f.cy, { count: 30, speed: 260, colors: [ab.color, 0xffffff] });
    f.squash(0.35);
  });
  w.after(300, () => {
    if (!target.active) return;
    shockwave(s, target.cx, target.cy, ab.color, 120);
    w.hit(target, ab.power * mult * f.power, ab.color, f);
  });
};

const clones: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  // At most 6 clones of anybody at once (an ultimate may add a few more).
  const have = w.alliesOf(f).filter((a) => a.cloneOf === f).length;
  const n = Math.max(0, Math.min(Math.round((ab.count ?? 2) * (mult > 1.5 ? 1.5 : 1)), (mult >= 2 ? 10 : 6) - have));
  if (!n) return;
  w.busy(f, 500);
  sfxPoof();
  for (let i = 0; i < n; i++) {
    w.after(i * 90, () => {
      const a = (i / n) * Math.PI * 2;
      const x = Phaser.Math.Clamp(f.x + Math.cos(a) * 180, ARENA_LEFT, ARENA_RIGHT);
      const y = Phaser.Math.Clamp(f.y + Math.sin(a) * 90, FLOOR_TOP, FLOOR_BOTTOM);
      const c = w.spawn({ ...f.init, id: `${f.init.id}_clone`, kind: 'clone', hp: 10, size: f.init.size, abilities: f.init.abilities.filter((x) => x.kind === 'bolt').slice(0, 1), ultimate: null }, x, y);
      c.cloneOf = f;
      c.sprite.setAlpha(0.85);
      burst(s, x, y - 60, { count: 20, speed: 240, colors: [ab.color, 0xffffff] });
    });
  }
};

const trap: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  w.busy(f, 400);
  const n = Math.round((ab.count ?? 2) * (mult > 1.5 ? 1.5 : 1));
  for (let i = 0; i < n; i++) {
    const near = pickTargets(w, f, target, 1)[0] ?? target;
    const x = Phaser.Math.Clamp(near.x + (Math.random() - 0.5) * 260, ARENA_LEFT, ARENA_RIGHT);
    const y = Phaser.Math.Clamp(near.y + (Math.random() - 0.5) * 120, FLOOR_TOP, FLOOR_BOTTOM);
    // A trap is the ability's own glyph if it has one (hot coals, quicksand), else a card.
    const card = ab.glyph
      ? s.add.text(f.cx, f.cy, ab.glyph, { fontSize: '44px' }).setOrigin(0.5).setDepth(DEPTH.fx)
      : s.add.image(f.cx, f.cy, 'prop_card_trap').setDisplaySize(60, 60).setDepth(DEPTH.fx);
    s.tweens.add({ targets: card, x, y, angle: 720, duration: 450, ease: 'Quad.easeOut' });
    s.tweens.add({ targets: card, alpha: 0.6, duration: 400, delay: 500, yoyo: true, repeat: -1 });
    w.addTrap({ obj: card, x, y, team: f.team, power: ab.power * mult * f.power, color: ab.color, from: f, armedAt: w.now + 500 });
  }
};

const rain: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  const n = Math.round((ab.count ?? 10) * Math.min(2, mult));
  w.busy(f, 600);
  const enemies = w.enemiesOf(f);
  const xs = enemies.map((e) => e.x);
  const minX = xs.length ? Math.max(ARENA_LEFT, Math.min(...xs) - 200) : ARENA_LEFT;
  const maxX = xs.length ? Math.min(ARENA_RIGHT, Math.max(...xs) + 200) : ARENA_RIGHT;
  for (let i = 0; i < n; i++) {
    w.after(i * (1200 / n) + Math.random() * 80, () => {
      // Aim a third of them straight at somebody, the rest anywhere near.
      const aimed = i % 3 === 0 ? enemies[Math.floor(Math.random() * enemies.length)] : null;
      const x = aimed ? aimed.x + (Math.random() - 0.5) * 40 : Phaser.Math.Between(minX, maxX);
      const y = aimed ? aimed.y : Phaser.Math.Between(FLOOR_TOP, FLOOR_BOTTOM);
      const size = Math.round((ab.glyph ? 40 : 30) * Math.sqrt(mult) * (0.8 + Math.random() * 0.5));
      // Art (a sword) falls point first, tilted along its path, instead of tumbling;
      // a picture (an upright cat) just drops, the right way up.
      const art = artObj(w, ab, x - 120, -60, size * 2.2);
      const artAngle = ab.upright ? 0 : 180 - 13;
      const obj = art
        ? art.setAngle(artAngle)
        : ab.glyph
          ? s.add.text(x - 120, -60, ab.glyph, { fontSize: `${size}px` }).setOrigin(0.5)
          : s.add.image(x - 120, -60, TEX.glow).setTint(ab.color).setScale(size / 64).setBlendMode(Phaser.BlendModes.ADD);
      obj.setDepth(DEPTH.fx);
      if (art) {
        const glint = trail(w, ab.color, mult);
        glint.startFollow(art);
        w.after(520, () => glint.stop());
        w.after(1000, () => glint.destroy());
      }
      s.tweens.add({
        targets: obj,
        x,
        y: y - 20,
        angle: art ? artAngle : 360,
        duration: 520,
        ease: 'Quad.easeIn',
        onComplete: () => {
          obj.destroy();
          burst(s, x, y - 20, { count: 14, speed: 260, colors: [ab.color, ab.color2 ?? 0xffffff], gravity: 600 });
          if (i % 4 === 0) {
            sfxBoom(1);
            shake(s, 1.5 * mult, 90);
          }
          for (const e of w.enemiesOf(f)) {
            if (Math.abs(e.x - x) < 70 && Math.abs(e.y - y) < 60) w.hit(e, ab.power * mult * f.power * 0.35, ab.color, f);
          }
        },
      });
    });
  }
};

const shield: Cast = (w, f, ab, _target, mult) => {
  w.busy(f, 300);
  sfxShield();
  for (const a of [f, ...w.alliesOf(f).filter((x) => x.isMain || x.init.kind === 'helper')]) {
    a.setShield((ab.duration ?? 4) * Math.min(1.5, mult), ab.color, w.now);
    burst(w.stage, a.cx, a.cy, { count: 20, speed: 200, colors: [ab.color, 0xffffff] });
  }
};

const heal: Cast = (w, f, ab, _target, mult) => {
  w.busy(f, 400);
  sfxHeal();
  for (const a of [f, ...w.alliesOf(f)]) {
    a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.15 * mult);
    const em = w.stage.add
      .particles(a.cx, a.cy + 40, TEX.star, {
        speedY: { min: -220, max: -80 },
        speedX: { min: -40, max: 40 },
        scale: { start: 0.8, end: 0 },
        lifespan: 800,
        quantity: 2,
        frequency: 40,
        duration: 500,
        tint: [ab.color, 0xffffff, 0xff9ad5],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx);
    w.after(1400, () => em.destroy());
  }
};

const grow: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  w.busy(f, 700);
  sfxGrow();
  flash(s, ab.color, 120);
  f.growUntil = w.now + (ab.duration ?? 5) * 1000 * Math.min(1.5, mult);
  shockwave(s, f.x, f.y, ab.color, 260);
  burst(s, f.cx, f.cy, { count: 60, speed: 500, colors: [ab.color, 0xffffff] });
  w.after(400, () => shake(s, 5, 400));
};

const coil: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  const enemies = w.enemiesOf(f);
  if (!enemies.length) return;
  w.busy(f, 1500);
  const cx = enemies.reduce((n, e) => n + e.x, 0) / enemies.length;
  const cy = enemies.reduce((n, e) => n + e.cy, 0) / enemies.length;
  const segs: Phaser.GameObjects.Arc[] = [];
  const N = 26;
  for (let i = 0; i < N; i++) segs.push(s.add.circle(cx, cy, 26 * Math.sqrt(mult), i % 2 ? f.init.palette[0] : f.init.palette[1]).setStrokeStyle(3, 0x000000, 0.4).setDepth(DEPTH.fx));
  let r = 420;
  const dur = (ab.duration ?? 3) * 1000;
  let t = 0;
  const ev = s.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      t += 16;
      r = Phaser.Math.Linear(420, 140, Math.min(1, t / (dur * 0.6)));
      segs.forEach((seg, i) => {
        const a = (i / N) * Math.PI * 2 + t / 300;
        seg.setPosition(cx + Math.cos(a) * r * 1.3, cy + Math.sin(a) * r * 0.55);
      });
    },
  });
  for (let k = 1; k <= 4; k++) {
    w.after((dur / 4) * k, () => {
      shake(s, 2, 100);
      for (const e of w.enemiesOf(f)) w.hit(e, ab.power * mult * f.power * 0.3, ab.color, f);
    });
  }
  w.after(dur, () => {
    ev.remove();
    for (const seg of segs) s.tweens.add({ targets: seg, alpha: 0, scale: 2, duration: 300, onComplete: () => seg.destroy() });
  });
};

const eclipse: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  w.busy(f, 2200);
  const sun = s.add.image(GAME_WIDTH * 0.75, 120, 'prop_sun').setDisplaySize(170, 170).setDepth(DEPTH.fx - 2);
  const mouth = s.add.circle(GAME_WIDTH + 200, 120, 120, f.init.palette[0]).setStrokeStyle(8, ab.color2 ?? 0xa0ff3a).setDepth(DEPTH.fx - 1);
  s.tweens.add({ targets: mouth, x: sun.x, duration: 900, ease: 'Quad.easeIn' });
  w.after(900, () => {
    sfxBoom(3);
    sun.destroy();
    w.darken(0.72 * Math.min(1, mult / 2), 600);
    s.tweens.add({ targets: mouth, scale: 1.4, alpha: 0, duration: 600, onComplete: () => mouth.destroy() });
  });
  w.after(1500, () => {
    for (const e of w.enemiesOf(f)) {
      burst(s, e.cx, e.cy, { count: 30, speed: 300, colors: [0x5a2a8a, 0xa0ff3a] });
      w.hit(e, ab.power * mult * f.power, ab.color, f);
    }
  });
};

const wave: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  w.busy(f, 1200);
  sfxBoom(2);
  const dir = f.team === 'hero' ? 1 : -1;
  const startX = dir > 0 ? -150 : GAME_WIDTH + 150;
  const wall = s.add.rectangle(startX, (FLOOR_TOP + GAME_HEIGHT) / 2 - 60, 160 * Math.sqrt(mult), GAME_HEIGHT * 0.7, ab.color, 0.55).setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
  const em = s.add
    .particles(0, 0, TEX.smoke, {
      speed: { min: 50, max: 250 },
      scale: { start: 1.2, end: 2.6 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 700,
      frequency: 10,
      tint: [ab.color, ab.color2 ?? 0xffffff],
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-60, -GAME_HEIGHT * 0.35, 120, GAME_HEIGHT * 0.7) } as never,
      blendMode: Phaser.BlendModes.ADD,
    })
    .setDepth(DEPTH.fx);
  em.startFollow(wall);
  const hitDone = new Set<number>();
  s.tweens.add({
    targets: wall,
    x: GAME_WIDTH / 2 + dir * (GAME_WIDTH / 2 + 200),
    duration: 1300,
    ease: 'Sine.easeIn',
    onUpdate: () => {
      for (const e of w.enemiesOf(f)) {
        if (!hitDone.has(e.uid) && Math.abs(e.x - wall.x) < 90) {
          hitDone.add(e.uid);
          w.hit(e, ab.power * mult * f.power, ab.color, f, ab.status ? { kind: ab.status, duration: ab.duration ?? 2 } : undefined);
          e.x = Phaser.Math.Clamp(e.x + dir * 90, ARENA_LEFT, ARENA_RIGHT);
        }
      }
    },
    onComplete: () => {
      em.stop();
      wall.destroy();
      s.time.delayedCall(800, () => em.destroy());
    },
  });
  shake(s, 3 * mult, 1200);
};

const grid: Cast = (w, f, ab, _target, mult) => {
  const s = w.stage;
  w.busy(f, 1600);
  const g = s.add.graphics().setDepth(DEPTH.fx).setBlendMode(Phaser.BlendModes.ADD);
  const lines: [number, number, number, number][] = [];
  for (let x = 120; x < GAME_WIDTH; x += 150) lines.push([x, FLOOR_TOP - 250, x + (Math.random() - 0.5) * 100, GAME_HEIGHT]);
  for (let y = FLOOR_TOP - 120; y < GAME_HEIGHT; y += 70) lines.push([0, y, GAME_WIDTH, y + (Math.random() - 0.5) * 40]);
  // Aim: thin flickering lines first, then they fire fat.
  let t = 0;
  const ev = s.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      t += 16;
      g.clear();
      const firing = t > 700;
      for (const [x1, y1, x2, y2] of lines) {
        if (firing) {
          g.lineStyle(14 * mult, ab.color, 0.45).lineBetween(x1, y1, x2, y2);
          g.lineStyle(4, 0xffffff, 1).lineBetween(x1, y1, x2, y2);
        } else if (Math.random() < 0.7) g.lineStyle(2, ab.color, 0.8).lineBetween(x1, y1, x2, y2);
      }
    },
  });
  w.after(700, () => {
    sfxLaser();
    sfxZap();
    flash(s, ab.color, 120);
    shake(s, 3 * mult, 400);
    for (const e of w.enemiesOf(f)) {
      burst(s, e.cx, e.cy, { count: 24, speed: 300, colors: [ab.color, 0xffffff] });
      w.hit(e, ab.power * mult * f.power, ab.color, f);
    }
  });
  w.after(1300, () => {
    ev.remove();
    g.destroy();
  });
};

/**
 * Ellie's swords (or bubbles): `count` of them pop out around the caster and circle her for
 * `duration` seconds (a flat ellipse, the back half behind her), cutting
 * whatever they pass. Then the whole ring is flung at the enemy, spinning, as homing projectiles.
 */
const orbit: Cast = (w, f, ab, target, mult) => {
  const s = w.stage;
  const n = Math.round((ab.count ?? 4) * (mult > 1.5 ? 1.5 : 1));
  const hold = (ab.duration ?? 1.4) * 1000 * Math.min(1.5, mult);
  const radius = (f.height * 0.4 + 30 + n * 9) * Math.sqrt(Math.min(2, mult));
  const swordH = 58 * Math.sqrt(Math.min(2.2, mult));
  w.busy(f, 300);
  f.squash(0.2);
  sfxSummon();
  if (ab.shout) sfxShout();
  const swords = Array.from({ length: n }, () => artObj(w, ab, f.cx, f.cy, swordH) ?? projectileObj(w, ab, f.cx, f.cy, mult));
  const glints = swords.map((sw) => {
    const g = trail(w, ab.color, mult * 0.7);
    g.startFollow(sw);
    return g;
  });
  for (const sw of swords) {
    const sc = sw.scale;
    sw.setScale(0);
    s.tweens.add({ targets: sw, scale: sc, duration: 260, ease: 'Back.easeOut' });
  }
  burst(s, f.cx, f.cy, { count: 30, speed: 260, colors: [ab.color, 0xffffff, ab.color2 ?? 0xcfd8e6] });
  const lastHit = new Map<Fighter, number>();
  let t = 0;
  let a0 = Math.random() * Math.PI * 2;
  const place = () => {
    swords.forEach((sw, i) => {
      const a = a0 + (i / n) * Math.PI * 2;
      sw.x = f.cx + Math.cos(a) * radius;
      sw.y = f.cy + Math.sin(a) * radius * 0.5;
      // Point outwards and lean with the spin (an upright bubble does not); the back half goes behind her.
      if (!ab.upright) sw.rotation = a + Math.PI / 2 + 0.5;
      const behind = Math.sin(a) < 0;
      sw.setDepth(behind ? f.y - 2 : DEPTH.fx);
      glints[i]?.setDepth(behind ? f.y - 3 : DEPTH.fx - 1);
    });
  };
  place();
  const ev = s.time.addEvent({
    delay: 16,
    loop: true,
    callback: () => {
      if (!f.active) {
        ev.remove();
        swords.forEach((sw) => sw.destroy());
        glints.forEach((g) => g.destroy());
        return;
      }
      t += 16;
      a0 += 0.016 * (6 + Math.min(4, t / 300));
      place();
      if (t % 160 < 16) sfxWhoosh();
      for (const e of w.enemiesOf(f)) {
        if (w.now - (lastHit.get(e) ?? -1000) < 300) continue;
        const near = swords.some((sw) => Math.abs(sw.x - e.cx) < e.height * 0.3 + 30 && Math.abs(sw.y - e.cy) < e.height * 0.45 + 20);
        if (!near) continue;
        lastHit.set(e, w.now);
        burst(s, e.cx, e.cy, { count: 10, speed: 240, colors: [ab.color, 0xffffff] });
        w.hit(e, ab.power * mult * f.power * 0.2, ab.color, f);
      }
    },
  });
  w.after(hold, () => {
    ev.remove();
    // The ring's sparkles fade out; each flung sword gets a trail of its own.
    glints.forEach((g) => g.stop());
    w.after(500, () => glints.forEach((g) => g.destroy()));
    if (!f.active) {
      swords.forEach((sw) => sw.destroy());
      return;
    }
    sfxWhoosh();
    sfxPew();
    const targets = pickTargets(w, f, target, n);
    swords.forEach((sw, i) => {
      const to = targets[i % Math.max(1, targets.length)];
      if (!to) {
        sw.destroy();
        return;
      }
      sw.setDepth(DEPTH.fx);
      // Off along the ring first, then the homing turns each one in.
      const out = Phaser.Math.Angle.Between(f.cx, f.cy, sw.x, sw.y) + Math.PI / 2;
      const speed = 700;
      const tr = trail(w, ab.color, mult);
      tr.startFollow(sw);
      w.addProjectile({
        obj: sw,
        x: sw.x,
        y: sw.y,
        vx: Math.cos(out) * speed * 0.6 + Math.sign(to.cx - sw.x) * speed * 0.5,
        vy: Math.sin(out) * speed * 0.6,
        team: f.team,
        target: to,
        homing: true,
        power: ab.power * mult * f.power * 0.45,
        color: ab.color,
        life: 2.4,
        from: f,
        trail: tr,
        spinRate: ab.upright ? 0 : 18,
      });
    });
  });
};

export const CASTS: Record<AbilitySpec['kind'], Cast> = {
  bolt,
  beam,
  cone,
  lightning,
  slam,
  spin,
  dash,
  summon,
  polymorph: (w, f, ab, t, m) => statusBolt(ab.status ?? 'pig')(w, f, ab, t, m),
  freeze: statusBolt('freeze'),
  teleport,
  clones,
  trap,
  rain,
  shield,
  heal,
  grow,
  coil,
  eclipse,
  wave,
  grid,
  orbit,
};

/** Fire an ability, with a name banner for big ones. */
export function cast(w: BattleWorld, f: Fighter, ab: AbilitySpec, target: Fighter | null, mult = 1, banner = false): void {
  const t = target && target.active ? target : nearestEnemy(w, f);
  if (!t && !['shield', 'heal', 'grow', 'summon', 'clones'].includes(ab.kind)) return;
  if (banner) w.banner(abilityCallout(ab).toUpperCase(), ab.color, mult > 1.5);
  CASTS[ab.kind](w, f, ab, t ?? f, mult);
}
