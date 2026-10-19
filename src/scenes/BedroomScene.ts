/**
 * The bedroom: where every episode starts. She is asleep; somebody comes in
 * to wake her with the news.
 *
 * She is in bed, peeking over the cover and breathing; any button puffs a 💤.
 * Dada Matt (Dada Jason when Dada Matt is the hero) walks in from the door:
 * "Wake up, wake up!" A green dot shows over the bed and she presses green to
 * jump out (or she pops out by herself after WAKE_WAIT_MS, so nothing stalls).
 * "Good news!" The helper pops in. Then the room goes dark, the villain's mood
 * thumps in over the room (EvilRilla's footprints, a cracked window:
 * `CharacterSpec.house`, so it is data), a far-off taunt, and "Come on, let us
 * go! Find the door!" The door pops back out of the wall (it is not there while
 * she cannot use it) and the grown-ups step over beside it, glowing.
 *
 * No reading here, and no text: it is the room she explores for fun first.
 * Every toy is a spot that does something silly on green (Stardew's "poke
 * everything" pleasure), and the door is the one way on. If she has not found
 * it a while after the news, it sparkles too. Yellow says the door line again.
 */

import Phaser from 'phaser';

import { charArt } from '../../content/art/assets';
import { BEDROOMS, type BedroomObject, type ReactionSound } from '../../content/house/house';
import { personOf } from '../../content/battle/roster';
import { fighterId, tauntLine, wakeLine } from '../../content/voice/ids';
import { voiceBus } from '../audio/VoiceBus';
import {
  sfxBoing,
  sfxBoom,
  sfxKey,
  sfxOink,
  sfxPew,
  sfxPoof,
  sfxSelect,
  sfxShout,
  sfxSummon,
  sfxWhoosh,
  sfxZap,
} from '../audio/sfx';
import { DEPTH, DOOR_SPARKLE_MS, GAME_WIDTH } from '../config';
import { castArt, episode, helper, questSetupLine, villainSpec, waker as wakerId, type Step } from '../episode/Episode';
import { bob, burst, flash, popIn, shake, squash, wiggle } from '../fx/juice';
import { TEX } from '../fx/textures';
import { applyHouseMood } from '../world/houseMood';
import { RoomScene, type Spot } from '../world/RoomScene';

const SOUND: Record<ReactionSound, () => void> = {
  boing: sfxBoing,
  zap: sfxZap,
  summon: sfxSummon,
  pew: sfxPew,
  oink: sfxOink,
  shout: () => sfxShout(1.3),
  poof: sfxPoof,
  key: sfxKey,
  whoosh: sfxWhoosh,
};

/** Where the other dad stands: at the foot of her bed, clear of the toys and the door. */
const SECOND_SPOT = { x: 140, y: 690 };

/** How long "Wake up!" waits for her green before she pops out by herself. */
const WAKE_WAIT_MS = 6000;

export class BedroomScene extends RoomScene {
  private asleep = true;
  private newsDone = false;
  private leaving = false;
  private doorSpot: Spot | null = null;
  private doorImg: Phaser.GameObjects.Image | null = null;
  private zzz: Phaser.Time.TimerEvent | null = null;
  private bedSpot: Spot | null = null;
  private breathing: Phaser.Tweens.Tween | null = null;
  /** Set while "Wake up!" waits for her green on the bed. */
  private wakeResolve: (() => void) | null = null;
  private puffAt = 0;

  constructor() {
    super('Bedroom');
  }

  override init(data: { step?: Step }): void {
    super.init(data);
    this.asleep = true;
    this.newsDone = false;
    this.leaving = false;
    this.doorSpot = null;
    this.doorImg = null;
    this.zzz = null;
    this.bedSpot = null;
    this.breathing = null;
    this.wakeResolve = null;
    this.puffAt = 0;
    // Tucked in: no "walk about" stick hint until she is up.
    this.walking = false;
    // The floor runs right down to the toys at the front of the room.
    this.floor = new Phaser.Geom.Rectangle(70, 400, GAME_WIDTH - 140, 300);
  }

  private get room() {
    return BEDROOMS[0]!;
  }

  protected background(): string {
    return `room_bedroom_${this.room.id}`;
  }

  /** Asleep in bed she is in her default images; wakeUp() puts her form on. */
  protected override playerArt(): string {
    return charArt(episode.hero, false);
  }

