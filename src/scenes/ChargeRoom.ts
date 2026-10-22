/**
 * Charge the Spell (item 053; one word a visit since item 058; no presses per
 * rune since item 059): a side room where she says letter SOUNDS aloud after
 * the helper, then reads the word they spell for Dad. Her real gap is sounds
 * (she knows the names).
 *
 * The visit's word (src/rules/charge.ts: 3-4 sound units, every one a rune)
 * is shown at the top from the start, one slot per unit. She walks in and it
 * starts by itself ("I say each sound, and then you say it back to me"). Each
 * rune lights on the altar in turn (its slot at the top pulses); the helper
 * shows its gesture (Jolly Phonics style, content/phonics/runes.ts) and says
 * its sound, then a beat (CHARGE.sayBackMs) of quiet for her to say it back,
 * and the rune fires into its slot, heavy with particles. Nothing is pressed
 * per rune: Matt found the per-rune presses slow and frustrating (item 059).
 *
 * With every rune charged the whole word lights at the top and she reads it
 * aloud ("Now read the whole spell!"): the room's one press, Dad's. His 2:
 * the word is said, its picture shows and flies into her bag. His 1, or
 * nothing for CHARGE.readTimeoutMs: "Let's sound it out together!", the word
 * sounded out once, unit by unit (never blended), then said, and the picture
 * goes into the bag all the same. The read is recorded under `words`, and its
 * runes' sounds under `sounds` (right with his 2); the word is a battle item (`episode.fetched`). A round runs
 * about 20 s.
 *
 * Each charged rune becomes a move her hero fires in the next battle
 * (`episode.charged`, BattleScene `useCharged`).
 *
 * Speech rule: letter SOUNDS only, each its own `letter_<x>_sound` line, never
 * captioned (the rune lights instead); the word itself only after Dad's answer.
 */

import Phaser from 'phaser';

import { RUNE_BY_SOUND, type GestureMotion } from '../../content/phonics/runes';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { variant } from '../episode/lineVariants';
import { voiceBus } from '../audio/VoiceBus';
import { sfxBoom, sfxRight, sfxSelect, sfxSummon, sfxWhoosh, sfxZap } from '../audio/sfx';
import { CHARGE, DEPTH, FONT_COMIC, GAME_WIDTH } from '../config';
import { castFace, currentStep, episode, helper, narrator, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, punch, shake, shockwave, squash } from '../fx/juice';
import { TEX } from '../fx/textures';
import { dadPress, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import type { ChargePlan } from '../rules/charge';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood, roomSeed } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';

/**
 * `explain`: the helper explains, no rune yet. `prompt`: a rune is lit and
 * the helper says it. `sayback`: her beat to say it back. `charging`: the
 * payoff. `read`: every rune charged, she reads the word, waiting for Dad.
 * `reading`: the word's payoff (said, or sounded out and said). `done`: back
 * to the hub. Dad's buttons count only in `read`.
 */
type Phase = 'explain' | 'prompt' | 'sayback' | 'charging' | 'read' | 'reading' | 'done';

const ALTAR = { x: GAME_WIDTH / 2 + 60, y: 600, w: 340, h: 250 };
/** The rune stands on the altar's top. */
const RUNE = { x: ALTAR.x, y: 330, size: 200 };
/** The helper stands at the altar's left and performs the gestures there. */
const HELPER = { x: ALTAR.x - 330, y: 620 };
/** The word at the top: her face, then a slot per sound unit; its picture shows at the right once read. */
const BAR = { x: GAME_WIDTH / 2, y: 78, slot: 104, gap: 14 };
const PICTURE = 120;
/** The beat between the sounds when they are sounded out together (the entry hall's is 400, the sentence room's 450). */
const SOUND_GAP_MS = 400;

