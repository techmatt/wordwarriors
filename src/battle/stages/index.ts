/** Each fight style's kind to its staging (item 031). */

import type { FightKind } from '../../../content/battle/fights';
import { ClashStage } from './clash';
import { CookoffStage } from './cookoff';
import { RaceStage } from './race';
import { BaseStage, type FightStage, type StageHost } from './stage';
import { StoryStage } from './story';
import { TugStage } from './tug';

export function makeStage(kind: FightKind, host: StageHost): FightStage {
  switch (kind) {
    case 'race':
      return new RaceStage(host);
    case 'tug':
      return new TugStage(host);
    case 'clash':
      return new ClashStage(host);
    case 'cookoff':
      return new CookoffStage(host);
    case 'story':
      return new StoryStage(host);
    default:
      return new BaseStage(host);
  }
}
