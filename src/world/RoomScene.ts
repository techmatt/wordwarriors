/**
 * The base of every walking room: picks, prep minigames, the retreat camp.
 *
 * Navigation is by walking (Matt, 2026-10-18): her character is the cursor,
 * Stardew-style. Answers are *spots*: things standing in the room. The nearest
 * spot within reach lights up and grows a green dot; pressing green chooses
 * it. Yellow is always "say it again" (subclasses decide what that means: the
 * prompt, or a hint). Green is ignored while an instruction is being spoken,
 * so mashing cannot skip one (Seraphina's book rule).
 *
 * Subclasses build their spots in `build()` and react in `choose()`.
 * Dev keys: F2 skips this step, F4 answers correctly, F9 opens the parent page.
 */

import Phaser from 'phaser';

import { DEPTH, GAME_HEIGHT, GAME_WIDTH, REACH, STICK_HINT_MS } from '../config';
import { narratorLine } from '../../content/voice/ids';
import { startMusic } from '../audio/music';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { advance, castArt, castScale, episode, narrator, type Step } from '../episode/Episode';
import { formFor } from '../../content/battle/forms';
import { FreePlay } from '../fx/freePlay';
import { fitImage } from '../fx/juice';
import { Controls } from '../input/Controls';
import { dadLock } from '../input/dadLock';
import { hookState, type SpotInfo } from '../hookState';
import { makeButtonDot } from '../ui/ButtonDot';
import { Bubbles } from '../ui/Bubbles';
import { Caption, type CaptionMode, type KeepOut } from '../ui/Caption';
import type { Speaker } from '../ui/Portrait';
import { STICK_HINT_OFFSET, makeStickHint } from '../ui/stickHint';
import { PLAYER_HEIGHT, Player } from './Player';

/** Nothing happening for this long offers the prompt again. */
const IDLE_REPROMPT_MS = 15_000;

export interface Spot {
  id: string;
  x: number;
  y: number;
  obj: Phaser.GameObjects.Container;
  /** Is this the right answer for the current item? null when it is not a question. */
  correct: boolean | null;
  enabled: boolean;
  /** Called when she walks into reach (e.g. say a name, sound a tile). */
  onNear?: () => void;
  baseScale: number;
}

export abstract class RoomScene extends Phaser.Scene {
  protected controls!: Controls;
  /** The dialogue box: rooms tell it who stands where (`track`). */
  protected caption!: Caption;
  protected player!: Player;
  /** Her jumps and casts when she is free to play (item 060). */
  protected play!: FreePlay;
  protected spots: Spot[] = [];
  protected floor = new Phaser.Geom.Rectangle(80, 300, GAME_WIDTH - 160, GAME_HEIGHT - 430);
  protected step!: Step;
  /** True while input must be ignored (instructions playing, celebrations). */
  protected locked = false;
  protected round = '';
  private dot!: Phaser.GameObjects.Container;
  private lastNear: Spot | null = null;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private idleMs = 0;
  private hasMoved = false;
  private stickHint: Phaser.GameObjects.Container | null = null;
  /** False in rooms where she does not walk (spelling): no stick hint there. */
  protected walking = true;
  private helpDot!: Phaser.GameObjects.Container;
  /** When green pressed during narration may hop again (scene clock ms). */
  private ignoredHopAt = 0;

  init(data: { step?: Step }): void {
    this.step = data.step ?? { kind: 'title' };
    this.spots = [];
    this.locked = false;
    this.round = '';
    this.lastNear = null;
    this.ignoredHopAt = 0;
  }

  /** The room's background art id. */
  protected abstract background(): string;
  /** Build spots and start the room's flow. */
  protected abstract build(): void;
  /** Which music loop plays here. */
  protected music(): 'room' | 'title' {
    return 'room';
  }

