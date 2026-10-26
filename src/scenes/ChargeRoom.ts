/**
 * Charge the Spell (item 053; two words a visit since item 140, one in items
 * 058-139; no presses per rune since item 059): a side room where she says
 * letter SOUNDS aloud after the helper, then reads the word they spell for
 * Dad. Her real gap is sounds (she knows the names).
 *
 * A visit is CHARGE.words rounds, a word each (src/rules/charge.ts: 3-4
 * sound units, every one a rune). The round's word is shown at the top from
 * its start, one slot per unit. She walks in and it starts by itself: the
 * helper says all the word's sounds straight away, in order, each slot lit
 * as its sound plays (item 140; a beat between them, never blended, never
 * the word), then "Say each sound after me!" (the first round only). Each
 * rune lights on the altar in turn (its slot at the top pulses); the helper
 * shows its gesture (Jolly Phonics style, content/phonics/runes.ts) and says
 * its sound, then a beat (CHARGE.sayBackMs) of quiet for her to say it back,
 * and the rune fires into its slot, heavy with particles. Nothing is pressed
 * per rune: Matt found the per-rune presses slow and frustrating (item 059).
 *
 * With every rune charged the whole word lights at the top and she reads it
 * aloud ("Now read the whole spell!", on the visit's first word only since
 * item 144): the room's one press, Dad's. His 2:
 * the word is said, its picture shows and flies into her bag. His 1: "Let's
 * sound it out together!", the word sounded out once, unit by unit (never
 * blended), then said, and the picture goes into the bag all the same. The
 * read is recorded under `words`, and its runes' sounds under `sounds` (right
 * with his 2); the word is a battle item (`episode.fetched`). Then the next
 * round's word takes the bar and its sounds start (since item 144 no "Here
 * comes another spell!" first); the last word's picture flies into the bag to
 * "Our spells are all charged up!" (its praise gone, item 144), then back to
 * the hub. A two-word visit with Dad answering at once is at most 40 s (hunt
 * 11, M61, Matt's ruling; 33-39 s measured in an episode).
 *
 * Solo mode (item 106, `episode.solo`): nothing from Dad for DAD_AWAY_MS on
 * the read means he isn't there, so the helper joins in instead, for the rest
 * of the session (hunt 7, M34: the next episode's Charge reads together at
 * once, no wait): "Say it with me!" before each rune's sound, a shorter beat
 * (CHARGE.soloBeatMs), and the read done together ("Let's read the whole
 * spell together!", sounded out, then said). Those runes and that word are
 * recorded as modelled (`progress.model`), never as her reads. His 1 / 2 at
 * any time switches back (during the solo read, his yes is a helped read, M34).
 *
 * Each charged rune becomes a move her hero fires in the next battle
 * (`episode.charged`, `useCharged` in src/battle/volleys.ts).
 *
 * Speech rule: letter SOUNDS only, each its own `letter_<x>_sound` line, never
 * captioned (the rune lights instead); the word itself only after Dad's answer.
 */

import Phaser from 'phaser';

import { RUNE_BY_SOUND, runeArt, type GestureMotion } from '../../content/phonics/runes';
import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { letterSoundLine, narratorLine, wordLine } from '../../content/voice/ids';
import { readPraise } from '../episode/lineVariants';
import { voiceBus } from '../voice/VoiceBus';
import { sfxBoom, sfxRight, sfxSelect, sfxSummon, sfxWhoosh, sfxZap } from '../audio/sfx';
import { CHARGE, DEPTH, FONT_COMIC, GAME_WIDTH, SOUND_GAP_MS } from '../config';
import { castFace, currentStep, episode, helper, narrator, type Slot, type Step } from '../episode/Episode';
import { bob, burst, fitImage, fitPicture, floatText, popIn, punch, shake, shockwave, squash } from '../fx/juice';
import { TEX } from '../fx/textures';
import { dadPress, setDadAsking, type DadAnswer } from '../input/dadButtons';
import { dadLock } from '../input/dadLock';
import type { ChargePlan, ChargeWord } from '../rules/charge';
import { progress } from '../state/progress';
import type { RoomInfo } from '../hookState';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { voiceBank } from '../voice/VoiceBank';
import type { Spot } from '../world/RoomScene';
import { ARRIVE_MS, HouseSideRoom, INK, LIT, sidePlan } from '../world/SideRoom';
import type { SceneKey } from './keys';

