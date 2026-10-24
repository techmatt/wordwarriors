/**
 * Item 139: the rhyme room. Untagged (a whole visit): one room through its
 * `?scene=` jump at base level, three rounds of three families, a wrong pick
 * on the first (the rhyme said again, no penalty), the printed word never said
 * before she has it but in the miss's "Listen: bug, hug, rug!", every word
 * fetched.
 */

import { test, expect, type Page } from '@playwright/test';

import { bagged, boot, choose, collectErrors, expectNoErrors, until, type WWState } from './harness';
import { wordLine } from '../content/voice/ids';
import { soundOut } from '../src/rules/soundOut';

const rhyme = (s: WWState) => s.room?.rhyme;
/** Screenshots land in tests/screenshots/ (ignored). */
const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/139_${name}.png` });

test('rhyme room at base level: three rounds, each a family, the rhyme said, the word sounded out, a miss rhymed again', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=rhyme');
  const s0 = await until(page, (st) => st.scene === 'RhymeRoom' && rhyme(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'first round');
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('rhyme');
  const words = rhyme(s0)!.words;
  expect(words.length).toBe(3);
  const rimes = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const s = await until(page, (st) => rhyme(st)?.index === i && rhyme(st)!.phase === 'pick' && !st.room!.locked, 60_000, `round ${i}`);
    const r = rhyme(s)!;
    rimes.add(r.rime);
    expect(r.level).toBe(1);
    // Level 1: the two rhyming words said, the printed one sounded out for her, never said.
    expect(r.sounded).toBe(true);
    for (const w of r.shown) expect(s.voice.history).toContain(wordLine(w));
    // Hunt 11: "These words sound the same at the end!" once the two cards are up and said, not to an empty wall.
    if (i === 0) {
      const intro = s.voice.history.findIndex((id) => id.endsWith('_rhyme_intro'));
      expect(intro, 'the intro after both cards').toBeGreaterThan(s.voice.history.indexOf(wordLine(r.shown[1]!)));
    }
    for (const step of soundOut(r.word)) if (step.id) expect(s.voice.history).toContain(step.id);
    expect(s.voice.history).not.toContain(wordLine(r.word));
    expect(s.room!.spots.map((sp) => sp.id).sort()).toEqual([...r.options].sort());
    expect(s.room!.spots.find((sp) => sp.correct)!.id).toBe(r.word);
    if (i === 0) {
      await shot(page, 'round');
      const wrong = s.room!.spots.find((sp) => sp.correct === false)!.id;
      await choose(page, wrong);
      const again = await until(page, (st) => rhyme(st)!.phase === 'pick' && !st.room!.locked && rhyme(st)!.misses === 1, 60_000, 'miss rhymed again');
      const since = again.voice.history.slice(s.voice.history.length);
      // "Bug, hug... sun? Listen: bug, hug, rug!"
      expect(since).toEqual(expect.arrayContaining([wordLine(r.shown[0]!), wordLine(r.shown[1]!), wordLine(wrong), wordLine(r.word)]));
      expect(since.indexOf(wordLine(wrong))).toBeLessThan(since.indexOf(wordLine(r.word)));
      expect(since.some((id) => id.endsWith('_rhyme_listen'))).toBe(true);
      expect(since.filter((id) => id.startsWith('letter_'))).toEqual([]);
    }
    await choose(page);
    if (i === words.length - 1) {
      // The last row stays up, its third picture in place, as the visit ends.
      const done = await until(page, (st) => rhyme(st)?.phase === 'done', 60_000, 'the last row');
      // Hunt 11: the landed picture's place is a card like the other two, not the faint question frame.
      expect(rhyme(done)!.thirdCard).toBeGreaterThan(0.9);
      await shot(page, 'done');
    }
    const after = await until(page, (st) => st.scene !== 'RhymeRoom' || (rhyme(st)?.index ?? 0) > i || rhyme(st)?.phase === 'done', 60_000, `${r.word} read`);
    expect(after.voice.history).toContain(wordLine(r.word));
    expect(after.episode.read).toContain(r.word);
  }
  expect(rimes.size).toBe(3);
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  for (const w of bagged(words)) expect(hub.episode.fetched).toContain(w);
  // A miss keeps the word at level 1; right first time, unaided, steps up.
  expect(Object.values(hub.progress.rhymeLevels ?? {}).sort()).toEqual([1, 2, 2]);
  expectNoErrors(errors);
});
