/**
 * Item 053: Charge the Spell and the dad buttons; item 058: one word a visit.
 * Fast lane: a short visit spelling its word, read with Dad's 1 (sounded out)
 * and the word a battle item; the runes fired in battle; the forced room in a
 * drawn episode, F4 as Dad's yes. Slow lane: a
 * visit played with Dad's real keys (2 yes, 1 no) and the hooks, the help
 * levels moving and saved, the cue in the corner; the timeout and dad lock
 * (the keys stay live, the timeout waits). Screenshots land in
 * tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, choose, collectErrors, dad, expectNoErrors, playChargeRoom, playEpisode, press, seedProgress, state, until } from './harness';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/053_${name}.png` });

/** Every rune at help level 3 (the rune alone): asks come straight away. */
const LEVEL3 = Object.fromEntries([...'mesfalnrvziou', ...'tpbdckghjwy', 'sh', 'ch', 'th'].map((s) => [s, 3]));

test('Charge the Spell: walk to the altar, Dad says yes with key 2, no with key 1; levels move and are saved', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && st.room?.charge?.phase === 'approach' && !st.room.locked, 60_000, 'altar offered');
  const c0 = s0.room!.charge!;
  // Item 058: one word of 3-4 sound units, its runes its sounds in order.
  expect(c0.runes.length).toBeGreaterThanOrEqual(3);
  expect(c0.runes.length).toBeLessThanOrEqual(4);
  // A fresh store: a word of continuous sounds (M S F A L N R V Z, the short vowels).
  for (const r of c0.runes) expect('mesfalnrvziou').toContain(r);
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('charge');
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.fetches).toEqual([c0.word]);
  // The cue is up: the room asks Dad.
  await expect(page.locator('#dad-buttons')).toBeVisible();
  await choose(page, 'altar');

  // Rune 0, level 1: the helper shows the gesture and says the sound first (no gesture sentence), then asks.
  const r0 = c0.runes[0]!;
  const a0 = await until(page, (st) => st.room?.charge?.index === 0 && Boolean(st.room.charge.asking), 60_000, 'rune 0 asks');
  expect(a0.room!.charge!.level).toBe(1);
  expect(a0.voice.history.some((id) => id.includes('_charge_gesture_'))).toBe(false);
  expect(a0.voice.history).toContain(`letter_${r0}_sound`);
  // The word is at the top from the start, but never said.
  expect(a0.voice.history).not.toContain(`word_${c0.word}`);
  // The rune is upper case on the altar; the sound is never captioned (no text shows its placeholder).
  const texts = (await page.evaluate(() => (window as unknown as { __ww: { texts(): { text: string }[] } }).__ww.texts())).map((t) => t.text);
  expect(texts).toContain(r0.toUpperCase());
  for (const r of c0.runes) expect(texts).toContain(r.toUpperCase());
  await shot(page, 'asking');
  // Dad's real key: 2 is yes.
  await page.keyboard.press('Digit2');
  const c1 = await until(page, (st) => st.room?.charge?.index === 1, 60_000, 'rune 0 charged');
  expect(c1.room!.charge!.charged).toEqual([r0]);
  expect(c1.progress.sounds[r0]!.recent).toEqual([true]);

  // Rune 1: key 1 is no. The helper helps (gesture and sound), asks again; then a yes.
  const r1 = c0.runes[1]!;
  await until(page, (st) => st.room?.charge?.index === 1 && Boolean(st.room.charge.asking), 60_000, 'rune 1 asks');
  await page.keyboard.press('Digit1');
  const helped = await until(page, (st) => st.room?.charge?.assists === 1 && Boolean(st.room.charge.asking), 60_000, 'helped, asks again');
  expect(helped.voice.history.filter((id) => id === `letter_${r1}_sound`).length).toBeGreaterThanOrEqual(2);
  await dad(page, 'yes');
  const c2 = await until(page, (st) => st.room?.charge?.index === 2, 60_000, 'rune 1 charged');
  expect(c2.progress.sounds[r1]!.recent).toEqual([false]);
  // The ramp: an unaided yes is less help next time; a helped one stays at the most help.
  expect((c2.progress as unknown as { chargeLevels: Record<string, number> }).chargeLevels).toMatchObject({ [r0]: 2, [r1]: 1 });

  // The rest, the word read with Dad's 2, and back to the hub with the door done and its runes kept for the battle.
  await playChargeRoom(page);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.charged).toEqual({ sounds: c0.runes, part: 1 });
  // The word is a battle item, and read right.
  expect(hub.episode.fetched).toEqual([c0.word]);
  expect(hub.episode.read).toEqual([c0.word]);
  expect(hub.progress.words[c0.word]!.recent).toEqual([true]);
  // Letter sounds were never shown as text (their placeholder spellings: Mmm, Suh...).
  await expect(page.locator('#dad-buttons')).toHaveCount(0);
  expectNoErrors(errors);
});