/** How the read went (`helped`: his yes while she read it with the helper, hunt 7 M34: right, never first try). */
type ReadAnswer = 'yes' | 'no' | 'modelled' | 'helped';

/**
 * `sounds`: the helper says all the round's sounds first (item 140).
 * `explain`: the helper explains, no rune yet. `prompt`: a rune is lit and
 * the helper says it. `sayback`: her beat to say it back. `charging`: the
 * payoff. `read`: every rune charged, she reads the word, waiting for Dad.
 * `reading`: the word's payoff (said, or sounded out and said). `done`: back
 * to the hub. Dad's 1 / 2 are his answer in `read`, in `reading` while the
 * read is asked or a solo read is not yet recorded, and from the last rune
 * (kept, acted on as the read is asked, M24); any press ends solo.
 */
type Phase = 'sounds' | 'explain' | 'prompt' | 'sayback' | 'charging' | 'read' | 'reading' | 'done';

const ALTAR = { x: GAME_WIDTH / 2 + 60, y: 600, w: 340, h: 250 };
/** The rune stands on the altar's top. */
const RUNE = { x: ALTAR.x, y: 330, size: 200 };
/** The picture letter on the stone's face (item 103): big enough that its letter reads at a glance. */
const LETTER = 150;
/** The helper stands at the altar's left and performs the gestures there. */
const HELPER = { x: ALTAR.x - 330, y: 620 };
/**
 * The word at the top: her face, then a slot per sound unit; its picture shows at the right once read.
 * Below the bag's row of fetched things (hunt 11): at y 78 the bar sat over the row from its sixth thing
 * (the warm-up's and four of the word machine's, then the first word's here), hiding them under the plate.
 */
const BAR = { x: GAME_WIDTH / 2, y: 160, slot: 104, gap: 14 };
const PICTURE = 120;

/** The word's bar at its full size, for a word of `n` sound units: its plate, her face card on it (makeBar). */
function barBox(n: number): Phaser.Geom.Rectangle {
  const w = n * BAR.slot + (n - 1) * BAR.gap + 150;
  const h = BAR.slot + 24;
  return new Phaser.Geom.Rectangle(BAR.x + 20 - w / 2, BAR.y - h / 2, w, h);
}
/**
 * The quiet around each rune, in ms (hunt 11, M61, item 144: trimmed so a two-word visit with Dad
 * answering at once is about 40 s; the sounds and the say-back beat are not here). `lit`: after the
 * rune lights; `lead`: the gesture before its sound; `fly`: the rune into its slot; `after`: once it
 * lands, before the next lights; `sounds`: after the round's sounds up front. Item 140's were 150,
 * 200, 400, 150 and 300.
 */
const RUNE_BEATS = { lit: 80, lead: 120, fly: 300, after: 0, sounds: 150 };

