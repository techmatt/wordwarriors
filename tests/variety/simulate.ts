/**
 * The variety simulator (item 121): plays a few hundred drawn episodes in a
 * row on one progress store, as she would (every rotation's memory carried
 * across them), through the episode's own draws (src/episode/draws.ts,
 * plans.ts), and answers for her as the scenes would record it: each word
 * read right first time with `--right` odds (0.85), the move pads, the
 * warm-up's grab, the frames, families, runes and the victory scene.
 *
 * For each dimension of what she learns or sees it prints, worst first: the
 * pool, how many distinct items came up, how soon one comes back (the gap in
 * episodes, and the share of returns within 2), the most drawn item against
 * the mean, and what is in the pool but never came up.
 *
 *   npm run variety -- [--episodes=300] [--seed=1] [--right=0.85] [--json=<file>] [--only=<dim,…>]
 *
 * Pure node: Math.random is replaced by a seeded generator, so a seed replays.
 */

import { writeFileSync } from 'node:fs';

import { formsOf, personOf, ROSTER } from '../../content/battle/roster';
import { FIGHTS } from '../../content/battle/fights';
import { ENDINGS } from '../../content/house/endings';
import { FETCH_ROOMS, PLACES, HOME } from '../../content/house/house';
import { QUESTS } from '../../content/house/quests';
import { scenesFor } from '../../content/house/scenes';
import { ACTIONS, BANK_BY_WORD, LIVE, STORED_WHY, THINGS, VOWEL_LIST } from '../../content/phonics/bank';
import { FAMILIES } from '../../content/phonics/families';
import { FRAMES } from '../../content/phonics/sentences';
import { RUNES } from '../../content/phonics/runes';
import { ACTIVE_CAST, SHIFTER } from '../../src/config';
import { helper, waker } from '../../src/episode/cast';
import { rememberCast, resetEpisode, setCastOptions } from '../../src/episode/draws';
import * as plans from '../../src/episode/plans';
import { episode } from '../../src/episode/state';
import { favourWords, NEW_WORDS } from '../../src/rules/bank';
import { MINIGAMES } from '../../src/rules/minigames';
import { SHIFT_WORDS, chainKey } from '../../src/rules/shifter';
import { RHYME_FAMILIES, RHYME_WORDS, rhymeWords } from '../../src/rules/rhyme';
import { variantKeys } from '../../src/rules/story';
import { progress } from '../../src/state/progress';

const arg = (name: string, fallback: string): string => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const EPISODES = Number(arg('episodes', '300'));
const SEED = Number(arg('seed', '1'));
const RIGHT = Number(arg('right', '0.85'));
const JSON_OUT = arg('json', '');
const ONLY = arg('only', '');
// `--words=new` as the game's `?words=new` (item 121): how soon the newest words come into play.
const WORDS = arg('words', '');
if (WORDS) favourWords(WORDS === 'new' ? NEW_WORDS : WORDS.split(','));

// Every draw replays from the seed: the cast's (passed below), the house's (unseeded
// `planRand` calls Math.random) and the simulated answers. Not `seedRands`: one stream
// here keeps each seed's past reports, and the answers would need a seed of their own.
let s = (SEED * 104729) % 2147483647 || 1;
Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

