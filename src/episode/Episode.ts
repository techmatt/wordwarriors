/**
 * One episode, start to finish: who is fighting, what has been fetched, and
 * which step comes next.
 *
 *   title → (hero → ally → villain picks, off by default) → bedroom
 *   → the entry hall's warm-up ("before we head out, let's grab the ...")
 *   → house part 1 (hub: the gift word, two side-room sentence games,
 *     out the front door) → battle part 1 (the villain's ultimate wins)
 *   → house part 2 (back to the hub, the counter sentence game in the attic,
 *     out the front door) → battle part 2 (the counter wins) → victory → title
 *
 * Scenes never decide where to go next: they call `advance(scene)` when they
 * are done and this module starts the next step's scene. Inside a house step
 * the hub and its side rooms pass control between themselves (`enterRoom`,
 * `backToHub`); the front door is the hub's `advance()`.
 *
 * The four v0.1 prep games (Sound → Letter, Blend Path, Word → Picture, Spell
 * the Spell) are parked: their scenes and `prep`/`spell` step kinds stay so
 * `?scene=sound` etc. still open them, but no episode includes them.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { formFor } from '../../content/battle/forms';
import { CHARACTER_BY_ID, ROSTER, personOf } from '../../content/battle/roster';
import type { CharacterSpec, CounterItem, Taunt } from '../../content/battle/types';
import { COUNTER_ROOM, FETCH_ROOMS, HOME, PLACE_BY_ID, SIDE_ROOM_BY_ID } from '../../content/house/house';
import { BANK } from '../../content/phonics/bank';
import { questFor, questSetup, type Line } from '../../content/house/quests';
import { hubStory, storyTexts, type HubStory, type HubStoryIds } from '../../content/house/scenes';
import { group, wakeCastKey } from '../../content/voice/ids';
import { NARRATOR_LINES, wakeTemplate, wakeVariant } from '../../content/voice/script';
import { voiceBus } from '../audio/VoiceBus';
import { ADULT_HEIGHT, EPISODE_DEFAULTS, FORCE_PHONICS_ROOM } from '../config';
import { drawCast, isGrownUp, wakerOf, type CastOverrides } from '../rules/cast';
import { fightSpec, pickFight } from '../rules/fights';
import { FIGHT_BY_ID, type FightSpec } from '../../content/battle/fights';
import { endingPeople, pickEnding } from '../rules/endings';
import { ENDING_BY_ID } from '../../content/house/endings';
import { withStems, type Rand } from '../rules/bank';
import { episodePlans, wordsOf, type RoomPlan } from '../rules/sentences';
import { BRIDGE_GAME, CHARGE_GAME, MINIGAMES, MINIGAME_BY_ID, PHONICS_GAMES, SENTENCE_GAMES, drawGames, type Minigame } from '../rules/minigames';
import { battle1Words, drawGift, planMoves, type MovePlan } from '../rules/moves';
import { hallObjects, pickGrab } from '../rules/grab';
import { BEDROOM_TAUNTS, DEFAULT_LINES, DEFAULT_STORY, drawLines, drawStory, type LineVariants, type Story } from '../rules/story';
import { progress } from '../state/progress';
import { pickWeighted } from '../state/ProgressStore';
import { voiceBank } from '../voice/VoiceBank';
import { startScene } from '../art/gate';

export type PrepGame = 'sound' | 'blend' | 'picture';

export type Step =
  | { kind: 'title' }
  | { kind: 'pick'; what: 'hero' | 'ally' | 'villain' }
  | { kind: 'bedroom' }
  | { kind: 'grab' }
  | { kind: 'house'; part: 1 | 2 }
  | { kind: 'battle'; part: 1 | 2 }
  | { kind: 'victory' }
  // Parked v0.1 steps: reachable by ?scene= only.
  | { kind: 'alarm' }
  | { kind: 'prep'; game: PrepGame; index: number }
  | { kind: 'retreat' }
  | { kind: 'spell' };

export type Slot = RoomPlan['slot'];

export interface EpisodeState {
  /** Roster ids: a dad is his form this episode (`dada_matt_lifter`). See src/rules/cast.ts. */
  hero: string;
  ally: string | null;
  villain: string;
  villainWasRandom: boolean;
  /** The dad who wakes her (narrates with no ally), in his form; null when both dads are busy. */
  primary: string | null;
  /** The other dad, there in the bedroom too, or null. */
  secondary: string | null;
  /** The quest place (content/house/house.ts PLACES id, or `home`): where the helper takes her to train. */
  place: string;
  prep: PrepGame[];
  /** v0.1's made things (parked games); `item` is still the counter-item. */
  made: { gem: boolean; ammo: boolean; helper: boolean; item: boolean };
  /** Words she read (or spelled) right this episode, in order, for the victory recap. */
  read: string[];
  /** Key words fetched from the side rooms, in order: each is a battle item. */
  fetched: string[];
  /**
   * The hub's gift word (item 037): an action word the helper gives her, drawn
   * from the bank (`giftWord`). Her first move choice of each part.
   */
  gift: string | null;
  /**
   * Charge the Spell (item 053): the sounds she charged in its room, in order,
   * and the battle part they fire in (the next one). Never words: they stay
   * out of `read` and `fetched` (no recap card, no bag picture).
   */
  charged: { sounds: string[]; part: 1 | 2 } | null;
  /** The battles' move choices (item 018), planned with the house: battle 1's words never become the counter word. */
  moves: MovePlan | null;
  /**
   * The house: which room holds which sentence, and which rooms are done.
   * `misses`: wrong tries on a round not yet answered, by `<slot>:<word>` (a
   * room) or `move:<part>:<n>` (a battle's move choice; `...:done` once it is
   * recorded), so a trip to the parent page (F9) and back neither turns a miss
   * into a first try nor records a choice twice (item 039).
   */
  house: { plan: RoomPlan[] | null; done: Slot[]; taught: boolean; misses?: Record<string, number> };
  /**
   * The home warm-up (item 033, src/rules/grab.ts): the word she grabs in the
   * entry hall and the hall's pictures. Drawn before the house plan, which
   * keeps the word out of its reading.
   */
  grab: { word: string; objects: string[]; level: number | null; misses: number } | null;
  /** The victory scene (content/house/endings.ts id), drawn when it starts (item 027). */
  ending: string | null;
  /** The victory scene has been counted (progress `endingPlayed`, `episodeDone`): it may be drawn earlier than it opens. */
  endingCounted: boolean;
  /** The showdown's fight style (content/battle/fights.ts id), drawn at the first battle (item 031). */
  fight: string | null;
  /** Which quest setup line and hub scene the helper plays (item 037, src/rules/story.ts), drawn with the cast. */
  story: Story;
  /** Which wake-up, bedroom taunt, sorry and victory lines this episode says (item 040, `drawLines`), drawn with the cast. */
  lines: LineVariants;
  stepIndex: number;
}

