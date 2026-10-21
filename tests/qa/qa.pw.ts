/**
 * The bug-hunt checker (item 039). Not a test: it plays whole episodes at
 * speed across casts, places, fight styles and games, shoots only at
 * meaningful moments (a scene change, each line, each new round or choice,
 * each battle phase, the ending and the recap) and runs the automatic checks
 * in `checks.ts` at each. Run it with its own config:
 *
 *   QA_TAG=<tag> npx playwright test --config tests/qa/qa.config.ts [-g <scenario>]
 *
 * and read `scratch/qa/<tag>/`: one folder of shots per scenario, its
 * `<scenario>.json` (issues, counts, lock and frame stats), then
 * `npx tsx tests/qa/report.ts <tag>` for `summary.md` and contact sheets.
 * `QA_SET=quick` plays three scenarios, `more` the second batch (places, forms,
 * an idle child), `new` the third (item 069: a busy child, the difficulty
 * levels, real draws back to back), `all` every batch; the default plays the first.
 * A scenario that stalls records a `stall` issue with its last shot and the
 * next one runs. README, "The bug-hunt checker"; findings: docs/qa-findings.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';

import { test, type Page } from '@playwright/test';

import { BANK } from '../../content/phonics/bank';
import { FREE_PLAY } from '../../src/config';
import { boot, choose, collectErrors, hubGo, leaveBedroom, playBattle, playBridgeRoom, playChargeRoom, playEntry, playWordMachine, press, readToKeyWord, seedProgress, state, until, type WWState } from '../harness';
import { layoutIssues, leakIssues, logIssues, placeholderArt, voiceBuildIssues, type Issue, type Layout, type Since } from './checks';
import { clippedIssues, giveawayIssues, pacingIssues, spellingIssues } from './wording';

const TAG = process.env.QA_TAG ?? 'now';
const OUT = `scratch/qa/${TAG}`;
const SPEED = Number(process.env.WW_SPEED ?? 5);
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
  /** Only with `QA_SET=more` (or `all`): the second batch, added by the first hunt. */
  more?: boolean;
  /** Only with `QA_SET=new` (or `all`): the third batch, added by the second hunt (item 069). */
  added?: boolean;
}

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
  { name: 'idle_default', query: 'cast=default', idle: true, more: true },
  { name: 'builder_treehouse', query: 'seed=201&ally=dada_matt&villain=bavmorda&games=all', more: true },
  { name: 'warlock_ally', query: 'seed=202&ally=dada_jason_warlock&villain=jormungandr', more: true },
  { name: 'ellie_home_race', query: 'seed=203&ally=ellie&villain=smaug&place=home&fight=sky_race&games=all', more: true },
  { name: 'scar_wrong_clash', query: 'seed=204&ally=scar&villain=bavmorda&fight=spell_clash', wrong: true, more: true },
  { name: 'jason_wakes', query: 'seed=205&ally=scar&villain=tiamat&primary=dada_jason&secondary=1&games=all', more: true },
  { name: 'machine_solid', query: 'seed=206&game=word_machine', progress: 'all', more: true },
  { name: 'seed207', query: 'seed=207&games=all', more: true },
  { name: 'seed208', query: 'seed=208&games=all', more: true },
  { name: 'seed209', query: 'seed=209&games=all', wrong: true, more: true },
  // Charge the Spell (item 053): every `games=all` scenario meets it too (FORCE_PHONICS_ROOM); this one with Dad's no first.
  { name: 'charge_no_first', query: 'seed=115&room=charge', wrong: true, more: true },
  // The Stretchy Bridge (item 054): half the `games=all` scenarios meet it; this one with a wrong picture first.
  { name: 'bridge_wrong_first', query: 'seed=116&room=bridge', wrong: true, more: true },
  // The second hunt (item 069): free play under a busy child, the difficulty levels above base
  // (item 067), the phonics rooms answered right, and a real draw across episodes (rotations).
  { name: 'mash_default', query: 'cast=default&games=all', mash: true, added: true },
  { name: 'mash_wrong_seed301', query: 'seed=301&games=all', mash: true, wrong: true, added: true },
  { name: 'diff2_firm', query: 'seed=302&games=all&difficulty=2', progress: 'firm', added: true },
  { name: 'diff3_solid', query: 'seed=303&games=all&difficulty=3', progress: 'all', added: true },
  { name: 'diff3_wrong', query: 'seed=304&games=all&difficulty=3', progress: 'firm', wrong: true, added: true },
  { name: 'charge_yes', query: 'seed=305&room=charge', added: true },
  { name: 'bridge_diff3', query: 'seed=306&room=bridge&difficulty=3', progress: 'firm', added: true },
  { name: 'drawn4', query: 'cast=random&games=all', episodes: 4, added: true },
];

