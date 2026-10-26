/**
 * The battle: a free simulation, not a scripted sequence, with a director
 * steering it to a fixed story.
 *
 * The simulation (`BattleSim`, sim.ts): every fighter moves in its own style
 * (movement.ts) and uses its abilities on its own cooldowns (abilities.ts),
 * choosing targets as it goes; minions, clones, projectiles and traps are all
 * live. Taunts go through the voice arbiter as barks, in bubbles that follow
 * the speaker.
 *
 * The director (`part1()` / `part2()`, this scene, the orchestrator): health
 * bars are cosmetic and steered. Nobody important can be knocked out by the
 * simulation (floors in `BattleSim.hit()`), and the story beats are placed on
 * the simulation clock; the fetched things and the runes are volleys.ts, the
 * combo, the ultimate, the counter and the finish beats.ts:
 *
 *   Part 1: charge → the things she fetched in the house pop out of her bag
 *   and are used → move choice → team combo → move choice → the villain's
 *   ultimate floors the heroes → "Too strong! Retreat!" (never "you lost").
 *   Part 2: round two → the fetched things again → move choice → combo → the
 *   ultimate starts, the counter-item visibly blocks, reverses or scares it
 *   off → the villain is stunned → everyone's finisher → victory.
 *
 * The move choice pauses the fight in near-freeze: 2–3 move words appear as
 * glowing pads on the arena floor, each with its word on a sign. The partner
 * says which one to use; she walks her hero (on real time, the rest frozen)
 * onto that pad and presses green, the same as walking to an answer in a
 * room. A wrong pick fires nothing: the fight stays frozen and the partner
 * says what she picked and what to find ("That wasn't ICE, that was HUG! Find
 * ICE!"), as often as it takes; the right one fires the supercharged move
 * (Julia's first play, 2026-10-18). The first choice of each part is the word the helper gave
 * her in the hub, so the word she was given is the one she fires first. Reading a pad casts
 * its word (item 037): a teammate's own move when one answers to it, else the word's effect.
 *
 * Time: `now` is simulation time. Slow-mo, hit-stop and the choice freeze all
 * scale it, and the scene's tweens and timers with it (fx/juice timeScale).
 */

import Phaser from 'phaser';

import { ARENAS, CHARACTER_BY_ID, personOf } from '../../content/battle/roster';
import type { AbilitySpec, Status } from '../../content/battle/types';
import { wordEffect } from '../../content/phonics/effects';
import { fighterId, moveKeyWord, moveLine, narratorLine, tauntLine, type MoveKind } from '../../content/voice/ids';
import { startMusic } from '../audio/music';
import { voiceBus } from '../voice/VoiceBus';
import { sfxBoom, sfxFanfare, sfxRight, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_HEAVY, GAME_HEIGHT, GAME_WIDTH, RUNE_GAP } from '../config';
import { outfitFor } from '../../content/battle/outfits';
import { advance, castArt, episode, fightStyle, movePlan, narrator, villainSpec, type Step } from '../episode/Episode';
import { pickTaunt, variant } from '../episode/lineVariants';
import { fightLineKey, type FightSpec } from '../../content/battle/fights';
import { hex } from '../fx/colour';
import { backdrop, burst, fitImage, flash, FpsMeter, fxQuality, punch, shake, shockwave, slowmo, speedLines, timeScale } from '../fx/juice';
import { FreePlay } from '../fx/freePlay';
import { SceneGen, isLeaving, markLeaving } from '../fx/sceneGen';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { withStems } from '../rules/bank';
import { wordsOf } from '../rules/sentences';
import { isDad } from '../rules/cast';
import { outfitTall } from '../rules/heights';
import type { MoveOwner } from '../rules/moves';
import { progress } from '../state/progress';
import { hookState } from '../hookState';
import { voiceBank } from '../voice/VoiceBank';
import { Bubbles } from '../ui/Bubbles';
import { Caption } from '../ui/Caption';
import { fitText } from '../ui/fitText';
import { cast, type Projectile, type Trap } from './abilities';
import { BattleBeats, type WindUp } from './beats';
import { type Fighter, FLOOR_TOP, initFromSpec, NO_AFTERIMAGES, type FighterInit } from './Fighter';
import { restLift } from './movement';
import { BattleHud } from './hud';
import { MoveChoice, type ChoiceHost } from './moveChoice';
import type { Box } from './padPlace';
import { BattleSim, BRAWL, noStats, type BattleStats } from './sim';
import { makeStage } from './stages';
import { StoryDirector, type StoryHost } from './story/StoryDirector';
import type { StoryWalk } from './story/walk';
import type { FightStage, Phase, StageHost } from './stages/stage';
import { BattleVolleys } from './volleys';
import { keyOf, type SceneKey } from '../scenes/keys';
import { openParent } from '../scenes/ParentScene';

/** The top band where the health bars and a contest's meter (the race's track) are drawn: bubbles keep below it. */
const HUD_BAND = new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, 128);
/** The tallest VS card, either side (item 093: 340 cut chef Dada Jason's, 357, so Evil Dada Matt across from him read only 3% shorter). */
const CARD_MAX = 380;
/** The move choice's prompt lines that say the right word (`use_move_zap`, `find_move_zap`, `not_move_zap`): its caption hides it. */
const CHOICE_PROMPT: readonly MoveKind[] = ['use_move', 'find_move', 'not_move'];
/** `?battle=short`: the director's waits at this share of their length (item 083). */
const SHORT_BEATS = 0.2;