const SCENE_FOR: Record<Step['kind'], string> = {
  title: 'Title',
  pick: 'Pick',
  bedroom: 'Bedroom',
  grab: 'Entry',
  house: 'Hub',
  battle: 'Battle',
  // The victory step opens on its scene (item 027), which goes on to the recap.
  victory: 'Ending',
  alarm: 'Alarm',
  prep: 'Prep',
  retreat: 'Retreat',
  spell: 'Spelling',
};

export function prepScene(game: PrepGame): string {
  return game === 'sound' ? 'SoundToLetter' : game === 'blend' ? 'BlendPath' : 'WordToPicture';
}

let episodeCount = 0;

function choosePrep(): PrepGame[] {
  const all: PrepGame[][] = [
    ['sound', 'picture'],
    ['blend', 'sound'],
    ['picture', 'blend'],
  ];
  return all[episodeCount % all.length]!;
}

export const episode: EpisodeState = {
  hero: EPISODE_DEFAULTS.hero,
  ally: EPISODE_DEFAULTS.ally,
  villain: EPISODE_DEFAULTS.villain,
  villainWasRandom: false,
  primary: EPISODE_DEFAULTS.primary,
  secondary: null,
  place: HOME,
  prep: choosePrep(),
  made: { gem: false, ammo: false, helper: false, item: false },
  read: [],
  fetched: [],
  charged: null,
  gift: null,
  moves: null,
  house: { plan: null, done: [], taught: false },
  grab: null,
  ending: null,
  endingCounted: false,
  fight: null,
  story: { ...DEFAULT_STORY },
  lines: { ...DEFAULT_LINES },
  stepIndex: 0,
};

