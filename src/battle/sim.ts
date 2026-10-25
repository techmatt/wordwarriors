/**
 * The battle's simulation (item 141, out of BattleScene): every fighter moves
 * in its own style (movement.ts) and uses its abilities on its own cooldowns
 * (abilities.ts), choosing targets as it goes; minions, clones, projectiles
 * and traps are all live. Taunts go through the voice arbiter as barks.
 *
 * `hit()` is the one damage path: shields, the director's health floors
 * (`floors`, so nobody important is knocked out by the simulation), knockback,
 * statuses. `separate()` keeps bodies apart before they are drawn. The scene
 * owns the clock (`now`), the phase and the director; it runs `stepFighters`,
 * then the stage, then `stepShots` and `taunt` every frame.
 */

import Phaser from 'phaser';

import { abilityCallout } from '../../content/battle/roster';
import type { Status } from '../../content/battle/types';
import { moveLine, tauntLine } from '../../content/voice/ids';
import { voiceBus } from '../voice/VoiceBus';
import { sfxBoom, sfxHit, sfxPoof } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, HEALTH_FLOORS, PART1_VILLAIN_FLOOR } from '../config';
import { unsayTaunt } from '../episode/lineVariants';
import { hex } from '../fx/colour';
import { burst, floatText, hitstop, shake, shockwave } from '../fx/juice';
import type { Controls } from '../input/Controls';
import { cast, type BattleWorld, type Projectile, type Trap } from './abilities';
import { Fighter, FLOOR_BOTTOM, FLOOR_TOP, type FighterInit } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT, integrate, STEER, STICK_AT_REST_SQ } from './movement';
import type { FightStage, Phase } from './stages/stage';

/** Cosmetic damage per point of ability power. Tuned so bars drift, not drop. */
const DAMAGE_PER_POWER = 2.6;
/** Two fighters closer than this in depth (px of floor) stand side by side, and their bodies must not overlap (item 034). */
const SAME_DEPTH = 70;
/** Hit words (BAM!, BLOCK!) float under the move pads' signs: a sign's word is never covered (item 034). */
const HIT_FLOAT = DEPTH.prompt - 20;
/**
 * A trap goes off on a fighter within this box of it (px either way), and `defuseNear` clears the
 * same box (hunt 11): she must never stand on a trap the defuse misses.
 */
const TRAP_REACH = { x: 55, y: 40 };

/** Is `f` standing on `t`? */
function onTrap(t: Trap, f: Fighter): boolean {
  return Math.abs(f.x - t.x) < TRAP_REACH.x && Math.abs(f.y - t.y) < TRAP_REACH.y;
}

/**
 * Where the brawl puts everybody (a contest's stage has its own places: `show.home`,
 * `show.anchored`, `show.steer`). `intro`: the run-in, the i-th hero at `x + i * dx`, the
 * villain at `villainX`. `fight`: the ground each side drifts back to while fighting, so it
 * stays framed heroes-left, villain-right: the i-th hero's at `heroX - i * heroDx` (each
 * their own, item 034), pulled at `heroPull` a second, the villain's at `villainX` at
 * `villainPull`. `ult`: the sides for the ultimate, the i-th hero at (`x + i * dx`,
 * `y + i * dy`), the villain on the right (a giant further out, on the front edge of the
 * floor).
 */
export const BRAWL = {
  intro: { x: 260, dx: 140, villainX: 960 },
  fight: { heroX: 430, heroDx: 160, heroPull: 0.8, villainX: 900, villainPull: 1.2 },
  ult: { x: 260, dx: 150, y: 500, dy: 70, villain: { x: 900, y: 560 }, giantX: 960 },
} as const;

/** Counts for the tests (hookState.battle): `itemsUsed` the fetched items used, `runesFired` Charge the Spell's runes (item 053), this part. */
export interface BattleStats {
  abilitiesFired: number;
  ultimates: number;
  combos: number;
  movePicks: number;
  itemsUsed: number;
  runesFired: number;
}

