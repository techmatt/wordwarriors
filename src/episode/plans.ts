/**
 * The episode's draws (split from Episode.ts, which re-exports them): the
 * house plan, the warm-up, the gift word, the move plan, the counter, the
 * fight style and the victory scene, each made once per episode on first
 * need, and the words said before each that it keeps clear of; and the
 * journey map's stops. No Phaser and no import of Episode.ts (item 076).
 */

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import type { CounterItem } from '../../content/battle/types';
import { BEDROOMS, COUNTER_ROOM, FETCH_ROOMS, PLACE_BY_ID, SIDE_ROOM_BY_ID } from '../../content/house/house';
import { BANK } from '../../content/phonics/bank';
import { FRAMES } from '../../content/phonics/sentences';
import { NARRATOR_LINES, wakeTemplate, wakeVariant } from '../../content/voice/script';
import { FORCE_PHONICS_ROOM, FORCE_SHIFTER_ROOM, VARIETY } from '../config';
import { leastRecent } from '../rules/recent';
import { fightSpec, pickFight } from '../rules/fights';
import { FIGHT_BY_ID, type FightSpec } from '../../content/battle/fights';
import { pickEnding } from '../rules/endings';
import { ENDING_BY_ID } from '../../content/house/endings';
import { withStems } from '../rules/bank';
import { episodePlans, wordsOf, type EpisodeInput, type RoomPlan } from '../rules/sentences';
import { BRIDGE_GAME, CHARGE_GAME, MINIGAMES, MINIGAME_BY_ID, PHONICS_GAMES, SENTENCE_GAMES, SHIFTER_GAME, drawGames, type Minigame } from '../rules/minigames';
import { battle1Words, drawGift, planMoves, type MovePlan } from '../rules/moves';
import { GRAB_WORDS, hallObjects, pickGrab } from '../rules/grab';
import { progress } from '../state/progress';
import { pickWeighted } from '../rules/random';
import { away, bedroomTaunt, helper, hubScene, storyWords, villainSpec } from './cast';
import { castRand, fightOverride, remembered } from './draws';
import { episode, steps, type Slot, type Step } from './state';

/**
 * Remember the house plan's side rooms and games (item 067), once per
 * episode, and only in an episode she entered from the title (`rememberCast`
 * has run: a dev `?scene=` jump is not her rotation): as she walks into the
 * bedroom, or when the plan is made after that (the title may draw it early,
 * to prefetch the bedroom's art). A game the URL forced (`?room=`, `?game=`,
 * `?games=`) is not remembered either.
 */
export function rememberPlan(): void {
  const plan = episode.house.plan;
  if (remembered.plan || !plan || !remembered.cast) return;
  remembered.plan = true;
  if (!away()) for (const p of plan.slice(0, 2)) progress.remember('rooms', p.room, FETCH_ROOMS.length + 1);
  if (urlGames) return;
  for (const p of plan) progress.remember('games', p.game, 3 * VARIETY.rotations);
  const phonics = plan.find((p) => PHONICS_GAMES.some((g) => g.id === p.game));
  if (phonics) progress.remember('phonics', phonics.game, 1);
}

/** Whether the URL picks the rooms' games (`?room=`, `?game=`, `?games=`; `roomGames`): then they are not her rotation. */
let urlGames = false;

/**
 * The showdown's fight style (item 031, src/rules/fights.ts): drawn on first
 * need, so both battles are the same contest; `?fight=<id>` fixes it.
 */
export function fightStyle(): FightSpec {
  if (!episode.fight) episode.fight = fightOverride && FIGHT_BY_ID[fightOverride] ? fightOverride : pickFight(episode, castRand);
  return fightSpec(episode.fight);
}

/**
 * The house plan: two fetch rooms with a sentence each, and the attic with
 * the villain's counter sentence. Made once per episode, on first need.
 */
export function housePlan(): RoomPlan[] {
  if (!episode.house.plan) {
    // The gift word first: the hub says and shows it before the side rooms,
    // so no room may make it a key word; nor the attic's counter word.
    const gift = giftWord();
    // The rooms: the quest place's own, or two of the house's.
    const place = away() ? PLACE_BY_ID[episode.place]! : null;
    const rooms = place
      ? ([place.rooms[0]!.id, place.rooms[1]!.id] as [string, string])
      : // The rooms she has gone longest without (item 067: the one left out last episode comes back).
        (leastRecent(FETCH_ROOMS, progress.recentOf('rooms'), 2, Math.random) as [string, string]);
    const counterRoom = place ? place.secret.id : COUNTER_ROOM;
    const input = planInput(gift, rooms, counterRoom);
    const games = roomGames();
    episode.house.plan = episodePlans(progress, { ...input, ...games });
    rememberPlan();
  }
  return episode.house.plan;
}

