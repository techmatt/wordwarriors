/**
 * Minigame debug mode's key (item 086, src/episode/debug.ts): key 0 (or
 * numpad 0) toggles it in a game room, in real play as in dev builds. Like
 * dad lock it is a capture-phase window listener, so dad lock never blocks
 * it; it is consumed only where it did something.
 *
 * While debug is on a small DEBUG tag sits in the canvas's top-left corner (the
 * dad-lock badge has the bottom-left, Dad's cue the bottom-right). It is a DOM
 * element like theirs: for Matt, never game text.
 *
 * `toggleDebug` is what the key does (the Debug scene itself: src/scenes/DebugRoom.ts).
 */

import Phaser from 'phaser';

import { startScene } from '../art/gate';
import { FONT_HEAVY } from '../config';
import { DEBUG_ROOMS, debugMode, onDebugChange, startDebug, stopDebug } from '../episode/debug';
import { debugBack } from '../episode/Episode';
import { isLeaving } from '../fx/sceneGen';
import { CornerTag } from '../ui/cornerTag';
import { voiceBus } from '../voice/VoiceBus';
import { RoomScene } from '../world/RoomScene';

const tag = new CornerTag(
  'debug-tag',
  'top-left',
  {
    padding: '2px 8px',
    borderRadius: '8px',
    background: 'rgba(20, 14, 40, 0.8)',
    border: '2px solid #ff3d7a',
    color: '#ff3d7a',
    font: `bold 13px ${FONT_HEAVY}`,
  },
  'DEBUG',
);

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

/** Installed once, from main.ts; `toggle` answers whether the press meant anything here. */
export function installDebugKey(toggle: () => boolean): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.code !== 'Digit0' && e.code !== 'Numpad0') return;
      if (e.repeat || !toggle()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
    true,
  );
  onDebugChange((on) => (on ? tag.show() : tag.hide()));
}