export class ChargeRoom extends HouseSideRoom {
  /** Nothing to walk to here: no stick hint (item 059 review). */
  protected override walking = false;
  private plan!: ChargePlan;
  private index = 0;
  private phase: Phase = 'explain';
  /** Time spent waiting for Dad on the read (scene clock, paused under dad lock and while a line plays). */
  private waitMs = 0;
  private timeouts = 0;
  /** How the word's read went: Dad's yes, or a no / timeout (sounded out). */
  private readAnswer: 'yes' | 'no' | 'timeout' | null = null;
  /** Dad's 1 / 2 while the last rune is said or charges (she can read the word on the bar by then): acted on as the read is asked (M24). */
  private earlyAnswer: DadAnswer | null = null;
  private finished = false;
  /** Scene time at the start of the visit and when the read was asked (the round's length in game time, for the tests). */
  private startedAt = 0;
  private readAt = 0;
  /** The say-back beat running now: its time left (it stands still under dad lock). */
  private beat: { left: number; done: () => void } | null = null;
  private altar!: Phaser.GameObjects.Image;
  private stone!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private runeText!: Phaser.GameObjects.Text;
  private friend!: Phaser.GameObjects.Image;
  private bar!: Phaser.GameObjects.Container;
  private bag!: Bag;
  private barSlots: Phaser.GameObjects.Rectangle[] = [];
  private barTexts: Phaser.GameObjects.Text[] = [];
  /** The pulse on the slot of the rune lit now. */
  private slotPulse: Phaser.Tweens.Tween | null = null;
  /**
   * The flow in charge: every chain takes the number when it starts and
   * stops at its next await once Dad's answer has moved it on, so a press
   * mid-line never leaves two chains talking.
   */
  private flow = 0;
  /** The gesture playing now, to stop it at once when the room moves on. */
  private stopGesture: (() => void) | null = null;
  /** The helper's scale at rest: every gesture's squash starts and ends there. */
  private friendScale = { x: 1, y: 1 };