test('Charge the Spell: nothing for 8 s helps; under dad lock the keys still work and the timeout waits', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedProgress(page, { version: 1, chargeLevels: LEVEL3 });
  await boot(page, '?scene=room&slot=a&room=charge');
  await until(page, (st) => st.room?.charge?.phase === 'approach' && !st.room.locked, 60_000, 'altar offered');
  await choose(page, 'altar');
  const a0 = await until(page, (st) => st.room?.charge?.index === 0 && Boolean(st.room.charge.asking), 60_000, 'rune 0 asks');
  expect(a0.room!.charge!.level).toBe(3);
  // Level 3: the rune alone, no gesture before the ask.
  expect(a0.voice.history.some((id) => id.includes('_charge_gesture_'))).toBe(false);
  // Dad lock: well past the timeout (8 s of game time, at the test's speed) and still asking, unhelped.
  await page.evaluate(() => (window as unknown as { __ww: { dadLock(on?: boolean): boolean } }).__ww.dadLock(true));
  await page.waitForTimeout(3500);
  const held = await state(page);
  expect(held.room!.charge!.asking).toBe(true);
  expect(held.room!.charge!.assists).toBe(0);
  // ...but Dad's key still works under the lock.
  await page.keyboard.press('Digit2');
  await until(page, (st) => st.room?.charge?.index === 1, 60_000, 'rune 0 charged under dad lock');
  await page.evaluate(() => (window as unknown as { __ww: { dadLock(on?: boolean): boolean } }).__ww.dadLock(false));
  // Rune 1: nobody answers. After the timeout the helper helps and asks again.
  await until(page, (st) => st.room?.charge?.index === 1 && Boolean(st.room.charge.asking), 60_000, 'rune 1 asks');
  const out = await until(page, (st) => (st.room?.charge?.timeouts ?? 0) >= 1 && Boolean(st.room?.charge?.asking), 60_000, 'timed out, helped, asks again');
  expect(out.room!.charge!.assists).toBe(1);
  expect(out.voice.history).toContain(`letter_${out.room!.charge!.sound}_sound`);
  // After enough help it says it together and moves on: it never gets stuck.
  await until(page, (st) => (st.room?.charge?.index ?? 0) >= 2, 90_000, 'moved on after the help ran out');
  const after = await state(page);
  expect(after.voice.history.some((id) => id.endsWith('_charge_together'))).toBe(true);
  expect(after.room!.charge!.charged).toHaveLength(2);
  expectNoErrors(errors);
});

test('Charge the Spell (item 058): a short round spells its word; Dad\'s 1 on the read sounds it out once and it is a battle item all the same', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedProgress(page, { version: 1, chargeLevels: LEVEL3 });
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.room?.charge?.phase === 'approach' && !st.room.locked, 60_000, 'altar offered');
  const { word, runes } = s0.room!.charge!;
  const t0 = Date.now();
  await playChargeRoom(page, false, 'no');
  const ms = Date.now() - t0;
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  // Sounded out once, unit by unit, then the word said; no fail state: it is fetched, recorded as a miss.
  const h = hub.voice.history;
  const at = h.lastIndexOf(narratorLineEnd(h, '_charge_listen'));
  expect(at).toBeGreaterThan(-1);
  expect(h.slice(at + 1, at + 1 + runes.length)).toEqual(runes.map((r) => `letter_${r}_sound`));
  expect(h.indexOf(`word_${word}`)).toBeGreaterThan(at);
  expect(hub.episode.fetched).toEqual([word]);
  expect(hub.episode.charged?.sounds).toEqual(runes);
  expect(hub.progress.words[word]!.recent).toEqual([false]);
  // Well under a minute with Dad answering at once (the test clock may run faster than play).
  console.log(`charge round: ${word}, ${ms} ms`);
  expect(ms).toBeLessThan(60_000);
  expectNoErrors(errors);
});

