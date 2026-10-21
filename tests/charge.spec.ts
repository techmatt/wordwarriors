/**
 * Item 053: Charge the Spell and the dad buttons; item 058: one word a visit;
 * item 059: no presses per rune (the helper says each sound, she says it
 * back), one Dad press on the read. Fast lane: a round with Dad's 1 on the
 * read (sounded out together), timed, and the word a battle item. Slow lane:
 * the runes fired in battle; the forced room in a drawn episode, F4 as Dad's
 * yes on the read only (both moved in item 061, 10-13 s each); a round with
 * Dad's real key 2, nothing asked before the read; dad lock (the say-back
 * beat waits, the keys stay live) and the read's timeout. Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, dad, expectNoErrors, playEpisode, press, state, until } from './harness';
import { CHARGE_WORDS } from '../src/rules/charge';

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/053_${name}.png` });

test('Charge the Spell: the runes charge by themselves, each sound said; one press, Dad\'s key 2, on the read', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const c0 = s0.room!.charge!;
  // Item 058: one word of 3-4 sound units, its runes its sounds in order.
  expect(c0.runes.length).toBeGreaterThanOrEqual(3);
  expect(c0.runes.length).toBeLessThanOrEqual(4);
  // A fresh store: any charge word (item 067: every sound in play, no tiers).
  expect(CHARGE_WORDS).toContain(c0.word);
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('charge');
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.fetches).toEqual([c0.word]);
  // Rune 0 is said, then her beat to say it back; Dad is not asked and green is not needed.
  const r0 = c0.runes[0]!;
  const b0 = await until(page, (st) => st.room?.charge?.index === 0 && st.room.charge.phase === 'sayback', 60_000, 'rune 0 said back');
  expect(b0.voice.history).toContain(`letter_${r0}_sound`);
  expect(b0.room!.charge!.asking).toBe(false);
  // The word is at the top from the start, but never said.
  expect(b0.voice.history).not.toContain(`word_${c0.word}`);
  // The rune is upper case on the altar; the sound is never captioned (no text shows its placeholder).
  const texts = (await page.evaluate(() => (window as unknown as { __ww: { texts(): { text: string }[] } }).__ww.texts())).map((t) => t.text);
  expect(texts).toContain(r0.toUpperCase());
  for (const r of c0.runes) expect(texts).toContain(r.toUpperCase());
  await shot(page, 'sayback');
  // Every rune charges by itself, each sound said, and only then is Dad asked.
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  expect(read.room!.charge!.charged).toEqual(c0.runes);
  for (const r of c0.runes) expect(read.voice.history).toContain(`letter_${r}_sound`);
  expect(read.room!.charge!.asking).toBe(true);
  await expect(page.locator('#dad-buttons')).toBeVisible();
  await page.keyboard.press('Digit2');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.charged).toEqual({ sounds: c0.runes, part: 1 });
  // The word is a battle item, and read right; its sounds with it.
  expect(hub.episode.fetched).toEqual([c0.word]);
  expect(hub.episode.read).toEqual([c0.word]);
  expect(hub.progress.words[c0.word]!.recent).toEqual([true]);
  expect(hub.progress.sounds[r0]!.recent).toEqual([true]);
  await expect(page.locator('#dad-buttons')).toHaveCount(0);
  expectNoErrors(errors);
});

test('Charge the Spell: dad lock holds the say-back beat; nothing from Dad on the read for 10 s sounds it out together', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  await until(page, (st) => st.room?.charge?.index === 0 && st.room.charge.phase === 'sayback', 60_000, 'rune 0 said back');
  const lock = (on: boolean) => page.evaluate((v) => (window as unknown as { __ww: { dadLock(on?: boolean): boolean } }).__ww.dadLock(v), on);
  await lock(true);
  await page.waitForTimeout(3000);
  const held = await state(page);
  expect(held.room!.charge!.index).toBe(0);
  expect(held.room!.charge!.phase).toBe('sayback');
  await lock(false);
  await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  // Nobody answers: after the timeout it is sounded out together, and fetched all the same.
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'timed out, back in the hub');
  expect(hub.voice.history.some((id) => id.endsWith('_charge_together'))).toBe(true);
  expect(hub.episode.fetched).toHaveLength(1);
  expectNoErrors(errors);
});

test('Charge the Spell (item 059): a snappy round spells its word; Dad\'s 1 on the read sounds it out together and it is a battle item all the same', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const { word, runes } = s0.room!.charge!;
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  const toRead = read.room!.charge!.readAtMs;
  // Nothing was pressed and nothing asked before the read.
  expect(read.room!.charge!.charged).toEqual(runes);
  await dad(page, 'no');
  let ms = 0;
  const hub = await until(page, (st) => {
    if (st.room?.charge) ms = st.room.charge.elapsedMs;
    return st.scene === 'Hub';
  }, 30_000, 'back in the hub');
  // Sounded out once, unit by unit, then the word said; no fail state: it is fetched, recorded as a miss.
  const h = hub.voice.history;
  const at = h.lastIndexOf(narratorLineEnd(h, '_charge_together'));
  expect(at).toBeGreaterThan(-1);
  expect(h.slice(at + 1, at + 1 + runes.length)).toEqual(runes.map((r) => `letter_${r}_sound`));
  expect(h.indexOf(`word_${word}`)).toBeGreaterThan(at);
  expect(hub.episode.fetched).toEqual([word]);
  expect(hub.episode.charged?.sounds).toEqual(runes);
  expect(hub.progress.words[word]!.recent).toEqual([false]);
  // About 20 s a round (item 059), in game time (the scene's clock; the test's own runs SPEED times
  // fast): to the read under 22 s (about 17 s for 3 runes, 21 s for 4), the whole round with
  // Dad's 1 and the sounding out together under 32 s.
  console.log(`charge round: ${word} (${runes.length} runes), ${toRead / 1000} s to the read, ${ms / 1000} s in all (game time)`);
  expect(toRead).toBeLessThan(22_000);
  expect(ms).toBeLessThan(32_000);
  expectNoErrors(errors);
});

/** The last line id in `h` ending with `suffix` (a narrator line, whoever narrates). */
function narratorLineEnd(h: string[], suffix: string): string {
  return [...h].reverse().find((id) => id.endsWith(suffix)) ?? '';
}