type Dim = { name: string; group: string; pool: string[] | null; eps: string[][] };
const dims = new Map<string, Dim>();
function dim(group: string, name: string, pool: readonly string[] | null = null): Dim {
  let d = dims.get(name);
  if (!d) dims.set(name, (d = { name, group, pool: pool ? [...new Set(pool)] : null, eps: [] }));
  return d;
}
/** Episode `e` showed `items` in dimension `name`. */
function saw(e: number, group: string, name: string, items: (string | null | undefined)[], pool: readonly string[] | null = null): void {
  const d = dim(group, name, pool);
  const got = items.filter((x): x is string => Boolean(x));
  (d.eps[e] ??= []).push(...got);
  if (WORDISH.includes(group)) for (const w of got) if (STORED_WHY[w]) storedDrawn.push(`${w} (${name}, episode ${e + 1})`);
}
/** Item 127: every stored word that came up anywhere she reads or is shown a word or picture. Must stay empty. */
const WORDISH = ['words', 'pictures', 'items'];
const storedDrawn: string[] = [];
/** Item 137 (amendment 4095): an action word (DRIP, BLAST) is never a picture she picks from, nor what a picture choice asks for. Must stay empty. */
const actionPictures: string[] = [];
function pictureChoice(e: number, where: string, words: readonly string[]): void {
  for (const w of words) if (bank(w)?.role === 'action') actionPictures.push(`${w} (${where}, episode ${e + 1})`);
}
/** Hunt 9, M39: the Shape-Shifter's visits by chain length (links); under SHIFTER.links is a short visit. */
const shifterLinks = new Map<number, number>();
/** Item 139: the rhyme room's visits by rounds (under RHYME.rounds is a short visit). */
const rhymeVisits = new Map<number, number>();
/** And those changing all three places, the vowel too (hunt 6, M29). */
let shifterVowel = 0;
/** Item 137: episodes whose door a, door b or attic game came straight back (doors: any side room's last game, by kind). Must stay 0. */
const gameRepeats = [0, 0, 0];
let lastGames: string[] | null = null;

const bank = (w: string) => BANK_BY_WORD[w];
const villains = ACTIVE_CAST.villains;
const allies = ACTIVE_CAST.allies;
// Who can be the helper: the active allies and every form of a dad (he wakes her when there is no ally).
const helpers = ROSTER.map((c) => c.id).filter((id) => allies.includes(personOf(id)) || ['dada_matt', 'dada_jason'].includes(personOf(id)));
const questPool = helpers.flatMap((id) => (QUESTS[id]?.lines ?? []).map((_, i) => `${id}#${i + 1}`));
const scenePool = helpers.flatMap((id) => scenesFor(id).map((_, i) => `${id}#${i + 1}`));
const right = () => Math.random() < RIGHT;

progress.reset();
setCastOptions({ fixed: false, rand: Math.random, overrides: {} });

