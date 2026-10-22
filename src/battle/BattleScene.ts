/**
 * The battle: a free simulation, not a scripted sequence, with a director
 * steering it to a fixed story.
 *
 * The simulation: every fighter moves in its own style (movement.ts) and uses
 * its abilities on its own cooldowns (abilities.ts), choosing targets as it
 * goes; minions, clones, projectiles and traps are all live. Taunts go through
 * the voice arbiter as barks, in bubbles that follow the speaker.
 *
 * The director (`part1()` / `part2()`): health bars are cosmetic and steered.
 * Nobody important can be knocked out by the simulation (floors in `hit()`),
 * and the story beats are placed on the simulation clock:
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

import { CHARACTER_BY_ID, MINIONS, abilityCallout, comboFor, comboPart } from '../../content/battle/roster';
import type { AbilitySpec, CounterItem, Status } from '../../content/battle/types';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import { RUNE_BY_SOUND } from '../../content/phonics/runes';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { fighterId, letterSoundLine, moveLine, nameLine, narratorLine, reformedLine, tauntLine, ultimateLine } from '../../content/voice/ids';
import { startMusic, stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxFanfare, sfxHit, sfxPoof, sfxRight, sfxShield, sfxShout, sfxSummon, sfxUltimate, sfxWhoosh } from '../audio/sfx';
import { DEPTH, FONT_COMIC, FONT_HEAVY, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { formFor } from '../../content/battle/forms';
import { advance, castArt, castScale, counterArt, counterWord, episode, fightStyle, helper, movePlan, namedCounter, narrator, reformedOf, villainSpec, type Step } from '../episode/Episode';
import { pickTaunt, unsayTaunt, variant } from '../episode/lineVariants';
import { fightLineKey, type FightSpec } from '../../content/battle/fights';
import { hex } from '../fx/colour';
import { burst, fitImage, flash, floatText, fxQuality, hitstop, popIn, punch, shake, shockwave, slowmo, speedLines, timeScale } from '../fx/juice';
import { FreePlay } from '../fx/freePlay';
import { SceneGen, isLeaving, markLeaving } from '../fx/sceneGen';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { withStems } from '../rules/bank';
import type { MoveOwner } from '../rules/moves';
import { progress } from '../state/progress';
import { hookState } from '../hookState';
import { voiceBank } from '../voice/VoiceBank';
import { Bubbles } from '../ui/Bubbles';
import { Caption } from '../ui/Caption';
import { fitText } from '../ui/fitText';
import { cast, type Projectile, type Trap } from './abilities';
import { Fighter, FLOOR_BOTTOM, FLOOR_TOP, initFromMinion, initFromSpec, type FighterInit } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT, integrate, STEER } from './movement';
import { BattleHud } from './hud';
import { MoveChoice, type ChoiceHost } from './moveChoice';
import { makeStage } from './stages';
import type { FightStage, Phase, StageHost } from './stages/stage';

/** Cosmetic damage per point of ability power. Tuned so bars drift, not drop. */
const DAMAGE_PER_POWER = 2.6;
/** Two fighters closer than this in depth (px of floor) stand side by side, and their bodies must not overlap (item 034). */
const SAME_DEPTH = 70;
/** Hit words (BAM!, BLOCK!) float under the move pads' signs: a sign's word is never covered (item 034). */
const HIT_FLOAT = DEPTH.prompt - 20;
/** The top band where the health bars and a contest's meter (the race's track) are drawn: bubbles keep below it. */
const HUD_BAND = new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, 128);
/** The move choice's prompt lines that say the right word (`use_move_zap`, `find_move_zap`, `not_move_zap`): its caption hides it. */
const CHOICE_PROMPT = /_(?:use_move|find_move|not_move)_([a-z]+)$/;
/**
 * Where the brawl puts everybody (a contest's stage has its own places: `show.home`,
 * `show.anchored`, `show.steer`). `intro`: the run-in, the i-th hero at `x + i * dx`, the
 * villain at `villainX`. `fight`: the ground each side drifts back to while fighting, so it
 * stays framed heroes-left, villain-right: the i-th hero's at `heroX - i * heroDx` (each
 * their own, item 034), pulled at `heroPull` a second, the villain's at `villainX` at
 * `villainPull`. `ult`: the sides for the ultimate, the i-th hero at (`x + i * dx`,
 * `y + i * dy`), the helper behind, the villain on the right (a giant further out, on the
 * front edge of the floor).
 */
const BRAWL = {
  intro: { x: 260, dx: 140, villainX: 960 },
  fight: { heroX: 430, heroDx: 160, heroPull: 0.8, villainX: 900, villainPull: 1.2 },
  ult: { x: 260, dx: 150, y: 500, dy: 70, helper: { x: 150, y: 600 }, villain: { x: 900, y: 560 }, giantX: 960 },
} as const;
/** `?battle=short`: the director's waits at this share of their length (item 083). */
const SHORT_BEATS = 0.2;

/** A taunt is said at most this often an episode (item 087). */
const TAUNT_MAX = 2;

/** What Part 2's counter stagings share (`ultimateCountered`): her hero `h`, and the counter-item's picture, its glow and its scale before the pop-in. */
interface CounterBeat {
  v: Fighter;
  ult: AbilitySpec;
  giant: boolean;
  h: Fighter;
  item: Phaser.GameObjects.Image;
  halo: Phaser.GameObjects.Image;
  s: number;
  name: string;
  how: CounterItem['how'];
}

export class BattleScene extends Phaser.Scene implements StageHost, ChoiceHost {
  part: 1 | 2 = 1;
  now = 0;
  fighters: Fighter[] = [];
  private projectiles: Projectile[] = [];
  private traps: Trap[] = [];
  private waits: { until: number; resolve: () => void }[] = [];
  phase: Phase = 'intro';
  heroes: Fighter[] = [];
  villain!: Fighter;
  helper: Fighter | null = null;
  /** The showdown's style (item 031) and its staging (src/battle/stages/). */
  fight!: FightSpec;
  private show!: FightStage;
  /** The background's ARENAS key: the style's own place, else the villain's arena. */
  private arenaKey = 'meadow';
  controls!: Controls;
  private darkRect!: Phaser.GameObjects.Rectangle;
  /** The names, bars, fetched things and runes along the top (hud.ts). */
  private hud!: BattleHud;
  private simRate = 1;
  /** `?battle=short` (item 083): the director's waits cut (`beat`). */
  private readonly short = new URLSearchParams(location.search).get('battle') === 'short';
  private teamNextCast = { hero: 0, villain: 0 };
  private nextTaunt = 4000;
  /** The move choice's pads and her walk to them (moveChoice.ts). */
  private readonly choices = new MoveChoice(this);
  /** Free play (item 060): her jump and casts while she steers her hero. */
  private play!: FreePlay;
  /** Her hero's `hop` is the free-play jump's (so landing zeroes only that one). */
  private playHop = false;
  /** Health floors (fraction of max) the director allows right now. */
  private floors = { heroMain: 0.3, villainMain: 0.4 };
  /** Counts for the tests (hookState.battle): `itemsUsed` the fetched items used, `runesFired` Charge the Spell's runes (item 053), this part. */
  private stats = { abilitiesFired: 0, ultimates: 0, combos: 0, movePicks: 0, itemsUsed: 0, runesFired: 0 };
  private targetOf = new Map<number, { f: Fighter; until: number }>();
  /** Move choices opened this part: the first one is the hub's gift word. */
  private choicesOpened = 0;
  /** "Look what we found!" is said once per part, at the first item out of the bag. */
  private bagSaid = false;
  /** Big moves called out this part: each once (item 087: the same call three times in a fight was too many). */
  private calledOut = new Set<string>();
  /** The step this battle was started with, so the parent page can come back to it. */
  private step: Step | undefined;

  constructor() {
    super('Battle');
  }

  init(data: { step?: Step }): void {
    this.step = data.step;
    this.part = data.step?.kind === 'battle' ? data.step.part : 1;
    // Scene data outlives a restart: F9 out of an open choice must not leave afterimages off (moveChoice.ts).
    this.data.set('noAfterimages', false);
    this.now = 0;
    this.fighters = [];
    this.projectiles = [];
    this.traps = [];
    this.waits = [];
    this.phase = 'intro';
    this.heroes = [];
    this.helper = null;
    this.simRate = 1;
    this.teamNextCast = { hero: 0, villain: 0 };
    this.nextTaunt = 4000;
    this.choices.reset();
    this.floors = { heroMain: 0.3, villainMain: this.part === 1 ? 0.45 : 0.3 };
    this.stats = { abilitiesFired: 0, ultimates: 0, combos: 0, movePicks: 0, itemsUsed: 0, runesFired: 0 };
    this.targetOf = new Map();
    this.choicesOpened = 0;
    this.bagSaid = false;
    this.calledOut = new Set();
    this.bannerText = null;
    this.bannerBig = 0;
  }

