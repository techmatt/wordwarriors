/**
 * `public/voice-gen/manifest.json`'s schema, the one copy (item 159): the game
 * reads it (`VoiceBank`), `voice:build` writes it (`tools/voice/build.ts`, through
 * `tools/voice/types.ts`), and the unit tests and the checker read it. Types and the
 * version, no imports: the browser and Node share it.
 */

/** A spoken word's span in its clip, in seconds. */
export interface TimedWord {
  word: string;
  start: number;
  end: number;
}

/** One built line: its clip, and the words as said (the captions' karaoke). */
export interface ManifestLine {
  id: string;
  speaker: string;
  group: string;
  text: string;
  /** The clip, relative to the site root (`voice-gen/<id>.mp3`). */
  audio: string;
  words: TimedWord[];
  duration: number;
}

export interface VoiceManifest {
  version: number;
  provider: string;
  lines: ManifestLine[];
}

/** Bumped when the shape above changes. */
export const MANIFEST_VERSION = 2;
