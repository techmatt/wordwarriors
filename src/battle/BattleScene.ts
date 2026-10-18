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
 * (Julia's first play, 2026-10-18). The first choice of each part is the spell the helper taught
 * her in the house, so the word she learned is the one she fires first.
 *
 * Time: `now` is simulation time. Slow-mo, hit-stop and the choice freeze all
 * scale it, and the scene's tweens and timers with it (fx/juice timeScale).
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { CHARACTER_BY_ID, MINIONS, comboFor } from '../../content/battle/roster';
import type { AbilitySpec, Status } from '../../content/battle/types';
import { FETCH_BY_WORD } from '../../content/phonics/sentences';
import { fighterId, moveLine, nameLine, narratorLine, tauntLine, ultimateLine } from '../../content/voice/ids';
import { startMusic, stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxFanfare, sfxHit, sfxPoof, sfxRight, sfxSelect, sfxShield, sfxShout, sfxSummon, sfxUltimate, sfxWhoosh, sfxWrong } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, REACH, WALK_SPEED } from '../config';
import { advance, episode, helper, narrator, villainSpec, type Step } from '../episode/Episode';
import { burst, fitImage, flash, floatText, fxQuality, hitstop, punch, shake, shockwave, slowmo, speedLines, timeScale } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Controls } from '../input/Controls';
import { progress } from '../state/progress';
import { hookState } from '../testHooks';
import { voiceBank } from '../voice/VoiceBank';
import { makeButtonDot } from '../ui/ButtonDot';
import { Bubbles } from '../ui/Bubbles';
import { Caption } from '../ui/Caption';
import { cast, type BattleWorld, type Projectile, type Trap } from './abilities';
import { Fighter, FLOOR_BOTTOM, FLOOR_TOP, initFromMinion, initFromSpec, type FighterInit } from './Fighter';
import { ARENA_LEFT, ARENA_RIGHT, STEER } from './movement';

type Phase = 'intro' | 'fight' | 'choice' | 'combo' | 'ultimate' | 'counter' | 'finish' | 'end';

/** Cosmetic damage per point of ability power. Tuned so bars drift, not drop. */
const DAMAGE_PER_POWER = 2.6;
/** The move pads' glow. One colour for all: the word on the sign is the choice, never a colour. */
const PAD_GLOW = 0x7ad9ff;
/** How far a pad's word sign stands above its ring. */
const SIGN_RISE = 215;
/** Least distance between two pads' columns: a sign is 230 wide, so signs never touch. */
const PAD_GAP = 270;

/** A move word standing in the arena as a place she walks to. */
interface MovePad {
  word: string;
  x: number;
  y: number;
  /** The floor ring and its glow, pulsed by hand on wall-clock time. */
  ring: Phaser.GameObjects.Container;
  /** The word on its sign, above the fighters. */
  sign: Phaser.GameObjects.Container;
  /** Wall-clock ms its pop-in starts. */
  bornAt: number;
  /** Wall-clock ms of its last "not that one" wiggle. */
  wiggleAt?: number;
}

interface Choice {
  words: string[];
  right: string;
  owners: Map<string, { f: Fighter; ab: AbilitySpec }>;
  /** Everything the choice put on screen, destroyed when it closes. */
  objs: Phaser.GameObjects.GameObject[];
  pads: MovePad[];
  /** The pad she is standing at (within REACH), or null. */
  near: MovePad | null;
  /** The green dot over the lit pad. */
  dot: Phaser.GameObjects.Container;
  /** The "I am here" ring at her hero's feet. */
  here: Phaser.GameObjects.Ellipse;
  open: boolean;
  /** Wall-clock time the word was last said, for the idle re-prompt. */
  promptedAt: number;
  /**
   * Where her hero is during the choice, and how high she floats. Written back
   * every frame, so a leap, dash or spin that was mid-flight when the choice
   * opened (its timer still ticking on the frozen clock) cannot pull her off it.
   */
  at: { x: number; y: number; lift: number };
  /** Wrong pads she has picked so far in this choice. */
  misses: number;
  resolve: () => void;
}

export class BattleScene extends Phaser.Scene implements BattleWorld {
  part: 1 | 2 = 1;
  now = 0;
  fighters: Fighter[] = [];
  private projectiles: Projectile[] = [];
  private traps: Trap[] = [];
  private waits: { until: number; resolve: () => void }[] = [];
  private phase: Phase = 'intro';
  private heroes: Fighter[] = [];
  private villain!: Fighter;
  private helper: Fighter | null = null;
  private controls!: Controls;
  private darkRect!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Graphics;
  private hudLabels: Phaser.GameObjects.Text[] = [];
  private simRate = 1;
  private teamNextCast = { hero: 0, villain: 0 };
  private nextTaunt = 4000;
  private choice: Choice | null = null;
  /** Health floors (fraction of max) the director allows right now. */
  private floors = { heroMain: 0.3, villainMain: 0.4 };
  private stats = { abilitiesFired: 0, ultimates: 0, combos: 0, movePicks: 0 };
  private targetOf = new Map<number, { f: Fighter; until: number }>();
  /** Move choices opened this part: the first one is the learned spell. */
  private choicesOpened = 0;
  /** Fetched items used this part, for the tests. */
  private itemsUsed = 0;
  /** "Look what we found!" is said once per part, at the first item out of the bag. */
  private bagSaid = false;
  /** The step this battle was started with, so the parent page can come back to it. */
  private step: Step | undefined;

  constructor() {
    super('Battle');
  }

  init(data: { step?: Step }): void {
    this.step = data.step;
    this.part = data.step?.kind === 'battle' ? data.step.part : 1;
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
    this.choice = null;
    this.floors = { heroMain: 0.3, villainMain: this.part === 1 ? 0.45 : 0.3 };
    this.stats = { abilitiesFired: 0, ultimates: 0, combos: 0, movePicks: 0 };
    this.targetOf = new Map();
    this.choicesOpened = 0;
    this.itemsUsed = 0;
    this.bagSaid = false;
    this.hudLabels = [];
    this.bannerText = null;
    this.bannerBig = 0;
  }

