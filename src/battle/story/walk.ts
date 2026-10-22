/**
 * A story fight's walk (item 107): her hero is hers to walk, on real time, to
 * a place in the arena. Two kinds:
 *
 * - `dodge`: get to the safe spot before the attack lands. The window runs
 *   `seconds`; reaching the spot ends it a beat later; yellow says the line again. It ends either way:
 *   the attack misses whether she got there or not (no fail).
 * - `grab`: walk to the spot and press green there (the green dot shows in
 *   reach). Yellow or ten quiet seconds says the line again; after `seconds`
 *   it goes on by itself.
 *
 * Dad lock holds the clock (she can still walk), as the rooms' timed prompts wait.
 */

import Phaser from 'phaser';

import type { StorySpot } from '../../../content/battle/stories/types';
import { voiceBus } from '../../audio/VoiceBus';
import { sfxSelect } from '../../audio/sfx';
import { DEPTH, REACH, WALK_SPEED } from '../../config';
import type { Controls } from '../../input/Controls';
import { dadLock } from '../../input/dadLock';
import { makeButtonDot } from '../../ui/ButtonDot';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_LEFT, ARENA_RIGHT } from '../movement';

/** A dodge ends this long after she reaches the spot (s). */
const REACHED_HOLD = 0.7;
/** Quiet seconds before a grab's line is said again. */
const GRAB_REPROMPT = 10;

export interface WalkHost {
  readonly stage: Phaser.Scene;
  readonly heroes: readonly Fighter[];
  readonly controls: Controls;
}

export interface WalkResult {
  /** She got there (and, for a grab, pressed green). */
  reached: boolean;
}

export class StoryWalk {
  readonly at: { x: number; y: number; lift: number };
  reached = false;
  private clock = 0;
  private idle = 0;
  private sinceReached = 0;
  private readonly baseLift: number;
  private readonly objs: Phaser.GameObjects.GameObject[] = [];
  private readonly ring: Phaser.GameObjects.Ellipse;
  private readonly dot: Phaser.GameObjects.Container;
  private resolve!: (r: WalkResult) => void;
  readonly done: Promise<WalkResult>;
  private finished = false;

  constructor(
    private readonly host: WalkHost,
    readonly spot: StorySpot,
    readonly kind: 'dodge' | 'grab',
    private readonly seconds: number,
    /** Said again on yellow or when she stands still (a grab only). */
    private readonly reprompt: () => Promise<unknown> = async () => undefined,
  ) {
    const me = host.heroes[0]!;
    this.baseLift = me.lift;
    this.at = { x: me.x, y: me.y, lift: me.lift };
    const scene = host.stage;
    // The place to go: a glowing ring on the floor, pulsing.
    // Over the props (the hoard, the ledge), so the place she is told to go always shows.
    this.ring = scene.add.ellipse(spot.x, spot.y, 170, 60).setStrokeStyle(8, 0xfff3a0, 1).setFillStyle(0xfff3a0, 0.18).setDepth(DEPTH.prompt - 14);
    if (spot.lift) this.ring.setY(spot.y - spot.lift);
    this.dot = makeButtonDot(scene, spot.x, spot.y - (spot.lift ?? 0) - 200, 'green', 22, false).setDepth(DEPTH.prompt).setVisible(false);
    this.objs.push(this.ring, this.dot);
    this.done = new Promise((r) => (this.resolve = r));
  }

  /** Tests (`__ww.place`): her hero onto (x, y). */
  place(x: number, y: number): boolean {
    this.at.x = Phaser.Math.Clamp(x, ARENA_LEFT, ARENA_RIGHT);
    this.at.y = Phaser.Math.Clamp(y, FLOOR_TOP, FLOOR_BOTTOM);
    this.holdHero();
    return true;
  }

  private get near(): boolean {
    return Phaser.Math.Distance.Between(this.at.x, this.at.y, this.spot.x, this.spot.y) < REACH;
  }

  /** Pin her hero where she walked; on a ledge, stood up on it. */
  holdHero(): void {
    const me = this.host.heroes[0];
    if (!me?.active) return;
    this.at.lift = this.spot.lift && this.near ? this.spot.lift + this.baseLift : this.baseLift;
    me.x = this.at.x;
    me.y = this.at.y;
    me.lift = this.at.lift;
    me.hop = 0;
  }

  /** Every frame, on real time. */
  update(realDt: number): void {
    if (this.finished) return;
    const me = this.host.heroes[0]!;
    const c = this.host.controls;
    const mv = c.move;
    const walking = mv.lengthSq() > 0.04 && me.active;
    if (walking) {
      this.at.x = Phaser.Math.Clamp(this.at.x + mv.x * WALK_SPEED * realDt, ARENA_LEFT, ARENA_RIGHT);
      this.at.y = Phaser.Math.Clamp(this.at.y + mv.y * WALK_SPEED * 0.8 * realDt, FLOOR_TOP, FLOOR_BOTTOM);
      me.lean = Phaser.Math.Clamp(mv.x * 0.2, -0.25, 0.25);
    } else me.lean = 0;
    this.holdHero();
    const near = this.near;
    if (near && !this.reached && this.kind === 'dodge') sfxSelect();
    const pulse = 1 + 0.08 * Math.sin(performance.now() / 160);
    this.ring.setScale(near ? 1.15 : pulse);
    if (!dadLock.locked) this.clock += realDt;
    if (c.dev('F4')) {
      this.place(this.spot.x, this.spot.y);
      return this.finish(true);
    }
    if (this.kind === 'dodge') {
      // Yellow always says it again.
      if (c.pressed('yellow') && !voiceBus.busy) void this.reprompt();
      if (near) this.reached = true;
      if (this.reached && !dadLock.locked) this.sinceReached += realDt;
      if (this.sinceReached >= REACHED_HOLD || this.clock >= this.seconds) this.finish(this.reached && near);
      return;
    }
    // A grab: green in reach takes it.
    if (near !== this.reached) {
      this.reached = near;
      if (near) sfxSelect();
    }
    this.dot.setVisible(near && !voiceBus.busy);
    if (near) this.dot.setScale(pulse);
    if (near && c.pressed('green') && !voiceBus.busy) return this.finish(true);
    if (walking || dadLock.locked || voiceBus.busy) this.idle = 0;
    else this.idle += realDt;
    if (c.pressed('yellow') || this.idle > GRAB_REPROMPT) {
      this.idle = 0;
      void this.reprompt();
    }
    if (this.clock >= this.seconds) this.finish(false);
  }

  private finish(reached: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.host.heroes[0]!.lean = 0;
    for (const o of this.objs) o.destroy();
    this.resolve({ reached });
  }

  /** The scene ended under it. */
  destroy(): void {
    if (!this.finished) this.finish(false);
  }

  info(): { kind: string; spot: { id: string; x: number; y: number }; reached: boolean } {
    return { kind: this.kind, spot: { id: this.spot.id, x: this.spot.x, y: this.spot.y }, reached: this.reached };
  }
}
