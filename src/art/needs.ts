/**
 * Which art each scene draws (item 065), from the episode as it stands: the
 * gate (`src/art/gate.ts`) loads it before the scene starts, and the scene
 * before it prefetches it.
 *
 * A scene's words come from plans made on first need (the warm-up's grab, the
 * house plan, the move plan, the fight style, the victory scene). `draw: true`
 * (the gate, the moment the scene would have drawn them itself) makes them;
 * `draw: false` (a prefetch, while an earlier scene is still playing and may
 * still change her progress) uses only what is already drawn, so prefetching
 * never changes what she gets.
 *
 * Plans are read by walking them: every string in a plan that names art, or
 * is a word with a picture, or a character with a face, counts. Over-asking
 * costs a picture; under-asking would show a gap, which the safety net in
 * `ArtBank` reports (`art: not ready`).
 */

import { ART_ASSETS, ART_BY_ID, charArt } from '../../content/art/assets';
import { CHARACTER_BY_ID, MINIONS, ROSTER, personOf } from '../../content/battle/roster';
import { fightPropArt } from '../../content/battle/fights';
import { STORY_BY_ID } from '../../content/battle/stories/index';
import { storySplashArt } from '../../content/battle/stories/types';
import { ENDING_BY_ID, endingArt, endingPropArt } from '../../content/house/endings';
import { BEDROOMS, hubArt } from '../../content/house/house';
import { debugMode } from '../episode/debug';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
import { runeArt } from '../../content/phonics/runes';
import type { RoomPlan } from '../rules/sentences';
import {
  castArt,
  castFace,
  counterArt,
  counterWord,
  drawEnding,
  episode,
  fightStyle,
  giftWord,
  grabPlan,
  helper,
  housePlan,
  hubScene,
  movePlan,
  villainSpec,
  waker,
} from '../episode/Episode';
import { endingPeople } from '../rules/endings';
import { helperAbilityFor } from '../rules/moves';

const family = (prefix: string) => ART_ASSETS.filter((a) => a.id.startsWith(prefix)).map((a) => a.id);

/** Every character a scene of this episode may show, as each image they may appear as. */
export function castSet(): string[] {
  const ids = [episode.hero, episode.ally, episode.villain, episode.primary, episode.secondary, helper(), waker(), ...(episode.ending ? endingPeople(episode) : [])];
  const out: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    out.push(castArt(id), castArt(id, true), castFace(id), charArt(id, false), charArt(id, true), `face_${id}`, `face_${personOf(id)}`);
  }
  return out;
}

/** What every scene inside an episode needs: the cast, the props (small, shared by every scene), the villain's mess and the bag. */
function episodeSet(): string[] {
  const v = CHARACTER_BY_ID[episode.villain];
  return [
    ...castSet(),
    ...family('prop_'),
    ...(v?.house?.decals ?? []).map((d) => `decal_${d.id}`),
    ...artIn(episode.fetched),
    ...(episode.made.item ? [counterArt()] : []),
  ];
}

/**
 * The art named anywhere in `value` (a plan, a spec, a list of words): art ids
 * themselves, words with a picture, character ids with their faces, side rooms, counter items.
 */
function artIn(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6 || value === null || value === undefined) return out;
  if (typeof value === 'string') {
    for (const id of [value, `pic_${value}`, `item_${value}`, `room_side_${value}`, `minion_${value}`]) if (ART_BY_ID[id]) out.push(id);
    if (CHARACTER_BY_ID[value]) out.push(castFace(value), castArt(value), `face_${value}`);
    return out;
  }
  if (Array.isArray(value)) for (const v of value) artIn(v, depth + 1, out);
  else if (typeof value === 'object') for (const v of Object.values(value)) artIn(v, depth + 1, out);
  return out;
}

/**
 * Charge the Spell's picture letters (item 103): its room's runes, for the
 * house (the room, and the hub's door badge). Split from the battle's in item
 * 122: the house asked for the charged runes too, but they are always the
 * plan's (or a `?charged=` jump straight to the battle, `chargedRunes`).
 */
function planRunes(plan: readonly RoomPlan[]): string[] {
  return plan.flatMap((p) => (p.kind === 'charge' ? p.charge.runes : [])).map(runeArt);
}

/** The runes charged for the battle, which fire there. */
function chargedRunes(): string[] {
  return (episode.charged?.sounds ?? []).map(runeArt);
}

/** The house steps' art: the hub, its place, every side room's plan, the gift word's move. */
function houseSet(draw: boolean): string[] {
  const out = [hubArt(episode.place)];
  const plan = draw ? housePlan() : episode.house.plan;
  if (plan) out.push(...artIn(plan), ...planRunes(plan), counterArt(), `pic_${counterWord()}`);
  const gift = draw ? giftWord() : episode.gift;
  if (gift) {
    out.push(...artIn(gift));
    const ab = helperAbilityFor(gift, helper())?.art ?? EFFECT_BY_WORD[gift]?.ability.art;
    if (ab) out.push(ab);
    out.push(...artIn(hubScene().story));
  }
  return out;
}

