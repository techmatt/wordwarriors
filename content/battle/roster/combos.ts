import type { AbilitySpec, ComboSpec } from '../types.js';
import { ab } from './abilities.js';
import { JASON, MATT } from './dads.js';
import { personOf } from './index.js';

/** Team combos: when both are on the hero side, every so often they fire this together. */
export const COMBOS: ComboSpec[] = [
  { pair: ['elsa', 'anna'], ability: ab('sister_storm', 'Sister Storm', 'spin', 16, 0xaee6ff, 3, { count: 5, color2: 0xe63946 }) },
  { pair: ['seraphina', 'smaug'], ability: ab('dragon_duet', 'Dragon Duet', 'cone', 16, 0xff7b00, 3, { color2: 0x6ad66a }) },
  // Item 114: Ozymandias is from Antarctica now, so his duo is with Elsa, not Jasmine.
  { pair: ['elsa', 'ozymandias'], ability: ab('polar_duo', 'Polar Duo', 'wave', 16, 0xaee6ff, 3, { color2: 0xc0c8d8 }) },
  { pair: ['dada_matt', 'dada_jason'], ability: ab('dad_squad', 'Dad Squad', 'slam', 16, MATT.bright, 3, { color2: JASON.bright }) },
  { pair: ['julia', 'dada_matt'], ability: ab('high_five', 'Mega High Five', 'lightning', 16, 0xffd23f, 3, { count: 6, color2: MATT.bright }) },
  // Item 028: the active cast's allies each have one with her. Dada Jason
  // charges in with her on his back, whatever his form.
  { pair: ['julia', 'dada_jason'], ability: ab('piggyback_charge', 'Piggyback Charge', 'dash', 16, 0xffd23f, 3, { color2: JASON.bright }) },
  // Scar's rockets carry her stars up, and they all come down together.
  { pair: ['julia', 'scar'], ability: ab('star_rocket_rain', 'Star Rocket Rain', 'rain', 16, 0xffc233, 3, { count: 26, glyph: '🚀', color2: 0xffd23f }) },
  // Ellie rings them both in giant bubbles; Julia's stars fly out through the
  // ring, then the bubbles follow them in.
  {
    pair: ['julia', 'ellie'],
    ability: ab('star_bubble_spin', 'Star Bubble Spin', 'bolt', 16, 0xffd23f, 3, { count: 4, glyph: '⭐', homing: true, color2: 0x9ad8ff }),
    second: ab('star_bubble_ring', 'Star Bubble Spin', 'orbit', 16, 0x9ad8ff, 3, { count: 8, art: 'fx_bubble', upright: true, duration: 1.4, color2: 0xff9ad5 }),
  },
  { pair: ['seraphina', 'tiamat'], ability: ab('dragon_queen_ride', 'Dragon Queen Ride', 'dash', 16, 0xc77dff, 3, { color2: 0x6ad66a }) },
  { pair: ['julia', 'seraphina'], ability: ab('best_friends', 'Best Friend Blast', 'beam', 16, 0xff5ab4, 3, { color2: 0x2ec27e }) },
  // Item 111: the new allies each have one with her too. Elsa rings them in
  // snowflakes while Julia's stars fly out through the ring.
  {
    pair: ['julia', 'elsa'],
    ability: ab('frosty_star_swirl', 'Frosty Star Swirl', 'bolt', 16, 0xffd23f, 3, { count: 4, glyph: '⭐', homing: true, color2: 0xaee6ff }),
    second: ab('frosty_star_ring', 'Frosty Star Swirl', 'rain', 16, 0xe8f6ff, 3, { count: 22, glyph: '❄️', color2: 0x7cc7ff }),
  },
  // Anna lifts her up on her shield and they charge together.
  { pair: ['julia', 'anna'], ability: ab('brave_buddy_charge', 'Brave Buddy Charge', 'dash', 16, 0xffb703, 3, { shout: true, color2: 0xe63946 }) },
  // Julia hops on the flying carpet: a sweep of wind full of stars and jewels.
  { pair: ['julia', 'jasmine'], ability: ab('carpet_star_sweep', 'Carpet Star Sweep', 'wave', 16, 0xffc857, 3, { color2: 0xff5ab4 }) },
  // Item 114: the second wave. Julia and Ozymandias blast off in his rocket,
  // and down comes a shower of stars and snowflakes from space.
  {
    pair: ['julia', 'ozymandias'],
    ability: ab('rocket_launch', 'Rocket Launch', 'dash', 16, 0xffd23f, 3, { shout: true, color2: 0xc0c8d8 }),
    second: ab('rocket_launch_rain', 'Rocket Launch', 'rain', 16, 0xbfe8ff, 3, { count: 24, glyph: '⭐', color2: 0xffd23f }),
  },
  // Julia's stars fly out of Moriarty's puzzle box, and his copycats pop up to join in.
  {
    pair: ['julia', 'moriarty'],
    ability: ab('puzzle_box_stars', 'Puzzle Box Surprise', 'bolt', 16, 0xffd23f, 3, { count: 5, glyph: '⭐', homing: true, color2: 0xf4a261 }),
    second: ab('puzzle_box_copycats', 'Puzzle Box Surprise', 'clones', 16, 0xf4a261, 3, { count: 4, color2: 0x95d5b2 }),
  },
  // Julia rides on Bluerilla's shoulders and they land in one giant happy stomp.
  { pair: ['julia', 'rilla'], ability: ab('shoulder_ride_stomp', 'Shoulder Ride Stomp', 'slam', 16, 0x2a4aa8, 3, { shout: true, color2: 0xffd23f }) },
];

/** Any two heroes without a written combo still team up with this. */
export const DEFAULT_COMBO = ab('team_blast', 'Team Star Blast', 'beam', 18, 0xffd23f, 3, { color2: 0xff5ab4 });

/** A combo is written for persons, so every form of a dad keeps his (Julia and any Dada Matt high-five). */
function comboSpec(a: string, b: string): ComboSpec | undefined {
  const pa = personOf(a);
  const pb = personOf(b);
  return COMBOS.find((c) => (c.pair[0] === pa && c.pair[1] === pb) || (c.pair[0] === pb && c.pair[1] === pa));
}

export function comboFor(a: string, b: string): AbilitySpec {
  return comboSpec(a, b)?.ability ?? DEFAULT_COMBO;
}

/** What `who` fires in its combo with `partner`: the combo's `second` half if `who` is second of the pair. */
export function comboPart(who: string, partner: string): AbilitySpec {
  const c = comboSpec(who, partner);
  if (!c) return DEFAULT_COMBO;
  return c.second && c.pair[1] === personOf(who) ? c.second : c.ability;
}
