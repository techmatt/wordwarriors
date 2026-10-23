/**
 * The story fight's director (item 107): plays a villain's script
 * (content/battle/stories/) beat by beat in place of the brawl's free
 * simulation. Nobody fights by themselves (the StoryStage holds everyone on
 * their marks and the scene's `story` phase casts nothing); each beat says its
 * lines in the characters' own voices, then does one thing:
 *
 * - `fetched`: the things she fetched get their turn (the battle's own volleys).
 * - `counter`: the battle's own move choice (`BattleScene.moveChoice`, the
 *   plan from src/rules/storyFight.ts): Dad or the ally says which word to
 *   find, a wrong pad is "find X", the right one fires its super.
 * - `attack`: the villain telegraphs (a glowing danger band, the safe spot
 *   lit) and she walks to safety (`StoryWalk`), or picks HOP / JUMP from
 *   pads; the attack misses either way.
 * - `support`: Dad's spinning attack keeps the villain busy while she walks
 *   to the hoard and grabs.
 * - `ultimate` / `finale`: the villain flies up until he is a dot and dives.
 *   Part 1: the heroes are floored and retreat ("To be continued!"). Part 2:
 *   the counter-item stops him (the battle's own counter staging), everyone's
 *   finisher, and he turns good.
 *
 * Big moves get the stage: the camera punches in, a held frame, a splash
 * picture behind the move (`fx_story_<id>`) and too many particles.
 */

import Phaser from 'phaser';

import { STORY_BY_ID } from '../../../content/battle/stories/index';
import { storySplashArt, type StoryBeat, type StoryLine, type StoryScript, type StorySpot } from '../../../content/battle/stories/types';
import { fightPropArt } from '../../../content/battle/fights';
import { personOf } from '../../../content/battle/roster';
import type { AbilitySpec } from '../../../content/battle/types';
import { storyLine } from '../../../content/voice/ids';
import { voiceBus } from '../../audio/VoiceBus';
import { sfxBoom, sfxFire, sfxJump, sfxPoof, sfxShout, sfxStomp, sfxTwinkle, sfxUltimate, sfxWhoosh } from '../../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../../config';
import { advance, episode } from '../../episode/Episode';
import { burst, fitImage, flash, floatText, hitstop, popIn, punch, shake, shockwave, slowmo, speedLines } from '../../fx/juice';
import { TEX } from '../../fx/textures';
import { cast } from '../abilities';
import { FLOOR_TOP, type Fighter } from '../Fighter';
import { ARENA_LEFT, restLift } from '../movement';
import type { Phase, StageHost } from '../stages/stage';
import { STORY_MARKS } from '../stages/story';
import { StoryWalk, type WalkHost } from './walk';

/** How long she has to reach a safe spot (real s), and to grab (before it goes on by itself). */
const DODGE_SECONDS = 7;
const GRAB_SECONDS = 30;

/**
 * What the battle lends the story fight's director (BattleScene): a stage's host, her stick for
 * her walk (`StoryWalk`), and the battle's own staging. Scene work goes through `stage`.
 */
export interface StoryHost extends StageHost, Pick<WalkHost, 'controls'> {
  /** The director sets it: `story` between beats, `end` after the last. */
  phase: Phase;
  readonly fighters: readonly Fighter[];
  /** The dad in the fight and the ally, as fighters; either may be missing. */
  readonly dad: Fighter | null;
  readonly allyFighter: Fighter | null;
  /** Her walk while one is open, which the battle runs every frame. */
  storyWalk: StoryWalk | null;
  /** Drop `p` if this run of the scene ends first (SceneGen). */
  guard<T>(p: Promise<T>): Promise<T>;
  /** A beat's wait in seconds, cut under `?battle=short`. */
  beat(s: number): number;
  storyIntro(): Promise<void>;
  killFighter(f: Fighter): void;
  useAllFetched(gap: number): Promise<void>;
  useCharged(gap: number): Promise<void>;
  useMade(order: ('helper' | 'gem' | 'ammo')[], gap: number): Promise<void>;
  moveChoice(): Promise<void>;
  ultimateWindUp(): Promise<{ v: Fighter; ult: AbilitySpec; giant: boolean; aura: Phaser.GameObjects.Particles.ParticleEmitter }>;
  ultimateFloors(v: Fighter, ult: AbilitySpec, giant: boolean): Promise<void>;
  ultimateCountered(v: Fighter, ult: AbilitySpec, giant: boolean, aura: Phaser.GameObjects.Particles.ParticleEmitter): Promise<void>;
  finish(): Promise<void>;
  retreat(): void;
}

