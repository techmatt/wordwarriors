/**
 * One page boot per test, many asserts each. Every scene is reached directly
 * with `?scene=`, so a failure points at one step. The one tagged SMOKE is
 * `npm test`'s; the untagged quick ones run with `npm run test:browser`; the
 * ones tagged SLOW (10–50 s each even at clock speed 5) run with the slow lane
 * (`npm run test:slow`, `npm run test:all`).
 */

import { test, expect, type Page } from '@playwright/test';

import {
  SLOW,
  SMOKE,
  boot,
  choose,
  chooseWrong,
  collectErrors,
  dadLock,
  expectNoErrors,
  hubGo,
  leaveBedroom,
  playBattle,
  playSentenceRoom,
  press,
  readToKeyWord,
  seedSolidFrames,
  state,
  texts,
  toParentAndBack,
  typeLetter,
  until,
  walkTo,
} from './harness';

/** The grown-ups page is on its page 2 (its "back to page 1" shows). */
const onPage2 = async (page: Page): Promise<boolean> => (await texts(page)).some((t) => t.text.includes('stored words (page 3)'));

test('title boots, F9 opens the grown-ups page and returns, green starts the bedroom', SMOKE, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'title');
  await toParentAndBack(page);
  await until(page, (s) => s.scene === 'Title', 10_000, 'back to title');
  await page.waitForTimeout(300);
  await press(page, 'green');
  // Pick screens are off by default: straight into the bedroom.
  const s = await until(page, (st) => st.scene === 'Bedroom', 15_000, 'bedroom');
  expect(s.step.kind).toBe('bedroom');
  expectNoErrors(errors);
});

test('bedroom: the wake-up news, a toy reacts to green, the door leads to the hub', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=bedroom&nojourney=1');
  // During the news the door is not there (it shows only for the waker's entrance).
  const news = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:news', 90_000, 'bad news');
  expect(news.room!.shown).not.toContain('door');
  const s = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:door' && !st.room.locked, 90_000, 'news told, door open');
  expect(s.room!.shown).toContain('door');
  expect(s.voice.history).toContain('wake_dada_matt_good_julia');
  expect(s.voice.history).toContain('wake_dada_matt_helper_ellie');
  expect(s.voice.history).toContain('wake_dada_matt_bad_tiamat');
  expect(s.room!.spots.map((sp) => sp.id)).toContain('door');
  // The default episode is no scenario: she is up in her rainbow twirl dress.
  expect(s.room!.player.art).toBe('char_julia_good');

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

test('bedroom (item 069): yellow at the door says again the door line she heard, its drawn variant', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  // Yellow said variant 1 instead of the drawn one: seed 13 draws Dada Matt's door_2, seed 3
  // Dada Jason's first line (item 081: four seeds until then; 5 and 8 drew a first line too).
  for (const seed of [3, 13]) {
    await boot(page, `?scene=bedroom&seed=${seed}&nojourney=1`);
    const s = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:door' && !st.room.locked, 90_000, 'door open');
    const heard = [...s.voice.history].reverse().find((id) => /^wake_.*_door(_\d)?$/.test(id))!;
    expect(heard, 'the door line was said').toBeTruthy();
    await press(page, 'yellow');
    const again = await until(page, (st) => st.voice.history.length > s.voice.history.length, 10_000, 'said again');
    expect(again.voice.history.at(-1)).toBe(heard);
  }
  expectNoErrors(errors);
});

