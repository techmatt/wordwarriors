/**
 * Generates the particle textures, loads the title's art (the rest loads on
 * demand, item 065: src/art/), reads the voice manifest and decodes the core group, then hands over to the title, or, with
 * `?scene=<step>`, straight into a step of a plausible episode (tests, and
 * Matt wanting to look at one thing).
 *
 *   ?scene=bedroom
 *   ?scene=house&part=2                 (the hub; part 2 has the attic open)
 *   ?scene=room&slot=a|b|counter        (a side room; counter is the attic, part 2)
 *   ?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug   (ally=none for no ally; the cast: castOptions)
 *   ?scene=victory&read=cat,sun,julia   (the words the recap shows)
 *   ?scene=theend                       (THE END, the victory step's last screen: Dad's 2 starts a new episode)
 *   ?scene=pick | parent
 *   ?fetched=net,fan                    (the battle items fetched; default: the house plan's)
 *   ?warmup=1                           (the entry hall's warm-up word fetched first too, as in an episode)
 *   ?charged=m,s,a                      (Charge the Spell's runes, fired in this battle part; default: the plan's charge room's, in part 1)
 *   ?room=charge                        (Charge the Spell behind door a: src/episode/plans.ts roomGames)
 *   parked v0.1 games: ?scene=sound | blend | picture | spell | alarm | retreat
 *
 * Not the whole list (?difficulty=, ?prep=, ?read= and more): docs/episode.md,
 * *Dev keys and URLs*, has every one. The episode's own (?room= ?game= ?games=
 * ?sentence= ?grab= ?ending= in src/episode/plans.ts, ?solo in state.ts,
 * ?nojourney in Episode.ts) are read there, not here.
 *
 * Later steps get the episode they would have had by then: the gift word
 * learned in the hub, the earlier rooms done, the fetched items in the bag (the plan's
 * own sentence words, so hub badges, bag and battle agree). A ?hero= that is
 * also the ally drops the ally (the narrator falls back to a Dada). An
 * unknown ?scene= warns and starts the title.
 *
 * Parked scenes (the v0.1 games and the pick) start outside the step list, so
 * the episode is still on step 0: when one finishes, advance() runs on into
 * the bedroom, keeping whatever state it set. That is accepted for a dev jump.
 */

import Phaser from 'phaser';

import { CHARACTER_BY_ID, formId } from '../../content/battle/roster';
import { NO_BAG_COPY } from '../../content/phonics/sentences';
import { group } from '../../content/voice/ids';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { enterRoom, episode, episodeGroups, giftWord, grabPlan, isStepKind, jumpTo, planFor, seedRands, setCastOptions, startStep, steps, type PrepGame, type Slot } from '../episode/Episode';
import { DADS, isDad, type CastOverrides } from '../rules/cast';
import { setDifficulty } from '../rules/difficulty';
import { NEW_WORDS, favourWords } from '../rules/bank';
import { chargeRunes } from '../rules/charge';
import { artBank } from '../art/ArtBank';
import { artFor } from '../art/needs';
import { startScene } from '../art/gate';
import { makeTextures } from '../fx/textures';
import { voiceBank } from '../voice/VoiceBank';

/**
 * The cast from the URL (item 025), for this episode and every one after it
 * this session; whatever is not given is drawn (src/rules/cast.ts).
 *
 *   ?seed=7                      seeds the episode's draws (castRand, planRand): same seed and
 *                                progress, same cast, quest place, story and line variants, fight
 *                                style, rooms, games and words
 *   ?cast=default                the fixed default episode (EPISODE_DEFAULTS; the tests' default)
 *   ?hero= ?ally= ?villain=      roster ids; a dad's form by its id (ally=dada_matt_lifter); ally=none
 *   ?form=lifter,warlock         the dads' forms by name (builder lifter cyber blade; chef warrior warlock)
 *   ?primary=dada_jason|none     who wakes her; ?secondary=1|0 whether the other dad comes in too
 *   ?place=forest_gym|home       the quest place, whoever the helper is (to look at a place)
 *   ?fight=sky_race              the showdown's fight style, whoever the villain is
 */
function castOptions(q: URLSearchParams): Parameters<typeof setCastOptions>[0] {
  const overrides: CastOverrides = {};
  const id = (key: string) => {
    const v = q.get(key);
    return v && CHARACTER_BY_ID[v] ? v : undefined;
  };
  const hero = id('hero');
  if (hero) overrides.hero = hero;
  const ally = q.get('ally') === 'none' ? null : id('ally');
  if (ally !== undefined) overrides.ally = ally;
  const villain = id('villain');
  if (villain) overrides.villain = villain;
  const forms = q.get('form');
  if (forms) {
    overrides.forms = {};
    for (const name of forms.split(',')) {
      const dad = DADS.find((d) => formId(d, name));
      if (dad) overrides.forms[dad] = name;
    }
  }
  const primary = q.get('primary');
  if (primary === 'none') overrides.primary = null;
  else if (primary && isDad(primary)) overrides.primary = primary;
  const secondary = q.get('secondary');
  if (secondary !== null) overrides.secondary = secondary === '1' || secondary === 'true';
  const seed = q.get('seed');
  return {
    overrides,
    ...(seed !== null && Number.isFinite(Number(seed)) ? seedRands(Number(seed)) : {}),
    ...(q.get('cast') === 'default' ? { fixed: true } : q.get('cast') === 'random' ? { fixed: false } : {}),
    ...(q.get('place') ? { place: q.get('place') } : {}),
    ...(q.get('fight') ? { fight: q.get('fight') } : {}),
  };
}