test('Charge the Spell: the charged runes fire as her hero\'s moves in the next battle', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&charged=m,s,a&nojourney=1');
  // Every frame: which rune had popped up when each letter sound began (item 069: each sound came a rune late).
  await page.evaluate(() => {
    const w = window as unknown as { __ww: { state(): { voice: { speaking: string | null }; battle: { runesFired: number } | null } }; __runeAt: Record<string, number> };
    w.__runeAt = {};
    const tick = () => {
      const st = w.__ww.state();
      const id = st.voice.speaking;
      if (id?.startsWith('letter_') && !(id in w.__runeAt)) w.__runeAt[id] = st.battle?.runesFired ?? -1;
      requestAnimationFrame(tick);
    };
    tick();
  });
  await until(page, (st) => st.scene === 'Battle' && (st.battle?.runesFired ?? 0) === 3, 60_000, 'three runes fired');
  const s = await until(page, (st) => ['m', 's', 'a'].every((r) => st.voice.history.includes(`letter_${r}_sound`)), 60_000, 'the runes said');
  expect(s.voice.history.some((id) => id.endsWith('_use_runes'))).toBe(true);
  // Each rune's sound is said while its own stone is up: the nth sound as the nth rune fires.
  const at = await page.evaluate(() => (window as unknown as { __runeAt: Record<string, number> }).__runeAt);
  expect(at).toEqual({ letter_m_sound: 1, letter_s_sound: 2, letter_a_sound: 3 });
  await shot(page, 'battle');
  expectNoErrors(errors);
});

test('Charge the Spell: the beta forces it behind a door of a drawn episode; F4 is Dad\'s yes on the read only', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // `games=all`: no test pool, so FORCE_PHONICS_ROOM puts a phonics room behind door a;
  // since item 054 it is this or the Stretchy Bridge at random, so `room=charge` pins it.
  await boot(page, '?scene=room&slot=a&seed=7&games=all&room=charge');
  const s = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 30_000, 'the forced charge room');
  expect(s.episode.house.plan!.filter((p) => p.kind === 'charge')).toHaveLength(1);
  // Dad's yes before the read does nothing (item 053 review: it charged an unseen rune).
  await until(page, (st) => st.room?.charge?.phase === 'explain', 30_000, 'explaining');
  await dad(page, 'yes');
  await page.keyboard.press('F4');
  const r = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  expect(r.room!.charge!.read).toBeNull();
  await page.keyboard.press('F4');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'F4 read it');
  expect(hub.progress.words[r.room!.charge!.word]!.recent).toEqual([true]);
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
