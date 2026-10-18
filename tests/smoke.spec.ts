/**
 * The fast suite: one page boot per test, many asserts each. Every scene is
 * reached directly with `?scene=`, so a failure points at one step.
 */

import { test, expect } from '@playwright/test';

import {
  FETCH_FRAMES,
  boot,
  choose,
  collectErrors,
  expectNoErrors,
  hubGo,
  leaveBedroom,
  playBattle,
  playSentenceRoom,
  press,
  readToKeyWord,
  seedProgress,
  state,
  typeLetter,
  until,
  walkTo,
} from './harness';

test('title boots, F9 opens the grown-ups page and returns, green starts the bedroom', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 10_000, 'parent page');
  await press(page, 'red');
  await until(page, (s) => s.scene === 'Title', 10_000, 'back to title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  // Pick screens are off by default: straight into the bedroom.
  const s = await until(page, (st) => st.scene === 'Bedroom', 15_000, 'bedroom');
  expect(s.step.kind).toBe('bedroom');
  expectNoErrors(errors);
});

test('bedroom: the wake-up news, a toy reacts to green, the door leads to the hub', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=bedroom&nojourney=1');
  // During the news the door is not there (it shows only for the waker's entrance).
  const news = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:news', 90_000, 'bad news');
  expect(news.room!.shown).not.toContain('door');
  const s = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:door' && !st.room.locked, 90_000, 'news told, door open');
  expect(s.room!.shown).toContain('door');
  expect(s.voice.history).toContain('wake_dada_matt_good_julia');
  expect(s.voice.history).toContain('wake_dada_matt_helper_elsa');
  expect(s.voice.history).toContain('wake_dada_matt_bad_rilla');
  expect(s.room!.spots.map((sp) => sp.id)).toContain('door');

  // Poke a toy: it does its thing (a burst), and nothing else happens.
  const before = s.fx.bursts ?? 0;
  await choose(page, 'rocket');
  await until(page, (st) => (st.fx.bursts ?? 0) > before, 5_000, 'rocket reaction');
  await page.waitForTimeout(600);
  const after = await state(page);
  expect(after.scene).toBe('Bedroom');
  expect(after.room?.round).toBe('bedroom:door');

  await leaveBedroom(page);
  const hub = await until(page, (st) => st.scene === 'Hub', 15_000, 'hub');
  expect(hub.step.kind).toBe('house');
  expectNoErrors(errors);
});

test('hub part 1: the circle teaches the spell, then door a opens a sentence room', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  const circle = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle' && !s.room.locked, 90_000, 'circle offered');
  expect(circle.episode.spell).toBeTruthy();
  expect(circle.episode.house.taught).toBe(false);
  expect(circle.voice.history).toContain(`nar_elsa_teach_word_${circle.episode.spell}`);
  // A door she cannot use yet is not there at all.
  for (const d of ['door_a', 'door_b', 'door_front', 'door_counter']) expect(circle.room!.shown).not.toContain(d);

  await hubGo(page, 'circle');
  const doors = await until(page, (s) => s.room?.round === 'hub:1:doors' && !s.room.locked, 60_000, 'doors offered');
  expect(doors.episode.house.taught).toBe(true);
  const ids = doors.room!.spots.map((sp) => sp.id);
  expect(ids).toContain('door_a');
  expect(ids).toContain('door_b');
  expect(ids).not.toContain('door_front');
  expect(doors.room!.shown).toContain('door_a');
  expect(doors.room!.shown).toContain('door_b');
  expect(doors.room!.shown).not.toContain('door_front');
  expect(doors.room!.shown).not.toContain('door_counter');

  await hubGo(page, 'door_a');
  const room = await until(page, (s) => s.scene === 'SentenceRoom' && Boolean(s.room?.sentence), 15_000, 'sentence room');
  expect(room.room!.round.startsWith('sentence:a:')).toBe(true);
  expectNoErrors(errors);
});

test('sentence room: listen, read along, a wrong object costs nothing, the right one goes in the bag', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&nojourney=1');
  const first = await until(page, (s) => s.scene === 'SentenceRoom' && Boolean(s.room?.sentence), 30_000, 'sentence room');
  const sent = first.room!.sentence!;
  const key = sent.key;
  expect(sent.skipped).toBe(false);
  expect(sent.tokens.at(-1)).toBe(key.toUpperCase());
  for (const t of sent.tokens) expect(t).toBe(t.toUpperCase());

  // Pass 1, listening: then her turn, nothing lit yet.
  const read = await until(page, (s) => s.room?.sentence?.pass === 'read' && !s.room.locked, 90_000, 'read pass');
  expect(read.voice.history).toContain('nar_elsa_room_listen');
  expect(read.voice.history).not.toContain(`word_${key}`);
  expect(read.room!.sentence!.index).toBe(-1);
  expect(read.room!.spots.length).toBe(0);

  // Green lights the first word and says it.
  await press(page, 'green');
  const lit0 = await until(page, (s) => s.room?.sentence?.index === 0 && !s.room.locked, 10_000, 'light on word 1, said');
  expect(lit0.voice.history.at(-1)).toMatch(/^word_/);
  expect(lit0.voice.history.filter((id) => id.startsWith('word_')).length).toBe(1);

  // On to the key word: the three objects wake up.
  const find = await readToKeyWord(page);
  expect(find.room!.sentence!.index).toBe(sent.tokens.length - 1);
  const awake = await until(page, (s) => (s.room?.spots.length ?? 0) === 3, 10_000, 'three objects');
  expect(awake.room!.spots.filter((sp) => sp.correct === true).length).toBe(1);
  expect(awake.voice.history).not.toContain(`word_${key}`);

  // Wrong first: a funny line, same round, nothing fetched, the key word still unsaid.
  const wrong = awake.room!.spots.find((sp) => sp.correct === false)!;
  await until(page, (s) => Boolean(s.room && !s.room.locked), 30_000, 'room listening');
  await walkTo(page, wrong.x, wrong.y + 12);
  await press(page, 'green');
  const after = await until(page, (s) => s.voice.history.some((id) => /^nar_.*_wrong_\d$/.test(id)), 20_000, 'wrong line');
  expect(after.room?.round).toBe(first.room!.round);
  expect(after.room?.sentence?.pass).toBe('find');
  expect(after.episode.fetched).not.toContain(key);
  expect(after.voice.history).not.toContain(`word_${key}`);

  // Right: the whole sentence back, the key word said, into the bag, back to the hub.
  await choose(page);
  await until(page, (s) => s.voice.history.includes(`word_${key}`), 30_000, 'key word confirmation');
  const hub = await until(page, (s) => s.scene === 'Hub', 60_000, 'back in the hub');
  expect(hub.episode.fetched).toContain(key);
  expect(hub.episode.house.done).toContain('a');
  expect(hub.episode.read).toContain(key);
  expect(hub.progress.frames?.[sent.frame]?.recent.at(-1)).toBe(false);
  expectNoErrors(errors);
});

