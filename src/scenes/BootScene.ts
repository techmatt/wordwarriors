/**
 * Loads every art asset, generates the particle textures, reads the voice
 * manifest and decodes the core group, then hands over to the title, or, with
 * `?scene=<step>`, straight into a step of a plausible episode (tests, and
 * Matt wanting to look at one thing).
 *
 *   ?scene=bedroom
 *   ?scene=house&part=2                 (the hub; part 2 has the attic open)
 *   ?scene=room&slot=a|b|counter        (a side room; counter is the attic, part 2)
 *   ?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug   (ally=none for no ally)
 *   ?scene=victory&read=cat,sun,julia   (the words the recap shows)
 *   ?scene=pick | parent
 *   ?fetched=net,fan                    (the battle items fetched; default net,fan)
 *   parked v0.1 games: ?scene=sound | blend | picture | spell | alarm | retreat
 *
 * Later steps get the episode they would have had by then: the spell learned
 * in the hub, the earlier rooms done, the fetched items in the bag.
 */

import Phaser from 'phaser';

import { ART_ASSETS } from '../../content/art/assets';
import { CHARACTER_BY_ID } from '../../content/battle/roster';
import { group } from '../../content/voice/ids';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { enterRoom, episode, episodeGroups, helper, jumpTo, planFor, startStep, steps, type PrepGame, type Slot } from '../episode/Episode';
import { makeTextures } from '../fx/textures';
import { spellFor } from '../rules/spell';
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
    const read = q.get('read');
    if (read) episode.read = read.split(',');
    const prep = q.get('prep');
    if (prep) episode.prep = prep.split(',') as PrepGame[];

    if (!target) {
      startStep(this);
      return;
    }
    let part: 1 | 2 = q.get('part') === '2' ? 2 : 1;
    const fetched = q.get('fetched');

    // The episode as it would be by a given point.
    const learned = (): void => {
      episode.house.taught = true;
      episode.spell = spellFor(episode.hero, helper());
    };
    const fetchedAll = (): void => {
      episode.fetched = fetched ? fetched.split(',') : ['net', 'fan'];
      episode.house.done = ['a', 'b'];
    };

    if (target === 'parent') {
      this.scene.start('Parent', { back: 'Title' });
      return;
    }
    if (target === 'sound' || target === 'blend' || target === 'picture') {
      episode.prep = [target, ...(['sound', 'blend', 'picture'] as PrepGame[]).filter((p) => p !== target)];
      jumpTo(this, 'prep');
      return;
    }
    if (target === 'room') {
      const slot: Slot = q.get('slot') === 'b' ? 'b' : q.get('slot') === 'counter' ? 'counter' : 'a';
      part = slot === 'counter' ? 2 : 1;
      learned();
      if (slot === 'counter') fetchedAll();
      else if (slot === 'b') {
        episode.house.done = ['a'];
        episode.fetched = fetched ? fetched.split(',') : [planFor('a').sentence.key];
      }
      // The house step of the right part, then straight through its door.
      episode.stepIndex = steps().findIndex((s) => s.kind === 'house' && s.part === part);
      void voiceBank.loadGroups(episodeGroups());
      enterRoom(this, slot);
      return;
    }
    if (target === 'house' && part === 2) {
      learned();
      fetchedAll();
    }
    if (target === 'battle' || target === 'victory') {
      learned();
      fetchedAll();
      if (part === 2 || target === 'victory') {
        episode.house.done = ['a', 'b', 'counter'];
        episode.made.item = true;
      }
    }
    jumpTo(this, target as never, {}, part);
  }
}
