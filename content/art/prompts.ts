/**
 * Image-generation prompts for real art, keyed by asset id (content/art/assets.ts).
 *
 * `npm run art:gen -- <ids…>` sends STYLE + the asset's prompt to Codex's
 * built-in image tool. Sprites are generated on flat #00FF00 and keyed to
 * transparency; rooms and arenas are full-bleed. The style block is Matt's
 * (2026-10-18), word for word for sprites; backgrounds swap its last sentence.
 */

export const STYLE =
  "Bright, bold children's game art for a 4-year-old: friendly cartoon style, thick clean dark outlines, flat cel shading, saturated cheerful colors, simple readable shapes, storybook warmth. No text, letters or numbers anywhere in the image.";

export const SPRITE_STYLE = `${STYLE} Single subject centered, full body, on a flat pure #00FF00 green background (sprites only).`;

export const BACKGROUND_STYLE = `${STYLE} A full-bleed background painting filling the whole frame edge to edge, no border, no characters.`;

export const ART_PROMPTS: Record<string, string> = {
  char_rilla_evil:
    'EvilRilla, the villain: a giant, menacing-but-silly gorilla robot, chrome and red armour plates, huge rocket fists, glowing red eyes, a bandolier of banana peels across the chest. Mischievous grin rather than frightening. Standing, facing the viewer.',
  char_rilla_good:
    'Rilla, the good version: the same giant gorilla robot, friendly and gentle, pastel blue armour plates, soft glowing eyes and a big smile, arms open wide for a hug. Standing, facing the viewer.',
  char_elsa_good:
    'An original ice sorceress: a young woman with a long pale braid over one shoulder, a flowing icy-blue gown made of snowflake patterns, conjuring sparkles of frost between her hands, a kind smile. An original character design: not a lookalike of any film or animated character. Standing, facing the viewer.',
  room_bedroom_julia:
    "A cozy, cluttered little girl's bedroom seen side-on from a slight top-down game angle, wide landscape 16:9. Star wallpaper, a window, a toy chest, a dragon plushie, a rocket-shaped lamp, a castle playset and children's drawings pinned on the walls, all along the back wall and the edges. A wooden floor with a rug fills the lower half and is left open and uncluttered for the player to walk on. No bed and no door: the game draws those on top.",
  pic_mice:
    'A little cage of cute white mice: a small round wire cage with three fluffy white mice with pink ears and tails peeking out, instantly recognisable.',
  pic_net:
    'A butterfly net: a long wooden handle with a round hoop and a white mesh net, shown whole and simple, instantly recognisable.',
};