for (let e = 0; e < EPISODES; e++) {
  resetEpisode();
  rememberCast();
  const grab = plans.grabPlan();
  const house = plans.housePlan();
  const moves = plans.movePlan();
  const fight = plans.fightStyle();
  const gift = plans.giftWord();

  // Cast, places, story.
  saw(e, 'cast', 'villain', [personOf(episode.villain)], villains);
  saw(e, 'cast', 'ally', [episode.ally ? personOf(episode.ally) : 'none'], [...allies, 'none']);
  saw(e, 'cast', 'waker', [personOf(waker())], ['dada_matt', 'dada_jason']);
  for (const dad of ['dada_matt', 'dada_jason']) {
    const form = [episode.primary, episode.secondary, episode.ally, episode.villain].find((id) => id && personOf(id) === dad);
    saw(e, 'cast', `form: ${dad}`, [form], formsOf(dad).map((f) => f.id));
  }
  saw(e, 'places', 'quest place', [episode.place], [HOME, ...PLACES.map((p) => p.id)]);
  saw(e, 'places', 'side rooms', house.slice(0, 2).map((p) => p.room));
  if (episode.place === HOME) saw(e, 'places', 'house side rooms (home episodes)', house.slice(0, 2).map((p) => p.room), FETCH_ROOMS);
  saw(e, 'games', 'games (doors a, b)', house.slice(0, 2).map((p) => p.game), MINIGAMES.filter((g) => g.slots.includes('fetch')).map((g) => g.id));
  saw(e, 'games', 'counter game (attic)', [house[2]!.game], MINIGAMES.filter((g) => g.slots.includes('counter')).map((g) => g.id));
  saw(e, 'games', 'fight style', [fight.id], FIGHTS.map((f) => f.id));
  // Item 137: a door's game, or any side room's, back from the episode before (a side room's by kind: every fetch frame is the one sentence game).
  const games = [house[0]!.kind, house[1]!.kind, house[2]!.game];
  if (lastGames) games.forEach((g, i) => i < 2 ? lastGames!.slice(0, 2).includes(g) && gameRepeats[i]++ : g === lastGames![2] && gameRepeats[2]++);
  lastGames = games;
  const k = variantKeys(helper(), episode.villain);
  saw(e, 'voice', 'quest line', [`${helper()}#${episode.story.quest}`], questPool);
  saw(e, 'voice', 'hub scene', [`${helper()}#${episode.story.scene}`], scenePool);
  for (const key of ['up', 'good', 'door', 'taunt', 'sorry', 'ending'] as const) saw(e, 'voice', `line variant: ${key}`, [`${k[key]}#${episode.lines[key]}`]);

  // Words, by where she reads or sees them.
  saw(e, 'words', 'gift word', [gift], ACTIONS.map((w) => w.word));
  saw(e, 'words', 'warm-up word', [grab.word]);
  saw(e, 'pictures', 'warm-up hall pictures', grab.objects.filter((w) => w !== grab.word));
  pictureChoice(e, 'warm-up', grab.objects);
  const choices = [...moves.part1, ...moves.part2];
  saw(e, 'words', 'move pads (right)', choices.map((c) => c.right), ACTIONS.map((w) => w.word));
  saw(e, 'words', 'move pads (wrong)', choices.flatMap((c) => c.words.filter((w) => w !== c.right)), ACTIONS.map((w) => w.word));
  saw(e, 'words', 'counter word', [house[2]!.key], THINGS.map((w) => w.word));
  const named = plans.namedCounter();
  saw(e, 'items', 'named counter item', [named ? named.id : null], ROSTER.filter((c) => villains.includes(c.id)).map((c) => c.counter.id));
  saw(e, 'items', 'fetched items', house.slice(0, 2).flatMap((p) => p.fetches), THINGS.map((w) => w.word));
  const read: string[] = [gift, ...choices.map((c) => c.right)];
  for (const p of house) {
    read.push(...p.fetches);
    saw(e, 'words', `words read: ${p.kind}`, p.fetches);
    if (p.kind === 'sentence') {
      saw(e, 'sentences', `frames (${p.slot === 'counter' ? 'counter' : 'fetch'})`, [p.sentence.frame], FRAMES.filter((f) => f.use === (p.slot === 'counter' ? 'counter' : 'fetch')).map((f) => f.id));
      saw(e, 'pictures', 'sentence room pictures (not the key)', p.objects.filter((w) => w !== p.key));
      pictureChoice(e, `sentence ${p.slot}`, p.objects);
      progress.record('frames', p.sentence.frame, right(), 0);
    }
    if (p.kind === 'machine') {
      saw(e, 'pictures', 'machine pictures', p.machine.rounds.map((r) => r.word));
      saw(e, 'phonics', 'machine families', p.machine.rounds.map((r) => r.rime), FAMILIES.map((f) => f.rime));
      for (const r of p.machine.rounds) {
        const ok = right();
        progress.record('rimes', r.rime, ok, ok ? 0 : 1);
        progress.record('onsets', r.onset, ok, ok ? 0 : 1);
      }
    }
    if (p.kind === 'charge') {
      saw(e, 'phonics', 'charge runes', p.charge.runes, RUNES.map((r) => r.sound));
      for (const r of new Set(p.charge.runes)) progress.record('sounds', r, true, 0);
    }
    if (p.kind === 'bridge') saw(e, 'pictures', 'bridge far-bank pictures (not the word)', p.bridge.rounds.flatMap((r) => r.pictures.filter((w) => w !== r.word)));
    if (p.kind === 'bridge') pictureChoice(e, 'bridge', p.bridge.rounds.flatMap((r) => r.pictures));
    if (p.kind === 'machine') pictureChoice(e, 'machine', p.machine.rounds.map((r) => r.word));
    if (p.kind === 'shifter') {
      saw(e, 'phonics', 'shifter chains', [chainKey(p.shifter)]);
      shifterLinks.set(p.shifter.links.length, (shifterLinks.get(p.shifter.links.length) ?? 0) + 1);
      if (new Set(p.shifter.links.map((l) => l.pos)).size === 3) shifterVowel++;
      saw(e, 'words', 'shifter words (start and links)', [p.shifter.start, ...p.shifter.links.map((l) => l.to)], SHIFT_WORDS);
      saw(e, 'pictures', 'shifter wrong pictures', p.shifter.links.filter((l) => l.beat === 'read').flatMap((l) => l.options.filter((o) => o !== l.to)));
      pictureChoice(e, 'shifter', [p.shifter.start, ...p.shifter.links.flatMap((l) => [l.to, ...(l.beat === 'read' ? l.options : [])])]);
      for (const l of p.shifter.links) if (l.beat === 'fix') progress.record('spelling', l.to, true, 0);
    }
    if (p.kind === 'rhyme') {
      rhymeVisits.set(p.rhyme.rounds.length, (rhymeVisits.get(p.rhyme.rounds.length) ?? 0) + 1);
      saw(e, 'phonics', 'rhyme families', p.rhyme.rounds.map((r) => r.rime), RHYME_FAMILIES.map((f) => f.rime));
      saw(e, 'words', 'rhyme printed words', rhymeWords(p.rhyme), RHYME_WORDS);
      saw(e, 'pictures', 'rhyme wrong pictures', p.rhyme.rounds.flatMap((r) => r.options.filter((o) => o !== r.word)));
      pictureChoice(e, 'rhyme', p.rhyme.rounds.flatMap((r) => r.options));
      for (const r of p.rhyme.rounds) progress.record('rimes', r.rime, true, 0);
    }
    // Every word read in a room: as SideRoom's recordRead (the Shape-Shifter's read beats only).
    const reads = p.kind === 'shifter' ? p.shifter.links.filter((l) => l.beat === 'read').map((l) => l.to) : p.fetches;
    for (const w of reads) {
      const ok = right();
      progress.record('words', w, ok, ok ? 0 : 1);
      if (ok) progress.takeFromBag(w);
      else progress.returnToBag(w);
    }
  }
  saw(e, 'words', 'every word read (rooms, counter, pads, gift)', read, LIVE.map((w) => w.word));
  saw(e, 'words', 'every word read or shown (+ warm-up, pictures)', [...read, grab.word, ...grab.objects], LIVE.map((w) => w.word));
  if (NEW_WORDS.length) saw(e, 'words', 'new words (items 121, 126), read', read.filter((w) => NEW_WORDS.includes(w)), NEW_WORDS);
  saw(e, 'phonics', 'first sounds read', read.map((w) => bank(w)?.onset || '(vowel)'), [...new Set(LIVE.map((w) => w.onset || '(vowel)'))]);
  saw(e, 'phonics', 'short vowels read', read.map((w) => bank(w)?.vowel ?? 'long'), [...VOWEL_LIST, 'long']);
  saw(e, 'phonics', 'levels read', read.map((w) => String(bank(w)?.level ?? '?')), ['1', '2', '3']);
  saw(e, 'phonics', 'rimes read', read.map((w) => bank(w)?.rime));
  // The battle's pads, as BattleScene records them.
  for (const c of choices) {
    const ok = right();
    progress.record('words', c.right, ok, ok ? 0 : 1);
    if (ok) progress.takeFromBag(c.right, 'moves');
    else progress.returnToBag(c.right, 'moves');
    for (const w of c.words) if (w !== c.right) progress.takeFromBag(w, 'pads');
  }
  progress.record('grabs', grab.word, right(), 0);
  const ending = plans.drawEnding();
  saw(e, 'places', 'victory scene', [ending], ENDINGS.map((x) => x.id));
  progress.remember('ending', ending);
  progress.episodeDone();
}