/**
 * The house plan's input, the rooms' games aside: `housePlan`'s and
 * `debugPlan`'s (item 088: a debug run keeps clear of the same words). Draws
 * the move plan and the warm-up's word if they are not drawn yet, in that order.
 */
function planInput(gift: string, rooms: [string, string], counterRoom: string): Omit<EpisodeInput, 'games' | 'pool'> {
  const fill = { villain: episode.villain, helper: helper(), hero: episode.hero };
  // The three key words come out of her word bag here; the counter keeps
  // clear of battle 1's move pads, and none is a word of the helper's quest
  // line or hub scene (item 037), both said before any room.
  const battle1Moves = battle1Words(movePlan());
  // The warm-up's word is said in the entry hall (item 033): drawn first, kept out too.
  // The doors' signs show their rooms' glyphs: a bank word drawn the same way is
  // shown before she reads it (item 039: the 🛁 door led to GO GET THE TUB).
  // The journey map's stops too (🛏️ 🏠, the place's glyph): it shows before the attic.
  const signs = new Set([...rooms, counterRoom].map((r) => SIDE_ROOM_BY_ID[r]?.glyph).filter(Boolean));
  for (const s of journeyStops()) signs.add(s.icon);
  // The bedroom's toys (a drum, a duck, a night-light: DRUM, DUCK, LAMP) and the hub story's
  // prop drawn as an emoji (Chef Jason's 🍲, LID's picture) show before any room too (item 069).
  for (const b of BEDROOMS) for (const o of b.objects) signs.add(o.glyph);
  const prop = hubScene().story.prop;
  if (!prop.startsWith('prop_')) signs.add(prop);
  const signWords = BANK.filter((w) => w.glyph && signs.has(w.glyph)).map((w) => w.word);
  const saidBefore = [...storyWords(), ...bedroomWords(), ...signWords, ...(episode.grab ? [episode.grab.word] : [grabWord()])];
  return { fill, ally: episode.ally, gift, rooms, counterRoom, battle1Moves, moveWords: [...new Set(moveWords())], saidBefore };
}

/**
 * The warm-up's word (item 033), drawn on first need: before the house plan,
 * which then keeps it out of the rooms, the counter and the word machine. If
 * the plan was made first (a dev jump), the word keeps clear of its words.
 */
function grabWord(): string {
  if (!episode.grab) {
    const gift = giftWord();
    // Not a word on either battle's move pads (planned up front) either: she reads those.
    // Nor the villain's named counter word (HAT for Evil Tiamat): that would keep her named counter out this episode.
    const named = CHARACTER_BY_ID[episode.villain]?.counter.word;
    // Nor a word said before the battle (the bedroom, the hall's own lines, the quest
    // line and hub scene, the fight style), stemmed like every other draw (item 047).
    const avoid = withStems([gift, ...moveWords(), ...saidBeforeBattle(), ...(named ? [named] : []), ...(episode.house.plan ? readingWords() : [])]);
    // `level` is read when the hall opens, `misses` counted there: kept here so a trip to the parent page loses neither.
    // `?grab=king` (tests, item 085): that word, when the hall can ask for it.
    const asked = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('grab');
    episode.grab = { word: asked && GRAB_WORDS.includes(asked) ? asked : pickGrab(progress, avoid), objects: [], level: null, misses: 0 };
  }
  return episode.grab.word;
}

/** Every word on both battles' move pads. */
function moveWords(): string[] {
  const m = movePlan();
  return [...m.part1, ...m.part2].flatMap((c) => c.words);
}

/** Every word the episode has her read after the hall: the rooms' (machine words included), the counter, the move pads, the gift word. */
function readingWords(): string[] {
  const plan = episode.house.plan ?? [];
  return [...new Set([...(episode.gift ? [episode.gift] : []), ...plan.flatMap((p) => [p.key, ...p.fetches]), ...moveWords()])];
}

/**
 * The warm-up (item 033): its word and the hall's pictures. The word comes
 * first; the house plan is made next (keeping the word out of it); then the
 * other pictures, clear of every word she will read this episode.
 */
export function grabPlan(): { word: string; objects: string[] } {
  const word = grabWord();
  const grab = episode.grab!;
  if (!grab.objects.length) {
    housePlan();
    grab.objects = hallObjects(progress, word, readingWords().filter((w) => w !== word));
  }
  return { word, objects: grab.objects };
}