test('a solid sentence frame skips the listening pass', async ({ page }) => {
  const errors = collectErrors(page);
  const stat = { seen: 6, right: 6, wrong: 0, recent: [true, true, true, true, true, true], last: Date.now() };
  await seedProgress(page, {
    version: 1,
    sounds: {},
    words: {},
    spelling: {},
    frames: Object.fromEntries(FETCH_FRAMES.map((f) => [f, stat])),
    episodes: 0,
  });
  await boot(page, '?scene=room&slot=a&nojourney=1');
  const s = await until(page, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence), 30_000, 'sentence room');
  expect(s.room!.sentence!.skipped).toBe(true);
  // The room opens with an arrival beat (ARRIVE_MS) before any pass runs, so the
  // pass may still read 'listen' here; it must go straight to 'read', never listening.
  const read = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 30_000, 'read pass');
  expect(read.voice.history).not.toContain('nar_elsa_room_listen');
  expect(read.voice.history).toContain('nar_elsa_room_your_turn');
  expectNoErrors(errors);
});

test('F9 out of a sentence room and back: it restarts cleanly', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&nojourney=1');
  await until(page, (s) => s.room?.sentence?.pass === 'read' && !s.room.locked, 90_000, 'read pass');
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 10_000, 'parent');
  await press(page, 'red');
  // The parent page returns to the current step (the house), so she is back in the hub, room a still open.
  const back = await until(page, (s) => s.scene === 'Hub' || s.scene === 'SentenceRoom', 15_000, 'back from parent');
  if (back.scene === 'Hub') {
    expect(back.episode.house.done).not.toContain('a');
    await hubGo(page, 'door_a');
  }
  const fresh = await until(page, (s) => s.scene === 'SentenceRoom' && Boolean(s.room?.sentence), 30_000, 'sentence room again');
  expect(fresh.room!.round.startsWith('sentence:a:')).toBe(true);
  const key = await playSentenceRoom(page);
  const hub = await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  expect(hub.episode.fetched).toEqual([key]);
  expect(hub.episode.house.done).toContain('a');
  expectNoErrors(errors);
});

test('Spell the Spell (parked): ghost boxes fill only with the right letter', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=spell&hero=julia&villain=bavmorda');
  const s = await until(page, (st) => st.scene === 'Spelling' && Boolean(st.room?.spelling) && !st.room!.locked, 60_000, 'first word');
  const word = s.room!.spelling!.word;
  const wrongLetter = 'zqx'.split('').find((c) => c !== word[0]!.toLowerCase())!;
  await typeLetter(page, wrongLetter);
  await page.waitForTimeout(200);
  expect((await state(page)).room?.spelling?.filled).toBe(0);
  for (const ch of word) {
    await typeLetter(page, ch);
    await page.waitForTimeout(150);
  }
  await until(page, (st) => Boolean(st.room?.spelling) && st.room!.spelling!.word !== word, 60_000, 'second word');
  expectNoErrors(errors);
});

test('Battle part 2: a wrong and a right walking pick, counter-item, finish, victory', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=2&hero=elsa&ally=anna&villain=scar&nojourney=1');
  const b = await until(page, (s) => s.scene === 'Battle', 30_000, 'battle');
  expect(b.battle?.part).toBe(2);
  await playBattle(page, 2, true);
  const end = await until(page, (s) => s.scene === 'Victory', 30_000, 'victory');
  // The wrong pick fired nothing and cost nothing; the partner said what it was
  // and what to find, and it is recorded as a miss.
  const missed = Object.values(end.progress.words).some((st) => st.recent.includes(false));
  expect(missed).toBe(true);
  expect(end.voice.history.some((id) => /_not_move_/.test(id))).toBe(true);
  expect(end.voice.history.some((id) => /_was_move_/.test(id))).toBe(true);
  expect(end.voice.history.some((id) => /_find_move_/.test(id))).toBe(true);
  expect(end.voice.history.some((id) => /_move_ok$/.test(id))).toBe(false);
  expect(end.battle?.ultimates).toBe(1);
  expect(end.battle?.movePicks).toBe(2);
  expect(end.battle?.combos).toBe(1);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expect(end.battle?.itemsUsed).toBeGreaterThan(0);
  expect(end.battle!.abilitiesFired).toBeGreaterThan(20);
  expect(end.fx.hitstops).toBeGreaterThan(0);
  expect(end.voice.history.some((id) => id.startsWith('taunt_'))).toBe(true);
  expectNoErrors(errors);
});
