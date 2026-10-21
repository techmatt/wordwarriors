"""Decode an MP3 (stdin) to a mono 16-bit WAV (stdout) at its own sample rate.

The voice build's one decoder (item 085, `carrier.ts`): Node has no MP3
decoder in this repo, so a carrier line's audio is decoded here, run as
`uv run --no-project --with miniaudio python decode_mp3.py`, and cut in
TypeScript.
"""

import io
import sys
import wave

import miniaudio


def main():
    data = sys.stdin.buffer.read()
    sound = miniaudio.decode(data, output_format=miniaudio.SampleFormat.SIGNED16, nchannels=1, sample_rate=miniaudio.mp3_get_info(data).sample_rate)
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sound.sample_rate)
        w.writeframes(sound.samples.tobytes())
    sys.stdout.buffer.write(out.getvalue())


if __name__ == "__main__":
    main()