  create(): void {
    this.gen++;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.gen++);
    hookState.scene = 'Battle';
    hookState.room = null;
    const v = villainSpec();
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, `arena_${v.arena}`).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(DEPTH.ground);
    this.darkRect = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0).setDepth(FLOOR_TOP - 5);
    this.controls = new Controls(this);
    new Caption(this);
    new Bubbles(this);
    this.hud = this.add.graphics().setDepth(DEPTH.hud);
    this.cameras.main.fadeIn(300);

    // The cast.
    const heroIds = [episode.hero, ...(episode.ally ? [episode.ally] : [])];
    heroIds.forEach((id, i) => {
      const spec = CHARACTER_BY_ID[id]!.good;
      const f = this.spawn(initFromSpec(spec, id, charArt(id, false), 'hero'), -120 - i * 100, 520 + i * 90);
      this.heroes.push(f);
    });
    const vid = fighterId(episode.villain, true);
    this.villain = this.spawn(initFromSpec(v.evil, vid, charArt(episode.villain, true), 'villain'), GAME_WIDTH + 160, 540);
    if (this.part === 2) for (const h of this.heroes) h.power = 1.25;

    this.makeHudLabels();
    fxQuality.level = 1;
    this.ambience();
    startMusic('battle');
    void (this.part === 1 ? this.part1() : this.part2());
  }

  // -- BattleWorld ------------------------------------------------------------------

  get stage(): Phaser.Scene {
    return this;
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
        fontFamily: '"Arial Black", sans-serif',
        fontSize: big ? '76px' : '44px',
        color: '#ffffff',
        stroke: `#${color.toString(16).padStart(6, '0')}`,
        strokeThickness: big ? 16 : 10,
        shadow: { offsetX: 0, offsetY: 6, color: '#000000', blur: 0, fill: true, stroke: true },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud + 2);
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
    if (target.invulnerable || target.shieldUntil > this.now) {
      burst(this, target.cx, target.cy, { count: 12, speed: 200, colors: [0xffffff, color] });
      if (target.isMain && Math.random() < 0.3) floatText(this, target.cx, target.top, 'BLOCK!', '#7ad9ff', 30);
      return;
    }
    // Clones pop on any hit.
    if (target.init.kind === 'clone') {
      sfxPoof();
      burst(this, target.cx, target.cy, { count: 30, speed: 300, colors: [target.init.palette[1], 0xffffff] });
      floatText(this, target.cx, target.top, 'POOF!', '#ffffff', 30);
      this.kill(target);
      return;
    }
    const dmg = power * DAMAGE_PER_POWER;
    const floor = target.isMain ? (target.team === 'hero' ? this.floors.heroMain : this.floors.villainMain) * target.maxHp : 0;
    // The floor stops a fall; it never lifts anybody back up.
    target.hp = Math.min(target.hp, Math.max(floor, target.hp - dmg));
    target.flashWhite();
    target.squash(Math.min(0.4, 0.12 + power * 0.06));
    target.lastHitAt = this.now;
    if (from) target.x = Phaser.Math.Clamp(target.x + Math.sign(target.x - from.x || 1) * Math.min(40, power * 10), ARENA_LEFT, ARENA_RIGHT);
    sfxHit(power);
    burst(this, target.cx, target.cy, { count: Math.min(40, 8 + power * 6), speed: 200 + power * 60, colors: [color, 0xffffff] });
    if (power >= 3) {
      hitstop(this, 60);
      shake(this, power, 160);
    }
    if (power >= 2 && Math.random() < 0.35) floatText(this, target.cx, target.top, ['POW!', 'BAM!', 'ZAP!', 'BOOM!', 'WHAM!'][Math.floor(Math.random() * 5)]!, `#${color.toString(16).padStart(6, '0')}`, 34);
    if (status && !(target.isMain && target.team === 'villain' && this.part === 1 && Math.random() < 0.5)) target.setStatus(status.kind, status.duration, this.now);
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

  /** Resolve after `s` seconds of simulation time. */
  private simWait(s: number): Promise<void> {
    return this.guard(new Promise((resolve) => this.waits.push({ until: this.now + s * 1000, resolve })));
  }

  private say(key: string): Promise<boolean> {
    return this.guard(voiceBus.say(narratorLine(narrator(), key)));
  }

  /**
   * The director is a chain of awaits; once this run of the scene is over
   * (F2, the advance to the next step) nothing in the chain may resume.
   */
  private gen = 0;

  private guard<T>(p: Promise<T>): Promise<T> {
    const g = this.gen;
    return p.then((v) => new Promise<T>((resolve) => {
      if (this.gen === g && this.sys.isActive()) resolve(v);
    }));
  }

  /** Falling/rising ambience per arena: embers, snow, sand, bubbles, sparks. */
  private ambience(): void {
    const arena = villainSpec().arena;
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
    const heroCards = this.heroes.map((h, i) => fitImage(this.add.image(-300 + i * 30, 440 + i * 40, h.init.art).setOrigin(0.5, 1), 190, 240));
    const villainCard = fitImage(this.add.image(GAME_WIDTH + 300, 450, this.villain.init.art).setOrigin(0.5, 1), 300, 360);
    ui.add([...heroCards, villainCard]);
    const vs = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'VS', { fontFamily: '"Arial Black", sans-serif', fontSize: '160px', color: '#ffd23f', stroke: '#000000', strokeThickness: 20 })
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
    await this.simWait(2.0);
    this.tweens.add({ targets: ui, alpha: 0, duration: 300, onComplete: () => ui.destroy() });
    await this.simWait(0.3);
  }

  private async intro(): Promise<void> {
    this.phase = 'intro';
    if (this.part === 1) await this.versus();
    // Everybody runs in from the sides.
    this.heroes.forEach((h, i) => this.tweens.add({ targets: h, x: 260 + i * 140, duration: 900, ease: 'Quad.easeOut' }));
    this.tweens.add({ targets: this.villain, x: 960, duration: 1100, ease: 'Quad.easeOut' });
    this.banner(this.part === 1 ? 'FIGHT!' : 'ROUND TWO!', 0xff3d7a, true);
    sfxFanfare();
    await this.say(this.part === 1 ? 'battle_start' : 'battle2_start');
    if (this.part === 2) await this.villainSays();
    for (const f of this.fighters) f.onStage = true;
    this.phase = 'fight';
  }

  private async part1(): Promise<void> {
    await this.intro();
    await this.simWait(1.5);
    await this.useAllFetched(3.5);
    await this.useMade(['helper', 'gem', 'ammo'], 3);
    await this.simWait(2.5);
    await this.moveChoice();
    await this.simWait(7);
    await this.combo();
    await this.simWait(6);
    await this.moveChoice();
    await this.simWait(7);
    await this.ultimate();
    this.phase = 'end';
    await this.villainSays();
    await this.say('retreat_1');
    this.retreat();
    await this.simWait(1.4);
    this.cameras.main.fadeOut(500);
    await this.simWait(0.6);
    advance(this);
  }

  private async part2(): Promise<void> {
    await this.intro();
    await this.simWait(1);
    await this.useAllFetched(3);
    await this.useMade(['helper', 'ammo', 'gem'], 2.5);
    await this.simWait(2);
    await this.moveChoice();
    await this.simWait(6);
    await this.combo();
    await this.simWait(5);
    await this.moveChoice();
    await this.simWait(5);
    await this.ultimate();
    await this.finish();
    this.phase = 'end';
    await this.simWait(1.2);
    this.cameras.main.fadeOut(500, 255, 255, 255);
    await this.simWait(0.6);
    advance(this);
  }

  /**
   * Part 1's end: the heroes bounce back up and run off left to get ready, so
   * the fade is on a retreat, never on a floored team. The villain stomps.
   */
  private retreat(): void {
    const team = [...this.heroes, ...(this.helper ? [this.helper] : [])].filter((h) => h.active);
    team.forEach((h, i) => {
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
  }

  /** The villain gets a word in at the big beats: a gloat, a challenge. */
  private async villainSays(): Promise<void> {
    const keys = this.villain.init.taunts ?? [];
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (!key) return;
    await this.guard(voiceBus.say(tauntLine(this.villain.init.id, key), 'instruction', this.villain));
  }

  /** Every key word she fetched in the house, used in turn, `gap` seconds apart. */
  private async useAllFetched(gap: number): Promise<void> {
    for (const word of episode.fetched) {
      if (!FETCH_BY_WORD[word]) continue;
      await this.useFetched(word);
      await this.simWait(gap);
    }
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
    // The bag: pops in over her head.
    const bag = fitImage(this.add.image(h.cx, h.top - 50, 'prop_bag'), 86, 86).setDepth(DEPTH.fx + 5);
    const bs = bag.scale;
    bag.setScale(0);
    this.tweens.add({ targets: bag, scale: bs, duration: 260, ease: 'Back.easeOut' });
    sfxWhoosh();
    if (!this.bagSaid) {
      this.bagSaid = true;
      void this.say('use_bag');
    }
    await this.simWait(0.35);
    // The picture jumps out of the bag, a squash on the bag as it goes.
    this.tweens.add({ targets: bag, scaleX: bs * 1.3, scaleY: bs * 0.7, duration: 90, yoyo: true });
    const pic = fitImage(this.add.image(bag.x, bag.y, `pic_${word}`), 120, 120).setDepth(DEPTH.fx + 6);
    const ps = pic.scale;
    pic.setScale(0.2 * ps);
    this.tweens.add({ targets: pic, y: bag.y - 110, scale: ps * 1.2, duration: 380, ease: 'Back.easeOut' });
    const halo = this.add.image(pic.x, bag.y - 110, TEX.glow).setTint(0xfff3a0).setScale(2.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx + 4);
    this.tweens.add({ targets: halo, scale: 3.4, alpha: 0.6, duration: 400, yoyo: true, repeat: 1 });
    sfxSummon();
    burst(this, pic.x, bag.y - 110, { count: 50, speed: 380, colors: [0xfff3a0, color, 0xffffff] });
    await this.simWait(0.45);
    // Its name, big, and then it is really used.
    this.banner(`THE ${word.toUpperCase()}!`, color === 0xffffff ? 0x7ad9ff : color, true);
    slowmo(this, 0.4, 700);
    speedLines(this, pic.x, pic.y, color, 600);
    cast(this, h, item.ability, this.villain, 1.8);
    this.stats.abilitiesFired++;
    this.itemsUsed++;
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
      await this.simWait(gap);
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
    gem.setScale(0);
    this.tweens.add({ targets: gem, scale: 90 / Math.max(gem.width, gem.height), duration: 300, ease: 'Back.easeOut' });
    await this.simWait(0.6);
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
      const id = narrator();
      cameo = this.spawn(initFromSpec(CHARACTER_BY_ID[id]!.good, id, charArt(id, false), 'hero'), -160, a.y + 30);
      cameo.invulnerable = true;
      b = cameo;
      void voiceBus.say(nameLine(id), 'bark', cameo);
      await this.simWait(0.45);
    }
    this.phase = 'combo';
    const ab = comboFor(a.init.id, b.init.id);
    // Both glow and fly together, then fire as one.
    for (const f of [a, b]) {
      f.setShield(1.5, ab.color, this.now);
      burst(this, f.cx, f.cy, { count: 40, speed: 300, colors: [ab.color, ab.color2 ?? 0xffffff] });
    }
    this.tweens.add({ targets: b, x: a.x + 90, y: a.y + 10, duration: 400 });
    this.banner(`${ab.name.toUpperCase()}!`, ab.color, true);
    slowmo(this, 0.35, 900);
    flash(this, ab.color, 160);
    speedLines(this, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2, ab.color, 800);
    await this.simWait(0.4);
    punch(this, 0.06, 180);
    cast(this, a, ab, this.villain, 2.2);
    cast(this, b, ab, this.villain, 1.4);
    this.stats.combos++;
    this.stats.abilitiesFired += 2;
    await this.simWait(1.5);
    if (cameo) {
      const c = cameo;
      c.busyUntil = this.now + 10_000;
      this.tweens.add({ targets: c, x: -220, duration: 600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    }
    if (this.phase === 'combo') this.phase = 'fight';
  }

  /**
   * The spell the helper taught her in the house: the helper's own move with
   * that word, fired by her hero. Null with no spell (or an unknown word).
   */
  private spellMove(): { word: string; ab: AbilitySpec } | null {
    const word = episode.spell;
    if (!word) return null;
    const ab =
      CHARACTER_BY_ID[helper()]?.good.abilities.find((a) => a.word === word) ??
      this.heroes.flatMap((h) => h.init.abilities).find((a) => a.word === word);
    return ab ? { word, ab } : null;
  }

  /**
   * Where the pads go: one row across the floor, so every sign stands right
   * above its own ring and no two pads share a column (a stacked pair put the
   * lower pad's word over the upper ring). The row and the columns are picked
   * to keep rings and signs clear of her hero and of the villain (and the
   * other big fighters), so she never walks into a fighter's card to choose.
   */
  private padSpots(n: number, me: Fighter): { x: number; y: number }[] {
    const avoid = [me, this.villain, ...this.fighters.filter((f) => f.active && f.isMain)].filter((f, i, a) => f?.active && a.indexOf(f) === i);
    /** How far a pad at (x, y) stays from every fighter: ring against feet, sign against body. */
    const clearance = (x: number, y: number): number => {
      let d = Infinity;
      for (const f of avoid) {
        d = Math.min(d, Math.hypot(x - f.x, (y - f.y) * 1.5), Math.hypot(x - f.cx, y - SIGN_RISE - f.cy));
      }
      return d;
    };
    const xs: number[] = [];
    for (let x = ARENA_LEFT + 110; x <= ARENA_RIGHT - 110; x += 40) xs.push(x);
    let best: { x: number; y: number }[] = [];
    let bestScore = -Infinity;
    // Not 640: a pad there sits under the caption ribbon while its word is said.
    for (const y of [480, 560]) {
      // Every set of n columns at least PAD_GAP apart (n is 2 or 3, so this is small).
      const walk = (from: number, picked: number[]): void => {
        if (picked.length === n) {
          const clear = Math.min(...picked.map((x) => clearance(x, y)));
          let gap = Infinity;
          for (let i = 1; i < picked.length; i++) gap = Math.min(gap, picked[i]! - picked[i - 1]!);
          // Clear enough counts the same however far; then spread out, then a little luck.
          const score = Math.min(clear, 240) * 3 + Math.min(gap, 420) * 0.25 + Math.random() * 25;
          if (score > bestScore) {
            bestScore = score;
            best = picked.map((x) => ({ x, y }));
          }
          return;
        }
        for (let i = from; i < xs.length; i++) {
          const x = xs[i]!;
          if (picked.length && x - picked[picked.length - 1]! < PAD_GAP) continue;
          walk(i + 1, [...picked, x]);
        }
      };
      walk(0, []);
    }
    return best;
  }

  /** One move word as a place: a glowing rune ring on the floor and its word on a sign above. */
  private makePad(word: string, x: number, y: number, bornAt: number): MovePad {
    const glow = this.add.image(0, 0, TEX.glow).setTint(PAD_GLOW).setScale(3.2, 1.3).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
    const disc = this.add.ellipse(0, 0, 190, 70, PAD_GLOW, 0.3).setStrokeStyle(6, 0xffffff, 0.9);
    const inner = this.add.ellipse(0, 0, 140, 46).setStrokeStyle(3, PAD_GLOW, 1);
    const runes = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return this.add.circle(Math.cos(a) * 82, Math.sin(a) * 29, 5, 0xffffff, 0.9);
    });
    const ring = this.add.container(x, y, [glow, disc, inner, ...runes]).setDepth(FLOOR_TOP - 3);
    const sy = y - SIGN_RISE;
    const plate = this.add.rectangle(0, 0, 230, 100, 0xfff8e8, 0.97).setStrokeStyle(7, PAD_GLOW);
    const stake = this.add.rectangle(0, 62, 10, 26, 0xfff8e8, 0.9);
    const label = this.add
      .text(0, 0, word.toUpperCase(), { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '76px', color: '#1a1030' })
      .setOrigin(0.5);
    const sign = this.add.container(x, sy, [stake, plate, label]).setDepth(DEPTH.prompt - 10);
    // Popped in from nothing by updateChoice, on wall-clock time.
    sign.setScale(0);
    ring.setScale(0);
    return { word, x, y, ring, sign, bornAt };
  }

  /** The move-choice pause. */
  private async moveChoice(): Promise<void> {
    // Move words come from the heroes' own abilities, plus the spell she learned.
    const owners = new Map<string, { f: Fighter; ab: AbilitySpec }>();
    for (const h of this.heroes) for (const ab of h.init.abilities) if (ab.word && !owners.has(ab.word)) owners.set(ab.word, { f: h, ab });
    const me = this.heroes[0]!;
    const spell = this.spellMove();
    if (spell) owners.set(spell.word, { f: me, ab: spell.ab });
    let words: string[];
    let right: string;
    if (spell && this.choicesOpened === 0) {
      // The first choice of each part is the spell: the word she learned is the one she fires.
      const others = Phaser.Utils.Array.Shuffle([...owners.keys()].filter((w) => w !== spell.word)).slice(0, 2);
      words = Phaser.Utils.Array.Shuffle([spell.word, ...others]);
      right = spell.word;
    } else {
      words = Phaser.Utils.Array.Shuffle([...owners.keys()]).slice(0, Math.min(3, owners.size));
      right = words[Math.floor(Math.random() * words.length)]!;
    }
    if (words.length < 2) return;
    this.choicesOpened++;

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
    const objs: Phaser.GameObjects.GameObject[] = [];
    // A light dim behind the fighters (not over them), so the pads and signs read.
    objs.push(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0018, 0.3).setDepth(FLOOR_TOP - 3.5));
    objs.push(
      this.add
        .text(GAME_WIDTH / 2, 110, 'PICK A MOVE!', { fontFamily: '"Arial Black", sans-serif', fontSize: '56px', color: '#ffd23f', stroke: '#000000', strokeThickness: 12 })
        .setOrigin(0.5)
        .setDepth(DEPTH.overlay),
    );
    const pads = this.padSpots(words.length, me).map((p, i) => this.makePad(words[i]!, p.x, p.y, performance.now() + 120 + i * 140));
    for (const p of pads) objs.push(p.ring, p.sign);
    const dot = makeButtonDot(this, 0, 0, 'green', 22, false).setDepth(DEPTH.prompt).setVisible(false);
    objs.push(dot);
    // "I am here": a white ring at her hero's feet, so she finds herself among the signs.
    const here = this.add.ellipse(me.x, me.y, 150, 52).setStrokeStyle(6, 0xffffff, 0.95).setDepth(DEPTH.prompt - 6);
    objs.push(here);

    let misses = 0;
    await new Promise<void>((resolve) => {
      const c: Choice = { words, right, owners, objs, pads, near: null, dot, here, open: false, promptedAt: 0, at, misses: 0, resolve: () => {
        misses = c.misses;
        resolve();
      } };
      this.choice = c;
      void (async () => {
        await this.say('move_pick');
        await this.say(`use_move_${right}`);
        if (this.choice) {
          this.choice.open = true;
          this.choice.promptedAt = performance.now();
        }
      })();
    });

    for (const o of objs) o.destroy();
    me.lean = 0;
    this.choice = null;
    this.simRate = 1;
    this.stats.movePicks++;
    // Only the right pad ever closes the choice; the misses are recorded, never punished.
    progress.record('words', right, misses === 0, misses);
    // The victory recap reads episode.read: a battle word she picked right is one she read.
    if (!episode.read.includes(right)) episode.read.push(right);
    const { f, ab } = owners.get(right)!;
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
    this.banner('SUPER!', 0xffd23f, true);
    void (async () => {
      if (voiceBank.has(moveLine(f.init.id, ab.id))) await this.guard(voiceBus.say(moveLine(f.init.id, ab.id), 'instruction', f));
      await this.say('move_great');
    })();
    this.stats.abilitiesFired++;
    this.phase = 'fight';
  }

  /** Pick a word: green on a lit pad, or F4. Only the right word closes the choice. */
  private pickChoice(word: string): void {
    const c = this.choice;
    if (!c || !c.open) return;
    c.open = false;
    if (word === c.right) {
      c.resolve();
      return;
    }
    void this.missChoice(c, word);
  }

  /**
   * A wrong pad: nothing fires and the fight stays frozen. A wiggle and a
   * giggle on the pad, then the partner says what it was and what to find
   * (her pick has been made, so its word may be said), and the pads open again.
   */
  private async missChoice(c: Choice, word: string): Promise<void> {
    c.misses++;
    sfxWrong();
    const pad = c.pads.find((p) => p.word === word);
    if (pad) pad.wiggleAt = performance.now();
    const n = narrator();
    await this.guard(voiceBus.sequence([narratorLine(n, `not_move_${c.right}`), narratorLine(n, `was_move_${word}`), narratorLine(n, `find_move_${c.right}`)]));
    if (this.choice !== c) return;
    c.open = true;
    c.promptedAt = performance.now();
  }

  /** Pin her hero to where she walked in the choice: no leftover move timer or hop moves her. */
  private holdHero(): void {
    const c = this.choice;
    const me = this.heroes[0];
    if (!c || !me?.active) return;
    me.x = c.at.x;
    me.y = c.at.y;
    me.lift = c.at.lift;
    me.hop = 0;
    me.spin = 0;
    // Above the word signs while she steers (updateVisual sets depth by y, so this runs after it).
    me.root.setDepth(DEPTH.prompt - 5);
    c.here.setPosition(me.x, me.y).setScale(1 + 0.1 * Math.sin(performance.now() / 180));
  }

  /**
   * The choice, every frame, on real time (the scene clock is nearly frozen):
   * her hero walks with the stick, the pad she stands at lights up with a
   * green dot, green there picks it. Yellow or ten quiet seconds says it again.
   */
  private updateChoice(realDt: number): void {
    const c = this.choice!;
    const me = this.heroes[0]!;
    const mv = this.controls.move;
    if (mv.lengthSq() > 0.04 && me.active) {
      c.at.x = Phaser.Math.Clamp(c.at.x + mv.x * WALK_SPEED * realDt, ARENA_LEFT, ARENA_RIGHT);
      c.at.y = Phaser.Math.Clamp(c.at.y + mv.y * WALK_SPEED * 0.8 * realDt, FLOOR_TOP, FLOOR_BOTTOM);
      me.lean = Phaser.Math.Clamp(mv.x * 0.2, -0.25, 0.25);
    } else me.lean = 0;
    this.holdHero();

    let near: MovePad | null = null;
    let best = REACH;
    for (const p of c.pads) {
      const d = Phaser.Math.Distance.Between(me.x, me.y, p.x, p.y);
      if (d < best) {
        near = p;
        best = d;
      }
    }
    if (near !== c.near) {
      c.near = near;
      if (near) sfxSelect();
    }
    const wall = performance.now();
    const pulse = 1 + 0.06 * Math.sin(wall / 160);
    for (const p of c.pads) {
      const k = Phaser.Math.Clamp((wall - p.bornAt) / 260, 0, 1);
      const pop = k <= 0 ? 0 : Phaser.Math.Easing.Back.Out(k);
      const lit = p === near;
      p.ring.setScale(pop * (lit ? 1.2 : 1) * (c.open ? pulse : 1));
      p.ring.setAlpha(lit ? 1 : 0.8);
      p.sign.setScale(pop * (lit ? 1.12 : 1));
      // A wrong pick wiggles its sign side to side for half a second.
      const w = p.wiggleAt === undefined ? 1 : (wall - p.wiggleAt) / 500;
      p.sign.setX(p.x + (w < 1 ? Math.sin(w * Math.PI * 8) * 14 * (1 - w) : 0));
    }
    c.dot.setVisible(Boolean(near && c.open));
    if (near) c.dot.setPosition(near.x, near.sign.y - 90).setScale(pulse);

    // Green with no pad lit does nothing: no hop in the choice.
    if (this.controls.pressed('green') && near && c.open) this.pickChoice(near.word);
    if (this.controls.dev('F4') && this.choice) {
      c.open = true;
      this.pickChoice(c.right);
    }
    if (c.open && (this.controls.pressed('yellow') || (wall - c.promptedAt > 10_000 && !voiceBus.busy))) {
      // Green is ignored while the instruction plays, as on the first prompt:
      // the pads close for the line and open again when it ends.
      c.open = false;
      c.promptedAt = wall;
      void voiceBus.say(narratorLine(narrator(), `use_move_${c.right}`)).then(() => {
        if (this.choice !== c) return;
        c.open = true;
        c.promptedAt = performance.now();
      });
    }
  }

  /** The villain's ultimate. Part 1: the heroes are floored. Part 2: the counter-item answers it. */
  private async ultimate(): Promise<void> {
    this.phase = 'ultimate';
    const v = this.villain;
    const ult = v.init.ultimate!;
    // The villain winds up as itself, not as a pig or an ice block.
    v.status = null;
    v.clearOverlay();
    this.tweens.add({ targets: v, x: 900, y: 560, duration: 600 });
    // Everyone back to their own side, so the big moment reads left against right.
    this.heroes.forEach((h, i) => {
      h.status = null;
      h.clearOverlay();
      this.tweens.add({ targets: h, x: 260 + i * 150, y: 500 + i * 70, duration: 600, ease: 'Quad.easeOut' });
    });
    if (this.helper?.active) this.tweens.add({ targets: this.helper, x: 150, y: 600, duration: 600 });
    await this.simWait(0.6);
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
    this.banner(`${ult.name.toUpperCase()}!`, ult.color, true);
    slowmo(this, 0.4, 1200);
    speedLines(this, v.cx, v.cy, ult.color, 1200);
    punch(this, 0.08, 300);
    void voiceBus.say(ultimateLine(v.init.id), 'instruction', v);
    this.stats.ultimates++;
    await this.simWait(1.4);

    if (this.part === 1) {
      // Too strong: the heroes are floored, dizzy and fine.
      this.floors.heroMain = 0.06;
      cast(this, v, ult, this.heroes[0] ?? null, 2.6);
      await this.simWait(2.2);
      flash(this, 0xffffff, 300);
      hitstop(this, 160);
      shake(this, 8, 600);
      punch(this, 0.1, 220);
      sfxBoom(3);
      for (const h of [...this.heroes, ...(this.helper ? [this.helper] : [])]) {
        if (!h.active) continue;
        h.hp = Math.min(h.hp, h.maxHp * 0.08);
        h.floored = true;
        h.lift = 0;
        h.setStatus('stun', 99, this.now);
        burst(this, h.cx, h.cy, { count: 40, speed: 400, colors: [ult.color, 0xffffff] });
      }
      floatText(this, GAME_WIDTH / 2 - 200, 300, 'WHOA! TOO STRONG!', '#ffd23f', 60);
      this.darken(0.35, 600);
      await this.simWait(1.2);
      return;
    }

    // Part 2: the counter-item.
    this.phase = 'counter';
    const counter = villainSpec().counter;
    for (const h of this.heroes) h.invulnerable = true;
    if (this.helper) this.helper.invulnerable = true;
    const h = this.heroes[0]!;
    void this.say('use_item');
    const item = fitImage(this.add.image(h.cx, h.top - 90, `item_${counter.id}`), 130, 130).setDepth(DEPTH.fx + 5);
    const s = item.scale;
    item.setScale(0);
    this.tweens.add({ targets: item, scale: s * 1.4, duration: 400, ease: 'Back.easeOut' });
    const halo = this.add.image(item.x, item.y, TEX.glow).setTint(0xfff3a0).setScale(3).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx + 4);
    this.tweens.add({ targets: halo, scale: 5, alpha: 0.6, duration: 500, yoyo: true, repeat: -1 });
    sfxSummon();
    flash(this, 0xfff3a0, 250);
    speedLines(this, item.x, item.y, 0xfff3a0, 900);
    this.banner(`${counter.name.toUpperCase()}!`, 0xffb703, true);
    await this.simWait(0.6);

    if (counter.how === 'scare') {
      // Wind-up mice (or brave rats): a swarm scurries along the floor at the villain, who
      // leaps up in fright mid-ultimate (a stretch and a lift, no spin), and
      // the ultimate fizzles out before it is ever fired.
      for (let i = 0; i < 12; i++) this.after(i * 70, () => this.scurry(h, v, i));
      await this.simWait(0.75);
      aura.stop();
      v.growUntil = 0;
      sfxShout(1.6);
      floatText(this, v.cx, v.top - 40, 'EEK!', '#ff9ad5', 84);
      shake(this, 3, 300);
      this.tweens.addCounter({ from: 0, to: 1, duration: 750, ease: 'Sine.easeInOut', onUpdate: (tw) => (v.lift = Math.sin((tw.getValue() ?? 0) * Math.PI) * 190), onComplete: () => (v.lift = 0) });
      const bs = v.baseScale;
      this.tweens.add({ targets: v.sprite, scaleX: bs * 0.72, scaleY: bs * 1.45, duration: 170, yoyo: true, repeat: 1, onComplete: () => v.sprite.setScale(bs) });
      await this.simWait(0.8);
      // The fizzle: the charge goes out of it in a grey puff.
      sfxPoof();
      burst(this, v.cx, v.cy, { count: 50, speed: 260, colors: [0x888888, 0xcccccc, ult.color], life: 900 });
      floatText(this, v.cx + 60, v.cy, 'FIZZLE!', '#cccccc', 44);
      await this.simWait(1.0);
    } else if (counter.how === 'block' || counter.how === 'reflect') {
      // A dome over the heroes; the ultimate crashes into it.
      const dome = this.add.ellipse(h.x + 60, h.y - 60, 520, 360, 0x9ad8ff, 0.18).setStrokeStyle(10, 0xffffff, 0.9).setDepth(DEPTH.fx + 3);
      dome.setScale(0);
      this.tweens.add({ targets: dome, scale: 1, duration: 300, ease: 'Back.easeOut' });
      sfxShield();
      cast(this, v, ult, h, 2.2);
      await this.simWait(1.8);
      floatText(this, h.x + 60, h.y - 280, 'BLOCKED!', '#7ad9ff', 70);
      if (counter.how === 'reflect') {
        this.banner('BOUNCE BACK!', 0x7ad9ff, true);
        const mirrored: AbilitySpec = { ...ult, power: ult.power };
        cast(this, h, mirrored, v, 2.4);
        await this.simWait(1.6);
      }
      this.tweens.add({ targets: dome, alpha: 0, duration: 400, onComplete: () => dome.destroy() });
    } else {
      // The ultimate really happens first (the sun is swallowed, the clones
      // appear, the lasers fire), with the heroes shielded by the item's glow;
      // then the item visibly undoes it.
      cast(this, v, ult, h, 2.0);
      await this.simWait(1.6);
      // A beam of the item's own light straight into the villain.
      const light: AbilitySpec = { id: 'counter_light', name: counter.name, kind: 'beam', cooldown: 0, color: 0xfff3a0, color2: 0xffb703, power: 3 };
      cast(this, h, light, v, 2.4);
      if (counter.how === 'restore') {
        // The light comes back: the sun pops into the sky with rays.
        this.darken(0, 900);
        const sun = this.add.image(GAME_WIDTH * 0.72, 120, 'prop_sun').setDisplaySize(160, 160).setDepth(FLOOR_TOP - 3);
        const ss = sun.scale;
        sun.setScale(0);
        this.tweens.add({ targets: sun, scale: ss, duration: 500, ease: 'Back.easeOut' });
        speedLines(this, sun.x, sun.y, 0xffd23f, 900);
        burst(this, sun.x, sun.y, { count: 90, speed: 500, colors: [0xffd23f, 0xffffff, 0xff9a3c] });
        sfxFanfare();
      }
      if (counter.how === 'reveal') {
        for (const c of this.fighters.filter((f) => f.init.kind === 'clone')) this.hit(c, 1, 0xffffff, h);
      }
      if (counter.how === 'shutdown') {
        await this.simWait(0.6);
        v.baseTint = 0x777777;
        v.restoreTint();
        floatText(this, v.cx, v.top, 'POWER OFF!', '#ff5a6a', 56);
      }
      if (counter.how === 'calm') {
        await this.simWait(0.4);
        for (let i = 0; i < 12; i++) this.after(i * 80, () => floatText(this, v.cx + (Math.random() - 0.5) * 200, v.cy + (Math.random() - 0.5) * 120, '💖', '#ff5ab4', 40));
      }
      await this.simWait(1.4);
    }
    this.tweens.killTweensOf(halo);
    halo.destroy();
    this.tweens.add({ targets: item, alpha: 0, scale: 0, duration: 400, onComplete: () => item.destroy() });
    this.darken(0, 600);
    v.growUntil = 0;
    v.setStatus('stun', 99, this.now);
    floatText(this, v.cx, v.top - 20, 'DIZZY!', '#ffd23f', 56);
    await this.simWait(0.8);
  }

  /** One wind-up mouse: low and fast along the floor from her side to the villain, then off the edge. */
  private scurry(from: Fighter, to: Fighter, i: number): void {
    const y0 = Phaser.Math.Clamp(from.y + (Math.random() - 0.5) * 60, FLOOR_TOP, FLOOR_BOTTOM);
    const m = this.add.text(from.x + 30, y0, villainSpec().counter.glyph, { fontSize: '42px' }).setOrigin(0.5, 1).setDepth(y0 + 2);
    const ty = Phaser.Math.Clamp(to.y + (Math.random() - 0.5) * 70, FLOOR_TOP, FLOOR_BOTTOM);
    // A scurry: quick little squashes, never a spin.
    this.tweens.add({ targets: m, scaleY: 0.78, scaleX: 1.12, duration: 60, yoyo: true, repeat: -1 });
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
    await this.say('finish');
    // Low, but not zero: the last hit below is the one that wins.
    this.floors.villainMain = 0.06;
    const team = [...this.heroes, ...(this.helper ? [this.helper] : [])];
    for (const [i, h] of team.entries()) {
      this.after(i * 700, () => {
        const ab = h.init.ultimate ?? h.init.abilities[0]!;
        cast(this, h, ab, v, 2.0, true);
        this.stats.abilitiesFired++;
      });
    }
    await this.simWait(team.length * 0.7 + 0.5);
    if (episode.made.ammo) await this.useAmmo();
    await this.simWait(1.6);
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
    this.banner('VICTORY!', 0xffd23f, true);
    for (const f of this.fighters) if (f.team === 'villain' && !f.isMain && f.active) this.kill(f);
    // The villain spins, shrinks into a puff, and comes back as the good version.
    // A stretch up, then a squash to nothing: scale only.
    v.alive = false;
    this.tweens.add({ targets: v.body, scaleX: 0.4, scaleY: 1.6, duration: 350, ease: 'Quad.easeOut', yoyo: false });
    this.tweens.add({ targets: v.body, scaleX: 1.8, scaleY: 0, duration: 500, delay: 350, ease: 'Back.easeIn' });
    await this.simWait(1.0);
    sfxPoof();
    const good = fitImage(this.add.image(v.x, v.y, charArt(episode.villain, false)).setOrigin(0.5, 1), 150, 190).setDepth(v.y + 1);
    const gs = good.scale;
    good.setScale(0);
    this.tweens.add({ targets: good, scale: gs, duration: 500, ease: 'Back.easeOut' });
    burst(this, v.x, v.y - 90, { count: 60, speed: 400, colors: [0xff9ad5, 0xffffff] });
    v.alive = false;
    v.root.setVisible(false);
    for (const h of this.heroes) h.invulnerable = false;
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
    // Her own hero runs where she pushes the stick; everything else stays automatic.
    const steered = f === this.heroes[0] && fighting && this.controls.move.lengthSq() > 0.04;
    if (steered) {
      // Forget any half-taken giant step, or letting go would snap her back.
      delete f.mem.stepTo;
      const sp = f.init.speed * 1.3;
      f.vx = this.controls.move.x * sp;
      f.vy = this.controls.move.y * sp * 0.7;
      f.x = Phaser.Math.Clamp(f.x + f.vx * dt, ARENA_LEFT, ARENA_RIGHT);
      f.y = Phaser.Math.Clamp(f.y + f.vy * dt, FLOOR_TOP, FLOOR_BOTTOM);
      f.lean = Phaser.Math.Clamp(f.vx / 900, -0.25, 0.25);
    } else if (moving) STEER[f.init.style](f, { scene: this, now: this.now, dt, target });
    // Each side drifts back towards its own ground, so the fight stays framed
    // heroes-left, villain-right instead of wandering off one edge.
    if (moving && !steered && (f.isMain || f.init.kind === 'helper')) {
      const home = f.team === 'hero' ? 400 : 900;
      f.x += (home - f.x) * Math.min(1, (f.team === 'villain' ? 1.2 : 0.8) * dt);
    }
    if (!fighting || !target) return;

    // Casting: one team member at a time, so moves read instead of blurring.
    const teamKey = f.team;
    if (this.now < this.teamNextCast[teamKey] && f.isMain) return;
    for (const ab of f.init.abilities) {
      if (!f.ready(ab, this.now)) continue;
      if (ab.kind === 'heal' && this.alliesOf(f).every((a) => a.hp > a.maxHp * 0.7) && f.hp > f.maxHp * 0.7) continue;
      f.use(ab, this.now);
      cast(this, f, ab, target, f.init.kind === 'helper' ? 1.4 : 1, f.isMain && ab.power >= 2);
      // Big moves are called out by name, if nobody else is talking.
      // A move that is also a choice word is never called out in the fight:
      // hearing it named then would give the choice away.
      if (f.isMain && ab.power >= 2 && !ab.word && Math.random() < 0.5) void voiceBus.say(moveLine(f.init.id, ab.id), 'bark', f);
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
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i]!;
        const b = live[j]!;
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
    const key = f.init.taunts![Math.floor(Math.random() * f.init.taunts!.length)]!;
    // A dropped taunt (somebody was talking) tries again soon rather than waiting a full turn.
    void voiceBus.say(tauntLine(f.init.id, key), 'bark', f).then((ok) => {
      if (!ok) this.nextTaunt = this.now + 1200;
    });
  }

  // -- HUD -------------------------------------------------------------------------

  private makeHudLabels(): void {
    const style = { fontFamily: '"Arial Black", sans-serif', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 5 };
    this.heroes.forEach((h, i) => {
      this.hudLabels.push(this.add.text(30, 14 + i * 44, h.init.name.toUpperCase(), style).setDepth(DEPTH.hud + 1));
    });
    this.hudLabels.push(this.add.text(GAME_WIDTH - 30, 14, this.villain.init.name.toUpperCase(), style).setOrigin(1, 0).setDepth(DEPTH.hud + 1));

    // What she fetched in the house (and the counter-item, once made), in a
    // row beside the heroes' bars, so the link from reading to the fight
    // stays on screen the whole battle. The parked games' things too, if set.
    const made: string[] = episode.fetched.filter((w) => FETCH_BY_WORD[w]).map((w) => `pic_${w}`);
    if (episode.made.gem) made.push('prop_gem');
    if (episode.made.ammo) made.push('prop_ammo');
    if (episode.made.helper) made.push('minion_helper');
    if (episode.made.item) made.push(`item_${villainSpec().counter.id}`);
    made.forEach((key, i) => {
      const icon = fitImage(this.add.image(370 + i * 58, 40, key), 50, 50).setDepth(DEPTH.hud + 1);
      const s = icon.scale;
      icon.setScale(0);
      this.tweens.add({ targets: icon, scale: s, duration: 300, delay: 300 + i * 120, ease: 'Back.easeOut' });
    });
  }

  private drawHud(): void {
    const g = this.hud;
    g.clear();
    const bar = (x: number, y: number, w: number, frac: number, color: number, alignRight: boolean) => {
      g.fillStyle(0x000000, 0.6).fillRoundedRect(x - 3, y - 3, w + 6, 20, 8);
      const fw = Math.max(0, w * frac);
      g.fillStyle(color, 1).fillRoundedRect(alignRight ? x + w - fw : x, y, fw, 14, 6);
      g.fillStyle(0xffffff, 0.35).fillRect(alignRight ? x + w - fw : x, y + 2, fw, 4);
    };
    this.heroes.forEach((h, i) => bar(30, 38 + i * 44, 300, h.hp / h.maxHp, 0x44d95a, false));
    bar(GAME_WIDTH - 30 - 420, 38, 420, this.villain.hp / this.villain.maxHp, 0xe8483f, true);
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
      if (obj instanceof Phaser.GameObjects.Particles.ParticleEmitter) obj.timeScale = ts;
    }
    const realDt = Math.min(0.05, deltaMs / 1000);
    const dt = realDt * ts;
    this.now += deltaMs * ts;

    // Director waits.
    const due = this.waits.filter((w) => w.until <= this.now);
    this.waits = this.waits.filter((w) => w.until > this.now);
    for (const w of due) w.resolve();

    // The choice runs on real time: she walks while the fight is frozen.
    if (this.choice) this.updateChoice(realDt);

    // Green outside a choice makes her hero hop with a sparkle: buttons always answer.
    const me = this.heroes[0];
    if (!this.choice && this.controls.pressed('green') && me?.active && !me.floored && this.phase === 'fight' && me.hop === 0) {
      this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: (tw) => (me.hop = Math.sin((tw.getValue() ?? 0) * Math.PI) * 90), onComplete: () => (me.hop = 0) });
      burst(this, me.cx, me.y, { count: 18, speed: 220, colors: [me.init.palette[1], 0xffffff] });
      me.squash(0.3);
    }

    for (const f of this.fighters) {
      if (!f.active) continue;
      this.think(f, dt);
      f.updateVisual(this.now, dt);
    }
    this.fighters = this.fighters.filter((f) => f.alive || f.root.active);
    this.separate(dt);
    if (this.choice) this.holdHero();
    this.updateProjectiles(dt);
    this.updateTraps();
    this.taunt();
    this.drawHud();

    if (this.controls.dev('F2')) advance(this);
    else if (this.controls.dev('F9')) {
      // The grown-ups' page; it comes back to this battle (restarted) when closed.
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
    const info = (f: Fighter) => ({ id: f.init.id, hp: Math.round((100 * f.hp) / f.maxHp), status: f.floored ? 'floored' : (f.status?.kind ?? null) });
    hookState.battle = {
      part: this.part,
      phase: this.phase,
      t: Math.round(this.now) / 1000,
      heroes: this.heroes.map(info),
      villains: [info(this.villain)],
      minions: this.fighters.filter((f) => f.active && !f.isMain).length,
      ...this.stats,
      itemsUsed: this.itemsUsed,
      me: this.heroes[0] ? { x: Math.round(this.heroes[0].x), y: Math.round(this.heroes[0].y) } : null,
      choice: this.choice
        ? { words: this.choice.words, right: this.choice.right, open: this.choice.open, misses: this.choice.misses, spots: this.choice.pads.map((p) => ({ word: p.word, x: p.x, y: p.y })) }
        : null,
    };
  }
}