  protected build(): void {
    const room = this.room;
    this.round = 'bedroom:sleep';

    // The bed, with her tucked in it: her feet are above the bed's, so she
    // draws behind it and only her top peeks over the cover. The bed is a
    // spot (off until "Wake up!") so green on it jumps her out.
    this.bedSpot = this.addSpot('bed', room.bed.x, room.bed.y, [this.art('prop_bed', 280, 190)], true);
    this.bedSpot.enabled = false;
    this.player.place(room.bed.x - 30, room.bed.y - 30);
    this.breathing = this.tweens.add({ targets: this.player.root, scaleY: 0.95, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.zzz = this.time.addEvent({ delay: 900, loop: true, callback: () => this.floatZ() });

    // The toys: every one does something on green.
    for (const o of room.objects) {
      const img = this.art(`obj_${o.id}`, o.w, o.h);
      const spot = this.addSpot(o.id, o.x, o.y, [img], null);
      spot.obj.setData('object', o);
    }

    // The door: the way on, there only once the news is told (a door she
    // cannot use yet is not there at all), and for a moment as the waker comes in.
    this.doorImg = this.art('prop_door', 130, 200);
    this.doorSpot = this.addSpot('door', room.door.x, room.door.y, [this.doorImg], true);
    this.doorSpot.enabled = false;
    this.doorSpot.obj.setVisible(false);

    void this.run();
  }

  private async run(): Promise<void> {
    const room = this.room;
    // The dad who wakes her (src/rules/cast.ts), drawn in his form for this
    // episode and speaking in his own voice (`w` is the person).
    const wForm = wakerId();
    const w = personOf(wForm);
    await this.wait(800);

    // The waker comes in through the door, which goes again behind them.
    this.showDoor();
    this.doorOpens();
    const waker = this.art(castArt(wForm), 120, 160, room.door.x, room.door.y);
    waker.setDepth(room.waker.y);
    this.caption.track(w, () => (waker.active ? { x: waker.x, y: waker.y } : null));
    await this.guard(
      new Promise<void>((resolve) =>
        this.tweens.add({ targets: waker, x: room.waker.x, y: room.waker.y, duration: 900, ease: 'Sine.easeInOut', onComplete: () => resolve() }),
      ),
    );
    this.hideDoor();
    bob(this, waker, 5, 800);
    await this.speak(wakeLine(w, 'up'));

    // Up she pops: on her green (the dot over the bed), or by herself.
    await this.awaitWake();
    this.wakeUp();
    await this.wait(500);
    await this.speak(wakeLine(w, `good_${personOf(episode.hero)}`));

    // The other dad, some mornings (item 025): he comes in too, says hello
    // half the time, and is otherwise just there.
    // He walks round to the foot of her bed and stays there.
    if (episode.secondary) {
      const sp = personOf(episode.secondary);
      this.showDoor();
      this.doorOpens();
      const s2 = this.art(castArt(episode.secondary), 120, 160, room.door.x, room.door.y).setDepth(room.door.y);
      this.caption.track(sp, () => (s2.active ? { x: s2.x, y: s2.y } : null));
      this.time.delayedCall(600, () => this.hideDoor());
      await this.guard(
        new Promise<void>((resolve) =>
          this.tweens.add({ targets: s2, x: SECOND_SPOT.x, y: SECOND_SPOT.y, duration: 1600, ease: 'Sine.easeInOut', onUpdate: () => s2.setDepth(s2.y), onComplete: () => resolve() }),
        ),
      );
      bob(this, s2, 5, 820);
      if (Math.random() < 0.5) await this.speak(wakeLine(sp, 'hi'));
    }

    // The helper pops in beside the waker.
    const h = helper();
    let friend: Phaser.GameObjects.Image | null = null;
    if (personOf(h) !== w) {
      const hx = room.waker.x - 140;
      const hy = room.waker.y + 20;
      const f = this.art(castArt(h), 110, 145, hx, hy).setDepth(hy);
      friend = f;
      this.caption.track(personOf(h), () => (f.active ? { x: f.x, y: f.y } : null));
      const s = f.scale;
      popIn(this, f, s);
      burst(this, hx, hy - 70, { count: 50, colors: [0xffffff, 0xff9ad5, 0x7ad9ff, 0xffd23f] });
      sfxSummon();
      this.time.delayedCall(400, () => bob(this, f, 7, 650));
      await this.speak(wakeLine(w, `helper_${personOf(h)}`));
    }

    // The bad news: the room goes dark and the villain's mess thumps in.
    this.round = 'bedroom:news';
    flash(this, 0x220022, 450);
    sfxBoom(2);
    shake(this, 5, 600);
    const mood = applyHouseMood(this, episode.villain, { reveal: true, seed: 11, floor: this.floor });
    await Promise.all([this.speak(wakeLine(w, `bad_${episode.villain}`)), this.guard(mood.revealed)]);

    // A far-off taunt: heard, not seen.
    const taunt = villainSpec().evil.taunts[0];
    if (taunt) {
      shake(this, 2, 300);
      await this.guard(voiceBus.say(tauntLine(fighterId(episode.villain, true), taunt.key), 'bark'));
    }

    // The quest (item 025): the helper says where they will train.
    this.round = 'bedroom:quest';
    await this.speak(questSetupLine());

    await this.speak(wakeLine(w, 'door'));
    this.newsDone = true;
    this.round = 'bedroom:door';
    if (this.doorSpot) {
      this.showDoor();
      sfxSummon();
      this.doorSpot.enabled = true;
      burst(this, this.doorSpot.x, this.doorSpot.y - 100, { count: 30 });
      // A warm glow behind the door straight away (the hub's front door look).
      const light = this.add.image(0, -100, TEX.glow).setTint(0xfff1a8).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.6);
      this.doorSpot.obj.addAt(light, 0);
      this.tweens.add({ targets: light, alpha: 0.95, scale: 2.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // The grown-ups step over beside the door, off the toys: the way out.
    // The waker just below the door's sill (right of the blocks), the helper
    // between the robot and the door: no toy and no part of the door covered.
    this.stepAside(waker, { x: room.door.x, y: room.door.y + 180 });
    if (friend) this.stepAside(friend, { x: room.door.x - 140, y: room.door.y + 50 });
    this.time.delayedCall(DOOR_SPARKLE_MS, () => this.sparkleDoor());
  }

  /** Walk a grown-up to a new place (bob stopped for the walk, then again). */
  private stepAside(img: Phaser.GameObjects.Image, to: { x: number; y: number }): void {
    this.tweens.killTweensOf(img);
    this.tweens.add({
      targets: img,
      x: to.x,
      y: to.y,
      duration: 1000,
      ease: 'Sine.easeInOut',
      onUpdate: () => img.setDepth(img.y),
      onComplete: () => bob(this, img, 6, 750),
    });
  }

  /** Hold "Wake up!" until green on the bed, or WAKE_WAIT_MS. */
  private async awaitWake(): Promise<void> {
    if (!this.bedSpot) return;
    this.bedSpot.enabled = true;
    await this.guard(Promise.race([new Promise<void>((resolve) => (this.wakeResolve = resolve)), this.wait(WAKE_WAIT_MS)]));
    this.wakeResolve = null;
    this.bedSpot.enabled = false;
  }

  /** A little 💤 rising off the bed while she sleeps. */
  private floatZ(): void {
    if (!this.asleep) return;
    const { x, y } = this.room.bed;
    const z = this.add.text(x + 40 + Math.random() * 30, y - 150, '💤', { fontSize: '34px' }).setOrigin(0.5).setDepth(DEPTH.fx);
    z.setScale(0.5);
    this.tweens.add({ targets: z, y: z.y - 80, scale: 1.1, alpha: { from: 1, to: 0 }, duration: 1800, ease: 'Sine.easeOut', onComplete: () => z.destroy() });
  }

  private wakeUp(): void {
    const { x, y } = this.room.bed;
    this.asleep = false;
    this.walking = true;
    this.zzz?.remove();
    this.breathing?.remove();
    this.breathing = null;
    this.player.place(x + 170, y + 50);
    // Out of bed in her form for this episode (chef Julia when Dada Jason is
    // the ally), dressed in the burst: asleep she is in her default images.
    this.player.setArt(castArt(episode.hero));
    this.player.root.setScale(1, 0.3);
    this.tweens.add({ targets: this.player.root, scaleY: 1, duration: 260, ease: 'Back.easeOut' });
    this.player.hop();
    sfxBoing();
    burst(this, x + 170, y - 20, { count: 40 });
  }

  /** The door pops out of the wall. */
  private showDoor(): void {
    const obj = this.doorSpot?.obj;
    if (!obj) return;
    this.tweens.killTweensOf(obj);
    obj.setVisible(true);
    popIn(this, obj);
  }

  /** The door shrinks back into the wall. */
  private hideDoor(): void {
    const obj = this.doorSpot?.obj;
    if (!obj) return;
    this.tweens.killTweensOf(obj);
    this.tweens.add({ targets: obj, scale: 0, duration: 260, ease: 'Back.easeIn', onComplete: () => obj.setVisible(false) });
  }

  private doorOpens(): void {
    if (!this.doorImg) return;
    const s = this.doorImg.scale;
    squash(this, this.doorImg, s, s, 0.18, 140);
    sfxWhoosh();
  }

  /** She has not found the door for a while: it sparkles, gently. */
  private sparkleDoor(): void {
    const spot = this.doorSpot;
    if (!spot || this.leaving || spot.obj.getData('sparkling')) return;
    spot.obj.setData('sparkling', true);
    const b = spot.obj.getBounds();
    const glow = this.add
      .particles(spot.x, b.centerY, TEX.star, {
        speed: { min: 20, max: 70 },
        scale: { start: 0.8, end: 0 },
        lifespan: 900,
        frequency: 80,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-b.width / 2, -b.height / 2, b.width, b.height) } as never,
        tint: [0xffd23f, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(spot.obj.depth + 1);
    spot.obj.once(Phaser.GameObjects.Events.DESTROY, () => glow.destroy());
  }

  override update(time: number, deltaMs: number): void {
    super.update(time, deltaMs);
    if (!this.asleep) return;
    // Tucked in: she stays in bed until she is woken.
    this.player.place(this.room.bed.x - 30, this.room.bed.y - 30);
    // Any button while asleep: a puff of 💤 and a little boing (green on the
    // bed while "Wake up!" waits is the wake-up itself, not a puff).
    const waking = this.wakeResolve && !this.locked && this.controls.pressed('green');
    if (this.controls.anyFace() && !waking && this.time.now >= this.puffAt) {
      this.puffAt = this.time.now + 250;
      for (let i = 0; i < 3; i++) this.time.delayedCall(i * 120, () => this.floatZ());
      sfxBoing();
    }
  }

  protected override hint(): void {
    if (this.newsDone) void this.speak(wakeLine(personOf(wakerId()), 'door'));
  }

  protected choose(spot: Spot): void {
    if (spot.id === 'bed') {
      if (this.asleep && !this.locked) this.wakeResolve?.();
      return;
    }
    if (this.locked || this.asleep) return;
    if (spot.id === 'door') {
      if (!this.newsDone || this.leaving) return;
      this.leaving = true;
      this.doorOpens();
      sfxSelect();
      burst(this, spot.x, spot.y - 100, { count: 50 });
      this.done();
      return;
    }
    const o = spot.obj.getData('object') as BedroomObject | undefined;
    if (o) this.react(spot, o);
  }

  /** A toy doing its thing. No penalty, no reading: just fun. */
  private react(spot: Spot, o: BedroomObject): void {
    const img = spot.obj.list[0] as Phaser.GameObjects.Image | undefined;
    if (!img || spot.obj.getData('busy')) return;
    spot.obj.setData('busy', true);
    const s = img.scale;
    const free = (ms: number) =>
      this.time.delayedCall(ms, () => {
        img.setPosition(0, 0).setScale(s);
        spot.obj.setData('busy', false);
      });
    SOUND[o.sound]();
    const top = spot.y - o.h;
    switch (o.reaction) {
      case 'wiggle':
        wiggle(this, img);
        squash(this, img, s, s, 0.12, 100);
        burst(this, spot.x, top, { count: 14, colors: [0xff9ad5, 0xffffff] });
        free(500);
        break;
      case 'pop':
        this.tweens.add({ targets: img, scale: s * 1.5, duration: 140, yoyo: true, ease: 'Quad.easeOut' });
        burst(this, spot.x, top + o.h / 2, { count: 40, texture: TEX.square, colors: [0xff5ab4, 0xffd23f, 0x7ad9ff, 0x44d95a], speed: 420, gravity: 600, blend: false, life: 900 });
        free(400);
        break;
      case 'alive': {
        // It comes to life: a few hops about, squashing on each landing.
        const hops = [-28, 28, 0];
        hops.forEach((dx, i) =>
          this.time.delayedCall(i * 300, () => {
            this.tweens.add({ targets: img, x: dx, duration: 280, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: img, y: -40, duration: 140, yoyo: true, ease: 'Quad.easeOut', onComplete: () => squash(this, img, s, s, 0.2, 70) });
          }),
        );
        free(1100);
        break;
      }
      case 'bounce': {
        const heights = [70, 40, 18];
        let at = 0;
        heights.forEach((hgt) => {
          this.time.delayedCall(at, () =>
            this.tweens.add({ targets: img, y: -hgt, duration: 90 + hgt * 1.5, yoyo: true, ease: 'Quad.easeOut', onComplete: () => squash(this, img, s, s, 0.22, 60) }),
          );
          at += 2 * (90 + hgt * 1.5) + 130;
        });
        free(at + 50);
        break;
      }
      case 'glow': {
        const light = this.add.image(spot.x, top + o.h * 0.4, TEX.glow).setTint(0xfff1a8).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx);
        light.setScale(0.5);
        this.tweens.add({ targets: light, scale: 5, alpha: { from: 1, to: 0 }, duration: 900, ease: 'Cubic.easeOut', onComplete: () => light.destroy() });
        flash(this, 0xfff4c0, 160);
        burst(this, spot.x, top + o.h * 0.4, { count: 24, colors: [0xfff1a8, 0xffffff] });
        free(500);
        break;
      }
      case 'squeak':
        squash(this, img, s, s, 0.4, 110);
        burst(this, spot.x, top, { count: 10, texture: TEX.star, colors: [0xffd23f, 0xffffff], speed: 200 });
        free(400);
        break;
    }
  }
}
