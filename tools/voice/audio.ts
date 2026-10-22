/**
 * The voice tools' audio codecs: WAV in and out, and mono MP3 out. `voice:import`
 * reads the recorder's WAVs and writes its clips and review page through these,
 * `voice:build` encodes a carrier line's cut vowel, and `carrier.ts` reads the
 * decoded WAV. (Trimming an mp3's tail is `mp3.ts`.)
 */

import { Mp3Encoder } from '@breezystack/lamejs';

export const MP3_KBPS = 96;

/** A float sample in [-1, 1] (clamped) as a 16-bit integer. */
const toInt16 = (v: number) => Math.round(Math.max(-1, Math.min(1, v)) * 32767);

/** A WAV's samples, mixed to mono: 16-bit PCM or 32-bit float. */
export function readWav(b: Buffer): { x: Float32Array; rate: number } {
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let fmt: { tag: number; ch: number; rate: number; bits: number } | null = null;
  for (let i = 12; i + 8 <= b.length; ) {
    const id = b.toString('ascii', i, i + 4);
    const size = b.readUInt32LE(i + 4);
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(i + 8), ch: b.readUInt16LE(i + 10), rate: b.readUInt32LE(i + 12), bits: b.readUInt16LE(i + 22) };
    if (id === 'data') {
      if (!fmt) throw new Error('WAV data before its format');
      const { tag, ch, rate, bits } = fmt;
      const float = tag === 3 && bits === 32;
      if (!float && !(tag === 1 && bits === 16)) throw new Error(`${bits}-bit WAV (format ${tag}) is not handled`);
      const step = bits / 8;
      const n = Math.floor(Math.min(size, b.length - i - 8) / (step * ch));
      const x = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        let s = 0;
        for (let c = 0; c < ch; c++) {
          const o = i + 8 + (k * ch + c) * step;
          s += float ? b.readFloatLE(o) : b.readInt16LE(o) / 32768;
        }
        x[k] = s / ch;
      }
      return { x, rate };
    }
    i += 8 + size + (size & 1);
  }
  throw new Error('no data in the WAV');
}

/** Mono 16-bit PCM WAV. */
export function wavBytes(x: Float32Array, rate: number): Buffer {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + x.length * 2, 4);
  b.write('WAVEfmt ', 8, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(x.length * 2, 40);
  for (let k = 0; k < x.length; k++) b.writeInt16LE(toInt16(x[k]!), 44 + 2 * k);
  return b;
}

/** Mono MP3 at the samples' own rate. */
export function mp3Bytes(x: Float32Array, rate: number): Buffer {
  const enc = new Mp3Encoder(1, rate, MP3_KBPS);
  const pcm = Int16Array.from(x, toInt16);
  const parts: Buffer[] = [];
  const keep = (u: ArrayLike<number> & { buffer: ArrayBufferLike; byteOffset: number; length: number }) => parts.push(Buffer.from(u.buffer, u.byteOffset, u.length));
  for (let i = 0; i < pcm.length; i += 1152) keep(enc.encodeBuffer(pcm.subarray(i, i + 1152)));
  keep(enc.flush());
  return Buffer.concat(parts);
}
