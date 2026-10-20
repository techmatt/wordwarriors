/**
 * Item 054: the Stretchy Bridge. Fast lane: a visit at level 1 (the stones
 * sound as she slides, a held sound while she stands still, a wrong picture
 * sounded out, then the right one; levels saved, the words fetched); level 3
 * (silent stones, the pictures only after Dad's yes, his no replays the
 * stones); level 2 (Dad's 2 is a hint). Slow lane: a drawn episode with the
 * bridge behind door a. Screenshots land in tests/screenshots/ (ignored).
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, choose, collectErrors, dad, expectNoErrors, playBridgeRoom, playEpisode, seedProgress, slideAcross, state, stick, until, type WWState } from './harness';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/054_${name}.png` });

const bridge = (s: WWState) => s.room?.bridge;
const levels = (s: WWState) => (s.progress as unknown as { bridgeLevels: Record<string, number> }).bridgeLevels;

/** Every bridge word at help level `n`. */
async function seedLevels(page: Page, n: number): Promise<void> {
  const all = ['map', 'mop', 'mug', 'mat', 'man', 'sun', 'six', 'fan', 'fox', 'log', 'leg', 'lip', 'lid', 'net', 'nut', 'rat', 'rug', 'van', 'vet'];
  await seedProgress(page, { version: 1, bridgeLevels: Object.fromEntries(all.map((w) => [w, n])) });
}

/** Slide onto stone `i` and stop there. */
async function standOn(page: Page, i: number): Promise<WWState> {
  for (let k = 0; k < 200; k++) {
    const s = await state(page);
    if (bridge(s)?.stone === i) {
      await stick(page, 0, 0);
      return s;
    }
    await stick(page, 0.6, 0);
    await page.waitForTimeout(40);
  }
  throw new Error(`never reached stone ${i}`);
}

test('Stretchy Bridge, level 1: the stones sound as she slides, held while she stays; a wrong picture is sounded out; the word only after the right one', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=bridge');
  const s0 = await until(page, (st) => st.scene === 'BridgeRoom' && bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  expect(b0.words).toHaveLength(3);
  expect(b0.level).toBe(1);
  expect(b0.voiced).toBe(true);
  expect(b0.picturesUp).toBe(true);
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('bridge');
  // A fresh store: CVC words starting with a sound you can hold.
  for (const w of b0.words) expect('mslfnrvz').toContain(w[0]!);
  // The stones are the word's letters, upper case, one text each; the word is never one text.
  const texts = (await page.evaluate(() => (window as unknown as { __ww: { texts(): { text: string }[] } }).__ww.texts())).map((t) => t.text);
  for (const u of b0.units) expect(texts).toContain(u.toUpperCase());
  expect(texts).not.toContain(b0.word.toUpperCase());
  // Level 1 asks nothing of Dad: no cue.
  await expect(page.locator('#dad-buttons')).toHaveCount(0);

  // Onto the first stone and stand still: its sound is held.
  await standOn(page, 0);
  await until(page, (st) => bridge(st)?.holding === `letter_${b0.units[0]}_sound`, 10_000, 'first stone held');
  // The clocks run at SPEED (5x): 200 ms is a second of standing still, under BRIDGE.maxHoldMs.
  await page.waitForTimeout(200);
  expect(bridge(await state(page))!.holding).toBe(`letter_${b0.units[0]}_sound`);
  await shot(page, 'on_stone');
  // Across: every stone's sound, in order; the word itself not yet.
  await slideAcross(page);
  const far = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  const sounds = far.voice.history.filter((id) => id.startsWith('letter_'));
  expect(sounds.slice(0, b0.units.length)).toEqual(b0.units.map((u) => `letter_${u}_sound`));
  expect(far.voice.history).not.toContain(`word_${b0.word}`);
  await shot(page, 'far_bank');

  // A wrong picture: its sounds one by one, where the bridge differs, and back to the start.
  const wrong = b0.pictures.find((w) => w !== b0.word)!;
  await choose(page, wrong);
  const again = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.misses === 1, 60_000, 'sounded out, slide again');
  const since = again.voice.history.slice(again.voice.history.lastIndexOf(again.voice.history.find((id) => id.endsWith('_bridge_picked'))!));
  expect(since[0]).toMatch(/_bridge_picked$/);
  expect(since.some((id) => /_bridge_(start|middle|end)$/.test(id))).toBe(true);
  expect(since).toContain(`letter_${wrong[0]}_sound`);
  expect(again.voice.history).not.toContain(`word_${wrong}`);
  expect(again.voice.history).not.toContain(`word_${b0.word}`);
  expect(again.room!.player.x).toBeLessThan(330);

  // Again, and the right one: the word said only now, fetched; the level stays 1 after a miss.
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank again');
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  expect(s1.voice.history).toContain(`word_${b0.word}`);
  expect(s1.episode.fetched).toContain(b0.word);
  expect(levels(s1)[b0.word]).toBe(1);
  expect(s1.progress.words[b0.word]!.recent).toEqual([false]);

  // The rest right first time: up to level 2; back in the hub with every word fetched.
  await playBridgeRoom(page);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  for (const w of b0.words) expect(hub.episode.fetched).toContain(w);
  expect(levels(hub)[b0.words[1]!]).toBe(2);
  expectNoErrors(errors);
});

