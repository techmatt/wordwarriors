/**
 * Synthesised sound effects. No asset files, never throws.
 *
 * Ported from Seraphina's `audio/beep.ts` (notes + filtered noise) and grown
 * for battles: hits that escalate with power, booms, zaps, lasers, a freeze
 * crackle, an oink, and the "Ha!" interjection, which Matt ruled is an SFX and
 * never a voice line (2026-10-18).
 *
 * Everything goes through one master gain so the battle can duck effects under
 * a voice line without touching any call site.
 */

import { getAudioContext, unlockAudio } from './context';

interface Note {
  freq: number;
  at: number;
  dur: number;
  peak?: number;
  type?: OscillatorType;
  /** Slide to this frequency over the note. */
  to?: number;
}

let master: GainNode | null = null;

function out(c: AudioContext): AudioNode {
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.8;
    master.connect(c.destination);
  }
  return master;
}

/** Duck effects (0..1) while somebody talks. */
export function setSfxLevel(level: number): void {
  const c = getAudioContext();
  if (!c) return;
  const node = out(c) as GainNode;
  node.gain.setTargetAtTime(0.8 * level, c.currentTime, 0.05);
}

/** Effects fired in the same frame stack into mush; cap how many may start per 50 ms. */
let windowStart = 0;
let windowCount = 0;
function budget(): boolean {
  const now = performance.now();
  if (now - windowStart > 50) {
    windowStart = now;
    windowCount = 0;
  }
  return ++windowCount <= 6;
}

function playNotes(notes: Note[]): void {
  const c = getAudioContext();
  if (!c) return;
  unlockAudio();
  const now = c.currentTime;
  try {
    for (const note of notes) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = note.type ?? 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.at);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, now + note.at + note.dur);
      gain.gain.setValueAtTime(0.0001, now + note.at);
      gain.gain.exponentialRampToValueAtTime(note.peak ?? 0.2, now + note.at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + note.dur);
      osc.connect(gain);
      gain.connect(out(c));
      osc.start(now + note.at);
      osc.stop(now + note.at + note.dur + 0.02);
    }
  } catch {
    // Audio failing must never stop the game.
  }
}

const noiseCache = new Map<number, AudioBuffer>();

function playNoise(seconds: number, from: number, to: number, peak: number, type: BiquadFilterType = 'bandpass', at = 0): void {
  const c = getAudioContext();
  if (!c) return;
  unlockAudio();
  try {
    const key = Math.round(seconds * 100);
    let buffer = noiseCache.get(key);
    if (!buffer) {
      const frames = Math.max(1, Math.floor(c.sampleRate * seconds));
      buffer = c.createBuffer(1, frames, c.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) samples[i] = Math.random() * 2 - 1;
      noiseCache.set(key, buffer);
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.Q.value = 1.2;
    const now = c.currentTime + at;
    filter.frequency.setValueAtTime(from, now);
    filter.frequency.exponentialRampToValueAtTime(to, now + seconds);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out(c));
    source.start(now);
    source.stop(now + seconds);
  } catch {
    // never throws
  }
}

// -- UI ------------------------------------------------------------------------

export function sfxSelect(): void {
  playNotes([
    { freq: 880, at: 0, dur: 0.12 },
    { freq: 1318.5, at: 0.07, dur: 0.18 },
  ]);
}

export function sfxStep(i: number): void {
  const scale = [523.3, 587.3, 659.3, 784, 880, 1046.5];
  playNotes([{ freq: scale[i % scale.length]!, at: 0, dur: 0.14, peak: 0.12 }]);
}

/** A correct answer: coin-bright and rising. */
export function sfxRight(): void {
  playNotes([
    { freq: 1318.5, at: 0, dur: 0.1, peak: 0.15 },
    { freq: 1975.5, at: 0.06, dur: 0.14, peak: 0.13 },
    { freq: 2637, at: 0.11, dur: 0.3, peak: 0.09 },
  ]);
}

/**
 * A wrong answer: a fizzle and a giggle. Deliberately funny, never a buzzer
 * (no fail states).
 */
