/**
 * Item 027: the victory scenes. Every scene works for every cast, its lines
 * are voiced, it is short, and the draw never repeats last episode's scene.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { CHARACTER_BY_ID, personOf } from '../../content/battle/roster';
import { ENDINGS, ENDING_BY_ID, endingArt, endingPropArt } from '../../content/house/endings';
import { drawCast, seededRand, type Cast } from '../../src/rules/cast';
import { FIT_WEIGHT, endingFits, endingPeople, endingScript, pickEnding, standXs } from '../../src/rules/endings';
import { ProgressStore, type StorageLike } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';

function memory(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** Drawn casts, plus the shapes a draw rarely makes: no ally, both dads busy, the dads as ally and villain. */
function casts(): Cast[] {
  const rand = seededRand(27);
  const out: Cast[] = Array.from({ length: 1500 }, () => drawCast({ hero: 'julia' }, rand));
  out.push(drawCast({ hero: 'julia', overrides: { ally: null } }, rand));
  out.push(drawCast({ hero: 'julia', overrides: { ally: null, secondary: true } }, rand));
  out.push(drawCast({ hero: 'julia', overrides: { ally: 'dada_jason', villain: 'dada_matt_cyber' } }, rand));
  out.push(drawCast({ hero: 'julia', overrides: { ally: 'dada_matt_lifter', villain: 'tiamat', secondary: true } }, rand));
  out.push({ hero: 'julia', ally: 'ellie', villain: 'tiamat', primary: 'dada_matt', secondary: null });
  // A dad as hero (the parked pick screens), no ally, the other dad the villain: nobody left to wake her.
  out.push(drawCast({ hero: 'dada_matt', overrides: { ally: null, villain: 'dada_jason_warlock' } }, rand));
  out.push(drawCast({ hero: 'elsa', overrides: { ally: null } }, rand));
  return out;
}

test('endings: every scene has its art, and its fits name real roster ids', () => {
  assert.ok(ENDINGS.length >= 6);
  for (const e of ENDINGS) {
    assert.ok(ART_BY_ID[endingArt(e.id)], endingArt(e.id));
    for (const p of e.props) assert.ok(ART_BY_ID[endingPropArt(p.id)], endingPropArt(p.id));
    if (e.fit) assert.ok(CHARACTER_BY_ID[e.fit.form]?.person || ['dada_matt', 'dada_jason'].includes(e.fit.form), `${e.id}: ${e.fit.form} is a dad form`);
    for (const v of e.villains) assert.ok(CHARACTER_BY_ID[v], `${e.id}: villain ${v}`);
    assert.ok(e.stand.left < e.stand.right);
  }
});

test('endings: every scene works for every cast: four lines, all voiced, by people who are there', () => {
  const lines = new Map(composeLines().map((l) => [l.id, l]));
  const manifestFile = 'public/voice-gen/manifest.json';
  const built = existsSync(manifestFile) ? new Map((JSON.parse(readFileSync(manifestFile, 'utf8')) as { lines: { id: string; duration?: number }[] }).lines.map((l) => [l.id, l.duration ?? 0])) : null;
  let longest = 0;
  let shortest = Infinity;
  for (const c of casts()) {
    const people = endingPeople(c);
    assert.equal(people.at(-1), c.villain, 'the villain stands last');
    assert.equal(people[0], c.hero, 'the hero stands first');
    assert.equal(new Set(people.map(personOf)).size, people.length, 'one each');
    for (const id of [c.ally, c.primary, c.secondary]) if (id) assert.ok(people.includes(id), `${id} is there`);
    for (const e of ENDINGS) {
      const beats = endingScript(c, e.id);
      assert.equal(beats.length, 4, e.id);
      for (const b of beats) {
        assert.ok(people.includes(b.who), `${e.id}: ${b.who} says a line and is there`);
        const l = lines.get(b.line);
        assert.ok(l, `${b.line} composed`);
        assert.equal(l.speaker, personOf(b.who), `${b.line} in ${b.who}'s own voice`);
        if (built) assert.ok(built.has(b.line), `${b.line} built (npm run voice:build)`);
      }
      assert.equal(beats[1]!.who, c.villain, 'the villain says the second line');
      assert.match(beats[1]!.line, new RegExp(`^reformed_${c.villain}_`));
      assert.equal(beats[2]!.who, c.hero, 'the hero cheers');
      if (built) {
        const t = beats.reduce((a, b) => a + (built.get(b.line) ?? 0), 0);
        longest = Math.max(longest, t);
        shortest = Math.min(shortest, t);
      }
    }
  }
  // About 20–30 s in all: the lines, the pauses before, between and after, and the fades.
  if (built) {
    const around = 3 + 3 * 1.5 + 3 + 0.9;
    assert.ok(longest + around <= 30, `longest scene ${(longest + around).toFixed(1)} s`);
    assert.ok(shortest + around >= 15, `shortest scene ${(shortest + around).toFixed(1)} s`);
  }
});