/** How often a busy child presses something (real ms). */
const MASH_MS = 650;

/** Every level-1 word solid (`firm`), or every word (`all`): six right first tries each. */
function seededProgress(kind: 'firm' | 'all'): Record<string, unknown> {
  const stat = { seen: 6, right: 6, wrong: 0, recent: [true, true, true, true, true, true], last: 1 };
  const words = Object.fromEntries(BANK.filter((w) => kind === 'all' || w.level === 1).map((w) => [w.word, stat]));
  return { version: 1, words, episodes: 6 };
}

/** The recorder: polls state beside the driver, shoots at meaningful moments, runs the checks. */
class Recorder {
  issues = new Map<string, Issue & { count: number }>();
  shots = 0;
  private running = true;
  private loop: Promise<void>;
  private sig = { scene: '', voice: '', round: '', phase: '', choice: '', said: 0, recap: 0, ult: 0 };
  private roundStart = 0;
  private qaT = 0;
  last: WWState | null = null;
  lastShot = '';
  /** The episode's victory scene and fight style, kept as they pass (the variety check, item 069). */
  endingId = '';
  fight = '';
  /** Free play's shots in the scene with the most (a mash scenario reports that its presses landed). */
  shotsFired = 0;
  /** Each scene's visits, real ms (item 059's pacing check); `wrong` when the scenario answers wrong on purpose. */
  private visit = { scene: '', at: 0 };
  visits: { scene: string; ms: number; wrong: boolean }[] = [];
  wrong = false;
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
    const play = (s as WWState & { play?: { maxLive: number; shots: number } }).play;
    if (play) {
      this.shotsFired = Math.max(this.shotsFired, play.shots);
      if (play.maxLive > FREE_PLAY.maxShots) this.add([{ kind: 'shots-over-cap', severity: 'bug', scene: s.scene, detail: `${play.maxLive} live shots (cap ${FREE_PLAY.maxShots})`, key: `shotcap:${s.scene}` }], this.lastShot);
    }
    const q = await this.page.evaluate((t) => (window as unknown as { __wwqa: { since(t: number): Since } }).__wwqa.since(t), this.qaT);
    this.qaT = q.now;
    this.add(logIssues({ ...q, console: [], missingArt: [], flashes: [] }));
    this.add(clippedIssues(q.voice));
    if (s.scene !== this.visit.scene) {
      if (this.visit.scene) this.visits.push({ scene: this.visit.scene, ms: (Date.now() - this.visit.at) * SPEED, wrong: this.wrong });
      this.visit = { scene: s.scene, at: Date.now() };
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
    const l = await this.page.evaluate(() => (window as unknown as { __wwqa: { layout(): Layout } }).__wwqa.layout());
    const q = await this.page.evaluate(() => (window as unknown as { __wwqa: { since(t: number): Since } }).__wwqa.since(0));
    let shot: string | undefined;
    if (this.shots < this.max) {
      this.shots++;
      shot = `${this.dir}/${String(this.shots).padStart(3, '0')}_${s.scene}_${label}.png`;
      await this.page.screenshot({ path: shot }).catch(() => undefined);
      this.lastShot = shot;
    }
    this.add(layoutIssues(l, s.scene, PLACEHOLDERS), shot);
    this.add(leakIssues(s, l, q.voice.filter((v) => v.t >= this.roundStart)), shot);
    this.add(spellingIssues(l, q.voice, s.scene), shot);
    this.add(giveawayIssues(l, s.scene), shot);
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loop;
    this.add(pacingIssues(this.visits));
  }
}

