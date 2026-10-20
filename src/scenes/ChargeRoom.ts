/**
 * Charge the Spell (item 053): a side room where she says letter SOUNDS aloud
 * and Dad judges. Her real gap is sounds (she knows the names), and nothing
 * here can be won from a first letter or a guess: she has to say it.
 *
 * She walks up to the magic altar and presses green. A big upper-case rune
 * lights on it; her hero needs its sound to charge the spell. She says it,
 * and Dad presses 2 (the dad buttons, src/input/dadButtons.ts): the rune
 * fires into her power bar, heavy with particles, and its sound is said as
 * confirmation. Dad presses 1, or nothing comes for CHARGE.timeoutMs: the
 * game helps. The helper models the sound with its gesture (Jolly Phonics
 * style, content/phonics/runes.ts: a hissing snake, a tummy rub) and asks
 * again. After CHARGE.assists helps it says it with her and moves on, so it
 * never gets stuck, and the rune charges all the same (no fail states).
 *
 * Help fades per sound (src/rules/charge.ts): at level 1 the helper says the
 * sound with its gesture first and she copies; at level 2 only the gesture
 * (its line trails off where the sound would be); at level 3 the rune alone.
 * A 2 with no help moves the sound up a level, any help moves it down one;
 * the answer is recorded under `sounds`, the level under `chargeLevels`.
 *
 * Each charged rune becomes a move her hero fires in the next battle
 * (`episode.charged`, BattleScene `useCharged`).
 *
 * Speech rule: letter SOUNDS only, each its own `letter_<x>_sound` line, never
 * captioned (the rune lights instead); the gesture lines never name a letter.
 */

import Phaser from 'phaser';

import { RUNE_BY_SOUND, type GestureMotion } from '../../content/phonics/runes';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { chargeKey, letterSoundLine, narratorLine } from '../../content/voice/ids';
import { CHARGE_ASK_VARIANTS, CHARGE_YES_VARIANTS } from '../../content/voice/script';
import { voiceBus, type Utterance } from '../audio/VoiceBus';
import { sfxBoom, sfxRight, sfxSelect, sfxSummon, sfxWhoosh, sfxZap } from '../audio/sfx';
import { CHARGE, DEPTH, FONT_COMIC, GAME_WIDTH } from '../config';
import { backToHub, castFace, currentStep, episode, helper, narrator, planFor, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, floatText, popIn, punch, shake, shockwave, squash } from '../fx/juice';
import { TEX } from '../fx/textures';
import { dadPress, openDadButtons, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import { chargeLevel, nextChargeLevel, type ChargeLevel, type ChargePlan } from '../rules/charge';
import { progress } from '../state/progress';
import type { RoomInfo } from '../testHooks';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { applyHouseMood } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, INK, LIT, Minigame } from './minigames/Minigame';

/**
 * `approach`: walk to the altar. `explain`: the helper explains, no rune yet.
 * `resume`: back from the parent page, the rune not lit yet. `prompt`: the
 * rune is lit and the helper is asking (or modelling it first). `ask`:
 * waiting for Dad. `help`: the helper models it after a no. `charging`: the
 * payoff. `done`: back to the hub. Dad's buttons count only in `prompt`,
 * `ask` and (a yes) `help`: a rune she can see.
 */
type Phase = 'approach' | 'explain' | 'resume' | 'prompt' | 'ask' | 'help' | 'charging' | 'done';

const ALTAR = { x: GAME_WIDTH / 2 + 60, y: 600, w: 340, h: 250 };
/** The rune stands on the altar's top. */
const RUNE = { x: ALTAR.x, y: 300, size: 220 };
/** The helper stands at the altar's left and performs the gestures there. */
const HELPER = { x: ALTAR.x - 330, y: 620 };
/** Her power bar: her face, then a slot per rune, top centre. */
const BAR = { x: GAME_WIDTH / 2, y: 58, slot: 64, gap: 12 };