/** The last line id in `h` ending with `suffix` (a narrator line, whoever narrates). */
function narratorLineEnd(h: string[], suffix: string): string {
  return [...h].reverse().find((id) => id.endsWith(suffix)) ?? '';
}

test('Charge the Spell: the charged runes fire as her hero\'s moves in the next battle', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&charged=m,s,a&nojourney=1');
  await until(page, (st) => st.scene === 'Battle' && (st.battle?.runesFired ?? 0) === 3, 60_000, 'three runes fired');
  // Each rune's sound is said as it fires (queued behind the battle's opening lines).
  const s = await until(page, (st) => ['m', 's', 'a'].every((r) => st.voice.history.includes(`letter_${r}_sound`)), 60_000, 'the runes said');
  expect(s.voice.history.some((id) => id.endsWith('_use_runes'))).toBe(true);
  await shot(page, 'battle');
  expectNoErrors(errors);
});

test('Charge the Spell: the beta forces it behind a door of a drawn episode; F4 is Dad\'s yes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // `games=all`: no test pool, so FORCE_PHONICS_ROOM puts a phonics room behind door a;
  // since item 054 it is this or the Stretchy Bridge at random, so `room=charge` pins it.
  await boot(page, '?scene=room&slot=a&seed=7&games=all&room=charge');
  const s = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 30_000, 'the forced charge room');
  expect(s.episode.house.plan!.filter((p) => p.kind === 'charge')).toHaveLength(1);
  await until(page, (st) => st.room?.charge?.phase === 'approach' && !st.room.locked, 60_000, 'altar offered');
  await page.keyboard.press('F4');
  // Dad's yes while the helper explains (no rune lit yet) does nothing (item 053 review: it charged an unseen rune).
  await until(page, (st) => st.room?.charge?.phase === 'explain', 30_000, 'explaining');
  await dad(page, 'yes');
  const a0 = await until(page, (st) => st.room?.charge?.index === 0 && Boolean(st.room.charge.asking), 60_000, 'rune 0 asks');
  expect(a0.room!.charge!.charged).toEqual([]);
  expect(a0.progress.sounds[a0.room!.charge!.sound]).toBeUndefined();
  await page.keyboard.press('F4');
  await until(page, (st) => (st.room?.charge?.index ?? 0) === 1, 60_000, 'F4 charged rune 0');
  expectNoErrors(errors);
});

test('the beta: a whole drawn episode with Charge the Spell forced behind door a', SLOW, async ({ page }) => {
  test.setTimeout(900_000);
  const errors = collectErrors(page);
  // `games=all` is the real draw, so FORCE_PHONICS_ROOM applies; playEpisode checks each battle's length.
  // Charge the Spell or the Stretchy Bridge at random since item 054: `room=charge` pins it.
  await boot(page, '?games=all&seed=19&nojourney=1&room=charge');
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  const { end } = await playEpisode(page);
  const plan = end.episode.house.plan ?? [];
  expect(plan.find((p) => p.slot === 'a')!.kind).toBe('charge');
  const word = (plan.find((p) => p.slot === 'a') as { key: string }).key;
  // Every unit of a charge word is its own rune, so the runes spell it.
  expect(end.episode.charged?.sounds.join('')).toBe(word);
  expect(end.episode.fetched).toContain(word);
  expect(end.episode.charged?.part).toBe(1);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expectNoErrors(errors);
});
