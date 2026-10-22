/**
 * Item 107: story fights. Each script is well formed (speakers, spots, props,
 * splashes drawn), says no bank word (so nothing she reads is heard first),
 * every line is voiced for whoever may say it, and the plan puts a sensible
 * right word on every pad beat, never a second sensible word beside it.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { ART_BY_ID } from '../../content/art/assets';
import { FIGHTS, FIGHT_BY_ID, fightPropArt } from '../../content/battle/fights';
import { CHARACTER_BY_ID, MOVE_WORDS, PERSONS } from '../../content/battle/roster';
import { STORIES, STORY_BY_ID, padBeats, storyLines } from '../../content/battle/stories/index';
import { storySplashArt } from '../../content/battle/stories/types';
import { BANK } from '../../content/phonics/bank';
import { fighterId, group, storyLine } from '../../content/voice/ids';
import { EPISODE_DEFAULTS } from '../../src/config';
import { withStems } from '../../src/rules/bank';
import { ownFight, pickFight } from '../../src/rules/fights';
import type { MoveInput } from '../../src/rules/moves';
import { planStoryMoves } from '../../src/rules/storyFight';
import { ProgressStore } from '../../src/state/ProgressStore';
import { composeLines } from '../../tools/voice/compose';
import { memory, seeded, spread } from './seeds';

const HERO = EPISODE_DEFAULTS.hero;
const ALLY = EPISODE_DEFAULTS.ally ?? 'ellie';
const input = (gift: string): MoveInput => ({ hero: HERO, team: [HERO, ALLY], helper: ALLY, gift });

test('story fights: each story style names a real script and villain, and no villain draws one as his own', () => {
  const styles = FIGHTS.filter((f) => f.kind === 'story');
  assert.ok(styles.length >= 1);
  for (const f of styles) {
    const s = STORY_BY_ID[f.story ?? ''];
    assert.ok(s, `${f.id}: story ${f.story}`);
    assert.equal(f.villain, s.villain, `${f.id}: forces the villain its story is written for`);
    assert.ok(CHARACTER_BY_ID[s.villain], `${f.id}: ${s.villain} is in the roster`);
    assert.notEqual(ownFight(s.villain), f.id, 'reached only by the debug link');
    for (const ally of [null, 'ellie', 'dada_jason']) assert.notEqual(pickFight({ villain: s.villain, ally }, seeded(3)), f.id);
  }
  assert.equal(FIGHT_BY_ID.smaug_story?.story, 'smaug');
});

test('story fights: beats are well formed, spots and splashes drawn, each part ends right', () => {
  for (const s of STORIES) {
    const spots = new Set(s.spots.map((p) => p.id));
    const splashes = new Set(s.splashes.map((p) => p.id));
    const style = FIGHTS.find((f) => f.story === s.id)!;
    for (const p of s.spots) {
      assert.ok(style.props?.some((q) => q.id === p.prop), `${s.id}: spot ${p.id}'s prop ${p.prop} is a prop of ${style.id}`);
      assert.ok(existsSync(`public/art/${fightPropArt(p.prop)}.png`), `${p.prop} is painted`);
    }
    for (const sp of s.splashes) {
      assert.ok(ART_BY_ID[storySplashArt(sp.id)], `${sp.id}: an art asset`);
      assert.ok(existsSync(`public/art/${storySplashArt(sp.id)}.png`), `${sp.id}: painted`);
    }
    const keys = storyLines(s).map((l) => l.key);
    assert.equal(new Set(keys).size, keys.length, `${s.id}: line keys are unique`);
    for (const [part, beats] of [[1, s.part1], [2, s.part2]] as const) {
      assert.equal(new Set(beats.map((b) => b.id)).size, beats.length, `${s.id} part ${part}: beat ids unique`);
      assert.equal(beats.at(-1)!.kind, part === 1 ? 'ultimate' : 'finale', `${s.id} part ${part}: ends in its ultimate`);
      assert.ok(beats.some((b) => b.input?.kind === 'pad' && b.input.answers !== 'gift'), `${s.id} part ${part}: a sensible counter-attack`);
      assert.ok(beats.some((b) => b.input?.kind === 'dodge' || b.input?.kind === 'dodgePads'), `${s.id} part ${part}: a dodge`);
      for (const b of beats) {
        if (b.big) assert.ok(splashes.has(b.big), `${b.id}: splash ${b.big}`);
        const i = b.input;
        if (i && (i.kind === 'dodge' || i.kind === 'grab')) assert.ok(spots.has(i.spot), `${b.id}: spot ${i.spot}`);
        if (i && (i.kind === 'pad' || i.kind === 'dodgePads') && i.answers !== 'gift') {
          assert.ok(i.answers.length >= 2, `${b.id}: a small set of sensible answers`);
          for (const w of i.answers) assert.ok(MOVE_WORDS.includes(w), `${b.id}: ${w} is a move word`);
        }
        if (b.kind === 'counter') assert.equal(i?.kind, 'pad', `${b.id}: a counter waits on pads`);
        if (b.kind === 'attack') assert.ok(i?.kind === 'dodge' || i?.kind === 'dodgePads', `${b.id}: an attack waits on a dodge`);
        if (b.kind === 'support') assert.equal(i?.kind, 'grab', `${b.id}: the support move waits on her grab`);
      }
    }
    assert.ok(s.part1.some((b) => b.kind === 'support'), `${s.id}: a Dad + Julia support move`);
    assert.ok(s.part1.some((b) => b.kind === 'fetched' && b.all), `${s.id}: the fetched things get a beat`);
    const first = padBeats(s, 1)[0]?.input;
    assert.ok(first?.kind === 'pad' && first.answers === 'gift', `${s.id}: the gift word is part 1's first pick`);
  }
});

test('story fights: no line says a bank word, stems included', () => {
  for (const s of STORIES) {
    for (const l of storyLines(s)) {
      for (const t of [l.text, l.say ?? '']) {
        const words = t.toLowerCase().split(/[^a-z]+/).filter(Boolean);
        const said = new Set(withStems(words));
        for (const w of BANK) assert.ok(!said.has(w.word), `${s.id}.${l.key}: "${t}" says ${w.word.toUpperCase()}`);
      }
    }
  }
});

test('story fights: every line is voiced: the villain\'s in his voice, Dad\'s and the ally\'s for every person', () => {
  const lines = new Map(composeLines().map((l) => [l.id, l]));
  for (const s of STORIES) {
    for (const l of storyLines(s)) {
      if (l.who === 'villain') {
        assert.equal(lines.get(storyLine(s.id, l.key))?.speaker, fighterId(s.villain, true), `${s.id}.${l.key}`);
        assert.equal(lines.get(storyLine(s.id, l.key))?.group, group.story(s.id));
      } else {
        for (const p of PERSONS) {
          assert.equal(lines.get(storyLine(s.id, l.key, p.id))?.speaker, p.id, `${s.id}.${l.key} for ${p.id}`);
          assert.equal(lines.get(storyLine(s.id, l.key, p.id))?.group, group.story(s.id, p.id), 'loaded only for the people in the fight');
        }
      }
    }
  }
});

test('story fights: the plan has a pad choice per pad beat, the right word sensible and the only sensible one', () => {
  for (const s of STORIES) {
    for (let seed = 0; seed < 12; seed++) {
      const gift = MOVE_WORDS[seed % MOVE_WORDS.length]!;
      const plan = planStoryMoves(new ProgressStore(memory()), s, input(gift), seeded(spread(seed)));
      for (const part of [1, 2] as const) {
        const beats = padBeats(s, part);
        const choices = part === 1 ? plan.part1 : plan.part2;
        assert.equal(choices.length, beats.length, `${s.id} part ${part}: one choice per pad beat`);
        choices.forEach((c, i) => {
          const inp = beats[i]!.input!;
          const answers = inp.kind === 'pad' || inp.kind === 'dodgePads' ? inp.answers : [];
          assert.ok(c.words.includes(c.right) && c.words.length >= 2 && c.words.length <= 3);
          assert.equal(new Set(c.words).size, c.words.length);
          if (answers === 'gift') assert.equal(c.right, gift, 'the gift word opens part 1');
          else {
            assert.ok(answers.includes(c.right), `${beats[i]!.id}: ${c.right} answers what he did`);
            for (const w of c.words) if (w !== c.right) assert.ok(!answers.includes(w), `${beats[i]!.id}: ${w} beside ${c.right} would make sense too`);
          }
        });
      }
      const rights = [...plan.part1, ...plan.part2].map((c) => c.right);
      assert.equal(new Set(rights).size, rights.length, `seed ${seed}: no right word twice (${rights.join(' ')})`);
    }
  }
});

test('story fights: the plan keeps clear of words said before the battle', () => {
  const s = STORIES[0]!;
  const plan = planStoryMoves(new ProgressStore(memory()), s, { ...input('zap'), avoid: ['wet', 'drip', 'hop'] }, seeded(5));
  for (const c of [...plan.part1, ...plan.part2]) for (const w of c.words) assert.ok(!['wet', 'drip', 'hop'].includes(w), `${w} was said before the battle`);
});