export class ChargeRoom extends Minigame {
  protected override dialogueAware = true;
  private slot: Slot = 'a';
  private plan!: ChargePlan;
  private roomId = '';
  private index = 0;
  private phase: Phase = 'approach';
  /** This rune's helps so far (Dad's no, or a timeout). */
  private assists = 0;
  /** Its help level as the rune lit (the ramp moves from this). */
  private level: ChargeLevel = 1;
  /** Time spent waiting for Dad on this ask (scene clock, paused under dad lock and while a line plays). */
  private waitMs = 0;
  private timeouts = 0;
  private finished = false;
  private closeDad: (() => void) | null = null;
  private altar!: Phaser.GameObjects.Image;
  private stone!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private runeText!: Phaser.GameObjects.Text;
  private friend!: Phaser.GameObjects.Image;
  private bar!: Phaser.GameObjects.Container;
  private barSlots: Phaser.GameObjects.Rectangle[] = [];
  /**
   * The flow in charge: every chain (a prompt, a help, a payoff) takes the
   * number when it starts and stops at its next await once Dad's answer has
   * moved it on, so a press mid-line never leaves two chains talking.
   */
  private flow = 0;
  /** The gesture playing now, to stop it at once when Dad answers mid-gesture. */
  private stopGesture: (() => void) | null = null;
  /** The helper's scale at rest: every gesture's squash starts and ends there. */
  private friendScale = { x: 1, y: 1 };

  constructor() {
    super('ChargeRoom');
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    this.slot = data.slot ?? 'a';
    const p = planFor(this.slot);
    if (p.kind !== 'charge') throw new Error(`ChargeRoom: room ${this.slot} plays ${p.game}`);
    this.plan = p.charge;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first rune not yet charged.
    const charged = episode.charged?.sounds ?? [];
    this.index = Math.min(charged.length, this.plan.runes.length);
    this.finished = this.index >= this.plan.runes.length;
    this.phase = this.index > 0 ? 'resume' : 'approach';
    this.level = 1;
    this.flow++;
    this.stopGesture = null;
    this.assists = this.missesNow();
    this.waitMs = 0;
    this.timeouts = 0;
    this.barSlots = [];
  }

  private get rune(): string {
    return this.plan.runes[this.index] ?? '';
  }

  private get missKey(): string {
    return `${this.slot}:${this.rune}`;
  }

  /** This rune's helps before a trip to the parent page: still helps (as the machine's misses, item 039). */
  private missesNow(): number {
    return episode.house.misses?.[this.missKey] ?? 0;
  }

  protected override sceneData(): object {
    return { step: this.step, slot: this.slot };
  }

  protected background(): string {
    return `room_side_${this.roomId}`;
  }

  /** The rune and the power bar are what she watches: the box keeps off both. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    for (const o of [this.stone, this.bar, this.friend]) {
      if (!o?.active) continue;
      const b = o.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: o === this.stone ? 8 : 4 });
    }
    return out;
  }

  /** Letter sounds are never captioned (Caption hides `letter_` lines); the rune lights instead. */
  protected override captionMode(u: Utterance): CaptionMode | undefined {
    return u.id.startsWith('letter_') ? 'hide' : undefined;
  }

  protected build(): void {
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 260);
    applyHouseMood(this, episode.villain, { seed: 0x2053, floor: this.floor, calm: true });
    const room = SIDE_ROOM_BY_ID[this.roomId];
    this.player.place(170, Math.min(room?.entry.y ?? 600, this.floor.bottom - 10));
    this.player.hop();
    burst(this, this.player.x, this.player.y - 40, { count: 16, speed: 220 });
    sfxWhoosh();

    // The helper beside the altar, who performs the gestures.
    this.friend = this.castSprite(helper(), HELPER.x, HELPER.y).setDepth(HELPER.y);
    this.friendScale = { x: this.friend.scaleX, y: this.friend.scaleY };
    this.caption.track(helper(), () => (this.friend.active ? { x: this.friend.x, y: this.friend.y } : null));
    bob(this, this.friend, 4, 1300);

    this.altar = this.art('prop_rune_altar', ALTAR.w, ALTAR.h);
    const spot = this.addSpot('altar', ALTAR.x, ALTAR.y, [this.altar], true);
    popIn(this, spot.obj, 1);
    this.glow = this.add.image(RUNE.x, RUNE.y, TEX.glow).setDepth(ALTAR.y - 2).setScale(2.6).setAlpha(0).setTint(0xb28dff).setBlendMode(Phaser.BlendModes.ADD);
    this.stone = fitImage(this.add.image(RUNE.x, RUNE.y, 'prop_rune_stone'), RUNE.size, RUNE.size).setDepth(ALTAR.y - 1).setVisible(false);
    this.runeText = this.add
      .text(RUNE.x, RUNE.y + 4, '', { fontFamily: FONT_COMIC, fontSize: '150px', color: INK, stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(ALTAR.y);
    this.makeBar();

    this.closeDad = openDadButtons((a) => this.answer(a));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.closeDad?.();
      this.closeDad = null;
    });

