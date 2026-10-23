/**
 * The roster: every character, good and evil, as data.
 *
 * Each character has a good version (a hero or ally) and an evil version (a
 * villain), and each version has its own fighting style, three or more
 * abilities, taunts and an ultimate. The evil version's ultimate is what floors
 * the heroes at the end of Part 1. What beats it in Part 2 is whatever the
 * attic's counter sentence draws from her word bag ("EVIL TIAMAT RUNS FROM THE
 * BUS", item 015): any pictured CVC word, flung at the villain as a swarm of
 * its pictures. The `counter` item here is flavour for when the draw lands on
 * its own word (HAT for Evil Tiamat: the Magic Hat swallows her storm).
 * The parked Spell the Spell game has its own words: content/phonics/spelling.ts.
 *
 * Because any CVC word can be a key word, the episode keeps out of the draw
 * every word its own hero, ally and villain say or show before the attic
 * (names, abilities, ultimates, taunts, minions, the threat):
 * `saidEarly` in src/rules/sentences.ts. Named counter words are still kept
 * out of everyone's names, abilities, ultimates and taunts (rules.test.ts), and
 * each is a whole word of its item's `name` (HAT → Magic Hat).
 *
 * `house` is how the villain colours the house: the threat in the wake-up
 * line ("Bad news, Evil Elsa is coming, and <threat>!"), a tint, decals and an
 * ambient effect. Threats are fun, not scary, and carry no CVC reading words.
 * Decal ids are unique across the roster (prefixed with the character id),
 * because each is its own art asset `decal_<id>`.
 *
 * Elsa, Anna and Jasmine are written as original archetypes (an ice
 * sorceress, her brave sister, a desert princess with a flying carpet), not as
 * lookalikes of anybody's films. The art prompts in docs/art.md say the same.
 *
 * Move words (an ability's `words`) are flavour (see MOVE_WORDS): a pad word one of
 * them answers to fires that ability, styled. Taunts are short, because a bubble over a moving fighter has to be
 * readable at a glance, and they never name the word she must read.
 */

// The roster lives in ./roster/ (item 123): the helpers, the minions, the dads'
// looks, the characters in groups, combos and arenas. Everything imports it
// from here.
export { MOVE_WORDS, abilityCallout, abilityWords } from './roster/abilities.js';
export { MINIONS } from './roster/minions.js';
export { DAD_COLOURS, OWN_COLOURS } from './roster/dads.js';
export { ROSTER, CHARACTER_BY_ID, villainName, personOf, PERSONS, formsOf, formId } from './roster/index.js';
export { COMBOS, DEFAULT_COMBO, comboFor, comboPart } from './roster/combos.js';
export { ARENAS } from './roster/arenas.js';