  create(): void {
    this.runs.begin();
    hookState.scene = 'Battle';
    hookState.room = null;
    const v = villainSpec();
    this.fight = fightStyle();
    this.arenaKey = this.fight.arena ?? v.arena;
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `arena_${this.arenaKey}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.ground);
    this.darkRect = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0).setDepth(FLOOR_TOP - 5);
    this.controls = new Controls(this);
    this.play = new FreePlay(this, formFor(episode.hero, episode)?.id ?? null);
    this.playHop = false;
    // Lighter in battle: a small box and face at the bottom, so the fight stays in view.
    // The move choice's prompts say the word to find; the box prints "USE …!"
    // so she finds it on the pads by reading (item 043, M1).
    new Caption(this, { compact: true, hideWord: (u) => CHOICE_PROMPT.exec(u.id)?.[1] });
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
    const vid = fighterId(episode.villain, true);
    this.villain = this.spawn(initFromSpec(v.evil, vid, castArt(episode.villain, true), 'villain'), GAME_WIDTH + 160, 540);
    if (this.part === 2) for (const h of this.heroes) h.power = 1.25;
    this.show = makeStage(this.fight.kind, this);
    this.show.setup();

    this.hud.makeLabels(this.heroes, this.villain, this.part);
    fxQuality.level = 1;
    this.ambience();
    startMusic('battle');
    void (this.part === 1 ? this.part1() : this.part2());
  }

  // -- BattleWorld ------------------------------------------------------------------

  get stage(): Phaser.Scene {
    return this;
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

  /** Tests (`__ww.place`, item 083): her hero onto (x, y) in a move choice; false outside one. */
  placeHero(x: number, y: number): boolean {
    return this.choices.active && this.choices.place(x, y);
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
  private beat(s: number): number {
    return this.short ? s * SHORT_BEATS : s;
  }

  team(): Fighter[] {
    return [...this.heroes, ...(this.helper ? [this.helper] : [])].filter((f) => f.active);
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
    return this.fighters.filter((x) => x.active && x.team !== f.team && !x.floored);
  }

  alliesOf(f: Fighter): Fighter[] {
    return this.fighters.filter((x) => x.active && x.team === f.team && x !== f);
  }

  spawn(init: FighterInit, x: number, y: number): Fighter {
    const f = new Fighter(this, init, x, y);
    this.fighters.push(f);
    return f;
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p);
  }

  addTrap(t: Trap): void {
    this.traps.push(t);
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

  private bannerText: Phaser.GameObjects.Text | null = null;
  private bannerBig = 0;

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

  /**
   * Every hit goes through here: shields, invulnerability, the director's
   * health floors, hit flash, knockback, numbers-free feedback, statuses.
   */
  hit(target: Fighter, power: number, color: number, from: Fighter | null, status?: { kind: Status; duration: number }): void {
    if (!target.active || target.floored) return;
    // Nothing left over (a sword ring flung late) dents the villain while her
    // ultimate charges: that is her big moment, and a white hit flash spoils it.
    if (this.phase === 'ultimate' && target === this.villain) return;
    // Nothing touches her hero while she walks to a pad: a trap or a slowed
    // bolt turned her into a pig or an ice block mid-choice (item 039).
    if (this.choices.active && target === this.heroes[0]) return;
    if (target.invulnerable || target.shieldUntil > this.now) {
      burst(this, target.cx, target.cy, { count: 12, speed: 200, colors: [0xffffff, color] });
      if (target.isMain && Math.random() < 0.3) floatText(this, target.cx, target.top, 'BLOCK!', '#7ad9ff', 30, HIT_FLOAT);
      return;
    }
    // Clones pop on any hit.
    if (target.init.kind === 'clone') {
      sfxPoof();
      burst(this, target.cx, target.cy, { count: 30, speed: 300, colors: [target.init.palette[1], 0xffffff] });
      floatText(this, target.cx, target.top, 'POOF!', '#ffffff', 30, HIT_FLOAT);
      this.kill(target);
      return;
    }
    const dmg = power * DAMAGE_PER_POWER;
    const floor = target.isMain ? (target.team === 'hero' ? this.floors.heroMain : this.floors.villainMain) * target.maxHp : 0;
    // The floor stops a fall; it never lifts anybody back up.
    target.hp = Math.min(target.hp, Math.max(floor, target.hp - dmg));
    target.flashWhite();
    target.squash(Math.min(0.4, 0.12 + power * 0.06));
    if (from) target.x = Phaser.Math.Clamp(target.x + Math.sign(target.x - from.x || 1) * Math.min(40, power * 10), ARENA_LEFT, ARENA_RIGHT);
    sfxHit(power);
    burst(this, target.cx, target.cy, { count: Math.min(40, 8 + power * 6), speed: 200 + power * 60, colors: [color, 0xffffff] });
    if (power >= 3) {
      hitstop(this, 60);
      shake(this, power, 160);
    }
    if (power >= 2 && Math.random() < 0.35) {
      // Not a word on a move pad still to come (POW, BAM and ZAP are move words).
      const words = ['POW!', 'BAM!', 'ZAP!', 'BOOM!', 'WHAM!'].filter((w) => !this.textGivesAway(w));
      floatText(this, target.cx, target.top, words[Math.floor(Math.random() * words.length)]!, hex(color), 34, HIT_FLOAT);
    }
    if (status && !(target.isMain && target.team === 'villain' && this.part === 1 && Math.random() < 0.5)) target.setStatus(status.kind, status.duration, this.now);
    this.show.onHit(target, power, from);
    if (!target.isMain && target.hp <= 0) this.kill(target);
  }

  private kill(f: Fighter): void {
    if (!f.alive) return;
    f.alive = false;
    sfxPoof();
    burst(this, f.cx, f.cy, { count: 30, speed: 300, colors: [f.init.palette[0], f.init.palette[1], 0xffffff] });
    // Pop out with a squash, never a spin: sprites only bob and squash.
    this.tweens.add({ targets: f.root, scaleX: 1.4, scaleY: 0, duration: 250, ease: 'Back.easeIn', onComplete: () => f.destroy() });
  }

  // -- director ----------------------------------------------------------------------

  /** Resolve after `s` seconds of simulation time (the director's and the stages' waits). */
  wait(s: number): Promise<void> {
    return this.guard(new Promise((resolve) => this.waits.push({ until: this.now + s * 1000, resolve })));
  }

  say(key: string): Promise<boolean> {
    return this.guard(voiceBus.say(narratorLine(narrator(), variant(key))));
  }

  /**
   * The director is a chain of awaits; once this run of the scene is over
   * (F2, the advance to the next step) nothing in the chain may resume.
   */
  private runs = new SceneGen(this);

  guard<T>(p: Promise<T>): Promise<T> {
    return this.runs.guard(p);
  }

  /** Falling/rising ambience per arena: embers, snow, sand, bubbles, sparks. */
  private ambience(): void {
    const arena = this.arenaKey;
    const cfg: Record<string, { tint: number[]; up: boolean; tex: string }> = {
      meadow: { tint: [0xffffff, 0xffd23f, 0xff9ad5], up: false, tex: TEX.spark },
      volcano: { tint: [0xff7b00, 0xffd23f, 0xff3d00], up: true, tex: TEX.spark },
      kitchen: { tint: [0xffffff, 0xfff1d6], up: true, tex: TEX.smoke },
      castle: { tint: [0xffd23f, 0xff9a3c], up: true, tex: TEX.spark },
      ice: { tint: [0xffffff, 0xdff4ff], up: false, tex: TEX.spark },
      desert: { tint: [0xe8c890, 0xffe8b0], up: false, tex: TEX.pixel },
      sea: { tint: [0x9ad8ff, 0xffffff], up: true, tex: TEX.ring },
      cave: { tint: [0xffd23f, 0xff7b00], up: true, tex: TEX.spark },
      factory: { tint: [0x00f5d4, 0xffcc33], up: false, tex: TEX.pixel },
      city: { tint: [0xa0b0c0, 0xffffff], up: false, tex: TEX.smoke },
      sky_race: { tint: [0xffd23f, 0xff7b00, 0xffffff], up: true, tex: TEX.spark },
      spell_tower: { tint: [0xb04aff, 0x80ffdb, 0xffffff], up: true, tex: TEX.spark },
      cook_show: { tint: [0xffffff, 0xff9ad5, 0xffd23f], up: false, tex: TEX.spark },
    };
    const c = cfg[arena] ?? cfg.meadow!;
    this.add
      .particles(0, c.up ? GAME_HEIGHT + 10 : -10, c.tex, {
        x: { min: 0, max: GAME_WIDTH },
        speedY: c.up ? { min: -90, max: -30 } : { min: 40, max: 120 },
        speedX: arena === 'desert' ? { min: 120, max: 260 } : { min: -25, max: 25 },
        scale: c.tex === TEX.ring ? { start: 0.12, end: 0.2 } : c.tex === TEX.smoke ? { start: 0.4, end: 1.2 } : { start: 0.7, end: 0.1 },
        alpha: { start: 0.8, end: 0 },
        lifespan: 9000,
        frequency: arena === 'desert' ? 40 : 140,
        tint: c.tint,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(FLOOR_TOP - 4);
  }

  /** The fighting-game "VS" splash before Part 1. */
  private async versus(): Promise<void> {
    const ui = this.add.container(0, 0).setDepth(DEPTH.overlay + 5);
    const left = this.add.rectangle(-GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH / 2 + 60, GAME_HEIGHT, 0x2a5aff, 0.92).setOrigin(0.5);
    const right = this.add.rectangle(GAME_WIDTH * 1.5, GAME_HEIGHT / 2, GAME_WIDTH / 2 + 60, GAME_HEIGHT, 0xc8102e, 0.92).setOrigin(0.5);
    ui.add([left, right]);
    // Each card as tall beside hers as the fighter stands beside her (item 034: a dad is grown-up height here too).
    const me = this.heroes[0]?.height ?? 150;
    const heroCards = this.heroes.map((h, i) => {
      const ch = Math.min(340, (220 * h.height) / me);
      return fitImage(this.add.image(-300 + i * 30, 440 + i * 40, h.init.art).setOrigin(0.5, 1), ch * 0.95, ch);
    });
    // A grown-up villain's card too (item 093: Evil Dada Matt's was the full 360, taller than Dada Jason's 330 across from him).
    const vh = this.villain.init.tall ? Math.min(360, (220 * this.villain.height) / me) : 360;
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

  private async intro(): Promise<void> {
    this.phase = 'intro';
    if (this.part === 1) await this.versus();
    // Everybody runs in from the sides (to the style's own spots, if it has them).
    this.heroes.forEach((h, i) => {
      const to = this.show.home(h, i) ?? { x: BRAWL.intro.x + i * BRAWL.intro.dx, y: h.y };
      this.tweens.add({ targets: h, x: to.x, y: to.y, duration: 900, ease: 'Quad.easeOut' });
    });
    const vto = this.show.home(this.villain, 0) ?? { x: BRAWL.intro.villainX, y: this.villain.y };
    this.tweens.add({ targets: this.villain, x: vto.x, y: vto.y, duration: 1100, ease: 'Quad.easeOut' });
    this.banner(this.fight.banner[this.part - 1]!, 0xff3d7a, true);
    sfxFanfare();
    await this.say(fightLineKey(this.fight, this.part === 1 ? 'start' : 'start2'));
    if (this.part === 2) await this.villainSays();
    for (const f of this.fighters) f.onStage = true;
    this.phase = 'fight';
  }

  private async part1(): Promise<void> {
    await this.intro();
    await this.wait(this.beat(1.5));
    await this.useAllFetched(this.beat(3.5));
    await this.useCharged(this.beat(1.1));
    await this.useMade(['helper', 'gem', 'ammo'], this.beat(3));
    await this.wait(this.beat(2.5));
    await this.moveChoice();
    await this.wait(this.beat(7));
    await this.combo();
    await this.wait(this.beat(6));
    await this.moveChoice();
    await this.wait(this.beat(7));
    await this.ultimate();
    this.phase = 'end';
    await this.villainSays();
    await this.say(fightLineKey(this.fight, 'retreat'));
    this.retreat();
    await this.wait(this.beat(1.4));
    this.cameras.main.fadeOut(500);
    await this.wait(0.6);
    advance(this);
  }

  private async part2(): Promise<void> {
    await this.intro();
    await this.wait(this.beat(1));
    await this.useAllFetched(this.beat(3));
    await this.useCharged(this.beat(1.1));
    await this.useMade(['helper', 'ammo', 'gem'], this.beat(2.5));
    await this.wait(this.beat(2));
    await this.moveChoice();
    await this.wait(this.beat(6));
    await this.combo();
    await this.wait(this.beat(5));
    await this.moveChoice();
    await this.wait(this.beat(5));
    await this.ultimate();
    await this.finish();
    this.phase = 'end';
    await this.wait(this.beat(1.2));
    this.cameras.main.fadeOut(500, 255, 255, 255);
    await this.wait(0.6);
    advance(this);
  }

  /**
   * Part 1's end: the heroes bounce back up and run off left to get ready, so
   * the fade is on a retreat, never on a floored team. The villain stomps.
   */
  private retreat(): void {
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

  /** Every key word she fetched in the house, used in turn, `gap` seconds apart. */
  private async useAllFetched(gap: number): Promise<void> {
    for (const word of episode.fetched) {
      if (!FETCH_BY_WORD[word]) continue;
      await this.useFetched(word);
      await this.wait(gap);
    }
  }

  /**
   * Charge the Spell's runes (item 053), if they were charged for this part:
   * a quick volley, each rune stone popping up over her hero with its letter,
   * its sound said (never captioned), and her hero firing the rune's move
   * (content/phonics/runes.ts) at a little over normal power, so six of them
   * neither end the fight nor run it long (expectFightLength).
   */
  private async useCharged(gap: number): Promise<void> {
    const c = episode.charged;
    if (!c || c.part !== this.part) return;
    let said = false;
    for (const sound of c.sounds) {
      const rune = RUNE_BY_SOUND[sound];
      const h = this.heroes[0];
      if (!rune || !h?.active || h.floored) continue;
      if (!said) {
        said = true;
        // Said first, so each rune's sound comes with its own stone, not under the next (item 069).
        await this.say('use_runes');
        if (!h.active || h.floored) return;
      }
      const color = rune.move.color;
      const spot = this.revealSpot(h, 110, 110, 10);
      const at = { x: spot.x, y: spot.y - 55 };
      const stone = fitImage(this.add.image(at.x, at.y, 'prop_rune_stone'), 100, 100).setDepth(DEPTH.fx + 6);
      const letter = this.add
        .text(at.x, at.y + 2, sound.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: sound.length > 1 ? '48px' : '64px', color: '#ff3d7a', stroke: '#ffffff', strokeThickness: 6 })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx + 7);
      popIn(this, stone, stone.scale, 0, 220);
      popIn(this, letter, 1, 60, 220);
      sfxSummon();
      burst(this, at.x, at.y, { count: 40, speed: 340, texture: TEX.star, colors: [color, 0xffffff, 0xffd23f] });
      const heard = this.guard(voiceBus.say(letterSoundLine(sound)));
      await this.wait(0.3);
      this.banner(`${sound.toUpperCase()}!`, color === 0xffffff ? 0x7ad9ff : color, true);
      speedLines(this, at.x, at.y, color, 400);
      h.castFrom = at;
      cast(this, h, rune.move, this.villain, 1.3);
      this.after(700, () => (h.castFrom = null));
      this.stats.abilitiesFired++;
      this.stats.runesFired++;
      this.tweens.add({
        targets: [stone, letter],
        scale: 0,
        alpha: 0,
        delay: 350,
        duration: 260,
        ease: 'Back.easeIn',
        onComplete: () => {
          stone.destroy();
          letter.destroy();
        },
      });
      // The next stone waits for this one's sound as well as the gap.
      await Promise.all([heard, this.wait(gap)]);
    }
  }

  /**
   * Where a reveal `w` wide whose bottom edge sits `bottomGap` above her head
   * and reaches `ht` up can go, clear of every other fighter's body (item 034:
   * the bag over Julia's head hid a small ally standing just behind her). Over
   * her head when that is clear, else stepped sideways, away from the villain
   * first. Returns the reveal's bottom-centre.
   */
  private revealSpot(h: Fighter, w: number, ht: number, bottomGap: number): { x: number; y: number } {
    const others = this.fighters.filter((f) => f !== h && f.active && f.init.kind !== 'minion');
    const y = Math.max(ht + 12, h.top - bottomGap);
    const clear = (x: number) =>
      others.every((f) => f.x + f.bodyHalf < x - w / 2 || f.x - f.bodyHalf > x + w / 2 || f.y < y - ht || f.top > y);
    const away = h.x < this.villain.x ? -1 : 1;
    for (const dx of [0, 70, -70, 140, -140, 210, -210, 280, -280]) {
      const x = Phaser.Math.Clamp(h.cx + dx * away, w / 2 + 10, GAME_WIDTH - w / 2 - 10);
      if (clear(x)) return { x, y };
    }
    return { x: h.cx, y };
  }

  /**
   * One fetched thing: her bag pops up over her hero, the item's picture
   * jumps out of it with a sparkle, a big "THE NET!" banner, and her hero
   * fires the item's own ability. Summon items (hens, the dog) fight on her side.
   */
  private async useFetched(word: string): Promise<void> {
    const item = FETCH_BY_WORD[word];
    const h = this.heroes[0];
    if (!item || !h?.active || h.floored) return;
    const color = item.ability.color;
    // The bag: pops in over her head, or beside it, where it hides nobody;
    // the picture then rises 110 above it.
    const spot = this.revealSpot(h, 150, 86 + 110 + 72, 7);
    const bag = fitImage(this.add.image(spot.x, spot.y - 43, 'prop_bag'), 86, 86).setDepth(DEPTH.fx + 5);
    const bs = bag.scale;
    popIn(this, bag, bs, 0, 260);
    sfxWhoosh();
    if (!this.bagSaid) {
      this.bagSaid = true;
      void this.say('use_bag');
    }
    await this.wait(0.35);
    // The picture jumps out of the bag, a squash on the bag as it goes.
    this.tweens.add({ targets: bag, scaleX: bs * 1.3, scaleY: bs * 0.7, duration: 90, yoyo: true });
    const pic = fitImage(this.add.image(bag.x, bag.y, `pic_${word}`), 120, 120).setDepth(DEPTH.fx + 6);
    const ps = pic.scale;
    pic.setScale(0.2 * ps);
    this.tweens.add({ targets: pic, y: bag.y - 110, scale: ps * 1.2, duration: 380, ease: 'Back.easeOut' });
    // The glow behind the fighters, so it never washes one out.
    const halo = this.add.image(pic.x, bag.y - 110, TEX.glow).setTint(0xfff3a0).setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(FLOOR_TOP - 4);
    this.tweens.add({ targets: halo, scale: 3.4, alpha: 0.6, duration: 400, yoyo: true, repeat: 1 });
    sfxSummon();
    burst(this, pic.x, bag.y - 110, { count: 50, speed: 380, colors: [0xfff3a0, color, 0xffffff] });
    await this.wait(0.45);
    // Its name, big, and then it is really used.
    this.banner(`THE ${word.toUpperCase()}!`, color === 0xffffff ? 0x7ad9ff : color, true);
    slowmo(this, 0.4, 700);
    speedLines(this, pic.x, pic.y, color, 600);
    // Its bolts fly out of the picture, not out of her: a volley of big caps hid her (item 034).
    h.castFrom = { x: pic.x, y: bag.y - 110 };
    cast(this, h, item.ability, this.villain, 1.8);
    this.after(900, () => (h.castFrom = null));
    this.stats.abilitiesFired++;
    this.stats.itemsUsed++;
    // The picture flies off towards the villain and fades; the bag closes.
    this.tweens.add({ targets: pic, x: this.villain.cx, y: this.villain.cy, scale: ps * 0.6, alpha: 0, delay: 300, duration: 500, ease: 'Quad.easeIn', onComplete: () => pic.destroy() });
    this.tweens.add({ targets: halo, alpha: 0, delay: 300, duration: 400, onComplete: () => halo.destroy() });
    this.tweens.add({ targets: bag, scale: 0, delay: 500, duration: 250, ease: 'Back.easeIn', onComplete: () => bag.destroy() });
  }

  /** The parked v0.1 made things, only if their flags are set (they are not, in v0.2 episodes). */
  private async useMade(order: ('helper' | 'gem' | 'ammo')[], gap: number): Promise<void> {
    for (const what of order) {
      if (!episode.made[what]) continue;
      if (what === 'helper') await this.useHelper();
      else if (what === 'gem') await this.useGem();
      else await this.useAmmo();
      await this.wait(gap);
    }
  }

  /** The helper friend from Word to Picture joins the heroes. */
  private async useHelper(): Promise<void> {
    if (!episode.made.helper || this.helper) return;
    const h = this.heroes[0]!;
    sfxSummon();
    shockwave(this, h.x + 120, h.y, 0xff7ad9, 200);
    burst(this, h.x + 120, h.y - 60, { count: 60, speed: 400, colors: [0xff7ad9, 0x7ad9ff, 0xffffff] });
    this.helper = this.spawn(initFromMinion(MINIONS.helper!, 'hero', 'helper'), h.x + 120, h.y);
    this.helper.hp = this.helper.maxHp = 9999;
    this.banner('HELPER FRIEND!', 0xff7ad9);
    void this.say('use_helper');
  }

  /** The power gem from Sound to Letter: a rainbow beam, and the hero glows stronger. */
  private async useGem(): Promise<void> {
    if (!episode.made.gem) return;
    const h = this.heroes[0]!;
    h.power = Math.max(h.power, 1.35);
    void this.say('use_gem');
    const gem = fitImage(this.add.image(h.cx, h.top - 50, 'prop_gem'), 90, 90).setDepth(DEPTH.fx);
    popIn(this, gem, 90 / Math.max(gem.width, gem.height), 0, 300);
    await this.wait(0.6);
    const rainbow: AbilitySpec = { id: 'gem_beam', name: 'Power Gem', kind: 'beam', cooldown: 0, color: 0xff5ab4, color2: 0x7ad9ff, power: 3 };
    this.banner('POWER GEM!', 0xff5ab4, true);
    slowmo(this, 0.4, 600);
    cast(this, h, rainbow, this.villain, 1.6);
    this.stats.abilitiesFired++;
    this.tweens.add({ targets: gem, alpha: 0, scale: 0, delay: 900, duration: 300, onComplete: () => gem.destroy() });
  }

  /** The star ammo from Blend Path: a barrage of stars from the heroes' side. */
  private async useAmmo(): Promise<void> {
    if (!episode.made.ammo) return;
    const h = this.heroes[0]!;
    void this.say('use_ammo');
    this.banner('STAR AMMO!', 0xffd23f, true);
    const stars: AbilitySpec = { id: 'star_ammo', name: 'Star Ammo', kind: 'bolt', cooldown: 0, color: 0xffd23f, power: 1, count: 10, glyph: '⭐', homing: true };
    cast(this, h, stars, this.villain, 1.4);
    this.stats.abilitiesFired++;
  }

  /** Two heroes (or the hero and the helper) fire a combo together. */
  private async combo(): Promise<void> {
    const a = this.heroes[0]!;
    let b = this.heroes[1] ?? this.helper;
    // With no ally and no helper, the narrator swoops in for the combo and
    // leaves again: nobody fights alone at the big moment.
    let cameo: Fighter | null = null;
    if (!b || !b.active) {
      // The helper's roster id: a dad in today's form (his lines are per form too).
      const id = helper();
      cameo = this.spawn(initFromSpec(CHARACTER_BY_ID[id]!.good, id, castArt(id), 'hero'), -160, a.y + 30);
      cameo.invulnerable = true;
      b = cameo;
      void voiceBus.say(nameLine(id), 'bark', cameo);
      await this.wait(0.45);
    }
    this.phase = 'combo';
    const ab = comboFor(a.init.id, b.init.id);
    // Both glow and fly together, then fire as one.
    for (const f of [a, b]) {
      f.setShield(1.5, ab.color, this.now);
      burst(this, f.cx, f.cy, { count: 40, speed: 300, colors: [ab.color, ab.color2 ?? 0xffffff] });
    }
    // Side by side, not one inside the other (item 034).
    this.tweens.add({ targets: b, x: a.x + Math.max(90, a.bodyHalf + b.bodyHalf), y: a.y + 10, duration: 400 });
    if (!this.textGivesAway(abilityCallout(ab))) this.banner(abilityCallout(ab).toUpperCase(), ab.color, true);
    slowmo(this, 0.35, 900);
    flash(this, ab.color, 160);
    speedLines(this, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2, ab.color, 800);
    await this.wait(0.4);
    punch(this, 0.06, 180);
    cast(this, a, comboPart(a.init.id, b.init.id), this.villain, 2.2);
    cast(this, b, comboPart(b.init.id, a.init.id), this.villain, 1.4);
    this.show.combo(a, b);
    this.stats.combos++;
    this.stats.abilitiesFired += 2;
    await this.wait(1.5);
    if (cameo) {
      const c = cameo;
      c.busyUntil = this.now + 10_000;
      this.tweens.add({ targets: c, x: -220, duration: 600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    }
    if (this.phase === 'combo') this.phase = 'fight';
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
        ? (EFFECT_BY_WORD[word]?.ability ?? { id: `word_${word}`, name: word.toUpperCase(), kind: 'bolt', cooldown: 0, color: 0xffd23f, power: 2, count: 3, homing: true })
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
  private lineGivesAway(id: string): boolean {
    const text = voiceBank.get(id)?.text;
    return !!text && this.textGivesAway(text);
  }

  /**
   * Whether showing or saying `text` now would give a move choice away: it
   * has a word on a pad still to come (a ROCKET HOP! banner before a HOP
   * pad; item 030). Banners are held to it as well as spoken lines.
   */
  private textGivesAway(text: string): boolean {
    const upcoming = this.upcomingPads();
    // A pad word inside a longer one counts too: SPINNY before SPIN, HUGS before HUG (item 039).
    return withStems(text.toLowerCase().split(/[^a-z]+/).filter(Boolean)).some((w) => upcoming.has(w));
  }

  /** A fighter's taunts that give no move choice away. */
  private safeTaunts(f: Fighter): string[] {
    // Nor one that does not fit today's outfit (a knight has no wand).
    const skip = f.team === 'hero' ? formFor(f.init.id, episode)?.skipTaunts ?? [] : [];
    return (f.init.taunts ?? []).filter((k) => !skip.includes(k) && !this.lineGivesAway(tauntLine(f.init.id, k)));
  }

  /**
   * The move word's own effect on a super: a fan of its picture (`pic_zap`
   * bolts, `pic_ice` cubes) bursting from the hero at the villain, each
   * popping in, bobbing and popping out by scale.
   */
  private wordFx(word: string, f: Fighter, color: number): void {
    const key = `pic_${word}`;
    if (!this.textures.exists(key)) return;
    const v = this.villain;
    const n = fxQuality.level < 1 ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const img = fitImage(this.add.image(f.cx, f.cy, key), 90, 90).setDepth(DEPTH.fx);
      const tx = (v?.active ? v.cx : f.cx + 300) + Phaser.Math.Between(-170, 170);
      const ty = (v?.active ? v.cy : f.cy) + Phaser.Math.Between(-140, 110);
      const delay = i * 70;
      popIn(this, img, img.scale, delay, 220);
      this.tweens.add({ targets: img, x: tx, y: ty, duration: 650, delay, ease: 'Quad.easeOut' });
      this.tweens.add({
        targets: img,
        scale: 0,
        duration: 260,
        delay: delay + 900,
        ease: 'Back.easeIn',
        onComplete: () => {
          burst(this, img.x, img.y, { count: 14, speed: 260, colors: [color, 0xffffff] });
          img.destroy();
        },
      });
    }
  }

  /** The move-choice pause. */
  private async moveChoice(): Promise<void> {
    // The words were planned with the episode (src/rules/moves.ts): the first
    // of each part is the hub's gift word, the rest come from her move bag.
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
    const at = { x: me.x, y: me.y, lift: me.init.style === 'fly' ? 110 : me.init.style === 'hover' ? 40 : 0 };
    me.lift = at.lift;
    // The last big banner ("ROCKET FISTS!") is frozen with the clock: clear it from under PICK A MOVE.
    this.bannerText?.destroy();
    this.bannerText = null;
    this.bannerBig = 0;
    // The pads, until she walks onto the right one (moveChoice.ts).
    const misses = await this.choices.open(words, right, choiceKey, me, at);
    this.choices.close();
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
      for (const w of words) if (w !== right) progress.takeFromBag(w, 'pads');
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
    cast(this, f, ab, this.villain, 2.4, true);
    this.show.superMove(f, ab, right);
    // The word's own effect: a fan of its pictures. Its name on the banner: she has read it.
    this.wordFx(right, f, ab.color);
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

  /**
   * A giant's ultimate fills the whole screen, not just the heroes' corner: a
   * wall of its colours sweeps the arena while its fire pours from the top edge
   * all the way across. Part 2 leaves out the wall (it would shove the heroes
   * out from under the counter-item); a `swallow` stops the pour itself.
   */
  private giantSweep(v: Fighter, ult: AbilitySpec, wall = true, pourMs = 1600): Phaser.GameObjects.Particles.ParticleEmitter {
    if (wall) cast(this, v, { ...ult, id: `${ult.id}_sweep`, kind: 'wave', power: 2 }, this.heroes[0] ?? null, 2.2);
    const pour = this.add
      .particles(0, 0, TEX.smoke, {
        x: { min: 0, max: GAME_WIDTH },
        y: -40,
        speedY: { min: 500, max: 900 },
        speedX: { min: -160, max: -40 },
        scale: { start: 1.2, end: 2.6 },
        alpha: { start: 0.75, end: 0 },
        lifespan: 1000,
        frequency: 10,
        quantity: 4,
        tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(DEPTH.fx + 1);
    flash(this, ult.color, 220);
    this.after(pourMs, () => pour.stop());
    this.after(pourMs + 1200, () => pour.destroy());
    return pour;
  }

  /** The villain's ultimate. Part 1: the heroes are floored. Part 2: the counter-item answers it. */
  private async ultimate(): Promise<void> {
    const { v, ult, giant, aura } = await this.ultimateWindUp();
    if (this.part === 1) await this.ultimateFloors(v, ult, giant);
    else await this.ultimateCountered(v, ult, giant, aura);
  }

  /** Both parts: everyone to their own side, then the villain grows and roars its ultimate. */
  private async ultimateWindUp(): Promise<{ v: Fighter; ult: AbilitySpec; giant: boolean; aura: Phaser.GameObjects.Particles.ParticleEmitter }> {
    this.phase = 'ultimate';
    const v = this.villain;
    const ult = v.init.ultimate!;
    // The villain winds up as itself, not as a pig or an ice block.
    v.status = null;
    v.clearOverlay();
    // A giant (Tiamat) steps to the front of her half, so growing for the
    // ultimate fills the screen from the floor to near the top, head still in view.
    const giant = v.init.size >= 2;
    // A contest's stage keeps everybody where its contest has them.
    if (!this.show.anchored) this.tweens.add({ targets: v, x: giant ? BRAWL.ult.giantX : BRAWL.ult.villain.x, y: giant ? FLOOR_BOTTOM : BRAWL.ult.villain.y, duration: 600 });
    // Everyone back to their own side, so the big moment reads left against right.
    this.heroes.forEach((h, i) => {
      h.status = null;
      h.clearOverlay();
      if (!this.show.anchored) this.tweens.add({ targets: h, x: BRAWL.ult.x + i * BRAWL.ult.dx, y: BRAWL.ult.y + i * BRAWL.ult.dy, duration: 600, ease: 'Quad.easeOut' });
    });
    if (this.helper?.active && !this.show.anchored) this.tweens.add({ targets: this.helper, x: BRAWL.ult.helper.x, y: BRAWL.ult.helper.y, duration: 600 });
    await this.wait(0.6);
    sfxUltimate();
    this.darken(0.55, 800);
    shake(this, 3, 1400);
    v.growUntil = this.now + 4500;
    // A roaring aura: particles streaming up off the villain while it charges.
    const aura = this.add
      .particles(0, 0, TEX.spark, {
        speedY: { min: -420, max: -160 },
        speedX: { min: -80, max: 80 },
        scale: { start: 1.8, end: 0 },
        lifespan: 700,
        frequency: 6,
        tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, v.height * 0.9, v.height * 0.5) } as never,
      })
      .setDepth(DEPTH.fx + 2);
    aura.startFollow(v.root, 0, -v.height * 0.6);
    this.after(3200, () => aura.stop());
    this.after(4200, () => aura.destroy());
    const vignette = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT).setStrokeStyle(80, ult.color, 0.5).setDepth(DEPTH.hud - 1).setAlpha(0);
    this.tweens.add({ targets: vignette, alpha: 1, duration: 300, yoyo: true, repeat: 4, onComplete: () => vignette.destroy() });
    burst(this, v.cx, v.cy, { count: 120, speed: 700, colors: [v.init.palette[0], v.init.palette[1], ult.color], life: 1200 });
    shockwave(this, v.x, v.y, ult.color, 400, 900);
    // Not when its name holds a pad word still to come (SWALLOW THE SUN!, item 039), like its line below.
    if (!this.textGivesAway(ult.name)) this.banner(`${ult.name.toUpperCase()}!`, ult.color, true);
    slowmo(this, 0.4, 1200);
    speedLines(this, v.cx, v.cy, ult.color, 1200);
    punch(this, 0.08, 300);
    if (!this.lineGivesAway(ultimateLine(v.init.id))) void voiceBus.say(ultimateLine(v.init.id), 'instruction', v);
    this.stats.ultimates++;
    await this.wait(1.4);
    return { v, ult, giant, aura };
  }

  /** Part 1, too strong: the heroes are floored, dizzy and fine. */
  private async ultimateFloors(v: Fighter, ult: AbilitySpec, giant: boolean): Promise<void> {
    this.floors.heroMain = 0.06;
    cast(this, v, ult, this.heroes[0] ?? null, 2.6);
    if (giant) this.giantSweep(v, ult);
    // The style stages the villain winning the round (the brawl just lets it land).
    await this.show.ultimate1(v, ult);
    flash(this, 0xffffff, 300);
    hitstop(this, 160);
    shake(this, 8, 600);
    punch(this, 0.1, 220);
    sfxBoom(3);
    for (const h of this.team()) {
      h.hp = Math.min(h.hp, h.maxHp * 0.08);
      h.floored = true;
      h.lift = 0;
      h.setStatus('stun', 99, this.now);
      burst(this, h.cx, h.cy, { count: 40, speed: 400, colors: [ult.color, 0xffffff] });
    }
    floatText(this, GAME_WIDTH / 2 - 200, 300, this.fight.tooStrong, '#ffd23f', 60);
    this.darken(0.35, 600);
    await this.wait(1.2);
  }

  /**
   * Part 2: the counter, whatever the attic's sentence drew from her word
   * bag. The villain's own named item (Evil Tiamat's Magic Hat) when the
   * draw lands on its word, with its own staging; otherwise the thing in the
   * picture, which scares the villain silly whatever it is (item 015).
   */
  private async ultimateCountered(v: Fighter, ult: AbilitySpec, giant: boolean, aura: Phaser.GameObjects.Particles.ParticleEmitter): Promise<void> {
    this.phase = 'counter';
    const named = namedCounter();
    const word = counterWord();
    const counter = { name: named?.name ?? `The ${word}`, how: named?.how ?? 'scare' };
    for (const f of this.team()) f.invulnerable = true;
    const h = this.heroes[0]!;
    void this.say('use_item');
    const at = this.revealSpot(h, 190, 190, 0);
    const item = fitImage(this.add.image(at.x, at.y - 95, counterArt()), 130, 130).setDepth(DEPTH.fx + 5);
    const s = item.scale;
    popIn(this, item, s * 1.4, 0, 400);
    const halo = this.add.image(item.x, item.y, TEX.glow).setTint(0xfff3a0).setScale(3).setBlendMode(Phaser.BlendModes.ADD).setDepth(FLOOR_TOP - 4);
    this.tweens.add({ targets: halo, scale: 5, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
    sfxSummon();
    flash(this, 0xfff3a0, 250);
    speedLines(this, item.x, item.y, 0xfff3a0, 900);
    this.banner(`${counter.name.toUpperCase()}!`, 0xffb703, true);
    await this.wait(0.6);

    const beat: CounterBeat = { v, ult, giant, h, item, halo, s, name: counter.name, how: counter.how };
    if (counter.how === 'scare') await this.counterScare(beat, aura, word, !!named);
    else if (counter.how === 'block' || counter.how === 'reflect' || counter.how === 'swallow') await this.counterShield(beat);
    else await this.counterUndo(beat);
    this.tweens.killTweensOf(halo);
    halo.destroy();
    this.tweens.add({ targets: item, alpha: 0, scale: 0, duration: 400, onComplete: () => item.destroy() });
    this.darken(0, 600);
    // The contest turns the heroes' way.
    await this.show.counter2(v);
    v.growUntil = 0;
    v.setStatus('stun', 99, this.now);
    floatText(this, v.cx, v.top - 20, 'DIZZY!', '#ffd23f', 56);
    await this.wait(0.8);
  }

  /**
   * A swarm of the thing (wind-up mice, brave rats, cats, buses, mops)
   * scurries along the floor at the villain, who leaps up in fright
   * mid-ultimate (a stretch and a lift, no spin), and the ultimate fizzles
   * out before it is ever fired. Its picture whenever there is one, named
   * counters too (Matt's 017 call); the item's glyph otherwise.
   */
  private async counterScare({ v, ult, giant, h }: CounterBeat, aura: Phaser.GameObjects.Particles.ParticleEmitter, word: string, named: boolean): Promise<void> {
    for (let i = 0; i < 12; i++) this.after(i * 70, () => this.scurry(h, v, i, `pic_${word}`));
    await this.wait(0.75);
    aura.stop();
    v.growUntil = 0;
    sfxShout(1.6);
    floatText(this, v.cx, v.top - 40, 'EEK!', '#ff9ad5', 84);
    // Not the mop! She has read the word by now, so the villain may wail it.
    if (!named) this.after(350, () => floatText(this, v.cx - 40, v.top - 130, `NOT THE ${word.toUpperCase()}!`, '#ffd23f', 56));
    shake(this, 3, 300);
    // A giant (Evil Tiamat, standing at the front) only hops and stretches a
    // little, so her head stays on screen (she now takes this branch whenever
    // the counter is not her Magic Hat).
    const leap = giant ? 50 : 190;
    const stretch = giant ? 1.12 : 1.45;
    // From the height it is at: a flyer leaps up from the air, not from the floor.
    const lift0 = v.lift;
    this.tweens.addCounter({ from: 0, to: 1, duration: 750, ease: 'Sine.easeInOut', onUpdate: (tw) => (v.lift = lift0 + Math.sin((tw.getValue() ?? 0) * Math.PI) * leap), onComplete: () => (v.lift = lift0) });
    const bs = v.baseScale;
    this.tweens.add({ targets: v.sprite, scaleX: bs * (giant ? 0.9 : 0.72), scaleY: bs * stretch, duration: 170, yoyo: true, repeat: 1, onComplete: () => v.sprite.setScale(bs) });
    await this.wait(0.8);
    // The fizzle: the charge goes out of it in a grey puff.
    sfxPoof();
    burst(this, v.cx, v.cy, { count: 50, speed: 260, colors: [0x888888, 0xcccccc, ult.color], life: 900 });
    floatText(this, v.cx + 60, v.cy, 'FIZZLE!', '#cccccc', 44);
    await this.wait(1.0);
  }

  /**
   * `block`, `reflect`, `swallow`: a dome over the heroes, all of them (the
   * ally can be well apart from her); the ultimate crashes into it. A
   * `swallow` item then sucks the storm inside; a `reflect` sends it back.
   */
  private async counterShield({ v, ult, giant, h, item, halo, s, how }: CounterBeat): Promise<void> {
    const team = this.team();
    const xs = team.map((f) => f.x);
    const ys = team.map((f) => f.cy);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const dome = this.add
      .ellipse((x0 + x1) / 2, (y0 + y1) / 2 - 20, Math.max(520, x1 - x0 + 300), Math.max(360, y1 - y0 + 280), 0x9ad8ff, 0.18)
      .setStrokeStyle(10, 0xffffff, 0.9)
      .setDepth(DEPTH.fx + 3);
    popIn(this, dome, 1, 0, 300);
    sfxShield();
    cast(this, v, ult, h, 2.2);
    const pour = giant ? this.giantSweep(v, ult, false, how === 'swallow' ? 3000 : 1600) : null;
    if (how !== 'swallow') {
      await this.wait(1.8);
      floatText(this, h.x + 60, h.y - 280, 'BLOCKED!', '#7ad9ff', 70);
    } else {
      // The item (the Magic Hat, drawn brim up) flies up between them while
      // the storm is still falling and sucks it all inside like a magic trick;
      // she shrinks back to size behind the GULP.
      await this.wait(0.6);
      this.tweens.killTweensOf(halo);
      this.tweens.add({ targets: [item, halo], x: GAME_WIDTH / 2, y: 260, duration: 500, ease: 'Back.easeOut' });
      this.tweens.add({ targets: item, scale: s * 2, duration: 500, ease: 'Back.easeOut' });
      await this.wait(0.5);
      pour?.stop();
      const vortex = this.add
        .particles(0, 0, TEX.smoke, {
          x: { min: 0, max: GAME_WIDTH },
          y: { min: 0, max: GAME_HEIGHT },
          moveToX: item.x,
          moveToY: item.y + 30,
          scale: { start: 1.4, end: 0.1 },
          alpha: { start: 0.9, end: 0.2 },
          lifespan: 700,
          frequency: 6,
          quantity: 3,
          tint: [ult.color, ult.color2 ?? 0xffffff, v.init.palette[1]],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(DEPTH.fx + 4);
      sfxWhoosh();
      this.after(400, () => sfxWhoosh());
      this.after(800, () => sfxWhoosh());
      this.tweens.add({ targets: item, scaleX: item.scaleX * 1.25, scaleY: item.scaleY * 0.8, duration: 120, yoyo: true, repeat: 6 });
      this.darken(0.2, 1200);
      await this.wait(1.4);
      vortex.stop();
      floatText(this, item.x, item.y - 110, 'GULP!', '#ffd23f', 84);
      sfxPoof();
      burst(this, item.x, item.y, { count: 70, speed: 420, colors: [0xffd23f, 0xffffff, ult.color] });
      burst(this, v.cx, v.cy, { count: 50, speed: 320, colors: [0xffffff, ult.color, v.init.palette[1]] });
      v.growUntil = 0;
      this.after(900, () => vortex.destroy());
      await this.wait(0.8);
    }
    if (how === 'reflect') {
      this.banner('BOUNCE BACK!', 0x7ad9ff, true);
      cast(this, h, ult, v, 2.4);
      await this.wait(1.6);
    }
    this.tweens.add({ targets: dome, alpha: 0, duration: 400, onComplete: () => dome.destroy() });
  }

  /**
   * `restore`, `reveal`, `shutdown`, `calm`: the ultimate really happens first
   * (the sun is swallowed, the clones appear, the lasers fire), with the
   * heroes shielded by the item's glow; then the item visibly undoes it.
   */
  private async counterUndo({ v, ult, h, name, how }: CounterBeat): Promise<void> {
    cast(this, v, ult, h, 2.0);
    await this.wait(1.6);
    // A beam of the item's own light straight into the villain.
    const light: AbilitySpec = { id: 'counter_light', name, kind: 'beam', cooldown: 0, color: 0xfff3a0, color2: 0xffb703, power: 3 };
    cast(this, h, light, v, 2.4);
    if (how === 'restore') {
      // The light comes back: the sun pops into the sky with rays.
      this.darken(0, 900);
      const sun = this.add.image(GAME_WIDTH * 0.72, 120, 'prop_sun').setDisplaySize(160, 160).setDepth(FLOOR_TOP - 3);
      popIn(this, sun, sun.scale, 0, 500);
      speedLines(this, sun.x, sun.y, 0xffd23f, 900);
      burst(this, sun.x, sun.y, { count: 90, speed: 500, colors: [0xffd23f, 0xffffff, 0xff9a3c] });
      sfxFanfare();
    }
    if (how === 'reveal') {
      for (const c of this.fighters.filter((f) => f.init.kind === 'clone')) this.hit(c, 1, 0xffffff, h);
    }
    if (how === 'shutdown') {
      await this.wait(0.6);
      v.baseTint = 0x777777;
      v.restoreTint();
      floatText(this, v.cx, v.top, 'POWER OFF!', '#ff5a6a', 56);
    }
    if (how === 'calm') {
      await this.wait(0.4);
      for (let i = 0; i < 12; i++) this.after(i * 80, () => floatText(this, v.cx + (Math.random() - 0.5) * 200, v.cy + (Math.random() - 0.5) * 120, '💖', '#ff5ab4', 40));
    }
    await this.wait(1.4);
  }

  /**
   * One of the swarm (`art`, the counter word's picture, or the villain's
   * counter glyph if that art is missing): low and fast along the floor from
   * her side to the villain, then off the edge.
   */
  private scurry(from: Fighter, to: Fighter, i: number, art: string): void {
    const y0 = Phaser.Math.Clamp(from.y + (Math.random() - 0.5) * 60, FLOOR_TOP, FLOOR_BOTTOM);
    const m = this.textures.exists(art)
      ? fitImage(this.add.image(from.x + 30, y0, art), 58, 58).setOrigin(0.5, 1).setDepth(y0 + 2)
      : this.add.text(from.x + 30, y0, villainSpec().counter.glyph, { fontSize: '42px' }).setOrigin(0.5, 1).setDepth(y0 + 2);
    const ty = Phaser.Math.Clamp(to.y + (Math.random() - 0.5) * 70, FLOOR_TOP, FLOOR_BOTTOM);
    // A scurry: quick little squashes, never a spin.
    this.tweens.add({ targets: m, scaleY: m.scaleY * 0.78, scaleX: m.scaleX * 1.12, duration: 60, yoyo: true, repeat: -1 });
    const done = () => {
      this.tweens.killTweensOf(m);
      m.destroy();
    };
    this.tweens.add({
      targets: m,
      x: to.x + (Math.random() - 0.4) * 70,
      y: ty,
      duration: 480 + Math.random() * 160,
      onUpdate: () => m.setDepth(m.y + 2),
      onComplete: () => {
        burst(this, m.x, m.y - 20, { count: 10, speed: 200, colors: [0xc8c8d0, 0xffffff] });
        if (i % 3 === 0 && to.active) this.hit(to, 0.4, 0xc8c8d0, from);
        this.tweens.add({ targets: m, x: GAME_WIDTH + 80, alpha: 0.6, duration: 500, onComplete: done });
      },
    });
  }

  /** Part 2's finish: everyone's biggest move, then the villain is beaten and turns good. */
  private async finish(): Promise<void> {
    this.phase = 'finish';
    const v = this.villain;
    this.show.finishLine();
    await this.say(fightLineKey(this.fight, 'finish'));
    // Low, but not zero: the last hit below is the one that wins.
    this.floors.villainMain = 0.06;
    const team = this.team();
    for (const [i, h] of team.entries()) {
      this.after(i * 700, () => {
        const ab = h.init.ultimate ?? h.init.abilities[0]!;
        cast(this, h, ab, v, 2.0, true);
        this.stats.abilitiesFired++;
      });
    }
    await this.wait(team.length * 0.7 + 0.5);
    if (episode.made.ammo) await this.useAmmo();
    await this.wait(1.6);
    await this.show.finish(v);
    // The last hit.
    stopMusic();
    this.floors.villainMain = 0;
    v.hp = 0;
    hitstop(this, 220);
    slowmo(this, 0.2, 1500);
    flash(this, 0xffffff, 400);
    shake(this, 9, 800);
    punch(this, 0.12, 260);
    speedLines(this, v.cx, v.cy, 0xffd23f, 1200);
    sfxBoom(3);
    shockwave(this, v.cx, v.cy, 0xffd23f, 600, 900);
    burst(this, v.cx, v.cy, { count: 200, speed: 900, life: 1500, colors: [0xffd23f, 0xff5ab4, 0x7ad9ff, 0xffffff] });
    this.banner(this.fight.win, 0xffd23f, true);
    for (const f of this.fighters) if (f.team === 'villain' && !f.isMain && f.active) this.kill(f);
    // The villain stretches up and squashes into a puff, and comes back as the good version.
    // A stretch up, then a squash to nothing: scale only.
    v.alive = false;
    this.tweens.add({ targets: v.body, scaleX: 0.4, scaleY: 1.6, duration: 350, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: v.body, scaleX: 1.8, scaleY: 0, duration: 500, delay: 350, ease: 'Back.easeIn' });
    await this.wait(1.0);
    sfxPoof();
    // As tall beside her hero as the villain's good size says (Scar just under her).
    const gh = (this.heroes[0]?.height ?? 150) * castScale(episode.villain);
    const good = fitImage(this.add.image(v.x, v.y, castArt(episode.villain)).setOrigin(0.5, 1), gh * 0.95, gh).setDepth(v.y + 1);
    popIn(this, good, good.scale, 0, 500);
    burst(this, v.x, v.y - 90, { count: 60, speed: 400, colors: [0xff9ad5, 0xffffff] });
    v.root.setVisible(false);
    // Good again: the corner label drops its EVIL too (item 039).
    const goodName = CHARACTER_BY_ID[episode.villain]?.good.displayName;
    if (goodName) this.hud.renameVillain(goodName.toUpperCase());
    for (const h of this.heroes) h.invulnerable = false;
    // Good again, the villain says sorry (or asks to come next time) in its own
    // voice, in a bubble over its good self. The victory says another.
    // One of three, drawn with the cast (item 040).
    await this.wait(0.6);
    const sorry = reformedOf('sorry');
    if (sorry) await this.guard(voiceBus.say(reformedLine(episode.villain, sorry.key), 'bark', { x: good.x, y: good.y, bubbleOffset: good.displayHeight, active: true }));
  }

  // -- the simulation ----------------------------------------------------------------

  private pickTarget(f: Fighter): Fighter | null {
    const cur = this.targetOf.get(f.uid);
    if (cur && cur.until > this.now && cur.f.active && !cur.f.floored) return cur.f;
    const enemies = this.enemiesOf(f);
    if (!enemies.length) return null;
    let t: Fighter;
    if (f.isMain && Math.random() < 0.65) {
      const mains = enemies.filter((e) => e.isMain || e.init.kind === 'helper');
      t = mains.length ? mains[Math.floor(Math.random() * mains.length)]! : enemies[0]!;
    } else {
      t = enemies.reduce((a, b) => (Phaser.Math.Distance.Between(f.x, f.y, a.x, a.y) < Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) ? a : b));
    }
    this.targetOf.set(f.uid, { f: t, until: this.now + 2500 + Math.random() * 2500 });
    return t;
  }

  private think(f: Fighter, dt: number): void {
    if (!f.canAct(this.now)) {
      if (f.status?.kind === 'pig' && !f.floored) {
        // A pig wanders and oinks, harmlessly.
        f.x = Phaser.Math.Clamp(f.x + Math.sin(this.now / 300 + f.uid) * 60 * dt, ARENA_LEFT, ARENA_RIGHT);
      }
      return;
    }
    const target = this.pickTarget(f);
    const fighting = this.phase === 'fight' || this.phase === 'combo';
    const moving = fighting || (this.phase === 'ultimate' && f.team === 'hero');
    // A contest places its fighters itself (lanes, the rope's ends, stations).
    const placed = this.show.steer(f, dt);
    // Her own hero runs where she pushes the stick; everything else stays automatic.
    const steered = !placed && f === this.heroes[0] && fighting && this.controls.move.lengthSq() > 0.04;
    if (placed) {
      // The stage has placed it.
    } else if (steered) {
      // Forget any half-taken giant step, or letting go would snap her back.
      delete f.mem.stepTo;
      const sp = f.init.speed * 1.3;
      f.vx = this.controls.move.x * sp;
      f.vy = this.controls.move.y * sp * 0.7;
      integrate(f, dt);
    } else if (moving) STEER[f.init.style](f, { scene: this, now: this.now, dt, target });
    // Each side drifts back towards its own ground, so the fight stays framed
    // heroes-left, villain-right instead of wandering off one edge.
    if (moving && !steered && !placed && (f.isMain || f.init.kind === 'helper')) {
      // Each hero has a ground of their own, so she and her ally never share one spot (item 034).
      const g = BRAWL.fight;
      const home = f.team === 'hero' ? g.heroX - Math.max(0, this.heroes.indexOf(f)) * g.heroDx : g.villainX;
      f.x += (home - f.x) * Math.min(1, (f.team === 'villain' ? g.villainPull : g.heroPull) * dt);
    }
    // A giant's wings would hang off the edge of the screen: keep all of her in.
    if (f.init.size >= 2) f.x = Phaser.Math.Clamp(f.x, ARENA_LEFT + f.height * 0.45, ARENA_RIGHT - f.height * 0.45);
    if (!fighting || !target) return;

    // Casting: one team member at a time, so moves read instead of blurring.
    const teamKey = f.team;
    if (this.now < this.teamNextCast[teamKey] && f.isMain) return;
    for (const ab of f.init.abilities) {
      if (!f.ready(ab, this.now)) continue;
      if (ab.kind === 'heal' && this.alliesOf(f).every((a) => a.hp > a.maxHp * 0.7) && f.hp > f.maxHp * 0.7) continue;
      f.use(ab, this.now);
      cast(this, f, ab, target, f.init.kind === 'helper' ? 1.4 : 1, f.isMain && ab.power >= 2 && !this.textGivesAway(abilityCallout(ab)));
      // Big moves are called out by name, if nobody else is talking.
      // A move whose name says a word on a pad still to come is never called
      // out: hearing it then would give the choice away (so are taunts).
      // Each call once a part (item 087; item 034 had only kept it from twice in a row).
      const call = moveLine(f.init.id, ab.id);
      if (f.isMain && ab.power >= 2 && Math.random() < 0.5 && !this.calledOut.has(call) && !this.lineGivesAway(call)) {
        void voiceBus.say(call, 'bark', f).then((ok) => ok && this.calledOut.add(call));
      }
      this.stats.abilitiesFired++;
      if (f.isMain) this.teamNextCast[teamKey] = this.now + (teamKey === 'villain' ? 700 : 500);
      break;
    }
  }

  /**
   * Fighters push apart so cards do not stack into one blob. Soft: a dash or a
   * slam can still pass through somebody, and the push resolves it after.
   */
  private separate(dt: number): void {
    const live = this.fighters.filter((f) => f.active && !f.floored);
    const body = (f: Fighter) => f.isMain || f.init.kind === 'helper';
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
        // The heroes, the helper and the villain never stand in one another
        // (item 034): at about the same depth, their bodies are kept apart
        // across, at once, the bigger one giving less. Not while one is in
        // the air (a leap passes over), and her hero in a move choice is hers.
        if (body(a) && body(b)) {
          // Her hero in a move choice is the cursor: she walks past anyone,
          // and never shoves her ally ahead of her across the arena. A
          // contest's own places are the stage's: once crossed, a push would
          // hold two of them on the wrong sides of each other.
          if (this.choices.active && (a === this.heroes[0] || b === this.heroes[0])) continue;
          if (this.held(a) && this.held(b)) continue;
          // One passing over the other (a leap, a flyer high above) is not standing in it.
          if (Math.abs(a.lift - b.lift) > Math.min(a.height, b.height) * 0.6) continue;
          // Side by side at about one depth, or one standing behind the other
          // and more than half hidden by them (Julia just behind a dad).
          const [front, back] = a.y >= b.y ? [a, b] : [b, a];
          const hidden = front.top - back.top < back.height * back.scaleMul * 0.5;
          if (Math.abs(b.y - a.y) >= SAME_DEPTH && !hidden) continue;
          const need = a.bodyHalf + b.bodyHalf;
          const dx = b.x - a.x;
          if (Math.abs(dx) >= need) continue;
          const dir = Math.abs(dx) > 0.5 ? Math.sign(dx) : a.team === 'hero' ? 1 : -1;
          const over = need - Math.abs(dx);
          const pinned = (f: Fighter) => f === this.villain;
          let wa = b.init.size / (a.init.size + b.init.size);
          if (pinned(a)) wa = 0;
          else if (pinned(b)) wa = 1;
          // Pushed against the arena's edge: out the other side instead.
          const room = (f: Fighter, x: number) => x - f.bodyHalf * 0.5 >= ARENA_LEFT && x + f.bodyHalf * 0.5 <= ARENA_RIGHT;
          const ax = a.x - dir * over * wa;
          const bx = b.x + dir * over * (1 - wa);
          if (wa === 1 && !room(a, ax)) a.x = Phaser.Math.Clamp(b.x + dir * need, ARENA_LEFT, ARENA_RIGHT);
          else a.x = Phaser.Math.Clamp(ax, ARENA_LEFT, ARENA_RIGHT);
          if (wa === 0 && !room(b, bx)) b.x = Phaser.Math.Clamp(a.x - dir * need, ARENA_LEFT, ARENA_RIGHT);
          else b.x = Phaser.Math.Clamp(bx, ARENA_LEFT, ARENA_RIGHT);
          continue;
        }
        const min = (a.height * a.scaleMul + b.height * b.scaleMul) * 0.36;
        const dx = b.x - a.x;
        const dy = (b.y - a.y) * 1.8;
        const d = Math.hypot(dx, dy);
        if (d >= min) continue;
        const push = ((min - d) / min) * 520 * dt;
        const nx = d > 0.01 ? dx / d : Math.random() - 0.5;
        const ny = d > 0.01 ? dy / d : Math.random() - 0.5;
        // Bigger fighters are pushed less.
        const wa = b.init.size / (a.init.size + b.init.size);
        const wb = 1 - wa;
        if (a.now >= a.busyUntil || !a.isMain) {
          a.x = Phaser.Math.Clamp(a.x - nx * push * wa * 2, ARENA_LEFT, ARENA_RIGHT);
          a.y = Phaser.Math.Clamp(a.y - ny * push * wa, FLOOR_TOP, FLOOR_BOTTOM);
        }
        if (b.now >= b.busyUntil || !b.isMain) {
          b.x = Phaser.Math.Clamp(b.x + nx * push * wb * 2, ARENA_LEFT, ARENA_RIGHT);
          b.y = Phaser.Math.Clamp(b.y + ny * push * wb, FLOOR_TOP, FLOOR_BOTTOM);
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.homing && p.target?.active) {
        const ang = Phaser.Math.Angle.Between(p.x, p.y, p.target.cx, p.target.cy);
        const sp = Math.hypot(p.vx, p.vy);
        const cur = Math.atan2(p.vy, p.vx);
        const next = Phaser.Math.Angle.RotateTo(cur, ang, 5 * dt);
        p.vx = Math.cos(next) * sp;
        p.vy = Math.sin(next) * sp;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.obj.setPosition(p.x, p.y);
      p.obj.rotation += p.spinRate * dt;
      // Collide with the first enemy whose body it is inside.
      for (const e of this.fighters) {
        if (!e.active || e.team === p.team || e.floored) continue;
        if (Math.abs(e.cx - p.x) < e.height * 0.3 && Math.abs(e.cy - p.y) < e.height * 0.45) {
          this.hit(e, p.power, p.color, p.from, p.status);
          p.life = 0;
          break;
        }
      }
      if (p.x < -100 || p.x > GAME_WIDTH + 100 || p.y < -200 || p.y > GAME_HEIGHT + 50) p.life = 0;
      if (p.life <= 0) {
        p.obj.destroy();
        p.trail?.stop();
        const t = p.trail;
        if (t) this.time.delayedCall(400, () => t.destroy());
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
  }

  private updateTraps(): void {
    for (const t of this.traps) {
      if (t.obj.active && this.now - t.armedAt > 12_000) {
        this.tweens.killTweensOf(t.obj);
        t.obj.destroy();
        continue;
      }
      if (this.now < t.armedAt || !t.obj.active) continue;
      const victim = this.fighters.find((e) => e.active && e.team !== t.team && !e.floored && Math.abs(e.x - t.x) < 55 && Math.abs(e.y - t.y) < 40);
      if (victim) {
        burst(this, t.x, t.y - 20, { count: 50, speed: 420, colors: [t.color, 0xffffff, 0xd02040] });
        shockwave(this, t.x, t.y, t.color, 120);
        sfxBoom(1);
        this.hit(victim, t.power, t.color, t.from, { kind: 'stun', duration: 1.2 });
        this.tweens.killTweensOf(t.obj);
        t.obj.destroy();
      }
    }
    this.traps = this.traps.filter((t) => t.obj.active);
  }

  private taunt(): void {
    if (this.now < this.nextTaunt || this.phase !== 'fight') return;
    this.nextTaunt = this.now + 5000 + Math.random() * 4000;
    const speakers = this.fighters.filter((f) => f.isMain && f.active && !f.floored && f.init.taunts?.length && f.canAct(this.now));
    const f = speakers[Math.floor(Math.random() * speakers.length)];
    if (!f) return;
    const key = this.pickTaunt(f);
    if (!key) return;
    // A dropped taunt (somebody was talking) tries again soon rather than waiting a full turn.
    void voiceBus.say(tauntLine(f.init.id, key), 'bark', f).then((ok) => {
      if (ok) return;
      this.nextTaunt = this.now + 1200;
      // Not said, so not counted.
      unsayTaunt(f.init.id, key);
    });
  }

  /**
   * A fighter's next taunt (item 087): the least said this episode, and none
   * a third time (a fighter who has said all of them twice goes quiet).
   */
  private pickTaunt(f: Fighter): string | undefined {
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

    for (const f of this.fighters) {
      if (f.active) this.think(f, dt);
    }
    this.fighters = this.fighters.filter((f) => f.alive || f.root.active);
    // Kept apart before they are drawn, so the screen never shows them inside one another (item 034).
    this.separate(dt);
    for (const f of this.fighters) {
      if (f.active) f.updateVisual(this.now, dt);
    }
    this.show.update(dt);
    if (this.choices.active) this.choices.holdHero();
    this.updateProjectiles(dt);
    this.updateTraps();
    this.taunt();
    this.hud.draw(this.heroes, this.villain, this.show);

    if (this.controls.dev('F2') && !isLeaving(this)) advance(this);
    else if (this.controls.dev('F9') && !isLeaving(this)) {
      // The grown-ups' page; it comes back to this battle (restarted) when closed. Marked
      // leaving (item 092): the director's last wait resolving this frame started the next step too.
      markLeaving(this);
      this.scene.start('Parent', { back: this.scene.key, data: { step: this.step } });
      return;
    }
    this.controls.endFrame();
    this.publish();
  }

  private fpsAcc = 0;
  private fpsFrames = 0;

  private publish(): void {
    this.fpsAcc += this.game.loop.delta;
    this.fpsFrames++;
    if (this.fpsAcc > 500) {
      hookState.fps = Math.round((this.fpsFrames * 1000) / this.fpsAcc);
      // Thin the particles when frames drop; restore them when they recover.
      if (hookState.fps < 40) fxQuality.level = Math.max(0.35, fxQuality.level - 0.15);
      else if (hookState.fps > 55) fxQuality.level = Math.min(1, fxQuality.level + 0.05);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    const info = (f: Fighter) => ({ id: f.init.id, hp: Math.round((100 * f.hp) / f.maxHp), status: f.floored ? 'floored' : (f.status?.kind ?? null), art: f.init.art });
    hookState.battle = {
      part: this.part,
      fight: this.fight.id,
      stage: this.show.info(),
      phase: this.phase,
      t: Math.round(this.now) / 1000,
      heroes: this.heroes.map(info),
      villains: [info(this.villain)],
      minions: this.fighters.filter((f) => f.active && !f.isMain).length,
      ...this.stats,
      me: this.heroes[0] ? { x: Math.round(this.heroes[0].x), y: Math.round(this.heroes[0].y) } : null,
      choice: this.choices.info(),
    };
  }
}
