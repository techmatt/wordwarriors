/**
 * Item 107: the story fight against Evil Smaug, reached by `?fight=smaug_story`
 * (which forces him, whatever the cast). Both halves play through: the dodges
 * (she is placed on the safe spot), the sensible counter-attack pads (the
 * right word answers what he just did; a wrong pick first, which holds the
 * choice), the dodge with pads, and Dad + Julia's support move (the grab at
 * the hoard). Part 1 ends in the retreat, part 2 in victory, each moving the
 * episode on.
 */

import { test, expect, type Page } from '@playwright/test';

import { STORY_BY_ID, padBeats } from '../content/battle/stories/index';
import { REACH } from '../src/config';
import { BATTLE_SPEED, SLOW, boot, collectErrors, place, press, shotIn, until, type WWState } from './harness';

const SMAUG = STORY_BY_ID.smaug!;
const answersOf = (beat: string | null | undefined): string[] | 'gift' | null => {
  const b = [...SMAUG.part1, ...SMAUG.part2].find((x) => x.id === beat);
  const i = b?.input;
  return i && (i.kind === 'pad' || i.kind === 'dodgePads') ? i.answers : null;
};

/** Screenshots of the beats, for a look (tests/screenshots/ is ignored). */
const shot = shotIn('story');

interface Seen {
  picks: { beat: string | null; right: string; words: string[]; nearest: number }[];
  walks: { kind: string; spot: string; reached: boolean }[];
  last: WWState | null;
  misses: number;
}

/** Play a story part: each walk placed onto its spot (green at the hoard), each choice answered (the first wrong first). */
async function playStory(page: Page, part: number): Promise<Seen> {
  const seen: Seen = { picks: [], walks: [], last: null, misses: 0 };
  let wrongFirst = part === 1;
  for (;;) {
    const s = await until(page, (st) => st.scene !== 'Battle' || Boolean(st.battle?.choice?.open) || Boolean(st.battle?.story?.walk), 240_000, `story ${part}: input or end`);
    if (s.scene !== 'Battle') return seen;
    seen.last = s;
    const b = s.battle!;
    const walk = b.story?.walk;
    if (walk) {
      await shot(page, `${part}_${walk.kind}_${walk.spot.id}_a`);
      await place(page, walk.spot.x, walk.spot.y);
      await shot(page, `${part}_${walk.kind}_${walk.spot.id}_b`);
      if (walk.kind === 'grab') {
        for (let tries = 0; tries < 40; tries++) {
          const now = await until(page, () => true, 1000);
          if (!now.battle?.story?.walk) break;
          await press(page, 'green');
          await page.waitForTimeout(150);
        }
      }
      const after = await until(page, (st) => st.scene !== 'Battle' || !st.battle?.story?.walk || st.battle.story.walk.reached, 20_000, 'walk reached');
      seen.walks.push({ kind: walk.kind, spot: walk.spot.id, reached: walk.kind === 'grab' || Boolean(after.battle?.story?.walk?.reached ?? true) });
      await until(page, (st) => st.scene !== 'Battle' || !st.battle?.story?.walk, 30_000, 'walk over');
      continue;
    }
    const c = b.choice!;
    await shot(page, `${part}_pick_${b.story?.beat ?? 'none'}`);
    // Hunt 10, M54: no pad opens within her reach, so a mashed green picks nothing she has not walked to.
    const nearest = Math.min(...c.spots.map((sp) => Math.hypot(sp.x - c.from.x, sp.y - c.from.y)));
    seen.picks.push({ beat: b.story?.beat ?? null, right: c.right, words: c.words, nearest });
    const pick = async (word: string) => {
      const pad = c.spots.find((sp) => sp.word === word)!;
      for (let tries = 0; tries < 10; tries++) {
        const now = await until(page, (st) => !st.battle?.choice || st.battle.choice.open, 30_000, 'choice open again');
        if (!now.battle?.choice) return;
        const misses = now.battle.choice.misses;
        await place(page, pad.x, pad.y);
        await press(page, 'green');
        const taken = await until(page, (st) => !st.battle?.choice || st.battle.choice.misses !== misses, 2_000, 'green taken').catch(() => null);
        if (taken) return;
      }
      throw new Error(`green on ${word} never taken`);
    };
    if (wrongFirst) {
      wrongFirst = false;
      await pick(c.words.find((w) => w !== c.right)!);
      const missed = await until(page, (st) => (st.battle?.choice?.misses ?? 0) >= 1, 10_000, 'the miss counted');
      seen.misses = missed.battle!.choice!.misses;
    }
    await pick(c.right);
    await until(page, (st) => st.scene !== 'Battle' || !st.battle?.choice, 30_000, 'choice closed');
  }
}

