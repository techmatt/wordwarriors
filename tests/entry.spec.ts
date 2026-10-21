/**
 * Item 033: the home warm-up in the entry hall, "Before we head out, let's
 * grab the ...". All slow lane (each over 10 s): a new player's clue (each
 * letter name then its sound, never the word: amendment 1549), the right
 * pick, the level up, and out to the hub; levels 2 and 3's clues; three
 * misses (the slow sound-out as help, the level down);
 * F9 out and back; and a sweep of drawn casts from the bedroom, checking the
 * grab word stays out of the episode's reading, and (item 025's checks, once
 * their own walk through the same bedroom) that the drawn cast wakes her and
 * the door leads to the quest place. Screenshots land in
 * tests/screenshots/ (ignored).
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BANK_BY_WORD, THINGS } from '../content/phonics/bank';
import { withStems } from '../src/rules/bank';

import { SLOW, boot, choose, collectErrors, expectNoErrors, leaveBedroom, playEntry, press, seedProgress, state, until, type WWState } from './harness';

const LINE_BY_ID = new Map((JSON.parse(readFileSync('content/voice/lines.json', 'utf8')) as { id: string; text: string; say?: string }[]).map((l) => [l.id, l]));

const shot = (page: Page, name: string) => page.screenshot({ path: `tests/screenshots/033_${name}.png` });

/** The warm-up's own lines, in order: its narrator lines, letter names and sounds, word lines. */
const clueLines = (s: WWState) => s.voice.history.filter((id) => /^letter_|^word_|_grab_/.test(id));

// By sound unit: a long-vowel word spells its own (KEY is K, long E: item 048); a silent letter says nothing.
const unitSounds = (w: string) => BANK_BY_WORD[w]!.units.map((u, i) => [u, BANK_BY_WORD[w]!.sounds[i] ?? u] as const);
const sounds = (w: string) => unitSounds(w).flatMap(([, s]) => (s ? [`letter_${s}_sound`] : []));
// Level 1 (amendment 1549): each unit's letter names, then its sound.
const namesAndSounds = (w: string) => unitSounds(w).flatMap(([u, s]) => [...[...u].map((c) => `letter_${c}_name`), ...(s ? [`letter_${s}_sound`] : [])]);
// Every word the hall can ask for (the bank's things), each at one ramp level. Read from the
// bank, not listed: a hand list missed VET and BIN, so a draw of either started at 2 (item 047).
const allAt = (level: number) => Object.fromEntries(THINGS.map((w) => [w.word, level]));

/** Into the hall with the clue given and her free to walk. */
async function clued(page: Page): Promise<WWState> {
  return until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:find' && !st.room.locked, 60_000, 'clue given');
}

test('warm-up, a new player: each letter name then its sound and never the word, nine pictures with no words; right first time moves the word up to 2; out to the hub', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=grab&nojourney=1');
  const s = await clued(page);
  const g = s.room!.grab!;
  expect(g.level).toBe(1);
  expect(g.objects).toHaveLength(9);
  expect(g.objects).toContain(g.word);
  expect(s.room!.spots.map((sp) => sp.id).sort()).toEqual(g.objects.map((w) => `grab_${w}`).sort());
  expect(s.room!.spots.filter((sp) => sp.correct).map((sp) => sp.id)).toEqual([`grab_${g.word}`]);
  // No picture carries its word (item 059: she matched the letters instead of sounding it out).
  const texts = await page.evaluate(() => (window as unknown as { __ww: { texts: () => { text: string }[] } }).__ww.texts().map((t) => t.text));
  for (const w of g.objects) expect(texts).not.toContain(w.toUpperCase());
  // The door is not there until she has the thing.
  expect(s.room!.shown).not.toContain('door');
  // A phonics task, never a listening one (amendment 1549): the word is not said before she has it.
  expect(clueLines(s)).toEqual([`nar_ellie_grab_ask`, ...namesAndSounds(g.word)]);
  expect(s.voice.history).not.toContain(`word_${g.word}`);
  await shot(page, 'clue');

  await choose(page, `grab_${g.word}`);
  const out = await until(page, (st) => st.room?.round === 'entry:door' && !st.room.locked, 60_000, 'door open');
  expect(out.room!.shown).toContain('door');
  expect(out.episode.fetched).toEqual([g.word]);
  expect(clueLines(out).slice(-2)).toEqual([`word_${g.word}`, 'nar_ellie_grab_door']);
  const p = out.progress as unknown as { grabs: Record<string, { seen: number; recent: boolean[] }>; grabLevels: Record<string, number>; words: Record<string, unknown> };
  expect(p.grabs[g.word]).toMatchObject({ seen: 1, recent: [true] });
  expect(p.grabLevels[g.word]).toBe(2);
  // Exposure, not a read.
  expect(p.words[g.word]).toBeUndefined();
  expect(out.episode.read).not.toContain(g.word);
  await shot(page, 'door');
  await choose(page, 'door');
  await until(page, (st) => st.scene === 'Hub', 30_000, 'hub');
  expectNoErrors(errors);
});

