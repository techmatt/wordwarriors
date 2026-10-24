/**
 * The move choice's pad placement (item 071; src/battle/padPlace.ts): no sign
 * over the villain, nor over a contest's team at its held stations (M17, the
 * cook-off's Dada Jason); a contest's pads stay on her side even when it is
 * narrow (M7); a fighter under a sign steps clear (M6, M8).
 * `npx tsx --test tests/unit/padPlace.test.ts` (also part of `npm run test:unit`).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bodyBox, clearSpot, coveredShare, placePads, ringBox, signBox, type PlaceBody } from '../../src/battle/padPlace';
import { seeded, spread } from './seeds';

/** A fighter standing at (x, y), `w` wide and `h` tall. */
const body = (x: number, y: number, w: number, h: number): PlaceBody => ({ x, y, cx: x, cy: y - h / 2, half: w / 2, top: y - h });
const floor = { left: 70, right: 1210 };
const signs = (spots: { x: number; y: number }[]) => spots.map((p) => signBox(p.x, p.y));

test('padPlace: a contest keeps every sign off a tall teammate at his station and off the villain (M17)', () => {
  for (let seed = 1; seed <= 40; seed++) {
    // The cook-off (stages/cookoff.ts spot()): her in front at the heroes' station, Dada Jason a
    // step back and to her left, swaying; the villain at his.
    const me = body(265 + (seed % 3) * 20, 505, 120, 220);
    const jason = body(150 + ((seed % 5) - 2) * 8, 450, 150 + (seed % 4) * 20, 300);
    const villain = body(1020, 505, 200 + (seed % 3) * 40, 300);
    const spots = placePads({ n: 3, avoid: [me, jason, villain], cover: [villain, jason], contest: { meX: me.x, villain }, ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    for (const b of [jason, villain]) assert.equal(coveredShare(bodyBox(b), signs(spots)), 0, `seed ${seed}: ${JSON.stringify(spots)}`);
    for (const p of spots) assert.ok(p.x < villain.x - villain.half, `seed ${seed}: on her side`);
  }
});

test('padPlace: her side wins over covering nobody when a contest has no room for both', () => {
  // A wide teammate across the middle of her side: no clear set of three there, while past the villain is open floor.
  const me = body(200, 560, 120, 220);
  const mate = body(450, 560, 300, 320);
  const villain = body(800, 560, 160, 300);
  const spots = placePads({ n: 3, avoid: [me, mate, villain], cover: [villain, mate], contest: { meX: me.x, villain }, ...floor, rand: seeded(7) });
  assert.equal(spots.length, 3);
  for (const p of spots) assert.ok(p.x < villain.x, `${p.x}: past him`);
  assert.equal(coveredShare(bodyBox(villain), signs(spots)), 0);
});

test('padPlace: the rope pull keeps three pads on her side when it is narrow, never past the serpent (M7)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    // The knot on her side: the line shifted towards her, a wide serpent at the rope's end.
    const team = [body(360, 548, 110, 200), body(225, 590, 110, 200), body(90, 632, 110, 200)];
    const villain = body(895, 565, 320, 260);
    const spots = placePads({ n: 3, avoid: [...team, villain], cover: [villain, ...team.slice(1)], contest: { meX: 360, villain }, ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    for (const p of spots) assert.ok(p.x + 115 < villain.x - villain.half, `seed ${seed}: ${p.x} reaches him`);
    for (let i = 1; i < spots.length; i++) assert.ok(spots[i]!.x - spots[i - 1]!.x >= 240, 'the plates never touch');
  }
});

test('padPlace: a contest\'s signs stay off the serpent wherever it rocks on its station (item 083, M7/M17)', () => {
  for (let seed = 1; seed <= 30; seed++) {
    // The rope pull as the choice opens: the line where the lead has it, the serpent anywhere in its rock.
    const lead = ((seed % 5) - 2) * 10;
    const team = [body(360 - lead, 548, 110, 200), body(225 - lead, 590, 110, 200), body(90 - lead, 632, 110, 200)];
    const vx = 895 - lead + ((seed % 5) - 2) * 6;
    const villain = body(vx, 565, 320, 260);
    const spots = placePads({ n: 3, avoid: [...team, villain], cover: [villain, ...team.slice(1)], contest: { meX: team[0]!.x, villain }, sway: 40, ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    // The published sign plate (moveChoice info()) over the body wherever it drifts within its rock.
    const plates = spots.map((p): [number, number, number, number] => [p.x - 115, p.y - 265, p.x + 115, p.y - 165]);
    for (const dx of [-30, -15, 0, 15, 30]) {
      const moved = bodyBox({ ...villain, x: villain.x + dx });
      assert.equal(coveredShare(moved, plates), 0, `seed ${seed}, rocked ${dx}: ${JSON.stringify(spots)}`);
    }
  }
});

test('padPlace: a sliver of cover is still cover: a clear way beats one under 0.5% (item 083)', () => {
  // Any clear layout must win over a layout covering a tiny share, whatever its clearance.
  for (let seed = 1; seed <= 20; seed++) {
    const me = body(300, 560, 120, 220);
    const villain = body(760 + seed * 5, 520, 260, 340);
    const spots = placePads({ n: 2, avoid: [me, villain], cover: [villain], ...floor, rand: seeded(spread(seed)) });
    assert.equal(coveredShare(bodyBox(villain), signs(spots)), 0, `seed ${seed}`);
  }
});

test('padPlace: a fight keeps every sign off the villain', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const me = body(300, 560, 120, 220);
    const villain = body(500 + seed * 25, 520, 260, 340);
    const spots = placePads({ n: 3, avoid: [me, villain], cover: [villain], ...floor, rand: seeded(spread(seed)) });
    assert.equal(spots.length, 3);
    assert.equal(coveredShare(bodyBox(villain), signs(spots)), 0, `seed ${seed}`);
  }
});

test('padPlace: no pad opens within her reach, however crowded the floor (hunt 7: the story fight)', () => {
  // The story fight's crowd: her, Dad, the ally, the villain and her move's helpers, anywhere on the floor.
  // Without `me` a quarter of these left a pad in her reach, so a mashed green picked it unread.
  for (let seed = 1; seed <= 200; seed++) {
    const rand = seeded(spread(seed));
    const me = body(200 + rand() * 800, 470 + rand() * 180, 90, 170);
    const dad = body(150 + rand() * 500, 470 + rand() * 180, 110, 230);
    const ally = body(150 + rand() * 500, 340 + rand() * 300, 110, 170);
    const villain = body(900 + rand() * 200, 540, 220, 260);
    const minions = [0, 1, 2].map(() => body(500 + rand() * 500, 480 + rand() * 160, 60, 70));
    const spots = placePads({ n: 3, avoid: [me, villain, dad, ally, ...minions], cover: [villain], ...floor, rand, me: { x: me.x, y: me.y, reach: 120 } });
    assert.equal(spots.length, 3);
    for (const p of spots) assert.ok(Math.hypot(p.x - me.x, p.y - me.y) >= 120, `seed ${seed}: a pad ${Math.round(Math.hypot(p.x - me.x, p.y - me.y))} px from her`);
  }
});

test('padPlace: her reach gives way to a contest\'s rules: pads on her side, nobody covered more (hunt 7\'s review)', () => {
  // Narrow contests (the rope pull, M7): before the review, keeping her reach put a pad past the
  // villain in 32 of 570 such layouts and a sign over him in 45.
  for (let seed = 1; seed <= 120; seed++) {
    const rand = seeded(spread(seed));
    const villain = body(820 + rand() * 180, 520, 240, 320);
    const me = body(200 + rand() * 360, 470 + rand() * 160, 110, 200);
    const base = { n: 3, avoid: [me, villain], cover: [villain], contest: { meX: me.x, villain }, sway: 30, ...floor };
    const spots = placePads({ ...base, rand: seeded(seed), me: { x: me.x, y: me.y, reach: 120 } });
    const plain = placePads({ ...base, rand: seeded(seed) });
    assert.equal(spots.length, 3);
    for (const p of spots) assert.ok(p.x < villain.x, `seed ${seed}: a pad past the villain at ${p.x}`);
    const sway = (b: PlaceBody): [number, number, number, number] => { const [l, t, r, btm] = bodyBox(b); return [l - 30, t, r + 30, btm]; };
    assert.ok(coveredShare(sway(villain), signs(spots)) <= coveredShare(sway(villain), signs(plain)) + 1e-9, `seed ${seed}: covers the villain more`);
  }
});

/**
 * The story fight's stage as its move choices open (src/battle/stages/story.ts STORY_MARKS,
 * content/battle/stories/smaug.ts, StoryDirector.guards): an anchored stage, so a contest's
 * rules and its held team, with her anywhere a walk can leave her, gold guards in the middle
 * and the props (stone, ledge, hoard) as their pictures stand.
 */
const STORY_PROPS: [number, number, number, number][] = [
  [675, 455, 875, 635], // the stone, drawn at its spot's x + 95
  [0, 460, 240, 650], // the ledge
  [730, 290, 990, 450], // the hoard
];
function storyStage(seed: number, guards: boolean) {
  const rand = seeded(spread(seed));
  const me = body(150 + rand() * 750, 470 + rand() * 180, 90, 170);
  const dad = body(250 + ((seed % 3) - 1) * 20, 470, 120, 240);
  const ally = body(370 + ((seed % 5) - 2) * 15, 655, 110, 170);
  const villain = body(1020 + ((seed % 3) - 1) * 10, 560, 300 + (seed % 3) * 30, 320);
  const minions = guards ? [0, 1, 2].map((i) => body(760 + i * 70, 560 + (i % 3) * 45, 70, 90)) : [];
  return {
    me,
    input: {
      n: seed % 4 === 0 ? 2 : 3,
      avoid: [me, villain, dad, ally, ...minions],
      cover: [villain, dad, ally],
      contest: { meX: me.x, villain },
      sway: 40,
      ...floor,
      rand,
      me: { x: me.x, y: me.y, reach: 120, first: true },
      keepOff: STORY_PROPS,
    },
  };
}

test('padPlace: the story fight never opens a pad within her reach, however crowded (hunt 10, M54)', () => {
  // Before M54 her reach gave way to the contest's rules here, and every choice of drawn10's story
  // fight opened one at 90 px: a green mashed after "Use RED!" took a pad she never walked to.
  for (let seed = 1; seed <= 150; seed++) {
    const { me, input } = storyStage(seed, seed % 2 === 0);
    const spots = placePads(input);
    assert.equal(spots.length, input.n, `seed ${seed}`);
    for (const p of spots) assert.ok(Math.hypot(p.x - me.x, p.y - me.y) >= 120, `seed ${seed}: a pad ${Math.round(Math.hypot(p.x - me.x, p.y - me.y))} px from her`);
  }
});

test('padPlace: the story fight\'s rings stand on its props as little as her reach allows (M54)', () => {
  // Her side between the ledge and the stone holds one ring, so the rest may sit on the faded
  // stone or ledge (Matt's call): as little of them as fits, never at her reach's cost.
  const on = (spots: { x: number; y: number }[]) => spots.reduce((s, p) => s + coveredShare(ringBox(p.x, p.y), STORY_PROPS), 0);
  let kept = 0;
  let plain = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const { input } = storyStage(seed, seed % 2 === 0);
    const spots = placePads({ ...input, rand: seeded(seed) });
    const without = placePads({ ...input, keepOff: undefined, rand: seeded(seed) });
    kept += on(spots);
    plain += on(without);
    assert.ok(on(spots) <= on(without) + 1e-9, `seed ${seed}: more on the props (${on(spots).toFixed(2)} against ${on(without).toFixed(2)})`);
  }
  // The stage leaves little room (her side ends at about 755, the stone's picture starts at 675), so the gain is small.
  assert.ok(kept < plain, `rings on the props: ${kept.toFixed(2)} kept off, ${plain.toFixed(2)} without`);
});

test('padPlace: when nobody can be kept clear, the pads still go up, covering as little as they can', () => {
  // A giant across the whole floor.
  const giant = body(640, 640, 1100, 600);
  const spots = placePads({ n: 3, avoid: [giant], cover: [giant], ...floor, rand: seeded(3) });
  assert.equal(spots.length, 3);
});

test('clearSpot: a fighter under a sign steps clear of it and its ring; one clear stays put (M6, M8)', () => {
  const pads = [{ x: 400, y: 560 }, { x: 700, y: 560 }];
  const fl = { left: 70, right: 1210, top: 420, bottom: 670 };
  const to = clearSpot({ x: 700, y: 540, half: 80, h: 300 }, pads, [], fl);
  assert.equal(coveredShare([to.x - 80, to.y - 300, to.x + 80, to.y], signs(pads)), 0);
  assert.ok(pads.every((p) => Math.abs(to.x - p.x) >= 95 + 40 || Math.abs(to.y - p.y) >= 60), 'off the rings');
  assert.deepEqual(clearSpot({ x: 1100, y: 600, half: 60, h: 150 }, pads, [], fl), { x: 1100, y: 600 });
});
