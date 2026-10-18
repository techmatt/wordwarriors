import Phaser from 'phaser';

import { BattleScene } from './battle/BattleScene';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { AlarmScene } from './scenes/AlarmScene';
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

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e0b1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  // Only Boot starts on its own; Episode.ts starts everything else.
  scene: [BootScene, TitleScene, PickScene, AlarmScene, SoundToLetter, BlendPath, WordToPicture, BattleScene, RetreatScene, Spelling, VictoryScene, ParentScene],
});
