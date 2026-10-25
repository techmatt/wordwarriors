/**
 * The row of three things she walks to that the rhyme room and the Shape-Shifter share
 * (item 153: each had its own copy): where they stand, how big a picture is, where she
 * walks in, and the floor kept clear of the room's mood decals and the bag.
 *
 * She walks in at her room's `entry` (content/house/house.ts), as in the other side rooms
 * (item 153, Matt's call: until then both rooms had her in at the far left), moved off it
 * across the row where it is in reach of an option, as the sentence room does: the shared
 * entry, the floor's middle, is 75 px from the middle option, so the first round's things
 * would step her aside as they came up, every visit.
 */
import Phaser from 'phaser';

import { SIDE_ROOM_BY_ID } from '../../content/house/house';
import { REACH } from '../config';

/** The pictures (or stones) standing in the room (feet positions), left to right. */
export const OPTIONS: readonly (readonly [number, number])[] = [[400, 640], [640, 655], [880, 640]];
export const PICTURE_SIZE = 116;
/** Where she walks in when the room is not one of the house's (no `entry` to read): the far left, as before item 153. */
const NO_ROOM_ENTRY = { x: 130, y: 610 };

/**
 * Where she walks in: her room's `entry`, kept on `floor` (its bottom 10 px clear, like the
 * word machine's); in reach of an option, between the first two instead (at the shared
 * entry: 520, 580).
 */
export function entryOf(roomId: string, floor: Phaser.Geom.Rectangle): { x: number; y: number } {
  const e = SIDE_ROOM_BY_ID[roomId]?.entry ?? NO_ROOM_ENTRY;
  const y = Phaser.Math.Clamp(e.y, floor.top, floor.bottom - 10);
  let x = Phaser.Math.Clamp(e.x, floor.left, floor.right);
  if (OPTIONS.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < REACH)) x = (OPTIONS[0]![0] + OPTIONS[1]![0]) / 2;
  return { x, y };
}

/**
 * Kept clear of the room's mood and its bag: the row 250 px clear either side (hunt 11:
 * Moriarty's ❓ lay in line with the rhyme room's pictures, a fourth thing to walk to) and
 * her way in at `entry` (M58's rule: Bavmorda's bones lay at her feet there).
 */
export function rowKeepClear(entry: { x: number; y: number }): Phaser.Geom.Rectangle[] {
  const first = OPTIONS[0]!;
  const last = OPTIONS[OPTIONS.length - 1]!;
  return [
    new Phaser.Geom.Rectangle(first[0] - 250, first[1] - 150, last[0] - first[0] + 500, 200),
    new Phaser.Geom.Rectangle(entry.x - 90, entry.y - 170, 180, 200),
  ];
}