export class ChargeRoom extends HouseSideRoom {
  /** Nothing to walk to here: no stick hint (item 059 review). */
  protected override walking = false;
  private plan!: ChargePlan;
  /** The round on now (item 140: a word each; `round` is the hooks' label); `index` the rune lit in it. */
  private wordIndex = 0;
  private index = 0;
  private phase: Phase = 'explain';
  /** How the word's read went: Dad's yes, his no (sounded out), read with the helper (solo), or his yes during that (`helped`, M34). */
  private readAnswer: ReadAnswer | null = null;
  /** The solo read is recorded once it is sounded out; until then a Dad press records a helped read (M34). */
  private readRecorded = false;
  /** Sounds this visit already recorded as modelled (a solo rune), so the solo read does not count them twice. */
  private modelledSounds = new Set<string>();
  /** Dad's 1 / 2 while the last rune is said or charges (she can read the word on the bar by then): acted on as the read is asked (M24). */
  private earlyAnswer: DadAnswer | null = null;
  /** The rune charging now (phase `charging`). */
  private chargingIndex = -1;
  private finished = false;
  /** Scene time at the start of the visit and of the round, and when the read was asked from the round's start (its length in game time, for the tests). */
  private startedAt = 0;
  private roundAt = 0;
  private readAt = 0;
  /** The say-back beat running now: its time left (it stands still under dad lock). */
  private beat: { left: number; done: () => void } | null = null;
  private altar!: Phaser.GameObjects.Image;
  private stone!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  /** The rune's picture letter (`runeArt`) on the stone; `runeScale` its fitted scale. */
  private runePic!: Phaser.GameObjects.Image;
  private runeScale = 1;
  private friend!: Phaser.GameObjects.Image;
  private bar!: Phaser.GameObjects.Container;
  private bag!: Bag;
  private barSlots: Phaser.GameObjects.Rectangle[] = [];
  private barTexts: Phaser.GameObjects.Text[] = [];
  /** The pulse on the slot of the rune lit now. */
  private slotPulse: Phaser.Tweens.Tween | null = null;
  // `flow` (RoomScene): every chain takes the number when it starts and stops at its next
  // await once Dad's answer has moved it on, so a press mid-line never leaves two chains talking.
  /** The gesture playing now, to stop it at once when the room moves on. */
  private stopGesture: (() => void) | null = null;
  /** The helper's scale at rest: every gesture's squash starts and ends there. */
  private friendScale = { x: 1, y: 1 };

  constructor() {
    super('ChargeRoom' satisfies SceneKey);
  }

  override init(data: { step?: Step; slot?: Slot }): void {
    super.init(data);
    const p = sidePlan('ChargeRoom', this.slot, 'charge');
    this.plan = p.charge;
    this.roomId = p.room;
    // Back from the parent page (F9) mid-visit: on from the first word not yet read, its first rune not yet charged, or its read.
    const left = this.plan.rounds.findIndex((r) => !episode.read.includes(r.word));
    this.finished = left < 0 || episode.house.done.includes(this.slot);
    this.wordIndex = left < 0 ? this.plan.rounds.length - 1 : left;
    const at = episode.charged?.at;
    this.index = at?.word === this.cur.word ? Math.min(at.index, this.cur.runes.length) : 0;
    this.phase = 'explain';
    this.flow++;
    this.stopGesture = null;
    this.readAnswer = null;
    this.readRecorded = false;
    this.modelledSounds = new Set(episode.charged?.modelled ?? []);
    this.earlyAnswer = null;
    this.chargingIndex = -1;
    this.beat = null;
    this.barSlots = [];
    this.barTexts = [];
    this.slotPulse = null;
  }

  /** This round's word, its units and runes. */
  private get cur(): ChargeWord {
    return this.plan.rounds[this.wordIndex]!;
  }

  private get lastRound(): boolean {
    return this.wordIndex >= this.plan.rounds.length - 1;
  }

  private get rune(): string {
    return this.cur.runes[this.index] ?? '';
  }

  private get allCharged(): boolean {
    return this.index >= this.cur.runes.length;
  }