/** A taunt is said at most this often an episode (item 087). */
const TAUNT_MAX = 2;

export class BattleScene extends Phaser.Scene implements StageHost, ChoiceHost, StoryHost {
  part: 1 | 2 = 1;
  now = 0;
  /** The closing fade has started (`closeFade`). */
  private closing = false;
  /** The simulation (sim.ts), the volleys from her bag (volleys.ts) and the big beats (beats.ts): new each run (`init`). */
  sim!: BattleSim;
  private volleys!: BattleVolleys;
  private beats!: BattleBeats;
  private waits: { until: number; resolve: () => void }[] = [];
  phase: Phase = 'intro';
  heroes: Fighter[] = [];
  villain!: Fighter;
  /** The showdown's style (item 031) and its staging (src/battle/stages/). */
  fight!: FightSpec;
  show!: FightStage;
  /** The background's ARENAS key: the style's own place, else the villain's arena. */
  private arenaKey = 'meadow';
  controls!: Controls;
  private darkRect!: Phaser.GameObjects.Rectangle;
  /** The names, bars, fetched things and runes along the top (hud.ts). */
  hud!: BattleHud;
  /** The one banner showing, and until when a big one holds off the small ones. */
  private bannerText: Phaser.GameObjects.Text | null = null;
  private bannerBig = 0;
  /** The frame rate, sampled in `publish`; it also sets the particles' `fxQuality`. */
  private readonly fps = new FpsMeter();
  private simRate = 1;
  /** `?battle=short` (item 083): the director's waits cut (`beat`). */
  private readonly short = new URLSearchParams(location.search).get('battle') === 'short';
  /**
   * The director is a chain of awaits; once this run of the scene is over
   * (F2, the advance to the next step) nothing in the chain may resume.
   */
  private runs = new SceneGen(this);
  /** The move choice's pads and her walk to them (moveChoice.ts). */
  private readonly choices = new MoveChoice(this);
  /** Free play (item 060): her jump and casts while she steers her hero. */
  private play!: FreePlay;
  /** Her hero's `hop` is the free-play jump's (so landing zeroes only that one). */
  private playHop = false;
  /** Counts for the tests (hookState.battle, `BattleStats`), this part. */
  stats: BattleStats = noStats();
  /** Move choices opened this part: the first one is the hub's gift word. */
  private choicesOpened = 0;
  /** Big moves called out this part: each once (item 087: the same call three times in a fight was too many). */
  calledOut = new Set<string>();
  /** The step this battle was started with, so the parent page can come back to it. */
  private step: Step | undefined;
  /** A story fight (item 107): its director, the dad and the ally fighting, and her walk while one is open. */
  private story: StoryDirector | null = null;
  dad: Fighter | null = null;
  allyFighter: Fighter | null = null;
  storyWalk: StoryWalk | null = null;

  constructor() {
    super('Battle' satisfies SceneKey);
  }

  init(data: { step?: Step }): void {
    this.step = data.step;
    this.closing = false;
    this.part = data.step?.kind === 'battle' ? data.step.part : 1;
    // Scene data outlives a restart: F9 out of an open choice must not leave afterimages off (moveChoice.ts).
    this.data.set(NO_AFTERIMAGES, false);
    this.now = 0;
    // Its health floors by `part`, set above.
    this.sim = new BattleSim(this);
    this.volleys = new BattleVolleys(this);
    this.beats = new BattleBeats(this);
    this.waits = [];
    this.phase = 'intro';
    this.heroes = [];
    this.simRate = 1;
    this.choices.reset();
    this.stats = noStats();
    this.choicesOpened = 0;
    this.calledOut = new Set();
    this.bannerText = null;
    this.bannerBig = 0;
    this.story = null;
    this.dad = null;
    this.allyFighter = null;
    this.storyWalk = null;
  }

  create(): void {
    this.runs.begin();
    hookState.scene = 'Battle';
    hookState.room = null;
    const v = villainSpec();
    this.fight = fightStyle();
    this.arenaKey = this.fight.arena ?? v.arena;
    backdrop(this, `arena_${this.arenaKey}`, DEPTH.ground);
    this.darkRect = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0).setDepth(FLOOR_TOP - 5);
    this.controls = new Controls(this);
    this.play = new FreePlay(this, outfitFor(episode.hero, episode)?.id ?? null);
    this.playHop = false;
    // Lighter in battle: a small box and face at the bottom, so the fight stays in view.
    // The move choice's prompts say the word to find; the box prints "USE …!"
    // so she finds it on the pads by reading (item 043, M1).
    new Caption(this, { compact: true, hideWord: (u) => moveKeyWord(u.id, CHOICE_PROMPT) });
    // A bubble keeps clear of the bars at the top and of the banner showing (item 034), measured at its full size.
    new Bubbles(this, () => {
      const t = this.bannerText;
      if (!t?.active || t.alpha < 0.2) return [HUD_BAND];
      return [HUD_BAND, new Phaser.Geom.Rectangle(t.x - t.width / 2 - 10, t.y - t.height / 2 - 10, t.width + 20, t.height + 20)];
    });
    this.hud = new BattleHud(this);
    this.cameras.main.fadeIn(300);

