/**
 * The story fight's stage (item 107): nobody moves by themselves. Heroes keep
 * their marks on the left and the villain his on the right; the director
 * (src/battle/story/StoryDirector.ts) moves them by tween, beat by beat.
 * No health bars: the stage draws its own HUD, which is nothing.
 */

import type Phaser from 'phaser';

import type { Fighter } from '../Fighter';
import { BaseStage } from './stage';

/** Each hero's mark (the i-th), and the villain's. */
export const STORY_MARKS = {
  heroes: [
    { x: 520, y: 590 },
    { x: 250, y: 470 },
    { x: 370, y: 655 },
  ],
  villain: { x: 1020, y: 560 },
} as const;

/** How high a fighter floats on its mark: a flyer up in the air, a hoverer a little off the floor. */
export function storyLift(f: Fighter): number {
  return f.init.style === 'fly' ? 110 : f.init.style === 'hover' ? 40 : 0;
}

export class StoryStage extends BaseStage {
  override readonly anchored = true;

  override holds(_f: Fighter): boolean {
    return true;
  }

  override home(f: Fighter, i: number): { x: number; y: number } | null {
    if (f === this.host.villain) return { ...STORY_MARKS.villain };
    return { ...(STORY_MARKS.heroes[i] ?? STORY_MARKS.heroes[0]) };
  }

  /** Everybody stays where the director put them. */
  override steer(_f: Fighter, _dt: number): boolean {
    return true;
  }

  override drawHud(_g: Phaser.GameObjects.Graphics): boolean {
    return true;
  }

  override info(): Record<string, unknown> {
    return { story: true };
  }
}