    if (this.finished) {
      this.locked = true;
      this.phase = 'done';
      this.time.delayedCall(600, () => backToHub(this, this.slot));
      return;
    }
    if (this.phase === 'approach') void this.intro();
    else {
      // Back mid-visit: she is at the altar already.
      spot.enabled = false;
      this.player.place(ALTAR.x - 150, ALTAR.y + 40);
      void this.wait(ARRIVE_MS).then(() => {
        if (this.phase === 'resume') void this.lightRune();
      });
    }
  }

  /** Her face, then an empty slot per rune; slots already charged this visit are filled. */
  private makeBar(): void {
    const n = this.plan.runes.length;
    const w = n * BAR.slot + (n - 1) * BAR.gap;
    const x0 = -w / 2 + BAR.slot / 2 + 40;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const plate = this.add.rectangle(20, 0, w + 120, BAR.slot + 20, 0x1a1030, 0.6).setStrokeStyle(4, 0xffd23f, 0.9);
    parts.push(plate);
    const face = fitImage(this.add.image(x0 - BAR.slot - 6, 0, castFace(episode.hero)), BAR.slot + 6, BAR.slot + 6);
    parts.push(face);
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(x0 + i * (BAR.slot + BAR.gap), 0, BAR.slot, BAR.slot, 0x000000, 0.45).setStrokeStyle(3, 0xffffff, 0.7);
      this.barSlots.push(r);
      parts.push(r);
    }
    this.bar = this.add.container(BAR.x, BAR.y, parts).setDepth(DEPTH.hud);
    (episode.charged?.sounds ?? []).slice(0, n).forEach((s, i) => this.fillSlot(i, s, false));
  }

  private slotPos(i: number): { x: number; y: number } {
    const r = this.barSlots[i]!;
    return { x: this.bar.x + r.x, y: this.bar.y + r.y };
  }

  /** A slot takes its rune: the move's colour and the rune's letter(s). */
  private fillSlot(i: number, sound: string, fresh: boolean): void {
    const r = this.barSlots[i];
    if (!r) return;
    const color = RUNE_BY_SOUND[sound]?.move.color ?? 0xffd23f;
    r.setFillStyle(color, 1).setStrokeStyle(4, 0xffffff, 1);
    const t = this.add.text(r.x, r.y, sound.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: sound.length > 1 ? '30px' : '40px', color: INK, stroke: '#ffffff', strokeThickness: 5 }).setOrigin(0.5);
    this.bar.add(t);
    if (fresh) {
      popIn(this, t, 1);
      this.tweens.add({ targets: r, scale: 1.35, duration: 140, yoyo: true });
    }
  }

  private async intro(): Promise<void> {
    this.locked = true;
    await this.wait(ARRIVE_MS);
    await this.narrate('charge_intro');
    if (this.phase === 'approach') this.locked = false;
  }

  /** Green at the altar: it wakes, the helper explains, the first rune lights. */
  protected choose(spot: Spot): void {
    if (this.phase !== 'approach' || spot.id !== 'altar') return;
    spot.enabled = false;
    this.phase = 'explain';
    this.locked = true;
    voiceBus.hush();
    sfxSummon();
    squash(this, spot.obj, 1, 1, 0.12);
    burst(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.8, { count: 50, speed: 360, texture: TEX.star, colors: [0xb28dff, 0xffd23f, 0xffffff] });
    shockwave(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.6, 0xb28dff, 220);
    void (async () => {
      await this.narrate('charge_explain');
      if (this.phase === 'explain') await this.lightRune();
    })();
  }

  /** A rune lights on the altar and the helper asks, with the help its level gives. */
  private async lightRune(): Promise<void> {
    const sound = this.rune;
    const f = ++this.flow;
    this.round = `charge:${this.index}:${sound}`;
    this.phase = 'prompt';
    this.locked = true;
    this.assists = this.missesNow();
    this.level = chargeLevel(progress, sound);
    this.waitMs = 0;
    this.runeText.setText(sound.toUpperCase()).setColor(INK).setScale(1).setAlpha(1);
    this.stone.setVisible(true).clearTint();
    popIn(this, this.stone, this.stone.scale);
    popIn(this, this.runeText, 1, 120);
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0.5).setScale(2.6);
    this.tweens.add({ targets: this.glow, alpha: 0.85, scale: 3.1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sfxZap();
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 280, colors: [0xb28dff, 0xffffff] });
    await this.wait(350);
    if (f !== this.flow || this.phase !== 'prompt') return;
    await this.prompt(f);
  }

  /** The ask, as the rune's level (and any help so far) says; `f` is the flow it belongs to. */
  private async prompt(f: number): Promise<void> {
    const sound = this.rune;
    const on = () => f === this.flow && this.phase === 'prompt';
    if (this.assists === 0 && this.level === 1) {
      // Level 1: the helper says it with its gesture first; she copies.
      await this.narrate('charge_watch');
      if (!on()) return;
      await this.gesture(sound, true, f);
      if (!on()) return;
      await this.narrate('charge_your_turn');
    } else if (this.assists === 0 && this.level === 2) {
      // Level 2: the gesture only; its line trails off where the sound would be.
      await this.gesture(sound, false, f);
    } else {
      await this.narrate(`charge_ask_${(this.index % CHARGE_ASK_VARIANTS) + 1}`);
    }
    if (on()) this.startAsking();
  }

  private startAsking(): void {
    this.phase = 'ask';
    this.waitMs = 0;
    this.locked = false;
    setDadAsking(true);
  }

  /**
   * The helper performs the rune's gesture: they bob and squash in its
   * rhythm while its glyph does the action beside them, saying its line; with
   * `withSound` the sound follows, the rune lit while it plays.
   */
  private async gesture(sound: string, withSound: boolean, f: number): Promise<void> {
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
    const line = narratorLine(narrator(), chargeKey('charge_gesture', sound));
    const stop = () => {
      if (this.stopGesture === stop) this.stopGesture = null;
      beat.stop();
      this.friend.setScale(fx, fy);
      for (const t of moves) t.stop();
      this.tweens.killTweensOf(prop);
      this.tweens.add({ targets: prop, scale: 0, alpha: 0, duration: 220, onComplete: () => prop.destroy() });
    };
    this.stopGesture = stop;
    this.locked = true;
    await this.say(line);
    if (withSound && f === this.flow) await this.saySound(sound);
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

  /**
   * Dad's button (or the timeout, or F4). A yes charges the rune (while the
   * helper is still helping too: she said it); a no gets help.
   */
  private answer(a: DadAnswer, timedOut = false): void {
    if (this.phase !== 'prompt' && this.phase !== 'ask' && !(this.phase === 'help' && a === 'yes')) return;
    this.noteActivity();
    setDadAsking(false);
    // Whatever was being said or shown for this rune stops here.
    this.flow++;
    this.stopGesture?.();
    voiceBus.hush();
    if (a === 'yes') void this.charge(false);
    else void this.help(timedOut);
  }

  /** A no or a timeout: the helper models the sound with its gesture and asks again; after enough help, together. */
  private async help(timedOut: boolean): Promise<void> {
    if (timedOut) this.timeouts++;
    const first = this.assists === 0;
    this.assists++;
    (episode.house.misses ??= {})[this.missKey] = this.assists;
    // The ramp moves once per rune, on its first help.
    if (first) progress.setChargeLevel(this.rune, nextChargeLevel(this.level, false));
    this.phase = 'help';
    this.locked = true;
    const f = this.flow;
    const on = () => f === this.flow && this.phase === 'help';
    if (this.assists > CHARGE.assists) {
      // Enough: the helper says it with her, and the rune charges all the same.
      await this.narrate('charge_together');
      if (!on()) return;
      await this.gesture(this.rune, true, f);
      if (!on()) return;
      await this.charge(true);
      return;
    }
    await this.narrate('charge_help');
    if (!on()) return;
    await this.gesture(this.rune, true, f);
    if (!on()) return;
    await this.narrate('charge_your_turn');
    if (!on()) return;
    this.phase = 'prompt';
    this.startAsking();
  }

  /**
   * The rune charges: recorded first (so a skip mid-payoff loses nothing),
   * then it fires into her power bar with heavy particles, its sound said as
   * confirmation unless the helper just said it with her.
   */
  private async charge(together: boolean): Promise<void> {
    const sound = this.rune;
    const i = this.index;
    const last = i === this.plan.runes.length - 1;
    const unaided = this.assists === 0;
    this.phase = 'charging';
    this.locked = true;
    setDadAsking(false);
    progress.record('sounds', sound, unaided, this.assists);
    if (unaided) progress.setChargeLevel(sound, nextChargeLevel(this.level, true));
    if (episode.house.misses) delete episode.house.misses[this.missKey];
    // They fire in the next battle: the house part's own number.
    const step = currentStep();
    const charged = (episode.charged ??= { sounds: [], part: step.kind === 'house' ? step.part : 1 });
    if (!charged.sounds.includes(sound)) charged.sounds.push(sound);
    if (last && !episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);

    const color = RUNE_BY_SOUND[sound]?.move.color ?? 0xffd23f;
    sfxRight();
    sfxBoom(2);
    shake(this, 4, 260);
    punch(this, 0.04);
    shockwave(this, RUNE.x, RUNE.y, color, 260);
    burst(this, RUNE.x, RUNE.y, { count: 90, speed: 620, scale: 2.2, texture: TEX.star, gravity: 900, life: 1000, colors: [color, 0xffd23f, 0xffffff] });
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 300, scale: 2.6, texture: TEX.glow, gravity: 0, life: 700, colors: [color, 0xffffff] });
    floatText(this, RUNE.x, RUNE.y - 150, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    this.runeText.setColor(LIT);
    if (!together) await this.saySound(sound);
    this.runeText.setColor(LIT);

    // The rune flies into its slot in the power bar, trailing sparks.
    await this.wait(150);
    const to = this.slotPos(i);
    const flyer = this.add.text(RUNE.x, RUNE.y, sound.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: '150px', color: LIT, stroke: '#ffffff', strokeThickness: 10 }).setOrigin(0.5).setDepth(DEPTH.sparkles);
    this.runeText.setText('');
    this.stone.setTint(0x8a7aa8);
    const trail = this.add
      .particles(0, 0, TEX.spark, { speed: 60, scale: { start: 2, end: 0 }, lifespan: 600, frequency: 12, tint: [color, 0xffffff, 0xffd23f], blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.sparkles - 1);
    trail.startFollow(flyer);
    sfxWhoosh();
    await this.guard(
      new Promise<void>((resolve) =>
        this.tweens.add({ targets: flyer, x: to.x, y: to.y, scale: 0.28, duration: 650, ease: 'Cubic.easeIn', onComplete: () => resolve() }),
      ),
    );
    trail.stop();
    this.time.delayedCall(700, () => trail.destroy());
    flyer.destroy();
    this.fillSlot(i, sound, true);
    burst(this, to.x, to.y, { count: 50, speed: 380, scale: 1.6, texture: TEX.star, gravity: 700, colors: [color, 0xffffff] });
    shockwave(this, to.x, to.y, color, 120);
    sfxSelect();
    this.player.hop();

    await this.say(narratorLine(narrator(), `charge_yes_${(i % CHARGE_YES_VARIANTS) + 1}`));
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0);
    this.stone.setVisible(false);
    if (!last) {
      this.index++;
      await this.wait(300);
      await this.lightRune();
      return;
    }
    this.phase = 'done';
    this.locked = true;
    sfxSummon();
    for (let k = 0; k < this.barSlots.length; k++) this.time.delayedCall(k * 90, () => burst(this, this.slotPos(k).x, this.slotPos(k).y, { count: 20, speed: 260, texture: TEX.star }));
    await this.say(narratorLine(narrator(), 'charge_done'));
    await this.wait(400);
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  /** Waiting for Dad: nothing for CHARGE.timeoutMs counts as a no (paused under dad lock and while a line plays). */
  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (this.phase !== 'ask') return;
    if (dadLock.locked || voiceBus.busy) return;
    this.waitMs += deltaMs;
    if (this.waitMs >= CHARGE.timeoutMs) {
      this.waitMs = 0;
      this.answer('no', true);
    }
  }

  /** Yellow: the ask again, at its level (no extra help, so not counted). Idle before the altar: the intro again. */
  protected override hint(idle = false): void {
    if (this.phase === 'approach') {
      void this.narrate('charge_intro').then(() => {
        if (this.phase === 'approach') this.locked = false;
      });
      return;
    }
    if (this.phase !== 'ask' || idle) return;
    setDadAsking(false);
    this.phase = 'prompt';
    void this.prompt(++this.flow);
  }

  /** F4 at the altar walks up to it; with a rune lit it is Dad's yes. */
  protected override autoAnswer(): boolean {
    if (this.phase === 'prompt' || this.phase === 'ask' || this.phase === 'help') {
      dadPress('yes');
      return true;
    }
    return false;
  }

  /** An instruction unlocks input when it ends; mid-rune the room stays as its phase says. */
  protected override async narrate(...keys: string[]): Promise<void> {
    await super.narrate(...keys);
    if (this.phase !== 'approach' && this.phase !== 'ask') this.locked = true;
  }

  protected override extraHooks(): Partial<RoomInfo> {
    return {
      charge: {
        runes: [...this.plan.runes],
        index: this.index,
        sound: this.rune,
        level: this.level,
        phase: this.phase,
        asking: this.phase === 'ask',
        assists: this.assists,
        timeouts: this.timeouts,
        charged: [...(episode.charged?.sounds ?? [])],
      },
    };
  }
}