/** A sentence room, a wrong object first when asked. */
async function sentenceRoom(page: Page, wrong: boolean, idle = false): Promise<string> {
  const s = await readToKeyWord(page);
  const key = s.room!.sentence!.key;
  if (idle) await page.waitForTimeout(IDLE_MS);
  if (wrong) {
    const ready = await until(page, (st) => Boolean(st.room && !st.room.locked && st.room.spots.some((sp) => sp.correct === false)), 60_000, 'objects up');
    const bad = ready.room!.spots.find((sp) => sp.correct === false)!;
    await choose(page, bad.id);
    await page.waitForTimeout(400);
    await until(page, (st) => st.room?.sentence?.pass === 'find' && !st.room.locked, 60_000, 'retry open');
  }
  await choose(page);
  await until(page, (st) => st.scene !== 'SentenceRoom', 60_000, `out of the ${key} room`);
  return key;
}

async function room(page: Page, wrong: boolean, idle = false): Promise<void> {
  const s = await until(
    page,
    (st) =>
      (st.scene === 'SentenceRoom' && Boolean(st.room?.sentence)) ||
      (st.scene === 'WordMachine' && Boolean(st.room?.machine)) ||
      (st.scene === 'ChargeRoom' && Boolean(st.room?.charge)) ||
      (st.scene === 'BridgeRoom' && Boolean(st.room?.bridge)),
    30_000,
    'a side room',
  );
  if (s.scene === 'WordMachine') await playWordMachine(page, wrong);
  else if (s.scene === 'ChargeRoom') await playChargeRoom(page, wrong ? 'no' : 'yes');
  else if (s.scene === 'BridgeRoom') await playBridgeRoom(page, wrong);
  else await sentenceRoom(page, wrong, idle);
}

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
      await press(page, (['blue', 'red', 'yellow'] as const)[n % 3]!).catch(() => undefined);
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