export function steps(_state: EpisodeState = episode): Step[] {
  const picks: Step[] = EPISODE_DEFAULTS.pickScreens
    ? [
        { kind: 'pick', what: 'hero' },
        { kind: 'pick', what: 'ally' },
        { kind: 'pick', what: 'villain' },
      ]
    : [];
  return [
    { kind: 'title' },
    ...picks,
    { kind: 'bedroom' },
    { kind: 'grab' },
    { kind: 'house', part: 1 },
    { kind: 'battle', part: 1 },
    { kind: 'house', part: 2 },
    { kind: 'battle', part: 2 },
    { kind: 'victory' },
  ];
}

export function currentStep(): Step {
  return steps()[episode.stepIndex] ?? { kind: 'title' };
}

/** The dad who wakes her (src/rules/cast.ts `wakerOf`), in his form. */
export function waker(state: EpisodeState = episode): string {
  return wakerOf(state);
}

/**
 * The helper (gives the gift word, fills `{helper}` in sentences, takes her on
 * the quest): the ally, or with no ally the dad who woke her. A roster id, so
 * a dad's form, whose abilities may style the gift word's move.
 */
export function helper(state: EpisodeState = episode): string {
  return state.ally ?? waker(state);
}

/**
 * Who gives instructions: the helper's person (narrator lines are voiced per
 * person: lifter Dada Matt narrates as `dada_matt`).
 */
export function narrator(state: EpisodeState = episode): string {
  return personOf(helper(state));
}

/**
 * The roster id `id` plays in this episode: a person's form when they are in
 * the cast (`dada_matt` → `dada_matt_cyber` when Dada Matt is the cyberdecker
 * today), else `id`. The voice speaks as the person; this is who to draw.
 */
export function castId(id: string, state: EpisodeState = episode): string {
  const person = personOf(id);
  const inCast = [state.ally, state.villain, state.primary, state.secondary, state.hero].find((c) => c && personOf(c) === person);
  return inCast ?? id;
}

/**
 * The image `id` appears as in this episode, once she is awake: its outfit
 * (content/battle/forms.ts: Julia the chef when Dada Jason is the ally), else
 * the roster image of the form it plays (`castId`). The title, the pick
 * screens and Julia asleep in bed use `charArt` directly: the default images.
 */
export function castArt(id: string, evil = false, state: EpisodeState = episode): string {
  const c = castId(id, state);
  if (evil) return charArt(c, true);
  return formFor(c, state)?.art ?? charArt(c, false);
}

/**
 * How tall `id` stands beside the hero outside battles (item 028): the size
 * of the form it plays over hers, kept between 0.7 and 1.3 so a dragon still
 * fits a room. A dad is grown-up height beside her, `ADULT_HEIGHT` (item
 * 034); Scar and Ellie a little shorter.
 */
export function castScale(id: string, state: EpisodeState = episode): number {
  const c = CHARACTER_BY_ID[castId(id, state)];
  const hero = CHARACTER_BY_ID[castId(state.hero, state)];
  if (!c || !hero) return 1;
  if (isGrownUp(c.id) && !isGrownUp(hero.id)) return ADULT_HEIGHT;
  return Phaser.Math.Clamp(c.good.size / hero.good.size, 0.7, 1.3);
}

/** The name-free face card for `id` in this episode (names as sight words): its outfit's, else its form's `face_<id>`. */
export function castFace(id: string, state: EpisodeState = episode): string {
  const c = castId(id, state);
  return formFor(c, state)?.face ?? `face_${c}`;
}

/** The quest's setup line this episode (its id and words), said in the bedroom in the helper's voice: theirs, or the narrator's "right here at home". */
export function questSetupOf(state: EpisodeState = episode): { id: string; line: Line } {
  return questSetup(helper(state), narrator(state), state.story.quest);
}

/** The quest's setup line id, for the bedroom. */
export function questSetupLine(state: EpisodeState = episode): string {
  return questSetupOf(state).id;
}

/** The hub scene this episode (item 037, content/house/scenes.ts): the helper's lines that give her the gift word. */
export function hubScene(state: EpisodeState = episode): { story: HubStory; ids: HubStoryIds } {
  return hubStory(helper(state), narrator(state), state.story.scene);
}

