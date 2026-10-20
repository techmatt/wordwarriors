/**
 * The episode's story variants (item 037): which of the helper's quest setup
 * lines (content/house/quests.ts) the bedroom says, and which hub scene
 * (content/house/scenes.ts) gives her the gift word. Pure: no Phaser.
 *
 * Drawn with the cast's rand, so `?seed=` replays them too; the fixed default
 * cast (`?cast=default`, what the tests play) always gets variant 1 of each,
 * so a test hears the same lines every run.
 */

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { questFor } from '../../content/house/quests';
import { WAKE_VARIANTS } from '../../content/voice/script';
import { scenesFor } from '../../content/house/scenes';

export type Rand = () => number;

/** Variant numbers, from 1. */
export interface Story {
  quest: number;
  scene: number;
}

export const DEFAULT_STORY: Story = { quest: 1, scene: 1 };

/** One of `count` variants, from 1; always 1 when `fixed`. */
export function pickVariant(count: number, rand: Rand, fixed: boolean): number {
  if (fixed || count <= 1) return 1;
  return 1 + Math.min(count - 1, Math.floor(rand() * count));
}

/**
 * The episode's other line variants (item 040), from 1: the waker's wake-up,
 * good news and door lines (`WAKE_VARIANTS` each), the villain's far-off
 * bedroom taunt (one of its first `BEDROOM_TAUNTS` taunts), its sorry after
 * battle 2 and its line in the victory scene (`reformed.sorry` / `.ending`).
 */
export interface LineVariants {
  up: number;
  good: number;
  door: number;
  taunt: number;
  sorry: number;
  ending: number;
}

export const DEFAULT_LINES: LineVariants = { up: 1, good: 1, door: 1, taunt: 1, sorry: 1, ending: 1 };

/** The bedroom's far-off taunt is one of the villain's first this many taunts. */
export const BEDROOM_TAUNTS = 3;

/** One episode's line variants, drawn after the story with the same rand; all 1 when `fixed`. */
export function drawLines(villain: string, rand: Rand, fixed: boolean): LineVariants {
  const v = CHARACTER_BY_ID[villain];
  return {
    up: pickVariant(WAKE_VARIANTS, rand, fixed),
    good: pickVariant(WAKE_VARIANTS, rand, fixed),
    door: pickVariant(WAKE_VARIANTS, rand, fixed),
    taunt: pickVariant(Math.min(BEDROOM_TAUNTS, v?.evil.taunts.length ?? 1), rand, fixed),
    sorry: pickVariant(v?.reformed.sorry.length ?? 1, rand, fixed),
    ending: pickVariant(v?.reformed.ending.length ?? 1, rand, fixed),
  };
}

/** The helper's quest line and hub scene for one episode. */
export function drawStory(helper: string, rand: Rand, fixed: boolean): Story {
  return {
    quest: pickVariant(questFor(helper).lines.length, rand, fixed),
    scene: pickVariant(scenesFor(helper).length, rand, fixed),
  };
}