test('endings: everyone stands on screen, apart, and out of the campfire', () => {
  for (const e of ENDINGS) {
    for (let n = 1; n <= 6; n++) {
      const xs = standXs(e, n);
      assert.equal(xs.length, n);
      for (const x of xs) assert.ok(x - e.stand.h * 0.4 >= 0 && x + e.stand.h * 0.4 <= 1280, `${e.id} n=${n}: ${x} on screen`);
      for (let i = 1; i < n; i++) assert.ok(xs[i]! - xs[i - 1]! >= e.stand.h * 0.5, `${e.id} n=${n}: ${xs.join(',')} apart`);
      const gap = e.stand.gap;
      if (gap) for (const x of xs) assert.ok(x + e.stand.h * 0.4 <= gap[0] || x - e.stand.h * 0.4 >= gap[1], `${e.id} n=${n}: ${x} clear of the gap`);
      // Nobody hidden behind a prop that is drawn over them, apart from a front prop they stand behind.
      for (const p of e.props.filter((q) => !q.front && q.y > e.stand.y)) {
        for (const x of xs) assert.ok(Math.abs(x - p.x) >= p.w / 2, `${e.id} n=${n}: ${x} not behind ${p.id}`);
      }
    }
  }
});

test('endings: a fitting dad closes with his own line; nobody else does', () => {
  const chef: Cast = { hero: 'julia', ally: 'dada_jason', villain: 'tiamat', primary: 'dada_matt', secondary: null };
  assert.equal(endingScript(chef, 'dessert')[3]!.line, 'end_dada_jason_dessert_fit');
  // The warrior is Dada Jason too, but not the chef: the plain close.
  const warrior: Cast = { ...chef, ally: 'dada_jason_warrior' };
  assert.match(endingScript(warrior, 'dessert')[3]!.line, /_dessert_close$/);
  // A dad who is the villain does not get the fit line (he has his own reformed one).
  const villainChef: Cast = { hero: 'julia', ally: 'ellie', villain: 'dada_jason', primary: 'dada_matt', secondary: null };
  assert.match(endingScript(villainChef, 'dessert')[3]!.line, /_dessert_close$/);
  assert.ok(endingFits(ENDING_BY_ID.dessert!, villainChef), 'but the scene still fits him');
  // The close goes to someone who has not spoken yet: the waking dad, not the host again.
  assert.equal(endingScript({ ...chef, ally: 'ellie' }, 'picnic')[3]!.who, 'dada_matt');
  // Nobody else there: the host closes too.
  const alone: Cast = { hero: 'julia', ally: null, villain: 'smaug', primary: 'dada_matt', secondary: null };
  assert.equal(endingScript(alone, 'picnic')[3]!.who, 'dada_matt');
});

test('endings: never last episode\'s scene, and a fitting one is likelier', () => {
  const rand = seededRand(5);
  const chef: Cast = { hero: 'julia', ally: 'dada_jason', villain: 'tiamat', primary: 'dada_matt', secondary: null };
  const counts = new Map<string, number>();
  const N = 8000;
  for (let i = 0; i < N; i++) {
    const id = pickEnding(chef, 'picnic', rand);
    assert.notEqual(id, 'picnic');
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  // Chef Jason fits the dessert table; builder Dada Matt the pillow fort; Tiamat the stars.
  const fitting = ENDINGS.filter((e) => e.id !== 'picnic' && endingFits(e, chef)).map((e) => e.id).sort();
  assert.deepEqual(fitting, ['dessert', 'fort', 'stars']);
  const others = ENDINGS.length - 1 - fitting.length;
  const share = FIT_WEIGHT / (FIT_WEIGHT * fitting.length + others);
  for (const id of fitting) assert.ok(Math.abs(counts.get(id)! / N - share) < 0.03, `${id}: ${counts.get(id)! / N} vs ${share}`);
  assert.equal(counts.size, ENDINGS.length - 1, 'every other scene comes up');
});

test('endings: the store keeps her last scene', () => {
  const storage = memory();
  const a = new ProgressStore(storage);
  assert.equal(a.lastEnding(), null);
  a.endingPlayed('boat');
  assert.equal(new ProgressStore(storage).lastEnding(), 'boat');
});