/** A fighter's abilities and summons: everything in their good and evil specs that names art. */
function fighterArt(id: string | null): string[] {
  const c = id ? CHARACTER_BY_ID[id] : undefined;
  return c ? artIn([c.good, c.evil, c.counter]) : [];
}

function battleSet(draw: boolean): string[] {
  const out: string[] = [];
  if (draw || episode.fight) {
    const fight = fightStyle();
    out.push(`arena_${fight.arena ?? villainSpec().arena}`, ...artIn(fight), ...(fight.props ?? []).map((p) => fightPropArt(p.id)));
    // A story fight (item 107): its big moves' splashes, and the dad who joins the fight.
    const story = STORY_BY_ID[fight.story ?? ''];
    if (story) out.push(...story.splashes.map((sp) => storySplashArt(sp.id)), ...fighterArt(episode.primary));
  } else out.push(`arena_${villainSpec().arena}`);
  out.push(...family('minion_'), ...Object.values(MINIONS).map((m) => `minion_${m.id}`));
  for (const id of [episode.hero, episode.ally, episode.villain, helper()]) out.push(...fighterArt(id));
  const moves = draw ? movePlan() : episode.moves;
  const moveArt = moves ? artIn(moves) : [];
  out.push(...moveArt);
  // Each battle item's and move word's effect art (a move's art id is `pic_<word>`).
  for (const w of new Set([...moveArt, ...episode.fetched, ...(episode.gift ? [episode.gift] : [])])) {
    const e = EFFECT_BY_WORD[w.replace(/^pic_/, '')];
    if (e) out.push(...artIn(e));
  }
  if (episode.house.plan) out.push(counterArt(), `pic_${counterWord()}`);
  out.push(...chargedRunes());
  return out;
}

function endingSet(draw: boolean): string[] {
  const id = draw ? drawEnding() : episode.ending;
  if (!id) return [];
  const e = ENDING_BY_ID[id];
  if (!e) return [];
  return [endingArt(e.id), ...e.props.map((p) => endingPropArt(p.id)), ...endingPeople(episode).map((p) => castArt(p))];
}

/**
 * The parked v0.1 games' scenes, the one list (Pick is not one: it is live
 * behind `pickScreens` and has its own art). They draw their rounds as they
 * open, from every picture: they wait for the lot.
 */
const PARKED = new Set(['SoundToLetter', 'BlendPath', 'WordToPicture', 'Spelling', 'Alarm', 'Retreat']);

/** A parked scene: its `artFor` is every picture, so nothing prefetches it (src/art/gate.ts). */
export function isParkedScene(key: string): boolean {
  return PARKED.has(key);
}

/**
 * The art scene `key` draws, for the episode as it is. `draw`: make the plans
 * it needs (the gate) or use only those already made (a prefetch).
 */
export function artFor(key: string, draw: boolean): string[] {
  const out: string[] = [];
  switch (key) {
    case 'Boot':
    case 'Parent':
    case 'Wait':
      return [];
    case 'Title':
      // The parade is every person, good and evil by turns; the duel picks from what has loaded (TitleScene).
      return ['room_title', ...ROSTER.filter((c) => !c.person).flatMap((c) => [charArt(c.id, false), charArt(c.id, true)])];
    case 'Pick':
      // Every person's card, good or evil, and the surprise villain (any form).
      out.push('room_pick', ...ROSTER.flatMap((c) => [charArt(c.id, false), charArt(c.id, true)]));
      break;
    case 'Journey':
      out.push('room_title');
      break;
    case 'Bedroom': {
      const room = BEDROOMS[0]!;
      out.push(`room_bedroom_${room.id}`, ...room.objects.map((o) => `obj_${o.id}`));
      break;
    }
    case 'Entry':
      out.push('room_entry');
      if (draw || episode.grab) out.push(...artIn(grabPlan()));
      break;
    case 'Hub':
    case 'SentenceRoom':
    case 'WordMachine':
    case 'ChargeRoom':
    case 'BridgeRoom':
    case 'ShifterRoom':
      out.push(...houseSet(draw));
      break;
    case 'Debug':
      // Minigame debug mode (item 086): the room it was turned on in, its pedestals and door.
      out.push(...(debugMode.origin ? [debugMode.origin.bg, debugMode.origin.art] : []), 'prop_pedestal', 'prop_door');
      break;
    case 'Battle':
      out.push(...battleSet(draw));
      break;
    case 'Ending':
      out.push(...endingSet(draw));
      break;
    case 'Victory':
      out.push('room_victory', ...artIn(episode.read), counterArt());
      break;
    case 'TheEnd':
      // One of this episode's own places (item 085): its hub, home or the quest place; the heroes come with the cast.
      out.push(hubArt(episode.place));
      break;
    default:
      // Dev jumps only (`?scene=`): every picture, as boot used to load.
      if (PARKED.has(key)) out.push(...ART_ASSETS.map((a) => a.id));
  }
  out.push(...episodeSet());
  return [...new Set(out)].filter((id) => ART_BY_ID[id]);
}
