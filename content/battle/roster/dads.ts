/** The dads' looks and colours, shared by every form of each. */

/** The dads as drawn in every form (Matt's photos, 2026-10-18): only the clothes and props change between forms. */
export const MATT_FACE = 'a tall, beefy, broad-shouldered bodybuilder dad: fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile';
/** Weightlifter Dada Matt (Matt, item 032): a little less buff than the other forms, in a T-shirt with sleeves. */
export const MATT_LIFTER = 'a tall, strong, broad-shouldered dad, fit but not bulky (not a bodybuilder): fair skin, short light-brown hair thinning on top with a high hairline, a full short reddish-brown beard, blue eyes, no glasses, a big warm smile';
export const JASON_FACE = 'a big, sturdy, round-faced dad: warm light-brown skin, very short dark curly hair receding at the front, black browline glasses, a short dark goatee beard flecked with grey, a tiny hoop earring, a big laughing smile';

/**
 * Each dad's colour (item 046: Matt blue, Jason forest green), the one place it is
 * set. Every good form drawn in it takes its palette, trail and themed move colours
 * from here, so a new colour moves them all (item 078; rules.test.ts checks). `deep`
 * is the cloth, `bright` the same hue lifted to read as a trail or a glow on any arena.
 * Cyber Matt keeps his own cyan and magenta: he was never recoloured.
 */
export const DAD_COLOURS: Record<string, { deep: number; bright: number }> = {
  dada_matt: { deep: 0x2a4aa0, bright: 0x7ab8ff },
  dada_jason: { deep: 0x1f5a32, bright: 0x5ac878 },
};
export const MATT = DAD_COLOURS.dada_matt!;
export const JASON = DAD_COLOURS.dada_jason!;
/** The dads' good forms that keep colours of their own (see DAD_COLOURS). */
export const OWN_COLOURS = new Set(['dada_matt_cyber']);
