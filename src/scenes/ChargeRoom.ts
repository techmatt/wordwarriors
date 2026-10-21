/**
 * Charge the Spell (item 053; one word a visit since item 058): a side room
 * where she says letter SOUNDS aloud and Dad judges, then reads the word
 * they spell. Her real gap is sounds (she knows the names), and nothing here
 * can be won from a first letter or a guess: she has to say it.
 *
 * The visit's word (src/rules/charge.ts: 3-4 sound units, every one a rune)
 * is shown at the top from the start, one slot per unit. She walks up to the
 * magic altar and presses green. The word's first rune lights on the altar
 * (its slot at the top pulses); she says its sound, and Dad presses 2 (the
 * dad buttons, src/input/dadButtons.ts): the rune fires into its slot,
 * heavy with particles, its sound said as confirmation. Dad presses 1, or
 * nothing comes for CHARGE.timeoutMs: the helper shows its gesture (Jolly
 * Phonics style, content/phonics/runes.ts: a hissing snake, a tummy rub) and
 * says the sound, and she tries again. After CHARGE.assists helps they say it
 * together and the rune charges all the same (no fail states).
 *
 * Every cue is a few words at most (item 058), by the sound's help level
 * (src/rules/charge.ts): at level 1 the helper shows the gesture and says the
 * sound first ("Now you say it!"); at level 2 the gesture and "It goes..."
 * (a cloze); at level 3 the rune alone. A 2 with no help moves the sound up a
 * level, any help moves it down one; the answer is recorded under `sounds`,
 * the level under `chargeLevels`.
 *
 * With every rune charged the whole word lights at the top and she reads it
 * aloud ("Now read the whole spell!"). Dad's 2: the word is said, its picture
 * shows and flies into her bag. His 1, or nothing for CHARGE.readTimeoutMs:
 * the word is sounded out once, unit by unit (never blended), then said, and
 * the picture goes into the bag all the same. The read is recorded under
 * `words`, and the word is a battle item (`episode.fetched`).
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
import { CHARGE_ASK_VARIANTS, RIGHT_VARIANTS } from '../../content/voice/script';
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
import { Bag } from '../ui/Bag';
import type { CaptionMode, KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import { applyHouseMood } from '../world/houseMood';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, INK, LIT, Minigame } from './minigames/Minigame';

/**
 * `approach`: walk to the altar. `explain`: the helper explains, no rune yet.
 * `resume`: back from the parent page, the rune not lit yet. `prompt`: the
 * rune is lit and the helper is cueing it. `ask`: waiting for Dad. `help`:
 * the helper models it after a no. `charging`: the payoff. `read`: every
 * rune charged, she reads the word, waiting for Dad. `reading`: the word's
 * payoff (said, or sounded out and said). `done`: back to the hub. Dad's
 * buttons count only in `prompt`, `ask`, (a yes) `help` and `read`.
 */
type Phase = 'approach' | 'explain' | 'resume' | 'prompt' | 'ask' | 'help' | 'charging' | 'read' | 'reading' | 'done';

