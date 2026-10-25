/**
 * Item 054: the Stretchy Bridge. Untagged (`npm run test:browser`): level 3 at ?difficulty=3 (silent stones, the
 * pictures only after Dad's yes, his no replays the stones). Slow lane
 * (item 061: 15-25 s each): a visit at level 1 (the stones sound as she
 * slides, a held sound while she stands still, a wrong picture sounded out,
 * then the right one; levels saved, the words fetched); level 2 (Dad's 2 is a
 * hint); the drawn episodes' door a. The bridge's whole drawn episode (behind door
 * b) is tests/drawn.spec.ts's, shared with the word machine (item 081). Untagged too: MOM and DAD read but never
 * fetched (`?bridge=mom,dad`, hunt 10's M45). Screenshots land in tests/screenshots/ (ignored).
 */

import { test, expect, type Page } from '@playwright/test';

import { BANK_BY_WORD } from '../content/phonics/bank';
import { canHold } from '../content/phonics/letters';
import { letterSoundLine, wordLine } from '../content/voice/ids';
import { BRIDGE_PICTURES, CROSS_WORDS, bridgeEase } from '../src/rules/bridge';
import { SLOW, bagged, boot, choose, collectErrors, dad, expectNoErrors, playBridgeRoom, press, seedProgress, shotIn, slideAcross, state, stick, texts, toParentAndBack, until, type WWState } from './harness';

const shot = shotIn('054');

const bridge = (s: WWState) => s.room?.bridge;
/** Each stone's sound, as the bank spells the word (EGG's GG is G's sound, THUMB's MB is M's: item 072). */
const soundsOf = (b: { word: string }) => BANK_BY_WORD[b.word]!.sounds;
/** Each stone's sound line. */
const soundLines = (b: { word: string }) => soundsOf(b).map(letterSoundLine);
const levels = (s: WWState) => s.progress.bridgeLevels;

/** Every bridge picture at help level `n` (a superset of the words she can cross). */
async function seedLevels(page: Page, n: number): Promise<void> {
  await seedProgress(page, { bridgeLevels: Object.fromEntries(BRIDGE_PICTURES.map((w) => [w, n])) });
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

test('Stretchy Bridge, level 1: the stones sound as she slides, held while she stays; a wrong picture is sounded out; the word only after the right one', SLOW, async ({ page }) => {
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
  // A fresh store (item 067): any short word, every tier, the easier tier first.
  for (const w of b0.words) expect(CROSS_WORDS).toContain(w);
  expect(b0.words.map(bridgeEase)).toEqual([...b0.words.map(bridgeEase)].sort());
  // The stones are the word's letters, upper case, one text each; the word is never one text.
  const shown = (await texts(page)).map((t) => t.text);
  for (const u of b0.units) expect(shown).toContain(u.toUpperCase());
  expect(shown).not.toContain(b0.word.toUpperCase());
  // Level 1 asks nothing of Dad: no cue.
  await expect(page.locator('#dad-buttons')).toHaveCount(0);

  // Onto the first held stone (a stop like BAG's B plays once: since item 067 the first word
  // may start with one; every word has a vowel) and stand still: its sound is held.
  const h = soundsOf(b0).findIndex(canHold);
  await standOn(page, h);
  const first = soundLines(b0)[h]!;
  await until(page, (st) => bridge(st)?.holding === first, 10_000, 'first held stone held');
  await shot(page, 'on_stone');
  // Item 085: one short natural stretch (BRIDGE.stretchMs, 0.6 s: 120 ms at
  // SPEED 5x, too short to time from here under load), then quiet; still
  // standing there, it does not sound again (it did after 2 s, item 058).
  const count = (st: WWState) => st.voice.history.filter((id) => id === first).length;
  const quiet = await until(page, (st) => bridge(st)?.holding === null, 10_000, 'held sound played out');
  expect(count(quiet)).toBe(1);
  expect(bridge(quiet)!.stone).toBe(h);
  // 1.2 s here is 6 s of game time at SPEED 5x: three times the old repeat's wait.
  await page.waitForTimeout(1200);
  const still = await state(page);
  expect(count(still)).toBe(1);
  expect(bridge(still)!.holding).toBeNull();
  expect(bridge(still)!.stone).toBe(h);
  // Across: every stone's sound, in order; the word itself not yet.
  await slideAcross(page);
  const far = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  // (Adjacent repeats folded, in case a stone is stepped on twice.)
  const sounds = far.voice.history.filter((id) => id.startsWith('letter_')).filter((id, k, all) => id !== all[k - 1]);
  expect(sounds.slice(0, b0.units.length)).toEqual(soundLines(b0));
  expect(far.voice.history).not.toContain(wordLine(b0.word));
  await shot(page, 'far_bank');

  // A wrong picture: its sounds one by one, where the bridge differs, and back to the start.
  const wrong = b0.pictures.find((w) => w !== b0.word)!;
  await choose(page, wrong);
  const again = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.misses === 1, 60_000, 'sounded out, slide again');
  const since = again.voice.history.slice(again.voice.history.lastIndexOf(again.voice.history.find((id) => id.endsWith('_bridge_picked'))!));
  expect(since[0]).toMatch(/_bridge_picked$/);
  expect(since.some((id) => /_bridge_(start|middle|end)$/.test(id))).toBe(true);
  expect(since).toContain(letterSoundLine(wrong[0]));
  expect(again.voice.history).not.toContain(wordLine(wrong));
  expect(again.voice.history).not.toContain(wordLine(b0.word));
  expect(again.room!.player.x).toBeLessThan(330);

  // Again, and the right one: the word said only now, fetched; the level stays 1 after a miss.
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank again');
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  expect(s1.voice.history).toContain(wordLine(b0.word));
  expect(s1.episode.read).toContain(b0.word);
  expect(s1.episode.fetched).toEqual(bagged([b0.word]));
  expect(levels(s1)[b0.word]).toBe(1);
  expect(s1.progress.words[b0.word]!.recent).toEqual([false]);

  // The rest right first time: up to level 2; back in the hub with every word fetched.
  await playBridgeRoom(page);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  for (const w of bagged(b0.words)) expect(hub.episode.fetched).toContain(w);
  expect(levels(hub)[b0.words[1]!]).toBe(2);
  expectNoErrors(errors);
});