export class StoryDirector {
  readonly story: StoryScript;
  /** The beat playing, for the tests. */
  beat: string | null = null;
  private readonly props = new Map<string, Phaser.GameObjects.Image>();
  /** Ends Dad's spinning attack (`spinning`) once the grab is done. */
  private spinStop = false;

  constructor(private readonly b: StoryHost) {
    this.story = STORY_BY_ID[b.fight.story ?? '']!;
  }

  /** The story's places: the props stand in the arena from the start. */
  setup(): void {
    for (const s of this.story.spots) {
      const dy = s.propDy ?? 0;
      const img = fitImage(this.b.stage.add.image(s.x + (s.propDx ?? 0), s.y + dy, fightPropArt(s.prop)).setOrigin(0.5, 1), s.propW ?? 200, s.propH ?? 180);
      // A ledge (its top is where she stands) sorts just behind her; anything else by its foot.
      img.setDepth(s.lift ? s.y - 2 : s.y + dy);
      this.props.set(s.id, img);
    }
  }

  async run(): Promise<void> {
    const b = this.b;
    const beats = b.part === 1 ? this.story.part1 : this.story.part2;
    await b.storyIntro();
    for (const beat of beats) {
      if (!b.stage.scene.isActive()) return;
      this.beat = beat.id;
      b.phase = 'story';
      this.tidy();
      await this.play(beat);
      await b.wait(b.beat(0.8));
    }
    this.beat = null;
  }

  // -- who says what ------------------------------------------------------------------

  /** The dad in the fight and the ally, as fighters; either may be missing. */
  private get dad(): Fighter | null {
    return this.b.dad;
  }
  private get ally(): Fighter | null {
    return this.b.allyFighter;
  }

  /** Who says `l`: the fighter, and the line id in their voice. Null with nobody to say it. */
  private speaker(l: StoryLine): { f: Fighter; id: string } | null {
    if (l.who === 'villain') return { f: this.b.villain, id: storyLine(this.story.id, l.key) };
    const f = l.who === 'dad' ? (this.dad ?? this.ally) : (this.ally ?? this.dad);
    if (!f) return null;
    return { f, id: storyLine(this.story.id, l.key, personOf(f.init.id)) };
  }

  private async sayAll(lines: StoryLine[] | undefined): Promise<void> {
    for (const l of lines ?? []) await this.sayOne(l);
  }

  private async sayOne(l: StoryLine): Promise<void> {
    const s = this.speaker(l);
    if (!s) return;
    // The speaker bobs as they talk.
    s.f.squash(0.12);
    await this.b.guard(voiceBus.say(s.id, 'instruction', s.f));
  }

  // -- the beats ----------------------------------------------------------------------

  private async play(beat: StoryBeat): Promise<void> {
    switch (beat.kind) {
      case 'talk':
        return this.sayAll(beat.lines);
      case 'fetched':
        return this.fetched(beat);
      case 'counter':
        return this.counter(beat);
      case 'attack':
        return beat.move === 'guards' ? this.guards(beat) : this.attack(beat);
      case 'support':
        return this.support(beat);
      case 'ultimate':
        return this.ultimate(beat);
      case 'finale':
        return this.finale(beat);
    }
  }

  private async fetched(beat: StoryBeat): Promise<void> {
    const b = this.b;
    const any = episode.fetched.length > 0 || (episode.charged?.part === b.part && episode.charged.sounds.length > 0);
    if (beat.all && any) await this.sayAll(beat.lines);
    if (beat.all) await b.useAllFetched(b.beat(1.4));
    await b.useCharged(b.beat(1.1));
    await b.useMade(['helper', 'gem', 'ammo'], b.beat(1.5));
    if (beat.all && any) await this.sayAll(beat.after);
    b.phase = 'story';
  }