test('hub part 1: the helper\'s scene gives the gift word in the circle, then door a opens a sentence room', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=house&nojourney=1');
  const circle = await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle' && !s.room.locked, 90_000, 'circle offered');
  expect(circle.episode.gift).toBeTruthy();
  expect(circle.episode.house.taught).toBe(false);
  // The default cast plays Ellie's first scene (item 037): its lines, the
  // reveal trailing off into the gift word's own clip, then the circle line.
  const h = circle.voice.history;
  const gift = h.indexOf(`nar_ellie_gift_word_${circle.episode.gift}`);
  expect(gift).toBeGreaterThan(0);
  expect(h[gift - 1]).toBe('hub_ellie_1_line3');
  expect(h[gift + 1]).toBe('hub_ellie_1_circle');
  expect(h).toContain('hub_ellie_1_line1');
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

test('sentence room: listen, read along, a wrong object costs nothing, the right one goes in the bag', SLOW, async ({ page }) => {
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
  expect(read.voice.history).toContain('nar_ellie_room_listen');
  expect(read.voice.history).not.toContain(`word_${key}`);
  expect(read.room!.sentence!.index).toBe(-1);
  expect(read.room!.spots.length).toBe(0);

  // Her one green reads it all to the key word (item 085); the three objects wake up.
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

test('a solid sentence frame skips the listening pass (from ?difficulty=2; at base it keeps it, item 067)', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSolidFrames(page);
  await boot(page, '?scene=room&slot=a&nojourney=1&difficulty=2');
  const s = await until(page, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence), 30_000, 'sentence room');
  expect(s.room!.sentence!.skipped).toBe(true);
  // The room opens with an arrival beat (ARRIVE_MS) before any pass runs, so the
  // pass may still read 'listen' here; it must go straight to 'read', never listening.
  const read = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 30_000, 'read pass');
  expect(read.voice.history).not.toContain('nar_ellie_room_listen');
  expect(read.voice.history).toContain('nar_ellie_room_your_turn');

  // Base difficulty (item 067): the same solid frames keep their listening pass.
  const base = await page.context().newPage();
  await base.bringToFront();
  await boot(base, '?scene=room&slot=a&nojourney=1');
  const b = await until(base, (st) => st.scene === 'SentenceRoom' && Boolean(st.room?.sentence), 30_000, 'sentence room at base');
  expect(b.room!.sentence!.skipped).toBe(false);
  expectNoErrors(errors);
});

test('dad lock: the backquote key stops every press but not walking, and again carries on where it was', async ({ page }) => {
  const errors = collectErrors(page);
  await seedSolidFrames(page);
  await boot(page, '?scene=room&slot=a&nojourney=1&difficulty=2');
  const read = await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 30_000, 'read pass');
  await page.keyboard.press('Backquote');
  expect(await dadLock(page)).toBe(true);
  await expect(page.locator('#dad-lock')).toBeVisible();
  for (const b of ['green', 'yellow', 'red', 'start']) await press(page, b);
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const locked = await state(page);
  expect(locked.room!.sentence!.index).toBe(read.room!.sentence!.index);
  expect(locked.scene).toBe('SentenceRoom');
  // Walking still works.
  const from = locked.room!.player!;
  await walkTo(page, from.x + 120, from.y);
  expect((await state(page)).room!.player!.x).toBeGreaterThan(from.x + 60);
  await page.keyboard.press('Shift+Backquote');
  expect(await dadLock(page)).toBe(false);
  await expect(page.locator('#dad-lock')).toHaveCount(0);
  await press(page, 'green');
  await until(page, (st) => st.room?.sentence?.index !== read.room!.sentence!.index, 10_000, 'green reads on after the unlock');
  expectNoErrors(errors);
});

test('a key held through a scene change is held, not pressed again by its auto-repeat (item 039)', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=parent');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'parent page');
  // Space flips the page, and the page restarts its scene (fresh keys, up).
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await expect.poll(() => onPage2(page), { timeout: 5_000 }).toBe(true);
  // Held: the OS repeats keydown (repeat = true). Before the fix each one flipped the page again
  // (an odd number of them, so the flips cannot cancel out).
  for (let i = 0; i < 5; i++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(120);
  }
  expect(await onPage2(page)).toBe(true);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  // A fresh press (held a frame or two, as a finger does) still flips it.
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await expect.poll(() => onPage2(page), { timeout: 5_000 }).toBe(false);
  expectNoErrors(errors);
});