  /** She pressed green next to a spot. */
  protected abstract choose(spot: Spot): void;
  /**
   * Yellow: say it again / hint. `idle` is true when the room offers it
   * after a long quiet spell rather than because she pressed yellow.
   */
  protected hint(_idle = false): void {}
  /**
   * Green, before any spot is chosen. A room that uses green for something
   * else at times (the sentence read-along steps a word) returns true to
   * consume the press; the default lets the nearest spot be chosen.
   */
  protected onGreen(): boolean {
    return false;
  }

  /**
   * Free play (item 060): may she jump and cast now? Not while a question
   * waits for her answer (a room overrides with its phases), and not where she
   * does not walk.
   */
  protected playOpen(): boolean {
    return this.walking;
  }

  /** Does yellow have something to say again now? Then yellow keeps that meaning and does not cast. */
  protected hasHint(): boolean {
    return true;
  }

  create(): void {
    this.gen++;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.gen++;
      voiceBus.hush();
    });
    hookState.scene = this.scene.key;
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.background()).setDepth(DEPTH.ground);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.controls = new Controls(this);
    this.player = new Player(this, this.floor.centerX, this.floor.bottom - 10, this.playerArt(), this.floor);
    this.play = new FreePlay(this, formFor(this.playerCharacter(), episode)?.id ?? null);
    this.dot = makeButtonDot(this, 0, 0, 'green', 18).setDepth(DEPTH.prompt).setVisible(false);
    // Yellow is always "say it again": a yellow dot with an ear, top right.
    this.helpDot = this.add
      .container(GAME_WIDTH - 60, 60, [makeButtonDot(this, 0, 0, 'yellow', 22, false), this.add.text(0, 44, '👂', { fontSize: '30px' }).setOrigin(0.5)])
      .setDepth(DEPTH.hud);
    this.idleMs = 0;
    this.hasMoved = false;
    this.stickHint = null;
    this.caption = new Caption(this, { avoid: () => this.keepOut(), mode: (u) => this.captionMode(u), showName: (s) => this.showSpeakerName(s) });
    new Bubbles(this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    startMusic(this.music());
    this.build();
  }

  /** Who walks: the hero, or Julia before a hero is chosen. */
  protected playerCharacter(): string {
    return episode.hero;
  }

  /** What she looks like walking: her form in this episode (Julia the chef with Dada Jason). */
  protected playerArt(): string {
    return castArt(this.playerCharacter());
  }

  /** Add a choosable thing standing in the room. */
  protected addSpot(id: string, x: number, y: number, children: Phaser.GameObjects.GameObject[], correct: boolean | null = null, onNear?: () => void): Spot {
    // `qaTarget`: the bug-hunt checker's probe reports its bounds, so nothing may cover it (item 059).
    const obj = this.add.container(x, y, children).setDepth(y).setData('qaTarget', id);
    const spot: Spot = { id, x, y, obj, correct, enabled: true, baseScale: 1, ...(onNear ? { onNear } : {}) };
    this.spots.push(spot);
    return spot;
  }

  /** An art image sized into a box, origin at its feet. */
  protected art(key: string, w: number, h: number, x = 0, y = 0): Phaser.GameObjects.Image {
    return fitImage(this.add.image(x, y, key).setOrigin(0.5, 1), w, h);
  }

  /** A cast member standing in the room, as tall beside her as their size says (item 028: Scar just under her; a dad grown-up height, item 034). */
  protected castSprite(id: string, x = 0, y = 0): Phaser.GameObjects.Image {
    const h = PLAYER_HEIGHT * castScale(id);
    return this.art(castArt(id), h * 0.95, h, x, y);
  }

  protected clearSpots(): void {
    for (const s of this.spots) s.obj.destroy();
    this.spots = [];
    this.lastNear = null;
    this.dot.setVisible(false);
  }

  /**
   * Scene generation. Phaser reuses a Scene object, and a room's flow is a
   * chain of awaits; when the scene shuts down (F9, F2, a fast advance) the
   * chain must stop rather than carry on building stones in the next run.
   * Every await in a room goes through `guard`, which never resolves once the
   * generation it started in is over.
   */
  private gen = 0;

  protected guard<T>(p: Promise<T>): Promise<T> {
    const g = this.gen;
    return p.then((v) => new Promise<T>((resolve) => {
      if (this.gen === g && this.sys.isActive()) resolve(v);
    }));
  }

  /** Say a line as an instruction (guarded). */
  protected say(id: string): Promise<boolean> {
    return this.guard(voiceBus.say(id));
  }

  /** Say narrator line(s) as instructions, locking input until done. */
  protected async narrate(...keys: string[]): Promise<void> {
    this.locked = true;
    await this.guard(voiceBus.sequence(keys.map((k) => narratorLine(narrator(), k))));
    this.locked = false;
  }

  /** Say arbitrary line ids as instructions, locking input until done. */
  protected async speak(...ids: string[]): Promise<void> {
    this.locked = true;
    await this.guard(voiceBus.sequence(ids));
    this.locked = false;
  }

  /**
   * What the dialogue box must not cover: the things she can walk to (the
   * ones she can choose now count most) and her character. Rooms add their
   * reading targets (the sentence banner, the spell scroll).
   */
  protected keepOut(): KeepOut[] {
    const out: KeepOut[] = [];
    for (const s of this.spots) {
      if (!s.obj.active || !s.obj.visible) continue;
      // At its full size: a thing popping in as a line starts measures nothing
      // yet, and the box used to settle over it (item 039).
      const { scaleX, scaleY } = s.obj;
      s.obj.setScale(s.baseScale);
      const b = s.obj.getBounds();
      s.obj.setScale(scaleX, scaleY);
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: s.enabled ? 3 : 1 });
    }
    if (this.player?.root.active) {
      const b = this.player.root.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 2 });
    }
    return out;
  }

  /** Whether the dialogue box prints the speaker's name under their face. */
  protected showSpeakerName(_s: Speaker): boolean {
    return true;
  }

  /** How a line shows in the dialogue box; undefined keeps the box's own rules. */
  protected captionMode(_u: Utterance): CaptionMode | undefined {
    return undefined;
  }

  protected wait(ms: number): Promise<void> {
    return this.guard(new Promise((resolve) => this.time.delayedCall(ms, resolve)));
  }

  protected done(): void {
    this.locked = true;
    this.fadeOutThen(() => advance(this));
  }

  /** Fade to black, then (just after the fade ends) `then`: leaving the room. */
  protected fadeOutThen(then: () => void): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, then);
  }

  /**
   * Dev F4 in a room whose answer is not a spot (Charge the Spell: Dad's
   * yes). Return true when it answered; false lets F4 choose `correctSpot()`.
   */
  protected autoAnswer(): boolean {
    return false;
  }

  /** Her speed now, a share of walking (the Stretchy Bridge's stones are slower, item 054). */
  protected moveScale(): number {
    return 1;
  }

  /** The spot a correct answer is at (dev F4 and tests). */
  protected correctSpot(): Spot | undefined {
    return this.spots.find((s) => s.correct === true && s.enabled);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    this.controls.update();
    const k = this.moveScale();
    this.player.update(k === 1 ? this.controls.move : this.controls.move.clone().scale(k), dt);

    // Nearest enabled spot within reach.
    let best: Spot | null = null;
    let bestD = REACH;
    for (const s of this.spots) {
      if (!s.enabled) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, s.x, s.y);
      if (d < bestD) {
        best = s;
        bestD = d;
      }
    }
    if (best !== this.lastNear) {
      if (this.lastNear) this.tweens.add({ targets: this.lastNear.obj, scale: this.lastNear.baseScale, duration: 120 });
      if (best) {
        this.tweens.add({ targets: best.obj, scale: best.baseScale * 1.1, duration: 120, ease: 'Back.easeOut' });
        best.onNear?.();
      }
      this.lastNear = best;
    }
    if (best) {
      const bounds = best.obj.getBounds();
      this.dot.setPosition(best.x, bounds.top - 26).setVisible(!this.locked);
    } else this.dot.setVisible(false);

    // Free play: green jumps only when it means nothing else here, yellow casts
    // only when there is nothing to say again (item 060).
    const open = this.playOpen();
    let greenFree = false;
    if (this.controls.pressed('green') && !this.locked) {
      if (!this.onGreen()) {
        if (best) {
          this.player.hop();
          this.choose(best);
        } else greenFree = true;
      }
    } else if (this.controls.pressed('green') && this.locked && open) greenFree = true;
    else if (this.controls.pressed('green') && this.locked && this.walking && this.time.now >= this.ignoredHopAt) {
      // Buttons always answer: a little hop while an instruction plays. It
      // never chooses or skips anything; throttled so mashing does not stack.
      this.ignoredHopAt = this.time.now + 300;
      this.player.hop();
    }
    const yellowHints = !this.locked && this.hasHint();
    if (this.controls.pressed('yellow') && yellowHints) {
      this.tweens.add({ targets: this.helpDot, scale: 1.4, duration: 120, yoyo: true });
      this.hint();
    }
    this.play.update(this.controls, dt, { x: this.player.x, y: this.player.y, mid: PLAYER_HEIGHT * 0.55, face: this.player.facing }, open, {
      green: greenFree,
      cast: yellowHints ? ['blue', 'red'] : ['blue', 'red', 'yellow'],
    });
    this.player.lift = this.play.height;
    this.idleHelp(deltaMs);

    if (this.controls.dev('F2')) advance(this);
    if (this.controls.dev('F4') && !this.autoAnswer()) {
      const c = this.correctSpot();
      if (c && !this.locked) this.choose(c);
    }
    if (this.controls.dev('F9')) this.scene.start('Parent', { back: this.scene.key, data: this.sceneData() });
    this.controls.endFrame();

    this.publish(deltaMs);
  }

  /** The start data that recreates this scene (the parent page comes back with it). */
  protected sceneData(): object {
    return { step: this.step };
  }

  /**
   * Help for a four-year-old who has stalled: if she has not moved at all in
   * this room, a pulsing stick appears beside her; if nothing has happened for
   * a while, the prompt is offered again (the same thing yellow does).
   */
  private idleHelp(deltaMs: number): void {
    const acting = this.controls.move.lengthSq() > 0.01 || this.controls.anyFace();
    if (acting) {
      this.idleMs = 0;
      if (this.controls.move.lengthSq() > 0.01 && !this.hasMoved) {
        this.hasMoved = true;
        this.stickHint?.destroy();
        this.stickHint = null;
      }
      return;
    }
    if (this.locked) return;
    // Dad lock: no re-prompt nags while a grown-up is talking with her.
    if (dadLock.locked) {
      this.idleMs = 0;
      return;
    }
    this.idleMs += deltaMs;
    if (this.walking && !this.hasMoved && this.idleMs > STICK_HINT_MS && !this.stickHint) this.stickHint = makeStickHint(this, this.player.x, this.player.y);
    if (this.stickHint) this.stickHint.setPosition(this.player.x + STICK_HINT_OFFSET.x, this.player.y + STICK_HINT_OFFSET.y);
    if (this.idleMs > IDLE_REPROMPT_MS) {
      this.idleMs = 0;
      this.hint(true);
    }
  }

  /** Something she did that is not a stick or a button (typing), for the idle timer. */
  protected noteActivity(): void {
    this.idleMs = 0;
  }

  private publish(deltaMs: number): void {
    this.fpsAcc += deltaMs;
    this.fpsFrames++;
    if (this.fpsAcc > 500) {
      hookState.fps = Math.round((this.fpsFrames * 1000) / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    const spots: SpotInfo[] = this.spots.filter((s) => s.enabled).map((s) => ({ id: s.id, x: s.x, y: s.y, correct: s.correct }));
    hookState.room = {
      scene: this.scene.key,
      round: this.round,
      locked: this.locked,
      player: { x: this.player.x, y: this.player.y, art: this.player.art },
      spots,
      shown: this.spots.filter((s) => s.obj.visible).map((s) => s.id),
      ...this.extraHooks(),
    };
  }

  protected extraHooks(): Partial<NonNullable<typeof hookState.room>> {
    return {};
  }
}