/** A battle's stats before anything has happened. */
export function noStats(): BattleStats {
  return { abilitiesFired: 0, ultimates: 0, combos: 0, movePicks: 0, itemsUsed: 0, runesFired: 0 };
}

/** What the simulation uses from the battle (BattleScene): the world abilities cast into, and the director's state. */
export interface SimHost extends BattleWorld {
  readonly part: 1 | 2;
  readonly phase: Phase;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  readonly show: FightStage;
  readonly controls: Controls;
  /** A move choice is open: her hero is hers to walk, and nothing touches her. */
  readonly choosing: boolean;
  readonly stats: BattleStats;
  /** Big moves called out this part: each once (item 087). */
  readonly calledOut: Set<string>;
  /** Would showing or saying this give a move choice still to come away? */
  textGivesAway(text: string): boolean;
  lineGivesAway(id: string): boolean;
  /** A fighter's next taunt, or none. */
  pickTaunt(f: Fighter): string | undefined;
}

export class BattleSim {
  fighters: Fighter[] = [];
  private projectiles: Projectile[] = [];
  private traps: Trap[] = [];
  private targetOf = new Map<number, { f: Fighter; until: number }>();
  private teamNextCast = { hero: 0, villain: 0 };
  private nextTaunt = 4000;
  /** Health floors (fraction of max) the director allows right now. */
  floors: { heroMain: number; villainMain: number };

  constructor(private readonly b: SimHost) {
    this.floors = { heroMain: HEALTH_FLOORS.main, villainMain: b.part === 1 ? PART1_VILLAIN_FLOOR.start : HEALTH_FLOORS.main };
  }

  /**
   * Part 1's villain floor one step down (hunt 11, M63), before a super or the combo lands, so each
   * takes a visible bite; never below `PART1_VILLAIN_FLOOR.end`. Part 2's floor does not step.
   */
  stepVillainFloor(): void {
    if (this.b.part !== 1) return;
    const { step, end } = PART1_VILLAIN_FLOOR;
    this.floors.villainMain = Math.max(end, Math.round((this.floors.villainMain - step) * 100) / 100);
  }

  enemiesOf(f: Fighter): Fighter[] {
    return this.fighters.filter((x) => x.active && x.team !== f.team && !x.floored);
  }

  alliesOf(f: Fighter): Fighter[] {
    return this.fighters.filter((x) => x.active && x.team === f.team && x !== f);
  }

