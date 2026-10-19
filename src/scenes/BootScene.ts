/**
 * Loads every art asset, generates the particle textures, reads the voice
 * manifest and decodes the core group, then hands over to the title, or, with
 * `?scene=<step>`, straight into a step of a plausible episode (tests, and
 * Matt wanting to look at one thing).
 *
 *   ?scene=bedroom
 *   ?scene=house&part=2                 (the hub; part 2 has the attic open)
 *   ?scene=room&slot=a|b|counter        (a side room; counter is the attic, part 2)
 *   ?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug   (ally=none for no ally; the cast: castOptions)
 *   ?scene=victory&read=cat,sun,julia   (the words the recap shows)
 *   ?scene=pick | parent
 *   ?fetched=net,fan                    (the battle items fetched; default: the house plan's)
 *   parked v0.1 games: ?scene=sound | blend | picture | spell | alarm | retreat
 *
 * Later steps get the episode they would have had by then: the spell learned
 * in the hub, the earlier rooms done, the fetched items in the bag (the plan's
 * own sentence words, so hub badges, bag and battle agree). A ?hero= that is
 * also the ally drops the ally (the narrator falls back to a Dada). An
 * unknown ?scene= warns and starts the title.
 *
 * Parked scenes (the v0.1 games and the pick) start outside the step list, so
 * the episode is still on step 0: when one finishes, advance() runs on into
 * the bedroom, keeping whatever state it set. That is accepted for a dev jump.
 */

import Phaser from 'phaser';

import { ART_ASSETS } from '../../content/art/assets';
import { CHARACTER_BY_ID, formId } from '../../content/battle/roster';
import { group } from '../../content/voice/ids';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { enterRoom, episode, episodeGroups, helper, isStepKind, jumpTo, planFor, setCastOptions, startStep, steps, type PrepGame, type Slot } from '../episode/Episode';
import { DADS, seededRand, type CastOverrides } from '../rules/cast';
import { makeTextures } from '../fx/textures';
import { spellFor } from '../rules/spell';
import { voiceBank } from '../voice/VoiceBank';

/**
 * The cast from the URL (item 025), for this episode and every one after it
 * this session; whatever is not given is drawn (src/rules/cast.ts).
 *
 *   ?seed=7                      the draw is repeatable: same seed, same episodes
 *   ?cast=default                the fixed default episode (EPISODE_DEFAULTS; the tests' default)
 *   ?hero= ?ally= ?villain=      roster ids; a dad's form by its id (ally=dada_matt_lifter); ally=none
 *   ?form=lifter,warlock         the dads' forms by name (builder lifter cyber blade; chef warrior warlock)
 *   ?primary=dada_jason|none     who wakes her; ?secondary=1|0 whether the other dad comes in too
 *   ?place=forest_gym|home       the quest place, whoever the helper is (to look at a place)
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
  else if (primary && (DADS as readonly string[]).includes(primary)) overrides.primary = primary;
  const secondary = q.get('secondary');
  if (secondary !== null) overrides.secondary = secondary === '1' || secondary === 'true';
  const seed = q.get('seed');
  return {
    overrides,
    ...(seed !== null && Number.isFinite(Number(seed)) ? { rand: seededRand(Number(seed)) } : {}),
    ...(q.get('cast') === 'default' ? { fixed: true } : q.get('cast') === 'random' ? { fixed: false } : {}),
    ...(q.get('place') ? { place: q.get('place') } : {}),
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2, 4, 24, 0xffd23f).setOrigin(0, 0.5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 608, 32).setStrokeStyle(3, 0xffffff);
    this.load.on('progress', (p: number) => (bar.width = 600 * p));
    for (const a of ART_ASSETS) this.load.image(a.id, `art/${a.id}.png`);
    // A missing art file must not stop the game: it falls back to a texture made below.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`art: missing ${file.key}`));
  }

  async create(): Promise<void> {
    makeTextures(this);
    for (const a of ART_ASSETS) {
      if (!this.textures.exists(a.id)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xff00ff, 1).fillRect(0, 0, 64, 64);
        g.generateTexture(a.id, 64, 64);
        g.destroy();
      }
    }
    await voiceBank.load();
    await voiceBank.loadGroups([group.core]);

    const q = new URLSearchParams(location.search);
    const target = q.get('scene');
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
      episode.spell = spellFor(episode.hero, helper());
    };
    const fetchedAll = (): void => {
      episode.fetched = fetched ? fetched.split(',') : (['a', 'b'] as Slot[]).flatMap((s) => planFor(s).fetches);
      episode.house.done = ['a', 'b'];
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
        episode.fetched = fetched ? fetched.split(',') : planFor('a').fetches;
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
    if (target === 'battle' || target === 'victory') {
      learned();
      fetchedAll();
      if (part === 2 || target === 'victory') {
        episode.house.done = ['a', 'b', 'counter'];
        episode.made.item = true;
      }
    }
    if (!isStepKind(target)) {
      console.warn(`?scene=${target} is not a step; starting the title`);
      startStep(this);
      return;
    }
    jumpTo(this, target, {}, part);
  }
}
