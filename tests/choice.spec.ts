/**
 * Item 174: choice mode. A grown-up turns it on (blue at the title, Dad's 2 in
 * the bedroom), she picks the ally and the villain from the active cast, and
 * the episode runs with exactly those two.
 */

import { test, expect } from '@playwright/test';

import { ACTIVE_CAST } from '../src/config';
import { boot, choose, collectErrors, dad, expectNoErrors, leaveBedroom, place, press, shotIn, until, type WWState } from './harness';

const shot = shotIn('174');

const spotIds = (s: WWState) => s.room!.spots.map((x) => x.id);
const pick = (page: Parameters<typeof until>[0], what: 'ally' | 'villain') =>
  until(page, (s) => s.scene === 'Pick' && s.episode.choice && s.step.kind === 'pick' && s.step.what === what && !s.room?.locked, 30_000, `the ${what} pick`);

test('blue at the title: she picks an ally and a villain, red goes back, and the episode has exactly those two', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await until(page, (s) => s.scene === 'Title', 30_000, 'the title');
  await shot(page, 'title');
  await press(page, 'blue');

  // Every active ally, future ones too; the instruction said, no reading needed.
  let s = await pick(page, 'ally');
  expect(spotIds(s).sort()).toEqual([...ACTIVE_CAST.allies].sort());
  expect(s.voice.history).toContain('core_choose_ally');
  await shot(page, 'allies');

  // Red from the first pick is the title, and choice mode is off again.
  await press(page, 'red');
  s = await until(page, (x) => x.scene === 'Title', 30_000, 'back at the title');
  expect(s.episode.choice).toBe(false);
  await press(page, 'blue');
  s = await pick(page, 'ally');

  // A card's name as she comes to it; green chooses.
  const card = s.room!.spots.find((x) => x.id === 'scar')!;
  await place(page, card.x, card.y + 12);
  s = await until(page, (x) => x.voice.history.includes('name_scar'), 5_000, 'her name');
  await shot(page, 'lit');
  await choose(page, 'moriarty');
  s = await pick(page, 'villain');
  expect(s.voice.history).toContain('name_moriarty');
  // Nobody is ever her own villain: Evil Moriarty sits this one out.
  expect(spotIds(s).sort()).toEqual(ACTIVE_CAST.villains.filter((v) => v !== 'moriarty').sort());
  expect(s.episode.ally).toBe('moriarty');
  await shot(page, 'villains');

  // Red goes back a step: the friend can be changed.
  await press(page, 'red');
  await pick(page, 'ally');
  await choose(page, 'dada_jason');
  await pick(page, 'villain');
  await choose(page, 'elsa');

  s = await until(page, (x) => x.scene === 'Bedroom', 30_000, 'the bedroom');
  expect(s.episode.villain).toBe('elsa');
  // She picked the person: his form is drawn.
  expect(s.episode.ally).toMatch(/^dada_jason/);
  // Her picks are not her rotations; the other dad wakes her as usual.
  expect(s.progress.recent.villain ?? []).toEqual([]);
  expect(s.progress.recent.ally ?? []).toEqual([]);
  expect(s.episode.primary).toMatch(/^dada_matt/);
  // Already chosen: the bedroom offers nothing.
  expect(await dad(page, 'yes').then(() => until(page, (x) => x.scene === 'Bedroom', 5_000, 'still there'))).toBeTruthy();

  await leaveBedroom(page);
  s = await until(page, (x) => x.scene === 'Hub', 30_000, 'the hub');
  expect(s.episode.ally).toMatch(/^dada_jason/);
  expect(s.episode.villain).toBe('elsa');
  expectNoErrors(errors);
});

test("Dad's 2 in the bedroom: the drawn episode goes, her rotations with it; her buttons do not", async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page, '?seed=4');
  await until(page, (s) => s.scene === 'Title', 30_000, 'the title');
  await press(page, 'green');
  let s = await until(page, (x) => x.scene === 'Bedroom' && Boolean(x.progress.recent.villain?.length), 30_000, 'the bedroom, her cast remembered');
  await shot(page, 'bedroom');
  await press(page, 'blue');
  await dad(page, 'no');
  await page.waitForTimeout(300);
  s = await until(page, (x) => x.scene === 'Bedroom', 5_000, 'still in the bedroom');
  expect(s.episode.choice).toBe(false);

  await dad(page, 'yes');
  s = await pick(page, 'ally');
  expect(s.progress.recent).toEqual({});
  expectNoErrors(errors);
});
