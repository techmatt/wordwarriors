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
import type { Rand } from './bank';
import { fresh } from './recent';

/** Variant numbers, from 1. */
export interface Story {
  quest: number;
  scene: number;
}

export const DEFAULT_STORY: Story = { quest: 1, scene: 1 };

/**
 * One of `count` variants, from 1; always 1 when `fixed`. Her `recent`
 * variants of it (newest last) sit out while two are left (item 067,
 * src/rules/recent.ts `fresh`); with none recent the draw is as before.
 */
export function pickVariant(count: number, rand: Rand, fixed: boolean, recent: readonly number[] = []): number {
  if (fixed || count <= 1) return 1;
  const from = fresh(Array.from({ length: count }, (_, i) => i + 1), recent);
  return from[Math.min(from.length - 1, Math.floor(rand() * from.length))]!;
}

/** Recent variants per key (the store's `recent`, as numbers), for `drawStory` and `drawLines`. */
export type RecentVariants = (key: string) => number[];

const none: RecentVariants = () => [];

/** The store keys of an episode's variants (item 067): `quest_<helper>`, `scene_<helper>`, `line_<key>` (the villain's own lines by villain). */
export function variantKeys(helper: string, villain: string): { quest: string; scene: string } & Record<keyof LineVariants, string> {
  return {
    quest: `quest_${helper}`,
    scene: `scene_${helper}`,
    up: 'line_up',
    good: 'line_good',
    door: 'line_door',
    taunt: `line_taunt_${villain}`,
    sorry: `line_sorry_${villain}`,
    ending: `line_ending_${villain}`,
  };
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
export function drawLines(villain: string, rand: Rand, fixed: boolean, recent: RecentVariants = none): LineVariants {
  const v = CHARACTER_BY_ID[villain];
  const k = variantKeys('', villain);
  return {
    up: pickVariant(WAKE_VARIANTS, rand, fixed, recent(k.up)),
    good: pickVariant(WAKE_VARIANTS, rand, fixed, recent(k.good)),
    door: pickVariant(WAKE_VARIANTS, rand, fixed, recent(k.door)),
    taunt: pickVariant(Math.min(BEDROOM_TAUNTS, v?.evil.taunts.length ?? 1), rand, fixed, recent(k.taunt)),
    sorry: pickVariant(v?.reformed.sorry.length ?? 1, rand, fixed, recent(k.sorry)),
    ending: pickVariant(v?.reformed.ending.length ?? 1, rand, fixed, recent(k.ending)),
  };
}

/** The helper's quest line and hub scene for one episode. */
export function drawStory(helper: string, rand: Rand, fixed: boolean, recent: RecentVariants = none): Story {
  const k = variantKeys(helper, '');
  return {
    quest: pickVariant(questFor(helper).lines.length, rand, fixed, recent(k.quest)),
    scene: pickVariant(scenesFor(helper).length, rand, fixed, recent(k.scene)),
  };
}