/** One episode from the title's green to the victory recap. */
async function episode(page: Page, sc: Scenario, rec: Recorder): Promise<void> {
  await until(page, (s) => s.scene === 'Title', 90_000, 'title');
  await page.waitForTimeout(500);
  await press(page, 'green');
  await until(page, (s) => s.scene === 'Bedroom', 30_000, 'bedroom');
  await standStill(page, sc, (s) => s.scene === 'Bedroom' && s.room?.round === 'bedroom:door' && !s.room.locked, 'bedroom door');
  await leaveBedroom(page, { grab: false });
  await standStill(page, sc, (s) => s.scene === 'Entry' && s.room?.round === 'entry:find' && !s.room.locked, 'warm-up clue');
  await playEntry(page, sc.wrong ? 2 : 0);
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:circle', 90_000, 'circle offered');
  await hubGo(page, 'circle');
  for (const door of ['door_a', 'door_b']) {
    await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors', 90_000, `${door} offered`);
    await standStill(page, sc, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:doors' && !s.room.locked, 'doors open');
    await hubGo(page, door);
    if (sc.dadLock && door === 'door_a') {
      const s = await until(page, (st) => st.scene === 'SentenceRoom' || st.scene === 'WordMachine' || st.scene === 'ChargeRoom' || st.scene === 'BridgeRoom', 30_000, 'side room');
      if (s.scene === 'SentenceRoom') await until(page, (st) => st.room?.sentence?.pass === 'read' && !st.room.locked, 90_000, 'read pass');
      await dadLockProbe(page, rec);
    }
    await room(page, Boolean(sc.wrong), Boolean(sc.idle));
  }
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:1:front', 90_000, 'front door');
  await hubGo(page, 'door_front');
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 1');
  await standStill(page, sc, (s) => Boolean(s.battle?.choice?.open), 'first move choice');
  await playBattle(page, 1, Boolean(sc.wrong));
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:secret', 120_000, 'secret door');
  await hubGo(page, 'door_counter');
  await sentenceRoom(page, Boolean(sc.wrong));
  await until(page, (s) => s.scene === 'Hub' && s.room?.round === 'hub:2:front', 90_000, 'front door again');
  await hubGo(page, 'door_front');
  await until(page, (s) => s.scene === 'Battle', 60_000, 'battle 2');
  await playBattle(page, 2, Boolean(sc.wrong));
  await until(page, (s) => s.scene === 'Victory' && !s.voice.busy, 180_000, 'victory quiet');
  await page.waitForTimeout(800);
  await rec.capture('victory_end');
}

/**
 * A look at one moment instead of a sweep: `QA_LOOK='scene=house&cast=default'`
 * boots that URL and records `QA_LOOK_S` seconds (default 30) of shots and
 * checks, pressing green every few seconds, into `scratch/qa/<tag>/look/`.
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
const inSet = (x: Scenario) => (set === 'quick' ? Boolean(x.quick) : set === 'more' ? Boolean(x.more) : set === 'new' ? Boolean(x.added) : set === 'all' ? true : !x.more && !x.added);
for (const sc of SCENARIOS.filter((x) => !LOOK && inSet(x))) {
  test(`qa ${sc.name}`, async ({ page }) => {
    const errors = collectErrors(page);
    if (sc.progress) await seedProgress(page, seededProgress(sc.progress));
    await boot(page, `?${sc.query}&qa=1`, SPEED);
    const dir = `${OUT}/${sc.name}`;
    const rec = new Recorder(page, dir);
    rec.wrong = Boolean(sc.wrong);
    const started = Date.now();
    const counts: Record<string, number>[] = [];
    const heap: number[] = [];
    let stalled: string | null = null;
    const drawn: Drawn[] = [];
    const masher = sc.mash ? mash(page) : null;
    try {
      for (let e = 0; e < (sc.episodes ?? 1); e++) {
        rec.endingId = '';
        rec.fight = '';
        await episode(page, sc, rec);
        const ep = (await state(page)).episode;
        const plan = ep.house.plan ?? [];
        drawn.push({ ally: ep.ally, villain: ep.villain, fight: rec.fight, ending: rec.endingId, games: plan.map((p) => p.game), rooms: plan.filter((p) => p.slot !== 'counter').map((p) => p.room).sort(), words: [...ep.read] });
        counts.push(await page.evaluate(() => (window as unknown as { __wwqa: { counts(): Record<string, number> } }).__wwqa.counts()));
        heap.push(await page.evaluate(() => (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0));
        if (e + 1 < (sc.episodes ?? 1)) await press(page, 'green');
      }
    } catch (err) {
      stalled = String(err).split('\n')[0]!;
      await rec.capture('stall');
      rec.add([{ kind: 'stall', severity: 'bug', scene: rec.last?.scene ?? '', detail: stalled, key: `stall:${sc.name}` }], rec.lastShot);
    }
    await masher?.stop();
    await rec.stop();
    // Rotations only where the URL forces nothing they rotate.
    if (!/(^|&)(seed|ally|villain|place|fight|game|room)=|cast=default/.test(sc.query)) rec.add(varietyIssues(drawn));
    if (sc.mash && rec.shotsFired === 0) rec.add([{ kind: 'mash-dead', severity: 'bug', scene: '', detail: 'a busy child pressed blue, red and yellow all episode and free play never fired a shot', key: 'mash-dead' }]);
    const q = await page.evaluate(() => (window as unknown as { __wwqa: { since(t: number): Since } }).__wwqa.since(0));
    // The whole run's flashes at once: a burst can straddle two polls.
    rec.add(logIssues({ ...q, voice: [], locks: [], spikes: [] }));
    rec.add(VOICE_BUILD);
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
          issues: [...rec.issues.values()],
        },
        null,
        1,
      ),
    );
  });
}