  /** Her word pick against what he just did: the battle's own move choice. */
  private async counter(beat: StoryBeat): Promise<void> {
    const b = this.b;
    await this.sayAll(beat.lines);
    await this.choice();
    await b.wait(b.beat(1.6));
    this.villainReels();
    await this.sayAll(beat.after);
    await this.homeAgain();
  }

  /** The battle's move choice, the story's props faded back so no pad hides behind the stone or the hoard. */
  private async choice(): Promise<void> {
    const b = this.b;
    for (const p of this.props.values()) p.setAlpha(0.35);
    await b.moveChoice();
    for (const p of this.props.values()) p.setAlpha(1);
    b.phase = 'story';
  }

  /** The villain telegraphs, she walks to the safe spot, the attack lands (and misses). */
  private async attack(beat: StoryBeat): Promise<void> {
    const b = this.b;
    const v = b.villain;
    const spot = beat.input?.kind === 'dodge' ? this.spot(beat.input.spot) : null;
    const [threat, ...rest] = beat.lines ?? [];
    if (threat) await this.sayOne(threat);
    // The telegraph: the floor glows where it will land, and he rears up.
    const band = this.dangerBand(beat.move === 'tail' ? 0x8a5a2a : 0xff4a00);
    v.squash(-0.2);
    sfxShout();
    let reached = false;
    if (spot) {
      // Yellow says the call to safety (the lines after the threat) again.
      const walk = new StoryWalk(b, spot, 'dodge', DODGE_SECONDS, () => this.sayAll(rest));
      b.storyWalk = walk;
      void this.sayAll(rest);
      reached = (await walk.done).reached;
      b.storyWalk = null;
    } else await this.sayAll(rest);
    b.stage.tweens.killTweensOf(band);
    band.destroy();
    if (beat.big) await this.bigMove(beat.big, v);
    if (beat.move === 'fire') await this.fireBreath(spot, reached);
    else if (beat.move === 'rain') await this.fireRain(spot, reached);
    else if (beat.move === 'tail') await this.tailSmash(spot, reached);
    await b.wait(b.beat(0.6));
    await this.sayAll(beat.after);
    await this.homeAgain();
  }

  /** Gold guards charge; she picks HOP or JUMP from pads, and over them she goes. */
  private async guards(beat: StoryBeat): Promise<void> {
    const b = this.b;
    const v = b.villain;
    const [threat, ...rest] = beat.lines ?? [];
    if (threat) await this.sayOne(threat);
    const summon = v.init.abilities.find((a) => a.kind === 'summon');
    if (summon) cast(b, v, summon, b.heroes[0] ?? null, 1);
    sfxStomp();
    await b.wait(b.beat(1.0));
    await this.sayAll(rest);
    const guards = this.minions();
    // Lined up across the floor between the sides, ready to charge.
    guards.forEach((g, i) => b.stage.tweens.add({ targets: g, x: 760 + i * 70, y: 560 + (i % 3) * 45, duration: 500 }));
    await b.wait(0.6);
    await this.choice();
    // Over the guards she goes as they charge past and topple.
    const me = b.heroes[0];
    if (me) this.hopOver(me, 260);
    for (const h of b.heroes.slice(1)) this.hopOver(h, 160);
    guards.forEach((g, i) => {
      b.stage.tweens.add({
        targets: g,
        x: ARENA_LEFT - 200,
        duration: 1200,
        delay: i * 120,
        ease: 'Quad.easeIn',
        onComplete: () => b.killFighter(g),
      });
    });
    await b.wait(b.beat(1.6));
    for (const g of this.minions()) b.killFighter(g);
    sfxPoof();
    await this.sayAll(beat.after);
    await this.homeAgain();
  }