test('a pad button held through a scene change is held, not pressed (item 069)', async ({ page }) => {
  const errors = collectErrors(page);
  // A stand-in Xbox pad with A (green) held from before the page opens.
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
    buttons[0] = { pressed: true, touched: true, value: 1 };
    const pad = { id: 'Xbox 360 Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons, get timestamp() { return performance.now(); } };
    (window as unknown as { __padA: (down: boolean) => void }).__padA = (down) => (buttons[0] = { pressed: down, touched: down, value: down ? 1 : 0 });
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
  });
  await boot(page, '?scene=parent');
  await until(page, (s) => s.scene === 'Parent', 30_000, 'parent page');
  // Held all along: before the fix Phaser's pad caught up a frame late and A read as a press (page 2).
  await page.waitForTimeout(800);
  expect(await onPage2(page)).toBe(false);
  // Let go and press: that is a press.
  await page.evaluate(() => (window as unknown as { __padA: (down: boolean) => void }).__padA(false));
  await page.waitForTimeout(200);
  await page.evaluate(() => (window as unknown as { __padA: (down: boolean) => void }).__padA(true));
  await expect.poll(() => onPage2(page), { timeout: 5_000 }).toBe(true);
  expectNoErrors(errors);
});

test('F9 out of a sentence room and back: it restarts cleanly', SLOW, async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&nojourney=1');
  await until(page, (s) => s.room?.sentence?.pass === 'read' && !s.room.locked, 90_000, 'read pass');
  await toParentAndBack(page);
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

test('F9 in a sentence room keeps a miss, and back from it after the find goes on to the hub, fetched once (item 039)', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=room&slot=a&nojourney=1');
  const backToRoom = async (): Promise<void> => {
    await toParentAndBack(page);
    const back = await until(page, (s) => s.scene === 'Hub' || s.scene === 'SentenceRoom', 15_000, 'back from parent');
    if (back.scene === 'Hub' && !back.episode.house.done.includes('a')) await hubGo(page, 'door_a');
  };
  // A miss, then F9 and back: it is still a miss.
  const first = await readToKeyWord(page);
  const key = first.room!.sentence!.key;
  await chooseWrong(page);
  await backToRoom();
  await readToKeyWord(page);
  // The right one, then F9 in the middle of the celebration and back.
  await choose(page);
  await until(page, (s) => s.room?.sentence?.pass === 'done', 10_000, 'found');
  await backToRoom();
  const hub = await until(page, (s) => s.scene === 'Hub', 30_000, 'hub');
  expect(hub.episode.fetched).toEqual([key]);
  const rec = hub.progress.words[key]!;
  expect(rec.seen).toBe(1);
  expect(rec.recent).toEqual([false]);
  expectNoErrors(errors);
});

test('chef scenario: with Dada Jason as ally, Julia wakes up as chef Julia and fights as her', SLOW, async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?scene=bedroom&ally=dada_jason&nojourney=1');
  // Asleep in bed: her default images (forms start once she is up).
  const asleep = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:sleep', 30_000, 'asleep');
  expect(asleep.room!.player.art).toBe('char_julia_good');
  const up = await until(page, (st) => st.scene === 'Bedroom' && st.room?.round === 'bedroom:news', 90_000, 'awake');
  expect(up.room!.player.art).toBe('char_julia_chef');

  await boot(page, '?scene=battle&part=1&battle=short&ally=dada_jason&nojourney=1');
  const b = await until(page, (s) => s.scene === 'Battle' && (s.battle?.heroes.length ?? 0) > 0, 30_000, 'battle');
  expect(b.battle!.heroes.find((h) => h.id === 'julia')?.art).toBe('char_julia_chef');
  expect(b.battle!.heroes.find((h) => h.id === 'dada_jason')?.art).toBe('char_dada_jason_good');
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

test('Battle part 2: a wrong and a right walking pick, counter-item, finish, victory', SLOW, async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await boot(page, '?scene=battle&part=2&battle=short&hero=elsa&ally=anna&villain=scar&nojourney=1');
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
  expect(end.battle?.ultimates).toBe(1);
  expect(end.battle?.movePicks).toBe(2);
  expect(end.battle?.combos).toBe(1);
  expect(end.battle?.villains[0]?.hp).toBe(0);
  expect(end.battle?.itemsUsed).toBeGreaterThan(0);
  // The fight ran (item 085: under `battle=short` a part fires about 20, and exactly 20 failed `> 20`).
  expect(end.battle!.abilitiesFired).toBeGreaterThan(12);
  expect(end.fx.hitstops).toBeGreaterThan(0);
  expect(end.voice.history.some((id) => id.startsWith('taunt_'))).toBe(true);
  expectNoErrors(errors);
});
