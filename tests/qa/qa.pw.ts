/**
 * The bug-hunt checker (item 039). Not a test: it plays whole episodes at
 * speed across casts, places, fight styles and games, shoots only at
 * meaningful moments (a scene change, each line, each new round or choice,
 * each battle phase, the ending and the recap) and runs the automatic checks
 * in `checks.ts` at each. Run it with its own config:
 *
 *   QA_TAG=<tag> npm run qa [-- -g <scenario>]
 *
 * and read `qa/<tag>/` in the scratch home (`tools/scratch.ts`, item 149;
 * `qa.config.ts` prunes older hunts there as a sweep starts): one folder of shots per scenario, its
 * `<scenario>.json` (issues, counts, lock and frame stats), then
 * `npx tsx tests/qa/report.ts <tag>` for `summary.md` and contact sheets.
 * `QA_SET=quick` plays three scenarios, `QA_SET=<batch>` one later batch (each
 * scenario's `batch`; the list: README, "The bug-hunt checker"), `all` every
 * batch; the default plays the first.
 * A scenario that stalls records a `stall` issue with its last shot and the
 * next one runs. README, "The bug-hunt checker"; findings: docs/qa-findings.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

import { test, type Page } from '@playwright/test';

import { BANK } from '../../content/phonics/bank';
import { FREE_PLAY, GAME_WIDTH, REACH, SHIFTER } from '../../src/config';
import type { ProgressData } from '../../src/state/ProgressStore';
import { SPEED, boot, choose, collectErrors, debugTagShown, driver, hubGo, leaveBedroom, playBattle, playAgain, playEntry, playRoom, playSentenceRoom, press, seedProgress, setHidden, state, storedBlob, toTheEnd, until, type RoomPlay, type WWState, VOICE } from '../harness';
import { fighterIssues, layoutIssues, leakIssues, logIssues, onlyLineVariants, padReachIssues, placeholderArt, soundGapIssues, spawnIssues, storeChanges, voiceBuildIssues, type Issue, type Since } from './checks';
import { qaLayout, qaSince } from './probe';
import { clippedIssues, giveawayIssues, letterNameIssues, pacingIssues, repeatedLines, spellingIssues, tauntIssues, variantIssues } from './wording';
import { NARRATOR_LINES, lineVariantKeys } from '../../content/voice/script';
import { scratchPath } from '../../tools/scratch';

// Item 083: real voice and real walking: the checker looks and listens as she would.
VOICE.mode = 'real';
driver.walk = true;

/** Each narrator key with variants (item 087) and its variant keys, for `variantIssues`. */
// Not the Shape-Shifter's fix-it praise (hunt 12): M46 skips "You made it match!" before another fix-it link, so
// "You got the right letter!" twice running is the rule, and every Shifter scenario flagged it.
const VARIANT_BASES = Object.fromEntries(NARRATOR_LINES.map((t) => t.key).filter((k) => !/_\d+$/.test(k) && k !== 'shifter_fixed').map((k) => [k, lineVariantKeys(k)] as const).filter(([, v]) => v.length > 1));

const TAG = process.env.QA_TAG ?? 'now';
const OUT = scratchPath('qa', TAG);
const PLACEHOLDERS = placeholderArt();
// Lines with no clip, or a clip for old text: the same for every scenario, so read once (item 062).
const VOICE_BUILD = voiceBuildIssues();

interface Scenario {
  name: string;
  query: string;
  /** Wrong answers first everywhere: the warm-up, the rooms, the pads, the machine. */
  wrong?: boolean;
  /** Episodes back to back (counts compared between them). */
  episodes?: number;
  /** Progress to start from: `firm` makes the level-1 words solid, so blends and digraphs come up. */
  progress?: 'firm' | 'all';
  /** Toggle dad lock in each room and check green does nothing. */
  dadLock?: boolean;
  /** Stand still for `IDLE_MS` at each choice first (the stick hint, the re-prompts). */
  idle?: boolean;
  /** A busy child (item 069): blue, red and yellow pressed all episode (free play's casts, yellow's replays). */
  mash?: boolean;
  quick?: boolean;
  /**
   * The batch it plays in, only with `QA_SET=<batch>` (or `all`); none: the first batch, the default.
   * `more` the second, added by the first hunt; `new` the third, by the second hunt (item 069);
   * `lenses` the fourth, by the third hunt (item 080); `recent` the fifth, by the fourth hunt
   * (item 089); `cast` the seventh hunt's (item 116): the new allies and villains, the story fight;
   * `hunt8` the eighth hunt's (item 125): items 119-123's changes; `hunt9` the ninth hunt's
   * (item 129): items 126-128's changes; `hunt10` the tenth's (item 135): items 130-134's;
   * `hunt11` the eleventh's (item 142): items 137-141's; `hunt12` the twelfth's (item 164): items 147-163's.
   */
  batch?: Batch;
  /** Item 080: reload the page at each of these points, one per episode started from the title. */
  reloadAt?: Point[];
  /** Item 080: switch the tab away and back every so often (Phaser's hidden and blur events). */
  hide?: boolean;
  /** Item 080: resize the window every so often. */
  resize?: boolean;
  /** Item 080: voice and art fetches slowed (`slow`), or some of them failing (`flaky`). */
  net?: 'slow' | 'flaky';
  /** Item 080: at every point, dad lock on, every button pressed, nothing may move; then off. */
  lockAll?: boolean;
  /** Item 080: at every point, the grown-ups page (F9) and back. */
  parentAll?: boolean;
  /** Item 089: minigame debug mode (key 0) at each of these points: a game from its pedestal, then 0 back; nothing may stay. */
  debugAt?: Point[];
  /** Item 089: every button, F2, F4 and F9 mashed at the recap and THE END before Dad's 2; only 2 may leave. */
  endMash?: boolean;
  /** Item 089: no voice manifest (a fresh checkout, a broken junction): captions only (item 082's M19). */
  voiceless?: boolean;
  /** Hunt 9: at each of these points, Dad erases all progress on the grown-ups page (F8 twice) and comes back. */
  eraseAt?: Point[];
  /** Hunt 8: Dad never presses in Charge the Spell, so it goes solo and stays solo for the session (M34). */
  dadAway?: boolean;
}

/** A scenario batch past the first, named as `QA_SET` names it. */
const BATCHES = ['more', 'new', 'lenses', 'recent', 'cast', 'hunt8', 'hunt9', 'hunt10', 'hunt11', 'hunt12'] as const;
type Batch = (typeof BATCHES)[number];

/** Where in an episode the item-080 probes act (`episode` calls `at` at each). */
type Point = 'title' | 'bedroom' | 'entry' | 'hub1' | 'room_a' | 'room_b' | 'battle1' | 'choice1' | 'hub2' | 'attic' | 'choice2' | 'ending' | 'victory';

/** How long an idle scenario stands still at each choice (real ms; 5x that in game time). */
const IDLE_MS = 9000;