  /** Dad keeps him busy with a spinning attack while she sneaks to the hoard and grabs. */
  private async support(beat: StoryBeat): Promise<void> {
    const b = this.b;
    const v = b.villain;
    const dad = this.dad ?? this.ally;
    const spot = beat.input?.kind === 'grab' ? this.spot(beat.input.spot) : null;
    const line = beat.lines?.[0];
    if (dad && beat.big) {
      // Dad spins in at him: a card-flip twirl (sprites never rotate), a whirl of sparks, hits landing.
      b.stage.tweens.add({ targets: dad, x: v.x - 120, y: v.y + 100, duration: 500, ease: 'Quad.easeOut' });
      await b.wait(0.3);
      await this.bigMove(beat.big, dad);
      this.spinning(dad, v);
    }
    if (spot) {
      const walk = new StoryWalk(b, spot, 'grab', GRAB_SECONDS, () => (line ? this.sayOne(line) : Promise.resolve()));
      b.storyWalk = walk;
      if (line) void this.sayOne(line);
      await walk.done;
      b.storyWalk = null;
      // Coins fly up out of the hoard to her.
      const me = b.heroes[0]!;
      sfxTwinkle();
      burst(b.stage, spot.x + (spot.propDx ?? 0), spot.y - 60, { count: 120, speed: 520, colors: [0xffd23f, 0xffcc33, 0xffffff], life: 1200, gravity: 500 });
      floatText(b.stage, me.x, me.y - me.height - 30, '+GOLD!', '#ffd23f', 52);
      this.hopOver(me, 90);
    } else await this.sayAll(beat.lines);
    this.spinStop = true;
    await b.wait(b.beat(0.6));
    v.squash(0.3);
    await this.sayAll(beat.after);
    await this.homeAgain();
  }

  /** Dad's twirl: flips and sparks and little hits on the villain until the grab is done. */
  private spinning(dad: Fighter, v: Fighter): void {
    const b = this.b;
    this.spinStop = false;
    const tick = () => {
      if (this.spinStop || !b.stage.scene.isActive()) return;
      // Half a turn less a hair: a whole turn is already at rest (Fighter settles spin to the
      // nearest whole turn), so += 2π never flipped at all (hunt 7). From here he flips back round.
      dad.spin = Math.PI - 0.1;
      burst(b.stage, dad.cx, dad.cy, { count: 30, speed: 380, colors: [0x7ad9ff, 0xffffff, dad.init.palette[0]] });
      shockwave(b.stage, dad.cx, dad.cy, 0x7ad9ff, 140, 380);
      v.flashWhite();
      sfxWhoosh();
      b.after(450, tick);
    };
    tick();
  }

  /** Part 1's end: up until he is a dot, the dive, the heroes floored, "To be continued!", home. */
  private async ultimate(beat: StoryBeat): Promise<void> {
    const b = this.b;
    await this.sayAll(beat.lines);
    const { v, ult, giant, aura } = await b.ultimateWindUp();
    await this.flyAndDive(v, beat.big, true, aura);
    await b.ultimateFloors(v, ult, giant);
    b.phase = 'end';
    await this.sayAll(beat.after);
    b.banner('TO BE CONTINUED!', 0xffd23f, true);
    sfxBoom(2);
    await b.wait(b.beat(1.2));
    b.retreat();
    await b.wait(b.beat(1.4));
    b.stage.cameras.main.fadeOut(500);
    await b.wait(0.6);
    advance(b.stage);
  }

  /** Part 2's end: up and down again, the counter-item stops him, everyone's finisher, good again. */
  private async finale(beat: StoryBeat): Promise<void> {
    const b = this.b;
    await this.sayAll(beat.lines);
    const { v, ult, giant, aura } = await b.ultimateWindUp();
    await this.flyAndDive(v, beat.big, false, aura);
    await b.ultimateCountered(v, ult, giant, aura);
    await b.finish();
    b.phase = 'end';
    await b.wait(b.beat(1.2));
    b.stage.cameras.main.fadeOut(500, 255, 255, 255);
    await b.wait(0.6);
    advance(b.stage);
  }

  // -- staging ------------------------------------------------------------------------

  private spot(id: string): StorySpot | null {
    return this.story.spots.find((s) => s.id === id) ?? null;
  }

  private minions(): Fighter[] {
    return this.b.fighters.filter((f) => f.team === 'villain' && !f.isMain && f.active);
  }

  /** Each beat starts clean: nobody a pig or an ice block, nobody busy. */
  private tidy(): void {
    for (const f of [...this.b.heroes, this.b.villain]) {
      if (f.floored) continue;
      f.status = null;
      f.clearOverlay();
      f.busyUntil = this.b.now;
    }
  }

