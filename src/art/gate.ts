/**
 * The art gate (item 065): every scene starts through `startScene`, which
 * starts it at once when its art (`artFor`) is loaded and otherwise holds it
 * behind the Wait scene, a short friendly transition, until it is. No scene
 * shows a gap because loading lagged.
 *
 * Once a scene has opened, the art of the scenes that can follow it loads in
 * the background (`prefetch`), so the gate is nearly always open by the time
 * she gets there.
 */

import Phaser from 'phaser';

import { ROSTER } from '../../content/battle/roster';
import { charArt } from '../../content/art/assets';
import { currentStep, episode, planFor, steps, type Slot, type Step } from '../episode/Episode';
import { voiceBank } from '../voice/VoiceBank';
import { artBank } from './ArtBank';
import { artFor } from './needs';

/** The scene a step opens on (a copy of Episode's own table, kept here to avoid a cycle at load). */
function sceneOf(step: Step | undefined): string | null {
  if (!step) return null;
  const map: Partial<Record<Step['kind'], string>> = { title: 'Title', bedroom: 'Bedroom', grab: 'Entry', house: 'Hub', battle: 'Battle', victory: 'Ending', pick: 'Pick' };
  return map[step.kind] ?? null;
}

/** The art of the scenes that may come after `key`, for the background queue. */
function upcoming(key: string): string[] {
  const next = steps()[episode.stepIndex + 1];
  const out: string[] = [];
  const add = (scene: string | null, draw = false) => {
    if (scene) out.push(...artFor(scene, draw));
  };
  switch (key) {
    case 'Title':
      add(sceneOf(next));
      add('Bedroom');
      // The duel under the logo picks from what has loaded (TitleScene): every form, in the background.
      out.push(...ROSTER.flatMap((c) => [charArt(c.id, false), charArt(c.id, true)]));
      break;
    case 'Bedroom':
      // The warm-up's word and pictures are drawn here, early: the bedroom has no
      // reading, so her progress is what the hall would have drawn from.
      add(sceneOf(next), next?.kind === 'grab');
      break;
    case 'Journey':
      add(sceneOf(currentStep()));
      break;
    case 'Hub':
      for (const slot of ['a', 'b', 'counter'] as Slot[]) if (episode.house.plan) add(planFor(slot).scene);
      add('Battle');
      add('Journey');
      break;
    case 'Battle':
      // After the second battle comes the victory scene: drawn here, early, so its art can load during the fight.
      add(next?.kind === 'victory' ? 'Ending' : sceneOf(next), next?.kind === 'victory');
      add('Journey');
      break;
    case 'Ending':
      add('Victory');
      break;
    case 'Victory':
      add('Title');
      break;
    case 'Pick':
      add(sceneOf(next));
      break;
    default:
      if (key.endsWith('Room') || key === 'WordMachine') add('Hub');
      else add(sceneOf(next));
  }
  return out;
}

/** Start scene `key` from `from` once its art is loaded; meanwhile the Wait scene shows. */
export function startScene(from: Phaser.Scene, key: string, data?: object): void {
  const missing = artBank.missing(artFor(key, true));
  const target = from.game.scene.getScene(key);
  target?.events.once(Phaser.Scenes.Events.CREATE, () => artBank.prefetch(upcoming(key)));
  if (!missing.length) {
    from.scene.start(key, data);
    return;
  }
  // Nothing is said while it waits: the art goes first, the voice queue after (VoiceBank.pauseWhile).
  voiceBank.pauseWhile(artBank.ensure(missing));
  from.scene.start('Wait', { key, data, ids: missing });
}