  /** The rune and the word are what she watches: the box keeps off both. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    for (const o of [this.stone, this.friend]) {
      if (!o?.active) continue;
      const b = o.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: o === this.friend ? 4 : 8 });
    }
    // The bar at its full size: a new round's pops in from nothing as "Here comes another spell!" started (before item 144), and its
    // bounds then were nothing, so the box took the top over the new word (hunt 11).
    if (this.bar?.active) {
      const b = barBox(this.cur.units.length);
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 8 });
    }
    return out;
  }

  protected build(): void {
    this.floor.setTo(80, 420, GAME_WIDTH - 160, 260);
    const room = SIDE_ROOM_BY_ID[this.roomId];
    // The villain's mess keeps off the word's bar and the picture beside it (hunt 11: a wall decal showed through
    // its see-through cells, behind the letter she was sounding), the altar, the helper and her; and its floor
    // pieces keep to the upper floor (in the boulder yard the bottom of the floor is the stream).
    const widest = Math.max(...this.plan.rounds.map((r) => r.units.length));
    const bar = barBox(widest);
    const avoid = [
      new Phaser.Geom.Rectangle(bar.x, bar.y, bar.width + PICTURE + 60, bar.height),
      new Phaser.Geom.Rectangle(ALTAR.x - ALTAR.w / 2, RUNE.y - RUNE.size / 2, ALTAR.w, ALTAR.y + ALTAR.h / 2 - (RUNE.y - RUNE.size / 2)),
      new Phaser.Geom.Rectangle(HELPER.x - 80, HELPER.y - 170, 160, 190),
      new Phaser.Geom.Rectangle(ALTAR.x - ALTAR.w / 2 - 130, ALTAR.y - 150, 160, 190),
    ];
    this.houseMood(avoid, new Phaser.Geom.Rectangle(80, 420, GAME_WIDTH - 160, 160));
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
    // Back from the grown-ups page with every rune charged there is no rune at the index: the
    // word's first stands in (hunt 7: 'm' did, not loaded for a word with no M, so "art: not ready").
    this.runePic = this.add.image(RUNE.x, RUNE.y, runeArt(this.rune || this.cur.runes[0]!)).setDepth(ALTAR.y).setVisible(false);
    this.makeBar();
    this.bag = new Bag(this);
    for (const r of this.plan.rounds) void voiceBank.ensure(wordLine(r.word));

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
      await this.startRound(false);
    })();
  }

  /**
   * A round starts: its word at the top (`fresh`: the round before it is
   * done, so its word takes the bar), all its
   * sounds said first (item 140), the game explained on the visit's first,
   * then its runes one by one. Back mid-round (the parent page), she knows the
   * game: straight on from the rune she was on, or the read.
   */
  private async startRound(fresh: boolean): Promise<void> {
    const f = ++this.flow;
    // The visit's first round counts from her arrival, as the round did before item 140.
    this.roundAt = fresh ? this.time.now : this.startedAt;
    this.readAt = 0;
    this.phase = 'sounds';
    this.readAnswer = null;
    this.readRecorded = false;
    this.earlyAnswer = null;
    this.chargingIndex = -1;
    if (fresh) {
      this.slotPulse?.stop();
      this.slotPulse = null;
      this.tweens.killTweensOf(this.bar);
      this.bar.destroy();
      this.barSlots = [];
      this.barTexts = [];
      this.makeBar();
      popIn(this, this.bar, 1);
    }
    if (this.index === 0) {
      sfxSummon();
      squash(this, this.altar, this.altar.scaleX, this.altar.scaleY, 0.12);
      burst(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.8, { count: 50, speed: 360, texture: TEX.star, colors: [0xb28dff, 0xffd23f, 0xffffff] });
      shockwave(this, ALTAR.x, ALTAR.y - ALTAR.h * 0.6, 0xb28dff, 220);
      // A later round's new word pops in with the summon and goes straight to its sounds (hunt 11, M61, item 144:
      // "Here comes another spell!" went, dead time before them; the bar, the burst and the summon say it).
      // The bar's pop-in (380 ms) is over before its first slot lights with a sound.
      if (fresh) {
        await this.wait(400);
        if (f !== this.flow) return;
      }
      await this.sayAllSounds(f);
      if (f !== this.flow) return;
      if (this.wordIndex === 0) {
        this.phase = 'explain';
        await this.narrate(episode.solo ? 'charge_explain_solo' : 'charge_explain');
      }
      if (f !== this.flow) return;
    }
    if (this.allCharged) await this.askRead();
    else await this.lightRune();
  }

