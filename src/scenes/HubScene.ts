/**
 * The hub: the small main room of the house, and the heart of an episode.
 *
 * Part 1 (before the first battle): the helper's story scene gives her the
 * gift word (item 037, content/house/scenes.ts: a spell, a dish, a gadget, a
 * toy; its prop pops up with the word written on it, the last line trails off
 * into the word itself, "stand on the glowing spot and press green", the word
 * flies into her), then two side-room doors pop out of the wall onto
 * the sentence games. Each room she finishes hangs its prize's picture on its
 * door; when both are done the front door appears, bursts open, and out she
 * goes to battle.
 *
 * A door she cannot use yet is not there at all (Julia's first play: told to
 * find the two doors, she walked to the shut front door). Every door appears,
 * with a little reveal, at the moment it opens.
 *
 * Part 2 (after the retreat): she comes back in at the front door, the
 * narrator says they need something that scares the villain, and a secret
 * door pops out of the wall (the attic, the counter sentence). Back from it,
 * the front door appears again for the battle she wins.
 *
 * The scene is restarted each time she comes back from a side room (with
 * `from`), so everything it shows is rebuilt from the episode in `init()` and
 * `build()`; nothing is remembered on the scene object between runs.
 * Only the next useful thing has `correct: true`, so F4 walks the hub.
 */

import Phaser from 'phaser';