export class BootScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Boot');
  }

  preload(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 608, 32).setStrokeStyle(3, 0xffffff);
    this.bar = this.add.rectangle(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2, 4, 24, 0xffd23f).setOrigin(0, 0.5);
  }

  async create(): Promise<void> {
    makeTextures(this);
    const q = new URLSearchParams(location.search);
    const target = q.get('scene');
    // Art loads on demand (item 065): only the title's, and only on a plain start;
    // a `?scene=` jump waits at the gate (src/art/gate.ts) for its own.
    const plain = !target;
    const title = plain ? artBank.missing(artFor('Title', true)) : [];
    let got = 0;
    const tick = () => (this.bar.width = 4 + 596 * (title.length ? got / title.length : 1));
    // The manifest only, not core's ~290 clips (item 150, 148's fix 2): the title says one line,
    // which VoiceBus asks for ahead of the rest. Awaited, a slow server held the bar for 18 s.
    await Promise.all([...title.map((id) => artBank.ensure([id]).then(() => (got++, tick()))), voiceBank.load()]);
    void voiceBank.loadGroups([group.core]);

    // The difficulty knob for this session (item 067; DIFFICULTY in config otherwise): before any plan is drawn.
    if (q.get('difficulty')) setDifficulty(Number(q.get('difficulty')));
    // Item 121: `?words=new` (the newest words) or `?words=tree,bee` lean every word draw to those words this session.
    const favoured = q.get('words');
    if (favoured) favourWords(favoured === 'new' ? NEW_WORDS : favoured.toLowerCase().split(','));
    setCastOptions(castOptions(q));
    const read = q.get('read');
    if (read) episode.read = read.split(',');
    const prep = q.get('prep');
    if (prep) episode.prep = prep.split(',') as PrepGame[];

    if (!target) {
      startStep(this);
      return;
    }
    let part: 1 | 2 = q.get('part') === '2' ? 2 : 1;
    const fetched = q.get('fetched');

    // The episode as it would be by a given point.
    const learned = (): void => {
      episode.house.taught = true;
      giftWord();
    };
    const charged = q.get('charged');
    const fetchedAll = (): void => {
      // A plan's words, as fetched by playing it: MOM and DAD never (NO_BAG_COPY, hunt 10, M45).
      episode.fetched = fetched ? fetched.split(',') : (['a', 'b'] as Slot[]).flatMap((s) => planFor(s).fetches).filter((w) => !NO_BAG_COPY.has(w));
      // The warm-up's word, first as in an episode (hunt 6, M28: the battle's opening with all eight things).
      if (q.get('warmup') === '1' && !fetched) episode.fetched.unshift(grabPlan().word);
      episode.house.done = ['a', 'b'];
      // Charge the Spell's runes (item 053): the ones asked for, or all of the plan's charge room's.
      const room = (['a', 'b'] as Slot[]).map((s) => planFor(s)).find((p) => p.kind === 'charge');
      if (charged) episode.charged = { sounds: charged.split(','), part };
      else if (room?.kind === 'charge') episode.charged = { sounds: chargeRunes(room.charge), part: 1 };
    };

    if (target === 'parent') {
      this.scene.start('Parent', { back: 'Title' });
      return;
    }
    if (target === 'sound' || target === 'blend' || target === 'picture') {
      episode.prep = [target, ...(['sound', 'blend', 'picture'] as PrepGame[]).filter((p) => p !== target)];
      jumpTo(this, 'prep');
      return;
    }
    if (target === 'room') {
      const slot: Slot = q.get('slot') === 'b' ? 'b' : q.get('slot') === 'counter' ? 'counter' : 'a';
      part = slot === 'counter' ? 2 : 1;
      learned();
      if (slot === 'counter') fetchedAll();
      else if (slot === 'b') {
        episode.house.done = ['a'];
        episode.fetched = fetched ? fetched.split(',') : planFor('a').fetches.filter((w) => !NO_BAG_COPY.has(w));
        const a = planFor('a');
        if (a.kind === 'charge') episode.charged = { sounds: chargeRunes(a.charge), part: 1 };
      }
      // The house step of the right part, then straight through its door.
      episode.stepIndex = steps().findIndex((s) => s.kind === 'house' && s.part === part);
      void voiceBank.loadGroups(episodeGroups());
      enterRoom(this, slot);
      return;
    }
    if (target === 'house' && part === 2) {
      learned();
      fetchedAll();
    }
    if (target === 'battle' || target === 'victory' || target === 'theend') {
      learned();
      fetchedAll();
      if (part === 2 || target !== 'battle') {
        episode.house.done = ['a', 'b', 'counter'];
        episode.made.item = true;
      }
    }
    if (target === 'theend') {
      // The victory step, at its last screen (item 085).
      episode.stepIndex = steps().findIndex((s) => s.kind === 'victory');
      startScene(this, 'TheEnd', { step: steps()[episode.stepIndex] });
      return;
    }
    if (!isStepKind(target)) {
      console.warn(`?scene=${target} is not a step; starting the title`);
      startStep(this);
      return;
    }
    jumpTo(this, target, {}, part);
  }
}