test('warm-up levels: 2 gives the sounds with the letters shown, 3 the sounds only; never the word; a first-time right at 2 moves up to 3', SLOW, async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedProgress(page, { version: 1, grabLevels: allAt(2) });
  await boot(page, '?scene=grab&nojourney=1');
  const two = await clued(page);
  const w2 = two.room!.grab!.word;
  expect(two.room!.grab!.level).toBe(2);
  expect(clueLines(two)).toEqual([`nar_ellie_grab_ask`, ...sounds(w2)]);
  // The board shows the letters as they are sounded.
  const texts = await page.evaluate(() => (window as unknown as { __ww: { texts: () => { text: string }[] } }).__ww.texts().map((t) => t.text));
  for (const c of w2.toUpperCase()) expect(texts).toContain(c);
  await shot(page, 'level2');
  await choose(page, `grab_${w2}`);
  const got = await until(page, (st) => st.room?.round === 'entry:door', 60_000, 'grabbed');
  expect((got.progress as unknown as { grabLevels: Record<string, number> }).grabLevels[w2]).toBe(3);

  const page3 = await page.context().newPage();
  // A tab behind another gets no animation frames on the GPU channel, so the game never boots in it.
  await page3.bringToFront();
  await seedProgress(page3, { version: 1, grabLevels: allAt(3) });
  await boot(page3, '?scene=grab&nojourney=1');
  const three = await clued(page3);
  const w3 = three.room!.grab!.word;
  expect(three.room!.grab!.level).toBe(3);
  expect(clueLines(three)).toEqual([`nar_ellie_grab_ask`, ...sounds(w3)]);
  await shot(page3, 'level3');
  expectNoErrors(errors);
});

test('warm-up misses: "that\'s the CAT, we need the ...", the clue again at the same level; from 3 the slow sound-out, never the word; the level stays down', SLOW, async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=grab&nojourney=1');
  const s = await clued(page);
  const g = s.room!.grab!;
  const others = g.objects.filter((w) => w !== g.word);
  const marks: number[] = [];
  for (let i = 0; i < 3; i++) {
    marks.push(clueLines(await state(page)).length);
    await choose(page, `grab_${others[i]}`);
    await until(page, (st) => st.room?.grab?.misses === i + 1, 30_000, `miss ${i + 1}`);
    await clued(page);
  }
  const after = await state(page);
  const lines = clueLines(after);
  const miss = (i: number) => lines.slice(marks[i], marks[i + 1] ?? lines.length);
  // Misses 1 and 2: the picked word is said, never the right one; names and sounds again (level 1).
  for (const i of [0, 1]) expect(miss(i)).toEqual(['nar_ellie_grab_wrong', `word_${others[i]}`, 'nar_ellie_grab_need', ...namesAndSounds(g.word)]);
  // Miss 3: the help sounds it out unit by unit, never the whole word (amendment 1549).
  expect(miss(2)).toEqual(['nar_ellie_grab_wrong', `word_${others[2]}`, 'nar_ellie_grab_need', ...sounds(g.word)]);
  expect(lines).not.toContain(`word_${g.word}`);
  expect(after.episode.fetched).toEqual([]);
  await shot(page, 'missed');

  await choose(page, `grab_${g.word}`);
  const got = await until(page, (st) => st.room?.round === 'entry:door', 60_000, 'grabbed');
  const p = got.progress as unknown as { grabs: Record<string, { seen: number; wrong: number; recent: boolean[] }>; grabLevels: Record<string, number> };
  expect(p.grabs[g.word]).toMatchObject({ seen: 1, wrong: 3, recent: [false] });
  expect(p.grabLevels[g.word]).toBe(1);
  expect(got.episode.fetched).toEqual([g.word]);
  expectNoErrors(errors);
});