/**
 * Every word the helper's story says before the side rooms: the quest line
 * (the bedroom) and the hub scene. None may be a key word, a pad or the gift.
 */
export function storyWords(state: EpisodeState = episode): string[] {
  const q = questSetupOf(state).line;
  return [q.text, q.say ?? '', ...storyTexts(hubScene(state).story)].flatMap((s) => wordsOf(s));
}

/** True when the episode trains somewhere other than the house. */
export function away(state: EpisodeState = episode): boolean {
  return state.place !== HOME && Boolean(PLACE_BY_ID[state.place]);
}

let castOverrides: CastOverrides = {};
let castRand: Rand = Math.random;
let castDefault = !EPISODE_DEFAULTS.randomCast;
let placeOverride: string | null = null;
let fightOverride: string | null = null;

/**
 * Fix parts of every episode's cast this session (`?ally=`, `?villain=`,
 * `?form=`, `?primary=`, `?secondary=`, `?seed=`, `?cast=default`,
 * `?place=`: BootScene), then recast the current episode.
 */
export function setCastOptions(o: { overrides?: CastOverrides; rand?: Rand; fixed?: boolean; place?: string | null; fight?: string | null }): void {
  if (o.overrides) castOverrides = o.overrides;
  if (o.fight !== undefined) fightOverride = o.fight;
  if (o.rand) castRand = o.rand;
  if (o.fixed !== undefined) castDefault = o.fixed;
  if (o.place !== undefined) placeOverride = o.place;
  castEpisode();
}

/**
 * Draw this episode's cast (src/rules/cast.ts) and its quest place. `picked`
 * fixes roles for this episode only: the parked pick screens' choices, after
 * which the dads' roles, forms and the quest are drawn around them.
 */
export function castEpisode(picked: CastOverrides = {}): void {
  const fixed: CastOverrides = castDefault
    ? {
        ally: EPISODE_DEFAULTS.ally,
        ...(EPISODE_DEFAULTS.randomVillain ? {} : { villain: EPISODE_DEFAULTS.villain }),
        primary: EPISODE_DEFAULTS.primary,
        secondary: false,
        forms: { dada_matt: 'builder', dada_jason: 'chef' },
      }
    : {};
  const overrides = { ...fixed, ...castOverrides, ...picked };
  const c = drawCast({ hero: EPISODE_DEFAULTS.hero, recent: progress.recentVillains(), overrides }, castRand);
  episode.hero = c.hero;
  episode.ally = c.ally;
  episode.villain = c.villain;
  episode.villainWasRandom = !overrides.villain;
  episode.primary = c.primary;
  episode.secondary = c.secondary;
  // The hero cannot also be the ally (she would give herself the gift word).
  if (episode.ally && personOf(episode.ally) === personOf(episode.hero)) episode.ally = null;
  episode.place = placeOverride && (placeOverride === HOME || PLACE_BY_ID[placeOverride]) ? placeOverride : questFor(helper()).place;
  episode.fight = null;
  // The helper's quest line and hub scene (item 037): after the cast, so a
  // seed draws the same cast as before; the default cast always plays the first.
  episode.story = drawStory(helper(), castRand, castDefault);
  // The wake-up and the villain's lines (item 040): after the story, so a seed's story is unchanged.
  episode.lines = drawLines(episode.villain, castRand, castDefault);
}

/** The waker's wake line `key` (`up`, `good_<hero>`, `door`) in this episode's variant: `wake_<waker>_up_2`. */
export function wakeKey(key: 'up' | 'good' | 'door', state: EpisodeState = episode): string {
  const n = state.lines[key];
  return key === 'good' ? wakeVariant(wakeCastKey('good', personOf(state.hero)), n) : wakeVariant(key, n);
}

/** The villain's far-off bedroom taunt this episode: one of its first `BEDROOM_TAUNTS` (item 040). */
export function bedroomTaunt(state: EpisodeState = episode): Taunt | undefined {
  const t = CHARACTER_BY_ID[state.villain]?.evil.taunts ?? [];
  return t[Math.min(state.lines.taunt, BEDROOM_TAUNTS, t.length) - 1];
}

/** The villain's sorry after battle 2 and its line in the victory scene, this episode's variants (item 040). */
export function reformedOf(which: 'sorry' | 'ending', state: EpisodeState = episode): Taunt | undefined {
  const r = CHARACTER_BY_ID[state.villain]?.reformed[which] ?? [];
  return r[Math.min(state.lines[which], r.length) - 1];
}

