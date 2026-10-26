/**
 * Every scene's key (item 159), Phaser-free: a mistyped key in `startScene`, a
 * step's scene or a test's `s.scene === …` fails typecheck. Each scene's
 * constructor passes its key through `satisfies SceneKey`, and `src/main.ts`
 * registers them all.
 */
export const SCENE_KEYS = [
  'Boot',
  'Title',
  'Pick',
  'Journey',
  'Bedroom',
  'Entry',
  'Hub',
  'SentenceRoom',
  'WordMachine',
  'ChargeRoom',
  'BridgeRoom',
  'ShifterRoom',
  'RhymeRoom',
  'Debug',
  'Battle',
  'Ending',
  'Victory',
  'TheEnd',
  'Parent',
  'Wait',
  // Parked (`isParkedScene`, src/art/needs.ts).
  'SoundToLetter',
  'BlendPath',
  'WordToPicture',
  'Spelling',
  'Alarm',
  'Retreat',
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];

/** A running scene's key: Phaser types it `string`, and every scene's constructor gave it a `SceneKey`. */
export const keyOf = (scene: { scene: { key: string } }): SceneKey => scene.scene.key as SceneKey;