for (const part of [1, 2] as const) {
  test(`story fight: Evil Smaug part ${part} plays through with its dodges, sensible pads${part === 1 ? ' and the support move' : ''}`, SLOW, async ({ page }) => {
    test.setTimeout(300_000);
    const problems = collectErrors(page, { voice: true });
    await boot(page, `?scene=battle&part=${part}&fight=smaug_story&nojourney=1`, BATTLE_SPEED);
    const start = await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 30_000, 'the story fight set up');
    expect(start.battle?.fight).toBe('smaug_story');
    expect(start.battle?.villains[0]?.id, '?fight=smaug_story forces Evil Smaug').toBe('smaug_evil');
    // The default cast's Ellie, and the dad who woke her, in the fight on her side.
    expect(start.battle?.heroes.map((h) => h.id)).toEqual(['julia', 'ellie', 'dada_matt']);
    // The big beats, taken alongside the play.
    const watch = (beat: string, delay: number) =>
      until(page, (s) => s.scene !== 'Battle' || s.battle?.story?.beat === beat, 240_000, beat)
        .then(async (s) => {
          if (s.scene !== 'Battle') return;
          for (const [i, d] of [delay, 1200, 1500].entries()) {
            await page.waitForTimeout(d);
            await shot(page, `${part}_${beat}_${i}`);
          }
        })
        .catch(() => undefined);
    const shots = part === 1 ? [watch('sneak', 600), watch('dive', 900)] : [watch('finale', 900)];
    // Hunt 11, M74: the gold guards charge through and topple past her, still lying there (not gone off the
    // edge) once the last of them is in, for "My guards! They all fell over!".
    const guardsDown =
      part === 1
        ? until(page, (s) => s.scene !== 'Battle' || (s.battle?.story?.beat === 'guards' && !s.battle.choice && s.battle.minions > 0), 240_000, 'the guards charge')
            .then(async (s) => {
              if (s.scene !== 'Battle') return null;
              const t0 = s.battle!.t;
              const later = await until(page, (st) => st.scene !== 'Battle' || st.battle?.story?.beat !== 'guards' || st.battle.t >= t0 + 1.6, 30_000, 'the guards in');
              return later.battle?.story?.beat === 'guards' ? later.battle.minions - s.battle!.minions : -1;
            })
            .catch(() => -2)
        : Promise.resolve(null);
    const seen = await playStory(page, part);
    await Promise.all(shots);
    const down = await guardsDown;
    if (part === 1) expect(down, 'the gold guards lie past her as Smaug says they fell over (M74)').toBe(0);
    const beats = padBeats(SMAUG, part).map((b) => b.id);
    expect(seen.picks.map((p) => p.beat)).toEqual(beats);
    for (const p of seen.picks) {
      expect(p.nearest, `${p.beat}: the nearest pad opened out of her reach (M54)`).toBeGreaterThanOrEqual(REACH);
      const answers = answersOf(p.beat);
      if (answers && answers !== 'gift') {
        expect(answers, `${p.beat}: ${p.right} answers what he did`).toContain(p.right);
        for (const w of p.words) if (w !== p.right) expect(answers).not.toContain(w);
      }
    }
    const walks = (part === 1 ? SMAUG.part1 : SMAUG.part2).flatMap((b) => (b.input?.kind === 'dodge' || b.input?.kind === 'grab' ? [`${b.input.kind}:${b.input.spot}`] : []));
    expect(seen.walks.map((w) => `${w.kind}:${w.spot}`)).toEqual(walks);
    expect(seen.walks.every((w) => w.reached)).toBe(true);
    if (part === 1) expect(seen.misses, 'a wrong pick holds the choice').toBe(1);
    // No health bars: the stage draws its own HUD, and it is nothing.
    expect(seen.last?.battle?.stage.story).toBe(true);
    expect(seen.last?.battle?.ultimates ?? 0).toBeLessThanOrEqual(1);
    // The part ended and the episode moved on.
    const end = await until(page, (s) => s.scene !== 'Battle', 30_000, 'the battle over');
    expect(end.scene).not.toBe('Battle');
    expect(problems).toEqual([]);
  });
}

test('story fight: with no ally the dad who woke her fights beside her; with a dad as the ally he is Dad', SLOW, async ({ page }) => {
  test.setTimeout(300_000);
  const problems = collectErrors(page, { voice: true });
  for (const [ally, heroes] of [
    ['none', ['julia', 'dada_matt']],
    ['dada_jason', ['julia', 'dada_jason']],
  ] as const) {
    await boot(page, `?scene=battle&part=2&fight=smaug_story&ally=${ally}&battle=short&nojourney=1`, BATTLE_SPEED);
    const start = await until(page, (s) => s.scene === 'Battle' && Boolean(s.battle), 30_000, `${ally}: set up`);
    expect(start.battle?.heroes.map((h) => h.id), `ally=${ally}`).toEqual([...heroes]);
    const seen = await playStory(page, 2);
    expect(seen.picks.length, `ally=${ally}: every pad beat`).toBe(1);
    await until(page, (s) => s.scene !== 'Battle', 30_000, `${ally}: the battle over`);
  }
  expect(problems).toEqual([]);
});
