/**
 * The battle's opening run of fetched things (hunt 6, M28): with a bridge
 * (3 words), a Shape-Shifter (4) and the warm-up, eight things fired one by
 * one, about 34 s before the first PICK A MOVE!. Now a room's earlier words
 * fly out of the bag as one volley and each room's last word keeps its own
 * beat; a word from no room (the warm-up's) is its own beat. A room fired
 * `whole` (Charge the Spell's two words, hunt 11, M62) is one volley, its last
 * word in it. Pure: no Phaser, unit-tested (tests/unit/volleys.test.ts).
 */

/** A room's fetched words (its plan's `fetches`), as a list, or `whole`: all of them one volley. */
export type VolleyRoom = readonly string[] | { readonly words: readonly string[]; readonly whole: true };

/**
 * `fetched` (in order) as the battle's beats: each a list of words fired
 * together. `rooms`: each room's fetched words.
 */
export function fetchBeats(fetched: readonly string[], rooms: readonly VolleyRoom[]): string[][] {
  const out: string[][] = [];
  const parts = rooms.map((r) => ('whole' in r ? { words: r.words, whole: true } : { words: r as readonly string[], whole: false }));
  for (const w of fetched) {
    const room = parts.find((r) => r.words.includes(w));
    if (!room) {
      out.push([w]);
      continue;
    }
    const got = fetched.filter((x) => room.words.includes(x));
    if (room.whole) {
      if (w === got[0]) out.push(got);
    } else if (w === got.at(-1)) out.push([w]);
    else if (w === got[0]) out.push(got.slice(0, -1));
  }
  return out;
}
