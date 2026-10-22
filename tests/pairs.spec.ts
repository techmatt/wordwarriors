/**
 * Item 028: every ally × villain pair of the active cast (ACTIVE_CAST in
 * src/config.ts, each dad in every form) played once, by URL overrides: the
 * bedroom's news and quest line, the quest place's hub, both battles and the
 * victory scene up to the recap. Screenshots and each pair's voiced line ids
 * land in tests/screenshots/ (ignored) for a look.
 *
 * Off unless asked for (all 36 take about an hour): `npm run test:pairs` plays
 * them all, `WW_PAIRS=scar` (a substring of `ally+villain`) the pairs that
 * match, `WW_PAIRS=+` all. Off, the spec shows one skipped test saying so.
 */

import { writeFile } from 'node:fs/promises';

import { test, expect, type Page } from '@playwright/test';

import { formsOf } from '../content/battle/roster';
import { ACTIVE_CAST } from '../src/config';
import { SLOW, boot, collectErrors, leaveBedroom, playBattle, until } from './harness';

const ALLIES = ACTIVE_CAST.allies.flatMap((p) => formsOf(p).map((f) => f.id));
// `npm run test:pairs` means all of them (an npm script cannot set WW_PAIRS itself under Windows' cmd).
const WANT = process.env.WW_PAIRS ?? (process.env.npm_lifecycle_event === 'test:pairs' ? '+' : undefined);
const PAIRS = ALLIES.flatMap((a) => ACTIVE_CAST.villains.map((v) => [a, v] as const)).filter(([a, v]) => WANT && `${a}+${v}`.includes(WANT));

if (PAIRS.length === 0) {
  test('every ally × villain pair', () => {
    test.skip(true, WANT ? `WW_PAIRS=${WANT} matches no pair` : 'off unless asked for: npm run test:pairs, or WW_PAIRS=<part of ally+villain>');
  });
}

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/pairs_${name}.png` });

/**
 * Page errors, and voice lines asked for that are not there or do not decode. The
 * art-not-ready check stays off here as it always was (a change of its own).
 */
const collectProblems = (page: Page): string[] => collectErrors(page, { voice: true, art: false });

PAIRS.forEach(([ally, villain], i) => {
  test(`${ally} + ${villain}: bedroom, quest place, both battles and the victory scene`, SLOW, async ({ page }) => {
    test.setTimeout(900_000);
    const problems = collectProblems(page);
    const name = `${ally}+${villain}`;
    const cast = `ally=${ally}&villain=${villain}&seed=${i + 1}&nojourney=1`;
    const voiced: string[] = [];

    await boot(page, `?scene=bedroom&${cast}`);
    const door = await until(page, (s) => s.room?.round === 'bedroom:door', 180_000, 'the news, the quest, the door');
    expect(door.episode.ally).toBe(ally);
    expect(door.episode.villain).toBe(villain);
    // One of the ally's setup lines (item 037: drawn with the cast).
    expect(door.voice.history.some((id) => new RegExp(`^quest_${ally}_\\d$`).test(id))).toBe(true);
    expect(door.voice.history.some((id) => id.startsWith('wake_') && id.endsWith(`_bad_${villain}`))).toBe(true);
    await shot(page, `${name}_1_bedroom`);
    await leaveBedroom(page);
    const hub = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 120_000, 'circle offered');
    await shot(page, `${name}_2_hub`);
    voiced.push(...hub.voice.history);

    for (const part of [1, 2]) {
      await boot(page, `?scene=battle&part=${part}&${cast}`);
      await until(page, (s) => s.scene === 'Battle' && (s.battle?.abilitiesFired ?? 0) >= 6, 120_000, `battle ${part} under way`);
      await shot(page, `${name}_${part + 2}_battle${part}`);
      const after = await playBattle(page, part);
      // Part 2's page goes on to the recap, whose history has it all.
      if (part === 1) voiced.push(...after.voice.history);
      expect(after.battle?.ultimates).toBe(1);
    }

    const ending = await until(page, (s) => s.scene === 'Ending' && (s.ending?.said.length ?? 0) >= 2, 60_000, 'the victory scene, two lines in');
    await shot(page, `${name}_5_ending_${ending.ending!.id}`);
    const done = await until(page, (s) => s.scene !== 'Ending' || Boolean(s.ending?.done), 60_000, 'the scene done');
    expect(done.ending?.said).toEqual(done.ending?.lines);
    const victory = await until(page, (s) => s.scene === 'Victory', 30_000, 'on to the recap');
    voiced.push(...victory.voice.history);

    await writeFile(`tests/screenshots/pairs_${name}.json`, JSON.stringify({ ally, villain, ending: done.ending, voiced }, null, 1));
    expect(problems).toEqual([]);
  });
});
