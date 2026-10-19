/**
 * The hub: the small main room of the house, and the heart of an episode.
 *
 * Part 1 (before the first battle): the helper teaches her a spell (a scroll
 * with the move word on it, "stand in the magic circle and press green", the
 * word flies into her), then two side-room doors pop out of the wall onto
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

import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { HUB, SIDE_ROOM_BY_ID, hubArt } from '../../content/house/house';
import { sfxFanfare, sfxSelect, sfxSummon, sfxWhoosh } from '../audio/sfx';
import { DEPTH, GAME_WIDTH } from '../config';
import { away, enterRoom, episode, helper, planFor, type Slot, type Step } from '../episode/Episode';
import { bob, burst, flash, popIn, shockwave, squash } from '../fx/juice';
import { TEX } from '../fx/textures';
import { spellFor } from '../rules/spell';
import { Bag } from '../ui/Bag';
import type { KeepOut } from '../ui/Caption';
import { applyHouseMood } from '../world/houseMood';
import { RoomScene, type Spot } from '../world/RoomScene';

type Phase = 'intro' | 'circle' | 'doors' | 'secret' | 'front' | 'leaving';

const FONT = '"Arial Rounded MT Bold", "Arial Black", sans-serif';
const DOOR_W = 120;
const DOOR_H = 180;
const FRONT_W = 150;
const FRONT_H = 220;

export class HubScene extends RoomScene {
  private part: 1 | 2 = 1;
  private from: Slot | null = null;
  private phase: Phase = 'intro';
  /** What yellow says again: narrator keys. */
  private hintKeys: string[] = [];
  private doors: Partial<Record<'door_a' | 'door_b' | 'door_counter' | 'door_front', Spot>> = {};
  private circle: Spot | null = null;
  private scroll: Phaser.GameObjects.Container | null = null;
  /** The spell's own things (Ellie's giant bubbles) circling the helper while she teaches it. */
  private ring: Phaser.GameObjects.Image[] = [];

  constructor() {
    super('Hub');
  }

  override init(data: { step?: Step; from?: Slot }): void {
    super.init(data);
    this.part = this.step.kind === 'house' ? this.step.part : 1;
    this.from = data.from ?? null;
    this.phase = 'intro';
    this.hintKeys = [];
    this.doors = {};
    this.circle = null;
    this.scroll = null;
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

  private setPhase(phase: Phase, ...hint: string[]): void {
    this.phase = phase;
    if (hint.length) this.hintKeys = hint;
    this.round = `hub:${this.part}:${phase}`;
  }

  /** The spell scroll is a word she reads: the dialogue box keeps off it. */
  protected override keepOut(): KeepOut[] {
    const out = super.keepOut();
    if (this.scroll?.active) {
      const b = this.scroll.getBounds();
      out.push({ x: b.x, y: b.y, w: b.width, h: b.height, weight: 5 });
    }
    return out;
  }

  protected build(): void {
    applyHouseMood(this, episode.villain, { seed: 21, floor: this.floor });
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
      // once the spell is learned (openSideDoors), and stay, prize and all.
      spot.obj.setVisible(episode.house.taught || done.includes(slot));
      if (done.includes(slot)) this.badge(spot, slot, slot === this.from);
    }

    // The secret door: only in part 2, and only once it has been found.
    const cpos = HUB.doors.counter;
    const cimg = this.art('prop_door', DOOR_W, DOOR_H);
    const csign = this.plaque(SIDE_ROOM_BY_ID[planFor('counter').room]?.glyph ?? '🗝️');
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
    const pic = this.add.text(0, 2, glyph, { fontSize: '56px' }).setOrigin(0.5);
    const sign = this.add.container(0, -DOOR_H - 40, [board, pic]);
    bob(this, sign, 4, 1100);
    return sign;
  }

  /** A finished room's prize hangs on its door, with a ring of gold. */
  private badge(spot: Spot, slot: Slot, fresh: boolean): void {
    const key = planFor(slot).key;
    const ring = this.add.circle(0, -DOOR_H * 0.55, 40, 0xffd23f, 0.35).setStrokeStyle(5, 0xffd23f, 1);
    const pic = this.art(`pic_${key}`, 62, 62, 0, -DOOR_H * 0.55 + 31);
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

  /** Part 1, first time in: the helper teaches the spell. */
  private async teach(): Promise<void> {
    episode.spell ??= spellFor(episode.hero, helper());
    const spell = episode.spell;
    await this.wait(500);
    await this.narrate('teach_1');

    // The scroll pops up over the helper, the spell written on it: high on the
    // wall between doors a and b, so it covers neither door nor its sign.
    const sx = HUB.helper.x;
    const sy = 150;
    const paper = this.art('prop_scroll', 210, 120, 0, 60);
    const word = this.add
      .text(0, 0, spell.toUpperCase(), { fontFamily: FONT, fontSize: '54px', color: '#3a1a5a', stroke: '#ffffff', strokeThickness: 6 })
      .setOrigin(0.5);
    this.scroll = this.add.container(sx, sy, [paper, word]).setDepth(DEPTH.fx);
    this.scroll.setData('word', word);
    popIn(this, this.scroll);
    sfxWhoosh();
    burst(this, sx, sy, { count: 30, colors: [0xffd23f, 0xffffff, 0x9a7aff] });
    this.tweens.add({ targets: word, scale: 1.12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.summonRing(spell);

    await this.narrate(`teach_word_${spell}`, 'teach_circle');
    if (this.circle) {
      this.circle.enabled = true;
      this.circle.correct = true;
      burst(this, this.circle.x, this.circle.y - 20, { count: 30, colors: [0x9a7aff, 0xffffff] });
    }
    this.setPhase('circle', 'teach_circle');
  }

  /**
   * If the spell is a move with its own art (Ellie's BIG, giant bubbles; a
   * sword), the helper summons three of them, circling her while she teaches it.
   */
  private summonRing(spell: string): void {
    const ab = CHARACTER_BY_ID[helper()]?.good.abilities.find((a) => a.word === spell);
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
    sfxSummon();
    flash(this, 0xd8c8ff, 250);
    shockwave(this, circle.x, circle.y - 20, 0x9a7aff, 260, 600);
    burst(this, circle.x, circle.y - 40, { count: 90, colors: [0x9a7aff, 0xffd23f, 0xffffff, 0xff9ad5], speed: 520 });

    const scroll = this.scroll;
    const word = scroll?.getData('word') as Phaser.GameObjects.Text | undefined;
    if (scroll && word) {
      // The word leaves the scroll and flies into her.
      const flying = this.add
        .text(scroll.x + word.x, scroll.y + word.y, word.text, { fontFamily: FONT, fontSize: '54px', color: '#ffd23f', stroke: '#3a1a5a', strokeThickness: 8 })
        .setOrigin(0.5)
        .setDepth(DEPTH.sparkles);
      word.setVisible(false);
      // The spell's things fly in with the word (swords spinning) and vanish into her.
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
    await this.narrate('teach_done');
    await this.offerDoors();
  }

  /** The side doors open for the rooms not yet done. */
  private async offerDoors(): Promise<void> {
    const left = this.openSideDoors();
    if (left === 0) return this.openFront(this.line('house_front'));
    await this.narrate(left === 2 ? 'house_doors' : 'house_more');
    this.setPhase('doors', left === 2 ? 'house_doors' : 'house_more');
  }

  /** Back from a side room: one more, or out the front. */
  private async backFromRoom(_from: Slot): Promise<void> {
    await this.wait(700);
    const left = this.openSideDoors();
    if (left === 0) return this.openFront(this.line('house_front'));
    await this.narrate('house_more');
    this.setPhase('doors', 'house_more');
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
    this.setPhase('front', line);
  }

  /** Part 2: back from the retreat; a secret door appears. */
  private async secretDoor(): Promise<void> {
    await this.wait(600);
    await this.narrate('retreat_2', `need_counter_${episode.villain}`);
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
    this.setPhase('secret', this.line('secret_door'));
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
    if (this.hintKeys.length && this.phase !== 'leaving' && this.phase !== 'intro') void this.narrate(...this.hintKeys);
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
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(320, then);
  }
}
