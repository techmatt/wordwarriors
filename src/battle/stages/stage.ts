/**
 * A fight style's staging (item 031): what makes a sky race look like a race
 * and a cook-off like a cook-off, on top of the one battle director.
 *
 * BattleScene runs the same beats for every style (intro, the fetched things,
 * move choice, combo, move choice, the villain's ultimate; then the retreat,
 * or the counter and the finish), so nothing about reading changes. At each
 * beat it calls the stage, which adds its own background dressing, camera,
 * particles and bars, and holds the fighters where its contest needs them
 * (lanes, the two ends of a rope, cooking stations). The simulation still
 * runs underneath: abilities fire, minions roam, hits land; a contest shows
 * the steered health as its own meter (a race lead, the rope's knot, the
 * clash point, the judges' scores), so the outcome stays fixed.
 *
 * `BaseStage` is the brawl: every hook a no-op. A contest extends it and
 * overrides what it stages. Timings are simulation time (`host.wait`,
 * `host.after`), which slow-mo, hit-stop and the move-choice freeze scale.
 */

import type Phaser from 'phaser';

import type { FightSpec } from '../../../content/battle/fights';
import type { AbilitySpec } from '../../../content/battle/types';
import type { BattleWorld } from '../abilities';
import type { Fighter } from '../Fighter';

/** `story`: a story fight's beat (item 107): nobody fights by themselves. */
export type Phase = 'intro' | 'fight' | 'choice' | 'combo' | 'ultimate' | 'counter' | 'finish' | 'end' | 'story';

/** What the battle lends a stage. */
export interface StageHost extends BattleWorld {
  readonly part: 1 | 2;
  readonly phase: Phase;
  readonly heroes: readonly Fighter[];
  readonly villain: Fighter;
  /** The parked games' helper friend, when made (never in v0.2 episodes). */
  readonly helper: Fighter | null;
  readonly fight: FightSpec;
  /** Her stick, each axis -1..1. */
  readonly stick: Phaser.Math.Vector2;
  /** A move choice is open: her hero is hers to walk, and the clock is nearly frozen. */
  readonly choosing: boolean;
  /** Resolve after `s` seconds of simulation time (dropped if the scene ends first). */
  wait(s: number): Promise<void>;
  /** The heroes' side: heroes and the helper, active ones. */
  team(): Fighter[];
  /** Health left as a fraction, for steering a meter: the heroes' (mean of the mains) and the villain's. */
  heroFrac(): number;
  villainFrac(): number;
  /** Ease the camera onto (x, y) at `zoom`, hold `holdMs`, then ease back. Short: the HUD sits at the edges. */
  focus(x: number, y: number, zoom: number, holdMs: number): void;
}

export interface FightStage {
  /**
   * Main fighters (and the helper) are placed by the stage, not by their
   * movement styles: the ultimate's walk to each side is skipped too.
   */
  readonly anchored: boolean;
  /** Does the contest hold `f` to a place of its own (a lane, a rope end, a spot, a station)? */
  holds(f: Fighter): boolean;
  /** After the cast spawns, before the intro: dressing, props, meters. */
  setup(): void;
  /** Where `f` runs to in the intro (the i-th hero; i is 0 for the villain), or null for the brawl's spot. */
  home(f: Fighter, i: number): { x: number; y: number } | null;
  /**
   * Every frame, for every active fighter that can act: place it, and return
   * true to skip its own movement (and her stick). Her hero during a move
   * choice is pinned by the battle afterwards, whatever this does.
   */
  steer(f: Fighter, dt: number): boolean;
  /** Every frame, after the fighters: scroll, rope, beams, meters. `dt` in simulation seconds. */
  update(dt: number): void;
  /** Draw the bars into the cleared HUD graphics; true when it drew its own (the health bars are then not drawn). */
  drawHud(g: Phaser.GameObjects.Graphics): boolean;
  /** A hit has landed (after damage). */
  onHit(target: Fighter, power: number, from: Fighter | null): void;
  /** Her right pick fired `ab` from `f`: the style's own flourish on the super. */
  superMove(f: Fighter, ab: AbilitySpec, word: string): void;
  /** The team combo fired. */
  combo(a: Fighter, b: Fighter): void;
  /**
   * Part 1: the ultimate has been cast at the heroes. Stage the villain
   * winning the round; resolve after about 2.2 s, when the heroes are floored.
   */
  ultimate1(v: Fighter, ult: AbilitySpec): Promise<void>;
  /** Part 2: the counter has undone the ultimate. Turn the contest the heroes' way; about 1.5 s at most. */
  counter2(v: Fighter): Promise<void>;
  /** Part 2: the narrator's finish line starts ("There's the finish line!"): show what it names now (item 069). */
  finishLine(): void;
  /** Part 2: everyone's finisher has fired; stage the heroes winning, just before the last hit. About 1.5 s at most. */
  finish(v: Fighter): Promise<void>;
  /** Part 1's end, as the heroes run off to get ready. */
  retreat(): void;
  /** For the tests (`hookState.battle.stage`). */
  info(): Record<string, unknown>;
}

export interface Pt {
  x: number;
  y: number;
}

/** The share of the way to a target an exponential ease covers in `dt` seconds at `rate`. */
export const ease = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);
export const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

/** How far her stick sways her hero about a contest's spot (px across, down). */
const NUDGE = { x: 60, y: 40 };

/** The brawl: the battle as it always was. Contests extend this. */
export class BaseStage implements FightStage {
  readonly anchored: boolean = false;

  constructor(protected readonly host: StageHost) {}

  protected get scene(): Phaser.Scene {
    return this.host.stage;
  }

  /**
   * Her stick's sway for her hero while the fight runs: a contest that places
   * her adds it to her spot, so the pad always answers (the brawl's stick
   * walks her anywhere). Zero for everybody else and outside the fight.
   */
  protected nudge(f: Fighter): { x: number; y: number } {
    const h = this.host;
    if (f !== h.heroes[0] || (h.phase !== 'fight' && h.phase !== 'combo')) return { x: 0, y: 0 };
    return { x: h.stick.x * NUDGE.x, y: h.stick.y * NUDGE.y };
  }

  /** `host.after`, but never after the scene has ended. */
  protected later(ms: number, fn: () => void): void {
    this.host.after(ms, () => {
      if (this.scene.sys.isActive()) fn();
    });
  }

  holds(_f: Fighter): boolean {
    return false;
  }
  setup(): void {}
  home(_f: Fighter, _i: number): { x: number; y: number } | null {
    return null;
  }
  steer(_f: Fighter, _dt: number): boolean {
    return false;
  }
  update(_dt: number): void {}
  drawHud(_g: Phaser.GameObjects.Graphics): boolean {
    return false;
  }
  onHit(_target: Fighter, _power: number, _from: Fighter | null): void {}
  superMove(_f: Fighter, _ab: AbilitySpec, _word: string): void {}
  combo(_a: Fighter, _b: Fighter): void {}
  async ultimate1(_v: Fighter, _ult: AbilitySpec): Promise<void> {
    await this.host.wait(2.2);
  }
  async counter2(_v: Fighter): Promise<void> {}
  finishLine(): void {}
  async finish(_v: Fighter): Promise<void> {}
  retreat(): void {}
  info(): Record<string, unknown> {
    return {};
  }
}
