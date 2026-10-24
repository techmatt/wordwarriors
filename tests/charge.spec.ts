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
 * episodes are the soak's (tests/soak.spec.ts, item 081). Item 140: two
 * words a visit, each a round opening with all its sounds; every test plays
 * both. Screenshots land in tests/screenshots/ (ignored) for a look.
 */

import { test, expect, type Page } from '@playwright/test';

import { SLOW, boot, collectErrors, dad, dadLock, expectNoErrors, state, texts, until, type WWState } from './harness';
import { qaLayout } from './qa/probe';
import { CHARGE_WORDS } from '../src/rules/charge';
import type { WWHooks } from '../src/testHooks';
import { letterSoundLine, wordLine } from '../content/voice/ids';
import { RUNE_BY_SOUND } from '../content/phonics/runes';
import { BANK_BY_WORD } from '../content/phonics/bank';

/**
 * The timed visit's limits (game time, one worker): a round to its read, and the whole two-word
 * visit. Measured in item 140 for two 3-rune words: 21.5-23 s to the first read (her arrival, the
 * sounds up front, the explanation, the runes), 17 s to the second (another spell, its sounds, the
 * runes), 51-55 s in all with Dad's 1 on the first; a 4-rune word adds about 4.5 s a round.
 */
const LIMIT_READ = 29_000;
const LIMIT_VISIT = 66_000;

/** A word's runes (its sounds: every unit of a charge word is one). */
const runesOf = (w: string): string[] => [...BANK_BY_WORD[w]!.sounds];

