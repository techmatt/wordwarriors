/**
 * How each fighting style moves. One steering function per `MoveStyle`, all
 * driven by the battle's simulation clock, so slow-mo and hit-stop slow
 * movement too.
 *
 * Styles are deliberately exaggerated so every fighter reads differently from
 * across the room: casters hover at range and drift; warriors twirl straight
 * through the crowd; giants barely move and shake the screen with every step;
 * dodgers flick sideways leaving afterimages; serpents weave; tricksters blink;
 * dragons and carpets swoop in big arcs; minions march.
 */

import Phaser from 'phaser';

import type { MoveStyle } from '../../content/battle/types';
import { sfxStomp, sfxWhoosh } from '../audio/sfx';
import { burst, shake } from '../fx/juice';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from './Fighter';

export const ARENA_LEFT = 70;
export const ARENA_RIGHT = 1210;

export interface Steering {
  scene: Phaser.Scene;
  /** Simulation clock, ms. */
  now: number;
  dt: number;
  target: Fighter | null;
}

type Steer = (f: Fighter, s: Steering) => void;

function approach(f: Fighter, tx: number, ty: number, speed: number, dt: number, ease = 6): void {
  // Smoothed velocity towards a point: 1 - exp(-k·dt) is frame-rate independent.
  const dx = tx - f.x;
  const dy = ty - f.y;
  const d = Math.hypot(dx, dy) || 1;
  const want = Math.min(speed, d * 4);
  const k = 1 - Math.exp(-ease * dt);
  f.vx += ((dx / d) * want - f.vx) * k;
  f.vy += ((dy / d) * want - f.vy) * k;
}

function integrate(f: Fighter, dt: number): void {
  f.x = Phaser.Math.Clamp(f.x + f.vx * dt, ARENA_LEFT, ARENA_RIGHT);
  f.y = Phaser.Math.Clamp(f.y + f.vy * dt, FLOOR_TOP, FLOOR_BOTTOM);
  f.lean = Phaser.Math.Clamp(f.vx / 900, -0.25, 0.25);
}

/** Which side of the target to stand on: heroes keep left, villains right, roughly. */
function side(f: Fighter): number {
  return f.team === 'hero' ? -1 : 1;
}

const hover: Steer = (f, s) => {
  const t = s.target;
  const range = 320;
  const tx = t ? t.x + side(f) * range : f.x;
  const ty = (t ? t.y : f.y) + Math.sin(s.now / 900 + f.uid) * 70;
  approach(f, tx, ty, f.init.speed * 0.8, s.dt, 3);
  f.lift = 40 + Math.sin(s.now / 400 + f.uid) * 14;
  integrate(f, s.dt);
};

const twirl: Steer = (f, s) => {
  const t = s.target;
  if (!t) return;
  const m = f.mem;
  // Phase 0: line up; phase 1: charge through and past, spinning.
  if (!m.phase) {
    approach(f, t.x + side(f) * 260, t.y, f.init.speed, s.dt);
    if (s.now > (m.next ?? 0) && Math.abs(f.x - (t.x + side(f) * 260)) < 60) {
      m.phase = 1;
      m.dir = -side(f);
      m.until = s.now + 650;
      sfxWhoosh();
    }
  } else {
    f.vx = m.dir! * f.init.speed * 2.6;
    f.vy = (t.y - f.y) * 2;
    f.spin += s.dt * 30;
    if (Math.random() < 0.5) f.afterimage();
    if (s.now > m.until!) {
      m.phase = 0;
      m.next = s.now + 1200 + Math.random() * 1200;
    }
  }
  integrate(f, s.dt);
};

const stomp: Steer = (f, s) => {
  const t = s.target;
  const m = f.mem;
  if (s.now > (m.nextStep ?? 0)) {
    m.nextStep = s.now + 900;
    let tx = t ? t.x + side(f) * 240 : f.x;
    // A real giant (Tiamat, size 2+) holds her own half and lets the fight
    // come to her: she fills it already, and walking over would bury the heroes.
    if (f.init.size >= 2) tx = f.team === 'hero' ? Math.min(tx, 420) : Math.max(tx, 860);
    const dx = Phaser.Math.Clamp(tx - f.x, -50, 50);
    m.stepTo = f.x + dx;
    m.stepFrom = f.x;
    m.stepAt = s.now;
    if (Math.abs(dx) > 8) {
      f.squash(0.18);
      shake(s.scene, f.init.size * 2.2, 160);
      sfxStomp();
      burst(s.scene, f.x, f.y, { count: 10, speed: 160, colors: [0xc8b89a, 0x8a7a5a], gravity: 400, blend: false, scale: 1.4 });
    }
  }
  const p = Math.min(1, (s.now - (m.stepAt ?? 0)) / 300);
  if (m.stepTo !== undefined) f.x = Phaser.Math.Linear(m.stepFrom!, m.stepTo, p);
  f.vx = 0;
  f.vy = 0;
  f.lift = Math.sin(p * Math.PI) * 12;
};