    // The cast.
    const heroIds = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    heroIds.forEach((id, i) => {
      const spec = CHARACTER_BY_ID[id]!.good;
      const f = this.spawn(initFromSpec(spec, id, castArt(id), 'hero'), -120 - i * 100, 520 + i * 90);
      this.heroes.push(f);
    });
    if (episode.ally) this.allyFighter = this.heroes[1] ?? null;
    if (this.fight.kind === 'story') this.dad = this.storyDad();
    const vid = fighterId(episode.villain, true);
    this.villain = this.spawn(initFromSpec(v.evil, vid, castArt(episode.villain, true), 'villain'), GAME_WIDTH + 160, 540);
    if (this.part === 2) for (const h of this.heroes) h.power = 1.25;
    this.show = makeStage(this.fight.kind, this);
    this.show.setup();
    if (this.fight.kind === 'story' && this.fight.story) {
      this.story = new StoryDirector(this);
      this.story.setup();
    }

    this.hud.makeLabels(this.heroes, this.villain, this.part);
    fxQuality.level = 1;
    this.ambience();
    startMusic('battle');
    if (this.story) void this.story.run();
    else void (this.part === 1 ? this.part1() : this.part2());
  }

  /**
   * A story fight's dad (item 107): the ally when the ally is a dad; else the
   * dad who woke her joins the fight on her side, in his form (not when he is
   * the villain's or the hero's person). Null with no dad to bring.
   */
  private storyDad(): Fighter | null {
    if (this.allyFighter && isDad(personOf(this.allyFighter.init.id))) return this.allyFighter;
    const id = episode.primary;
    if (!id || !CHARACTER_BY_ID[id] || personOf(id) === personOf(episode.villain) || personOf(id) === personOf(episode.hero)) return null;
    const i = this.heroes.length;
    const f = this.spawn(initFromSpec(CHARACTER_BY_ID[id]!.good, id, castArt(id), 'hero'), -120 - i * 100, 520 + i * 60);
    this.heroes.push(f);
    return f;
  }

  /** A story fight's opening: the versus cards, the run-in, the banner. The characters do the talking after it. */
  async storyIntro(): Promise<void> {
    await this.runIn(true);
    await this.wait(1.4);
    for (const f of this.fighters) f.onStage = true;
    this.phase = 'story';
  }

  /** A story fight's minion or leftover helper, done with (item 107). */
  killFighter(f: Fighter): void {
    if (f.alive) this.sim.kill(f);
  }

  // -- BattleWorld (abilities.ts: what a cast may use; the fighters and hits are the sim's) --

  get stage(): Phaser.Scene {
    return this;
  }

  get fighters(): Fighter[] {
    return this.sim.fighters;
  }

  /** A story fight is playing (item 107): its beats say what the bag and the counter hold. */
  get inStory(): boolean {
    return this.story !== null;
  }

  // -- StageHost (item 031: what a fight style's staging may use) ---------------------

  get stick(): Phaser.Math.Vector2 {
    return this.controls.move;
  }

  get choosing(): boolean {
    return this.choices.active;
  }

  // -- ChoiceHost (moveChoice.ts: what the move choice may use) ------------------------

  get anchored(): boolean {
    return this.show.anchored;
  }

  /** A story fight's props as floor boxes (hunt 10, M54); null outside a story fight. */
  storyProps(): Box[] | null {
    return this.story?.propBoxes() ?? null;
  }

  /** The fight style's floor boxes a choice's rings keep off (hunt 11, M76: the clash point's flare). */
  choiceKeepOff(): Box[] {
    return this.show.choiceKeepOff?.() ?? [];
  }

  /** Tests (`__ww.place`, item 083): her hero onto (x, y) in a move choice or a story walk; false outside both. */
  placeHero(x: number, y: number): boolean {
    if (this.choices.active) return this.choices.place(x, y);
    return this.storyWalk?.place(x, y) ?? false;
  }

  stopPlay(): void {
    this.play.reset();
    this.playHop = false;
  }

  /**
   * A director's beat, in seconds: `?battle=short` (item 083, tests that need only the move
   * choice or the finish) cuts the waits between the story beats to a fifth; the beats
   * themselves (the combo, the ultimate, the finish) keep their length.
   */
  beat(s: number): number {
    return this.short ? s * SHORT_BEATS : s;
  }

  team(): Fighter[] {
    return this.heroes.filter((f) => f.active);
  }

  heroFrac(): number {
    const live = this.heroes.filter((h) => h.active);
    return live.length ? live.reduce((a, h) => a + h.hp / h.maxHp, 0) / live.length : 0;
  }

  villainFrac(): number {
    return this.villain?.active ? this.villain.hp / this.villain.maxHp : 0;
  }

  focus(x: number, y: number, zoom: number, holdMs: number): void {
    const cam = this.cameras.main;
    // One camera move at a time: a punch or an earlier push still running would fight this one.
    this.tweens.killTweensOf(cam);
    // Pan and zoom on the scene clock, so slow-mo and the choice freeze hold it too.
    this.tweens.add({ targets: cam, zoom, scrollX: (x - GAME_WIDTH / 2) * (1 - 1 / zoom), scrollY: (y - GAME_HEIGHT / 2) * (1 - 1 / zoom), duration: 300, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: cam, zoom: 1, scrollX: 0, scrollY: 0, delay: 300 + holdMs, duration: 400, ease: 'Sine.easeInOut' });
  }

  enemiesOf(f: Fighter): Fighter[] {
    return this.sim.enemiesOf(f);
  }

  alliesOf(f: Fighter): Fighter[] {
    return this.sim.alliesOf(f);
  }

  spawn(init: FighterInit, x: number, y: number): Fighter {
    return this.sim.spawn(init, x, y);
  }

  addProjectile(p: Projectile): void {
    this.sim.addProjectile(p);
  }

  addTrap(t: Trap): void {
    this.sim.addTrap(t);
  }

  /** Every hit: the sim's one damage path (`BattleSim.hit`, the health floors). */
  hit(target: Fighter, power: number, color: number, from: Fighter | null, status?: { kind: Status; duration: number }): void {
    this.sim.hit(target, power, color, from, status);
  }

  busy(f: Fighter, ms: number): void {
    f.busyUntil = Math.max(f.busyUntil, this.now + ms);
  }

  after(ms: number, fn: () => void): void {
    this.time.delayedCall(ms, fn);
  }

  held(f: Fighter): boolean {
    return this.show?.holds(f) ?? false;
  }

  darken(alpha: number, ms: number): void {
    this.tweens.add({ targets: this.darkRect, fillAlpha: alpha, duration: ms });
  }

  banner(text: string, color: number, big = false): void {
    // One banner at a time; a small one never covers a big one still showing.
    if (!big && this.now < this.bannerBig) return;
    this.bannerText?.destroy();
    if (big) this.bannerBig = this.now + 1400;
    const t = this.add
      .text(GAME_WIDTH / 2, big ? 230 : 150, text, {
        fontFamily: FONT_HEAVY,
        fontSize: big ? '76px' : '44px',
        color: '#ffffff',
        stroke: hex(color),
        strokeThickness: big ? 16 : 10,
        align: 'center',
        shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2);
    // A long name wraps between words, then shrinks: never off the screen.
    fitText(t, GAME_WIDTH - 80, big ? 300 : 200);
    this.bannerText = t;
    t.setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, delay: big ? 1300 : 800, duration: 400, onComplete: () => t.destroy() });
  }

  // -- director ----------------------------------------------------------------------

  /** Resolve after `s` seconds of simulation time (the director's and the stages' waits). */
  wait(s: number): Promise<void> {
    return this.guard(new Promise((resolve) => this.waits.push({ until: this.now + s * 1000, resolve })));
  }

  say(key: string): Promise<boolean> {
    return this.guard(voiceBus.say(narratorLine(narrator(), variant(key))));
  }

  guard<T>(p: Promise<T>): Promise<T> {
    return this.runs.guard(p);
  }

  /** The arena's falling/rising ambience (`ambience` on ARENAS; the meadow's for a key without one). */
  private ambience(): void {
    const c = ARENAS[this.arenaKey]?.ambience ?? ARENAS.meadow!.ambience;
    const [sxMin, sxMax] = c.speedX ?? [-25, 25];
    const [syMin, syMax] = c.speedY ?? (c.up ? [30, 90] : [40, 120]);
    const lifespan = c.lifespan ?? 9000;
    const scale = c.scale ?? (c.tex === 'ring' ? { start: 0.12, end: 0.2 } : c.tex === 'smoke' ? { start: 0.4, end: 1.2 } : { start: 0.7, end: 0.1 });
    type Particle = Phaser.GameObjects.Particles.Particle;
    this.add
      .particles(c.fromLeft ? -30 : 0, c.fromLeft ? 0 : c.up ? GAME_HEIGHT + 10 : -10, TEX[c.tex], {
        ...(c.fromLeft ? { y: { min: 40, max: GAME_HEIGHT - 20 } } : { x: { min: 0, max: GAME_WIDTH } }),
        speedY: c.up ? { min: -syMax, max: -syMin } : { min: syMin, max: syMax },
        speedX: { min: sxMin, max: sxMax },
        scale,
        ...(c.spin ? { rotate: { onEmit: () => Phaser.Math.Between(0, 359), onUpdate: (_p: Particle, _k: string, _t: number, v: number) => v + c.spin! } } : {}),
        alpha: c.alpha ?? { start: 0.8, end: 0 },
        lifespan,
        frequency: c.frequency ?? 140,
        tint: c.tint,
        blendMode: c.paint ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD,
      })
      .setDepth(FLOOR_TOP - 4);
  }

  /** Her own drawn height, the outfit's extra taken off (hunt 6, M32: an outfit's picture is drawn taller, by its hat). */
  heroHeight(): number {
    return this.heroes[0] ? this.heroes[0].height / outfitTall(this.heroes[0].init.art) : 150;
  }

  /** The fighting-game "VS" splash before Part 1. */
  private async versus(): Promise<void> {
    const ui = this.add.container(0, 0).setDepth(DEPTH.overlay + 5);
    const left = this.add.rectangle(-GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 2 + 60, GAME_HEIGHT, 0x2a5aff, 0.92).setOrigin(0.5);
    const right = this.add.rectangle(GAME_WIDTH * 1.5, GAME_HEIGHT / 2, GAME_WIDTH / 2 + 60, GAME_HEIGHT, 0xc8102e, 0.92).setOrigin(0.5);
    ui.add([left, right]);
    // Each card as tall beside hers as the fighter stands beside her (item 034: a dad is grown-up height here too).
    const me = this.heroHeight();
    const heroCards = this.heroes.map((h, i) => {
      const ch = Math.min(CARD_MAX, (220 * h.height) / me);
      return fitImage(this.add.image(-300 + i * 30, 440 + i * 40, h.init.art).setOrigin(0.5, 1), ch * 0.95, ch);
    });
    // A grown-up villain's card too (item 093: Evil Dada Matt's was the full 360, taller than Dada Jason's 330 across from him).
    const vh = this.villain.init.tall ? Math.min(CARD_MAX, (220 * this.villain.height) / me) : 360;
    const villainCard = fitImage(this.add.image(GAME_WIDTH + 300, 450, this.villain.init.art).setOrigin(0.5, 1), 300, vh);
    ui.add([...heroCards, villainCard]);
    const vs = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'VS', { fontFamily: FONT_HEAVY, fontSize: '160px', color: '#ffd23f', stroke: '#000000', strokeThickness: 20 })
      .setOrigin(0.5)
      .setScale(0);
    ui.add(vs);
    // These tweens run on the scene clock, which is not slowed during the intro.
    this.tweens.add({ targets: left, x: GAME_WIDTH / 4 - 30, duration: 300, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: right, x: (GAME_WIDTH * 3) / 4 + 30, duration: 300, ease: 'Cubic.easeOut' });
    heroCards.forEach((c, i) => this.tweens.add({ targets: c, x: (heroCards.length === 1 ? 300 : 180) + i * 210, duration: 400, delay: 150, ease: 'Back.easeOut' }));
    this.tweens.add({ targets: villainCard, x: GAME_WIDTH - 280, duration: 400, delay: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: vs, scale: 1, angle: { from: -30, to: 0 }, duration: 350, delay: 400, ease: 'Back.easeOut' });
    this.after(450, () => {
      sfxBoom(2);
      shake(this, 4, 250);
      burst(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, { count: 80, speed: 700, depth: DEPTH.overlay + 6, colors: [0xffd23f, 0xffffff, 0xff5ab4] });
    });
    await this.wait(this.beat(2.0));
    this.tweens.add({ targets: ui, alpha: 0, duration: 300, onComplete: () => ui.destroy() });
    await this.wait(0.3);
  }

  /**
   * Both intros' opening: the versus cards in part 1, everybody running in from the sides
   * (to the style's own spots, if it has them; `lift`: the heroes up to their resting height
   * on the way, as a story fight's marks want), the banner and the fanfare.
   */
  private async runIn(lift: boolean): Promise<void> {
    this.phase = 'intro';
    if (this.part === 1) await this.versus();
    this.heroes.forEach((h, i) => {
      const to = this.show.home(h, i) ?? { x: BRAWL.intro.x + i * BRAWL.intro.dx, y: h.y };
      this.tweens.add({ targets: h, x: to.x, y: to.y, ...(lift ? { lift: restLift(h) } : {}), duration: 900, ease: 'Quad.easeOut' });
    });
    const vto = this.show.home(this.villain, 0) ?? { x: BRAWL.intro.villainX, y: this.villain.y };
    this.tweens.add({ targets: this.villain, x: vto.x, y: vto.y, duration: 1100, ease: 'Quad.easeOut' });
    this.banner(this.fight.banner[this.part - 1]!, 0xff3d7a, true);
    sfxFanfare();
  }

  private async intro(): Promise<void> {
    await this.runIn(false);
    await this.say(fightLineKey(this.fight, this.part === 1 ? 'start' : 'start2'));
    if (this.part === 2) await this.villainSays();
    for (const f of this.fighters) f.onStage = true;
    this.phase = 'fight';
  }

  private async part1(): Promise<void> {
    await this.intro();
    await this.wait(this.beat(1.5));
    await this.useAllFetched(this.beat(3.5));
    await this.useCharged(this.beat(RUNE_GAP));
    // 2.5 s to 1.5 (hunt 11, M62): with Charge's runes, PICK A MOVE! under 26 s after the bag opens.
    await this.wait(this.beat(1.5));
    await this.moveChoice();
    await this.wait(this.beat(7));
    await this.beats.combo();
    await this.wait(this.beat(6));
    await this.moveChoice();
    await this.wait(this.beat(7));
    await this.beats.ultimate();
    this.phase = 'end';
    await this.villainSays();
    await this.say(fightLineKey(this.fight, 'retreat'));
    this.retreat();
    await this.wait(this.beat(1.4));
    await this.closeAndAdvance();
  }

  private async part2(): Promise<void> {
    await this.intro();
    await this.wait(this.beat(1));
    await this.useAllFetched(this.beat(3));
    await this.useCharged(this.beat(RUNE_GAP));
    await this.wait(this.beat(2));
    await this.moveChoice();
    await this.wait(this.beat(6));
    await this.beats.combo();
    await this.wait(this.beat(5));
    await this.moveChoice();
    await this.wait(this.beat(5));
    await this.beats.ultimate();
    await this.finish();
    this.phase = 'end';
    await this.wait(this.beat(1.2));
    await this.closeAndAdvance(true);
  }

  /**
   * Every ending of the fight, the brawl's and the story director's: the closing fade, then on to the next
   * step. One place, so no ending can skip `closing` (the F9 guard, `closeFade`).
   */
  async closeAndAdvance(white = false): Promise<void> {
    this.closeFade(white);
    await this.wait(0.6);
    advance(this);
  }

  /**
   * The fight's closing fade (black on the retreat, white on the victory). From here F9 waits (hunt 10, fix
   * 145). A flag, not the camera's fade state: the opening fade-in leaves `isComplete` set, so that check shut
   * F9 out of every battle from its first 300 ms (hunt 11).
   */
  private closeFade(white = false): void {
    this.closing = true;
    if (white) this.cameras.main.fadeOut(500, 255, 255, 255);
    else this.cameras.main.fadeOut(500);
  }

  /**
   * Part 1's end: the heroes bounce back up and run off left to get ready, so
   * the fade is on a retreat, never on a floored team. The villain stomps.
   */
  retreat(): void {
    this.team().forEach((h, i) => {
      // Off the stage edge: the on-screen clamp lets go, and no shove pins her to the wall.
      h.onStage = false;
      h.busyUntil = Infinity;
      this.after(i * 120, () => {
        h.floored = false;
        h.status = null;
        h.clearOverlay();
        h.lean = -0.25;
        h.squash(0.3);
        sfxWhoosh();
        burst(this, h.x, h.y, { count: 22, speed: 260, colors: [0xd9c7a0, 0xffffff] });
        this.tweens.addCounter({ from: 0, to: 1, duration: 380, onUpdate: (tw) => (h.hop = Math.sin((tw.getValue() ?? 0) * Math.PI) * 80), onComplete: () => (h.hop = 0) });
        this.tweens.add({ targets: h, x: -220, duration: 900, delay: 200, ease: 'Quad.easeIn' });
        this.tweens.add({ targets: h.root, alpha: 0, duration: 300, delay: 800 });
      });
    });
    const v = this.villain;
    if (v.active) this.tweens.add({ targets: v.root, scaleY: 0.9, duration: 140, yoyo: true, repeat: 3 });
    this.show.retreat();
  }

  /** The villain gets a word in at the big beats: a gloat, a challenge. */
  private async villainSays(): Promise<void> {
    const key = this.pickTaunt(this.villain);
    if (!key) return;
    await this.guard(voiceBus.say(tauntLine(this.villain.init.id, key), 'instruction', this.villain));
  }

  /** Every key word she fetched in the house, in volleys `gap` seconds apart (volleys.ts). */
  useAllFetched(gap: number): Promise<void> {
    return this.volleys.useAllFetched(gap);
  }

  /** Charge the Spell's runes, if charged for this part (volleys.ts). */
  useCharged(gap: number): Promise<void> {
    return this.volleys.useCharged(gap);
  }

  /**
   * Who fires a planned move word: the owner hero (her own hero for the gift
   * word) with the ability of character `from`, or with no `from` the word's
   * own effect (item 037, word magic). A word whose effect is missing still
   * fires: a plain bolt in gold, so a choice never fizzles for want of data.
   */
  private ownerOf(o: MoveOwner, word: string): { f: Fighter; ab: AbilitySpec } | null {
    const f = this.heroes.find((h) => h.init.id === o.fighter) ?? this.heroes[0];
    const ab =
      o.from === null
        ? wordEffect(word)
        : CHARACTER_BY_ID[o.from]?.good.abilities.find((a) => a.id === o.ability);
    return f && ab ? { f, ab } : null;
  }

  /** Every word on a move pad still to come this episode. */
  private upcomingPads(): Set<string> {
    const plan = movePlan();
    // The open choice's pads count until it closes (item 069: a hit floated ZAP! over a fighter beside the ZAP pad).
    const from = this.choices.active ? this.choicesOpened - 1 : this.choicesOpened;
    const ahead = [...plan.part1.slice(this.part === 1 ? from : plan.part1.length), ...plan.part2.slice(this.part === 2 ? from : 0)];
    return new Set(ahead.flatMap((c) => c.words));
  }

  /**
   * Whether saying this line now would give a move choice away: it says a
   * word that is on a pad still to come ("Hop on my broom!" before a HOP
   * pad, a move called out by a name with a pad word in it). Only what is
   * spoken counts, so a move's extra `words` never silence its name.
   */
  lineGivesAway(id: string): boolean {
    const text = voiceBank.get(id)?.text;
    return !!text && this.textGivesAway(text);
  }

  /**
   * Whether showing or saying `text` now would give a move choice away: it
   * has a word on a pad still to come (a ROCKET HOP! banner before a HOP
   * pad; item 030). Banners are held to it as well as spoken lines.
   */
  textGivesAway(text: string): boolean {
    const upcoming = this.upcomingPads();
    // A pad word inside a longer one counts too: SPINNY before SPIN, HUGS before HUG (item 039).
    return withStems(wordsOf(text)).some((w) => upcoming.has(w));
  }

  /** A fighter's taunts that give no move choice away. */
  private safeTaunts(f: Fighter): string[] {
    // Nor one that does not fit today's outfit (a knight has no wand).
    const skip = f.team === 'hero' ? outfitFor(f.init.id, episode)?.skipTaunts ?? [] : [];
    return (f.init.taunts ?? []).filter((k) => !skip.includes(k) && !this.lineGivesAway(tauntLine(f.init.id, k)));
  }

  /** The move-choice pause. */
  async moveChoice(): Promise<void> {
    // The words were planned with the episode (src/rules/moves.ts): the first
    // of each part is the hub's gift word, the rest come from her move bag
    // (a story fight's from src/rules/storyFight.ts: only part 1 opens on the gift).
    const planned = movePlan()[this.part === 1 ? 'part1' : 'part2'][this.choicesOpened];
    const me = this.heroes[0]!;
    const owner = planned && this.ownerOf(planned.owner, planned.right);
    if (!planned || !owner || planned.words.length < 2) return;
    const { words, right } = planned;
    this.choicesOpened++;
    // Which choice this is, for what survives a trip to the grown-ups page (F9 restarts the battle).
    const choiceKey = `move:${this.part}:${this.choicesOpened}`;

    this.phase = 'choice';
    this.simRate = 0.04;
    // She has to be able to walk: no pig, no ice block during the choice.
    me.status = null;
    me.clearOverlay();
    // ...and nothing half-done: no move in flight, no hop, no leap height. She is free at once.
    me.busyUntil = this.now;
    delete me.mem.stepTo;
    me.hop = 0;
    me.spin = 0;
    me.lean = 0;
    me.vx = 0;
    me.vy = 0;
    const at = { x: me.x, y: me.y, lift: restLift(me) };
    me.lift = at.lift;
    // The last big banner ("ROCKET FISTS!") is frozen with the clock: clear it from under PICK A MOVE.
    this.bannerText?.destroy();
    this.bannerText = null;
    this.bannerBig = 0;
    // The pads, until she walks onto the right one (moveChoice.ts).
    // Two of a planned three when three rings cannot keep off a contest's held team (hunt 11, M65): `shown`.
    const { misses, shown } = await this.choices.open(words, right, choiceKey, me, at);
    this.choices.close();
    this.sim.defuseNear(me);
    me.lean = 0;
    this.simRate = 1;
    this.stats.movePicks++;
    // Only the right pad ever closes the choice; the misses are recorded, never punished.
    // Once per choice per episode: back from F9 the battle replays, and a
    // choice already answered must not be recorded or bagged twice (item 039).
    const answered = (episode.house.misses ??= {});
    if (answered[`${choiceKey}:done`] === undefined) {
      answered[`${choiceKey}:done`] = misses;
      progress.record('words', right, misses === 0, misses);
      // Her move bag spends a word only when she picks it right first time; a missed one stays in.
      if (misses === 0) progress.takeFromBag(right, 'moves');
      else progress.returnToBag(right, 'moves');
      // The wrong pads have had their turn: others come up next time (item 038).
      for (const w of shown) if (w !== right) progress.takeFromBag(w, 'pads');
    }
    // The victory recap reads episode.read: a battle word she picked right is one she read.
    if (!episode.read.includes(right)) episode.read.push(right);
    const { f, ab } = owner;
    // The super frees its hero from any pig or ice.
    f.status = null;
    f.clearOverlay();
    sfxRight();
    flash(this, 0xffffff, 200);
    slowmo(this, 0.3, 1200);
    punch(this, 0.07, 200);
    speedLines(this, f.cx, f.cy, ab.color, 700);
    shockwave(this, f.cx, f.cy, ab.color, 300);
    burst(this, f.cx, f.cy, { count: 80, speed: 600, colors: [ab.color, 0xffd23f, 0xffffff] });
    f.setShield(1, 0xffd23f, this.now);
    // Part 1's villain floor a step down first, so the super takes a visible bite (hunt 11, M63).
    this.sim.stepVillainFloor();
    cast(this, f, ab, this.villain, 2.4, true);
    this.show.superMove(f, ab, right);
    // The word's own effect: a fan of its pictures. Its name on the banner: she has read it.
    this.beats.wordFx(right, f, ab.color);
    this.banner(`SUPER ${right.toUpperCase()}!`, 0xffd23f, true);
    void (async () => {
      // Called out once a part, barks and supers alike (item 087).
      const call = moveLine(f.init.id, ab.id);
      if (voiceBank.has(call) && !this.calledOut.has(call) && !this.lineGivesAway(call)) {
        this.calledOut.add(call);
        await this.guard(voiceBus.say(call, 'instruction', f));
      }
      await this.say('move_great');
    })();
    this.stats.abilitiesFired++;
    this.phase = 'fight';
  }

  // The story fight's director runs the ultimate and the finish beat by beat (beats.ts).

  ultimateWindUp(): Promise<WindUp> {
    return this.beats.ultimateWindUp();
  }

  ultimateFloors(w: WindUp): Promise<void> {
    return this.beats.ultimateFloors(w);
  }

  ultimateCountered(w: WindUp): Promise<void> {
    return this.beats.ultimateCountered(w);
  }

  finish(): Promise<void> {
    return this.beats.finish();
  }

  /**
   * A fighter's next taunt (item 087): the least said this episode, and none
   * a third time (a fighter who has said all of them twice goes quiet).
   */
  pickTaunt(f: Fighter): string | undefined {
    return pickTaunt(f.init.id, this.safeTaunts(f), TAUNT_MAX);
  }

  // -- frame -------------------------------------------------------------------------

  override update(_time: number, deltaMs: number): void {
    this.controls.update();
    const base = timeScale(this);
    const ts = base * this.simRate;
    this.tweens.timeScale = ts;
    this.time.timeScale = ts;
    // Particle emitters keep their own clock; without this they pour out at
    // full rate through the move-choice freeze and hit-stop.
    for (const obj of this.children.list) {
      // Free play's pooled emitters stay on real time, like its shots.
      if (obj instanceof Phaser.GameObjects.Particles.ParticleEmitter && !obj.getData('freePlay')) obj.timeScale = ts;
    }
    const realDt = Math.min(0.05, deltaMs / 1000);
    const dt = realDt * ts;
    this.now += deltaMs * ts;

    // Director waits.
    const due = this.waits.filter((w) => w.until <= this.now);
    this.waits = this.waits.filter((w) => w.until > this.now);
    for (const w of due) w.resolve();

    // The choice runs on real time: she walks while the fight is frozen.
    if (this.choices.active) this.choices.update(realDt);
    // A story fight's walk (item 107) runs on real time too.
    this.storyWalk?.update(realDt);

    // Free play (item 060): outside a choice, while she steers her hero, green
    // jumps and blue / red / yellow cast. Pure show: shots hit nothing, and the
    // jump only lifts her sprite (on real time, so slow-mo does not hang her in the air).
    const me = this.heroes[0];
    if (me) {
      const open = !this.choices.active && me.active && !me.floored && (this.phase === 'fight' || this.phase === 'combo');
      const wasUp = this.play.airborne;
      const body = { x: me.cx, y: me.y, mid: me.y - me.cy + me.height * 0.05, face: Math.sign(this.villain.x - me.x) || 1 };
      this.play.update(this.controls, realDt, body, open, { green: true, cast: ['blue', 'red', 'yellow'] });
      if (this.play.airborne) {
        if (!wasUp) me.squash(0.3);
        me.hop = this.play.height;
        this.playHop = true;
      } else if (this.playHop) {
        // Only the hop free play set: the retreat's bounce owns its own.
        me.hop = 0;
        this.playHop = false;
      }
    }

    this.sim.stepFighters(dt);
    this.show.update(dt);
    if (this.choices.active) this.choices.holdHero();
    this.storyWalk?.holdHero();
    this.sim.stepShots(dt);
    this.sim.taunt();
    this.hud.draw(this.heroes, this.villain, this.show);

    if (this.controls.dev('F2') && !isLeaving(this)) advance(this);
    // Not once the closing fade has started (hunt 10): the fight was over, and coming back played it all again,
    // as the rooms, the ending and the victory scene already guard.
    else if (this.controls.dev('F9') && !isLeaving(this) && !this.closing) {
      // The grown-ups' page; it comes back to this battle (restarted) when closed. Marked
      // leaving (item 092): the director's last wait resolving this frame started the next step too.
      markLeaving(this);
      openParent(this, { back: keyOf(this), data: { step: this.step } });
      return;
    }
    this.controls.endFrame();
    this.publish();
  }

  private publish(): void {
    // Thin the particles when frames drop; restore them when they recover.
    this.fps.sample(this.game.loop.delta, true);
    const info = (f: Fighter) => ({ id: f.init.id, hp: Math.round((100 * f.hp) / f.maxHp), status: f.floored ? 'floored' : (f.status?.kind ?? null), art: f.init.art, drawn: Math.round(f.sprite.height * f.baseScale) });
    hookState.battle = {
      part: this.part,
      fight: this.fight.id,
      stage: this.show.info(),
      phase: this.phase,
      fading: this.closing,
      t: Math.round(this.now) / 1000,
      heroes: this.heroes.map(info),
      villains: [info(this.villain)],
      minions: this.fighters.filter((f) => f.active && !f.isMain).length,
      heroClones: this.fighters.filter((f) => f.active && f.init.kind === 'clone' && f.team === 'hero').length,
      ...this.stats,
      me: this.heroes[0] ? { x: Math.round(this.heroes[0].x), y: Math.round(this.heroes[0].y) } : null,
      choice: this.choices.info(),
      story: this.story?.info() ?? null,
    };
  }
}