const SCENARIOS: Scenario[] = [
  { name: 'default', query: 'cast=default', quick: true },
  { name: 'seed101', query: 'seed=101&games=all', quick: true },
  { name: 'wrong_seed102', query: 'seed=102&games=all', wrong: true, quick: true },
  { name: 'seed103', query: 'seed=103&games=all' },
  { name: 'seed104', query: 'seed=104&games=all' },
  { name: 'chef_cookoff', query: 'seed=105&ally=dada_jason&villain=smaug&fight=cook_off&games=all' },
  { name: 'knight_race', query: 'seed=106&ally=dada_jason_warrior&villain=smaug&fight=sky_race' },
  { name: 'lifter_tug', query: 'seed=107&ally=dada_matt_lifter&villain=jormungandr&fight=sea_tug&games=all' },
  { name: 'cyber_clash', query: 'seed=108&ally=dada_matt_cyber&villain=bavmorda&fight=spell_clash', dadLock: true },
  { name: 'scar_brawl', query: 'seed=109&ally=scar&villain=tiamat&fight=brawl&games=all' },
  { name: 'noally_warlock', query: 'seed=110&ally=none&villain=dada_jason_warlock&primary=dada_matt&secondary=1' },
  { name: 'blade_machine', query: 'seed=111&ally=dada_matt_blade&villain=bavmorda&game=word_machine', wrong: true },
  { name: 'firm_blends', query: 'seed=112&games=all', progress: 'firm' },
  { name: 'all_solid', query: 'seed=113&games=all', progress: 'all' },
  { name: 'soak3', query: 'seed=114&games=all', episodes: 3 },
  // The second batch (item 039): the other places and forms, an idle child, more random casts.
  { name: 'idle_default', query: 'cast=default', idle: true, batch: 'more' },
  { name: 'builder_treehouse', query: 'seed=201&ally=dada_matt&villain=bavmorda&games=all', batch: 'more' },
  { name: 'warlock_ally', query: 'seed=202&ally=dada_jason_warlock&villain=jormungandr', batch: 'more' },
  { name: 'ellie_home_race', query: 'seed=203&ally=ellie&villain=smaug&place=home&fight=sky_race&games=all', batch: 'more' },
  { name: 'scar_wrong_clash', query: 'seed=204&ally=scar&villain=bavmorda&fight=spell_clash', wrong: true, batch: 'more' },
  { name: 'jason_wakes', query: 'seed=205&ally=scar&villain=tiamat&primary=dada_jason&secondary=1&games=all', batch: 'more' },
  { name: 'machine_solid', query: 'seed=206&game=word_machine', progress: 'all', batch: 'more' },
  { name: 'seed207', query: 'seed=207&games=all', batch: 'more' },
  { name: 'seed208', query: 'seed=208&games=all', batch: 'more' },
  { name: 'seed209', query: 'seed=209&games=all', wrong: true, batch: 'more' },
  // Charge the Spell (item 053): every `games=all` scenario meets it too (FORCE_PHONICS_ROOM); this one with Dad's no first.
  { name: 'charge_no_first', query: 'seed=115&room=charge', wrong: true, batch: 'more' },
  // The Stretchy Bridge (item 054): half the `games=all` scenarios meet it; this one with a wrong picture first.
  { name: 'bridge_wrong_first', query: 'seed=116&room=bridge', wrong: true, batch: 'more' },
  // The Shape-Shifter (item 096): about half the `games=all` scenarios meet it behind door b (SHIFTER_ROOM); this one with a wrong pick first.
  { name: 'shifter_wrong_first', query: 'seed=117&room=shifter', wrong: true, batch: 'more' },
  // The rhyme room (item 139): behind door b in some drawn episodes; this one with a wrong picture first.
  { name: 'rhyme_wrong_first', query: 'seed=118&room=rhyme', wrong: true, batch: 'more' },
  // The second hunt (item 069): free play under a busy child, the difficulty levels above base
  // (item 067), the phonics rooms answered right, and a real draw across episodes (rotations).
  { name: 'mash_default', query: 'cast=default&games=all', mash: true, batch: 'new' },
  { name: 'mash_wrong_seed301', query: 'seed=301&games=all', mash: true, wrong: true, batch: 'new' },
  { name: 'diff2_firm', query: 'seed=302&games=all&difficulty=2', progress: 'firm', batch: 'new' },
  { name: 'diff3_solid', query: 'seed=303&games=all&difficulty=3', progress: 'all', batch: 'new' },
  { name: 'diff3_wrong', query: 'seed=304&games=all&difficulty=3', progress: 'firm', wrong: true, batch: 'new' },
  { name: 'charge_yes', query: 'seed=305&room=charge', batch: 'new' },
  { name: 'bridge_diff3', query: 'seed=306&room=bridge&difficulty=3', progress: 'firm', batch: 'new' },
  { name: 'drawn4', query: 'cast=random&games=all', episodes: 4, batch: 'new' },
  // The third hunt (item 080): the lenses the first two never ran. Reloading mid-flow, a
  // hidden tab and a resized window, a slow or failing network, and dad lock and the
  // grown-ups page at every step of an episode. URL flags and dev keys: `qa flags`, `qa devkeys`.
  { name: 'reload_points', query: 'seed=401&games=all', reloadAt: ['bedroom', 'room_a', 'choice1', 'hub2', 'ending'], batch: 'lenses' },
  { name: 'hidden_tab', query: 'seed=402&games=all', hide: true, batch: 'lenses' },
  { name: 'resize', query: 'seed=403&games=all', resize: true, batch: 'lenses' },
  { name: 'slow_net', query: 'cast=random&games=all', net: 'slow', batch: 'lenses' },
  { name: 'flaky_net', query: 'seed=404&games=all', net: 'flaky', batch: 'lenses' },
  { name: 'lock_all', query: 'seed=405&games=all', lockAll: true, batch: 'lenses' },
  { name: 'parent_all', query: 'seed=406&games=all', parentAll: true, batch: 'lenses' },
  { name: 'parent_none', query: 'seed=406&games=all', batch: 'lenses' },
  // Item 089, the recent changes (items 081-088): debug mode, THE END, line variants, no voice manifest.
  { name: 'debug_rooms', query: 'seed=501&games=all', debugAt: ['entry', 'hub1', 'room_a', 'room_b', 'hub2', 'attic'], batch: 'recent' },
  { name: 'end_mash', query: 'seed=502&games=all', episodes: 2, endMash: true, batch: 'recent' },
  { name: 'variants6', query: 'cast=random&games=all', episodes: 6, batch: 'recent' },
  { name: 'voiceless', query: 'seed=503&games=all', voiceless: true, batch: 'recent' },
  // Item 116, the cast's growth (items 111, 114, 115) and the story fight (item 107): each new
  // ally once, against each new villain and their own fights, and Evil Smaug's story fight.
  { name: 'seraphina_frost', query: 'seed=601&ally=seraphina&villain=elsa&games=all', batch: 'cast' },
  { name: 'elsa_space', query: 'seed=602&ally=elsa&villain=ozymandias&games=all', batch: 'cast' },
  { name: 'anna_magic', query: 'seed=603&ally=anna&villain=moriarty&games=all', wrong: true, batch: 'cast' },
  { name: 'jasmine_story', query: 'seed=604&ally=jasmine&fight=smaug_story&games=all', batch: 'cast' },
  { name: 'ozy_tiamat', query: 'seed=605&ally=ozymandias&villain=tiamat&games=all', batch: 'cast' },
  { name: 'moriarty_jorm', query: 'seed=606&ally=moriarty&villain=jormungandr&games=all', batch: 'cast' },
  { name: 'rilla_story_wrong', query: 'seed=607&ally=rilla&fight=smaug_story&games=all', wrong: true, mash: true, batch: 'cast' },
  { name: 'drawn_cast3', query: 'cast=random&games=all', episodes: 3, batch: 'cast' },
  // Hunt 8 (item 125): item 121's new words leaned to, Charge solo across the session and the
  // Shape-Shifter's chain rotation (item 119), the story fight with a dad's outfit and a tall ally.
  { name: 'newwords3', query: 'cast=random&games=all&words=new', episodes: 3, batch: 'hunt8' },
  { name: 'charge_solo3', query: 'seed=701&room=charge', episodes: 3, dadAway: true, batch: 'hunt8' },
  { name: 'shifter5', query: 'cast=random&room=shifter', episodes: 5, batch: 'hunt8' },
  { name: 'warrior_story', query: 'seed=702&ally=dada_jason_warrior&fight=smaug_story&games=all', batch: 'hunt8' },
  { name: 'moriarty_story_wrong', query: 'seed=703&ally=moriarty&fight=smaug_story&games=all', wrong: true, batch: 'hunt8' },
  // Hunt 9 (item 129): items 126-128's changes. Door b drawn (the Shape-Shifter about half the episodes,
  // a sentence frame or the word machine otherwise); Smaug's story fight drawn, not forced (seeds 976
  // and 965 draw him with it from the title: warlock Dada Jason and cyber Dada Matt are the dads in it);
  // item 126's COW, MOM and DAD leaned to; item 128's banners on the widest sentences.
  { name: 'doorb5', query: 'cast=random&games=all', episodes: 5, batch: 'hunt9' },
  { name: 'story_drawn_scar', query: 'seed=976&games=all', batch: 'hunt9' },
  { name: 'story_drawn_elsa_wrong', query: 'seed=965&games=all', wrong: true, batch: 'hunt9' },
  { name: 'newwords3_126', query: 'cast=random&games=all&words=cow,mom,dad', episodes: 3, batch: 'hunt9' },
  { name: 'widest_counter', query: 'seed=951&games=all&sentence=no_match_for_the:octopus', batch: 'hunt9' },
  // A long run (about 15 minutes): ten drawn episodes back to back, for growth, repeats and the door-b rotation.
  { name: 'drawn10', query: 'cast=random&games=all', episodes: 10, batch: 'hunt9' },
  // Odd input on the story fight: the grown-ups page, dad lock and reloads at every point. Forced: a seed's
  // draw does not survive them (back from F9 at the title, or reloaded, the title draws the cast again).
  { name: 'story_parent', query: 'seed=976&fight=smaug_story&games=all', parentAll: true, batch: 'hunt9' },
  { name: 'story_lock', query: 'seed=976&fight=smaug_story&games=all', lockAll: true, batch: 'hunt9' },
  { name: 'story_reload', query: 'seed=976&fight=smaug_story&games=all', reloadAt: ['choice1', 'hub2', 'choice2'], batch: 'hunt9' },
  { name: 'story_hidden', query: 'seed=977&fight=smaug_story&games=all', hide: true, resize: true, batch: 'hunt9' },
  // Dad erases all progress mid-episode (a side room, battle 1's choice, the attic), then a second episode on the empty store.
  { name: 'erase_mid', query: 'cast=random&games=all', eraseAt: ['room_b', 'choice1', 'attic'], episodes: 2, batch: 'hunt9' },
  // Hunt 10 (item 135): items 130-134's changes. Drawn episodes after item 132's cleanup and item 133's
  // seeded house draws; the Shape-Shifter's relaxed chains and level-1 lifted letter (M39, M42) with wrong
  // picks; RUN and CAN readable (M40); MOM and DAD off the fetch frames (M41); every fight style item 132
  // tidied (race, tug, cook-off, clash, the story fight), with wrong picks or a busy child.
  { name: 'drawn5_h10', query: 'cast=random&games=all', episodes: 5, batch: 'hunt10' },
  { name: 'shifter_wrong3', query: 'cast=random&room=shifter', wrong: true, episodes: 3, batch: 'hunt10' },
  { name: 'runcan2', query: 'cast=random&games=all&words=run,can', episodes: 2, batch: 'hunt10' },
  { name: 'momdad2', query: 'cast=random&games=all&words=mom,dad', episodes: 2, batch: 'hunt10' },
  { name: 'race_wrong', query: 'seed=1001&fight=space_race&games=all', wrong: true, batch: 'hunt10' },
  { name: 'tug_mash', query: 'seed=1002&fight=sea_tug&games=all', mash: true, batch: 'hunt10' },
  { name: 'cookoff_wrong', query: 'seed=1003&fight=cook_off&games=all', wrong: true, batch: 'hunt10' },
  { name: 'clash_idle', query: 'seed=1004&fight=frost_clash&games=all', idle: true, batch: 'hunt10' },
  { name: 'story_mash_wrong', query: 'seed=1005&fight=smaug_story&games=all', wrong: true, mash: true, batch: 'hunt10' },
  // Hunt 11 (item 142): items 137-141's changes. Strict game rotation and sounds-only clues (137) over
  // drawn episodes; the per-story gift spots and the word machine's slot (138); the rhyme room (139) right,
  // wrong, idle and mashed; Charge's sounds up front and two words (140), with Dad and without; Bluerilla
  // as ally and as villain; and the battle after item 141's split in a brawl and the story fight.
  { name: 'drawn5_h11', query: 'cast=random&games=all', episodes: 5, batch: 'hunt11' },
  { name: 'rhyme_wrong3', query: 'cast=random&room=rhyme', wrong: true, episodes: 3, batch: 'hunt11' },
  { name: 'rhyme_idle', query: 'seed=1101&room=rhyme', idle: true, batch: 'hunt11' },
  { name: 'rhyme_mash', query: 'seed=1102&room=rhyme', mash: true, batch: 'hunt11' },
  { name: 'charge2_yes', query: 'seed=1103&room=charge', episodes: 2, batch: 'hunt11' },
  { name: 'charge2_no', query: 'seed=1104&room=charge', wrong: true, batch: 'hunt11' },
  { name: 'charge2_solo', query: 'seed=1105&room=charge', episodes: 2, dadAway: true, batch: 'hunt11' },
  { name: 'machine_wrong', query: 'seed=1106&game=word_machine', wrong: true, batch: 'hunt11' },
  { name: 'rilla_ally', query: 'seed=1107&ally=rilla&games=all', wrong: true, batch: 'hunt11' },
  { name: 'rilla_villain', query: 'seed=1108&villain=rilla&fight=brawl&games=all', mash: true, batch: 'hunt11' },
  { name: 'story_wrong_h11', query: 'seed=1109&fight=smaug_story&games=all', wrong: true, batch: 'hunt11' },
  { name: 'rhyme_lock', query: 'seed=1110&room=rhyme', lockAll: true, batch: 'hunt11' },
  { name: 'rhyme_parent', query: 'seed=1111&room=rhyme', parentAll: true, batch: 'hunt11' },
  { name: 'rhyme_reload', query: 'seed=1112&room=rhyme', reloadAt: ['room_a', 'hub2'], batch: 'hunt11' },
  { name: 'rhyme_debug', query: 'seed=1113&room=rhyme', debugAt: ['room_a', 'hub1'], batch: 'hunt11' },
  { name: 'charge_parent', query: 'seed=1114&room=charge', parentAll: true, batch: 'hunt11' },
  { name: 'charge_reload', query: 'seed=1115&room=charge', reloadAt: ['room_a'], batch: 'hunt11' },
  // The end of hunt 11's completeness read: the new rooms under the lenses no scenario forced them into.
  { name: 'rhyme_voiceless', query: 'seed=1116&room=rhyme', voiceless: true, batch: 'hunt11' },
  { name: 'charge_slow_net', query: 'seed=1117&room=charge', net: 'slow', batch: 'hunt11' },
  { name: 'rhyme_flaky_net', query: 'seed=1118&room=rhyme', net: 'flaky', hide: true, resize: true, batch: 'hunt11' },
  { name: 'charge_debug', query: 'seed=1119&room=charge', debugAt: ['room_a', 'hub1'], batch: 'hunt11' },
  // Hunt 12 (item 164): items 147-163's changes. F's whole "fuh" on the Stretchy Bridge (162) right, wrong, at
  // difficulty 2, through debug mode, the grown-ups page and a flaky net; the Shape-Shifter's new draw and words
  // (157) and the rhyme room's redraws over drawn episodes; TAP and EGG read in Charge (156); Evil Elsa's summon
  // and Comet Crash (156); the giants' edge clamp under knockback (155); voice priority and boot on a slow net (150).
  { name: 'drawn5_h12', query: 'cast=random&games=all', episodes: 5, batch: 'hunt12' },
  { name: 'bridge_f', query: 'seed=1201&room=bridge&bridge=fan,fox', episodes: 2, batch: 'hunt12' },
  { name: 'bridge_f_wrong', query: 'seed=1202&room=bridge&bridge=frog,flag', wrong: true, batch: 'hunt12' },
  { name: 'bridge_f_d2', query: 'seed=1203&room=bridge&bridge=fox,fish&difficulty=2', progress: 'firm', batch: 'hunt12' },
  { name: 'bridge_f_debug', query: 'seed=1204&room=bridge&bridge=fan,gift', debugAt: ['room_a', 'hub1'], batch: 'hunt12' },
  { name: 'bridge_f_parent', query: 'seed=1205&room=bridge&bridge=fox,fan', parentAll: true, batch: 'hunt12' },
  { name: 'bridge_f_flaky', query: 'seed=1206&room=bridge&bridge=elf,frog', net: 'flaky', mash: true, batch: 'hunt12' },
  { name: 'shifter5_h12', query: 'cast=random&room=shifter', episodes: 5, batch: 'hunt12' },
  { name: 'shifter_wrong_h12', query: 'seed=1207&room=shifter', wrong: true, episodes: 2, batch: 'hunt12' },
  { name: 'shifter_lock', query: 'seed=1208&room=shifter', lockAll: true, batch: 'hunt12' },
  { name: 'rhyme3_h12', query: 'cast=random&room=rhyme', episodes: 3, batch: 'hunt12' },
  { name: 'tap_egg', query: 'seed=1209&room=charge&words=tap,egg', episodes: 2, batch: 'hunt12' },
  { name: 'elsa_summon', query: 'seed=1210&villain=elsa&games=all', mash: true, batch: 'hunt12' },
  { name: 'elsa_summon_wrong', query: 'seed=1211&villain=elsa&fight=brawl&games=all', wrong: true, batch: 'hunt12' },
  { name: 'ozy_comet', query: 'seed=1212&villain=ozymandias&games=all', batch: 'hunt12' },
  { name: 'ozy_comet_brawl', query: 'seed=1213&villain=ozymandias&fight=brawl&games=all', mash: true, batch: 'hunt12' },
  { name: 'tiamat_edge', query: 'seed=1214&villain=tiamat&fight=brawl&games=all', mash: true, batch: 'hunt12' },
  { name: 'jorm_edge', query: 'seed=1215&villain=jormungandr&fight=brawl&games=all', wrong: true, batch: 'hunt12' },
  { name: 'jasmine_slow', query: 'seed=1216&ally=jasmine&games=all', net: 'slow', batch: 'hunt12' },
  // One episode each for a real-speed run (WW_SPEED=1): item 144's pacing (Charge, the rhyme room, M65's two-pad sea tug).
  { name: 'tug_two_pads', query: 'seed=1217&fight=sea_tug&games=all', batch: 'hunt12' },
  { name: 'charge_real', query: 'seed=1218&room=charge', batch: 'hunt12' },
  { name: 'rhyme_real', query: 'seed=1219&room=rhyme', batch: 'hunt12' },
  // Hunt 12's later rounds: odd input on the F bridge and the Shape-Shifter, and a long run.
  { name: 'bridge_f_hidden', query: 'seed=1220&room=bridge&bridge=fox,frog', hide: true, resize: true, batch: 'hunt12' },
  { name: 'bridge_f_reload', query: 'seed=1221&room=bridge&bridge=fan,flag', reloadAt: ['room_a', 'hub2'], batch: 'hunt12' },
  { name: 'bridge_f_lock', query: 'seed=1222&room=bridge&bridge=fish,elf', lockAll: true, batch: 'hunt12' },
  { name: 'bridge_f_voiceless', query: 'seed=1223&room=bridge&bridge=fan,fox', voiceless: true, batch: 'hunt12' },
  { name: 'bridge_f_d3', query: 'seed=1224&room=bridge&bridge=frog,gift&difficulty=3', progress: 'firm', wrong: true, batch: 'hunt12' },
  { name: 'shifter_hidden', query: 'seed=1225&room=shifter', hide: true, resize: true, mash: true, batch: 'hunt12' },
  { name: 'drawn8_h12', query: 'cast=random&games=all', episodes: 8, batch: 'hunt12' },
  // Hunt 12's completeness read: this hunt's choice fixes on the other stages, the giants on the heroes' side and on
  // moving stages, the Shape-Shifter and the rhyme room under the lenses they had not had, the end screens, TAP and EGG.
  { name: 'elsa_cookoff', query: 'seed=1240&villain=elsa&fight=cook_off&games=all', mash: true, batch: 'hunt12' },
  { name: 'elsa_skyrace_wrong', query: 'seed=1241&villain=elsa&fight=sky_race&games=all', wrong: true, batch: 'hunt12' },
  { name: 'warlock_magic', query: 'seed=1242&villain=dada_jason_warlock&fight=magic_show&games=all', mash: true, batch: 'hunt12' },
  { name: 'story_h12', query: 'seed=1243&fight=smaug_story&games=all', wrong: true, mash: true, batch: 'hunt12' },
  { name: 'tiamat_ally', query: 'seed=1244&ally=tiamat&villain=bavmorda&games=all', batch: 'hunt12' },
  { name: 'tiamat_ally_tug', query: 'seed=1245&ally=tiamat&fight=sea_tug&games=all', mash: true, batch: 'hunt12' },
  { name: 'tiamat_race', query: 'seed=1246&villain=tiamat&fight=space_race&games=all', resize: true, batch: 'hunt12' },
  { name: 'tiamat_cook', query: 'seed=1247&villain=tiamat&fight=cook_off&games=all', batch: 'hunt12' },
  { name: 'shifter_reload', query: 'seed=1250&room=shifter', reloadAt: ['room_a', 'hub2'], batch: 'hunt12' },
  { name: 'shifter_parent', query: 'seed=1251&room=shifter', parentAll: true, batch: 'hunt12' },
  { name: 'shifter_debug', query: 'seed=1252&room=shifter', debugAt: ['room_a', 'hub1'], batch: 'hunt12' },
  { name: 'shifter_idle', query: 'seed=1253&room=shifter', idle: true, batch: 'hunt12' },
  { name: 'shifter_d3', query: 'seed=1254&room=shifter&difficulty=3', progress: 'firm', wrong: true, batch: 'hunt12' },
  { name: 'shifter_voiceless', query: 'seed=1255&room=shifter', voiceless: true, batch: 'hunt12' },
  { name: 'rhyme_wrong_h12', query: 'cast=random&room=rhyme', wrong: true, episodes: 2, batch: 'hunt12' },
  { name: 'rhyme_d2', query: 'seed=1256&room=rhyme&difficulty=2', progress: 'firm', batch: 'hunt12' },
  { name: 'end_mash_h12', query: 'seed=1257&games=all', episodes: 2, endMash: true, batch: 'hunt12' },
  { name: 'tap_egg_all', query: 'cast=random&games=all&words=tap,egg', episodes: 3, batch: 'hunt12' },
  { name: 'charge_solo_h12', query: 'seed=1259&room=charge&words=tap,egg', episodes: 2, dadAway: true, batch: 'hunt12' },
];