test('F9 and back: a miss before it still counts; after the grab the hall comes back done, nothing recorded twice', SLOW, async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=grab&nojourney=1');
  const s = await clued(page);
  const g = s.room!.grab!;
  await choose(page, `grab_${g.objects.find((w) => w !== g.word)!}`);
  await until(page, (st) => st.room?.grab?.misses === 1, 30_000, 'a miss');
  await clued(page);
  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'Parent', 10_000, 'parent');
  await shot(page, 'parent');
  await press(page, 'red');
  const back = await clued(page);
  expect(back.room!.grab).toMatchObject({ word: g.word, level: 1, misses: 1 });
  await choose(page, `grab_${g.word}`);
  const got = await until(page, (st) => st.room?.round === 'entry:door' && !st.room.locked, 60_000, 'door open');
  const rec = () => (got.progress as unknown as { grabs: Record<string, { seen: number; recent: boolean[] }>; grabLevels: Record<string, number> });
  expect(rec().grabs[g.word]).toMatchObject({ seen: 1, recent: [false] });
  expect(rec().grabLevels[g.word]).toBe(1);

  await page.keyboard.press('F9');
  await until(page, (st) => st.scene === 'Parent', 10_000, 'parent again');
  await shot(page, 'parent_levels');
  await press(page, 'red');
  const done = await until(page, (st) => st.scene === 'Entry' && st.room?.round === 'entry:door' && !st.room.locked, 30_000, 'back at the open door');
  expect(done.room!.shown).toContain('door');
  expect(done.room!.spots.map((sp) => sp.id)).toEqual(['door']);
  const p = done.progress as unknown as { grabs: Record<string, { seen: number }>; grabLevels: Record<string, number> };
  expect(p.grabs[g.word]!.seen).toBe(1);
  expect(p.grabLevels[g.word]).toBe(1);
  expect(done.episode.fetched).toEqual([g.word]);
  await choose(page, 'door');
  await until(page, (st) => st.scene === 'Hub', 30_000, 'hub');
  expectNoErrors(errors);
});

for (const seed of [3, 11, 25, 40]) {
  test(`seed ${seed}: the drawn cast wakes her, the helper says the quest, through the warm-up to the quest place; the grab word is never read this episode`, SLOW, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    await boot(page, `?scene=bedroom&seed=${seed}&nojourney=1&games=all`);
    await leaveBedroom(page, { grab: false });
    const s = await clued(page);
    const g = s.room!.grab!;
    // The drawn cast (item 025): every role filled; the quest's setup line was
    // said (the helper's own, or the narrator's home one); the helper's wake-up
    // introduction is in the waker's voice and the bad news names this villain.
    const ep = s.episode as unknown as { ally: string | null; villain: string; place: string };
    expect(ep.villain).toBeTruthy();
    expect(ep.ally).toBeTruthy();
    expect(s.voice.history.some((id) => /^quest_.+_\d$/.test(id) || /_quest_home_\d$/.test(id))).toBe(true);
    expect(s.voice.history.some((id) => id.startsWith('wake_') && id.endsWith(`_bad_${ep.villain}`))).toBe(true);
    await shot(page, `seed${seed}_hall`);
    const plan = s.episode.house.plan!;
    expect(plan).toBeTruthy();
    const reading = new Set([...(s.episode.gift ? [s.episode.gift] : []), ...plan.flatMap((p) => [p.key, ...p.fetches])]);
    expect(reading.has(g.word)).toBe(false);
    // The hall shows none of the words she will read.
    for (const w of g.objects) expect(reading.has(w), `${w} is read later`).toBe(false);
    // The narrator is the helper: its person's grab lines.
    expect(clueLines(s)[0]).toMatch(/^nar_.+_grab_ask$/);
    const t0 = Date.now();
    const word = await playEntry(page);
    expect(word).toBe(g.word);
    const hub = await until(page, (st) => st.scene === 'Hub', 30_000, 'hub');
    expect(hub.episode.fetched).toEqual([g.word]);
    // ...and the front door led to the quest place.
    const circle = await until(page, (st) => st.scene === 'Hub' && st.room?.round === 'hub:1:circle', 90_000, 'circle offered');
    // Nor is it a word of the quest line or the hub scene, stemmed (item 047: the warm-up avoids what every other draw does).
    const story = circle.voice.history.filter((id) => /^quest_.+_\d$|_quest_home_\d$|^hub_/.test(id));
    expect(story.length).toBeGreaterThan(1);
    const said = withStems(story.flatMap((id) => [LINE_BY_ID.get(id)?.text, LINE_BY_ID.get(id)?.say]).flatMap((t) => (t ?? '').toLowerCase().split(/[^a-z]+/).filter(Boolean)));
    expect(said, `${g.word} is said in the story`).not.toContain(g.word);
    await page.screenshot({ path: `tests/screenshots/025_seed${seed}_hub_${ep.place}.png` });
    test.info().annotations.push({ type: 'warm-up', description: `seed ${seed}: ${g.word} at level ${g.level}, ${Math.round((Date.now() - t0) / 100) / 10}s scaled` });
    expectNoErrors(errors);
  });
}