/** Item 140: the round opens with all its sounds, in order, the first thing after `from` (the visit's start, or `charge_next`) that is a letter sound. */
function opensWithSounds(h: string[], from: number, runes: string[]): void {
  const at = h.findIndex((id, k) => k > from && id.startsWith('letter_'));
  expect(at, 'a sound opens the round').toBeGreaterThan(from);
  expect(h.slice(at, at + runes.length)).toEqual(runes.map((r) => letterSoundLine(r)));
}

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/053_${name}.png` });

test('Charge the Spell: the runes charge by themselves, each sound said; one press, Dad\'s key 2, on the read', SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const c0 = s0.room!.charge!;
  // Item 140: two words, a round each; item 058: each of 3-4 sound units, its runes its sounds in order.
  expect(c0.words).toHaveLength(2);
  expect(c0.round).toBe(0);
  expect(c0.word).toBe(c0.words[0]);
  expect(c0.runes.length).toBeGreaterThanOrEqual(3);
  expect(c0.runes.length).toBeLessThanOrEqual(4);
  // A fresh store: any charge word (item 067: every sound in play, no tiers).
  for (const w of c0.words) expect(CHARGE_WORDS).toContain(w);
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.kind).toBe('charge');
  expect(s0.episode.house.plan!.find((p) => p.slot === 'a')!.fetches).toEqual(c0.words);
  // All the word's sounds first (item 140), then rune 0 is said, then her beat to say it back; Dad is not asked and green is not needed.
  const r0 = c0.runes[0]!;
  const b0 = await until(page, (st) => st.room?.charge?.index === 0 && st.room.charge.phase === 'sayback', 60_000, 'rune 0 said back');
  opensWithSounds(b0.voice.history, -1, c0.runes);
  const sounds = b0.voice.history.filter((id) => id.startsWith('letter_'));
  expect(sounds).toEqual([...c0.runes, r0].map((r) => letterSoundLine(r)));
  expect(b0.room!.charge!.asking).toBe(false);
  // The word is at the top from the start, but never said.
  expect(b0.voice.history).not.toContain(wordLine(c0.word));
  // The word's units are upper case in the bar at the top (the altar shows the rune's picture letter);
  // the sound is never captioned (no text shows its placeholder).
  const shown = (await texts(page)).map((t) => t.text);
  for (const r of c0.runes) expect(shown).toContain(r.toUpperCase());
  await shot(page, 'sayback');
  // Every rune charges by itself, each sound said, and only then is Dad asked.
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  expect(read.room!.charge!.charged).toEqual(c0.runes);
  for (const r of c0.runes) expect(read.voice.history).toContain(letterSoundLine(r));
  expect(read.room!.charge!.asking).toBe(true);
  await expect(page.locator('#dad-buttons')).toBeVisible();
  await page.keyboard.press('Digit2');
  // Item 140: the second word's round, its own sounds first, then its read; the slot is not done before it.
  const w1 = c0.words[1]!;
  const read1 = await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.phase === 'read', 60_000, 'the second read');
  expect(read1.room!.charge!.word).toBe(w1);
  expect(read1.episode.house.done).not.toContain('a');
  const next = read1.voice.history.lastIndexOf(narratorLineEnd(read1.voice.history, '_charge_next'));
  expect(next).toBeGreaterThan(read1.voice.history.indexOf(wordLine(c0.word)));
  opensWithSounds(read1.voice.history, next, runesOf(w1));
  expect(read1.voice.history).not.toContain(wordLine(w1));
  await page.keyboard.press('Digit2');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.charged?.sounds).toEqual([...new Set([...c0.runes, ...runesOf(w1)])]);
  expect(hub.episode.charged?.part).toBe(1);
  // The words are battle items, and read right; their sounds with them.
  expect(hub.episode.fetched).toEqual(c0.words);
  expect(hub.episode.read).toEqual(c0.words);
  for (const w of c0.words) expect(hub.progress.words[w]!.recent).toEqual([true]);
  expect(hub.progress.sounds[r0]!.recent).toEqual([true]);
  await expect(page.locator('#dad-buttons')).toHaveCount(0);
  expectNoErrors(errors);
});

test('Charge the Spell: dad lock holds the say-back beat; no 1 / 2 at all (item 106): the read goes solo, read together, recorded as modelled', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge');
  const s0 = await until(page, (st) => st.room?.charge?.index === 0 && st.room.charge.phase === 'sayback', 60_000, 'rune 0 said back');
  const { words } = s0.room!.charge!;
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
  // Both words read together (the second solo from the start: no second wait for Dad).
  expect(solo.room!.charge!.round).toBe(0);
  expect(h.filter((id) => id.endsWith('_charge_read_together'))).toHaveLength(2);
  const at = h.lastIndexOf(narratorLineEnd(h, '_charge_read_together'));
  const runes = runesOf(words[1]!);
  expect(h.slice(at + 1, at + 1 + runes.length)).toEqual(runes.map((r) => letterSoundLine(r)));
  expect(h.indexOf(wordLine(words[1]!))).toBeGreaterThan(at);
  // Nothing about Dad, no "sound it out together" miss.
  expect(h.some((id) => id.endsWith('_charge_together'))).toBe(false);
  // Fetched and done all the same; in the store modelled, never her read: no seen, no recent, so no shakiness moves.
  expect(hub.episode.fetched).toEqual(words);
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.solo).toBe(true);
  for (const w of words) expect(hub.progress.words[w], w).toMatchObject({ seen: 0, recent: [], modelled: 1 });
  for (const r of hub.episode.charged!.sounds) expect(hub.progress.sounds[r], r).toMatchObject({ seen: 0, recent: [], modelled: 1 });
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
  // The second word: not solo, so the read asks him too, no "with me".
  const read1 = await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.phase === 'read', 60_000, 'the second read, Dad asked');
  expect(read1.voice.history.filter(withMe)).toHaveLength(said);
  await dad(page, 'yes');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  // His yes is her read; the rune said with the helper is modelled as well.
  for (const w of s0.room!.charge!.words) expect(hub.progress.words[w]!.recent).toEqual([true]);
  expect(hub.progress.words[word]!.modelled).toBeUndefined();
  expect(hub.progress.sounds[runes[0]!]).toMatchObject({ recent: [true], modelled: 1 });
  expect(hub.progress.sounds[runes[runes.length - 1]!]!.modelled).toBeUndefined();
  expectNoErrors(errors);
});

test('Charge the Spell (items 059, 140): a snappy visit spells its two words, each opening with its sounds; Dad\'s 1 on the first read sounds it out together and it is a battle item all the same', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&qa=1');
  const s0 = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge), 60_000, 'charge room');
  const { word, runes, words } = s0.room!.charge!;
  const runes1 = runesOf(words[1]!);
  // Every frame from here: when each letter sound starts and stops (game clock), for the gaps below.
  await page.evaluate(() => {
    const w = window as unknown as { __ww: WWHooks; __sounds: { id: string; from: number; to: number }[] };
    w.__sounds = [];
    let cur: { id: string; from: number; to: number } | null = null;
    const tick = () => {
      const id = (w.__ww.state() as WWState).voice.speaking;
      const now = performance.now();
      if (cur && cur.id !== id) cur = null;
      if (!cur && id?.startsWith('letter_')) w.__sounds.push((cur = { id, from: now, to: now }));
      if (cur) cur.to = now;
      requestAnimationFrame(tick);
    };
    tick();
  });
  // She stands beside the altar, not inside it (item 069: the altar was drawn over her arm and dress all round).
  const l = await qaLayout(page);
  const altar = l.images.find((im) => im.key === 'prop_rune_altar')!;
  expect(s0.room!.player.x).toBeLessThan(altar.b[0]);
  // Hunt 10: each rune's gesture glyph plays beside the helper, never on her (it sat on her face, M's cake slice).
  const glyphs = new Set(runes.map((r) => RUNE_BY_SOUND[r]?.gesture.glyph));
  let seen = 0;
  for (let i = 0; i < 60 && (await state(page)).room?.charge?.phase !== 'read'; i++) {
    const { texts: ts, heroes } = await qaLayout(page);
    const her = heroes?.find((h) => h.scene === 'ChargeRoom')?.b;
    for (const t of ts.filter((x) => glyphs.has(x.text))) {
      seen++;
      if (her) expect(t.b[2] <= her[0] || t.b[0] >= her[2] || t.b[3] <= her[1] || t.b[1] >= her[3], `${t.text} at ${t.b.join(',')} on her ${her.join(',')}`).toBe(true);
    }
    await page.waitForTimeout(150);
  }
  expect(seen, 'a gesture glyph seen').toBeGreaterThan(0);
  const read = await until(page, (st) => st.room?.charge?.phase === 'read', 60_000, 'the read');
  const toRead = read.room!.charge!.readAtMs;
  // Nothing was pressed and nothing asked before the read.
  expect(read.room!.charge!.charged).toEqual(runes);
  opensWithSounds(read.voice.history, -1, runes);
  await dad(page, 'no');
  // Item 140: the second word, its own round.
  const read1 = await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.phase === 'read', 60_000, 'the second read');
  const toRead1 = read1.room!.charge!.readAtMs;
  await dad(page, 'yes');
  let ms = 0;
  const hub = await until(page, (st) => {
    if (st.room?.charge) ms = st.room.charge.elapsedMs;
    return st.scene === 'Hub';
  }, 30_000, 'back in the hub');
  // Sounded out once, unit by unit, then the word said; no fail state: it is fetched, recorded as a miss.
  const h = hub.voice.history;
  const at = h.lastIndexOf(narratorLineEnd(h, '_charge_together'));
  expect(at).toBeGreaterThan(-1);
  expect(h.slice(at + 1, at + 1 + runes.length)).toEqual(runes.map((r) => letterSoundLine(r)));
  expect(h.indexOf(wordLine(word))).toBeGreaterThan(at);
  // Then the second word's round opens with all its sounds, after "Here comes another spell!".
  const next = h.lastIndexOf(narratorLineEnd(h, '_charge_next'));
  expect(next).toBeGreaterThan(h.indexOf(wordLine(word)));
  opensWithSounds(h, next, runes1);
  // A beat between the sounds, never back to back (item 069: they ran toward a blend): the first word's
  // sounding out together, and the second word's sounds up front. Counted from the end: the second
  // round's sounds up front, then one per rune.
  const sounds = await page.evaluate(() => (window as unknown as { __sounds: { id: string; from: number; to: number }[] }).__sounds);
  const n1 = runes1.length;
  const together = sounds.slice(-(2 * n1 + runes.length), -2 * n1);
  const upFront = sounds.slice(-2 * n1, -n1);
  expect(together.map((x) => x.id)).toEqual(runes.map((r) => letterSoundLine(r)));
  expect(upFront.map((x) => x.id)).toEqual(runes1.map((r) => letterSoundLine(r)));
  for (const run of [together, upFront]) for (let i = 1; i < run.length; i++) expect(run[i]!.from - run[i - 1]!.to, `gap before ${run[i]!.id}`).toBeGreaterThan(250);
  expect(hub.episode.fetched).toEqual(words);
  expect(hub.episode.charged?.sounds).toEqual([...new Set([...runes, ...runes1])]);
  expect(hub.progress.words[word]!.recent).toEqual([false]);
  expect(hub.progress.words[words[1]!]!.recent).toEqual([true]);
  // In game time (the scene's clock; the test's own runs SPEED times fast), item 140's measured
  // lengths with margin: each round to its read under LIMIT_READ (the first from her arrival), and the
  // whole visit, Dad's 1 and the sounding out together on the first word, under LIMIT_VISIT.
  // Asserted only by a one-worker timing run (`--workers=1`, item 072): beside other workers the
  // load stretches the game time past the limits, so the multi-worker lanes log it and go on.
  const timing = `charge visit: ${word} (${runes.length} runes) ${toRead / 1000} s to its read, ${words[1]} (${n1} runes) ${toRead1 / 1000} s to its read, ${ms / 1000} s in all (game time)`;
  console.log(timing);
  if (test.info().config.workers === 1) {
    expect(toRead).toBeLessThan(LIMIT_READ);
    expect(toRead1).toBeLessThan(LIMIT_READ);
    expect(ms).toBeLessThan(LIMIT_VISIT);
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
  const { runes, words } = s0.room!.charge!;
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
  // Item 140: the second word the same way, his 2 during its last rune.
  const last1 = runesOf(words[1]!).length - 1;
  await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.index === last1 && st.room.charge.phase === 'sayback', 60_000, 'the second word\'s last rune said back');
  await dadLock(page, true);
  await page.keyboard.press('Digit2');
  await dadLock(page, false);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  // Its door wears the stone with the word's first rune as a picture letter.
  await page.waitForTimeout(600);
  expect((await qaLayout(page)).images.some((im) => im.scene === 'Hub' && im.key === `rune_${runes[0]}`)).toBe(true);
  await shot(page, 'picture_rune_door');
  // Read right on his early 2s: never asked, never timed out, never sounded out together.
  for (const w of words) expect(hub.progress.words[w]!.recent).toEqual([true]);
  expect(hub.episode.read).toEqual(words);
  const h = hub.voice.history;
  expect(h.some((id) => id.endsWith('_charge_read'))).toBe(false);
  expect(h.some((id) => id.endsWith('_charge_together'))).toBe(false);
  for (const w of words) expect(h).toContain(wordLine(w));
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
    const w = window as unknown as { __ww: WWHooks; __runeAt: Record<string, number> };
    w.__runeAt = {};
    const tick = () => {
      const st = w.__ww.state() as WWState;
      const id = st.voice.speaking;
      if (id?.startsWith('letter_') && !(id in w.__runeAt)) w.__runeAt[id] = st.battle?.runesFired ?? -1;
      requestAnimationFrame(tick);
    };
    tick();
  });
  await until(page, (st) => st.scene === 'Battle' && (st.battle?.runesFired ?? 0) === 3, 60_000, 'three runes fired');
  const s = await until(page, (st) => ['m', 's', 'a'].every((r) => st.voice.history.includes(letterSoundLine(r))), 60_000, 'the runes said');
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
  await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.phase === 'read', 60_000, 'the second read');
  await page.keyboard.press('F4');
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'F4 read them');
  for (const w of r.room!.charge!.words) expect(hub.progress.words[w]!.recent).toEqual([true]);
  expectNoErrors(errors);
});

test('Charge the Spell (hunt 7, M34): solo, the read is together at once; Dad\'s yes during it is a helped read, never her first try', SLOW, async ({ page }) => {
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  // Real voice: the read together lasts long enough to press during it.
  await boot(page, '?scene=room&slot=a&room=charge&solo=1', undefined, { voice: 'real' });
  const s = await until(page, (st) => st.room?.charge?.read === 'modelled', 60_000, 'the read together');
  const { word } = s.room!.charge!;
  // Nobody was asked and nothing timed out: solo from the start reads together at once (no DAD_AWAY_MS wait).
  expect(s.room!.charge!.timeouts).toBe(0);
  expect(s.voice.history.some((id) => id.endsWith('_charge_read'))).toBe(false);
  await dad(page, 'yes');
  const helped = await until(page, (st) => st.room?.charge?.read === 'helped', 5_000, 'his yes, a helped read');
  expect(helped.episode.solo).toBe(false);
  // Not solo now: the second word's read asks him.
  await until(page, (st) => st.room?.charge?.round === 1 && st.room.charge.phase === 'read', 60_000, 'the second read, Dad asked');
  await dad(page, 'yes');
  const hub = await until(page, (st) => st.scene === 'Hub', 60_000, 'back in the hub');
  // Read right, not first try; not modelled either.
  expect(hub.progress.words[word]).toMatchObject({ seen: 1, recent: [false], wrong: 0 });
  expect(hub.progress.words[word]!.modelled).toBeUndefined();
  expectNoErrors(errors);
});

// Hunt 11: with the bag's row long (the warm-up's thing and the word machine's four before Charge), the word's
// bar at the top sat over its sixth thing on, her face card and the plate over the pictures of what she read.
test("the word's bar stays below the bag's row of fetched things", async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=charge&fetched=cup,hat,map,pen,bed,net,sun&qa=1');
  const s = await until(page, (st) => st.scene === 'ChargeRoom' && Boolean(st.room?.charge?.runes.length), 60_000, 'charge room');
  await page.waitForTimeout(600);
  const l = await qaLayout(page);
  const units = new Set(s.room!.charge!.runes.map((r) => r.toUpperCase()));
  const bar = l.texts.filter((t) => t.scene === 'ChargeRoom' && units.has(t.text) && t.size >= 50);
  expect(bar.length, 'the bar shows each unit').toBeGreaterThan(0);
  // The bag row's things are centred at y 62, 50 px tall; the bar's plate reaches 64 px above its letters' centre.
  const top = Math.min(...bar.map((t) => (t.b[1] + t.b[3]) / 2 - 64));
  expect(top, "the bar's plate under the bag row").toBeGreaterThan(90);
  expectNoErrors(errors);
});

// Hunt 11: the battle's rune row ran the visit's two words together (C R I B T E N, one CRIBTEN under the bars).
test("the battle's rune row parts the two words, and ends left of x 300", async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=1&room=charge&battle=short&nojourney=1&qa=1');
  await until(page, (st) => st.scene === 'Battle', 60_000, 'battle');
  await page.waitForTimeout(1500);
  const l = await qaLayout(page);
  const chips = l.images.filter((im) => im.scene === 'Battle' && im.key === 'prop_rune_stone' && im.b[1] < 300).sort((a, b) => a.b[0] - b.b[0]);
  expect(chips.length, 'rune chips').toBeGreaterThan(3);
  const gaps = chips.slice(1).map((c, i) => c.b[0] - chips[i]!.b[0]);
  expect(Math.max(...gaps) - Math.min(...gaps), 'one wider gap where the second word starts').toBeGreaterThanOrEqual(10);
  expect(chips.at(-1)!.b[2]).toBeLessThanOrEqual(300);
  expectNoErrors(errors);
});
