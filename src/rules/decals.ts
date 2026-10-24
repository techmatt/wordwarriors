/**
 * Where a villain's decals land in a room (src/world/houseMood.ts draws them).
 * Phaser-free, so the scatter is unit-tested (`tests/unit/decals.test.ts`).
 *
 * Each decal is the best of a few seeded candidates: on the strip of back wall
 * or a floor margin, out of everything `avoid` keeps clear, and farthest from
 * what is already down. A decal with no clear candidate is not drawn at all
 * (hunt 10, M58): falling back onto a spot put Moriarty's playing card on her
 * start and others on the pictures' grid (fix 150's case).
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DecalSpec {
  id: string;
  count: number;
}

export interface PlacedDecal {
  x: number;
  y: number;
  onFloor: boolean;
  key: string;
  size: number;
}

/** The strip of back wall above the doors, clear of the HUD corners. */
const WALL: Box = { x: 210, y: 70, width: 880, height: 130 };
/** Decal ids that read as lying on the floor; anything else may go on the wall. */
const FLOOR_LIKE = /foot|print|step|track|puddle|crumb|peel|banana|scorch|rubble|pile|mud|slime|bone|coin|sand|leaf|leaves|feather|dust|penguin/;
/** Decal ids that only make sense on a wall. */
const WALL_ONLY = /crack|web|scratch|claw|frost|ice|icicle|hole|smudge|soot/;
/** Candidates tried per decal. */
const TRIES = 17;

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The decals' places in a room: seeded by `rand`, so a room looks the same
 * each visit. `floor` is the walkable floor (decals keep to its margins);
 * `floorOnly` an outdoor place with no wall to hang things on.
 */
export function scatterDecals(decals: readonly DecalSpec[], opts: { floor: Box; avoid?: readonly Box[]; floorOnly?: boolean; rand: () => number }): PlacedDecal[] {
  const { floor, rand } = opts;
  const avoid = opts.avoid ?? [];
  const left = floor.x;
  const right = floor.x + floor.width;
  const top = floor.y;
  const bottom = floor.y + floor.height;
  const floorPoint = (): { x: number; y: number } => {
    const side = rand();
    if (side < 0.35) return { x: left + rand() * 130, y: top + 20 + rand() * (floor.height - 20) };
    if (side < 0.7) return { x: right - rand() * 130, y: top + 20 + rand() * (floor.height - 20) };
    return { x: left + 140 + rand() * (floor.width - 280), y: bottom - rand() * 40 };
  };
  const wallPoint = (): { x: number; y: number } => ({ x: WALL.x + rand() * WALL.width, y: WALL.y + rand() * WALL.height });

  const placed: PlacedDecal[] = [];
  let n = 0;
  for (const d of decals) {
    for (let i = 0; i < d.count; i++) {
      const onFloor = !!opts.floorOnly || FLOOR_LIKE.test(d.id) || (!WALL_ONLY.test(d.id) && n % 2 === 0);
      n++;
      const size = onFloor ? 64 + rand() * 16 : 84 + rand() * 20;
      const clear = (p: { x: number; y: number }) => !avoid.some((r) => overlaps(r, { x: p.x - size / 2, y: p.y - size / 2, width: size, height: size }));
      // Of the clear candidates, the one farthest from what is already down.
      let best: { x: number; y: number } | null = null;
      let bestD = -1;
      for (let k = 0; k < TRIES; k++) {
        const p = onFloor ? floorPoint() : wallPoint();
        if (!clear(p)) continue;
        const d2 = placed.reduce((m, q) => Math.min(m, (q.x - p.x) ** 2 + (q.y - p.y) ** 2), Number.MAX_VALUE);
        if (d2 > bestD) {
          bestD = d2;
          best = p;
        }
      }
      // No clear spot: not drawn (M58).
      if (best) placed.push({ ...best, onFloor, key: `decal_${d.id}`, size });
    }
  }
  return placed;
}