/** How often a busy child presses something (real ms). */
const MASH_MS = 650;

/** Every level-1 word solid (`firm`), or every word (`all`): six right first tries each. */
function seededProgress(kind: 'firm' | 'all'): Partial<ProgressData> {
  const stat = { seen: 6, right: 6, wrong: 0, recent: [true, true, true, true, true, true], last: 1 };
  const words = Object.fromEntries(BANK.filter((w) => kind === 'all' || w.level === 1).map((w) => [w.word, stat]));
  return { words, episodes: 6 };
}

/** The recorder: polls state beside the driver, shoots at meaningful moments, runs the checks. */
class Recorder {
  issues = new Map<string, Issue & { count: number }>();
  shots = 0;
  private running = true;
  private loop: Promise<void>;
  private sig = { scene: '', voice: '', round: '', phase: '', choice: '', said: 0, recap: 0, ult: 0 };
  private roundStart = 0;
  /** The move choices already checked for a pad in her reach (`padReachIssues`). */
  private padsSeen = new Set<string>();
  private fightersSeen = new Set<string>();
  /** The room's spots at the last poll (`spawnIssues`). */
  private spotIds = new Set<string>();
  private spotRound = '';
  private qaT = 0;
  last: WWState | null = null;
  lastShot = '';
  /** The episode's victory scene and fight style, kept as they pass (the variety check, item 069). */
  endingId = '';
  fight = '';
  /** Free play's shots in the scene with the most (a mash scenario reports that its presses landed). */
  shotsFired = 0;
  /** Each scene's visits, real ms (item 059's pacing check); `wrong` when the scenario answers wrong on purpose. */
  private visit = { scene: '', at: 0, solo: false };
  visits: { scene: string; ms: number; wrong: boolean; solo: boolean }[] = [];
  wrong = false;
  /** No voice manifest on purpose (`voiceless`, M19): every line is a caption with no clip, so `voice-silent ... (none)` is the point, not an issue. */
  voiceless = false;
  constructor(
    private readonly page: Page,
    private readonly dir: string,
    private readonly max = 400,
  ) {
    mkdirSync(dir, { recursive: true });
    this.loop = this.run();
  }