export function sfxWrong(): void {
  playNoise(0.22, 900, 2600, 0.1);
  playNotes([
    { freq: 880, at: 0.18, dur: 0.09, peak: 0.1 },
    { freq: 1046.5, at: 0.27, dur: 0.09, peak: 0.11 },
    { freq: 1174.7, at: 0.35, dur: 0.13, peak: 0.09 },
    { freq: 987.8, at: 0.46, dur: 0.12, peak: 0.07 },
  ]);
}

export function sfxBoing(): void {
  playNotes([{ freq: 220, to: 660, at: 0, dur: 0.25, peak: 0.16, type: 'sine' }]);
}

/** Free play's jump (item 060): a quick rising blip, quieter than a boing. */
export function sfxJump(): void {
  if (!budget()) return;
  playNotes([{ freq: 330, to: 880, at: 0, dur: 0.14, peak: 0.07, type: 'square' }]);
}

/** Free play's sparkle shot: three bright little bells. */
export function sfxTwinkle(): void {
  if (!budget()) return;
  playNotes([
    { freq: 1568, at: 0, dur: 0.12, peak: 0.06, type: 'sine' },
    { freq: 2093, at: 0.05, dur: 0.12, peak: 0.05, type: 'sine' },
    { freq: 2637, at: 0.1, dur: 0.16, peak: 0.04, type: 'sine' },
  ]);
}

export function sfxFanfare(): void {
  playNotes([
    { freq: 523.3, at: 0, dur: 0.18 },
    { freq: 659.3, at: 0.1, dur: 0.18 },
    { freq: 784, at: 0.2, dur: 0.2 },
    { freq: 1046.5, at: 0.3, dur: 0.5 },
    { freq: 1318.5, at: 0.32, dur: 0.5, peak: 0.18 },
    { freq: 1568, at: 0.34, dur: 0.55, peak: 0.16 },
  ]);
}

export function sfxSummon(): void {
  playNoise(1.0, 300, 3600, 0.1);
  const run = [523.3, 659.3, 784, 987.8, 1174.7, 1318.5, 1568];
  playNotes([
    ...run.map((freq, i) => ({ freq, at: i * 0.07, dur: 0.26, peak: 0.14 })),
    { freq: 1046.5, at: 0.55, dur: 0.9, peak: 0.16 },
    { freq: 1568, at: 0.58, dur: 1.0, peak: 0.12 },
  ]);
}

export function sfxWhoosh(): void {
  if (!budget()) return;
  playNoise(0.22, 1600, 300, 0.07);
}

/** Typing a right letter into a ghost box. */
export function sfxKey(): void {
  playNotes([{ freq: 1567.98, at: 0, dur: 0.08, peak: 0.12, type: 'square' }]);
}

// -- battle --------------------------------------------------------------------

/** A hit, escalating with power (1..3). */
export function sfxHit(power: number): void {
  if (!budget()) return;
  const p = Math.min(3, Math.max(1, power));
  playNotes([{ freq: 220 - p * 40, at: 0, dur: 0.1 + p * 0.04, peak: 0.12 + p * 0.05, type: 'square', to: 60 }]);
  playNoise(0.08 + p * 0.05, 3000, 400, 0.08 + p * 0.05);
}

export function sfxBoom(power = 2): void {
  if (!budget()) return;
  playNoise(0.4 + power * 0.2, 1200, 60, 0.18 + power * 0.06, 'lowpass');
  playNotes([{ freq: 110, to: 30, at: 0, dur: 0.5 + power * 0.15, peak: 0.25, type: 'sine' }]);
}

export function sfxZap(): void {
  if (!budget()) return;
  playNotes([
    { freq: 1800, to: 300, at: 0, dur: 0.18, peak: 0.08, type: 'sawtooth' },
    { freq: 2400, to: 500, at: 0.04, dur: 0.16, peak: 0.06, type: 'square' },
  ]);
  playNoise(0.2, 6000, 1200, 0.08, 'highpass');
}

export function sfxLaser(): void {
  if (!budget()) return;
  playNotes([{ freq: 1200, to: 900, at: 0, dur: 0.5, peak: 0.08, type: 'sawtooth' }]);
}

export function sfxPew(): void {
  if (!budget()) return;
  playNotes([{ freq: 1400, to: 400, at: 0, dur: 0.12, peak: 0.07, type: 'square' }]);
}

