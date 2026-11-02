/**
 * The episode's cast draw and its remembering (src/episode/draws.ts, item
 * 076: split from Episode.ts so it runs in node). Only what was drawn freely
 * is her rotation: the default cast and an override remember nothing of
 * theirs, and a cast is remembered once per episode.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { personOf } from '../../content/battle/roster';
import { ACTIVE_CAST, EPISODE_DEFAULTS } from '../../src/config';
import { castEpisode, chooseAlly, chooseVillain, forgetCast, rememberCast, remembered, resetEpisode, setCastOptions } from '../../src/episode/draws';
import { choiceAllies, choiceVillains } from '../../src/rules/cast';
import { episode } from '../../src/episode/state';
import { seededRand } from '../../src/rules/random';
import { progress } from '../../src/state/progress';
import { fightStyle, giftWord, grabPlan, housePlan, movePlan } from '../../src/episode/plans';
import { FRAME_BY_ID } from '../../content/phonics/sentences';
import { withStems } from '../../src/rules/bank';
import { wordsOf } from '../../src/rules/sentences';

test('the default cast remembers no ally, form or variant; its fixed villain is not met', () => {
  progress.reset();
  setCastOptions({ fixed: true, rand: seededRand(3) });
  assert.equal(episode.villain, EPISODE_DEFAULTS.villain);
  assert.equal(episode.villainWasRandom, false);
  remembered.cast = false;
  rememberCast();
  assert.deepEqual(progress.snapshot().recent, {});
});

test('a drawn cast is remembered once: its villain, ally, the dads it meets and its variants', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(12) });
  resetEpisode();
  assert.equal(remembered.cast, false);
  rememberCast();
  assert.equal(remembered.cast, true);
  assert.deepEqual(progress.recentOf('villain'), [personOf(episode.villain)]);
  if (episode.ally) assert.deepEqual(progress.recentOf('ally'), [personOf(episode.ally)]);
  // Each dad she meets in a drawn form (seed 12: both dads, one waking her, one there too).
  const dads = [episode.primary, episode.secondary].filter((id): id is string => Boolean(id));
  assert.ok(dads.length > 0, 'seed 12 draws a dad');
  for (const id of dads) assert.deepEqual(progress.recentOf(`form_${personOf(id)}`), [id], id);
  const keys = Object.keys(progress.snapshot().recent);
  assert.ok(keys.some((k) => k.startsWith('quest_')), keys.join(' '));
  assert.ok(keys.includes('line_up'), keys.join(' '));
  // Once per episode: a second call (another step's advance) changes nothing.
  const before = JSON.stringify(progress.snapshot().recent);
  castEpisode();
  rememberCast();
  assert.equal(JSON.stringify(progress.snapshot().recent), before);
});

test('an overridden ally is not her rotation', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(5), overrides: { ally: 'ellie' } });
  resetEpisode();
  rememberCast();
  assert.equal(personOf(episode.ally!), 'ellie');
  assert.deepEqual(progress.recentOf('ally'), []);
  assert.equal(progress.recentOf('villain').length, 1);
  setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
});

test('choice mode (item 174): her picks stay out of her rotations; the rest of the cast is drawn round them', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(9) });
  resetEpisode();
  episode.choice = true;
  episode.stepIndex = 1;
  chooseAlly('ember_lark');
  assert.equal(episode.choice, true);
  assert.equal(episode.stepIndex, 1);
  assert.equal(episode.ally, 'ember_lark');
  chooseVillain('smaug');
  assert.equal(episode.ally, 'ember_lark');
  assert.equal(episode.villain, 'smaug');
  rememberCast();
  assert.deepEqual(progress.recentOf('villain'), []);
  assert.deepEqual(progress.recentOf('ally'), []);
  // Over: the next episode is a normal draw.
  resetEpisode();
  assert.equal(episode.choice, false);
});

test('choice mode (item 174): a dad she picks is the person, his form drawn from his rotation', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(2) });
  const forms = new Set<string>();
  for (let i = 0; i < 40; i++) {
    resetEpisode();
    episode.choice = true;
    chooseAlly('dada_matt');
    forms.add(episode.ally!);
    assert.equal(personOf(episode.primary!), 'dada_jason', 'the other dad wakes her');
  }
  assert.equal(forms.size, 4, [...forms].join(' '));
});

test("choice mode (item 174): the form drawn for a dad she picks moves his rotation; the session's fixed form holds", () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(8) });
  resetEpisode();
  episode.choice = true;
  chooseAlly('dada_jason');
  chooseVillain('smaug');
  rememberCast();
  assert.deepEqual(progress.recentOf('form_dada_jason'), [episode.ally]);
  assert.deepEqual(progress.recentOf('ally'), []);
  setCastOptions({ overrides: { forms: { dada_jason: 'warlock' } } });
  resetEpisode();
  episode.choice = true;
  chooseAlly('dada_jason');
  assert.equal(episode.ally, 'dada_jason_warlock');
  setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
});

test('choice mode (item 174): a style written for one villain still forces him over her pick (a dev URL)', () => {
  setCastOptions({ fixed: false, rand: seededRand(8), fight: 'smaug_story' });
  resetEpisode();
  episode.choice = true;
  chooseAlly('ellie');
  chooseVillain('tiamat');
  assert.equal(episode.ally, 'ellie');
  assert.equal(episode.villain, 'smaug');
  setCastOptions({ fight: null, fixed: !EPISODE_DEFAULTS.randomCast });
});

test('choice mode (item 174): a chosen villain may play his story fight, as a drawn one does', () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(11) });
  const fights = new Set<string>();
  for (let i = 0; i < 30; i++) {
    resetEpisode();
    episode.choice = true;
    chooseAlly('ellie');
    chooseVillain('smaug');
    fights.add(fightStyle().id);
  }
  assert.ok(fights.has('smaug_story'), [...fights].join(' '));
  assert.ok(fights.size > 1, [...fights].join(' '));
});

test('the cards (item 174): every active character, from the cast list; nobody her own villain', () => {
  const active = { allies: ['ellie', 'elsa', 'julia'], villains: ['elsa', 'smaug'] };
  assert.deepEqual(choiceAllies('julia', active).sort(), ['ellie', 'elsa']);
  assert.deepEqual(choiceVillains('julia', 'elsa', active), ['smaug']);
  assert.ok(choiceAllies('julia').includes('ember_lark'));
  assert.equal(choiceAllies('julia').length, ACTIVE_CAST.allies.length);
  assert.equal(choiceVillains('julia', null).length, ACTIVE_CAST.villains.length);
  assert.ok(choiceVillains('julia', 'dada_matt_lifter').length === ACTIVE_CAST.villains.length);
});

test("Dad's 2 in the bedroom (item 174): the dropped episode's cast and plan go back out of her rotations", () => {
  progress.reset();
  setCastOptions({ fixed: false, rand: seededRand(6) });
  resetEpisode();
  progress.remember('words', 'cat');
  const recent = () => progress.snapshot().recent;
  const before = structuredClone(recent());
  rememberCast();
  housePlan();
  assert.notDeepEqual(recent(), before);
  forgetCast();
  assert.deepEqual(recent(), before);
  // Nothing was remembered: nothing to put back.
  resetEpisode();
  progress.remember('words', 'dog');
  const later = structuredClone(recent());
  forgetCast();
  assert.deepEqual(recent(), later);
  // An erase since (F9, F8 twice, in the bedroom) stays erased.
  rememberCast();
  progress.reset();
  forgetCast();
  assert.deepEqual(recent(), {});
});

test('solo lasts the session (hunt 7, M34): the next episode starts solo, until Dad presses', () => {
  episode.solo = true;
  resetEpisode();
  assert.equal(episode.solo, true, 'the next episode starts solo');
  episode.solo = false;
  resetEpisode();
  assert.equal(episode.solo, false);
});

test('door b (items 126, 137): the Shape-Shifter in about 3 drawn episodes of 7, never two running, else a sentence frame, the word machine or (item 139) the rhyme room', () => {
  const random = Math.random;
  // A seed's luck: 126 drew no word machine in 24 once MOM and DAD left the warm-up's words (hunt 10, M45);
  // over seeds 120 to 135 every other seed draws it 1 to 5 times. 125 drew no rhyme room once the N and A
  // runes' pictures became the bank words NEST and ANT (item 146); 120 to 130 bar it all pass. Item 157's
  // words: 120 draws no rhyme room in 24, 121 to 130 all pass.
  Math.random = seededRand(121);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: {} });
    const doorB: string[] = [];
    for (let e = 0; e < 24; e++) {
      resetEpisode();
      rememberCast();
      const b = housePlan()[1]!;
      doorB.push(b.game);
      progress.episodeDone();
    }
    const shifters = doorB.filter((g) => g === 'shifter').length;
    assert.ok(shifters >= 8 && shifters <= 12, `${shifters} of 24: ${doorB.join(' ')}`);
    doorB.forEach((g, i) => assert.ok(!(g === 'shifter' && doorB[i - 1] === 'shifter'), `twice running at ${i + 1}: ${doorB.join(' ')}`));
    for (const g of doorB) assert.ok(g === 'shifter' || g === 'word_machine' || g === 'rhyme' || g.startsWith('sentence:'), g);
    assert.ok(doorB.some((g) => g.startsWith('sentence:')) && (doorB.includes('word_machine') || doorB.includes('rhyme')), doorB.join(' '));
    // Item 139: drawn episodes put the rhyme room behind door b too.
    assert.ok(doorB.includes('rhyme'), doorB.join(' '));
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});

test('games rotate strictly (item 137): no side room plays a game either side room played last episode (every fetch frame the one sentence game), nor the attic its last frame', () => {
  const random = Math.random;
  Math.random = seededRand(137);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: {} });
    const side = (g: string) => (g.startsWith('sentence:') ? 'sentence' : g);
    let last: string[] | null = null;
    for (let e = 0; e < 40; e++) {
      resetEpisode();
      rememberCast();
      const games = housePlan().map((p) => p.game);
      if (last) {
        for (const g of games.slice(0, 2)) assert.ok(!last.slice(0, 2).map(side).includes(side(g)), `episode ${e + 1}: ${games.join(' ')} after ${last.join(' ')}`);
        assert.notEqual(games[2], last[2], `episode ${e + 1}: the attic's ${games[2]} again`);
      }
      last = games;
      progress.episodeDone();
    }
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});

test('frames (hunt 9, M40 (b), M41 (b)): a drawn frame holds no pad, gift or warm-up word, RUN comes up on a pad, and no fetch frame asks for MOM or DAD', () => {
  const random = Math.random;
  Math.random = seededRand(130);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: {} });
    const pads = new Set<string>();
    for (let e = 0; e < 60; e++) {
      resetEpisode();
      rememberCast();
      const plan = housePlan();
      const said = new Set(withStems([giftWord(), ...[...movePlan().part1, ...movePlan().part2].flatMap((c) => c.words), grabPlan().word]));
      for (const c of [...movePlan().part1, ...movePlan().part2]) pads.add(c.right);
      for (const p of plan) {
        if (p.kind !== 'sentence') continue;
        const own = withStems(wordsOf(FRAME_BY_ID[p.sentence.frame]!.text.replace(/\{\w+\}/g, ' ')));
        assert.deepEqual(own.filter((w) => said.has(w)), [], `episode ${e + 1}: ${p.sentence.frame}`);
        if (p.slot !== 'counter') assert.ok(p.key !== 'mom' && p.key !== 'dad', `episode ${e + 1}: ${p.sentence.frame} ${p.key}`);
      }
      progress.episodeDone();
    }
    assert.ok(pads.has('run'), 'RUN a pad in 60 episodes');
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});

test("pads (hunt 10): no pad is a word of the villain's named counter item (the attic's \"We found the Sunshine Bus!\" said SUN before a SUN pad)", () => {
  const random = Math.random;
  Math.random = seededRand(135);
  try {
    progress.reset();
    setCastOptions({ fixed: false, rand: Math.random, overrides: { villain: 'dada_jason_warlock' } });
    const named = new Set(withStems(['sunshine', 'bus']));
    assert.ok(named.has('sun'));
    for (let e = 0; e < 40; e++) {
      resetEpisode();
      rememberCast();
      const words = [...movePlan().part1, ...movePlan().part2].flatMap((c) => c.words);
      assert.deepEqual(words.filter((w) => named.has(w)), [], `episode ${e + 1}`);
      progress.episodeDone();
    }
  } finally {
    Math.random = random;
    setCastOptions({ overrides: {}, fixed: !EPISODE_DEFAULTS.randomCast });
  }
});

