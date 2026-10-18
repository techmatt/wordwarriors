/**
 * Background music, synthesised: no asset files, like the SFX.
 *
 * A tiny step sequencer on the shared AudioContext. Each track is a few bars
 * of bass, lead and drums as data; a lookahead timer schedules notes 0.25 s
 * ahead on the audio clock (the standard Web Audio pattern), so the beat stays
 * steady even when the battle drops frames. Music sits on its own gain under
 * the SFX and ducks further while anybody is speaking (VoiceBus), because
 * words she is reading always win.
 *
 * Placeholder music, in the same spirit as the placeholder art: when real
 * tracks exist, `startMusic` is the one place to swap in an <audio> loop.
 */

import { getAudioContext } from './context';

type Drum = 'k' | 's' | 'h' | '.';

interface Track {
  bpm: number;
  /** One entry per 16th note; MIDI note numbers, 0 = rest. Loops. */
  bass: number[];
  lead: number[];
  /** 'k' kick, 's' snare, 'h' hat, '.' nothing. Loops independently. */
  drums: string;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  level: number;
}

const r = 0;

/** Repeat a pattern n times. */
function rep<T>(xs: T[], n: number): T[] {
  return Array.from({ length: n }, () => xs).flat();
}

const TRACKS: Record<string, Track> = {
  // Heroic and bright: C major, a marching bass, a fanfare-ish lead.
  title: {
    bpm: 116,
    bass: [...rep([36, r, 36, r, 43, r, 43, r], 2), ...rep([41, r, 41, r, 43, r, 43, r], 2)],
    lead: [72, r, 76, r, 79, r, 76, r, 72, r, 76, 79, 84, r, r, r, 77, r, 81, r, 84, r, 81, r, 79, r, 77, r, 76, r, r, r],
    drums: 'k...h...s...h...k.k.h...s...h.h.',
    leadWave: 'triangle',
    bassWave: 'triangle',
    level: 0.5,
  },
  // Gentle for thinking: F major bells, sparse, no snare.
  room: {
    bpm: 92,
    bass: [...rep([41, r, r, r, r, r, r, r], 2), ...rep([38, r, r, r, r, r, r, r], 2), ...rep([34, r, r, r, r, r, r, r], 2), ...rep([36, r, r, r, r, r, r, r], 2)],
    lead: [
      77, r, 81, r, 84, r, 81, r, 77, r, 81, r, 84, r, r, r,
      74, r, 77, r, 81, r, 77, r, 74, r, 77, r, 81, r, r, r,
      70, r, 74, r, 77, r, 74, r, 70, r, 74, r, 77, r, r, r,
      72, r, 76, r, 79, r, 76, r, 72, r, 76, r, 79, r, 84, r,
    ],
    drums: 'k.......h.......',
    leadWave: 'sine',
    bassWave: 'triangle',
    level: 0.35,
  },
  // Driving: A minor, eighth-note bass, an arpeggio lead, full kit.
  battle: {
    bpm: 152,
    bass: [...rep([33, 33, 45, 33], 4), ...rep([29, 29, 41, 29], 4), ...rep([31, 31, 43, 31], 4), ...rep([28, 28, 40, 28], 2), ...rep([32, 32, 44, 32], 2)],
    lead: [
      69, 72, 76, 72, 69, 72, 76, 81, 69, 72, 76, 72, 79, 76, 72, 76,
      65, 69, 72, 69, 65, 69, 72, 77, 65, 69, 72, 69, 76, 72, 69, 72,
      67, 71, 74, 71, 67, 71, 74, 79, 67, 71, 74, 71, 77, 74, 71, 74,
      64, 68, 71, 68, 64, 68, 71, 76, 68, 71, 76, 80, 83, 80, 76, 71,
    ],
    drums: 'k.h.s.h.k.k.s.hh',
    leadWave: 'square',
    bassWave: 'sawtooth',
    level: 0.32,
  },
};

let musicGain: GainNode | null = null;
let current: { name: string; track: Track; step: number; next: number; timer: number } | null = null;
let duck = 1;
const MASTER = 0.22;

function mtof(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

function out(c: AudioContext): GainNode {
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = MASTER;
    musicGain.connect(c.destination);
  }
  return musicGain;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, wave: OscillatorType, peak: number, cutoff?: number): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let node: AudioNode = osc;
  if (cutoff) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out(c));
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

let noise: AudioBuffer | null = null;

function drum(c: AudioContext, kind: Drum, at: number, level: number): void {
  if (kind === '.') return;
  if (kind === 'k') {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.setValueAtTime(140, at);
    osc.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    g.gain.setValueAtTime(0.6 * level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(g);
    g.connect(out(c));
    osc.start(at);
    osc.stop(at + 0.2);
    return;
  }
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = kind === 'h' ? 'highpass' : 'bandpass';
  f.frequency.value = kind === 'h' ? 7000 : 1800;
  const g = c.createGain();
  const dur = kind === 'h' ? 0.04 : 0.14;
  g.gain.setValueAtTime((kind === 'h' ? 0.12 : 0.35) * level, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f);
  f.connect(g);
  g.connect(out(c));
  src.start(at);
  src.stop(at + dur + 0.01);
}

function schedule(): void {
  const c = getAudioContext();
  if (!c || !current || c.state !== 'running') return;
  const { track } = current;
  const stepDur = 60 / track.bpm / 4;
  if (current.next < c.currentTime) current.next = c.currentTime + 0.05;
  while (current.next < c.currentTime + 0.25) {
    const s = current.step;
    const at = current.next;
    const b = track.bass[s % track.bass.length]!;
    const l = track.lead[s % track.lead.length]!;
    if (b) tone(c, mtof(b), at, stepDur * 1.6, track.bassWave, 0.3 * track.level, 900);
    if (l) tone(c, mtof(l), at, stepDur * 1.8, track.leadWave, 0.16 * track.level, track.leadWave === 'square' ? 2600 : undefined);
    drum(c, track.drums[s % track.drums.length] as Drum, at, track.level);
    current.step++;
    current.next += stepDur;
  }
}

/** Start a track (no-op if it is already playing). */
export function startMusic(name: keyof typeof TRACKS): void {
  if (current?.name === name) return;
  stopMusic();
  const track = TRACKS[name];
  const c = getAudioContext();
  if (!track || !c) return;
  current = { name, track, step: 0, next: c.currentTime + 0.1, timer: window.setInterval(schedule, 50) };
}

export function stopMusic(): void {
  if (current) window.clearInterval(current.timer);
  current = null;
}

/** Duck under speech (0..1); VoiceBus calls this. */
export function setMusicDuck(level: number): void {
  duck = level;
  const c = getAudioContext();
  if (!c || !musicGain) return;
  musicGain.gain.setTargetAtTime(MASTER * duck, c.currentTime, 0.08);
}

export function musicPlaying(): string | null {
  return current?.name ?? null;
}