export function sfxFire(): void {
  if (!budget()) return;
  playNoise(0.5, 800, 200, 0.14, 'lowpass');
  playNoise(0.4, 3000, 1200, 0.05);
}

export function sfxFreeze(): void {
  playNoise(0.35, 7000, 3000, 0.1, 'highpass');
  playNotes([
    { freq: 2093, at: 0.05, dur: 0.2, peak: 0.08 },
    { freq: 2637, at: 0.12, dur: 0.25, peak: 0.07 },
    { freq: 3136, at: 0.2, dur: 0.3, peak: 0.06 },
  ]);
}

export function sfxOink(): void {
  playNotes([
    { freq: 420, to: 300, at: 0, dur: 0.14, peak: 0.16, type: 'sawtooth' },
    { freq: 460, to: 320, at: 0.18, dur: 0.16, peak: 0.16, type: 'sawtooth' },
  ]);
}

export function sfxPoof(): void {
  if (!budget()) return;
  playNoise(0.3, 2400, 600, 0.09);
}

export function sfxShield(): void {
  playNotes([
    { freq: 659.3, at: 0, dur: 0.5, peak: 0.08, type: 'sine' },
    { freq: 987.8, at: 0.02, dur: 0.5, peak: 0.07, type: 'sine' },
  ]);
}

export function sfxHeal(): void {
  playNotes([
    { freq: 784, at: 0, dur: 0.2, peak: 0.08 },
    { freq: 1046.5, at: 0.08, dur: 0.25, peak: 0.08 },
    { freq: 1318.5, at: 0.16, dur: 0.35, peak: 0.08 },
  ]);
}

export function sfxStomp(): void {
  if (!budget()) return;
  playNotes([{ freq: 80, to: 35, at: 0, dur: 0.35, peak: 0.3, type: 'sine' }]);
  playNoise(0.25, 500, 80, 0.12, 'lowpass');
}

/** The big ultimate wind-up: a rising roar into a hit. */
export function sfxUltimate(): void {
  playNoise(1.4, 200, 4000, 0.12);
  playNotes([
    { freq: 110, to: 440, at: 0, dur: 1.3, peak: 0.12, type: 'sawtooth' },
    { freq: 165, to: 660, at: 0, dur: 1.3, peak: 0.08, type: 'square' },
  ]);
}

export function sfxGrow(): void {
  playNotes([{ freq: 120, to: 480, at: 0, dur: 0.7, peak: 0.14, type: 'sawtooth' }]);
}

/**
 * "Ha!" / "Hya!": an interjection as a vocal-ish blip, two formants over a
 * buzzy source. An SFX by ruling, never a voice line.
 */
export function sfxShout(pitch = 1): void {
  if (!budget()) return;
  const c = getAudioContext();
  if (!c) return;
  try {
    const now = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(160 * pitch, now + 0.22);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    const f1 = c.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 800;
    f1.Q.value = 5;
    const f2 = c.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1300;
    f2.Q.value = 6;
    osc.connect(f1);
    osc.connect(f2);
    f1.connect(g);
    f2.connect(g);
    g.connect(out(c));
    osc.start(now);
    osc.stop(now + 0.26);
    playNoise(0.06, 3000, 2000, 0.06);
  } catch {
    // never throws
  }
}

export function sfxVictory(): void {
  sfxFanfare();
  playNotes([
    { freq: 784, at: 0.9, dur: 0.15 },
    { freq: 784, at: 1.05, dur: 0.15 },
    { freq: 1046.5, at: 1.2, dur: 0.7, peak: 0.2 },
    { freq: 1318.5, at: 1.22, dur: 0.7, peak: 0.16 },
  ]);
}

/** The alarm: a friendly two-tone siren, three times. */
export function sfxSiren(): void {
  const notes: Note[] = [];
  for (let i = 0; i < 3; i++) {
    notes.push({ freq: 784, at: i * 0.5, dur: 0.24, peak: 0.12, type: 'square' });
    notes.push({ freq: 587.3, at: i * 0.5 + 0.25, dur: 0.24, peak: 0.12, type: 'square' });
  }
  playNotes(notes);
}