  /** Everybody back to their marks after a walk or a charge. */
  private async homeAgain(): Promise<void> {
    const b = this.b;
    // Helpers her move summoned (Teddy Army for TUG, Penguin Crew for HOP) have nobody to fight
    // here: they stood by the stone through the next dodges and stayed to the end (hunt 7).
    const helpers = b.fighters.filter((f) => f.team === 'hero' && !f.isMain && f.active);
    for (const f of helpers) b.killFighter(f);
    if (helpers.length) sfxPoof();
    b.heroes.forEach((h, i) => {
      const m = STORY_MARKS.heroes[i] ?? STORY_MARKS.heroes[0];
      h.hop = 0;
      // Down off the ledge with the walk home, not in one frame (hunt 7).
      b.stage.tweens.add({ targets: h, x: m.x, y: m.y, lift: restLift(h), duration: 600, ease: 'Quad.easeOut' });
    });
    b.stage.tweens.add({ targets: b.villain, x: STORY_MARKS.villain.x, y: STORY_MARKS.villain.y, duration: 600, ease: 'Quad.easeOut' });
    await b.wait(0.6);
  }

  /** He takes the hit: a squash, sparks, a shake. */
  private villainReels(): void {
    const v = this.b.villain;
    v.squash(0.35);
    v.flashWhite();
    burst(this.b.stage, v.cx, v.cy, { count: 50, speed: 420, colors: [0xffffff, v.init.palette[1]] });
  }

  /** A hop over something low: her hop height, there and back. */
  private hopOver(h: Fighter, height: number): void {
    const b = this.b;
    sfxJump();
    h.squash(0.3);
    b.stage.tweens.addCounter({ from: 0, to: 1, duration: 700, onUpdate: (tw) => (h.hop = Math.sin((tw.getValue() ?? 0) * Math.PI) * height), onComplete: () => (h.hop = 0) });
  }

  /** The floor between the sides glows where the attack will land. */
  private dangerBand(color: number): Phaser.GameObjects.Rectangle {
    const b = this.b;
    const band = b.stage.add.rectangle((ARENA_LEFT + 900) / 2, 560, 900 - ARENA_LEFT, 260, color, 0.22).setDepth(FLOOR_TOP - 4);
    b.stage.tweens.add({ targets: band, alpha: 0.45, duration: 280, yoyo: true, repeat: -1 });
    return band;
  }

  /**
   * A big move gets the stage: its splash picture pops up behind the actor,
   * the camera punches in, the frame holds, and the particles are far too many.
   */
  private async bigMove(splash: string, f: Fighter): Promise<void> {
    const b = this.b;
    const img = fitImage(b.stage.add.image(f.cx, f.cy, storySplashArt(splash)), 640, 480).setDepth(f.y - 6).setAlpha(0.95);
    const s = img.scale;
    popIn(b.stage, img, s, 0, 260);
    // The punch-in is the camera's one move here: a punch on top would undo it (BattleScene.focus).
    b.focus(f.cx, f.cy, 1.25, 700);
    hitstop(b.stage, 140);
    slowmo(b.stage, 0.35, 900);
    speedLines(b.stage, f.cx, f.cy, f.init.palette[1], 900);
    shockwave(b.stage, f.cx, f.cy, f.init.palette[1], 320, 700);
    burst(b.stage, f.cx, f.cy, { count: 160, speed: 760, colors: [f.init.palette[0], f.init.palette[1], 0xffffff], life: 1100 });
    sfxUltimate();
    await b.wait(0.9);
    b.stage.tweens.add({ targets: img, alpha: 0, scale: s * 1.3, duration: 400, onComplete: () => img.destroy() });
  }

  /** The stone's shelter: where his fire stops (a death zone for its particles). */
  private shelter(spot: StorySpot | null): Phaser.Geom.Rectangle | null {
    if (!spot) return null;
    const prop = this.props.get(spot.id);
    if (!prop) return null;
    return new Phaser.Geom.Rectangle(prop.x - prop.displayWidth * 0.4, prop.y - prop.displayHeight - 60, prop.displayWidth * 0.8 + 40, prop.displayHeight + 60);
  }