  spawn(init: FighterInit, x: number, y: number): Fighter {
    const f = new Fighter(this.b.stage, init, x, y);
    this.fighters.push(f);
    return f;
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p);
  }

  addTrap(t: Trap): void {
    this.traps.push(t);
  }

  /**
   * An enemy's traps under `f` go with a puff (hunt 11): she walked onto one to reach the right pad, and as
   * the choice closed it went off on her, a BOOM and a stun the moment she got it right.
   */
  defuseNear(f: Fighter): void {
    for (const t of this.traps) {
      if (!t.obj.active || t.team === f.team || !onTrap(t, f)) continue;
      this.b.stage.tweens.killTweensOf(t.obj);
      burst(this.b.stage, t.x, t.y - 10, { count: 12, speed: 160, colors: [0xffffff, t.color] });
      t.obj.destroy();
    }
  }

  /**
   * Every hit goes through here: shields, invulnerability, the director's
   * health floors, hit flash, knockback, numbers-free feedback, statuses.
   */
  hit(target: Fighter, power: number, color: number, from: Fighter | null, status?: { kind: Status; duration: number }): void {
    const b = this.b;
    const scene = b.stage;
    if (!target.active || target.floored) return;
    // Nothing left over (a sword ring flung late) dents the villain while her
    // ultimate charges: that is her big moment, and a white hit flash spoils it.
    if (b.phase === 'ultimate' && target === b.villain) return;
    // Nothing touches her hero while she walks to a pad: a trap or a slowed
    // bolt turned her into a pig or an ice block mid-choice (item 039).
    if (b.choosing && target === b.heroes[0]) return;
    if (target.invulnerable || target.shieldUntil > b.now) {
      burst(scene, target.cx, target.cy, { count: 12, speed: 200, colors: [0xffffff, color] });
      // CLANG, not BLOCK: BLOCK is a bank word since item 121, the attic's counter word after battle 1 (hunt 8).
      if (target.isMain && Math.random() < 0.3) floatText(scene, target.cx, target.top, 'CLANG!', '#7ad9ff', 30, HIT_FLOAT);
      return;
    }
    // Clones pop on any hit.
    if (target.init.kind === 'clone') {
      sfxPoof();
      burst(scene, target.cx, target.cy, { count: 30, speed: 300, colors: [target.init.palette[1], 0xffffff] });
      floatText(scene, target.cx, target.top, 'POOF!', '#ffffff', 30, HIT_FLOAT);
      this.kill(target);
      return;
    }
    const dmg = power * DAMAGE_PER_POWER;
    const floor = target.isMain ? (target.team === 'hero' ? this.floors.heroMain : this.floors.villainMain) * target.maxHp : 0;
    // The floor stops a fall; it never lifts anybody back up.
    target.hp = Math.min(target.hp, Math.max(floor, target.hp - dmg));
    target.flashWhite();
    target.squash(Math.min(0.4, 0.12 + power * 0.06));
    // No knockback while she picks: the pads were placed off everyone where they stood, and a slowed bolt landing
    // shoved the sea tug's serpent 30 px at a time under a sign (hunt 11).
    if (from && !b.choosing) target.x = Phaser.Math.Clamp(target.x + Math.sign(target.x - from.x || 1) * Math.min(40, power * 10), ARENA_LEFT, ARENA_RIGHT);
    sfxHit(power);
    burst(scene, target.cx, target.cy, { count: Math.min(40, 8 + power * 6), speed: 200 + power * 60, colors: [color, 0xffffff] });
    if (power >= 3) {
      hitstop(scene, 60);
      shake(scene, power, 160);
    }
    if (power >= 2 && Math.random() < 0.35) {
      // Not a word on a move pad still to come (POW, BAM and ZAP are move words).
      const words = ['POW!', 'BAM!', 'ZAP!', 'BOOM!', 'WHAM!'].filter((w) => !b.textGivesAway(w));
      floatText(scene, target.cx, target.top, words[Math.floor(Math.random() * words.length)]!, hex(color), 34, HIT_FLOAT);
    }
    if (status && !(target.isMain && target.team === 'villain' && b.part === 1 && Math.random() < 0.5)) target.setStatus(status.kind, status.duration, b.now);
    b.show.onHit(target, power);
    if (!target.isMain && target.hp <= 0) this.kill(target);
  }

  kill(f: Fighter): void {
    if (!f.alive) return;
    f.alive = false;
    sfxPoof();
    burst(this.b.stage, f.cx, f.cy, { count: 30, speed: 300, colors: [f.init.palette[0], f.init.palette[1], 0xffffff] });
    // Pop out with a squash, never a spin: sprites only bob and squash.
    this.b.stage.tweens.add({ targets: f.root, scaleX: 1.4, scaleY: 0, duration: 250, ease: 'Back.easeIn', onComplete: () => f.destroy() });
  }

  /** The fighters' frame: each thinks and moves, the gone are dropped, bodies are kept apart, then drawn. */
  stepFighters(dt: number): void {
    for (const f of this.fighters) {
      if (f.active) this.think(f, dt);
    }
    this.fighters = this.fighters.filter((f) => f.alive || f.root.active);
    // Kept apart before they are drawn, so the screen never shows them inside one another (item 034).
    this.separate(dt);
    for (const f of this.fighters) {
      if (f.active) f.updateVisual(this.b.now, dt);
    }
  }

  /** The shots' frame, after the stage's: projectiles fly and hit, traps spring. */
  stepShots(dt: number): void {
    this.updateProjectiles(dt);
    this.updateTraps();
  }

  private pickTarget(f: Fighter): Fighter | null {
    const now = this.b.now;
    const cur = this.targetOf.get(f.uid);
    if (cur && cur.until > now && cur.f.active && !cur.f.floored) return cur.f;
    const enemies = this.enemiesOf(f);
    if (!enemies.length) return null;
    let t: Fighter;
    if (f.isMain && Math.random() < 0.65) {
      const mains = enemies.filter((e) => e.isMain);
      t = mains.length ? mains[Math.floor(Math.random() * mains.length)]! : enemies[0]!;
    } else {
      t = enemies.reduce((a, b) => (Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y) < Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) ? a : b));
    }
    this.targetOf.set(f.uid, { f: t, until: now + 2500 + Math.random() * 2500 });
    return t;
  }

  private think(f: Fighter, dt: number): void {
    const b = this.b;
    const now = b.now;
    if (!f.canAct(now)) {
      if (f.status?.kind === 'pig' && !f.floored) {
        // A pig wanders and oinks, harmlessly.
        f.x = Phaser.Math.Clamp(f.x + Math.sin(now / 300 + f.uid) * 60 * dt, ARENA_LEFT, ARENA_RIGHT);
      }
      return;
    }
    const target = this.pickTarget(f);
    const fighting = b.phase === 'fight' || b.phase === 'combo';
    const moving = fighting || (b.phase === 'ultimate' && f.team === 'hero');
    // A contest places its fighters itself (lanes, the rope's ends, stations).
    const placed = b.show.steer(f, dt);
    // Her own hero runs where she pushes the stick; everything else stays automatic.
    const steered = !placed && f === b.heroes[0] && fighting && b.controls.move.lengthSq() > STICK_AT_REST_SQ;
    if (placed) {
      // The stage has placed it.
    } else if (steered) {
      // Forget any half-taken giant step, or letting go would snap her back.
      delete f.mem.stepTo;
      const sp = f.init.speed * 1.3;
      f.vx = b.controls.move.x * sp;
      f.vy = b.controls.move.y * sp * 0.7;
      integrate(f, dt);
    } else if (moving) STEER[f.init.style](f, { scene: b.stage, now, dt, target });
    // Each side drifts back towards its own ground, so the fight stays framed
    // heroes-left, villain-right instead of wandering off one edge.
    if (moving && !steered && !placed && f.isMain) {
      // Each hero has a ground of their own, so she and her ally never share one spot (item 034).
      const g = BRAWL.fight;
      const home = f.team === 'hero' ? g.heroX - Math.max(0, b.heroes.indexOf(f)) * g.heroDx : g.villainX;
      f.x += (home - f.x) * Math.min(1, (f.team === 'villain' ? g.villainPull : g.heroPull) * dt);
    }
    // A giant's wings would hang off the edge of the screen: keep all of her in.
    if (f.giant) f.x = Phaser.Math.Clamp(f.x, ARENA_LEFT + f.height * 0.45, ARENA_RIGHT - f.height * 0.45);
    if (!fighting || !target) return;

    // Casting: one team member at a time, so moves read instead of blurring.
    const teamKey = f.team;
    if (now < this.teamNextCast[teamKey] && f.isMain) return;
    for (const ab of f.init.abilities) {
      if (!f.ready(ab, now)) continue;
      if (ab.kind === 'heal' && this.alliesOf(f).every((a) => a.hp > a.maxHp * 0.7) && f.hp > f.maxHp * 0.7) continue;
      f.use(ab, now);
      cast(b, f, ab, target, 1, f.isMain && ab.power >= 2 && !b.textGivesAway(abilityCallout(ab)));
      // Big moves are called out by name, if nobody else is talking.
      // A move whose name says a word on a pad still to come is never called
      // out: hearing it then would give the choice away (so are taunts).
      // Each call once a part (item 087; item 034 had only kept it from twice in a row).
      const call = moveLine(f.init.id, ab.id);
      if (f.isMain && ab.power >= 2 && Math.random() < 0.5 && !b.calledOut.has(call) && !b.lineGivesAway(call)) {
        void voiceBus.say(call, 'bark', f).then((ok) => ok && b.calledOut.add(call));
      }
      b.stats.abilitiesFired++;
      if (f.isMain) this.teamNextCast[teamKey] = b.now + (teamKey === 'villain' ? 700 : 500);
      break;
    }
  }

  /**
   * Fighters push apart so cards do not stack into one blob. Soft: a dash or a
   * slam can still pass through somebody, and the push resolves it after.
   */
  private separate(dt: number): void {
    const host = this.b;
    const live = this.fighters.filter((f) => f.active && !f.floored);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
        // The heroes and the villain never stand in one another
        // (item 034): at about the same depth, their bodies are kept apart
        // across, at once, the bigger one giving less. Not while one is in
        // the air (a leap passes over), and her hero in a move choice is hers.
        if (a.isMain && b.isMain) {
          // Her hero in a move choice is the cursor: she walks past anyone,
          // and never shoves her ally ahead of her across the arena. A
          // contest's own places are the stage's: once crossed, a push would
          // hold two of them on the wrong sides of each other.
          if (host.choosing && (a === host.heroes[0] || b === host.heroes[0])) continue;
          if (host.held(a) && host.held(b)) continue;
          // One passing over the other (a leap, a flyer high above) is not standing in it.
          if (Math.abs(a.lift - b.lift) > Math.min(a.height, b.height) * 0.6) continue;
          // Side by side at about one depth, or one standing behind the other
          // and more than half hidden by them (Julia just behind a dad).
          const [front, back] = a.y >= b.y ? [a, b] : [b, a];
          const hidden = front.top - back.top < back.height * back.scaleMul * 0.5;
          if (Math.abs(b.y - a.y) >= SAME_DEPTH && !hidden) continue;
          const need = a.bodyHalf + b.bodyHalf;
          const dx = b.x - a.x;
          if (Math.abs(dx) >= need) continue;
          const dir = Math.abs(dx) > 0.5 ? Math.sign(dx) : a.team === 'hero' ? 1 : -1;
          const over = need - Math.abs(dx);
          const pinned = (f: Fighter) => f === host.villain;
          let wa = b.init.size / (a.init.size + b.init.size);
          if (pinned(a)) wa = 0;
          else if (pinned(b)) wa = 1;
          // Pushed against the arena's edge: out the other side instead.
          const room = (f: Fighter, x: number) => x - f.bodyHalf * 0.5 >= ARENA_LEFT && x + f.bodyHalf * 0.5 <= ARENA_RIGHT;
          const ax = a.x - dir * over * wa;
          const bx = b.x + dir * over * (1 - wa);
          if (wa === 1 && !room(a, ax)) a.x = Phaser.Math.Clamp(b.x + dir * need, ARENA_LEFT, ARENA_RIGHT);
          else a.x = Phaser.Math.Clamp(ax, ARENA_LEFT, ARENA_RIGHT);
          if (wa === 0 && !room(b, bx)) b.x = Phaser.Math.Clamp(a.x - dir * need, ARENA_LEFT, ARENA_RIGHT);
          else b.x = Phaser.Math.Clamp(bx, ARENA_LEFT, ARENA_RIGHT);
          continue;
        }
        const min = (a.height * a.scaleMul + b.height * b.scaleMul) * 0.36;
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.8;
        const d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const push = ((min - d) / min) * 520 * dt;
        const nx = d > 0.01 ? dx / d : Math.random() - 0.5;
        const ny = d > 0.01 ? dy / d : Math.random() - 0.5;
        // Bigger fighters are pushed less.
        const wa = b.init.size / (a.init.size + b.init.size);
        const wb = 1 - wa;
        if (a.now >= a.busyUntil || !a.isMain) {
          a.x = Phaser.Math.Clamp(a.x - nx * push * wa * 2, ARENA_LEFT, ARENA_RIGHT);
          a.y = Phaser.Math.Clamp(a.y - ny * push * wa, FLOOR_TOP, FLOOR_BOTTOM);
        }
        if (b.now >= b.busyUntil || !b.isMain) {
          b.x = Phaser.Math.Clamp(b.x + nx * push * wb * 2, ARENA_LEFT, ARENA_RIGHT);
          b.y = Phaser.Math.Clamp(b.y + ny * push * wb, FLOOR_TOP, FLOOR_BOTTOM);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.homing && p.target?.active) {
        const ang = Phaser.Math.Angle.Between(p.x, p.y, p.target.cx, p.target.cy);
        const sp = Math.hypot(p.vx, p.vy);
        const cur = Math.atan2(p.vy, p.vx);
        const next = Phaser.Math.Angle.RotateTo(cur, ang, 5 * dt);
        p.vx = Math.cos(next) * sp;
        p.vy = Math.sin(next) * sp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.obj.setPosition(p.x, p.y);
      p.obj.rotation += p.spinRate * dt;
      // Collide with the first enemy whose body it is inside.
      for (const e of this.fighters) {
        if (!e.active || e.team === p.team || e.floored) continue;
        if (Math.abs(e.cx - p.x) < e.height * 0.3 && Math.abs(e.cy - p.y) < e.height * 0.45) {
          this.hit(e, p.power, p.color, p.from, p.status);
          p.life = 0;
          break;
        }
      }
      if (p.x < -100 || p.x > GAME_WIDTH + 100 || p.y < -200 || p.y > GAME_HEIGHT + 50) p.life = 0;
      if (p.life <= 0) {
        p.obj.destroy();
        p.trail?.stop();
        const t = p.trail;
        if (t) this.b.stage.time.delayedCall(400, () => t.destroy());
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
  }

  private updateTraps(): void {
    const scene = this.b.stage;
    const now = this.b.now;
    for (const t of this.traps) {
      if (t.obj.active && now - t.armedAt > 12_000) {
        scene.tweens.killTweensOf(t.obj);
        t.obj.destroy();
        continue;
      }
      // Not while a move choice is open (hunt 11): her walk to a pad sprang a villain's trap, a BOOM and a burst that
      // hung on the frozen clock (fix 29 kept only the hit off her).
      if (now < t.armedAt || !t.obj.active || this.b.choosing) continue;
      const victim = this.fighters.find((e) => e.active && e.team !== t.team && !e.floored && onTrap(t, e));
      if (victim) {
        burst(scene, t.x, t.y - 20, { count: 50, speed: 420, colors: [t.color, 0xffffff, 0xd02040] });
        shockwave(scene, t.x, t.y, t.color, 120);
        sfxBoom(1);
        this.hit(victim, t.power, t.color, t.from, { kind: 'stun', duration: 1.2 });
        scene.tweens.killTweensOf(t.obj);
        t.obj.destroy();
      }
    }
    this.traps = this.traps.filter((t) => t.obj.active);
  }

  /** Now and then in the fight, a main fighter says one of its taunts (`pickTaunt`). */
  taunt(): void {
    const b = this.b;
    if (b.now < this.nextTaunt || b.phase !== 'fight') return;
    this.nextTaunt = b.now + 5000 + Math.random() * 4000;
    const speakers = this.fighters.filter((f) => f.isMain && f.active && !f.floored && f.init.taunts?.length && f.canAct(b.now));
    const f = speakers[Math.floor(Math.random() * speakers.length)];
    if (!f) return;
    const key = b.pickTaunt(f);
    if (!key) return;
    // A dropped taunt (somebody was talking) tries again soon rather than waiting a full turn.
    void voiceBus.say(tauntLine(f.init.id, key), 'bark', f).then((ok) => {
      if (ok) return;
      this.nextTaunt = b.now + 1200;
      // Not said, so not counted.
      unsayTaunt(f.init.id, key);
    });
  }
}
