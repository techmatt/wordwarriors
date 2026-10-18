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
 *   Part 1: charge → helper / power gem / star ammo show off what she made →
 *   move choice → team combo → move choice → the villain's ultimate floors the
 *   heroes → "Too strong! Retreat!" (never "you lost").
 *   Part 2: round two → the made things again → move choice → combo → the
 *   ultimate starts, the counter-item visibly blocks or reverses it → the
 *   villain is stunned → everyone's finisher → victory.
 *
 * The move choice pauses the fight in near-freeze: 2–3 move words on coloured
 * dots, the partner says which one to use, she presses that colour. Right =
 * supercharged version, wrong = that move, plainer. It changes nothing else.
 *
 * Time: `now` is simulation time. Slow-mo, hit-stop and the choice freeze all
 * scale it, and the scene's tweens and timers with it (fx/juice timeScale).
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { CHARACTER_BY_ID, MINIONS, comboFor } from '../../content/battle/roster';
import type { AbilitySpec, Status } from '../../content/battle/types';
import { fighterId, moveLine, narratorLine, tauntLine, ultimateLine } from '../../content/voice/ids';
import { startMusic, stopMusic } from '../audio/music';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxFanfare, sfxHit, sfxPoof, sfxRight, sfxSelect, sfxShield, sfxSummon, sfxUltimate, sfxWrong } from '../audio/sfx';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, PAD_COLOR, type PadColorName } from '../config';
import { advance, episode, narrator, villainSpec, type Step } from '../episode/Episode';
import { burst, fitImage, flash, floatText, hitstop, punch, shake, shockwave, slowmo, speedLines, timeScale } from '../fx/juice';
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
const CHOICE_COLORS: PadColorName[] = ['green', 'blue', 'yellow', 'red'];

interface Choice {
  words: string[];
  colors: PadColorName[];
  right: string;
  owners: Map<string, { f: Fighter; ab: AbilitySpec }>;
  ui: Phaser.GameObjects.Container;
  /** The dots, pulsed by hand on wall-clock time: the scene clock is frozen. */
  dots: Phaser.GameObjects.Container[];
  open: boolean;
  resolve: (picked: string) => void;
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

  constructor() {
    super('Battle');
  }

  init(data: { step?: Step }): void {
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
    this.hudLabels = [];
  }

  create(): void {
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
    this.tweens.add({ targets: f.root, scale: 0, angle: 360, duration: 250, onComplete: () => f.destroy() });
  }

  // -- director ----------------------------------------------------------------------

  /** Resolve after `s` seconds of simulation time. */
  private simWait(s: number): Promise<void> {
    return new Promise((resolve) => this.waits.push({ until: this.now + s * 1000, resolve }));
  }

  private say(key: string): Promise<boolean> {
    return voiceBus.say(narratorLine(narrator(), key));
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
    this.phase = 'fight';
  }

  private async part1(): Promise<void> {
    await this.intro();
    await this.simWait(1.5);
    await this.useHelper();
    await this.simWait(2.5);
    await this.useGem();
    await this.simWait(4);
    await this.useAmmo();
    await this.simWait(4);
    await this.moveChoice();
    await this.simWait(7);
    await this.combo();
    await this.simWait(6);
    await this.moveChoice();
    await this.simWait(7);
    await this.ultimate();
    this.phase = 'end';
    await this.say('retreat_1');
    await this.simWait(0.5);
    this.cameras.main.fadeOut(500);
    await this.simWait(0.6);
    advance(this);
  }

  private async part2(): Promise<void> {
    await this.intro();
    await this.simWait(1);
    await this.useHelper();
    await this.simWait(2);
    await this.useAmmo();
    await this.simWait(3);
    await this.useGem();
    await this.simWait(3);
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
    const b = this.heroes[1] ?? this.helper;
    if (!b || !b.active) return;
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
    if (this.phase === 'combo') this.phase = 'fight';
  }

  /** The move-choice pause. */
  private async moveChoice(): Promise<void> {
    // Move words come from the heroes' own abilities.
    const owners = new Map<string, { f: Fighter; ab: AbilitySpec }>();
    for (const h of this.heroes) for (const ab of h.init.abilities) if (ab.word && !owners.has(ab.word)) owners.set(ab.word, { f: h, ab });
    const words = Phaser.Utils.Array.Shuffle([...owners.keys()]).slice(0, Math.min(3, owners.size));
    if (words.length < 2) return;
    const right = words[Math.floor(Math.random() * words.length)]!;
    const colors = Phaser.Utils.Array.Shuffle([...CHOICE_COLORS]).slice(0, words.length) as PadColorName[];

    this.phase = 'choice';
    this.simRate = 0.04;
    const ui = this.add.container(0, 0).setDepth(DEPTH.overlay);
    ui.add(this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45));
    ui.add(
      this.add
        .text(GAME_WIDTH / 2, 150, 'PICK A MOVE!', { fontFamily: '"Arial Black", sans-serif', fontSize: '64px', color: '#ffd23f', stroke: '#000000', strokeThickness: 12 })
        .setOrigin(0.5),
    );
    const dots: Phaser.GameObjects.Container[] = [];
    words.forEach((w, i) => {
      const x = GAME_WIDTH / 2 + (i - (words.length - 1) / 2) * 330;
      const dot = makeButtonDot(this, x, 330, colors[i]!, 56, false);
      dots.push(dot);
      const plate = this.add.rectangle(x, 450, 260, 110, 0xffffff, 0.95).setStrokeStyle(8, PAD_COLOR[colors[i]!]);
      const label = this.add
        .text(x, 450, w, { fontFamily: '"Comic Sans MS", "Arial Rounded MT Bold", sans-serif', fontSize: '84px', color: '#1a1030' })
        .setOrigin(0.5);
      ui.add([dot, plate, label]);
    });