  /** Dragon fire across the floor from his mouth. Behind the stone it stops at the stone; anywhere else it roars over her head. */
  private async fireBreath(spot: StorySpot | null, reached: boolean): Promise<void> {
    const b = this.b;
    const v = b.villain;
    const me = b.heroes[0]!;
    const y = reached ? me.y - me.height * 0.5 : me.y - me.height - 70;
    const zone = reached ? this.shelter(spot) : null;
    sfxFire();
    shake(b.stage, 6, 1300);
    const fire = b.stage.add
      .particles(v.x - v.height * 0.35, v.y - v.height * 0.7, TEX.smoke, {
        speedX: { min: -1500, max: -1000 },
        speedY: { min: (y - (v.y - v.height * 0.7)) * 1.1 - 120, max: (y - (v.y - v.height * 0.7)) * 1.1 + 120 },
        scale: { start: 1.6, end: 3.4 },
        alpha: { start: 1, end: 0 },
        lifespan: 1000,
        frequency: 5,
        tint: [0xff4a00, 0xffd23f, 0xff7b00],
        blendMode: Phaser.BlendModes.ADD,
        ...(zone ? { deathZone: { type: 'onEnter', source: zone } as never } : {}),
      })
      .setDepth(DEPTH.fx + 3);
    b.after(1300, () => fire.stop());
    b.after(2500, () => fire.destroy());
    await b.wait(1.4);
    if (zone) burst(b.stage, zone.centerX, zone.centerY, { count: 60, speed: 300, colors: [0xff7b00, 0xffd23f] });
    floatText(b.stage, me.x, me.y - me.height - 40, 'MISSED!', '#7ad9ff', 50);
  }

  /** Fire falling from the sky over the whole floor; none falls where the stone shelters her. */
  private async fireRain(spot: StorySpot | null, reached: boolean): Promise<void> {
    const b = this.b;
    const me = b.heroes[0]!;
    const zone = reached ? this.shelter(spot) : new Phaser.Geom.Rectangle(me.x - 90, me.y - me.height - 120, 180, me.height + 140);
    sfxFire();
    shake(b.stage, 4, 1600);
    const rain = b.stage.add
      .particles(0, -20, TEX.spark, {
        x: { min: ARENA_LEFT, max: 940 },
        speedY: { min: 700, max: 1000 },
        speedX: { min: -80, max: 40 },
        scale: { start: 2.2, end: 1 },
        lifespan: 900,
        frequency: 8,
        tint: [0xff4a00, 0xffd23f],
        blendMode: Phaser.BlendModes.ADD,
        ...(zone ? { deathZone: { type: 'onEnter', source: zone } as never } : {}),
      })
      .setDepth(DEPTH.fx + 3);
    b.after(1500, () => rain.stop());
    b.after(2600, () => rain.destroy());
    await b.wait(1.6);
    floatText(b.stage, me.x, me.y - me.height - 40, 'MISSED!', '#7ad9ff', 50);
  }

  /** His tail smashes along the floor in a wave of dust. Up on the ledge she is over it; anywhere else she hops it at the last moment. */
  private async tailSmash(spot: StorySpot | null, reached: boolean): Promise<void> {
    const b = this.b;
    const v = b.villain;
    const me = b.heroes[0]!;
    sfxStomp();
    shake(b.stage, 10, 900);
    const wave = b.stage.add.rectangle(v.x - 120, 600, 60, 150, 0xc8b89a, 0.8).setDepth(DEPTH.fx);
    b.stage.tweens.add({ targets: wave, x: ARENA_LEFT - 60, scaleX: 3, alpha: 0.3, duration: 900, ease: 'Quad.easeIn', onComplete: () => wave.destroy() });
    for (let i = 0; i < 6; i++) b.after(i * 140, () => burst(b.stage, v.x - 140 - i * 150, 640, { count: 18, speed: 260, colors: [0xc8b89a, 0x8a7a5a], blend: false }));
    // Everyone not up high hops it as the wave passes.
    b.heroes.forEach((h, i) => {
      if (h === me && reached && spot?.lift) return;
      b.after(Math.max(0, (v.x - h.x) / 1.2) + i * 30, () => this.hopOver(h, 150));
    });
    await b.wait(1.2);
    floatText(b.stage, me.x, me.y - me.lift - me.height - 40, 'MISSED!', '#7ad9ff', 50);
  }