  add(list: Issue[], shot?: string): void {
    for (const i of list) {
      if (this.voiceless && i.kind === 'voice-silent' && /\(none\)/.test(i.detail)) continue;
      const have = this.issues.get(i.key);
      if (have) have.count++;
      else this.issues.set(i.key, { ...i, ...(shot ? { shot } : {}), count: 1 });
    }
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        await this.tick();
      } catch {
        // The page is navigating or gone: try again.
      }
      await this.page.waitForTimeout(90);
    }
  }

  private async tick(): Promise<void> {
    const s = await state(this.page);
    this.last = s;
    if (s.ending?.id) this.endingId = s.ending.id;
    if (s.battle?.fight) this.fight = s.battle.fight;
    // Free play (item 060): never more live shots than the cap.
    const play = s.play;
    if (play) {
      this.shotsFired = Math.max(this.shotsFired, play.shots);
      if (play.maxLive > FREE_PLAY.maxShots) this.add([{ kind: 'shots-over-cap', severity: 'bug', scene: s.scene, detail: `${play.maxLive} live shots (cap ${FREE_PLAY.maxShots})`, key: `shotcap:${s.scene}` }], this.lastShot);
    }
    const q = await qaSince(this.page, this.qaT);
    this.qaT = q.now;
    // Every spot seen this round: one coming back (the word machine's wrong tile, back in the slot she
    // took it from, under her) is not new (hunt 10, `story_mash_wrong`).
    const round = `${s.scene}:${s.room?.round ?? ''}`;
    if (round !== this.spotRound) this.spotIds = new Set();
    this.spotRound = round;
    this.add(spawnIssues(this.spotIds, s, REACH), this.lastShot);
    this.add(padReachIssues(this.padsSeen, s, REACH), this.lastShot);
    // Hunt 12: a fighter off the screen, or come over a pad in a choice: shot as it is seen.
    const fighters = fighterIssues(this.fightersSeen, s, GAME_WIDTH);
    if (fighters.length) {
      await this.capture(`fighter_${fighters[0]!.kind}`);
      this.add(fighters, this.lastShot);
    }
    for (const sp of s.room?.spots ?? []) this.spotIds.add(sp.id);
    this.add(logIssues({ ...q, console: [], missingArt: [], flashes: [] }, SPEED));
    this.add(clippedIssues(q.voice));
    this.add(letterNameIssues(q.voice));
    if (s.scene !== this.visit.scene) {
      if (this.visit.scene) this.visits.push({ scene: this.visit.scene, ms: (Date.now() - this.visit.at) * SPEED, wrong: this.wrong, solo: this.visit.solo });
      // Solo from the start of a visit (M38): Charge's own budget.
      this.visit = { scene: s.scene, at: Date.now(), solo: Boolean(s.episode?.solo) };
    }
    const sig = {
      scene: s.scene,
      voice: s.voice.speaking && !s.voice.speaking.startsWith('letter_') ? s.voice.speaking : this.sig.voice,
      round: s.room?.round ?? '',
      phase: s.battle ? `${s.battle.phase}` : '',
      choice: s.battle?.choice ? `${s.battle.choice.right}:${s.battle.choice.open}:${s.battle.choice.misses}` : '',
      said: s.ending?.said.length ?? 0,
      recap: s.recap.length,
      ult: (s.battle?.ultimates ?? 0) + (s.battle?.combos ?? 0) * 100,
    };
    const why = (Object.keys(sig) as (keyof typeof sig)[]).find((k) => sig[k] !== this.sig[k] && sig[k] !== '');
    if (sig.round !== this.sig.round) this.roundStart = q.now;
    this.sig = sig;
    if (!why) return;
    // A line: shoot a moment in, so the box and the karaoke are up.
    if (why === 'voice') await this.page.waitForTimeout(Math.max(120, 600 / SPEED));
    await this.capture(why === 'voice' ? `v_${sig.voice}` : `${why}_${String(sig[why]).replace(/[^\w-]+/g, '-').slice(0, 40)}`);
  }

  async capture(label: string): Promise<void> {
    const s = await state(this.page);
    const l = await qaLayout(this.page);
    const q = await qaSince(this.page, 0);
    let shot: string | undefined;
    if (this.shots < this.max) {
      this.shots++;
      shot = `${this.dir}/${String(this.shots).padStart(3, '0')}_${s.scene}_${label}.png`;
      // Bounded (hunt 9): the config sets no action timeout, so a screenshot that never got its frame waited forever.
      await serial(this.page, () => this.page.screenshot({ path: shot, timeout: 20_000 })).catch(() => undefined);
      this.lastShot = shot;
    }
    // A picked picture pops up as its word is said (hunt 7, W33): the answer is made, so its brush
    // with the banner or a box is not a covered target.
    // The shot's own label too (hunt 8): a moment in, the bus can be between the line's queue and its start.
    const said = s.voice.speaking?.startsWith('word_') ? s.voice.speaking.slice(5) : label.startsWith('v_word_') ? label.slice(7) : null;
    // The hub's circle under the story's own lines (hunt 8, W35: item 121's three-row lines) is W12's
    // ruling; the line sending her there keeps off it (`cover.spec`), so that one stays a bug.
    const story = s.scene === 'Hub' && /^hub_\w+_line\d$/.test(s.voice.speaking ?? '');
    // The entry hall once her pick is made (W33: "You got it! Now let's go out the door!" over the bottom row):
    // ruled, not a bug (hunt 9: every sweep flagged it again).
    const hallDone = s.scene === 'Entry' && (s.room?.round === 'entry:door' || /_grab_door$/.test(s.voice.speaking ?? '') || /grab_door$|entry-door$/.test(label));
    // The Shape-Shifter's next stones popping in under the praise box (W30): ruled too (hunt 9: flagged in every sweep).
    const praise = /_(right_\d+|shifter_fixed(_\d+)?)$/;
    const shifterPraise = s.scene === 'ShifterRoom' && (praise.test(s.voice.speaking ?? '') || praise.test(label));
    const layout = layoutIssues(l, s.scene, PLACEHOLDERS)
      .filter((i) => !(said && i.kind === 'target-covered' && i.detail.startsWith(`${said} `)))
      .map((i) => (story && i.kind === 'target-covered' && i.detail.startsWith('circle ') ? { ...i, kind: 'target-covered-ruled', severity: 'look' as const } : i))
      .map((i) => (hallDone && i.kind === 'target-covered' && i.detail.startsWith('grab_') ? { ...i, kind: 'target-covered-ruled', severity: 'look' as const } : i))
      .map((i) => (shifterPraise && i.kind === 'target-covered' && i.detail.startsWith('stone_') ? { ...i, kind: 'target-covered-ruled', severity: 'look' as const } : i))
      // W57 (hunt 12): the creature's word said as the next link's pictures pop in under its box, about a second.
      .map((i) => (s.scene === 'ShifterRoom' && i.kind === 'target-covered' && (said !== null) ? { ...i, kind: 'target-covered-ruled', severity: 'look' as const } : i));
    this.add(layout, shot);
    this.add(leakIssues(s, l, q.voice.filter((v) => v.t >= this.roundStart)), shot);
    this.add(spellingIssues(l, q.voice, s.scene), shot);
    // Words she has read, the warm-up's (said once she has grabbed it), and the gift word (item 092: told
    // and shown in the hub's story, its effect beside its card: FIN's fins): their pictures may wear them.
    // The Shape-Shifter's first creature (item 096) is said and labelled: shown, not read (hunt 6). The rhyme
    // room's two rhyming words (item 139) too: said, each on its card (`onCards`: the last round's stay up
    // under its praise while the hooks already name the next round's, hunt 11).
    // In a battle her fetched things too: read in the house, or put there by a `fetched=` boot (hunt 7: "THE BUN!").
    const done = [...s.episode.read, ...(s.scene === 'Battle' ? (s.episode.fetched ?? []) : []), ...(s.episode.grab && (s.scene !== 'Entry' || !['intro', 'find'].includes(s.room?.grab?.phase ?? 'intro')) ? [s.episode.grab.word] : []), ...(s.episode.gift ? [s.episode.gift] : []), ...(s.room?.shifter ? [s.room.shifter.start] : []), ...(s.room?.rhyme?.shown ?? []), ...(s.room?.rhyme?.onCards ?? [])];
    this.add(giveawayIssues(l, s.scene, done), shot);
  }

  /** After a reload (item 080): the probe's clock starts again from nothing. */
  reloaded(): void {
    this.qaT = 0;
    this.roundStart = 0;
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loop;
    this.add(pacingIssues(this.visits));
  }
}

/** How a scenario plays a room (`playRoom`): wrong first when asked, a beat after a wrong object, standing still at the key word when idle. */
const roomPlay = (sc: Scenario, idle = Boolean(sc.idle)): RoomPlay => ({ wrongFirst: Boolean(sc.wrong), wrongPauseMs: 400, idleMs: idle ? IDLE_MS : 0, dadAway: Boolean(sc.dadAway) });

/** An idle child: wait for the choice to be up, then stand still. */
async function standStill(page: Page, sc: Scenario, ready: (s: WWState) => boolean, what: string): Promise<void> {
  if (!sc.idle) return;
  await until(page, ready, 90_000, what);
  await page.waitForTimeout(IDLE_MS);
}

/**
 * A busy child (item 069): blue, red and yellow in turn every `MASH_MS`
 * beside the driver, all episode, until `stop()`. Never green: green is the
 * driver's (her answers), and a stray green near a thing would answer for her.
 */
function mash(page: Page): { stop(): Promise<void> } {
  let on = true;
  const loop = (async () => {
    for (let n = 0; on; n++) {
      const b = (['blue', 'red', 'yellow'] as const)[n % 3]!;
      // Yellow waits while the driver answers (`driver` in the harness).
      if (b !== 'yellow' || driver.busy === 0) await press(page, b).catch(() => undefined);
      await page.waitForTimeout(MASH_MS).catch(() => undefined);
    }
  })();
  return {
    stop: async () => {
      on = false;
      await loop;
    },
  };
}

/** What an episode drew, for the variety check across episodes (item 069). */
interface Drawn {
  ally: string | null;
  villain: string;
  fight: string;
  ending: string;
  games: string[];
  rooms: string[];
  words: string[];
}

/**
 * The Shape-Shifter's chains across a run (hunt 8; M36, item 119): `kept[i]` is the
 * store's `recent.chains` after episode i. An episode's new chain sharing a link
 * with the six kept before it, or the same as any kept, is `chain-repeat` (a look:
 * the rule gives way where the pool allows nothing else).
 */
function chainIssues(kept: string[][]): Issue[] {
  const out: Issue[] = [];
  const links = (c: string) => { const w = c.split(' '); return w.slice(1).map((x, i) => [w[i]!, x].sort().join('-')); };
  kept.forEach((now, i) => {
    const before = i ? kept[i - 1]! : [];
    if (now.join('|') === before.join('|')) return;
    const c = now.at(-1)!;
    const near = new Set(before.slice(-SHIFTER.recentChains).flatMap(links));
    const shared = links(c).filter((l) => near.has(l));
    if (before.includes(c)) out.push({ kind: 'chain-repeat', severity: 'look', scene: 'ShifterRoom', detail: `episode ${i + 1}'s chain ${c} is one the store kept`, key: `chain-repeat:${i}` });
    else if (shared.length) out.push({ kind: 'chain-repeat', severity: 'look', scene: 'ShifterRoom', detail: `episode ${i + 1}'s chain ${c} shares ${shared.join(', ')} with the last ${SHIFTER.recentChains}`, key: `chain-repeat:${i}` });
  });
  return out;
}