  /**
   * Item 140: the word's sounds, all of them in order, straight away: each
   * slot lights as its sound plays, a beat between them (never blended, never
   * the word itself), then the slots go dim again for the runes.
   */
  private async sayAllSounds(f: number): Promise<void> {
    this.phase = 'sounds';
    this.locked = true;
    this.round = `charge:sounds:${this.cur.word}`;
    const runes = this.cur.runes;
    for (let k = 0; k < runes.length; k++) {
      if (f !== this.flow) return;
      const r = this.barSlots[k]!;
      const t = this.barTexts[k]!;
      r.setStrokeStyle(6, 0xffd23f, 1);
      t.setAlpha(1);
      this.tweens.add({ targets: [r, t], scale: 1.2, duration: 180, yoyo: true });
      await this.say(letterSoundLine(runes[k]!));
      r.setStrokeStyle(3, 0xffffff, 0.7);
      t.setAlpha(0.55);
      if (k < runes.length - 1) await this.wait(SOUND_GAP_MS);
    }
    await this.wait(RUNE_BEATS.sounds);
  }

  /** Her face, then the round's word, a slot per sound unit (its letters dim until charged); slots charged this round are lit. */
  private makeBar(): void {
    const n = this.cur.units.length;
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
      const unit = this.cur.units[i]!;
      const t = this.add
        .text(x, 0, unit.toUpperCase(), { fontFamily: FONT_COMIC, fontSize: unit.length > 1 ? '54px' : '72px', color: '#ffffff', stroke: '#1a1030', strokeThickness: 6 })
        .setOrigin(0.5)
        .setAlpha(0.55);
      this.barSlots.push(r);
      this.barTexts.push(t);
      parts.push(r, t);
    }
    this.bar = this.add.container(BAR.x, BAR.y, parts).setDepth(DEPTH.hud);
    for (let i = 0; i < Math.min(this.index, n); i++) this.fillSlot(i, false);
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
    const color = RUNE_BY_SOUND[this.cur.runes[i] ?? '']?.move.color ?? 0xffd23f;
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
    this.runePic.setTexture(runeArt(sound)).clearTint().setAlpha(1).setVisible(true);
    this.runeScale = fitImage(this.runePic, LETTER, LETTER).scale;
    this.stone.setVisible(true).clearTint();
    popIn(this, this.stone, this.stone.scale);
    popIn(this, this.runePic, this.runeScale, 120);
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(0.5).setScale(2.6);
    this.tweens.add({ targets: this.glow, alpha: 0.85, scale: 3.1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    sfxZap();
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 280, colors: [0xb28dff, 0xffffff] });
    await this.wait(RUNE_BEATS.lit);
    if (f !== this.flow) return;
    // Solo (item 106): the helper says it with her. Fixed as the rune lights: Dad's press mid-rune counts from the next.
    const solo = episode.solo;
    await this.gesture(sound, f, solo);
    if (f !== this.flow) return;
    // Her turn: the rune glows and the room is quiet while she says it back (solo: a shorter beat, she said it with the helper).
    this.phase = 'sayback';
    this.tweens.add({ targets: this.runePic, scale: this.runeScale * 1.15, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.waitUnlocked(solo ? CHARGE.soloBeatMs : CHARGE.sayBackMs);
    if (f !== this.flow) return;
    this.tweens.killTweensOf(this.runePic);
    this.runePic.setScale(this.runeScale);
    if (solo && !this.modelledSounds.has(sound)) {
      this.modelledSounds.add(sound);
      progress.model('sounds', sound);
    }
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
   * (the rune lit while it plays); solo, "Say it with me!" first.
   */
  private async gesture(sound: string, f: number, solo: boolean): Promise<void> {
    const r = RUNE_BY_SOUND[sound];
    if (!r) return;
    // One gesture at a time, from the helper's rest scale.
    this.stopGesture?.();
    // On the helper's far side from her (hunt 10: on the near side it sat on her face as the sound played);
    // 150 px keeps even the widest action ('fly', 160 px each way) off her, and on screen.
    const at = { x: this.friend.x - 150, y: this.friend.y - this.friend.displayHeight * 0.6 };
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
    await this.wait(RUNE_BEATS.lead);
    if (solo && f === this.flow) await this.narrate('charge_with_me');
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

  /** The sound itself, the rune's picture letter pulsing as it plays (never captioned). */
  private async saySound(sound: string): Promise<void> {
    this.tweens.add({ targets: this.runePic, scale: this.runeScale * 1.2, duration: 160, yoyo: true });
    await this.say(letterSoundLine(sound));
  }

  /** Dad's button (or F4): only the word's read asks him. A no sounds it out together first. Any press ends solo mode. */
  private answer(a: DadAnswer): void {
    // Item 093 (M24): his press once the last rune is lit was dropped, though his cue flashed as if
    // it landed; it is kept (his latest press) and acted on as the read is asked.
    // Charging, by the rune that flies (`index` is already the last one's in the beat after the one before it charges).
    const last = this.cur.runes.length - 1;
    const lastRune = this.phase === 'charging' ? this.chargingIndex === last : this.index === last && (this.phase === 'prompt' || this.phase === 'sayback');
    if (lastRune) {
      this.noteActivity();
      this.earlyAnswer = a;
      return;
    }
    // From the moment the word lights: Dad may answer while "Now read the whole spell!" still plays,
    // or while a solo read is sounded out together, until it is recorded.
    const helping = this.readAnswer === 'modelled' && !this.readRecorded;
    const open = this.readAnswer === null || helping;
    if (this.phase !== 'read' && !(this.phase === 'reading' && open && this.allCharged)) return;
    this.noteActivity();
    setDadAsking(false);
    this.flow++;
    voiceBus.hush();
    // Hunt 7, M34: a yes while the helper reads it with her is a helped read, never her unaided first try.
    void this.readWord(a === 'no' ? 'no' : helping ? 'helped' : 'yes');
  }

  /** The rune charges: it fires into its slot in the word with heavy particles, and the next lights. */
  private async charge(): Promise<void> {
    const sound = this.rune;
    const i = this.index;
    this.chargingIndex = i;
    const f = this.flow;
    this.phase = 'charging';
    this.locked = true;
    // They fire in the next battle: the house part's own number.
    const step = currentStep();
    const charged = (episode.charged ??= { sounds: [], part: step.kind === 'house' ? step.part : 1 });
    if (!charged.sounds.includes(sound)) charged.sounds.push(sound);
    // Kept with the episode, so the solo read after F9 and back does not model it again (hunt 10).
    if (this.modelledSounds.has(sound) && !(charged.modelled ??= []).includes(sound)) charged.modelled.push(sound);

    const color = RUNE_BY_SOUND[sound]?.move.color ?? 0xffd23f;
    sfxRight();
    sfxBoom(2);
    shake(this, 4, 220);
    punch(this, 0.04);
    shockwave(this, RUNE.x, RUNE.y, color, 260);
    burst(this, RUNE.x, RUNE.y, { count: 90, speed: 620, scale: 2.2, texture: TEX.star, gravity: 900, life: 1000, colors: [color, 0xffd23f, 0xffffff] });
    burst(this, RUNE.x, RUNE.y, { count: 40, speed: 300, scale: 2.6, texture: TEX.glow, gravity: 0, life: 700, colors: [color, 0xffffff] });
    // Over the word bar, which fix 165 brought down into its rise: under it, YES! showed dimly through the plate.
    floatText(this, RUNE.x, RUNE.y - 140, 'YES!', '#ffd23f', 40, DEPTH.hud + 2);

    // The rune flies up into its slot in the word, trailing sparks.
    const to = this.slotPos(i);
    const flyer = this.add.image(RUNE.x, RUNE.y, runeArt(sound)).setScale(this.runeScale).setDepth(DEPTH.sparkles);
    this.runePic.setVisible(false);
    this.stone.setTint(0x8a7aa8);
    const trail = this.add
      .particles(0, 0, TEX.spark, { speed: 60, scale: { start: 2, end: 0 }, lifespan: 600, frequency: 12, tint: [color, 0xffffff, 0xffd23f], blendMode: Phaser.BlendModes.ADD })
      .setDepth(DEPTH.sparkles - 1);
    trail.startFollow(flyer);
    sfxWhoosh();
    await this.guard(
      new Promise<void>((resolve) =>
        this.tweens.add({ targets: flyer, x: to.x, y: to.y, scale: this.runeScale * 0.5, duration: RUNE_BEATS.fly, ease: 'Cubic.easeIn', onComplete: () => resolve() }),
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
    // Where the round is, for F9 and back (item 140: two words may share a sound, so `sounds` cannot say).
    charged.at = { word: this.cur.word, index: this.index };
    await this.wait(RUNE_BEATS.after);
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
    this.round = `charge:read:${this.cur.word}`;
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
    if (episode.solo) {
      // Solo (item 106): nobody to ask; the word lights all through, then they read it together.
      await this.wait(this.barTexts.length * 90 + 200);
      if (f !== this.flow) return;
      await this.readWord('modelled');
      return;
    }
    // "Now read the whole spell!" on the visit's first word only (hunt 11, M61, item 144): the second's is a
    // repeat she has just heard; its word lights all through, a beat, and Dad is asked. Yellow still says it.
    if (this.wordIndex === 0) await this.narrate('charge_read');
    else await this.wait(this.barTexts.length * 90);
    if (f !== this.flow) return;
    this.phase = 'read';
    this.readAt = this.time.now - this.roundAt;
    this.locked = false;
    this.askDad();
  }

  /**
   * The word's payoff: Dad's yes says it; his no sounds it out together
   * once, unit by unit, then says it; solo, they read it together the same
   * way. Either way its picture shows and flies into her bag (a battle item),
   * then the next round (item 140), or after the last back to the hub. His answer is recorded first; a solo read once it is
   * sounded out (a Dad press until then is his answer).
   */
  private async readWord(answer: ReadAnswer): Promise<void> {
    const word = this.cur.word;
    const f = this.flow;
    const right = answer === 'yes' || answer === 'helped';
    // Right first time only with Dad's yes to her own read; helped, right with no miss.
    const firstTry = answer === 'yes';
    const modelled = answer === 'modelled';
    this.readAnswer = answer;
    this.readRecorded = false;
    this.phase = 'reading';
    this.locked = true;
    setDadAsking(false);
    if (!modelled) {
      // Dad's yes is a first-try read; his no one miss; his yes during the solo read a helped one (M34).
      this.recordRead(word, firstTry, right ? 0 : 1, { last: this.lastRound });
      // Its sounds with it: a word read right is its sounds said right (the draws lean to shaky sounds).
      for (const s of new Set(this.cur.runes)) progress.record('sounds', s, firstTry, right ? 0 : 1);
      this.readRecorded = true;
    }
    this.tweens.killTweensOf(this.bar);
    this.bar.setScale(1);

    if (!right) {
      // Sounded out together once, each unit lit as it is said; never blended.
      await this.narrate(modelled ? 'charge_read_together' : 'charge_together');
      for (let k = 0; k < this.cur.runes.length; k++) {
        if (f !== this.flow) return;
        const t = this.barTexts[k];
        this.tweens.add({ targets: [t, this.barSlots[k]], scale: 1.3, duration: 160, yoyo: true });
        await this.say(letterSoundLine(this.cur.runes[k]!));
        // A beat between sounds, as every other sound-out has (item 069: back to back they ran toward a blend).
        if (k < this.cur.runes.length - 1) await this.wait(SOUND_GAP_MS);
      }
      await this.wait(200);
    } else {
      sfxRight();
      floatText(this, BAR.x, BAR.y + 110, 'WOW!', '#ffd23f');
    }
    if (f !== this.flow) return;
    if (modelled) {
      // Read with the helper: modelled, never her read (item 106); its sounds too, unless a solo rune already counted them.
      this.recordModelled(word, { last: this.lastRound });
      for (const s of new Set(this.cur.runes)) {
        if (this.modelledSounds.has(s)) continue;
        this.modelledSounds.add(s);
        progress.model('sounds', s);
        // Kept with the episode too, as a charged rune's (hunt 10): else F9 and back in the second word modelled a
        // sound the two words share a second time (a code read, hunt 11).
        if (episode.charged && !(episode.charged.modelled ??= []).includes(s)) episode.charged.modelled.push(s);
      }
      this.readRecorded = true;
    }
    // Only now is the word said, and its picture shown.
    const n = this.barSlots.length;
    const px = this.slotPos(n - 1).x + BAR.slot / 2 + 30 + PICTURE / 2;
    // Its own shape for a standing person or a wide picture (M48), kept clear of the screen's top.
    const pic = fitPicture(this.add.image(px, BAR.y + 40, this.wordArt(word)), PICTURE, PICTURE, { w: PICTURE * 1.45, h: (BAR.y + 40 - 8) * 2 }).setDepth(DEPTH.hud + 1);
    popIn(this, pic, pic.scale);
    burst(this, pic.x, pic.y, { count: 60, speed: 460 });
    shockwave(this, pic.x, pic.y, 0xffd23f, 160);
    await this.say(wordLine(word));
    if (f !== this.flow) return;
    pic.setVisible(false);
    // The visit's last word: "Our spells are all charged up!" as it flies into the bag, in place of the praise
    // (hunt 11, M61, item 144: the two were cheers back to back; a right read's WOW! and chime still praise it).
    const last = this.lastRound;
    if (last) {
      this.phase = 'done';
      sfxSelect();
    }
    const cheer = last ? narratorLine(narrator(), this.doneVariant('charge_done', 'charge_done_2')) : right ? narratorLine(narrator(), readPraise(firstTry)) : null;
    await Promise.all([this.guard(this.bag.receive(this.wordArt(word), pic.x, pic.y)), cheer ? this.say(cheer) : Promise.resolve(true)]);
    pic.destroy();
    if (f !== this.flow) return;
    if (!last) {
      // The next word (item 140): its own round, all its sounds first.
      this.wordIndex++;
      this.index = 0;
      await this.startRound(true);
      return;
    }
    this.fadeToHub();
  }

  /** Waiting for Dad on the read: nothing for DAD_AWAY_MS and the room goes solo (paused under dad lock and while a line plays). */
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
    if (this.phase === 'read' && this.dadAway(deltaMs)) {
      // Nothing from Dad on the read (item 106): he isn't here, so the helper reads it with her.
      this.flow++;
      void this.readWord('modelled');
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
    this.locked = false;
    this.askDad();
  }

  /** F4: with the word to read, Dad's yes; otherwise nothing (the runes move on by themselves). */
  protected override autoAnswer(): boolean {
    if (this.phase === 'read') dadPress('yes');
    return true;
  }

  /** The room stays locked after an instruction except while Dad is asked. */
  protected override stayLocked(): boolean {
    return this.phase !== 'read';
  }

  protected override extraHooks(): Partial<RoomInfo> {
    return {
      charge: {
        words: this.plan.rounds.map((r) => r.word),
        round: this.wordIndex,
        word: this.cur.word,
        runes: [...this.cur.runes],
        index: this.index,
        sound: this.rune,
        phase: this.phase,
        asking: this.phase === 'read',
        timeouts: this.dadTimeouts,
        read: this.readAnswer,
        solo: episode.solo,
        charged: [...(episode.charged?.sounds ?? [])],
        elapsedMs: this.time.now - this.startedAt,
        readAtMs: this.readAt,
      },
    };
  }
}