  constructor() {
    super('ChargeRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    const p = sidePlan('ChargeRoom', this.slot, 'charge');
    this.plan = p.charge;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first rune not yet charged, or the read.
    const charged = episode.charged?.sounds ?? [];
    this.index = Math.min(charged.length, this.plan.runes.length);
    this.finished = episode.fetched.includes(this.plan.word) || episode.house.done.includes(this.slot);
    this.phase = 'explain';
    this.flow++;
    this.stopGesture = null;
    this.waitMs = 0;
    this.timeouts = 0;
    this.readAnswer = null;
    this.earlyAnswer = null;
    this.beat = null;
    this.barSlots = [];
    this.barTexts = [];
    this.slotPulse = null;
  }

  private get rune(): string {
    return this.plan.runes[this.index] ?? '';
  }

  private get allCharged(): boolean {
    return this.index >= this.plan.runes.length;
  }

  /** The rune and the word are what she watches: the box keeps off both. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    for (const o of [this.stone, this.bar, this.friend]) {
      if (!o?.active) continue;
      const b = o.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: o === this.friend ? 4 : 8 });
    }
    return out;
  }

  protected build(): void {
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 260);
    applyHouseMood(this, episode.villain, { seed: roomSeed(this.roomId), floor: this.floor, calm: true });
    const room = SIDE_ROOM_BY_ID[this.roomId];
    // She stands beside the altar from the start: nothing to walk to or press. Clear of its
    // footprint (item 069: 20 px inside it, the altar was drawn over her arm and dress all round).
    this.enter(ALTAR.x - ALTAR.w / 2 - 50, Math.min(room?.entry.y ?? ALTAR.y + 40, this.floor.bottom - 10));

    // The helper beside the altar, who performs the gestures.
    this.friend = this.castSprite(helper(), HELPER.x, HELPER.y).setDepth(HELPER.y);
    this.friendScale = { x: this.friend.scaleX, y: this.friend.scaleY };
    this.caption.track(helper(), () => (this.friend.active ? { x: this.friend.x, y: this.friend.y } : null));
    bob(this, this.friend, 4, 1300);

    this.altar = this.art('prop_rune_altar', ALTAR.w, ALTAR.h, ALTAR.x, ALTAR.y).setDepth(ALTAR.y);
    popIn(this, this.altar, this.altar.scale);
    this.glow = this.add.image(RUNE.x, RUNE.y, TEX.glow).setDepth(ALTAR.y - 2).setScale(2.6).setAlpha(0).setTint(0xb28dff).setBlendMode(Phaser.BlendModes.ADD);
    this.stone = fitImage(this.add.image(RUNE.x, RUNE.y, 'prop_rune_stone'), RUNE.size, RUNE.size).setDepth(ALTAR.y - 1).setVisible(false);
    this.runeText = this.add
      .text(RUNE.x, RUNE.y + 4, '', { fontFamily: FONT_COMIC, fontSize: '140px', color: INK, stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(ALTAR.y);
    this.makeBar();
    this.bag = new Bag(this);
    void voiceBank.ensure(wordLine(this.plan.word));

    this.openDad((a) => this.answer(a));

    this.locked = true;
    // Set on the first frame: in build() the scene clock has not caught up with the game's yet.
    this.startedAt = -1;
    if (this.finished) {
      this.phase = 'done';
      this.backToHubSoon();
      return;
    }
    const f = this.flow;
    void (async () => {
      await this.wait(ARRIVE_MS);
      if (f !== this.flow) return;
      // Back mid-visit (the parent page), she knows the game: straight on.
      if (this.index === 0) {
        sfxSummon();
        squash(this, this.altar, this.altar.scaleX, this.altar.scaleY, 0.12);
        burst(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.8, { count: 50, speed: 360, texture: TEX.star, colors: [0xb28dff, 0xffd23f, 0xffffff] });
        shockwave(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.6, 0xb28dff, 220);
        await this.narrate('charge_explain');
        if (f !== this.flow) return;
      }
      if (this.allCharged) await this.askRead();
      else await this.lightRune();
    })();
  }

  /** Her face, then the word, a slot per sound unit (its letters dim until charged); slots charged this visit are lit. */
  private makeBar(): void {
    const n = this.plan.units.length;
    const w = n * BAR.slot + (n - 1) * BAR.gap;
    const x0 = -w / 2 + BAR.slot / 2 + 40;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const plate = this.add.rectangle(20, 0, w + 150, BAR.slot + 24, 0x1a1030, 0.6).setStrokeStyle(4, 0xffd23f, 0.9);
    parts.push(plate);
    const face = fitImage(this.add.image(x0 - BAR.slot - 6, 0, castFace(episode.hero)), BAR.slot * 0.8, BAR.slot * 0.8);
    parts.push(face);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * (BAR.slot + BAR.gap);
      const r = this.add.rectangle(x, 0, BAR.slot, BAR.slot, 0x000000, 0.45).setStrokeStyle(3, 0xffffff, 0.7);
      const unit = this.plan.units[i]!;
      const t = this.add
        .text(x, 0, unit.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: unit.length > 1 ? '54px' : '72px', color: '#ffffff', stroke: '#1a1030', strokeThickness: 6 })
        .setOrigin(0.5)
        .setAlpha(0.55);
      this.barSlots.push(r);
      this.barTexts.push(t);
      parts.push(r, t);
    }
    this.bar = this.add.container(BAR.x, BAR.y, parts).setDepth(DEPTH.hud);
    (episode.charged?.sounds ?? []).slice(0, n).forEach((_, i) => this.fillSlot(i, false));
  }

  private slotPos(i: number): { x: number; y: number } {
    const r = this.barSlots[i]!;
    return { x: this.bar.x + r.x, y: this.bar.y + r.y };
  }

  /** The slot of the rune lit now pulses, so she sees where it goes in the word. */
  private markSlot(i: number): void {
    this.slotPulse?.stop();
    this.slotPulse = null;
    this.barSlots.forEach((r, k) => {
      r.setScale(1);
      if (k === i) r.setStrokeStyle(6, 0xffd23f, 1);
    });
    const r = this.barSlots[i];
    if (!r) return;
    this.barTexts[i]?.setAlpha(1);
    this.slotPulse = this.tweens.add({ targets: r, scale: 1.12, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** A slot takes its rune: the move's color, its letters lit. */
  private fillSlot(i: number, fresh: boolean): void {
    const r = this.barSlots[i];
    const t = this.barTexts[i];
    if (!r || !t) return;
    if (fresh && this.slotPulse) {
      this.slotPulse.stop();
      this.slotPulse = null;
      r.setScale(1);
    }
    const color = RUNE_BY_SOUND[this.plan.runes[i] ?? '']?.move.color ?? 0xffd23f;
    r.setFillStyle(color, 1).setStrokeStyle(4, 0xffffff, 1);
    t.setColor(INK).setStroke('#ffffff', 6).setAlpha(1);
    if (fresh) {
      popIn(this, t, 1);
      this.tweens.add({ targets: r, scale: 1.3, duration: 140, yoyo: true });
    }
  }

  /** Nothing to walk to: the room runs itself until the read. */
  protected choose(_spot: Spot): void {}

  /** The word's next rune lights on the altar; the helper shows its gesture and says it; a beat for her to say it back; it charges. */
  private async lightRune(): Promise<void> {
    const sound = this.rune;
    const f = ++this.flow;
    this.round = `charge:${this.index}:${sound}`;
    this.phase = 'prompt';
    this.locked = true;
    this.markSlot(this.index);
    this.runeText.setText((this.plan.units[this.index] ?? sound).toUpperCase()).setColor(INK).setScale(1).setAlpha(1);
    this.stone.setVisible(true).clearTint();
    popIn(this, this.stone, this.stone.scale);
    popIn(this, this.runeText, 1, 120);
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0.5).setScale(2.6);
    this.tweens.add({ targets: this.glow, alpha: 0.85, scale: 3.1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sfxZap();
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 280, colors: [0xb28dff, 0xffffff] });
    await this.wait(150);
    if (f !== this.flow) return;
    await this.gesture(sound, f);
    if (f !== this.flow) return;
    // Her turn: the rune glows and the room is quiet while she says it back.
    this.phase = 'sayback';
    this.tweens.add({ targets: this.runeText, scale: 1.15, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.waitUnlocked(CHARGE.sayBackMs);
    if (f !== this.flow) return;
    this.tweens.killTweensOf(this.runeText);
    this.runeText.setScale(1);
    await this.charge();
  }

  /** `ms` of scene time, paused under dad lock (a timed wait for her waits while Dad holds the game); counted in update(). */
  private waitUnlocked(ms: number): Promise<void> {
    return this.guard(
      new Promise<void>((resolve) => {
        this.beat = { left: ms, done: resolve };
      }),
    );
  }

  /**
   * The helper performs the rune's gesture: they bob and squash in its
   * rhythm while its glyph does the action beside them, and say the sound
   * (the rune lit while it plays).
   */
  private async gesture(sound: string, f: number): Promise<void> {
    const r = RUNE_BY_SOUND[sound];
    if (!r) return;
    // One gesture at a time, from the helper's rest scale.
    this.stopGesture?.();
    const at = { x: this.friend.x + 95, y: this.friend.y - this.friend.displayHeight * 0.6 };
    const prop = this.add.text(at.x, at.y, r.gesture.glyph, { fontSize: '84px', padding: { top: 14, bottom: 6 } }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    popIn(this, prop, 1);
    const moves = this.motion(prop, r.gesture.motion, at);
    const { x: fx, y: fy } = this.friendScale;
    this.friend.setScale(fx, fy);
    const beat = this.tweens.add({ targets: this.friend, scaleX: fx * 1.06, scaleY: fy * 0.94, duration: 260, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const stop = () => {
      if (this.stopGesture === stop) this.stopGesture = null;
      beat.stop();
      this.friend.setScale(fx, fy);
      for (const t of moves) t.stop();
      this.tweens.killTweensOf(prop);
      this.tweens.add({ targets: prop, scale: 0, alpha: 0, duration: 220, onComplete: () => prop.destroy() });
    };
    this.stopGesture = stop;
    // A beat of the action before the sound, so she sees it.
    await this.wait(200);
    if (f === this.flow) await this.saySound(sound);
    if (this.stopGesture === stop) stop();
  }

  /** The glyph's action, by bob, squash, scale and path; returns its tweens so the gesture can stop them. */
  private motion(prop: Phaser.GameObjects.Text, m: GestureMotion, at: { x: number; y: number }): Phaser.Tweens.Tween[] {
    const t = (cfg: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>) => this.tweens.add({ targets: prop, ...cfg });
    switch (m) {
      case 'weave':
        return [t({ x: at.x + 70, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }), t({ y: at.y - 24, duration: 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })];
      case 'fly':
        prop.x = at.x - 160;
        return [t({ x: at.x + 160, duration: 1100, repeat: -1, ease: 'Sine.easeInOut', yoyo: true }), t({ y: at.y - 30, duration: 550, yoyo: true, repeat: -1 })];
      case 'bounce':
        return [t({ x: at.x + 90, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }), t({ y: at.y - 50, duration: 210, yoyo: true, repeat: -1, ease: 'Quad.easeOut' })];
      case 'pulse':
        return [t({ scale: 1.3, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })];
      case 'shake':
        return [t({ x: at.x + 10, duration: 60, yoyo: true, repeat: -1 })];
      case 'blink':
        return [t({ alpha: 0.15, duration: 280, yoyo: true, repeat: -1, ease: 'Stepped' })];
      case 'puff':
        return [t({ scale: 1.4, duration: 500, yoyo: true, repeat: -1, ease: 'Quad.easeOut' })];
      case 'climb':
        prop.y = this.friend.y - 20;
        return [t({ y: this.friend.y - this.friend.displayHeight, duration: 1000, repeat: -1, ease: 'Sine.easeInOut' }), t({ x: at.x + 14, duration: 120, yoyo: true, repeat: -1 })];
    }
  }

  /** The sound itself, the rune lit while it plays (never captioned). */
  private async saySound(sound: string): Promise<void> {
    this.runeText.setColor(LIT);
    this.tweens.add({ targets: this.runeText, scale: 1.2, duration: 160, yoyo: true });
    await this.say(letterSoundLine(sound));
    this.runeText.setColor(INK);
  }

  /** Dad's button (or the timeout, or F4): only the word's read asks him. A no sounds it out together first. */
  private answer(a: DadAnswer, timedOut = false): void {
    // Item 093 (M24): his press once the last rune is lit was dropped, though his cue flashed as if
    // it landed; it is kept (his latest press) and acted on as the read is asked.
    const lastRune = this.index >= this.plan.runes.length - 1 && (this.phase === 'prompt' || this.phase === 'sayback' || this.phase === 'charging');
    if (lastRune && !timedOut) {
      this.noteActivity();
      this.earlyAnswer = a;
      return;
    }
    // From the moment the word lights: Dad may answer while "Now read the whole spell!" still plays.
    if (this.phase !== 'read' && !(this.phase === 'reading' && this.readAnswer === null && this.allCharged)) return;
    this.noteActivity();
    setDadAsking(false);
    this.flow++;
    voiceBus.hush();
    void this.readWord(a === 'yes' ? 'yes' : timedOut ? 'timeout' : 'no');
  }

  /** The rune charges: it fires into its slot in the word with heavy particles, and the next lights. */
  private async charge(): Promise<void> {
    const sound = this.rune;
    const i = this.index;
    const f = this.flow;
    this.phase = 'charging';
    this.locked = true;
    // They fire in the next battle: the house part's own number.
    const step = currentStep();
    const charged = (episode.charged ??= { sounds: [], part: step.kind === 'house' ? step.part : 1 });
    if (!charged.sounds.includes(sound)) charged.sounds.push(sound);

    const color = RUNE_BY_SOUND[sound]?.move.color ?? 0xffd23f;
    sfxRight();
    sfxBoom(2);
    shake(this, 4, 220);
    punch(this, 0.04);
    shockwave(this, RUNE.x, RUNE.y, color, 260);
    burst(this, RUNE.x, RUNE.y, { count: 90, speed: 620, scale: 2.2, texture: TEX.star, gravity: 900, life: 1000, colors: [color, 0xffd23f, 0xffffff] });
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 300, scale: 2.6, texture: TEX.glow, gravity: 0, life: 700, colors: [color, 0xffffff] });
    floatText(this, RUNE.x, RUNE.y - 140, 'YES!', '#ffd23f');

    // The rune flies up into its slot in the word, trailing sparks.
    const to = this.slotPos(i);
    const flyer = this.add.text(RUNE.x, RUNE.y, this.runeText.text, { fontFamily: FONT_COMIC, fontSize: '140px', color: LIT, stroke: '#ffffff', strokeThickness: 10 }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    this.runeText.setText('');
    this.stone.setTint(0x8a7aa8);
    const trail = this.add
      .particles(0, 0, TEX.spark, { speed: 60, scale: { start: 2, end: 0 }, lifespan: 600, frequency: 12, tint: [color, 0xffffff, 0xffd23f], blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.sparkles - 1);
    trail.startFollow(flyer);
    sfxWhoosh();
    await this.guard(
      new Promise<void>((resolve) =>
        this.tweens.add({ targets: flyer, x: to.x, y: to.y, scale: 0.5, duration: 400, ease: 'Cubic.easeIn', onComplete: () => resolve() }),
      ),
    );
    trail.stop();
    this.time.delayedCall(700, () => trail.destroy());
    flyer.destroy();
    this.fillSlot(i, true);
    burst(this, to.x, to.y, { count: 50, speed: 380, scale: 1.6, texture: TEX.star, gravity: 700, colors: [color, 0xffffff] });
    shockwave(this, to.x, to.y, color, 120);
    sfxSelect();
    this.player.hop();

    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0);
    this.stone.setVisible(false);
    this.index++;
    await this.wait(150);
    if (f !== this.flow) return;
    if (!this.allCharged) {
      await this.lightRune();
      return;
    }
    await this.askRead();
  }

  /** Every rune charged: the whole word lights at the top and she reads it aloud for Dad. */
  private async askRead(): Promise<void> {
    const f = ++this.flow;
    this.round = `charge:read:${this.plan.word}`;
    this.phase = 'reading';
    this.locked = true;
    this.slotPulse?.stop();
    this.slotPulse = null;
    sfxSummon();
    this.barTexts.forEach((t, k) =>
      this.time.delayedCall(k * 90, () => {
        t.setColor(LIT);
        this.tweens.add({ targets: [t, this.barSlots[k]], scale: 1.25, duration: 160, yoyo: true });
        burst(this, this.slotPos(k).x, this.slotPos(k).y, { count: 20, speed: 260, texture: TEX.star });
      }),
    );
    this.tweens.add({ targets: this.bar, scale: 1.08, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const early = this.earlyAnswer;
    this.earlyAnswer = null;
    if (early) {
      // Dad answered during the last rune: the word lights all through, then his answer, unasked.
      await this.wait(this.barTexts.length * 90 + 200);
      if (f !== this.flow) return;
      this.answer(early);
      return;
    }
    await this.narrate('charge_read');
    if (f !== this.flow) return;
    this.phase = 'read';
    this.readAt = this.time.now - this.startedAt;
    this.waitMs = 0;
    this.locked = false;
    setDadAsking(true);
  }

  /**
   * The word's payoff, recorded first: Dad's yes says it; his no or the
   * timeout sounds it out together once, unit by unit, then says it. Either
   * way its picture shows and flies into her bag (a battle item), and back
   * to the hub.
   */
  private async readWord(answer: 'yes' | 'no' | 'timeout'): Promise<void> {
    const word = this.plan.word;
    const f = this.flow;
    const right = answer === 'yes';
    this.readAnswer = answer;
    if (answer === 'timeout') this.timeouts++;
    this.phase = 'reading';
    this.locked = true;
    setDadAsking(false);
    // Dad's yes is a first-try read; his no or the timeout one miss.
    this.recordRead(word, right, right ? 0 : 1);
    // Its sounds with it: a word read right is its sounds said right (the draws lean to shaky sounds).
    for (const s of new Set(this.plan.runes)) progress.record('sounds', s, right, right ? 0 : 1);
    this.tweens.killTweensOf(this.bar);
    this.bar.setScale(1);

    if (!right) {
      // Sounded out together once, each unit lit as it is said; never blended.
      await this.narrate('charge_together');
      for (let k = 0; k < this.plan.runes.length; k++) {
        if (f !== this.flow) return;
        const t = this.barTexts[k];
        this.tweens.add({ targets: [t, this.barSlots[k]], scale: 1.3, duration: 160, yoyo: true });
        await this.say(letterSoundLine(this.plan.runes[k]!));
        // A beat between sounds, as every other sound-out has (item 069: back to back they ran toward a blend).
        if (k < this.plan.runes.length - 1) await this.wait(SOUND_GAP_MS);
      }
      await this.wait(200);
    } else {
      sfxRight();
      floatText(this, BAR.x, BAR.y + 110, 'WOW!', '#ffd23f');
    }
    if (f !== this.flow) return;
    // Only now is the word said, and its picture shown.
    const n = this.barSlots.length;
    const px = this.slotPos(n - 1).x + BAR.slot / 2 + 30 + PICTURE / 2;
    const pic = fitImage(this.add.image(px, BAR.y + 40, `pic_${word}`), PICTURE, PICTURE).setDepth(DEPTH.hud + 1);
    popIn(this, pic, pic.scale);
    burst(this, pic.x, pic.y, { count: 60, speed: 460 });
    shockwave(this, pic.x, pic.y, 0xffd23f, 160);
    await this.say(wordLine(word));
    if (f !== this.flow) return;
    pic.setVisible(false);
    await Promise.all([this.guard(this.bag.receive(`pic_${word}`, pic.x, pic.y)), right ? this.say(narratorLine(narrator(), variant('right'))) : Promise.resolve(true)]);
    pic.destroy();
    if (f !== this.flow) return;
    this.phase = 'done';
    sfxSelect();
    await this.say(narratorLine(narrator(), variant('charge_done')));
    this.fadeToHub();
  }

  /** Waiting for Dad on the read: nothing for CHARGE.readTimeoutMs counts as his 1 (paused under dad lock and while a line plays). */
  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (this.startedAt < 0) this.startedAt = this.time.now;
    if (this.beat && !dadLock.locked) {
      this.beat.left -= deltaMs;
      if (this.beat.left <= 0) {
        const { done } = this.beat;
        this.beat = null;
        done();
      }
    }
    if (this.phase !== 'read') return;
    if (dadLock.locked || voiceBus.busy) return;
    this.waitMs += deltaMs;
    if (this.waitMs >= CHARGE.readTimeoutMs) {
      this.waitMs = 0;
      this.answer('no', true);
    }
  }

  /**
   * Free play (item 060): only while the game is explained and once it is
   * done. Never from the first rune to Dad's answer: she says sounds back and
   * reads the word aloud, and Dad listens to her voice, so no SFX then.
   * `walking` stays false here (no stick hint), so it is not consulted.
   */
  protected override playOpen(): boolean {
    return this.phase === 'explain' || this.phase === 'done';
  }

  /** Yellow asks the read again only while Dad is asked. */
  protected override hasHint(): boolean {
    return this.phase === 'read';
  }

  /** Yellow (never asked for here): on the word, the read ask again. */
  protected override hint(idle = false): void {
    if (idle || this.phase !== 'read') return;
    setDadAsking(false);
    void this.askReadAgain();
  }

  private async askReadAgain(): Promise<void> {
    const f = ++this.flow;
    this.phase = 'reading';
    this.locked = true;
    await this.narrate('charge_read');
    if (f !== this.flow) return;
    this.phase = 'read';
    this.waitMs = 0;
    this.locked = false;
    setDadAsking(true);
  }

  /** F4: with the word to read, Dad's yes; otherwise nothing (the runes move on by themselves). */
  protected override autoAnswer(): boolean {
    if (this.phase === 'read') dadPress('yes');
    return true;
  }

  /** An instruction unlocks input when it ends; the room stays locked except while Dad is asked. */
  protected override async narrate(...keys: string[]): Promise<void> {
    await super.narrate(...keys);
    if (this.phase !== 'read') this.locked = true;
  }

  protected override extraHooks(): Partial<RoomInfo> {
    return {
      charge: {
        word: this.plan.word,
        runes: [...this.plan.runes],
        index: this.index,
        sound: this.rune,
        phase: this.phase,
        asking: this.phase === 'read',
        timeouts: this.timeouts,
        read: this.readAnswer,
        charged: [...(episode.charged?.sounds ?? [])],
        elapsedMs: this.time.now - this.startedAt,
        readAtMs: this.readAt,
      },
    };
  }
}