/**
 * The showdown's fight style (item 031, src/rules/fights.ts): drawn on first
 * need, so both battles are the same contest; `?fight=<id>` fixes it.
 */
export function fightStyle(): FightSpec {
  if (!episode.fight) episode.fight = fightOverride && FIGHT_BY_ID[fightOverride] ? fightOverride : pickFight(episode, castRand);
  return fightSpec(episode.fight);
}

export function villainSpec(): CharacterSpec {
  return CHARACTER_BY_ID[episode.villain]!;
}

export function resetEpisode(): void {
  castEpisode();
  episode.prep = choosePrep();
  episode.made = { gem: false, ammo: false, helper: false, item: false };
  episode.read = [];
  episode.fetched = [];
  episode.charged = null;
  episode.gift = null;
  episode.moves = null;
  episode.house = { plan: null, done: [], taught: false };
  episode.grab = null;
  episode.ending = null;
  episode.endingCounted = false;
  episode.fight = null;
  episode.stepIndex = 0;
}

/** Pick a random villain (any form) that is not the hero's or ally's own person: the pick screen's surprise. */
export function randomVillain(rand = Math.random): string {
  const pool = ROSTER.filter((c) => personOf(c.id) !== personOf(episode.hero) && (!episode.ally || personOf(c.id) !== personOf(episode.ally)));
  return pool[Math.floor(rand() * pool.length)]!.id;
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
    const fill = { villain: episode.villain, helper: helper(), hero: episode.hero };
    // The rooms: the quest place's own, or two of the house's.
    const place = away() ? PLACE_BY_ID[episode.place]! : null;
    const rooms = place
      ? ([place.rooms[0]!.id, place.rooms[1]!.id] as [string, string])
      : (Phaser.Utils.Array.Shuffle([...FETCH_ROOMS]).slice(0, 2) as [string, string]);
    const counterRoom = place ? place.secret.id : COUNTER_ROOM;
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
    const signWords = BANK.filter((w) => w.glyph && signs.has(w.glyph)).map((w) => w.word);
    const saidBefore = [...storyWords(), ...bedroomWords(), ...signWords, ...(episode.grab ? [episode.grab.word] : [grabWord()])];
    const games = roomGames();
    episode.house.plan = episodePlans(progress, { fill, ally: episode.ally, gift, rooms, counterRoom, battle1Moves, moveWords: [...new Set(moveWords())], saidBefore, ...games });
  }
  return episode.house.plan;
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
    episode.grab = { word: pickGrab(progress, avoid), objects: [], level: null, misses: 0 };
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
 */
function roomGames(): { games?: [Minigame, Minigame, Minigame]; pool?: Minigame[] } {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  const only = q.get('games') === 'sentence' ? SENTENCE_GAMES : undefined;
  const asked = MINIGAME_BY_ID[q.get('game') ?? ''];
  const phonics =
    q.get('room') === 'charge' ? CHARGE_GAME
      : q.get('room') === 'bridge' ? BRIDGE_GAME
      : FORCE_PHONICS_ROOM && !only && !asked ? MINIGAME_BY_ID[pickWeighted(PHONICS_GAMES.map((g) => g.id), (id) => MINIGAME_BY_ID[id]!.weight, 1)[0]!]
        : undefined;
  const forced = [asked, phonics].filter((g, i, all): g is Minigame => Boolean(g) && all.indexOf(g) === i);
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
  return withStems([...bedroomWords(), ...HALL_LINE_WORDS, ...storyWords(), ...fightWords()]);
}

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
    episode.ending = forced && ENDING_BY_ID[forced] ? forced : pickEnding(episode, progress.lastEnding());
  }
  return episode.ending;
}

/** Voice groups the current episode will need from here on. */
export function episodeGroups(): string[] {
  // In decode order (item 062: one queue). The letter sounds first: a bridge stone's held sound does not wait for its decode.
  const g = [group.core, group.phonics, group.narrator(narrator())];
  g.push(group.fighter(episode.hero), group.fighter(`${episode.villain}_evil`));
  if (episode.ally) g.push(group.fighter(episode.ally));
  // The victory scene (item 027): everyone in it says a line in their own voice.
  for (const id of endingPeople(episode)) g.push(group.ending(personOf(id)));
  return [...new Set(g)];
}

