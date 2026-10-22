/**
 * The golden seeded draws (item 091): `episodePlans` and `drawGames` over
 * fixed seeds, every minigame kind behind each door, alone and in pairs, with
 * and without an ally, on fresh stores and on one store carried through a run
 * of episodes. Each case is its rooms' games and words, and a hash of the
 * plans and the store afterwards as stable JSON. `plansGolden.json` holds what they drew when the pool was refactored
 * by kind; a refactor of the draw must leave every case as it is.
 */

import { createHash } from 'node:crypto';
import { MINIGAMES, MINIGAME_BY_ID, SENTENCE_GAMES, drawGames, type Minigame } from '../../src/rules/minigames';
import { episodePlans, type EpisodeInput, type RoomPlan } from '../../src/rules/sentences';
import { ProgressStore } from '../../src/state/ProgressStore';
import { memory, seeded, spread } from './seeds';

/** JSON with sorted keys, so a plan built in another order reads the same. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

const TIAMAT: EpisodeInput = {
  fill: { villain: 'tiamat', helper: 'ellie', hero: 'julia' },
  ally: 'ellie',
  gift: 'zap',
  rooms: ['kitchen', 'garage'],
  counterRoom: 'attic',
  battle1Moves: ['hug', 'run'],
  moveWords: ['hug', 'run', 'kick', 'jump'],
  saidBefore: ['drum', 'duck'],
};

/** No ally (the dad narrates), another villain, no move words given (every action word kept out). */
const ALONE: EpisodeInput = {
  fill: { villain: 'seraphina', helper: 'dada_matt', hero: 'julia' },
  ally: null,
  gift: 'pop',
  rooms: ['bubble_baths', 'toy_cloud'],
  counterRoom: 'rainbow_room',
};

const game = (id: string): Minigame => MINIGAME_BY_ID[id]!;
const FETCH = game('sentence:we_need_a');
const FETCH2 = game('sentence:go_get_the');
const COUNTER = game('sentence:scared_of_the');
const PHONICS = ['word_machine', 'charge', 'bridge'];

/** Every fixed trio: each phonics kind behind door a and door b, and each pair of them. */
function fixedTrios(): [Minigame, Minigame, Minigame][] {
  const out: [Minigame, Minigame, Minigame][] = [[FETCH, FETCH2, COUNTER]];
  for (const p of PHONICS) out.push([game(p), FETCH, COUNTER], [FETCH2, game(p), COUNTER]);
  for (const p of PHONICS) for (const q of PHONICS) if (p !== q) out.push([game(p), game(q), COUNTER]);
  return out;
}

const fresh = (): ProgressStore => new ProgressStore(memory(), () => 0);

/** Each room's game and words, readable, then a hash of the whole: the plans and the store as stable JSON. */
function digest(plans: RoomPlan[], store: ProgressStore): string {
  const hash = createHash('sha256').update(stable({ plans, store: store.snapshot() })).digest('hex').slice(0, 16);
  return `${plans.map((p) => `${p.slot}:${p.game}:${p.fetches.join(',')}`).join(' ')} #${hash}`;
}

function draw(store: ProgressStore, input: EpisodeInput, seed: number): string {
  return digest(episodePlans(store, input, seeded(seed)), store);
}

export function goldenDraws(): Record<string, string> {
  const out: Record<string, string> = {};
  // The drawn games alone.
  for (let seed = 1; seed <= 20; seed++) {
    const store = fresh();
    out[`drawGames/${seed}`] = drawGames(store, seeded(spread(seed))).map((g) => g.id).join(' ');
    out[`drawGames/sentence/${seed}`] = drawGames(store, seeded(spread(seed)), SENTENCE_GAMES).map((g) => g.id).join(' ');
  }
  // Whole episodes drawn from the pool, the sentence pool, and with a phonics game forced behind door a.
  for (const [name, input] of [['tiamat', TIAMAT], ['alone', ALONE]] as const) {
    for (let seed = 1; seed <= 25; seed++) {
      out[`${name}/pool/${seed}`] = draw(fresh(), input, spread(seed));
      out[`${name}/sentence/${seed}`] = draw(fresh(), { ...input, pool: SENTENCE_GAMES }, spread(seed));
      for (const p of PHONICS) {
        const store = fresh();
        const rest = drawGames(store, seeded(spread(seed) + 7), MINIGAMES.filter((g) => g.id !== p));
        out[`${name}/forced-${p}/${seed}`] = draw(store, { ...input, games: [game(p), rest[1], rest[2]] }, spread(seed));
      }
    }
    // Every fixed trio.
    fixedTrios().forEach((games, i) => {
      for (let seed = 1; seed <= 6; seed++) out[`${name}/fixed${i}:${games.map((g) => g.id).join('+')}/${seed}`] = draw(fresh(), { ...input, games }, spread(seed));
    });
    // One store through a run of episodes: her bag, recent games and records carry over.
    const store = fresh();
    for (let ep = 1; ep <= 15; ep++) {
      const plans = episodePlans(store, input, seeded(spread(ep + 40)));
      out[`${name}/run/${ep}`] = digest(plans, store);
      plans.forEach((p, i) => {
        store.remember('games', p.game, 9);
        for (const w of p.fetches) {
          const right = (ep + i) % 3 !== 0;
          store.record('words', w, right, right ? 0 : 1);
          if (right) store.takeFromBag(w);
        }
        if (p.kind === 'sentence') store.record('frames', p.sentence.frame, ep % 2 === 0, 0);
      });
    }
  }
  return out;
}
