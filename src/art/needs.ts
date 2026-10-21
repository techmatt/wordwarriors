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
import { ENDING_BY_ID, endingArt, endingPropArt } from '../../content/house/endings';
import { BEDROOMS, hubArt } from '../../content/house/house';
import { EFFECT_BY_WORD } from '../../content/phonics/effects';
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
    ...words(episode.fetched),
    ...(episode.made.item ? [counterArt()] : []),
  ];
}

/**
 * The art named anywhere in `value` (a plan, a spec, a list of words): art ids
 * themselves, words with a picture, character ids with their faces, side rooms, counter items.
 */
export function words(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 6 || value === null || value === undefined) return out;
  if (typeof value === 'string') {
    for (const id of [value, `pic_${value}`, `item_${value}`, `room_side_${value}`, `minion_${value}`]) if (ART_BY_ID[id]) out.push(id);
    if (CHARACTER_BY_ID[value]) out.push(castFace(value), castArt(value), `face_${value}`);
    return out;
  }
  if (Array.isArray(value)) for (const v of value) words(v, depth + 1, out);
  else if (typeof value === 'object') for (const v of Object.values(value)) words(v, depth + 1, out);
  return out;
}

/** The house steps' art: the hub, its place, every side room's plan, the gift word's move. */
function houseSet(draw: boolean): string[] {
  const out = [hubArt(episode.place)];
  const plan = draw ? housePlan() : episode.house.plan;
  if (plan) out.push(...words(plan), counterArt(), `pic_${counterWord()}`);
  const gift = draw ? giftWord() : episode.gift;
  if (gift) {
    out.push(...words(gift));
    const ab = helperAbilityFor(gift, helper())?.art ?? EFFECT_BY_WORD[gift]?.ability.art;
    if (ab) out.push(ab);
    out.push(...words(hubScene().story));
  }
  return out;
}

/** A fighter's abilities and summons: everything in their good and evil specs that names art. */
function fighterArt(id: string | null): string[] {
  const c = id ? CHARACTER_BY_ID[id] : undefined;
  return c ? words([c.good, c.evil, c.counter]) : [];
}

function battleSet(draw: boolean): string[] {
  const out: string[] = [];
  if (draw || episode.fight) {
    const fight = fightStyle();
    out.push(`arena_${fight.arena ?? villainSpec().arena}`, ...words(fight));
  } else out.push(`arena_${villainSpec().arena}`);
  out.push(...family('minion_'), ...Object.values(MINIONS).map((m) => `minion_${m.id}`));
  for (const id of [episode.hero, episode.ally, episode.villain, helper()]) out.push(...fighterArt(id));
  const moves = draw ? movePlan() : episode.moves;
  if (moves) out.push(...words(moves));
  const said = [...(moves ? words(moves) : []), ...episode.fetched, ...(episode.gift ? [episode.gift] : [])];
  for (const w of [...episode.fetched, ...(episode.gift ? [episode.gift] : []), ...said]) {
    const e = EFFECT_BY_WORD[w.replace(/^pic_/, '')];
    if (e) out.push(...words(e));
  }
  if (episode.house.plan) out.push(counterArt(), `pic_${counterWord()}`);
  return out;
}

function endingSet(draw: boolean): string[] {
  const id = draw ? drawEnding() : episode.ending;
  if (!id) return [];
  const e = ENDING_BY_ID[id];
  if (!e) return [];
  return [endingArt(e.id), ...e.props.map((p) => endingPropArt(p.id)), ...endingPeople(episode).map((p) => castArt(p))];
}

/** The parked v0.1 games draw their rounds as they open, from every picture: they wait for the lot. */
const PARKED = new Set(['SoundToLetter', 'BlendPath', 'WordToPicture', 'Spelling', 'Alarm', 'Retreat']);

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
      if (draw || episode.grab) out.push(...words(grabPlan()));
      break;
    case 'Hub':
    case 'SentenceRoom':
    case 'WordMachine':
    case 'ChargeRoom':
    case 'BridgeRoom':
      out.push(...houseSet(draw));
      break;
    case 'Battle':
      out.push(...battleSet(draw));
      break;
    case 'Ending':
      out.push(...endingSet(draw));
      break;
    case 'Victory':
      out.push('room_victory', ...words(episode.read), counterArt());
      break;
    default:
      // Dev jumps only (`?scene=`): every picture, as boot used to load.
      if (PARKED.has(key)) out.push(...ART_ASSETS.map((a) => a.id));
  }
  out.push(...episodeSet());
  return [...new Set(out)].filter((id) => ART_BY_ID[id]);
}