// ---- The numbers ---------------------------------------------------------------

interface Row {
  group: string;
  name: string;
  pool: number | null;
  distinct: number;
  uses: number;
  /** Distinct / pool. */
  reach: number | null;
  medianGap: number | null;
  /** Share of returns within 2 episodes. */
  soon: number;
  top: string;
  /** Each item's count (the JSON's, for comparing one item across runs: item 126). */
  counts: Record<string, number>;
  /** The most drawn item's count over the mean count of drawn items. */
  topRatio: number;
  never: string[];
}

function rowOf(d: Dim): Row {
  const counts = new Map<string, number>();
  const last = new Map<string, number>();
  const gaps: number[] = [];
  for (let e = 0; e < EPISODES; e++) {
    const items = d.eps[e] ?? [];
    for (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1);
    for (const x of new Set(items)) {
      const at = last.get(x);
      if (at !== undefined) gaps.push(e - at);
      last.set(x, e);
    }
  }
  const uses = [...counts.values()].reduce((a, b) => a + b, 0);
  const mean = uses / Math.max(1, counts.size);
  const [topItem, topN] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['-', 0];
  gaps.sort((a, b) => a - b);
  const pool = d.pool;
  return {
    group: d.group,
    name: d.name,
    pool: pool ? pool.length : null,
    distinct: counts.size,
    uses,
    reach: pool ? counts.size / pool.length : null,
    medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)]! : null,
    soon: gaps.length ? gaps.filter((g) => g <= 2).length / gaps.length : 0,
    top: `${topItem} ×${topN}`,
    counts: Object.fromEntries(counts),
    topRatio: mean ? topN / mean : 0,
    never: pool ? pool.filter((p) => !counts.has(p)) : [],
  };
}