    const picked = await new Promise<string>((resolve) => {
      this.choice = { words, colors, right, owners, ui, dots, open: false, resolve };
      void (async () => {
        await this.say('move_pick');
        await this.say(`use_move_${right}`);
        if (this.choice) this.choice.open = true;
      })();
    });

    ui.destroy();
    this.choice = null;
    this.simRate = 1;
    this.stats.movePicks++;
    const good = picked === right;
    progress.record('words', right, good, good ? 0 : 1);
    const { f, ab } = owners.get(picked)!;
    if (good) {
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
        if (voiceBank.has(moveLine(f.init.id, ab.id))) await voiceBus.say(moveLine(f.init.id, ab.id), 'instruction', f);
        await this.say('move_great');
      })();
    } else {
      sfxSelect();
      cast(this, f, ab, this.villain, 1, true);
      void this.say('move_ok');
    }
    this.stats.abilitiesFired++;
    this.phase = 'fight';
  }

  /** Called from update when a choice is open and a colour is pressed. */
  private pressChoice(color: PadColorName): void {
    const c = this.choice;
    if (!c || !c.open) return;
    const i = c.colors.indexOf(color);
    if (i < 0) {
      sfxWrong();
      return;
    }
    c.open = false;
    c.resolve(c.words[i]!);
  }

  /** The villain's ultimate. Part 1: the heroes are floored. Part 2: the counter-item answers it. */
  private async ultimate(): Promise<void> {
    this.phase = 'ultimate';
    const v = this.villain;
    const ult = v.init.ultimate!;
    // Clear the floor a little: villain minions bow out, the villain takes centre.
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

    if (counter.how === 'block' || counter.how === 'reflect') {
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
      // A beam of the item's own light straight into the wind-up.
      const light: AbilitySpec = { id: 'counter_light', name: counter.name, kind: 'beam', cooldown: 0, color: 0xfff3a0, color2: 0xffb703, power: 3 };
      cast(this, h, light, v, 2.4);
      if (counter.how === 'restore') this.darken(0, 900);
      if (counter.how === 'reveal') {
        for (const c of this.fighters.filter((f) => f.init.kind === 'clone')) this.hit(c, 1, 0xffffff, h);
      }
      if (counter.how === 'shutdown') {
        await this.simWait(0.6);
        v.sprite.setTint(0x777777);
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
    this.tweens.add({ targets: v.body, angle: 720, scale: 0, duration: 900, ease: 'Back.easeIn' });
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
    if (moving) STEER[f.init.style](f, { scene: this, now: this.now, dt, target });
    // Each side drifts back towards its own ground, so the fight stays framed
    // heroes-left, villain-right instead of wandering off one edge.
    if (moving && (f.isMain || f.init.kind === 'helper')) {
      const home = f.team === 'hero' ? 400 : 900;
      f.x += (home - f.x) * Math.min(1, 0.6 * dt);
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
      if (f.isMain && ab.power >= 2 && Math.random() < 0.5) void voiceBus.say(moveLine(f.init.id, ab.id), 'bark', f);
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
      if (this.now < t.armedAt || !t.obj.active) continue;
      const victim = this.fighters.find((e) => e.active && e.team !== t.team && !e.floored && Math.abs(e.x - t.x) < 55 && Math.abs(e.y - t.y) < 40);
      if (victim) {
        burst(this, t.x, t.y - 20, { count: 50, speed: 420, colors: [t.color, 0xffffff, 0xd02040] });
        shockwave(this, t.x, t.y, t.color, 120);
        sfxBoom(1);
        this.hit(victim, t.power, t.color, t.from, { kind: 'stun', duration: 1.2 });
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
      this.hudLabels.push(this.add.text(30, 14 + i * 44, h.init.name, style).setDepth(DEPTH.hud + 1));
    });
    this.hudLabels.push(this.add.text(GAME_WIDTH - 30, 14, this.villain.init.name, style).setOrigin(1, 0).setDepth(DEPTH.hud + 1));
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
    const realDt = Math.min(0.05, deltaMs / 1000);
    const dt = realDt * ts;
    this.now += deltaMs * ts;

    // Director waits.
    const due = this.waits.filter((w) => w.until <= this.now);
    this.waits = this.waits.filter((w) => w.until > this.now);
    for (const w of due) w.resolve();

    // Choice input runs on real time.
    if (this.choice) {
      const pulse = 1 + 0.09 * Math.sin(performance.now() / 160);
      for (const d of this.choice.dots) d.setScale(this.choice.open ? pulse : 0.9);
      for (const c of CHOICE_COLORS) if (this.controls.pressed(c)) this.pressChoice(c);
      if (this.controls.dev('F4') && this.choice) {
        this.choice.open = true;
        this.pressChoice(this.choice.colors[this.choice.words.indexOf(this.choice.right)]!);
      }
      if (this.controls.pressed('yellow') && this.choice?.open) void this.say(`use_move_${this.choice.right}`);
    }

    for (const f of this.fighters) {
      if (!f.active) continue;
      this.think(f, dt);
      f.updateVisual(this.now, dt);
    }
    this.fighters = this.fighters.filter((f) => f.alive || f.root.active);
    this.separate(dt);
    this.updateProjectiles(dt);
    this.updateTraps();
    this.taunt();
    this.drawHud();

    if (this.controls.dev('F2')) advance(this);
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
      choice: this.choice ? { words: this.choice.words, colors: this.choice.colors, right: this.choice.right, open: this.choice.open } : null,
    };
  }
}