  /**
   * His ultimate's flight: up and up until he is a dot in the sky, a held
   * moment, then the dive. A stand-in picture flies (his own stays put, hidden),
   * so his card is only ever scaled, never turned. `toHeroes`: the dive lands
   * on the heroes (part 1); otherwise back on his mark, where the counter meets him.
   */
  private async flyAndDive(v: Fighter, splash: string | undefined, toHeroes: boolean, aura: Phaser.GameObjects.Particles.ParticleEmitter): Promise<void> {
    const b = this.b;
    const flyer = b.stage.add.image(v.x, v.y - v.lift, v.init.art).setOrigin(0.5, 1).setDepth(DEPTH.fx + 6);
    fitImage(flyer, v.height * 1.1, v.height);
    const s = flyer.scale;
    v.root.setVisible(false);
    // His roaring aura goes up with him (back on him for the counter), and he is his own size again when he lands.
    v.growUntil = 0;
    if (aura.active) aura.startFollow(flyer, 0, -v.height * 0.4);
    sfxWhoosh();
    b.stage.tweens.add({ targets: flyer, x: GAME_WIDTH * 0.62, y: 70, scale: s * 0.04, duration: 1400, ease: 'Quad.easeIn' });
    burst(b.stage, v.x, v.y, { count: 60, speed: 420, colors: [0xffd23f, 0xffffff] });
    await b.wait(1.5);
    // The dot hangs there, twinkling.
    const twinkle = b.stage.add.image(flyer.x, flyer.y, TEX.star).setTint(0xffd23f).setScale(0.6).setDepth(DEPTH.fx + 7).setBlendMode(Phaser.BlendModes.ADD);
    b.stage.tweens.add({ targets: twinkle, scale: 1.2, alpha: 0.4, duration: 200, yoyo: true, repeat: 3 });
    sfxTwinkle();
    await b.wait(1.0);
    twinkle.destroy();
    const land = toHeroes ? { x: (b.heroes[0]?.x ?? 400) + 80, y: b.heroes[0]?.y ?? 600 } : { x: v.x, y: v.y };
    sfxWhoosh();
    speedLines(b.stage, land.x, land.y - 100, 0xffd23f, 700);
    b.stage.tweens.add({ targets: flyer, x: land.x, y: land.y, scale: s * (toHeroes ? 1.4 : 1), duration: 600, ease: 'Quad.easeIn' });
    await b.wait(0.6);
    sfxBoom(3);
    flash(b.stage, 0xffffff, 250);
    shake(b.stage, 12, 900);
    punch(b.stage, 0.12, 260);
    shockwave(b.stage, land.x, land.y, 0xffd23f, 500, 900);
    burst(b.stage, land.x, land.y - 60, { count: 220, speed: 900, life: 1400, colors: [0xffd23f, 0xffcc33, 0xff4a00, 0xffffff] });
    if (splash) {
      const img = fitImage(b.stage.add.image(land.x, land.y - 120, storySplashArt(splash)), 720, 540).setDepth(DEPTH.fx + 5);
      popIn(b.stage, img, img.scale, 0, 200);
      b.after(900, () => b.stage.tweens.add({ targets: img, alpha: 0, duration: 400, onComplete: () => img.destroy() }));
    }
    // Back to his own mark, his own card again.
    if (aura.active) aura.startFollow(v.root, 0, -v.height * 0.6);
    flyer.destroy();
    v.x = STORY_MARKS.villain.x;
    v.y = STORY_MARKS.villain.y;
    v.root.setVisible(true);
    v.squash(0.4);
    await b.wait(0.5);
  }

  /** For the tests (`hookState.battle.story`). */
  info(): { beat: string | null; walk: ReturnType<StoryWalk['info']> | null } {
    return { beat: this.beat, walk: this.b.storyWalk?.info() ?? null };
  }
}
