import Phaser from 'phaser';

import { BattleScene } from './battle/BattleScene';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { AlarmScene } from './scenes/AlarmScene';
import { JourneyScene } from './scenes/JourneyScene';
import { BedroomScene } from './scenes/BedroomScene';
import { BootScene } from './scenes/BootScene';
import { HubScene } from './scenes/HubScene';
import { SentenceRoom } from './scenes/SentenceRoom';
import { WordMachine } from './scenes/WordMachine';
import { ChargeRoom } from './scenes/ChargeRoom';
import { BridgeRoom } from './scenes/BridgeRoom';
import { ShifterRoom } from './scenes/ShifterRoom';
import { RhymeRoom } from './scenes/RhymeRoom';
import { DebugRoom, toggleDebug } from './scenes/DebugRoom';
import { BlendPath } from './scenes/minigames/BlendPath';
import { SoundToLetter } from './scenes/minigames/SoundToLetter';
import { Spelling } from './scenes/minigames/Spelling';
import { WordToPicture } from './scenes/minigames/WordToPicture';
import { ParentScene } from './scenes/ParentScene';
import { PickScene } from './scenes/PickScene';
import { RetreatScene } from './scenes/RetreatScene';
import { TitleScene } from './scenes/TitleScene';
import { EndingScene } from './scenes/EndingScene';
import { EntryScene } from './scenes/EntryScene';
import { VictoryScene } from './scenes/VictoryScene';
import { TheEndScene } from './scenes/TheEndScene';
import { WaitScene } from './scenes/WaitScene';
import { artBank } from './art/ArtBank';
import { installTestHooks } from './testHooks';
import { installBrowserKeys } from './input/browserKeys';
import { installDadButtons } from './input/dadButtons';
import { installDadLock } from './input/dadLock';
import { installDebugKey } from './input/debugKey';
import { installGlyphMetrics } from './ui/glyphMetrics';
import { holdAudio, releaseAudio } from './audio/context';


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

// Emoji drawn as Text measured on themselves, so none is cut flat (item 085, src/ui/glyphMetrics.ts).
installGlyphMetrics(Phaser.GameObjects.Text);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0e0b1a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  // Only Boot starts on its own; Episode.ts starts everything else. The
  // parked v0.1 scenes (the one list: PARKED in src/art/needs.ts) stay
  // registered so `?scene=` can still open them; Pick is kept behind
  // `pickScreens`.
  scene: [
    BootScene,
    JourneyScene,
    TitleScene,
    PickScene,
    BedroomScene,
    EntryScene,
    HubScene,
    SentenceRoom,
    WordMachine,
    ChargeRoom,
    BridgeRoom,
    ShifterRoom,
    RhymeRoom,
    DebugRoom,
    BattleScene,
    EndingScene,
    VictoryScene,
    TheEndScene,
    ParentScene,
    AlarmScene,
    SoundToLetter,
    BlendPath,
    WordToPicture,
    RetreatScene,
    Spelling,
    WaitScene,
  ],
});

// Art loads on demand (item 065, src/art/): before any scene asks for a texture.
artBank.install(game);

installDadLock();
installDadButtons();
// Key 0: minigame debug mode (item 086), in real play too.
installDebugKey(() => toggleDebug(game));
// A hidden tab (item 080): Phaser sleeps its loop, so the voice, chimes and music
// sleep with it; a story told by lines alone no longer plays on unseen.
game.events.on(Phaser.Core.Events.HIDDEN, holdAudio);
game.events.on(Phaser.Core.Events.VISIBLE, releaseAudio);
// The browser's own keys (F1, F3, Tab...), kept from the page: src/input/browserKeys.ts.
installBrowserKeys(game);

// After the game exists: the hooks read its scenes (texts).
installTestHooks(game);