test('Stretchy Bridge, level 3: silent stones; the pictures only after Dad says yes; his no replays the stones with sounds', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedLevels(page, 3);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3');
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
  expect(replay.filter((id) => id.startsWith('letter_'))).toEqual(soundLines(b0));
  expect(asked.room!.spots).toHaveLength(0);
  // His yes (key 2): the pictures come.
  await page.keyboard.press('Digit2');
  const pick = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'pictures up');
  expect(pick.room!.spots.map((sp) => sp.id).sort()).toEqual([...b0.pictures].sort());
  expect(pick.voice.history).not.toContain(wordLine(b0.word));
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  // A replay is help: one level more help next time.
  expect(levels(s1)[b0.word]).toBe(2);
  expectNoErrors(errors);
});

test('Stretchy Bridge, level 3 (item 106): no Dad for 8 s goes solo, the pictures come with no help counted, and the next bridge skips the ask', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedLevels(page, 3);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  expect(s0.episode.solo).toBe(false);
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.asking === true, 60_000, 'asks Dad');
  // Nobody presses: the pictures come, no replay, and the episode is solo.
  const pick = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'pictures up without Dad');
  expect(bridge(pick)!.timeouts).toBe(1);
  expect(bridge(pick)!.replays).toBe(0);
  expect(pick.episode.solo).toBe(true);
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1 && bridge(st)!.phase === 'slide' && !st.room!.locked, 60_000, 'second bridge');
  // His absence was no help: the word keeps level 3.
  expect(levels(s1)[b0.word]).toBe(3);
  expect(s1.progress.words[b0.word]!.recent).toEqual([true]);
  // Solo, the next far bank brings the pictures at once, Dad not asked.
  await slideAcross(page);
  const p1 = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'pictures up at once');
  expect(p1.voice.history.slice(s1.voice.history.length).some((id) => id.endsWith('_bridge_say'))).toBe(false);
  expect(bridge(p1)!.timeouts).toBe(1);
  expectNoErrors(errors);
});

test("Stretchy Bridge (item 069): Dad's 2 during a replay brings the pictures, not a dropped press and another replay", SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedLevels(page, 3);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3');
  await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.asking === true, 60_000, 'asks Dad');
  await page.keyboard.press('Digit1');
  await until(page, (st) => bridge(st)?.phase === 'replay', 10_000, 'replaying');
  await page.keyboard.press('Digit2');
  const pick = await until(page, (st) => bridge(st)?.phase === 'pick', 10_000, 'pictures up from the yes');
  expect(bridge(pick)!.replays).toBe(1);
  expectNoErrors(errors);
});

test('Stretchy Bridge (item 069): after yellow on a held stone, the stone sounds again while she stays', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&room=bridge');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  // A held sound to stand on (MAP's M, not a stop like CAT's C).
  const i = soundsOf(b0).findIndex(canHold);
  test.skip(i < 0, `${b0.word} has no held sound`);
  const first = soundLines(b0)[i]!;
  await standOn(page, i);
  await until(page, (st) => bridge(st)?.holding === first, 10_000, 'held');
  await press(page, 'yellow');
  const said = await until(page, (st) => st.room!.locked, 5_000, 'the instruction again');
  const n = said.voice.history.filter((id) => id === first).length;
  const again = await until(page, (st) => !st.room!.locked && st.voice.history.filter((id) => id === first).length > n, 15_000, 'her stone sounds again');
  expect(bridge(again)!.stone).toBe(i);
  expectNoErrors(errors);
});

