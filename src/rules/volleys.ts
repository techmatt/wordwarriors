/**
 * The battle's opening run of fetched things (hunt 6, M28): with a bridge
 * (3 words), a Shape-Shifter (4) and the warm-up, eight things fired one by
 * one, about 34 s before the first PICK A MOVE!. Now a room's earlier words
 * fly out of the bag as one volley and each room's last word keeps its own
 * beat; a word from no room (the warm-up's) is its own beat. Pure: no Phaser,
 * unit-tested (tests/unit/volleys.test.ts).
 */

/**
 * `fetched` (in order) as the battle's beats: each a list of words fired
 * together. `rooms`: each room's fetched words (its plan's `fetches`).
 */
export function fetchBeats(fetched: readonly string[], rooms: readonly (readonly string[])[]): string[][] {
  const out: string[][] = [];
  for (const w of fetched) {
    const room = rooms.find((r) => r.includes(w));
    if (!room) {
      out.push([w]);
      continue;
    }
    const got = fetched.filter((x) => room.includes(x));
    if (w === got.at(-1)) out.push([w]);
    else if (w === got[0]) out.push(got.slice(0, -1));
  }
  return out;
}
