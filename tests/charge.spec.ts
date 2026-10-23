/**
 * Item 053: Charge the Spell and the dad buttons; item 058: one word a visit;
 * item 059: no presses per rune (the helper says each sound, she says it
 * back), one Dad press on the read. Untagged (`npm run test:browser`): a round with Dad's 1 on the
 * read (sounded out together), timed, and the word a battle item. Slow lane:
 * the runes fired in battle; the forced room in a drawn episode, F4 as Dad's
 * yes on the read only (both moved in item 061, 10-13 s each); a round with
 * Dad's real key 2, nothing asked before the read; dad lock (the say-back
 * beat waits, the keys stay live) and the read's timeout, which goes solo
 * (item 106: read with the helper, modelled). Untagged too: solo from the
 * start, Dad's 2 mid-room switching back. Its whole drawn
 * episodes are the soak's (tests/soak.spec.ts, item 081). Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, dad, dadLock, expectNoErrors, state, texts, until } from './harness';
import { qaLayout } from './qa/probe';
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
  // The word's units are upper case in the bar at the top (the altar shows the rune's picture letter);
  // the sound is never captioned (no text shows its placeholder).
  const shown = (await texts(page)).map((t) => t.text);
  for (const r of c0.runes) expect(shown).toContain(r.toUpperCase());
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

test('Charge the Spell: dad lock holds the say-back beat; no 1 / 2 at all (item 106): the read goes solo, read together, recorded as modelled', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.room?.charge?.index === 0 && st.room.charge.phase === 'sayback', 60_000, 'rune 0 said back');
  const { word, runes } = s0.room!.charge!;
  expect(s0.room!.charge!.solo).toBe(false);
  await dadLock(page, true);
  await page.waitForTimeout(3000);
  const held = await state(page);
  expect(held.room!.charge!.index).toBe(0);
  expect(held.room!.charge!.phase).toBe('sayback');
  await dadLock(page, false);
  await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  // Nobody answers: after DAD_AWAY_MS the helper reads it with her, and the room finishes.
  const solo = await until(page, (st) => st.room?.charge?.read === 'modelled', 60_000, 'gone solo');
  expect(solo.room!.charge!.solo).toBe(true);
  expect(solo.room!.charge!.timeouts).toBe(1);
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'read together, back in the hub');
  const h = hub.voice.history;
  const at = h.lastIndexOf(narratorLineEnd(h, '_charge_read_together'));
  expect(at).toBeGreaterThan(-1);
  expect(h.slice(at + 1, at + 1 + runes.length)).toEqual(runes.map((r) => `letter_${r}_sound`));
  expect(h.indexOf(`word_${word}`)).toBeGreaterThan(at);
  // Nothing about Dad, no "sound it out together" miss.
  expect(h.some((id) => id.endsWith('_charge_together'))).toBe(false);
  // Fetched and done all the same; in the store modelled, never her read: no seen, no recent, so no shakiness moves.
  expect(hub.episode.fetched).toEqual([word]);
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.solo).toBe(true);
  expect(hub.progress.words[word]).toMatchObject({ seen: 0, recent: [], modelled: 1 });
  for (const r of runes) expect(hub.progress.sounds[r], r).toMatchObject({ seen: 0, recent: [], modelled: 1 });
  expectNoErrors(errors);
});

test('Charge the Spell (item 106): solo, the helper says each sound with her; Dad\'s 2 mid-room switches back, and the read asks him', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&solo=1');
  const withMe = (id: string) => /_charge_with_me(_\d+)?$/.test(id);
  const s0 = await until(page, (st) => st.room?.charge?.index === 0 && st.voice.history.some(withMe), 60_000, 'rune 0 said with her');
  const { word, runes } = s0.room!.charge!;
  expect(s0.room!.charge!.solo).toBe(true);
  expect(s0.voice.history.some((id) => id.endsWith('_charge_explain_solo'))).toBe(true);
  // Dad is here after all: his 2 during the first rune (not the last, so it is no early read) ends solo.
  await dad(page, 'yes');
  // The room's hooks are published each frame: wait a frame for them, the episode's flag is already off.
  const s1 = await until(page, (st) => st.room?.charge?.solo === false, 5_000, 'solo off');
  expect(s1.episode.solo).toBe(false);
  // The runes after it get the normal say-back beat, no "with me" (the press lands in rune 0, or rune 1 on a slow poll).
  const said = s1.voice.history.filter(withMe).length;
  expect(said).toBeLessThan(runes.length);
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read, Dad asked');
  expect(read.voice.history.filter(withMe)).toHaveLength(said);
  expect(read.room!.charge!.asking).toBe(true);
  await dad(page, 'yes');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  // His yes is her read; the rune said with the helper is modelled as well.
  expect(hub.progress.words[word]!.recent).toEqual([true]);
  expect(hub.progress.words[word]!.modelled).toBeUndefined();
  expect(hub.progress.sounds[runes[0]!]).toMatchObject({ recent: [true], modelled: 1 });
  expect(hub.progress.sounds[runes[runes.length - 1]!]!.modelled).toBeUndefined();
  expectNoErrors(errors);
});

test('Charge the Spell (item 059): a snappy round spells its word; Dad\'s 1 on the read sounds it out together and it is a battle item all the same', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&qa=1');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const { word, runes } = s0.room!.charge!;
  // She stands beside the altar, not inside it (item 069: the altar was drawn over her arm and dress all round).
  const l = await qaLayout(page);
  const altar = l.images.find((im) => im.key === 'prop_rune_altar')!;
  expect(s0.room!.player.x).toBeLessThan(altar.b[0]);
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  const toRead = read.room!.charge!.readAtMs;
  // Nothing was pressed and nothing asked before the read.
  expect(read.room!.charge!.charged).toEqual(runes);
  // Every frame from here: when each letter sound starts and stops (game clock), for the gaps below.
  await page.evaluate(() => {
    const w = window as unknown as { __ww: { state(): { voice: { speaking: string | null } } }; __sounds: { id: string; from: number; to: number }[] };
    w.__sounds = [];
    let cur: { id: string; from: number; to: number } | null = null;
    const tick = () => {
      const id = w.__ww.state().voice.speaking;
      const now = performance.now();
      if (cur && cur.id !== id) cur = null;
      if (!cur && id?.startsWith('letter_')) w.__sounds.push((cur = { id, from: now, to: now }));
      if (cur) cur.to = now;
      requestAnimationFrame(tick);
    };
    tick();
  });
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
  // A beat between the sounds, never back to back (item 069: they ran toward a blend).
  const sounds = await page.evaluate(() => (window as unknown as { __sounds: { id: string; from: number; to: number }[] }).__sounds);
  const together = sounds.slice(-runes.length);
  expect(together.map((x) => x.id)).toEqual(runes.map((r) => `letter_${r}_sound`));
  for (let i = 1; i < together.length; i++) expect(together[i]!.from - together[i - 1]!.to, `gap before ${together[i]!.id}`).toBeGreaterThan(250);
  expect(hub.episode.fetched).toEqual([word]);
  expect(hub.episode.charged?.sounds).toEqual(runes);
  expect(hub.progress.words[word]!.recent).toEqual([false]);
  // About 20 s a round (item 059), in game time (the scene's clock; the test's own runs SPEED times
  // fast): to the read under 22 s (about 17 s for 3 runes, 21 s for 4), the whole round with
  // Dad's 1 and the sounding out together under 32 s.
  // Asserted only by a one-worker timing run (`--workers=1`, item 072): beside other workers the
  // load stretches the game time past the limits, so the multi-worker lanes log it and go on.
  const timing = `charge round: ${word} (${runes.length} runes), ${toRead / 1000} s to the read, ${ms / 1000} s in all (game time)`;
  console.log(timing);
  if (test.info().config.workers === 1) {
    expect(toRead).toBeLessThan(22_000);
    expect(ms).toBeLessThan(32_000);
  } else {
    test.info().annotations.push({ type: 'timing', description: `${timing}; limits asserted only with --workers=1` });
  }
  expectNoErrors(errors);
});

test('Charge the Spell (M24): Dad\'s 2 pressed during the last rune is kept, and counts as the read is asked; the stone and its door show picture letters', async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&qa=1');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const { word, runes } = s0.room!.charge!;
  const last = runes.length - 1;
  await until(page, (st) => st.room?.charge?.index === last && st.room.charge.phase === 'sayback', 60_000, 'the last rune said back');
  // Dad lock holds the beat (his keys stay live): under a busy lane the 1.2 s beat (0.24 s at SPEED) ran out
  // during the layout check below, and the 2 landed after the read was asked (item 106).
  await dadLock(page, true);
  // Item 103: the stone shows the rune's picture letter, big on its face, no painted letter.
  const room = await qaLayout(page);
  const stone = room.images.find((im) => im.key === 'prop_rune_stone')!;
  const pic = room.images.find((im) => im.key === `rune_${runes[last]}`);
  expect(pic, 'the picture letter on the stone').toBeTruthy();
  expect(pic!.b[3] - pic!.b[1]).toBeGreaterThanOrEqual(120);
  expect(pic!.b[0]).toBeGreaterThanOrEqual(stone.b[0] - 10);
  expect(pic!.b[2]).toBeLessThanOrEqual(stone.b[2] + 10);
  expect(room.texts.some((t) => t.text === runes[last]!.toUpperCase() && t.size > 100)).toBe(false);
  await shot(page, 'picture_rune');
  await page.keyboard.press('Digit2');
  await dadLock(page, false);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  // Its door wears the stone with the word's first rune as a picture letter.
  await page.waitForTimeout(600);
  expect((await qaLayout(page)).images.some((im) => im.scene === 'Hub' && im.key === `rune_${runes[0]}`)).toBe(true);
  await shot(page, 'picture_rune_door');
  // Read right on his early 2: never asked again, never timed out, never sounded out together.
  expect(hub.progress.words[word]!.recent).toEqual([true]);
  expect(hub.episode.read).toEqual([word]);
  const h = hub.voice.history;
  expect(h.some((id) => id.endsWith('_charge_read'))).toBe(false);
  expect(h.some((id) => id.endsWith('_charge_together'))).toBe(false);
  expect(h).toContain(`word_${word}`);
  expectNoErrors(errors);
});

/** The last line id in `h` ending with `suffix` (a narrator line, whoever narrates). */
function narratorLineEnd(h: string[], suffix: string): string {
  return [...h].reverse().find((id) => id.endsWith(suffix)) ?? '';
}

test('Charge the Spell: the charged runes fire as her hero\'s moves in the next battle', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // Real voice (item 085): under instant voice a line ends once any `state()` sees it, so the
  // harness's own polling could swallow M's sound before the frame sampler below saw it.
  await boot(page, '?scene=battle&part=1&battle=short&charged=m,s,a&nojourney=1', undefined, { voice: 'real' });
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
  // Each rune's sound starts as its own stone pops up, just before that rune fires (runesFired counts the ones before it).
  // Before the fix the sounds queued behind the use-runes line and came a rune or two late (about 2, 3, 3).
  const at = await page.evaluate(() => (window as unknown as { __runeAt: Record<string, number> }).__runeAt);
  expect(at).toEqual({ letter_m_sound: 0, letter_s_sound: 1, letter_a_sound: 2 });
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