test("Stretchy Bridge (item 069): Dad's hint survives F9 and back, so the helped word does not move up", SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedLevels(page, 2);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  await dad(page, 'yes');
  await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.aided, 60_000, 'hint given');
  await toParentAndBack(page);
  const back = await until(page, (st) => st.scene === 'BridgeRoom' && bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'back on the bridge');
  expect(bridge(back)!.word).toBe(b0.word);
  expect(bridge(back)!.aided).toBe(true);
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  expect(levels(s1)[b0.word]).toBe(1);
  expectNoErrors(errors);
});

test("Stretchy Bridge, level 2: silent stones until Dad's 2, a hint that sounds them", SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedLevels(page, 2);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3');
  const s0 = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'first bridge');
  const b0 = bridge(s0)!;
  expect(b0.level).toBe(2);
  expect(b0.voiced).toBe(false);
  expect(b0.picturesUp).toBe(true);
  await dad(page, 'yes');
  const hinted = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.voiced, 60_000, 'hint given');
  expect(bridge(hinted)!.aided).toBe(true);
  expect(hinted.voice.history.filter((id) => id.startsWith('letter_'))).toEqual(soundLines(b0));
  // Now the stones sound as she slides.
  await slideAcross(page);
  const far = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  expect(far.voice.history.filter((id) => id.startsWith('letter_')).length).toBeGreaterThanOrEqual(b0.units.length * 2);
  await choose(page, b0.word);
  const s1 = await until(page, (st) => bridge(st)?.index === 1, 60_000, 'second bridge');
  expect(levels(s1)[b0.word]).toBe(1);
  expectNoErrors(errors);
});

test('the beta: every drawn episode has a phonics room behind door a, Charge the Spell or the Stretchy Bridge', SLOW, async ({ page }) => {
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

test("Stretchy Bridge, level 2 (item 092): Dad's 2 during the intro is kept for her turn, and on the far bank the find line comes again after the hint", SLOW, async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedLevels(page, 2);
  await boot(page, '?scene=room&slot=a&room=bridge&difficulty=3', undefined, { voice: 'real' });
  // While the helper still talks: his 2 was dropped (his cue flashed green all the same).
  await until(page, (st) => bridge(st)?.phase === 'intro' && /_bridge_(intro|quiet)$/.test(st.voice.speaking ?? ''), 60_000, 'the intro line');
  await dad(page, 'yes');
  const hinted = await until(page, (st) => bridge(st)?.phase === 'slide' && !st.room!.locked && bridge(st)!.voiced, 60_000, 'the hint, once she may slide');
  expect(bridge(hinted)!.aided).toBe(true);
  expect(hinted.voice.history.some((id) => id.endsWith('_bridge_hint'))).toBe(true);
  // The next word, unhinted: across, and his 2 as "Which picture did you read?" plays.
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked, 60_000, 'far bank');
  await choose(page, bridge(hinted)!.word);
  await until(page, (st) => bridge(st)?.index === 1 && bridge(st)?.phase === 'slide' && !st.room!.locked, 60_000, 'second bridge');
  await slideAcross(page);
  await until(page, (st) => bridge(st)?.phase === 'pick' && /_bridge_find(_\d+)?$/.test(st.voice.speaking ?? ''), 60_000, 'the find line');
  await dad(page, 'yes');
  const again = await until(page, (st) => bridge(st)?.phase === 'pick' && !st.room!.locked && bridge(st)!.voiced, 60_000, 'the hint on the far bank');
  const h = again.voice.history;
  const hint = h.lastIndexOf(h.filter((id) => id.endsWith('_bridge_hint')).at(-1)!);
  expect(h.slice(hint).some((id) => /_bridge_find(_\d+)?$/.test(id)), 'the find line after the hint').toBe(true);
  expectNoErrors(errors);
});

// Hunt 10, M45 (moved from hunt10.spec, item 155): MOM and DAD are read on the bridge, never fetched.
test('the Stretchy Bridge reads MOM and DAD, but no copy goes to her bag (M45: THE MOM! was hurled at Evil Tiamat)', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // `bridge=mom,dad` puts them on the bridge (item 155: `words=mom,dad` only leaned the draw, and some visits drew neither).
  await boot(page, '?scene=room&slot=a&room=bridge&bridge=mom,dad');
  const first = await until(page, (st) => st.scene === 'BridgeRoom' && Boolean(st.room?.bridge), 30_000, 'bridge room');
  const words = first.room!.bridge!.words;
  const family: string[] = words.filter((w) => w === 'mom' || w === 'dad');
  expect(family.sort(), `the test bites: ${words.join(' ')}`).toEqual(['dad', 'mom']);
  await playBridgeRoom(page);
  const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'back in the hub');
  expect(hub.episode.house.done).toContain('a');
  for (const w of words) {
    expect(hub.episode.read, `${w} read`).toContain(w);
    if (family.includes(w)) expect(hub.episode.fetched, `${w} not fetched`).not.toContain(w);
    else expect(hub.episode.fetched, `${w} fetched`).toContain(w);
  }
  expectNoErrors(errors);
});