/** Charge solo lasts the session until Dad presses (M34, item 119): with Dad away, every episode ends solo (hunt 8). */
function soloIssues(solos: boolean[]): Issue[] {
  return solos.flatMap((on, i) => (on ? [] : [{ kind: 'solo-lost', severity: 'bug' as const, scene: '', detail: `episode ${i + 1} ended not solo, with no press from Dad all run`, key: `solo-lost:${i}` }]));
}

/**
 * Rotations across episodes (item 067, `src/rules/recent.ts`) in a real draw:
 * the villain, the victory scene and the house's rooms never the same as the
 * episode before; a key word read again within the run. Only for a scenario
 * whose URL forces none of them.
 */
function varietyIssues(eps: Drawn[]): Issue[] {
  const out: Issue[] = [];
  const add = (kind: string, severity: Issue['severity'], detail: string) => out.push({ kind, severity, scene: 'Victory', detail, key: `${kind}:${detail}` });
  for (let i = 1; i < eps.length; i++) {
    const [a, b] = [eps[i - 1]!, eps[i]!];
    const at = `episodes ${i} and ${i + 1}`;
    if (a.villain === b.villain) add('repeat', 'bug', `villain ${b.villain} in ${at}`);
    if (a.ending && a.ending === b.ending) add('repeat', 'bug', `victory scene ${b.ending} in ${at}`);
    if (a.ally && a.ally === b.ally) add('repeat', 'look', `ally ${b.ally} in ${at}`);
    if (a.rooms.join() === b.rooms.join()) add('repeat', 'look', `side rooms ${b.rooms.join(', ')} in ${at}`);
    const again = b.words.filter((w) => eps.slice(0, i).some((e) => e.words.includes(w)));
    if (again.length) add('repeat-word', 'look', `${again.join(', ')} read again in episode ${i + 1}`);
  }
  // Item 126 (SHIFTER_ROOM): the Shape-Shifter behind door b about half the time, seldom three running either way.
  for (let i = 2; i < eps.length; i++) {
    const had = eps.slice(i - 2, i + 1).map((e) => e.games.includes('shifter'));
    if (had.every((h) => h === had[0])) add('door-b-streak', 'look', `the Shape-Shifter ${had[0] ? 'in' : 'missing from'} episodes ${i - 1} to ${i + 1}`);
  }
  return out;
}

/**
 * Dad lock (item 038) in a room: lock, press green and yellow, check the round
 * and the room did not move, unlock. Returns an issue when a press got through.
 */
async function dadLockProbe(page: Page, rec: Recorder): Promise<void> {
  const before = await until(page, (st) => Boolean(st.room && !st.room.locked), 60_000, 'room listening');
  await page.keyboard.press('Backquote');
  await rec.capture('dadlock_on');
  for (let i = 0; i < 3; i++) {
    await press(page, 'green');
    await press(page, 'yellow');
    await page.waitForTimeout(400);
  }
  const after = await state(page);
  if (after.scene !== before.scene || after.room?.round !== before.room?.round || after.room?.sentence?.index !== before.room?.sentence?.index) {
    rec.add([{ kind: 'dadlock-leak', severity: 'bug', scene: before.scene, detail: `a press got through the dad lock: ${before.room?.round} -> ${after.room?.round}`, key: `dadlock:${before.scene}` }], rec.lastShot);
  }
  await page.keyboard.press('Backquote');
}

/** Whether the episode stops at every point for a probe (items 080, 089). */
const probing = (sc: Scenario) => Boolean(sc.lockAll || sc.parentAll || sc.reloadAt || sc.debugAt || sc.eraseAt);

/** The games debug mode offers (item 086), taken in turn by the debug probe. */
const DEBUG_GAMES = ['sentence', 'word_machine', 'charge', 'bridge', 'shifter', 'rhyme'] as const;

/**
 * Item 089: minigame debug mode at a point. Key 0, a game from its pedestal
 * played through (it must come back checked off), key 0 back to the room; the
 * store and the episode must be as they were, and the DEBUG tag gone.
 */
async function debugProbe(page: Page, rec: Recorder, p: Point, game: (typeof DEBUG_GAMES)[number], log: Record<string, unknown>[]): Promise<void> {
  const before = await state(page);
  const was = await store(page);
  const ep = (s: WWState) => JSON.stringify([s.episode.read, s.episode.fetched, s.episode.house.done, s.episode.stepIndex]);
  const tag = () => debugTagShown(page);
  const bug = (kind: string, detail: string) => rec.add([{ kind, severity: 'bug', scene: before.scene, detail: `${p}: ${detail}`, key: `${kind}:${p}` }], rec.lastShot);
  await page.keyboard.press('Digit0');
  await until(page, (s) => s.scene === 'Debug' && (s.room?.spots.length ?? 0) > 0 && !s.room!.locked, 30_000, `the debug room from ${p}`);
  await rec.capture(`debug_${p}`);
  if (!(await tag())) bug('debug-tag', 'no DEBUG tag in the debug room');
  await choose(page, `debug:${game}`);
  await until(page, (s) => s.scene !== 'Debug' && s.scene !== 'Wait', 30_000, `${game} from its pedestal`);
  await playRoom(page, {});
  const d = await until(page, (s) => s.scene === 'Debug' && Boolean(s.room?.debug) && !s.room!.locked, 60_000, `back in the debug room after ${game}`);
  await rec.capture(`debug_done_${game}`);
  if (!d.room!.debug!.done.includes(game)) bug('debug-check', `${game} played through but its pedestal has no check (${d.room!.debug!.done.join(', ')})`);
  await page.keyboard.press('Digit0');
  const back = await until(page, (s) => s.scene !== 'Debug' && s.scene !== 'Wait' && Boolean(s.room?.player), 30_000, `back from debug to ${p}`);
  await page.waitForTimeout(500);
  const now = await store(page);
  const changed = storeChanges(was, now);
  log.push({ point: p, game, scene: before.scene, back: back.scene, changed, episode: [ep(before), ep(back)] });
  if (back.scene !== before.scene) bug('debug-return', `key 0 back came to ${back.scene}`);
  // Item 092: the room key 0 brings back starts again and says its opening line's next variant, a look.
  if (onlyLineVariants(changed)) rec.add([{ kind: 'debug-restart-line', severity: 'look', scene: before.scene, detail: `${p}: the room back from debug said its opening line again: ${changed.join(', ')}`, key: `debugline:${p}` }], rec.lastShot);
  else if (changed.length) bug('debug-leak', `a debug ${game} changed ${changed.join(', ')}`);
  if (ep(back) !== ep(before)) bug('debug-leak', `a debug ${game} changed the episode: ${ep(before)} -> ${ep(back)}`);
  if (await tag()) bug('debug-tag', 'the DEBUG tag stayed after debug mode was off');
}

/**
 * Item 089: at the recap and THE END, every button, Dad's 1, dad lock and F9 and
 * back mashed before Dad's 2: nothing may leave THE END but 2, nothing may
 * change the store; then 2 to the title.
 */
async function endMash(page: Page, rec: Recorder, log: Record<string, unknown>[]): Promise<void> {
  await until(page, (s) => s.scene === 'Victory', 60_000, 'the recap');
  // During the recap: Dad's buttons and her own, which must not cut it short or skip THE END.
  for (const k of ['Digit2', 'Digit1', 'Digit0', 'Escape', 'Tab', 'Digit3']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(250);
  }
  const mid = await state(page);
  if (mid.scene !== 'Victory' && mid.scene !== 'TheEnd') rec.add([{ kind: 'end-leak', severity: 'bug', scene: 'Victory', detail: `a press during the recap left it for ${mid.scene}`, key: 'endleak:recap' }], rec.lastShot);
  if (mid.scene === 'Victory') await toTheEnd(page);
  await until(page, (s) => s.scene === 'TheEnd', 30_000, 'THE END');
  await rec.capture('theend');
  const was = await store(page);
  for (const k of ['Space', 'Enter', 'Tab', 'Escape', 'Digit3', 'Digit1', 'Digit0', 'ArrowLeft', 'ArrowUp', 'Backquote', 'Backquote', 'KeyA']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(300);
    const s = await state(page);
    if (s.scene !== 'TheEnd') {
      rec.add([{ kind: 'end-leak', severity: 'bug', scene: 'TheEnd', detail: `${k} left THE END for ${s.scene}`, key: `endleak:${k}` }], rec.lastShot);
      log.push({ key: k, left: s.scene });
      return;
    }
  }
  await page.keyboard.press('F9');
  await until(page, (s) => s.scene === 'Parent', 20_000, 'the grown-ups page from THE END');
  await page.waitForTimeout(600);
  await page.keyboard.press('F9');
  const back = await until(page, (s) => s.scene !== 'Parent' && s.scene !== 'Wait', 30_000, 'back from the grown-ups page to THE END');
  await page.waitForTimeout(500);
  await rec.capture('theend_after_f9');
  if (back.scene !== 'TheEnd') rec.add([{ kind: 'parent-return', severity: 'bug', scene: 'TheEnd', detail: `F9 and back from THE END came back to ${back.scene}`, key: 'parentback:theend' }], rec.lastShot);
  const now = await store(page);
  const changed = storeChanges(was, now);
  log.push({ point: 'theend', back: back.scene, changed });
  if (changed.length) rec.add([{ kind: 'end-store', severity: 'bug', scene: 'TheEnd', detail: `presses at THE END changed ${changed.join(', ')}`, key: 'endstore' }], rec.lastShot);
  if (back.scene === 'TheEnd') {
    await until(page, (s) => Boolean(s.theEnd?.dad), 30_000, "THE END's Dad cue");
    await page.keyboard.press('Digit2');
  }
  await until(page, (s) => s.scene === 'Title', 30_000, 'the title again');
}