/** True for a step kind that has a scene (a `?scene=` value jumpTo can take). */
export function isStepKind(kind: string): kind is Step['kind'] {
  return Object.prototype.hasOwnProperty.call(SCENE_FOR, kind);
}

/** Start the scene for the current step. */
export function startStep(scene: Phaser.Scene): void {
  const step = currentStep();
  voiceBus.hush();
  const key = step.kind === 'prep' ? prepScene(step.game) : SCENE_FOR[step.kind];
  // Not for the title: it draws a fresh cast as it opens, and its one line is
  // core (item 039: it decoded the old cast's narrator, ~500 clips, for nothing).
  if (step.kind !== 'title') {
    // A new episode: let the last one's voices go first.
    if (step.kind === 'bedroom') voiceBank.retain(episodeGroups());
    void voiceBank.loadGroups(episodeGroups());
  }
  startScene(scene, key, { step });
}

/** From the hub into a side room: the scene of the minigame drawn for it (src/rules/minigames.ts). */
export function enterRoom(scene: Phaser.Scene, slot: Slot): void {
  voiceBus.hush();
  startScene(scene, planFor(slot).scene, { step: currentStep(), slot });
}

/** From a side room back to the hub, standing at that room's door. */
export function backToHub(scene: Phaser.Scene, from: Slot): void {
  voiceBus.hush();
  startScene(scene, 'Hub', { step: currentStep(), from });
}

/** The current step is done; go to the next one. */
export function advance(scene: Phaser.Scene): void {
  // The cast is drawn more often than episodes are played (at boot, at the
  // title): her villain counts as met only when she presses on from the title.
  if (currentStep().kind === 'title' && episode.villainWasRandom) progress.villainMet(personOf(episode.villain));
  episode.stepIndex++;
  if (episode.stepIndex >= steps().length) {
    // progress.episodeDone() ran as the victory scene opened (EndingScene).
    episodeCount++;
    resetEpisode();
  }
  // The battles and the victory are reached by a short hop along the journey
  // map, so she can see where she is in the episode and what comes next. So is
  // the run home after the retreat (house part 2): "back home, he still waits".
  const next = currentStep();
  if ((JOURNEY_BEFORE.includes(next.kind) || (next.kind === 'house' && next.part === 2)) && !skipJourney) {
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    startScene(scene, 'Journey');
    return;
  }
  startStep(scene);
}

/** Steps that get the journey map first. */
const JOURNEY_BEFORE: Step['kind'][] = ['battle', 'victory'];

/** Tests may turn the map off to save time; the game never does. */
const skipJourney = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).has('nojourney');

/** The journey stops: every step from the bedroom to victory, with an icon each. */
export function journeyStops(): { icon: string; index: number }[] {
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
    .map(({ s, index }) => ({ icon: icon(s), index }));
}

/**
 * Jump into a step directly (dev F-keys, `?scene=`), with a plausible episode
 * around it. Parked steps (alarm, prep, retreat, spell) are not in the list,
 * so they start on their own with the episode as it is. stepIndex is left
 * alone (0, the title, after a boot), so when a parked scene finishes its
 * advance() runs on into the bedroom, carrying whatever state it left behind.
 */
export function jumpTo(scene: Phaser.Scene, kind: Step['kind'], extra: Partial<EpisodeState> = {}, part: 1 | 2 = 1): void {
  Object.assign(episode, extra);
  const list = steps();
  const i = list.findIndex((s) => s.kind === kind && (!('part' in s) || s.part === part));
  if (i < 0) {
    // A parked pick (pickScreens off) is the hero pick: a pick with no `what`
    // would fall through to the villain branch.
    const parked: Step =
      kind === 'prep' ? { kind: 'prep', game: episode.prep[0]!, index: 0 }
        : kind === 'pick' ? { kind: 'pick', what: 'hero' }
          : ({ kind } as Step);
    voiceBus.hush();
    void voiceBank.loadGroups(episodeGroups());
    startScene(scene, parked.kind === 'prep' ? prepScene(parked.game) : SCENE_FOR[parked.kind], { step: parked });
    return;
  }
  episode.stepIndex = i;
  startStep(scene);
}
