/**
 * Minigame debug mode's room (item 086, src/episode/debug.ts): the room key 0
 * was pressed in, as it looks, with its own things gone. One pedestal per
 * minigame in the pool and the room's door out, open. Green at a pedestal
 * plays its game in the debug sandbox; back from it, finished, the pedestal
 * carries a check mark. Green at the door leaves as if every game were done
 * (debug off): a side room's back to the hub, the hub's and the warm-up's on
 * to the next step. Key 0 again brings the room back as it was.
 *
 * `toggleDebug` is key 0's whole meaning (src/input/debugKey.ts), dad lock or not.
 */

import Phaser from 'phaser';

import { sfxSelect } from '../audio/sfx';
import { voiceBus } from '../audio/VoiceBus';
import { startScene } from '../art/gate';
import { DEBUG_GAMES, DEBUG_ROOMS, beginRun, debugMode, startDebug, stopDebug } from '../episode/debug';
import { advance, backToHub, currentStep, debugBack } from '../episode/Episode';
import { popIn } from '../fx/juice';
import { isLeaving } from '../fx/sceneGen';
import type { RoomInfo } from '../hookState';
import { RoomScene, type Spot } from '../world/RoomScene';

/** How each game's pedestal is marked: a glyph and its name, upper case like all game text. */
const LOOK: Record<string, { glyph: string; name: string }> = {
  sentence: { glyph: '📜', name: 'SENTENCE' },
  word_machine: { glyph: '⚙️', name: 'MACHINE' },
  charge: { glyph: '✨', name: 'CHARGE' },
  bridge: { glyph: '🌉', name: 'BRIDGE' },
};

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
      const look = LOOK[g.id] ?? { glyph: '🎲', name: g.id.toUpperCase() };
      const done = debugMode.done.includes(g.id);
      const base = this.art('prop_pedestal', 150, 90);
      const glyph = this.add.text(0, -120, look.glyph, { fontSize: '64px' }).setOrigin(0.5);
      const name = this.add.text(0, 24, look.name, { fontFamily: 'Arial Black', fontSize: '22px', color: '#ffffff', stroke: '#1a1030', strokeThickness: 6 }).setOrigin(0.5, 0);
      const parts: Phaser.GameObjects.GameObject[] = [base, glyph, name];
      if (done) parts.push(this.add.text(52, -150, '✔', { fontFamily: 'Arial Black', fontSize: '54px', color: '#44d95a', stroke: '#0e3a14', strokeThickness: 8 }).setOrigin(0.5).setName('check'));
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

/**
 * Key 0: in a game room, debug on (the room becomes the debug room); in the
 * debug room, off (the room comes back); in a game played from it, back to
 * the debug room unfinished. Anywhere else nothing.
 */
export function toggleDebug(game: Phaser.Game): boolean {
  // A press while the last one's scene change is still landing (the old room still runs for a frame) is ignored.
  if (switching) return true;
  const scene = game.scene.getScenes(true).find((s) => s instanceof RoomScene && (s.scene.key === 'Debug' || DEBUG_ROOMS.includes(s.scene.key))) as RoomScene | undefined;
  if (!scene) return false;
  // A room already on its way out (its fade, or a change queued for Phaser's next step) is left be,
  // as F2 and F9 leave it (item 092): acting on it ran two scene changes, or took the wrong room as the origin.
  if (scene.fadingOut || isLeaving(scene)) return true;
  voiceBus.hush();
  const go = (key: string, run: () => void) => {
    switching = true;
    game.scene.getScene(key)?.events.once(Phaser.Scenes.Events.CREATE, () => (switching = false));
    // Never stuck: a change held behind the Wait scene still frees the key in a while.
    window.setTimeout(() => (switching = false), 3000);
    run();
  };
  if (debugMode.run) {
    go('Debug', () => debugBack(scene, false));
    return true;
  }
  if (scene.scene.key === 'Debug') {
    const origin = stopDebug();
    if (origin) go(origin.key, () => startScene(scene, origin.key, origin.data));
    return true;
  }
  startDebug(scene.debugOrigin());
  go('Debug', () => startScene(scene, 'Debug'));
  return true;
}

/** A key-0 scene change under way (cleared as its scene is created). */
let switching = false;