/**
 * The rooms' games, as the URL asks (tests, and a look at one game):
 * `?game=word_machine` puts that game behind door a (the rest drawn as
 * usual), `?games=sentence` draws from the sentence game only (the tests'
 * default, so a test that plays sentence rooms gets them). Otherwise nothing:
 * the whole pool.
 *
 * The beta's phonics room (item 053): with FORCE_PHONICS_ROOM on, a phonics
 * game (PHONICS_GAMES, drawn by weight) is behind door a of every episode,
 * unless the URL picks its own games (`?games=sentence`, `?game=`: the tests'
 * rooms stay theirs; `?games=all` is the real draw, so it is forced there).
 * `?room=charge` forces Charge the Spell and `?room=bridge` the Stretchy
 * Bridge (item 054) whatever else is asked: behind door a, or door b when
 * `?game=` holds door a.
 *
 * The beta's Shape-Shifter (item 096): with FORCE_SHIFTER_ROOM on, it is
 * behind door b of every episode (door a when no phonics game is forced),
 * on the same terms; `?room=shifter` forces it whatever else is asked.
 */
function roomGames(): { games?: [Minigame, Minigame, Minigame]; pool?: Minigame[] } {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const only = q.get('games') === 'sentence' ? SENTENCE_GAMES : undefined;
  const asked = MINIGAME_BY_ID[q.get('game') ?? ''];
  // `?games=all` is the real draw (and the drawn-episode tests'): only a narrowed or forced pick is the URL's.
  urlGames = Boolean(only || asked || q.get('room') === 'charge' || q.get('room') === 'bridge' || q.get('room') === 'shifter');
  const phonics =
    q.get('room') === 'charge' ? CHARGE_GAME
      : q.get('room') === 'bridge' ? BRIDGE_GAME
      : FORCE_PHONICS_ROOM && !only && !asked ? MINIGAME_BY_ID[pickWeighted(PHONICS_GAMES.map((g) => g.id), (id) => MINIGAME_BY_ID[id]!.weight * (progress.recentOf('phonics').includes(id) ? VARIETY.gameWeight : 1), 1)[0]!]
        : undefined;
  const shifter = q.get('room') === 'shifter' || (FORCE_SHIFTER_ROOM && !only && !asked) ? SHIFTER_GAME : undefined;
  // `?room=shifter` takes door a; else it follows the phonics game. Two doors: a third forced game waits its turn.
  const forced = (q.get('room') === 'shifter' ? [shifter, asked, phonics] : [asked, phonics, shifter]).filter((g, i, all): g is Minigame => Boolean(g) && all.indexOf(g) === i).slice(0, 2);
  if (!forced.length) return only ? { pool: only } : {};
  const rest = drawGames(progress, Math.random, (only ?? MINIGAMES).filter((g) => !forced.includes(g)));
  return { games: [forced[0]!, forced[1] ?? rest[1], rest[2]] };
}

/**
 * Words said before the battle, which no pad, not the gift word and not the
 * warm-up's word (`grabWord`, item 047) may be: the
 * wake-up threat (the bedroom), the quest's setup line and the hub scene
 * (`storyWords`: the variants drawn with the cast). The battle keeps its own
 * banners and lines clear of pad words as it goes (BattleScene `textGivesAway`).
 */
function saidBeforeBattle(): string[] {
  return withStems([...bedroomWords(), ...HALL_LINE_WORDS, ...ROOM_LINE_WORDS, ...storyWords(), ...fightWords(), ...FRAME_WORDS]);
}

/**
 * Every sentence frame's own words: the rooms' frames are drawn after the
 * pads, and the attic's {villain} RUNS FROM THE showed and said RUNS before
 * a battle-2 RUN pad (item 069).
 */
const FRAME_WORDS = FRAMES.flatMap((f) => wordsOf(f.text.replace(/\{\w+\}/g, ' ')));

/**
 * What the fight style says and shows around the pads (item 039: the
 * cook-off's "the yummiest dish wins!" came before a YUM pad): its banners,
 * its "too strong" call and its start and retreat lines. Drawing the style
 * here is drawing it a little sooner; it is the cast's last draw either way.
 */
function fightWords(): string[] {
  const f = fightStyle();
  const lines = (['start', 'start2', 'retreat'] as const).flatMap((b) => [f.lines[b]?.text, f.lines[b]?.say]);
  return [...f.banner, f.tooStrong, ...lines].flatMap((t) => wordsOf(t));
}

/** What the bedroom says about the villain: its wake-up threat and the taunt it shouts (BedroomScene). */
function bedroomWords(): string[] {
  const v = CHARACTER_BY_ID[episode.villain];
  const taunt = bedroomTaunt();
  // The wake-up's own lines too, whichever variants were drawn (item 040).
  const wake = (['up', 'good', 'door'] as const).map((k) => wakeTemplate(wakeVariant(k, episode.lines[k])));
  return [...wake.flatMap((t) => [...wordsOf(t?.text), ...wordsOf(t?.say)]), ...wordsOf(v?.house.threat), ...wordsOf(v?.house.threatSay), ...wordsOf(taunt?.text), ...wordsOf(taunt?.say)];
}

