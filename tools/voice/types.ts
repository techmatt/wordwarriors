/**
 * The voice pipeline's contracts. Ported from Seraphina's Secret.
 *
 * The split that matters: everything below `VoiceProvider` is provider-specific
 * and stays inside `tools/voice/providers/`. Everything in `VoiceManifest` is
 * what the game sees, and it must never carry a provider's fingerprints. Its
 * schema lives in the game, `src/voice/manifest.ts`, the one copy both read
 * (item 159), and is re-exported here.
 */

import type { TimedWord } from '../../src/voice/manifest.js';

export type { ManifestLine, TimedWord, VoiceManifest } from '../../src/voice/manifest.js';

/** One authored line of dialog. `content/voice/lines.json` is an array of these. */
export interface LineSpec {
  /** Stable key. Becomes the audio filename and the game's lookup handle. */
  id: string;
  /** Which speaker in `voices.json` says it. */
  speaker: string;
  /** What is shown on screen, verbatim, punctuation and all. */
  text: string;
  /**
   * What is actually spoken, when that has to differ from what is shown. The
   * words edge-tts times for `say` must equal the speakable tokens of `text` in
   * number; word identity is not checked when `say` is set.
   */
  say?: string;
  /**
   * Item 085: `say` is a carrier word and only its opening vowel is kept: from
   * the onset to where loudness first falls `keepDb` under the peak
   * (tools/voice/carrier.ts). edge-tts only; a recorded clip is used whole.
   */
  cut?: { keepDb: number };
  /** Per-line prosody, replacing the speaker's. Same units as VoiceConfig. */
  rate?: string;
  pitch?: string;
  volume?: string;
  /**
   * Load group. The game decodes a group when a scene asks for it, so hundreds
   * of narrator and taunt lines never all decode at boot. See VoiceBank.
   */
  group: string;
  /** Free-text authoring note. Ignored by the build; never reaches the game. */
  note?: string;
}

export interface VoiceConfig {
  /** Provider voice id, e.g. an edge-tts short name like `en-US-GuyNeural`. */
  voice: string;
  /** Percentage, e.g. `-15%`. */
  rate?: string;
  /** Hertz offset, e.g. `+30Hz`. */
  pitch?: string;
  /** Percentage, e.g. `+10%`. */
  volume?: string;
}

/** `content/voice/voices.json`. */
export interface VoiceBook {
  provider: string;
  speakers: Record<string, VoiceConfig>;
}

export interface Synthesis {
  audio: Uint8Array;
  extension: string;
  words: TimedWord[];
}

export interface VoiceProvider {
  readonly id: string;
  synthesize(text: string, voice: VoiceConfig): Promise<Synthesis>;
  /** Release any worker process. */
  close?(): void;
}
