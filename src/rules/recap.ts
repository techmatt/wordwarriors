/**
 * The victory recap's words (VictoryScene): the words she read, in the order
 * she read them, cut to the cards that fit. Pure: unit-tested
 * (tests/unit/recap.test.ts).
 */

export interface RecapInput {
  /** Every word she read this episode, in order (episode.read). */
  read: readonly string[];
  /** Her first move word (the hub's gift), if any. */
  gift: string | null;
  /** The battles' move words she read (each choice's right word). */
  moves: readonly string[];
  /** The counter word (what beat the villain): it and what she read after it stay. */
  counter: string;
  /** Each side room's key: its last word (the creature that went to the fight, the bridge's last). */
  keys: readonly string[];
}

/**
 * When more than `max` words were read, the gift word, the battles' move
 * words, the counter word and what came after it, and each side room's last
 * word always stay; the earliest of the rest fill the cards left (item 039:
 * the cut dropped the gift word and battle 1's moves; hunt 6: with the
 * Shape-Shifter's four words and the bridge's three it dropped them again,
 * and the last creature with them).
 */
export function recapWords(r: RecapInput, max = 9): string[] {
  const at = r.read.indexOf(r.counter);
  const must = new Set([...(r.gift ? [r.gift] : []), ...r.moves, ...(at >= 0 ? r.read.slice(at) : []), ...r.keys].filter((w) => r.read.includes(w)));
  const pick = new Set([...must].slice(0, max));
  for (const w of r.read) if (pick.size < max) pick.add(w);
  return r.read.filter((w) => pick.has(w));
}