/** One episode from the title's green to the victory recap; `at` runs the item-080 probes at each point. */
async function episode(page: Page, sc: Scenario, rec: Recorder, at: (p: Point) => Promise<void> = async () => undefined): Promise<void> {
  await until(page, (s) => s.scene === 'Title', 90_000, 'title');
  await page.waitForTimeout(500);
  await at('title');
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'bedroom');
  await standStill(page, sc, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door' && !s.room.locked, 'bedroom door');
  await at('bedroom');
  await leaveBedroom(page, { grab: false });
  await standStill(page, sc, (s) => s.scene === 'Entry' && s.room?.round === 'entry:find' && !s.room.locked, 'warm-up clue');
  await at('entry');
  await playEntry(page, sc.wrong ? 2 : 0);
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'circle offered');
  await at('hub1');
  await hubGo(page, 'circle');
  for (const door of ['door_a', 'door_b']) {
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors', 90_000, `${door} offered`);
    await standStill(page, sc, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors' && !s.room.locked, 'doors open');
    await hubGo(page, door);
    if ((sc.dadLock && door === 'door_a') || probing(sc)) {
      const s = await until(page, (st) => st.scene === 'SentenceRoom' || st.scene === 'WordMachine' || st.scene === 'ChargeRoom' || st.scene === 'BridgeRoom' || st.scene === 'ShifterRoom' || st.scene === 'RhymeRoom', 30_000, 'side room');
      if (s.scene === 'SentenceRoom') await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 90_000, 'read pass');
      else await until(page, (st) => Boolean(st.room && !st.room.locked), 60_000, 'room listening');
      if (sc.dadLock && door === 'door_a') await dadLockProbe(page, rec);
      await at(door === 'door_a' ? 'room_a' : 'room_b');
    }
    await playRoom(page, roomPlay(sc));
  }
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:front', 90_000, 'front door');
  await hubGo(page, 'door_front');
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 1');
  await page.waitForTimeout(1500);
  await at('battle1');
  await standStill(page, sc, (s) => Boolean(s.battle?.choice?.open), 'first move choice');
  if (probing(sc)) {
    await until(page, (s) => Boolean(s.battle?.choice?.open), 120_000, 'first move choice');
    await page.waitForTimeout(800);
    await at('choice1');
  }
  await playBattle(page, 1, Boolean(sc.wrong));
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret', 120_000, 'secret door');
  await at('hub2');
  await hubGo(page, 'door_counter');
  if (probing(sc)) {
    await until(page, (st) => st.scene === 'SentenceRoom' && st.room?.sentence?.pass === 'read' && !st.room.locked, 90_000, 'attic read pass');
    await at('attic');
  }
  // The attic: wrong first when asked, but no standing still at its key word.
  await playSentenceRoom(page, roomPlay(sc, false));
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:front', 90_000, 'front door again');
  await hubGo(page, 'door_front');
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 2');
  if (probing(sc)) {
    await until(page, (s) => Boolean(s.battle?.choice?.open), 120_000, 'battle 2 move choice');
    await page.waitForTimeout(800);
    await at('choice2');
  }
  await playBattle(page, 2, Boolean(sc.wrong));
  if (probing(sc)) {
    await until(page, (s) => s.scene === 'Ending' || s.scene === 'Victory', 120_000, 'victory scene');
    if ((await state(page)).scene === 'Ending') {
      await page.waitForTimeout(1500);
      await at('ending');
    }
  }
  await until(page, (s) => s.scene === 'Victory' && !s.voice.busy, 180_000, 'victory quiet');
  await page.waitForTimeout(800);
  await rec.capture('victory_end');
  await at('victory');
}

/** Where the episode stands, as far as a press could move it (item 080's dad lock probe). */
function where(s: WWState): string {
  const r = s.room;
  return JSON.stringify([s.scene, s.episode.stepIndex, r?.round, r?.sentence?.pass, r?.sentence?.index, r?.machine?.index, r?.machine?.phase, r?.grab?.phase, r?.grab?.misses, r?.charge?.read, r?.bridge?.index, r?.bridge?.misses, r?.shifter?.index, r?.shifter?.misses, r?.rhyme?.index, r?.rhyme?.misses, s.battle?.choice?.misses, s.battle?.movePicks, s.episode.read.length]);
}

/** Everything in the store, raw (item 080's reload probe compares it across a reload). */
const store = (page: Page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));


/**
 * The stall's shot, bounded (hunt 9: a reload at hub part 2 never came back, and the stall's own
 * `page.evaluate` then waited on the wedged page for the rest of the 30-minute timeout, so the
 * scenario never wrote its JSON). Past 20 s the stall is reported without its shot.
 */
async function stallShot(rec: Recorder): Promise<boolean> {
  return Promise.race([rec.capture('stall').then(() => true, () => true), new Promise<boolean>((done) => setTimeout(() => done(false), 20_000))]);
}

/** `p`, or `fallback` after `ms`: what the scenario still reads from a page that may be wedged (hunt 9). */
const bounded = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => Promise.race([p.catch(() => fallback), new Promise<T>((done) => setTimeout(() => done(fallback), ms))]);

/** The probe's log when the page no longer answers. */
const NO_SINCE: Since = { voice: [], locks: [], spikes: [], flashes: [], console: [], missingArt: [], frames: {}, now: 0 };

/** Thrown by the reload probe: the episode in play is gone, the next starts at the title. */
class Reloaded extends Error {}

/**
 * Item 080's probes at a point of an episode: dad lock (every button pressed
 * while locked, nothing may move, lines started while locked are listed), the
 * grown-ups page and back (the same scene, the store untouched), a reload
 * (the store the same after it, the game back at the title).
 */