const ALTAR = { x: GAME_WIDTH / 2 + 60, y: 600, w: 340, h: 250 };
/** The rune stands on the altar's top. */
const RUNE = { x: ALTAR.x, y: 330, size: 200 };
/** The helper stands at the altar's left and performs the gestures there. */
const HELPER = { x: ALTAR.x - 330, y: 620 };
/** The word at the top: her face, then a slot per sound unit; its picture shows at the right once read. */
const BAR = { x: GAME_WIDTH / 2, y: 78, slot: 104, gap: 14 };
const PICTURE = 120;

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
  /** How the word's read went: Dad's yes, or a no / timeout (sounded out). */
  private readAnswer: 'yes' | 'no' | 'timeout' | null = null;
  private finished = false;
  private closeDad: (() => void) | null = null;
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
    // Back from the parent page (F9) mid-visit: on from the first rune not yet charged, or the read.
    const charged = episode.charged?.sounds ?? [];
    this.index = Math.min(charged.length, this.plan.runes.length);
    this.finished = episode.fetched.includes(this.plan.word) || episode.house.done.includes(this.slot);
    this.phase = this.index > 0 ? 'resume' : 'approach';
    this.level = 1;
    this.flow++;
    this.stopGesture = null;
    this.assists = this.missesNow();
    this.waitMs = 0;
    this.timeouts = 0;
    this.readAnswer = null;
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
      .text(RUNE.x, RUNE.y + 4, '', { fontFamily: FONT_COMIC, fontSize: '140px', color: INK, stroke: '#ffffff', strokeThickness: 10 })
      .setOrigin(0.5)
      .setDepth(ALTAR.y);
    this.makeBar();
    this.bag = new Bag(this);
    void voiceBank.ensure(wordLine(this.plan.word));

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
        if (this.phase !== 'resume') return;
        if (this.allCharged) void this.askRead();
        else void this.lightRune();
      });
    }
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

  /** A slot takes its rune: the move's colour, its letters lit. */
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

  /** The word's next rune lights on the altar and the helper cues it, with the help its level gives. */
  private async lightRune(): Promise<void> {
    const sound = this.rune;
    const f = ++this.flow;
    this.round = `charge:${this.index}:${sound}`;
    this.phase = 'prompt';
    this.locked = true;
    this.assists = this.missesNow();
    this.level = chargeLevel(progress, sound);
    this.waitMs = 0;
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
    await this.wait(300);
    if (f !== this.flow || this.phase !== 'prompt') return;
    await this.prompt(f);
  }

  /** The cue, a few words at most, as the rune's level (and any help so far) says; `f` is the flow it belongs to. */
  private async prompt(f: number, again = false): Promise<void> {
    const sound = this.rune;
    const on = () => f === this.flow && this.phase === 'prompt';
    if (this.assists === 0 && this.level === 1) {
      // Level 1: the gesture and the sound first; she copies.
      await this.gesture(sound, 'sound', f);
      if (!on()) return;
      await this.narrate('charge_your_turn');
    } else if (this.assists === 0 && this.level === 2) {
      // Level 2: the gesture and "It goes...", where the sound would be.
      await this.gesture(sound, 'cloze', f);
    } else if (this.index === 0 || this.assists > 0 || again) {
      // Level 3 (or asked again after help): the rune alone, a short ask.
      await this.narrate(`charge_ask_${(this.index % CHARGE_ASK_VARIANTS) + 1}`);
    }
    // Level 3 after the first rune: the rune alone, no words; she knows the game by now.
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
   * rhythm while its glyph does the action beside them, and say the sound
   * (`sound`, the rune lit while it plays) or "It goes..." (`cloze`).
   */
  private async gesture(sound: string, cue: 'sound' | 'cloze', f: number): Promise<void> {
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
    this.locked = true;
    // A beat of the action before anything is said, so she sees it.
    await this.wait(450);
    if (f === this.flow) {
      if (cue === 'sound') await this.saySound(sound);
      else await this.say(narratorLine(narrator(), 'charge_goes'));
    }
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
   * Dad's button (or the timeout, or F4). On a rune, a yes charges it (while
   * the helper is still helping too: she said it) and a no gets help; on the
   * word, either moves on (a no sounds it out first).
   */
  private answer(a: DadAnswer, timedOut = false): void {
    if (this.phase === 'read') {
      this.noteActivity();
      setDadAsking(false);
      this.flow++;
      voiceBus.hush();
      void this.readWord(a === 'yes' ? 'yes' : timedOut ? 'timeout' : 'no');
      return;
    }
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

  /** A no or a timeout: the helper shows the gesture and says the sound, and she tries again; after enough help, together. */
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
      await this.gesture(this.rune, 'sound', f);
      if (!on()) return;
      await this.charge(true);
      return;
    }
    await this.gesture(this.rune, 'sound', f);
    if (!on()) return;
    await this.narrate('charge_your_turn');
    if (!on()) return;
    this.phase = 'prompt';
    this.startAsking();
  }

  /**
   * The rune charges: recorded first (so a skip mid-payoff loses nothing),
   * then it fires into its slot in the word with heavy particles, its sound
   * said as confirmation unless the helper just said it with her.
   */
  private async charge(together: boolean): Promise<void> {
    const sound = this.rune;
    const i = this.index;
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

    const color = RUNE_BY_SOUND[sound]?.move.color ?? 0xffd23f;
    sfxRight();
    sfxBoom(2);
    shake(this, 4, 220);
    punch(this, 0.04);
    shockwave(this, RUNE.x, RUNE.y, color, 260);
    burst(this, RUNE.x, RUNE.y, { count: 90, speed: 620, scale: 2.2, texture: TEX.star, gravity: 900, life: 1000, colors: [color, 0xffd23f, 0xffffff] });
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 300, scale: 2.6, texture: TEX.glow, gravity: 0, life: 700, colors: [color, 0xffffff] });
    floatText(this, RUNE.x, RUNE.y - 140, unaided ? 'WOW!' : 'YES!', '#ffd23f');
    this.runeText.setColor(LIT);
    if (!together) await this.saySound(sound);
    this.runeText.setColor(LIT);

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
        this.tweens.add({ targets: flyer, x: to.x, y: to.y, scale: 0.5, duration: 450, ease: 'Cubic.easeIn', onComplete: () => resolve() }),
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
    await this.wait(250);
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
    await this.narrate('charge_read');
    if (f !== this.flow) return;
    this.phase = 'read';
    this.waitMs = 0;
    this.locked = false;
    setDadAsking(true);
  }

  /**
   * The word's payoff, recorded first: Dad's yes says it; his no or the
   * timeout sounds it out once, unit by unit, then says it. Either way its
   * picture shows and flies into her bag (a battle item), and back to the hub.
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
    progress.record('words', word, right, right ? 0 : 1);
    // Her word bag: read right, it is done for this round of the bag.
    if (right) progress.takeFromBag(word);
    else progress.returnToBag(word);
    if (!episode.read.includes(word)) episode.read.push(word);
    if (!episode.fetched.includes(word)) episode.fetched.push(word);
    if (!episode.house.done.includes(this.slot)) episode.house.done.push(this.slot);
    this.tweens.killTweensOf(this.bar);
    this.bar.setScale(1);

    if (!right) {
      // Sounded out once, each unit lit as it is said; never blended.
      await this.narrate('charge_listen');
      for (let k = 0; k < this.plan.runes.length; k++) {
        if (f !== this.flow) return;
        const t = this.barTexts[k];
        this.tweens.add({ targets: [t, this.barSlots[k]], scale: 1.3, duration: 160, yoyo: true });
        await this.say(letterSoundLine(this.plan.runes[k]!));
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
    await Promise.all([this.guard(this.bag.receive(`pic_${word}`, pic.x, pic.y)), right ? this.say(narratorLine(narrator(), `right_${(this.timeouts % RIGHT_VARIANTS) + 1}`)) : Promise.resolve(true)]);
    pic.destroy();
    if (f !== this.flow) return;
    this.phase = 'done';
    sfxSelect();
    await this.say(narratorLine(narrator(), 'charge_done'));
    await this.wait(300);
    this.fadeOutThen(() => backToHub(this, this.slot));
  }

  /** Waiting for Dad: nothing for CHARGE.timeoutMs (a rune) or CHARGE.readTimeoutMs (the word) counts as a no (paused under dad lock and while a line plays). */
  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (this.phase !== 'ask' && this.phase !== 'read') return;
    if (dadLock.locked || voiceBus.busy) return;
    this.waitMs += deltaMs;
    if (this.waitMs >= (this.phase === 'read' ? CHARGE.readTimeoutMs : CHARGE.timeoutMs)) {
      this.waitMs = 0;
      this.answer('no', true);
    }
  }

  /** Yellow: the cue again, at its level (no extra help, so not counted); on the word, the read ask again. Idle before the altar: the intro again. */
  protected override hint(idle = false): void {
    if (this.phase === 'approach') {
      void this.narrate('charge_intro').then(() => {
        if (this.phase === 'approach') this.locked = false;
      });
      return;
    }
    if (idle) return;
    if (this.phase === 'read') {
      setDadAsking(false);
      void this.askReadAgain();
      return;
    }
    if (this.phase !== 'ask') return;
    setDadAsking(false);
    this.phase = 'prompt';
    void this.prompt(++this.flow, true);
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

  /** F4 at the altar walks up to it; with a rune lit, or the word to read, it is Dad's yes. */
  protected override autoAnswer(): boolean {
    if (this.phase === 'prompt' || this.phase === 'ask' || this.phase === 'help' || this.phase === 'read') {
      dadPress('yes');
      return true;
    }
    return false;
  }

  /** An instruction unlocks input when it ends; mid-rune the room stays as its phase says. */
  protected override async narrate(...keys: string[]): Promise<void> {
    await super.narrate(...keys);
    if (this.phase !== 'approach' && this.phase !== 'ask' && this.phase !== 'read') this.locked = true;
  }

  protected override extraHooks(): Partial<RoomInfo> {
    return {
      charge: {
        word: this.plan.word,
        runes: [...this.plan.runes],
        index: this.index,
        sound: this.rune,
        level: this.level,
        phase: this.phase,
        asking: this.phase === 'ask' || this.phase === 'read',
        assists: this.assists,
        timeouts: this.timeouts,
        read: this.readAnswer,
        charged: [...(episode.charged?.sounds ?? [])],
      },
    };
  }
}
