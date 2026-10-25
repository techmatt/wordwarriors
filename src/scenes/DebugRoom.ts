/**
 * Minigame debug mode's room (item 086, src/episode/debug.ts): the room key 0
 * was pressed in, as it looks, with its own things gone. One pedestal per
 * minigame in the pool and the room's door out, open. Green at a pedestal
 * plays its game in the debug sandbox; back from it, finished, the pedestal
 * carries a check mark. Green at the door leaves as if every game were done
 * (debug off): a side room's back to the hub, the hub's and the warm-up's on
 * to the next step. Key 0 again brings the room back as it was.
 *
 * Key 0's whole meaning, dad lock or not, is `toggleDebug` (src/input/debugKey.ts).
 */

import Phaser from 'phaser';

import { sfxSelect } from '../audio/sfx';
import { startScene } from '../art/gate';
import { FONT_HEAVY } from '../config';
import { DEBUG_GAMES, beginRun, debugMode, stopDebug } from '../episode/debug';
import { advance, backToHub, currentStep } from '../episode/Episode';
import { popIn } from '../fx/juice';
import type { RoomInfo } from '../hookState';
import { RoomScene, type Spot } from '../world/RoomScene';

export class DebugRoom extends RoomScene {
  constructor() {
    super('Debug');
  }

  protected background(): string {
    return debugMode.origin?.bg ?? 'room_hub';
  }

  protected override playerArt(): string {
    return debugMode.origin?.art ?? super.playerArt();
  }

  override init(data: object): void {
    super.init({ step: currentStep(), ...data });
    const f = debugMode.origin?.floor;
    if (f) this.floor = new Phaser.Geom.Rectangle(...f);
  }

  protected build(): void {
    this.round = 'debug';
    const f = this.floor;
    // The pedestals along the floor's back half, the door at its right end.
    const y = f.y + Math.min(150, f.height * 0.45);
    const gap = (f.width - 220) / DEBUG_GAMES.length;
    DEBUG_GAMES.forEach((g, i) => {
      // Each pedestal's glyph and name are its `MINIGAMES` entry's (src/rules/minigames.ts).
      const done = debugMode.done.includes(g.id);
      const base = this.art('prop_pedestal', 150, 90);
      const glyph = this.add.text(0, -120, g.glyph, { fontSize: '64px' }).setOrigin(0.5);
      const name = this.add.text(0, 24, g.name, { fontFamily: FONT_HEAVY, fontSize: '22px', color: '#ffffff', stroke: '#1a1030', strokeThickness: 6 }).setOrigin(0.5, 0);
      const parts: Phaser.GameObjects.GameObject[] = [base, glyph, name];
      if (done) parts.push(this.add.text(52, -150, '✔', { fontFamily: FONT_HEAVY, fontSize: '54px', color: '#44d95a', stroke: '#0e3a14', strokeThickness: 8 }).setOrigin(0.5).setName('check'));
      this.addSpot(`debug:${g.id}`, f.x + 110 + gap * (i + 0.5), y, parts);
    });
    this.addSpot('debug:door', f.right - 70, y - 10, [this.art('prop_door', 120, 165), this.add.text(0, 8, '➜', { fontSize: '44px', color: '#ffd23f', stroke: '#1a1030', strokeThickness: 6 }).setOrigin(0.5, 0)]);
    for (const s of this.spots) popIn(this, s.obj);
  }

  protected override hasHint(): boolean {
    return false;
  }

  protected choose(spot: Spot): void {
    this.locked = true;
    sfxSelect();
    if (spot.id === 'debug:door') {
      // Debug stays on through the fade (item 089: F9 in it came back to a debug room with debug off).
      this.fadeOutThen(() => {
        const origin = stopDebug();
        if (origin?.slot) backToHub(this, origin.slot);
        else advance(this);
      });
      return;
    }
    const { scene, slot } = beginRun(spot.id.slice('debug:'.length));
    this.fadeOutThen(() => startScene(this, scene, { step: currentStep(), slot }));
  }

  /** F9's grown-ups page comes back here. */
  protected override sceneData(): object {
    return {};
  }

  protected override extraHooks(): Partial<RoomInfo> {
    return { debug: { done: [...debugMode.done], games: DEBUG_GAMES.map((g) => g.id) } };
  }
}