import { HUB, PLACE_BY_ID, SIDE_ROOM_BY_ID, hubArt } from '../../content/house/house';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import type { AbilitySpec } from '../../content/battle/types';
import { moveKey, narratorLine, villainKey } from '../../content/voice/ids';
import { sfxFanfare, sfxSelect, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { voiceBus } from '../audio/VoiceBus';
import { DEPTH, FONT_ROUNDED, GAME_WIDTH } from '../config';
import { away, enterRoom, episode, giftWord, helper, hubScene, narrator, planFor, type Slot, type Step } from '../episode/Episode';
import { helperAbilityFor } from '../rules/moves';
import { bob, burst, flash, popIn, shockwave, squash } from '../fx/juice';
import { TEX } from '../fx/textures';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { applyHouseMood } from '../world/houseMood';
import { RoomScene, type Spot } from '../world/RoomScene';

type Phase = 'intro' | 'circle' | 'doors' | 'secret' | 'front' | 'leaving';

const DOOR_W = 120;
const DOOR_H = 180;
const FRONT_W = 150;
const FRONT_H = 220;
/** The gift's prop's height on the wall (its centre), above the helper. */
const SCROLL_Y = 150;
/** A prop drawn as an emoji on a card (scenes.ts `prop` that is not an art id): the card's size. */
const CARD_W = 220;
const CARD_H = 96;

export class HubScene extends RoomScene {
  private part: 1 | 2 = 1;
  private from: Slot | null = null;
  private phase: Phase = 'intro';
  /** What yellow says again: line ids (narrator lines, or the hub scene's circle line). */
  private hintIds: string[] = [];
  private doors: Partial<Record<'door_a' | 'door_b' | 'door_counter' | 'door_front', Spot>> = {};
  private circle: Spot | null = null;
  /** The gift's prop with the word written on it (a scroll, a card). */
  private scroll: Phaser.GameObjects.Container | null = null;
  /** The hub scene's line that sends her to the circle (the box keeps off the circle for it). */
  private circleLine: string | null = null;
  /** The gift's own things (Ellie's giant bubbles, a word's picture) circling the helper while she gives it. */
  private ring: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Hub');
  }

  override init(data: { step?: Step; from?: Slot }): void {
    super.init(data);
    this.part = this.step.kind === 'house' ? this.step.part : 1;
    this.from = data.from ?? null;
    this.phase = 'intro';
    this.hintIds = [];
    this.doors = {};
    this.circle = null;
    this.scroll = null;
    this.circleLine = null;
    this.ring = [];
    // The floor reaches up to the back-wall doors.
    this.floor = new Phaser.Geom.Rectangle(80, 420, GAME_WIDTH - 160, 250);
  }

  protected background(): string {
    // The house's main room, or the quest place's (item 025).
    return hubArt(episode.place);
  }

  /** A house line, or its quest place version (no front door, no stairs up there). */
  private line(key: 'house_front' | 'house_ready' | 'secret_door'): string {
    if (!away()) return key;
    return key === 'house_front' ? 'away_front' : key === 'house_ready' ? 'away_ready' : 'away_secret';
  }

  /** A narrator line's id, in this episode's narrator's voice. */
  private nar(key: string): string {
    return narratorLine(narrator(), key);
  }

  /** `hint`: the line ids yellow says again in this phase. */
  private setPhase(phase: Phase, ...hint: string[]): void {
    this.phase = phase;
    if (hint.length) this.hintIds = hint;
    this.round = `hub:${this.part}:${phase}`;
  }

  /**
   * The gift's prop carries a word she reads: the dialogue box keeps off it,
   * at its full size (a line starting as it pops in measured it at a tenth of
   * that and covered it, item 039). Except while the circle is the thing to
   * find: the line that sends her to it, and after, the box keeps off the
   * circle (it covered the circle it was telling her to stand in).
   */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.scroll?.active) {
      out.push({ x: this.scroll.x - CARD_W / 2 - 10, y: this.scroll.y - CARD_H / 2 - 60, w: CARD_W + 20, h: CARD_H + 70, weight: 5 });
    }
    const c = this.circle;
    if (c?.obj.active && (this.phase === 'circle' || (this.circleLine && voiceBus.speaking?.id === this.circleLine))) {
      const b = c.obj.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 40 });
    }
    return out;
  }

  protected build(): void {
    // Off the spell scroll (high between doors a and b), and on a place's own
    // floor where its art's differs from the house's (item 030).
    const scroll = new Phaser.Geom.Rectangle(HUB.helper.x - 120, SCROLL_Y - 70, 240, 150);
    const place = PLACE_BY_ID[episode.place];
    const f = place?.moodFloor;
    applyHouseMood(this, episode.villain, { seed: 21, floor: f ? new Phaser.Geom.Rectangle(...f) : this.floor, avoid: [scroll], floorOnly: place?.outdoor });
    new Bag(this);
    this.round = `hub:${this.part}:intro`;

    // The helper, by the stairs.
    const friend = this.castSprite(helper(), HUB.helper.x, HUB.helper.y).setDepth(HUB.helper.y);
    bob(this, friend, 6, 750);
    this.caption.track(helper(), () => (friend.active ? { x: friend.x, y: friend.y } : null));

    this.buildCircle();
    this.buildDoors();

    const done = episode.house.done;
    if (this.part === 1) {
      if (this.from) this.placeAtDoor(this.from);
      else this.player.place(HUB.entry.x, HUB.entry.y);
      if (!episode.house.taught) {
        if (!this.from) this.arrive();
        void this.teach();
      }
      else if (this.from) void this.backFromRoom(this.from);
      else void this.offerDoors();
    } else {
      if (done.includes('counter')) {
        if (this.from) this.placeAtDoor(this.from);
        else this.player.place(HUB.doors.front.x - 90, HUB.doors.front.y + 110);
        void this.ready();
      } else {
        this.player.place(HUB.doors.front.x - 90, HUB.doors.front.y + 110);
        void this.secretDoor();
      }
    }
  }

  // -- building ---------------------------------------------------------------

  private buildCircle(): void {
    const { x, y } = HUB.circle;
    const glow = this.add.image(0, -20, TEX.glow).setTint(0x9a7aff).setBlendMode(Phaser.BlendModes.ADD).setScale(1.6, 0.7).setAlpha(0.5);
    this.tweens.add({ targets: glow, alpha: 0.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const img = this.art('prop_magic_circle', 200, 90, 0, 20);
    this.circle = this.addSpot('circle', x, y, [glow, img], null);
    this.circle.obj.setDepth(DEPTH.floor + 2);
    this.circle.enabled = false;
    // Once its word is caught the circle is spent: it is not there to draw her
    // away from the doors (item 039: it glowed on through part 2).
    if (episode.house.taught) this.circle.obj.setVisible(false);
  }

  private buildDoors(): void {
    const done = episode.house.done;
    for (const slot of ['a', 'b'] as const) {
      const pos = HUB.doors[slot];
      const room = SIDE_ROOM_BY_ID[planFor(slot).room];
      const img = this.art('prop_door', DOOR_W, DOOR_H);
      // The room's sign: a picture, never a name.
      const sign = this.plaque(room?.glyph ?? '🚪');
      const spot = this.addSpot(`door_${slot}`, pos.x, pos.y, [img, sign], null);
      spot.enabled = false;
      this.doors[`door_${slot}`] = spot;
      // A door she cannot use yet is not there at all: the side doors appear
      // once the gift word is learned (openSideDoors), and stay, prize and all.
      spot.obj.setVisible(episode.house.taught || done.includes(slot));
      if (done.includes(slot)) this.badge(spot, slot, slot === this.from);
    }

    // The secret door: only in part 2, and only once it has been found.
    const cpos = HUB.doors.counter;
    const cimg = this.art('prop_door', DOOR_W, DOOR_H);
    const csign = this.plaque(SIDE_ROOM_BY_ID[planFor('counter').room]?.glyph ?? '🧭');
    const counter = this.addSpot('door_counter', cpos.x, cpos.y, [cimg, csign], null);
    counter.enabled = false;
    counter.obj.setVisible(false);
    this.doors.door_counter = counter;
    if (this.part === 2 && done.includes('counter')) {
      counter.obj.setVisible(true);
      this.badge(counter, 'counter', this.from === 'counter');
    }

    // The front door: not there at all until the way out is open (openFront).
    const fpos = HUB.doors.front;
    // In a quest place the way out is a portal: there is no front door.
    const fimg = this.art(away() ? 'prop_portal' : 'prop_front_door', FRONT_W, FRONT_H);
    const front = this.addSpot('door_front', fpos.x, fpos.y, [fimg], null);
    front.enabled = false;
    front.obj.setVisible(false);
    this.doors.door_front = front;
  }

  /** A door's sign: its room's picture on a round plaque, gently bobbing. */
  private plaque(glyph: string): Phaser.GameObjects.Container {
    const board = this.add.circle(0, 0, 34, 0xffffff, 1).setStrokeStyle(5, 0xffd23f, 1);
    // Padded, as the gift card's: Phaser measures an emoji short and cut its top off (item 039).
    const pic = this.add.text(0, 2, glyph, { fontSize: '56px', padding: { top: 14, bottom: 6 } }).setOrigin(0.5);
    const sign = this.add.container(0, -DOOR_H - 40, [board, pic]);
    bob(this, sign, 4, 1100);
    return sign;
  }

  /** A finished room's prize hangs on its door, with a ring of gold. */
  private badge(spot: Spot, slot: Slot, fresh: boolean): void {
    const plan = planFor(slot);
    const ring = this.add.circle(0, -DOOR_H * 0.55, 40, 0xffd23f, 0.35).setStrokeStyle(5, 0xffd23f, 1);
    // Charge the Spell (item 053) fetches no word: its door wears a charged rune stone.
    const pic = this.art(plan.kind === 'charge' ? 'prop_rune_stone' : `pic_${plan.key}`, 62, 62, 0, -DOOR_H * 0.55 + 31);
    spot.obj.add([ring, pic]);
    spot.enabled = false;
    if (fresh) {
      popIn(this, ring);
      popIn(this, pic, pic.scale);
      this.time.delayedCall(250, () => {
        burst(this, spot.x, spot.y - DOOR_H * 0.55, { count: 40, texture: TEX.star, colors: [0xffd23f, 0xffffff] });
        sfxSelect();
      });
    }
  }

  private placeAtDoor(slot: Slot): void {
    const pos = HUB.doors[slot];
    this.player.place(pos.x, pos.y + 90);
  }

  // -- the flow ---------------------------------------------------------------

  /** In from the bedroom: she lands with a hop and a puff of dust. */
  private arrive(): void {
    this.time.delayedCall(200, () => {
      this.player.hop();
      burst(this, this.player.x, this.player.y, { count: 22, colors: [0xe8d8c0, 0xc8b090, 0xffffff], speed: 200, gravity: 120, blend: false });
      sfxWhoosh();
    });
  }

  /**
   * Part 1, first time in: the helper's scene (item 037). Its lines up to the
   * reveal, then the prop pops up with the word on it, and the reveal line
   * trails off into the word itself (the narrator's `gift_word_<word>`: a pad
   * word, deliberately said), then the circle line.
   */
  private async teach(): Promise<void> {
    const gift = giftWord();
    const { story, ids } = hubScene();
    const reveal = ids.lines[ids.lines.length - 1]!;
    this.circleLine = ids.circle;
    await this.wait(500);
    await this.speak(...ids.lines.slice(0, -1));

    // The prop pops up over the helper, the word written on it: high on the
    // wall between doors a and b, so it covers neither door nor its sign.
    const sx = HUB.helper.x;
    const sy = SCROLL_Y;
    const word = this.add
      .text(0, 0, gift.toUpperCase(),{ fontFamily: FONT_ROUNDED, fontSize: '54px', color: '#3a1a5a', stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.scroll = this.add.container(sx, sy, [...this.propBehind(story.prop), word]).setDepth(DEPTH.fx);
    this.scroll.setData('word', word);
    popIn(this, this.scroll);
    sfxWhoosh();
    burst(this, sx, sy, { count: 30, colors: [0xffd23f, 0xffffff, 0x9a7aff] });
    this.tweens.add({ targets: word, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.summonRing(gift);

    await this.speak(reveal, this.nar(moveKey('gift_word', gift)), ids.circle);
    if (this.circle) {
      this.circle.enabled = true;
      this.circle.correct = true;
      burst(this, this.circle.x, this.circle.y - 20, { count: 30, colors: [0x9a7aff, 0xffffff] });
    }
    this.setPhase('circle', ids.circle);
  }

  /**
   * What the gift's word is written on: a prop's art (the scroll, the sword),
   * or a white card with the scene's emoji standing on top of it.
   */
  private propBehind(prop: string): Phaser.GameObjects.GameObject[] {
    if (prop.startsWith('prop_') && this.textures.exists(prop)) {
      // The scroll is wide and flat; anything else gets the same box, the word across its middle.
      return [this.art(prop, 210, 120, 0, 60)];
    }
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
    card.lineStyle(6, 0xffd23f, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
    // Padded: Phaser measures an emoji shorter than it draws, and 🔵 lost its top (item 039).
    const glyph = this.add.text(0, -CARD_H / 2 - 4, prop.startsWith('prop_') ? '✨' : prop, { fontSize: '60px', padding: { top: 14, bottom: 6 } }).setOrigin(0.5, 0.8);
    return [card, glyph];
  }

  /**
   * If the gift has things of its own to show (Ellie's BIG, giant bubbles; a
   * sword; else the word's own effect art, a flung picture), the helper
   * summons three of them, circling her while she gives it.
   */
  private summonRing(gift: string): void {
    const own = helperAbilityFor(gift, helper());
    const ab: AbilitySpec | undefined = own?.art ? own : EFFECT_BY_WORD[gift]?.ability;
    if (!ab?.art || !this.textures.exists(ab.art)) return;
    const cx = HUB.helper.x;
    const cy = HUB.helper.y - 70;
    sfxSummon();
    this.ring = [0, 1, 2].map((i) => {
      const sw = this.add.image(cx, cy, ab.art!).setDepth(DEPTH.fx);
      // A built-in fx texture (fx_bubble) is white: the move's colours tint it.
      if (ab.art!.startsWith('fx_')) sw.setTint(i % 2 ? (ab.color2 ?? ab.color) : ab.color);
      const s = 72 / sw.height;
      sw.setScale(0);
      this.tweens.add({ targets: sw, scale: s, duration: 300, delay: i * 120, ease: 'Back.easeOut' });
      // Round and round her: a flat ellipse, swords leaning with the spin (bubbles stay upright).
      this.tweens.addCounter({
        from: 0,
        to: Math.PI * 2,
        duration: 1800,
        repeat: -1,
        onUpdate: (tw) => {
          // Let go once it flies off to her (learn), or is gone.
          if (!sw.active || sw.getData('free')) {
            tw.stop();
            return;
          }
          const a = (tw.getValue() ?? 0) + (i * Math.PI * 2) / 3;
          sw.setPosition(cx + Math.cos(a) * 88, cy + Math.sin(a) * 32);
          if (!ab.upright) sw.setRotation(a + Math.PI / 2 + 0.5);
          sw.setDepth(Math.sin(a) < 0 ? HUB.helper.y - 2 : DEPTH.fx);
        },
      });
      return sw;
    });
    burst(this, cx, cy, { count: 24, colors: [ab.color, 0xffffff, ab.color2 ?? 0xcfd8e6] });
  }

  /** Green in the magic circle: the word flies into her. */
  private async learn(): Promise<void> {
    this.setPhase('intro');
    this.locked = true;
    const circle = this.circle!;
    circle.enabled = false;
    circle.correct = null;
    this.tweens.add({ targets: circle.obj, alpha: 0, duration: 900, delay: 700, onComplete: () => circle.obj.setVisible(false) });
    sfxSummon();
    flash(this, 0xd8c8ff, 250);
    shockwave(this, circle.x, circle.y - 20, 0x9a7aff, 260, 600);
    burst(this, circle.x, circle.y - 40, { count: 90, colors: [0x9a7aff, 0xffd23f, 0xffffff, 0xff9ad5], speed: 520 });

    const scroll = this.scroll;
    const word = scroll?.getData('word') as Phaser.GameObjects.Text | undefined;
    if (scroll && word) {
      // The word leaves the scroll and flies into her.
      const flying = this.add
        .text(scroll.x + word.x, scroll.y + word.y, word.text, { fontFamily: FONT_ROUNDED, fontSize: '54px', color: '#ffd23f', stroke: '#3a1a5a', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(DEPTH.sparkles);
      word.setVisible(false);
      // The gift's things fly in with the word (swords spinning) and vanish into her.
      for (const [i, sw] of this.ring.entries()) {
        sw.setData('free', true);
        this.tweens.killTweensOf(sw);
        this.tweens.add({
          targets: sw,
          x: this.player.x + (i - 1) * 30,
          y: this.player.y - 70,
          angle: sw.angle + (sw.texture.key.startsWith('fx_') ? 0 : 720),
          scale: 0,
          duration: 800,
          delay: i * 60,
          ease: 'Cubic.easeIn',
          onComplete: () => sw.destroy(),
        });
      }
      this.ring = [];
      const trail = this.add
        .particles(0, 0, TEX.star, {
          follow: flying,
          speed: { min: 10, max: 60 },
          scale: { start: 0.7, end: 0 },
          lifespan: 500,
          frequency: 20,
          tint: [0xffd23f, 0xffffff, 0x9a7aff],
          blendMode: Phaser.BlendModes.ADD,
        })
        .setDepth(DEPTH.sparkles - 1);
      await this.guard(
        new Promise<void>((resolve) =>
          this.tweens.add({
            targets: flying,
            x: this.player.x,
            y: this.player.y - 70,
            scale: 0.3,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => resolve(),
          }),
        ),
      );
      flying.destroy();
      trail.stop();
      this.time.delayedCall(600, () => trail.destroy());
      this.tweens.add({ targets: scroll, scale: 0, alpha: 0, duration: 300, ease: 'Back.easeIn', onComplete: () => scroll.destroy() });
      this.scroll = null;
    }
    burst(this, this.player.x, this.player.y - 70, { count: 60, colors: [0xffd23f, 0xffffff, 0x9a7aff], speed: 380 });
    this.player.hop();
    sfxFanfare();
    episode.house.taught = true;
    await this.wait(500);
    // The doors light up while the helper speaks (still locked: nothing can
    // be chosen early); offerDoors finds them already open.
    this.openSideDoors();
    await this.speak(hubScene().ids.done);
    await this.offerDoors();
  }

  /** The side doors open for the rooms not yet done. */
  private async offerDoors(): Promise<void> {
    const left = this.openSideDoors();
    if (left === 0) return this.openFront(this.line('house_front'));
    await this.narrate(left === 2 ? 'house_doors' : 'house_more');
    this.setPhase('doors', this.nar(left === 2 ? 'house_doors' : 'house_more'));
  }

  /** Back from a side room: one more, or out the front. */
  private async backFromRoom(_from: Slot): Promise<void> {
    await this.wait(700);
    const left = this.openSideDoors();
    if (left === 0) return this.openFront(this.line('house_front'));
    await this.narrate('house_more');
    this.setPhase('doors', this.nar('house_more'));
  }

  /** Enable the side doors not done; returns how many. */
  private openSideDoors(): number {
    let n = 0;
    for (const slot of ['a', 'b'] as const) {
      const spot = this.doors[`door_${slot}`];
      if (!spot || episode.house.done.includes(slot)) continue;
      spot.enabled = true;
      spot.correct = true;
      if (!spot.obj.visible) {
        // First time: the door pops out of the wall.
        spot.obj.setVisible(true);
        popIn(this, spot.obj);
        sfxSummon();
      }
      if (!spot.obj.getData('glowing')) {
        spot.obj.setData('glowing', true);
        burst(this, spot.x, spot.y - DOOR_H / 2, { count: 24, colors: [0xffd23f, 0xffffff] });
        // It keeps sparkling while it waits for her (the scene is rebuilt on
        // each return, so a done door never gets one).
        this.sparkle(spot);
      }
      n++;
    }
    return n;
  }

  /** The front door appears and bursts open; she can leave. */
  private async openFront(line: string): Promise<void> {
    const front = this.doors.door_front;
    if (!front) return;
    front.obj.setVisible(true);
    popIn(this, front.obj);
    flash(this, 0xffe8a0, 200);
    shockwave(this, front.x, front.y - FRONT_H / 2, 0xffd23f, 240);
    const img = front.obj.list[0] as Phaser.GameObjects.Image;
    const s = img.scale;
    this.time.delayedCall(380, () => squash(this, img, s, s, 0.2, 160));
    const light = this.add.image(0, -FRONT_H / 2, TEX.glow).setTint(0xfff1a8).setBlendMode(Phaser.BlendModes.ADD).setScale(2.2).setAlpha(0.6);
    front.obj.addAt(light, 0);
    this.tweens.add({ targets: light, alpha: 0.95, scale: 2.6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    burst(this, front.x, front.y - FRONT_H / 2, { count: 70, speed: 480 });
    sfxWhoosh();
    sfxSelect();
    front.enabled = true;
    front.correct = true;
    await this.narrate(line);
    this.setPhase('front', this.nar(line));
  }

  /** Part 2: back from the retreat; a secret door appears. */
  private async secretDoor(): Promise<void> {
    await this.wait(600);
    await this.narrate('retreat_2', villainKey('need_counter', episode.villain));
    const door = this.doors.door_counter!;
    door.obj.setVisible(true);
    popIn(this, door.obj);
    flash(this, 0xffe8a0, 200);
    shockwave(this, door.x, door.y - DOOR_H / 2, 0xffd23f, 220);
    burst(this, door.x, door.y - DOOR_H / 2, { count: 80, speed: 500 });
    sfxSummon();
    this.sparkle(door);
    await this.narrate(this.line('secret_door'));
    door.enabled = true;
    door.correct = true;
    this.setPhase('secret', this.nar(this.line('secret_door')));
  }

  /** Part 2, back from the attic: out the front door. */
  private async ready(): Promise<void> {
    await this.wait(700);
    await this.openFront(this.line('house_ready'));
  }

  /** A gentle sparkle over a door, for as long as it stands. */
  private sparkle(spot: Spot): void {
    const glow = this.add
      .particles(spot.x, spot.y - DOOR_H / 2, TEX.star, {
        speed: { min: 20, max: 70 },
        scale: { start: 0.7, end: 0 },
        lifespan: 900,
        frequency: 90,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-DOOR_W / 2, -DOOR_H / 2, DOOR_W, DOOR_H) } as never,
        tint: [0xffd23f, 0xffffff],
        blendMode: Phaser.BlendModes.ADD,
      })
      .setDepth(spot.y + 1);
    spot.obj.once(Phaser.GameObjects.Events.DESTROY, () => glow.destroy());
  }

  // -- input ------------------------------------------------------------------

  protected override hint(): void {
    if (this.hintIds.length && this.phase !== 'leaving' && this.phase !== 'intro') void this.speak(...this.hintIds);
  }

  /** Yellow says something again only where hint() does; elsewhere it casts (free play, item 060: the hub is always open). */
  protected override hasHint(): boolean {
    return this.hintIds.length > 0 && this.phase !== 'leaving' && this.phase !== 'intro';
  }

  protected choose(spot: Spot): void {
    if (this.locked || this.phase === 'leaving' || !spot.correct) return;
    if (spot.id === 'circle' && this.phase === 'circle') {
      void this.learn();
      return;
    }
    if ((spot.id === 'door_a' || spot.id === 'door_b') && this.phase === 'doors') {
      const slot: Slot = spot.id === 'door_a' ? 'a' : 'b';
      if (episode.house.done.includes(slot)) return;
      this.goThrough(spot, () => enterRoom(this, slot));
      return;
    }
    if (spot.id === 'door_counter' && this.phase === 'secret') {
      this.goThrough(spot, () => enterRoom(this, 'counter'));
      return;
    }
    if (spot.id === 'door_front' && this.phase === 'front') {
      this.goThrough(spot, () => this.done());
    }
  }

  /** The door squashes open, a whoosh, and away. */
  private goThrough(spot: Spot, then: () => void): void {
    this.setPhase('leaving');
    this.locked = true;
    const img = spot.obj.list.find((o) => o instanceof Phaser.GameObjects.Image && o.texture.key.startsWith('prop_')) as Phaser.GameObjects.Image | undefined;
    if (img) squash(this, img, img.scale, img.scale, 0.2, 140);
    sfxSelect();
    sfxWhoosh();
    burst(this, spot.x, spot.y - DOOR_H / 2, { count: 40 });
    if (spot.id === 'door_front') {
      then();
      return;
    }
    this.fadeOutThen(then);
  }
}
