/**
 * Loads every art asset, generates the particle textures, reads the voice
 * manifest and decodes the core group, then hands over to the title, or, with
 * `?scene=<step>`, straight into a step of a plausible episode (tests, and
 * Matt wanting to look at one thing).
 *
 *   ?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug
 *   ?scene=sound | blend | picture | spell | alarm | retreat | victory | pick | parent
 */

import Phaser from 'phaser';

import { ART_ASSETS } from '../../content/art/assets';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { group } from '../../content/voice/ids';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { episode, jumpTo, startStep, type PrepGame } from '../episode/Episode';
import { makeTextures } from '../fx/textures';
import { voiceBank } from '../voice/VoiceBank';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const bar = this.add.rectangle(GAME_WIDTH / 2 - 300, GAME_HEIGHT / 2, 4, 24, 0xffd23f).setOrigin(0, 0.5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 608, 32).setStrokeStyle(3, 0xffffff);
    this.load.on('progress', (p: number) => (bar.width = 600 * p));
    for (const a of ART_ASSETS) this.load.image(a.id, `art/${a.id}.png`);
    // A missing art file must not stop the game: it falls back to a texture made below.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`art: missing ${file.key}`));
  }

  async create(): Promise<void> {
    makeTextures(this);
    for (const a of ART_ASSETS) {
      if (!this.textures.exists(a.id)) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xff00ff, 1).fillRect(0, 0, 64, 64);
        g.generateTexture(a.id, 64, 64);
        g.destroy();
      }
    }
    await voiceBank.load();
    await voiceBank.loadGroups([group.core]);

    const q = new URLSearchParams(location.search);
    const target = q.get('scene');
    for (const key of ['hero', 'ally', 'villain'] as const) {
      const v = q.get(key);
      if (v && CHARACTER_BY_ID[v]) (episode as unknown as Record<string, string>)[key] = v;
      if (key === 'ally' && v === 'none') episode.ally = null;
    }
    const prep = q.get('prep');
    if (prep) episode.prep = prep.split(',') as PrepGame[];

    if (!target) {
      startStep(this);
      return;
    }
    const part = q.get('part') === '2' ? 2 : 1;
    if (target === 'parent') {
      this.scene.start('Parent', { back: 'Title' });
      return;
    }
    if (target === 'sound' || target === 'blend' || target === 'picture') {
      episode.prep = [target, ...(['sound', 'blend', 'picture'] as PrepGame[]).filter((p) => p !== target)];
      jumpTo(this, 'prep');
      return;
    }
    if (target === 'spell') {
      jumpTo(this, 'spell');
      return;
    }
    if (part === 2) episode.made = { gem: true, ammo: true, helper: true, item: true };
    jumpTo(this, target as never, {}, part);
  }
}