function probes(page: Page, sc: Scenario, rec: Recorder, reloadAt: Point | null, log: Record<string, unknown>[]): (p: Point) => Promise<void> {
  let debugs = 0;
  return async (p) => {
    if (sc.debugAt?.includes(p)) await debugProbe(page, rec, p, DEBUG_GAMES[debugs++ % DEBUG_GAMES.length]!, log);
    if (sc.lockAll) {
      const before = await state(page);
      const t0 = (await qaSince(page, 0)).now;
      await page.keyboard.press('Backquote');
      for (const b of ['green', 'yellow', 'blue', 'red', 'green', 'yellow']) {
        await press(page, b);
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(2500);
      await rec.capture(`lock_${p}`);
      const after = await state(page);
      const said = (await qaSince(page, t0)).voice.map((v) => v.id);
      const badge = await page.evaluate(() => Boolean(document.getElementById('dad-lock')?.isConnected));
      log.push({ point: p, scene: before.scene, moved: where(after) !== where(before), before: where(before), after: where(after), said, badge });
      // The bedroom's wake-up, the warm-up's intro and the victory scene run on by themselves (W10): a look there.
      // So does the fight up to its frozen move choice (hunt 10): the choice opening, nothing picked, is not a press.
      const opened = Boolean(before.battle && !before.battle.choice && after.battle?.choice?.misses === 0 && after.battle.movePicks === before.battle.movePicks);
      const flows = p === 'bedroom' || p === 'entry' || p === 'ending' || opened;
      if (where(after) !== where(before)) rec.add([{ kind: flows ? 'dadlock-flow' : 'dadlock-leak', severity: flows ? 'look' : 'bug', scene: before.scene, detail: `${p}: ${where(before)} -> ${where(after)}`, key: `dadlock:${p}` }], rec.lastShot);
      if (!badge) rec.add([{ kind: 'dadlock-badge', severity: 'bug', scene: before.scene, detail: `${p}: no DAD LOCK badge while locked`, key: `dadbadge:${p}` }], rec.lastShot);
      await page.keyboard.press('Backquote');
    }
    if (sc.eraseAt?.includes(p)) {
      // Hunt 9: Dad erases all progress mid-episode (F9, F8 twice, back): the episode in play must go on.
      const before = await state(page);
      await page.keyboard.press('F9');
      await until(page, (s) => s.scene === 'Parent', 20_000, `the grown-ups page from ${p}`);
      await page.waitForTimeout(500);
      await page.keyboard.press('F8');
      await page.waitForTimeout(300);
      await page.keyboard.press('F8');
      await page.waitForTimeout(700);
      await rec.capture(`erase_${p}`);
      const erased = await state(page);
      await page.keyboard.press('F9');
      const back = await until(page, (s) => s.scene !== 'Parent' && s.scene !== 'Wait', 30_000, `back from erasing at ${p}`);
      log.push({ point: p, erased: true, scene: before.scene, back: back.scene, episodes: [before.progress.episodes, erased.progress.episodes] });
      if (back.scene !== before.scene) rec.add([{ kind: 'erase-return', severity: 'bug', scene: before.scene, detail: `${p}: erasing came back to ${back.scene}`, key: `eraseback:${p}` }], rec.lastShot);
    }
    if (sc.parentAll) {
      const before = await state(page);
      const was = await store(page);
      await page.keyboard.press('F9');
      await until(page, (s) => s.scene === 'Parent', 20_000, `the grown-ups page from ${p}`);
      await page.waitForTimeout(700);
      await rec.capture(`parent_${p}`);
      await page.keyboard.press('F9');
      const back = await until(page, (s) => s.scene !== 'Parent' && s.scene !== 'Wait', 30_000, `back from the grown-ups page to ${p}`);
      await page.waitForTimeout(500);
      const now = await store(page);
      const changed = storeChanges(was, now);
      log.push({ point: p, scene: before.scene, back: back.scene, changed });
      if (back.scene !== before.scene) rec.add([{ kind: 'parent-return', severity: 'bug', scene: before.scene, detail: `${p}: F9 and back came back to ${back.scene}`, key: `parentback:${p}` }], rec.lastShot);
      if (changed.length) rec.add([{ kind: 'parent-store', severity: 'look', scene: before.scene, detail: `${p}: the grown-ups page and back changed ${changed.join(', ')}`, key: `parentstore:${p}` }], rec.lastShot);
    }
    if (reloadAt === p) {
      await rec.capture(`reload_${p}`);
      // Read right before the reload: a live room (Charge's wait for Dad) records on its own meanwhile.
      const before = await state(page);
      const was = await store(page);
      // Bounded (hunt 7: one reload at hub part 2 never came back, and the scenario sat silent for its
      // whole 30-minute timeout; not seen again in a rerun): a hang is a stall with its shot.
      await page.reload({ timeout: 60_000 });
      await page.waitForFunction(() => Boolean((window as unknown as { __ww?: unknown }).__ww), undefined, { timeout: 60_000 });
      await page.mouse.click(20, 20);
      rec.reloaded();
      const s = await until(page, (st) => st.scene === 'Title', 60_000, `the title after reloading at ${p}`);
      const now = await store(page);
      const changed = storeChanges(was, now);
      log.push({ point: p, scene: before.scene, episodes: [before.progress.episodes, s.progress.episodes], bag: [before.progress.bag, s.progress.bag], changed, was, now });
      if (changed.length) rec.add([{ kind: 'reload-store', severity: 'look', scene: before.scene, detail: `${p}: a reload changed ${changed.join(', ')}`, key: `reloadstore:${p}` }]);
      throw new Reloaded(p);
    }
  };
}

/**
 * Item 080: the tab switched away and back every `HIDE_EVERY_MS` for `HIDE_MS`
 * (`setHidden`, the harness's: as a real tab switch tells the page).
 */
const HIDE_EVERY_MS = 9000;
const HIDE_MS = 2500;
function hider(page: Page): { stop(): Promise<void>; count: () => number } {
  let on = true;
  let n = 0;
  const set = (h: boolean) => setHidden(page, h).catch(() => undefined);
  const loop = (async () => {
    while (on) {
      await page.waitForTimeout(HIDE_EVERY_MS).catch(() => undefined);
      if (!on) break;
      await set(true);
      n++;
      await page.waitForTimeout(HIDE_MS).catch(() => undefined);
      await set(false);
    }
  })();
  return { stop: async () => ((on = false), await loop, await set(false)), count: () => n };
}

/** Item 080: the window resized every `RESIZE_EVERY_MS` through these sizes. */
const RESIZE_EVERY_MS = 7000;
const SIZES = [[800, 600], [1920, 1080], [640, 900], [1024, 768], [1366, 640], [1280, 720]] as const;
/**
 * One at a time per page (hunt 12, W61): a viewport change landing while a screenshot was in flight left the page
 * at the old size's metrics while Playwright shot at the new one, and a whole move choice came out at the last
 * window's fit. Screenshots and resizes queue here; a resize gives the game a beat to refit before the next shot.
 */
const pageQueues = new WeakMap<Page, Promise<unknown>>();
function serial<T>(page: Page, fn: () => Promise<T>): Promise<T> {
  const next = (pageQueues.get(page) ?? Promise.resolve()).then(fn, fn);
  pageQueues.set(page, next.catch(() => undefined));
  return next;
}

function resizer(page: Page): { stop(): Promise<void> } {
  let on = true;
  const loop = (async () => {
    for (let i = 0; on; i++) {
      await page.waitForTimeout(RESIZE_EVERY_MS).catch(() => undefined);
      const [width, height] = SIZES[i % SIZES.length]!;
      if (on) await serial(page, async () => (await page.setViewportSize({ width, height }), await page.waitForTimeout(150))).catch(() => undefined);
    }
  })();
  return { stop: async () => ((on = false), await loop, await page.setViewportSize({ width: 1280, height: 720 }).catch(() => undefined)) };
}

/** Item 080: voice and art fetches slowed by 0.3 to 1.5 s each (`slow`), or one in seven failing (`flaky`; never the voice manifest). */
async function network(page: Page, kind: 'slow' | 'flaky', log: { failed: string[] }): Promise<void> {
  let n = 0;
  await page.route(/\/(voice-gen|art)\//, async (route) => {
    n++;
    const url = route.request().url();
    if (kind === 'flaky' && !url.endsWith('manifest.json') && n % 7 === 0) {
      log.failed.push(url.replace(/^.*?\/(voice-gen|art)\//, '$1/'));
      return route.abort('failed');
    }
    if (kind === 'slow') await new Promise((r) => setTimeout(r, 300 + ((n * 137) % 1200)));
    return route.continue();
  });
}

/**
 * A look at one moment instead of a sweep: `QA_LOOK='scene=house&cast=default'`
 * boots that URL and records `QA_LOOK_S` seconds (default 30) of shots and
 * checks, pressing green every few seconds, into `qa/<tag>/look/` in the scratch home.
 */
const LOOK = process.env.QA_LOOK;
if (LOOK) {
  test('qa look', async ({ page }) => {
    await boot(page, `?${LOOK}&qa=1`, SPEED);
    const dir = `${OUT}/look`;
    const rec = new Recorder(page, dir);
    const end = Date.now() + Number(process.env.QA_LOOK_S ?? 30) * 1000;
    while (Date.now() < end) {
      await page.waitForTimeout(3000);
      if (process.env.QA_LOOK_GREEN !== '0') await press(page, 'green');
    }
    await rec.stop();
    const last = await state(page);
    writeFileSync(`${OUT}/look.json`, JSON.stringify({ scenario: { name: 'look', query: LOOK }, seconds: 0, stalled: null, shots: rec.shots, cast: null, heapMB: [], frames: {}, locks: [], issues: [...rec.issues.values()], last: { scene: last.scene, room: last.room, voice: last.voice } }, null, 1));
  });
}

const set = process.env.QA_SET;
// Any other `QA_SET` (none, or a typo) plays the first batch.
const batch = BATCHES.find((b) => b === set);
const inSet = (x: Scenario) => (set === 'quick' ? Boolean(x.quick) : set === 'all' ? true : x.batch === batch);
for (const sc of SCENARIOS.filter((x) => !LOOK && inSet(x))) {
  test(`qa ${sc.name}`, async ({ page }) => {
    const errors = collectErrors(page);
    if (sc.progress) await seedProgress(page, seededProgress(sc.progress));
    // Before boot, which loads the manifest (item 092: after it, `voiceless` played with every voice).
    if (sc.voiceless) await page.route(/\/voice-gen\/manifest\.json/, (route) => route.fulfill({ status: 404, body: 'not built' }));
    await boot(page, `?${sc.query}&qa=1`, SPEED);
    const dir = `${OUT}/${sc.name}`;
    // 400 shots an episode (hunt 7: `variants6` ran out in its third and looked like a hang).
    const rec = new Recorder(page, dir, 400 * Math.max(1, sc.episodes ?? 1, (sc.reloadAt?.length ?? 0) + 1));
    rec.wrong = Boolean(sc.wrong);
    rec.voiceless = Boolean(sc.voiceless);
    const started = Date.now();
    const counts: Record<string, number>[] = [];
    const heap: number[] = [];
    let stalled: string | null = null;
    const drawn: Drawn[] = [];
    // Hunt 8: solo at each episode's end, the store's kept chains after each.
    const solos: boolean[] = [];
    const chains: string[][] = [];
    const masher = sc.mash ? mash(page) : null;
    const hiding = sc.hide ? hider(page) : null;
    const resizing = sc.resize ? resizer(page) : null;
    const net = { failed: [] as string[] };
    if (sc.net) await network(page, sc.net, net);
    // Where each episode's transcript ends (item 089's taunt check), as voice lines so far.
    const cuts: number[] = [];
    // Item 080's probes: one record per point, and one episode per reload point plus one played through.
    const probeLog: Record<string, unknown>[] = [];
    const reloads = sc.reloadAt ?? [];
    const total = reloads.length ? reloads.length + 1 : (sc.episodes ?? 1);
    try {
      for (let e = 0; e < total; e++) {
        rec.endingId = '';
        rec.fight = '';
        try {
          await episode(page, sc, rec, probes(page, sc, rec, reloads[e] ?? null, probeLog));
        } catch (err) {
          if (err instanceof Reloaded) continue;
          throw err;
        }
        const ep = (await state(page)).episode;
        const plan = ep.house.plan ?? [];
        drawn.push({ ally: ep.ally, villain: ep.villain, fight: rec.fight, ending: rec.endingId, games: plan.map((p) => p.game), rooms: plan.filter((p) => p.slot !== 'counter').map((p) => p.room).sort(), words: [...ep.read] });
        solos.push(ep.solo);
        chains.push((JSON.parse((await storedBlob(page)) ?? '{}') as { recent?: Record<string, string[]> }).recent?.chains ?? []);
        counts.push(await page.evaluate(() => (window as unknown as { __wwqa: { counts(): Record<string, number> } }).__wwqa.counts()));
        heap.push(await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0));
        cuts.push((await qaSince(page, 0)).voice.length);
        // The recap's green, then only Dad's 2 leaves THE END (items 082, 085).
        if (e + 1 < total) await (sc.endMash ? endMash(page, rec, probeLog) : playAgain(page));
      }
    } catch (err) {
      stalled = String(err).split('\n')[0]!;
      if (!(await stallShot(rec))) stalled += ' (the page stopped answering)';
      rec.add([{ kind: 'stall', severity: 'bug', scene: rec.last?.scene ?? '', detail: stalled, key: `stall:${sc.name}` }], rec.lastShot);
    }
    await masher?.stop();
    await hiding?.stop();
    await resizing?.stop();
    await bounded(rec.stop(), 20_000, undefined);
    // Rotations only where the URL forces nothing they rotate.
    if (!/(^|&)(seed|ally|villain|place|fight|game|room)=|cast=default/.test(sc.query)) rec.add(varietyIssues(drawn));
    rec.add(chainIssues(chains));
    if (sc.dadAway) rec.add(soloIssues(solos));
    if (sc.mash && rec.shotsFired === 0) rec.add([{ kind: 'mash-dead', severity: 'bug', scene: '', detail: 'a busy child pressed blue, red and yellow all episode and free play never fired a shot', key: 'mash-dead' }]);
    const q = await bounded(qaSince(page, 0), 20_000, NO_SINCE);
    // The whole run's flashes at once: a burst can straddle two polls.
    rec.add(logIssues({ ...q, voice: [], locks: [], spikes: [] }, SPEED));
    // Hunt 12: a sound-out's letter sounds never run together (the whole log: a pair can straddle two polls).
    rec.add(soundGapIssues(q.voice, q.locks));
    rec.add(VOICE_BUILD);
    // Item 089: line variants in turn over the run, taunts at most twice an episode (item 087).
    const ids = q.voice.map((v) => v.id);
    // Not with debug games in the run: their sandbox puts the store back, variant rounds too, so they repeat on purpose (item 092).
    // An idle or a busy child (yellow mashed) hears a line again on purpose (hunt 7: `shifter_fix` three times under mash).
    if (!sc.debugAt) rec.add(variantIssues(ids, VARIANT_BASES, Boolean(sc.idle || sc.mash)));
    rec.add(tauntIssues([...cuts, ids.length].map((c, i, all) => ids.slice(i ? all[i - 1] : 0, c)).filter((x) => x.length)));
    for (const e of errors) rec.add([{ kind: 'page-error', severity: 'bug', scene: '', detail: e, key: `pageerror:${e.slice(0, 80)}` }]);
    // Growth from one episode to the next.
    for (let i = 1; i < counts.length; i++) {
      for (const [k, v] of Object.entries(counts[i]!)) {
        const was = counts[i - 1]![k]!;
        if (k !== 'textures' && v > was * 1.25 + 20) rec.add([{ kind: 'growth', severity: 'look', scene: 'Victory', detail: `${k} ${was} -> ${v} after episode ${i + 1}`, key: `growth:${k}:${i}` }]);
      }
    }
    const end = rec.last;
    writeFileSync(
      `${OUT}/${sc.name}.json`,
      JSON.stringify(
        {
          scenario: sc,
          seconds: Math.round((Date.now() - started) / 1000),
          stalled,
          shots: rec.shots,
          cast: end ? { hero: end.episode.hero, ally: end.episode.ally, villain: end.episode.villain, fight: end.battle?.fight, read: end.episode.read, fetched: end.episode.fetched } : null,
          drawn,
          counts,
          heapMB: heap.map((h) => Math.round(h / 1e6)),
          frames: q.frames,
          locks: q.locks.filter((l) => l.ms > 6000 || l.silentMs > 1500),
          voiceLines: q.voice.length,
          // Item 087: the transcript, line ids in order, and each id said more than twice.
          said: q.voice.map((v) => v.id),
          repeated: repeatedLines(q.voice.map((v) => v.id)),
          ...(probeLog.length ? { probes: probeLog } : {}),
          ...(sc.net ? { netFailed: net.failed } : {}),
          ...(hiding ? { hidden: hiding.count() } : {}),
          issues: [...rec.issues.values()],
        },
        null,
        1,
      ),
    );
  });
}

/**
 * Item 080: every URL the code reads, odd values too, each booted and watched
 * for `FLAG_S` seconds with green pressed now and then: page errors, console
 * warnings, a boot that never leaves Boot or Wait, and the usual layout checks
 * at each shot. `QA_SET=lenses` (or `all`), or `-g "qa flags"`.
 */
const FLAG_S = 9;
const FLAGS = [
  'scene=title', 'scene=bedroom', 'scene=grab', 'scene=house', 'scene=house&part=2', 'scene=room', 'scene=room&slot=b', 'scene=room&slot=counter',
  'scene=room&room=charge', 'scene=room&room=bridge', 'scene=room&room=shifter', 'scene=room&game=word_machine', 'scene=battle', 'scene=battle&part=2', 'scene=victory', 'scene=parent',
  'scene=sound', 'scene=blend', 'scene=picture', 'scene=pick', 'scene=alarm', 'scene=retreat', 'scene=spell', 'scene=bogus',
  'seed=abc', 'seed=-5', 'seed=1e99', 'difficulty=0', 'difficulty=9', 'difficulty=abc', 'ally=bogus', 'villain=bogus', 'ally=ellie&villain=ellie',
  'ally=none&primary=none', 'hero=evil_tiamat', 'form=bogus', 'form=lifter,warlock', 'place=bogus', 'fight=bogus', 'game=bogus', 'room=bogus', 'ending=bogus',
  'scene=battle&fetched=bogus,zzz', 'scene=battle&charged=zz', 'scene=victory&read=', 'read=cat,dog', 'prep=bogus', 'scene=room&slot=bogus', 'part=7&scene=battle',
  // Item 092: the flags added since (THE END, the warm-up's word, the short battle, the cast and pool switches).
  'scene=theend', 'scene=theend&ally=none', 'grab=cat', 'grab=bogus', 'scene=grab&grab=sheep', 'scene=battle&battle=short', 'battle=bogus', 'cast=bogus', 'games=bogus', 'scene=room&games=bogus',
  // Hunt 7 (item 116): the Shape-Shifter beside the pool switches (hunt 6's list), the story fight, solo, the new cast.
  'room=shifter&game=word_machine', 'room=shifter&games=all', 'scene=room&slot=b&room=shifter&games=all', 'scene=room&room=shifter&difficulty=3',
  'fight=smaug_story', 'scene=battle&fight=smaug_story', 'scene=battle&part=2&fight=smaug_story', 'scene=battle&fight=smaug_story&villain=tiamat', 'scene=battle&fight=smaug_story&ally=none',
  'solo=1', 'scene=room&room=charge&solo=1', 'scene=room&room=bridge&solo=1&difficulty=3',
  'scene=battle&fight=frost_clash', 'scene=battle&fight=space_race&villain=smaug', 'scene=battle&fight=magic_show', 'villain=elsa&ally=elsa', 'ally=moriarty&villain=moriarty', 'scene=house&ally=rilla&villain=ozymandias',
  // Hunt 8 (item 125): item 121's favoured words, odd values and beside the room switches.
  'words=new', 'words=', 'words=bogus,zzz', 'words=TREE,Bee', 'scene=room&room=shifter&words=new', 'scene=grab&words=new', 'scene=parent&words=new',
  // Hunt 9 (item 129): item 126's words where she meets them, the story fight drawn, item 128's widest banners.
  'scene=grab&grab=cow', 'scene=grab&grab=dad', 'scene=room&slot=a&sentence=we_need_a:mom', 'scene=room&slot=counter&sentence=scared_of_the:dad',
  'scene=battle&fetched=cow,mom,dad', 'scene=battle&part=2&fetched=dad', 'scene=victory&read=cow,mom,dad', 'seed=976&scene=battle', 'sentence=bogus', 'sentence=we_need_a:zzz',
  'scene=room&slot=a&sentence=no_match_for_the:octopus', 'scene=room&game=word_machine&words=cow',
  // Hunt 10 (item 135): item 134's ambience in its two arenas (Matt's picks, item 136); item 130's RUN and CAN; the grown-ups page without its art.
  // `fight=brawl`: an ally's fightNudge (a cook-off) would move the fight to the cook show's arena.
  'scene=battle&villain=ellie&fight=brawl', 'scene=battle&villain=rilla&fight=brawl',
  'scene=room&room=shifter&words=run,can', 'scene=room&slot=counter&words=can', 'scene=parent&ally=none',
  // Hunt 11 (item 142): the rhyme room and Charge's two words beside the room switches; the battle with Charge's runes.
  'scene=room&room=rhyme', 'scene=room&slot=b&room=rhyme', 'scene=room&room=rhyme&difficulty=3', 'room=rhyme&games=sentence', 'room=rhyme&game=word_machine',
  'scene=room&room=rhyme&words=new', 'scene=room&room=charge&difficulty=3', 'scene=battle&room=charge', 'scene=battle&part=2&room=charge', 'scene=battle&room=charge&fight=smaug_story',
  'scene=battle&charged=b,a,t,d,o,g', 'scene=house&ally=rilla', 'scene=house&ally=ozymandias', 'scene=house&ally=jasmine',
  // Hunt 12 (item 164): the F bridge (item 162) and item 155's ?bridge= with odd values; item 157's words; item 156's
  // summon and Comet Crash; Evil Tiamat's run-in at each part.
  'scene=room&room=bridge&bridge=frog,flag', 'scene=room&room=bridge&bridge=gift,elf&difficulty=3', 'scene=room&room=bridge&bridge=fig,bogus', 'scene=room&room=bridge&bridge=',
  'scene=room&room=bridge&bridge=fan,fox,fish,frog', 'scene=room&slot=b&room=bridge&bridge=fan', 'scene=room&room=shifter&words=pup,cub,cot,kid,dot',
  'scene=battle&villain=elsa&fight=brawl', 'scene=battle&villain=ozymandias&fight=brawl', 'scene=battle&part=2&villain=tiamat&fight=brawl', 'scene=battle&ally=tiamat&villain=smaug',
];
const flagSet = set === 'lenses' || set === 'all';
for (const flag of flagSet && !LOOK ? FLAGS : []) {
  test(`qa flags ${flag}`, async ({ page }) => {
    const errors = collectErrors(page);
    // `boot` adds cast=default and games=sentence only where the flag says nothing of them.
    await boot(page, `?${flag}&qa=1`, SPEED);
    const name = `flag_${flag.replace(/[^\w]+/g, '_')}`;
    const rec = new Recorder(page, `${OUT}/flags/${name}`, 12);
    const scenes = new Set<string>();
    const end = Date.now() + FLAG_S * 1000;
    while (Date.now() < end) {
      await page.waitForTimeout(1500);
      scenes.add((await state(page)).scene);
      await press(page, 'green');
    }
    await rec.stop();
    const last = await state(page);
    if (['Boot', 'Wait'].includes(last.scene)) rec.add([{ kind: 'flag-stuck', severity: 'bug', scene: last.scene, detail: `?${flag}: still in ${last.scene} after ${FLAG_S} s`, key: `flagstuck:${flag}` }], rec.lastShot);
    for (const e of errors) rec.add([{ kind: 'page-error', severity: 'bug', scene: '', detail: `?${flag}: ${e}`, key: `pageerror:${e.slice(0, 80)}` }]);
    mkdirSync(`${OUT}/flags`, { recursive: true });
    writeFileSync(`${OUT}/flags/${name}.json`, JSON.stringify({ scenario: { name, query: flag }, scenes: [...scenes], last: { scene: last.scene, step: last.step, room: last.room?.round ?? null, battle: last.battle?.phase ?? null }, shots: rec.shots, issues: [...rec.issues.values()] }, null, 1));
  });
}

/**
 * Item 080: the dev keys through a whole episode. `skip`: F2 at every step from
 * the title to the victory, then one episode played through (what the skips left
 * in the store). `auto`: F4 (and green) every second until the recap.
 */
for (const mode of flagSet && !LOOK ? (['skip', 'auto'] as const) : []) {
  test(`qa devkeys ${mode}`, async ({ page }) => {
    const errors = collectErrors(page);
    const sc: Scenario = { name: `devkeys_${mode}`, query: `seed=${mode === 'skip' ? 407 : 408}&games=all` };
    await boot(page, `?${sc.query}&qa=1`, SPEED);
    const dir = `${OUT}/${sc.name}`;
    const rec = new Recorder(page, dir);
    const path: string[] = [];
    let stalled: string | null = null;
    try {
      const end = Date.now() + 8 * 60_000;
      for (let n = 0; Date.now() < end; n++) {
        const s = await state(page);
        const at = `${s.scene}:${s.room?.round ?? s.battle?.phase ?? ''}`;
        if (path.at(-1) !== at) path.push(at);
        if (s.scene === 'Victory' && (mode === 'skip' || (!s.voice.busy && s.recap.length > 0))) break;
        // Auto's green can land on the said recap and open THE END (item 085), where its next F4 would be Dad's yes.
        if (s.scene === 'TheEnd') break;
        if (mode === 'skip') {
          await page.waitForTimeout(2500);
          // The title has no F2 (nothing to skip): green starts the episode.
          if (s.scene === 'Title') await press(page, 'green');
          else await page.keyboard.press('F2');
        } else {
          await page.keyboard.press('F4');
          await page.waitForTimeout(1000);
          if (n % 2) await press(page, 'green');
        }
      }
      if (!['Victory', 'TheEnd'].includes((await state(page)).scene)) throw new Error(`devkeys ${mode}: no victory in 8 minutes; path ${path.slice(-6).join(' > ')}`);
      if (mode === 'skip') {
        // The recap's green, then only Dad's 2 leaves THE END (items 082, 085). The last F2 may land on
        // the victory screen a frame after it was read (the ending runs into it by itself) and skip on
        // to THE END (hunt 7's stall): from there, Dad's 2.
        // (Its trip there is a fade, and the Wait scene if THE END's art lags: give it 3 s.)
        const ended = await until(page, (st) => st.scene === 'TheEnd' && Boolean(st.theEnd?.dad), 3_000, 'a late F2').catch(() => null);
        if (ended) {
          await page.keyboard.press('Digit2');
          await until(page, (st) => st.scene === 'Title', 30_000, 'the title again');
        } else await playAgain(page, { hush: true });
        await episode(page, sc, rec);
      }
    } catch (err) {
      stalled = String(err).split('\n')[0]!;
      await stallShot(rec);
      rec.add([{ kind: 'stall', severity: 'bug', scene: rec.last?.scene ?? '', detail: stalled, key: `stall:${sc.name}` }], rec.lastShot);
    }
    await rec.stop();
    for (const e of errors) rec.add([{ kind: 'page-error', severity: 'bug', scene: '', detail: e, key: `pageerror:${e.slice(0, 80)}` }]);
    const q = await qaSince(page, 0);
    rec.add(logIssues({ ...q, voice: [], locks: [], spikes: [] }, SPEED));
    // Hunt 12: a sound-out's letter sounds never run together (the whole log: a pair can straddle two polls).
    rec.add(soundGapIssues(q.voice, q.locks));
    const last = await state(page);
    writeFileSync(`${OUT}/${sc.name}.json`, JSON.stringify({ scenario: sc, stalled, path, progress: last.progress, read: last.episode.read, shots: rec.shots, issues: [...rec.issues.values()] }, null, 1));
  });
}