test('Stretchy Bridge, level 3: silent stones; the pictures only after Dad says yes; his no replays the stones with sounds', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedLevels(page, 3);
  await boot(page, '?scene=room&slot=a&room=bridge');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  expect(b0.level).toBe(3);
  expect(b0.voiced).toBe(false);
  expect(b0.picturesUp).toBe(false);
  expect(s0.room!.spots).toHaveLength(0);
  await expect(page.locator('#dad-buttons')).toBeVisible();
  const before = s0.voice.history.length;
  await slideAcross(page);
  const say = await until(page, (st) => bridge(st)?.asking === true, 60_000, 'asks Dad');
  // Silent stones: no letter sound on the way over.
  expect(say.voice.history.slice(before).filter((id) => id.startsWith('letter_'))).toEqual([]);
  expect(say.voice.history.at(-1)).toMatch(/_bridge_say$/);
  await shot(page, 'say_it');
  // Dad's no (key 1): the stones sound themselves in turn, then he is asked again.
  await page.keyboard.press('Digit1');
  const asked = await until(page, (st) => bridge(st)?.asking === true && bridge(st)!.replays === 1, 60_000, 'replayed, asks again');
  const replay = asked.voice.history.slice(say.voice.history.length);
  expect(replay.filter((id) => id.startsWith('letter_'))).toEqual(b0.units.map((u) => `letter_${u}_sound`));
  expect(asked.room!.spots).toHaveLength(0);
  // His yes (key 2): the pictures come.
  await page.keyboard.press('Digit2');
  const pick = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'pictures up');
  expect(pick.room!.spots.map((sp) => sp.id).sort()).toEqual([...b0.pictures].sort());
  expect(pick.voice.history).not.toContain(`word_${b0.word}`);
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  // A replay is help: one level more help next time.
  expect(levels(s1)[b0.word]).toBe(2);
  expectNoErrors(errors);
});

test("Stretchy Bridge, level 2: silent stones until Dad's 2, a hint that sounds them", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedLevels(page, 2);
  await boot(page, '?scene=room&slot=a&room=bridge');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  expect(b0.level).toBe(2);
  expect(b0.voiced).toBe(false);
  expect(b0.picturesUp).toBe(true);
  await dad(page, 'yes');
  const hinted = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.voiced, 60_000, 'hint given');
  expect(bridge(hinted)!.aided).toBe(true);
  expect(hinted.voice.history.filter((id) => id.startsWith('letter_'))).toEqual(b0.units.map((u) => `letter_${u}_sound`));
  // Now the stones sound as she slides.
  await slideAcross(page);
  const far = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  expect(far.voice.history.filter((id) => id.startsWith('letter_')).length).toBeGreaterThanOrEqual(b0.units.length * 2);
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  expect(levels(s1)[b0.word]).toBe(1);
  expectNoErrors(errors);
});

test('the beta: every drawn episode has a phonics room behind door a, Charge the Spell or the Stretchy Bridge', async ({ page }) => {
  test.setTimeout(60_000);
  const seen = new Set<string>();
  for (let i = 0; i < 6 && seen.size < 2; i++) {
    await boot(page, `?scene=house&seed=${30 + i}&games=all`);
    const s = await until(page, (st) => Boolean(st.episode.house.plan), 30_000, 'house plan');
    const a = s.episode.house.plan!.find((p) => p.slot === 'a')!;
    expect(['charge', 'bridge']).toContain(a.kind);
    seen.add(a.kind);
  }
  expect(seen.size).toBeGreaterThanOrEqual(1);
});

test('Stretchy Bridge in a drawn episode: behind door a, every word a battle item', SLOW, async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await boot(page, '?seed=54&games=all&room=bridge');
  const { end } = await playEpisode(page);
  const plan = end.episode.house.plan!.find((p) => p.slot === 'a')!;
  expect(plan.kind).toBe('bridge');
  for (const w of plan.fetches) expect(end.episode.read).toContain(w);
  expectNoErrors(errors);
});