const rows = [...dims.values()].filter((d) => !ONLY || ONLY.split(',').includes(d.name)).map(rowOf);
// Worst first: least of the pool reached, then the most returns within 2 episodes.
const badness = (r: Row) => (r.reach === null ? 0.5 : 1 - r.reach) + r.soon * 0.5 + Math.min(1, (r.topRatio - 1) / 10) * 0.3;
rows.sort((a, b) => badness(b) - badness(a));

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
console.log(`Variety: ${EPISODES} episodes, seed ${SEED}, right first time ${RIGHT}\n`);
console.log('| Dimension | Pool | Distinct | Reach | Median gap | Back within 2 | Most drawn (×mean) | Never drawn |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  const never = r.never.length ? `${r.never.length}: ${r.never.slice(0, 8).join(' ')}${r.never.length > 8 ? ' …' : ''}` : '';
  console.log(`| ${r.group}: ${r.name} | ${r.pool ?? '—'} | ${r.distinct} | ${pct(r.reach)} | ${r.medianGap ?? '—'} | ${pct(r.soon)} | ${r.top} (${r.topRatio.toFixed(1)}) | ${never} |`);
}
const visits = [...shifterLinks.values()].reduce((a, b) => a + b, 0);
const short = [...shifterLinks].filter(([n]) => n < SHIFTER.links).reduce((a, [, k]) => a + k, 0);
const lengths = [...shifterLinks].sort((a, b) => b[0] - a[0]).map(([n, k]) => `${n} links ${k}`).join(', ');
console.log(`\nShape-Shifter visits: ${visits}; short (under ${SHIFTER.links} links): ${short} (${lengths || 'none'}); changing all three places: ${shifterVowel}.`);
const rhymeN = [...rhymeVisits.values()].reduce((a, b) => a + b, 0);
console.log(`Rhyme room visits (item 139): ${rhymeN} in ${EPISODES} episodes (${[...rhymeVisits].sort((a, b) => b[0] - a[0]).map(([n, k]) => `${n} rounds ${k}`).join(', ') || 'none'}).`);
console.log(`Games back from the episode before (item 137): door a ${gameRepeats[0]}, door b ${gameRepeats[1]}, attic ${gameRepeats[2]}.`);
if (gameRepeats.some((n) => n > 0)) process.exitCode = 1;
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ episodes: EPISODES, seed: SEED, right: RIGHT, rows, shifterLinks: Object.fromEntries(shifterLinks) }, null, 1) + '\n');
if (actionPictures.length) {
  console.log(`
ACTION WORDS AS PICTURES TO PICK: ${actionPictures.length}: ${actionPictures.slice(0, 20).join(', ')}`);
  process.exitCode = 1;
} else console.log(`
Action words as pictures to pick: none.`);
// Item 127: a stored word is never drawn. Fails the run (exit 1) if one was.
const storedCount = Object.keys(STORED_WHY).length;
if (storedDrawn.length) {
  console.log(`
STORED WORDS DRAWN: ${storedDrawn.length}: ${storedDrawn.slice(0, 20).join(', ')}`);
  process.exitCode = 1;
} else console.log(`
Stored words drawn: none of the ${storedCount}.`);
