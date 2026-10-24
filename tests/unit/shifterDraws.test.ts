/**
 * The Shape-Shifter's 200 seeded draws (hunt 6), from tests/unit/shifter.test.ts: about 3 s,
 * the unit run's longest test, so its own file runs beside the rest (item 105).
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NO_ARTICLE, NUMBER_WORDS, lookalikesOf } from '../../content/phonics/sentences';
import { SHIFTER } from '../../src/config';
import { CHAINS_KEPT, chainKey, planShifter, shifterWords } from '../../src/rules/shifter';
import { LAST_READ } from '../../src/rules/recent';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seeded, spread } from './seeds';

test('planShifter (hunt 6): no link joins two look-alikes, no read-it picture is a look-alike of the word read, and it never starts as a number', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = planShifter(new ProgressStore(memory()), { avoid: [], taken: [] }, seeded(spread(seed)))!;
    for (const l of p.links) {
      assert.ok(!lookalikesOf(l.from).includes(l.to), `seed ${seed}: ${l.from} to ${l.to}`);
      if (l.beat === 'read') for (const o of l.options) assert.ok(!lookalikesOf(l.to).includes(o), `seed ${seed}: ${o} beside ${l.to}`);
    }
    // "It starts as a...": never a number (M23) or a word that takes no A.
    assert.ok(!NUMBER_WORDS.has(p.start) && !NO_ARTICLE.has(p.start), `seed ${seed}: starts as a ${p.start}`);
  }
});

test('planShifter (hunt 7, fix 125): her recent reads spread the chains across episodes, at full length', () => {
  // Six episodes back to back, each chain's words read right first time: a later chain holds at
  // most one word read lately where four links allow it (45 of 100 shared a word with the
  // episode before, MAT MAN PAN three in four; 25 since).
  let shared = 0;
  let pairs = 0;
  let links = 0;
  for (let run = 1; run <= 10; run++) {
    const store = new ProgressStore(memory());
    const rand = seeded(spread(run));
    let before: string[] = [];
    for (let e = 0; e < 6; e++) {
      const p = planShifter(store, { avoid: [], taken: [] }, rand)!;
      const words = shifterWords(p);
      links += words.length;
      if (e > 0) {
        pairs++;
        if (words.some((w) => before.includes(w))) shared++;
      }
      for (const w of words) store.record('words', w, true, 0);
      before = words;
    }
  }
  // Item 127 stored ten of its words (49 to 38; Matt's default (a)): at most 35% before, 19 of 50 since.
  // Hunt 9, M39: four links where the pool allows (rotation no longer drops a visit to two links), so
  // more chains share a word: 25 of 50. `npm run variety` over drawn episodes reads 101 distinct chains.
  assert.ok(shared / pairs <= 0.54, `${shared} of ${pairs} episodes shared a chain word with the one before`);
  assert.equal(links, 10 * 6 * 4, 'every chain four links');
});

test('planShifter (hunt 7, M36): a drawn run of ten episodes repeats no chain, and the last six share no link', () => {
  // As rememberPlan does: each chain remembered (`chains`), its words read right first time.
  const linksOf = (c: string[]) => c.slice(1).map((w, i) => [c[i]!, w].sort().join('-'));
  let sharedLinks = 0;
  for (let run = 1; run <= 5; run++) {
    const store = new ProgressStore(memory());
    const rand = seeded(spread(run));
    const seen: string[][] = [];
    for (let e = 0; e < 10; e++) {
      const p = planShifter(store, { avoid: [], taken: [] }, rand)!;
      const chain = chainKey(p);
      assert.ok(!seen.some((c) => c.join(' ') === chain), `run ${run}, episode ${e + 1}: ${chain} again`);
      if (seen.slice(-SHIFTER.recentChains).some((c) => linksOf(c).some((l) => linksOf(chain.split(' ')).includes(l)))) sharedLinks++;
      seen.push(chain.split(' '));
      store.remember('chains', chain, CHAINS_KEPT);
      for (const w of shifterWords(p)) store.record('words', w, true, 0);
    }
  }
  // Never, until item 127 stored ten of its words (49 to 38; Matt's default (a)): then rarely, 5 of 50,
  // which it met by dropping to two-link chains. Hunt 9, M39: the length ranks above a fresh link, as M36
  // set out, so the run's chains stay at four links and 19 of 50 share one (none is the same chain).
  assert.ok(sharedLinks <= 22, `${sharedLinks} of 50 chains shared a link with one of the six before`);
});

test('planShifter (hunt 8, M37 (a); item 126, pick 2b): seldom a word the episode before had her read, or one of the last two chains', () => {
  // As rememberPlan does: the episode's read words (LAST_READ) and its chain, each episode.
  let reused = 0;
  let fromChains = 0;
  for (let run = 1; run <= 5; run++) {
    const store = new ProgressStore(memory());
    const rand = seeded(spread(run));
    const chains: string[][] = [];
    for (let e = 0; e < 8; e++) {
      // The episode before read MAN and BUG in another room, and its pads (MAN since item 127 stored MAT).
      if (e > 0) store.remember(LAST_READ, ['man', 'bug', ...chains.at(-1)!.slice(1)].join(' '), 1);
      const p = planShifter(store, { avoid: [], taken: [] }, rand)!;
      const chain = chainKey(p).split(' ');
      if (e > 0 && chain.some((w) => ['man', 'bug'].includes(w))) reused++;
      if (chains.slice(-SHIFTER.wordChains).some((c) => c.some((w) => chain.includes(w)))) fromChains++;
      chains.push(chain);
      store.remember('chains', chain.join(' '), CHAINS_KEPT);
      for (const w of shifterWords(p)) store.record('words', w, true, 0);
    }
  }
  // M36's no shared link ranks above it, so where only chains through MAT or BUG share no link one comes (19 of 35 without M37).
  assert.ok(reused <= 10, `${reused} of 35 chains held MAT or BUG, read the episode before`);
  // 25 of 40 before pick 2b; the few three-places chains share their words, so some still do.
  // Item 127 stored ten of its words (49 to 38; Matt's default (a)): 22 of 40 since. Hunt 9, M39: four
  // links where the pool allows, through the one component of linked words (CAN MAN PAN MAP...): 34 of 40.
  assert.ok(fromChains <= 36, `${fromChains} of 40 chains held a word of the last two`);
});
