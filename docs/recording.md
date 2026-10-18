# Recording: Matt's side of the voice

Not built yet: the Firefly / recording-folder loop from Seraphina's Secret (`voice:tasks`,
`voice:collect`) was deliberately left out of the first build. What exists is the
override path every recording will use.

## How a recording replaces a line

```
npm run voice:clip -- letter_s_sound C:\path\to\s.mp3 0.4
npm run voice:build
```

`voice:clip` copies the mp3 into `content/voice/clips/` and writes its entry in
`content/voice/clips/index.json` with a hash of the line as it stands. The build uses the
clip while that hash matches; if the line's text later changes, it falls back to edge-tts
and prints STALE. A single phoneme needs no aligner: one word spanning the clip (the
optional third argument is its length in seconds). Line ids are in
`content/voice/ids.ts` and `content/voice/lines.json`.

## What to record first

The 26 letter sounds (`letter_a_sound` … `letter_z_sound`) as pure phonemes: about 26–44
clips in one sitting. They matter most, because edge-tts cannot say an unvoiced
consonant (it says "ess" for /s/), so today's placeholders are "Suh", "Fuh", "Huh"…