const dodge: Steer = (f, s) => {
  const t = s.target;
  const m = f.mem;
  const tx = t ? t.x + side(f) * 240 : f.x;
  const ty = t ? t.y : f.y;
  if (s.now > (m.nextDodge ?? 0)) {
    m.nextDodge = s.now + 900 + Math.random() * 900;
    m.dodgeUntil = s.now + 160;
    const a = Math.random() * Math.PI * 2;
    m.dx = Math.cos(a) * 1100;
    m.dy = Math.sin(a) * 600;
    sfxWhoosh();
  }
  if (s.now < (m.dodgeUntil ?? 0)) {
    f.vx = m.dx!;
    f.vy = m.dy!;
    f.afterimage();
  } else approach(f, tx, ty, f.init.speed, s.dt);
  integrate(f, s.dt);
};

const slither: Steer = (f, s) => {
  const t = s.target;
  const cx = t ? t.x + side(f) * 220 : 640;
  const cy = t ? t.y : 550;
  const tt = s.now / 1000 + f.uid;
  approach(f, cx + Math.sin(tt * 1.3) * 160, cy + Math.sin(tt * 2.6) * 90, f.init.speed * 1.3, s.dt, 4);
  f.spin = Math.sin(tt * 2.6) * 0.18;
  integrate(f, s.dt);
};

const blink: Steer = (f, s) => {
  const t = s.target;
  const m = f.mem;
  if (s.now > (m.nextBlink ?? s.now + 1)) {
    m.nextBlink = s.now + 1800 + Math.random() * 1600;
    f.afterimage(0xffffff);
    burst(s.scene, f.cx, f.cy, { count: 18, speed: 220, colors: [f.init.palette[1], 0xffffff] });
    const tx = t ? t.x + side(f) * (180 + Math.random() * 200) : 640;
    const ty = Phaser.Math.Clamp((t ? t.y : 550) + (Math.random() - 0.5) * 200, FLOOR_TOP, FLOOR_BOTTOM);
    f.x = Phaser.Math.Clamp(tx, ARENA_LEFT, ARENA_RIGHT);
    f.y = ty;
    burst(s.scene, f.cx, f.cy, { count: 18, speed: 220, colors: [f.init.palette[1], 0xffffff] });
    f.squash(0.3);
  }
  m.nextBlink ??= s.now + 1500;
  approach(f, f.x, f.y, 0, s.dt);
  integrate(f, s.dt);
};

const fly: Steer = (f, s) => {
  const t = s.target;
  const tt = s.now / 1000 + f.uid * 1.7;
  const cx = t ? t.x + side(f) * 280 : 640;
  const tx = cx + Math.cos(tt * 0.9) * 220;
  const ty = (t ? t.y : 550) + Math.sin(tt * 1.8) * 70;
  approach(f, tx, ty, f.init.speed * 1.4, s.dt, 3);
  f.lift = 110 + Math.sin(tt * 1.8) * 60;
  integrate(f, s.dt);
  f.lean = Phaser.Math.Clamp(f.vx / 500, -0.4, 0.4);
};

const march: Steer = (f, s) => {
  const t = s.target;
  if (t) {
    const d = Phaser.Math.Distance.Between(f.x, f.y, t.x, t.y);
    if (d > 80) approach(f, t.x + side(f) * 60, t.y, f.init.speed, s.dt);
    else approach(f, f.x, f.y, 0, s.dt);
  }
  integrate(f, s.dt);
  // A little waddle.
  f.lean = Math.sin(s.now / 120 + f.uid) * 0.12;
};

export const STEER: Record<MoveStyle, Steer> = { hover, twirl, stomp, dodge, slither, blink, fly, march };
