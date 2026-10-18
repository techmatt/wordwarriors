import Phaser from 'phaser';

import { BattleScene } from './battle/BattleScene';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { AlarmScene } from './scenes/AlarmScene';
import { JourneyScene } from './scenes/JourneyScene';
import { BootScene } from './scenes/BootScene';
import { BlendPath } from './scenes/minigames/BlendPath';
import { SoundToLetter } from './scenes/minigames/SoundToLetter';
import { Spelling } from './scenes/minigames/Spelling';
import { WordToPicture } from './scenes/minigames/WordToPicture';
import { ParentScene } from './scenes/ParentScene';
import { PickScene } from './scenes/PickScene';
import { RetreatScene } from './scenes/RetreatScene';
import { TitleScene } from './scenes/TitleScene';
import { VictoryScene } from './scenes/VictoryScene';
import { installTestHooks } from './testHooks';

installTestHooks();

/**
 * A safety net for an unattended four-year-old. Phaser runs each frame from a
 * requestAnimationFrame callback that only schedules the next frame after the
 * current one returns, so one exception anywhere in a frame stops the game
 * for good (a frozen screen, seen during review on 2026-10-18). Each frame is
 * wrapped so the loop survives; the error is rethrown on its own tick so it is
 * still reported (and still fails every test that collects page errors).
 */
const step = Phaser.Game.prototype.step;
let reported = 0;
Phaser.Game.prototype.step = function guardedStep(this: Phaser.Game, time: number, delta: number) {
  try {
    step.call(this, time, delta);
  } catch (error) {
    // Report the first few; an error repeating every frame must not flood.
    if (reported++ < 10) {
      window.setTimeout(() => {
        throw error;
      });
    }
  }
};

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e0b1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  // Only Boot starts on its own; Episode.ts starts everything else.
  scene: [BootScene, JourneyScene, TitleScene, PickScene, AlarmScene, SoundToLetter, BlendPath, WordToPicture, BattleScene, RetreatScene, Spelling, VictoryScene, ParentScene],
});