/** The entry hall's own lines ("let's grab the..."): GRAB is a bank word, so it is never a pad or the gift. */
const HALL_LINE_WORDS = NARRATOR_LINES.filter((t) => t.key.startsWith('grab_')).flatMap((t) => [...wordsOf(t.text), ...wordsOf(t.say)]);

/**
 * The side rooms' own lines, said before battle 1 (rooms a and b) and battle 2 (the attic): the
 * Shape-Shifter's "Find the letter that FIXES it!" came before a FIX pad (hunt 6; item 039's case).
 */
export const ROOM_LINE_WORDS = NARRATOR_LINES.filter((t) => /^(shifter|bridge|charge|machine|room|got)_/.test(t.key)).flatMap((t) => [...wordsOf(t.text), ...wordsOf(t.say)]);

/**
 * The hub's gift word (item 037): an action word from the bank, drawn on
 * first need (the hub, the move plan, the house plan, whichever asks first).
 */
export function giftWord(): string {
  episode.gift ??= drawGift(progress, { helper: helper(), avoid: saidBeforeBattle() });
  return episode.gift;
}

/** The battles' move choices: made once per episode, on first need (the house plan needs battle 1's). */
export function movePlan(): MovePlan {
  if (!episode.moves) {
    const gift = giftWord();
    const team = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    episode.moves = planMoves(progress, { hero: episode.hero, team, helper: helper(), gift, avoid: saidBeforeBattle() });
  }
  return episode.moves;
}

export function planFor(slot: Slot): RoomPlan {
  return housePlan().find((p) => p.slot === slot)!;
}

/**
 * Minigame debug mode (item 086, ./debug.ts): a one-off plan for `game` in
 * `slot`, drawn as the house plan draws, the episode's other rooms' games
 * kept. Its draws take words from the bag, so it runs only inside the debug
 * sandbox, which puts the store and the episode back afterwards.
 */
export function debugPlan(game: Minigame, slot: Slot): RoomPlan {
  const plan = housePlan();
  const i = slot === 'a' ? 0 : slot === 'b' ? 1 : 2;
  const games = plan.map((p) => MINIGAME_BY_ID[p.game]!) as [Minigame, Minigame, Minigame];
  games[i] = game;
  const input = planInput(giftWord(), [plan[0]!.room, plan[1]!.room], plan[2]!.room);
  return episodePlans(progress, { ...input, games })[i]!;
}

/** The word the attic's counter sentence ends in: whatever beats the villain this episode. */
export function counterWord(): string {
  return planFor('counter').key;
}

/**
 * The villain's named counter item when this episode's counter word is its
 * own word (Evil Tiamat and the HAT: the Magic Hat), else null and the
 * counter is just the thing in the picture.
 */
export function namedCounter(): CounterItem | null {
  const c = villainSpec().counter;
  return c.word === counterWord() ? c : null;
}

/** The counter's art: the named item's card, or the word's own picture. */
export function counterArt(): string {
  const named = namedCounter();
  return named ? `item_${named.id}` : `pic_${counterWord()}`;
}

/**
 * The victory scene (item 027), drawn once per episode: by the second battle
 * (item 065: so its art loads during the fight) or as it opens. `?ending=` forces one.
 */
export function drawEnding(): string {
  if (!episode.ending) {
    const forced = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('ending');
    episode.ending = forced && ENDING_BY_ID[forced] ? forced : pickEnding(episode, progress.recentOf('ending'));
  }
  return episode.ending;
}

/** The journey stops: every step from the bedroom to victory, with an icon each (and its step's kind). */
export function journeyStops(): { icon: string; index: number; kind: Step['kind'] }[] {
  const icon = (s: Step): string => {
    if (s.kind === 'bedroom') return '🛏️';
    if (s.kind === 'house') return away() ? PLACE_BY_ID[episode.place]!.glyph : '🏠';
    if (s.kind === 'battle') return '⚔️';
    if (s.kind === 'victory') return '🏆';
    return '•';
  };
  return steps()
    .map((s, index) => ({ s, index }))
    // The warm-up is still home, part of the morning: no stop of its own.
    .filter(({ s }) => s.kind !== 'title' && s.kind !== 'pick' && s.kind !== 'grab')
    .map(({ s, index }) => ({ icon: icon(s), index, kind: s.kind }));
}
