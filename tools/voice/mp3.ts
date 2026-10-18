/**
 * Trim an mp3's dead tail, frame by frame, with no decoder.
 *
 * edge-tts pads every clip with about a second and a half of silence after the
 * last word (measured 2026-10-18: 1,473 clips, 23.7 MB, of which 2,976 s was
 * speech and the rest tail). With a narrator line per possible ally the voice
 * folder is the biggest thing in the repo, so the build cuts each clip at the
 * last word's end plus a short tail. MP3 frames are self-delimiting, so cutting
 * at a frame boundary is safe; the bit reservoir only ever borrows backwards,
 * so dropping trailing frames cannot break the ones kept.
 */

const BITRATES: Record<string, number[]> = {
  // [version][layer] → kbps by index. Only Layer III is handled; edge-tts emits nothing else.
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Keep frames up to `seconds` of audio. Returns the input unchanged if it cannot parse it. */
export function trimMp3(buf: Uint8Array, seconds: number): Uint8Array {
  let i = 0;
  // Skip an ID3v2 tag if there is one.
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    i = 10 + ((buf[6]! << 21) | (buf[7]! << 14) | (buf[8]! << 7) | buf[9]!);
  }
  let t = 0;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1]! & 0xe0) !== 0xe0) return buf;
    const versionBits = (buf[i + 1]! >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layerBits = (buf[i + 1]! >> 1) & 3; // 1 = Layer III
    if (layerBits !== 1 || versionBits === 1) return buf;
    const brIndex = buf[i + 2]! >> 4;
    const srIndex = (buf[i + 2]! >> 2) & 3;
    const padding = (buf[i + 2]! >> 1) & 1;
    const kbps = BITRATES[versionBits === 3 ? '1-3' : '2-3']![brIndex];
    const rate = RATES[versionBits]?.[srIndex];
    if (!kbps || !rate) return buf;
    const mpeg1 = versionBits === 3;
    const size = Math.floor(((mpeg1 ? 144 : 72) * kbps * 1000) / rate) + padding;
    const samples = mpeg1 ? 1152 : 576;
    if (t >= seconds) return buf.subarray(0, i);
    t += samples / rate;
    i += size;
  }
  return buf;
}
