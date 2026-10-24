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
import { DEPTH, REACH } from '../../config';
import type { Controls } from '../../input/Controls';
import { dadLock } from '../../input/dadLock';
import { makeButtonDot } from '../../ui/ButtonDot';
import { FLOOR_BOTTOM, FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_LEFT, ARENA_RIGHT, stickWalk } from '../movement';

/** A dodge ends this long after she reaches the spot (s). */
const REACHED_HOLD = 0.7;
/** Quiet seconds before a grab's line is said again. */
const GRAB_REPROMPT = 10;
/**
 * How quickly she steps up onto a ledge and down off it (s, the time constant of an eased
 * approach): set in one frame, she jumped 130 px as she came within reach (hunt 10, M56).
 * About a fifth of a second up or down.
 */
const LIFT_EASE = 0.06;

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
  /** A reprompt asked for and not yet over: a second yellow before its line has begun is not another (hunt 7). */
  private saying = false;

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
    // On the floor at the ledge's foot, where she steps up (hunt 11: drawn 130 px up on the ledge's top, it was
    // a ring that never counted, and she stood on it unlifted until the wave came).
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

  /** Her lift where she stands: on a ledge in reach, stood up on it. */
  private get liftTarget(): number {
    return this.spot.lift && this.near ? this.spot.lift + this.baseLift : this.baseLift;
  }

  /** Her lift a frame nearer its target (M56: eased, not set), on real time. */
  private easeLift(realDt: number): void {
    const to = this.liftTarget;
    const k = 1 - Math.exp(-Math.max(0, realDt) / LIFT_EASE);
    this.at.lift += (to - this.at.lift) * k;
    if (Math.abs(to - this.at.lift) < 0.5) this.at.lift = to;
  }

  /** Pin her hero where she walked, at her eased lift (`easeLift`). */
  holdHero(): void {
    const me = this.host.heroes[0];
    if (!me?.active) return;
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
    const walking = stickWalk(me, this.at, c.move, realDt);
    this.easeLift(realDt);
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
      if (c.pressed('yellow') && !voiceBus.busy) this.sayAgain();
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
    // Yellow says it again once it has been said (hunt 7: mashed, each press queued another
    // copy of Dad's long line, green waited them all out and they spilled into the next beats).
    if ((c.pressed('yellow') && !voiceBus.busy) || this.idle > GRAB_REPROMPT) {
      this.idle = 0;
      this.sayAgain();
    }
    // Not while a line or its re-prompt plays (hunt 10: the third "sneak" re-prompt was cut off at 30 s).
    if (this.clock >= this.seconds && !voiceBus.busy && !this.saying) this.finish(false);
  }

  private sayAgain(): void {
    if (this.saying) return;
    this.saying = true;
    void this.reprompt().finally(() => (this.saying = false));
  }

  private finish(reached: boolean): void {
    if (this.finished) return;
    this.finished = true;
    // Where the walk leaves her: up on the ledge if she ends in reach of it (the tail smash keeps her there).
    this.at.lift = this.liftTarget;
    this.holdHero();
    this.host.heroes[0]!.lean = 0;
    for (const o of this.objs) o.destroy();
    this.resolve({ reached });
  }

  info(): { kind: string; spot: { id: string; x: number; y: number }; reached: boolean } {
    return { kind: this.kind, spot: { id: this.spot.id, x: this.spot.x, y: this.spot.y }, reached: this.reached };
  }
}
