# Recording: Matt's side of the voice

The letter sounds and their example words are recorded with the **phonics recorder**
(`tools/recorder/phonics-recorder.html`, item 057) and brought in with one command,
`voice:import`. Any other line can still be replaced by hand with `voice:clip`. The
Firefly / recording-folder loop from Seraphina's Secret (`voice:tasks`,
`voice:collect`) was deliberately left out.

## The letter sounds: the recorder and `voice:import`

1. Open the recorder (README, *Matt's recordings*), type your name, and record the 12
   cards. Each card is three words, and each word is followed by its sound three times:
   "VAN … vvvv … vvvv … vvvv …… PIG … p … p … p ……". Leave at least half a second
   between sounds and a second before the next word. Stretch held sounds (half a
   second or so is enough, with no "uh": "ffff", not "fuh"), and keep short sounds
   crisp. A hiss (S, SH, F, TH) can be much quieter than the word; that's fine. For F,
let the breath stop after "ffff" with no "uh" at all, even a quiet one (the importer
measures the hiss against the voiced "uh" and keeps too little); L passes only with a
long "llll", so make it longer than feels needed. The page counts the
   sounds in each take as soon as it stops, and saves a take automatically only when
   all 12 are there.
2. Press **Download zip**. It saves `phonics-<name>.zip`.
3. `npm run voice:import -- <the zip>` (`--dry` to look first, `--take g04` for one card),
   then `npm run voice:build`.
4. Listen on `scratch/voice-import/review.html`, which shows each card's envelope with
   its cuts, every clip with its target id, and what the Stretchy Bridge makes of each
   sound.

A card that is empty or doesn't count out installs nothing and says which card to
re-record and why ("re-record card 4 (VAN · PIG · HAT): no sound"; "found 10 sounds,
expected 12: sounds ran together at 8.4 s, 9.2 s"). For each sound the importer installs
the most typical of the three repeats that the bridge can hold. If no repeat holds (too
short, or an "uh" after it), it keeps the word and skips the sound, so that card is
re-recorded.

**Just the missing sounds** (item 108): open the page with `?missing` on the end
(`tools/recorder/phonics-recorder.html?missing`, from the repo; the hosted copy works the
same once synced). It shows only the sounds still to record, each its own card of one
word and its sound three times (4 sounds): **F** (FAN, "ffff" with no "uh") and **A**
(CAT, the steady vowel in its middle, not sliding toward I; the old A was retired in
item 085). Its zip is `phonics-<name>-missing.zip`, takes `g02f` and `g07a`, and imports
the same way (`--take g07a` for one). The list is `MISSING` in the page.

## Any other line: `voice:clip`

```
npm run voice:clip -- letter_s_sound C:\path\to\s.mp3 0.4
npm run voice:build
```

`voice:clip` writes the mp3 as `content/voice/clips/<id>.<hash8>.mp3` (the hash is of the
audio) and its entry in `content/voice/clips/index.json` with a hash of the line as it
stands; the clip file it replaces, and any take waiting for that line, are deleted. The build uses the
clip while that hash matches; if the line's text later changes, it falls back to edge-tts
and prints STALE. A single phoneme needs no aligner: one word spanning the clip (the
optional third argument is its length in seconds). Line ids are in
`content/voice/ids.ts` and `content/voice/lines.json`. Both `voice:clip` and
`voice:import` name each file by its content hash, so a re-record of the same line is
rebuilt by `voice:build` without `--force`.

## What to record first

The letter sounds (`letter_a_sound` … `letter_z_sound`, the digraphs and the long
vowels; `npm run voice:status` lists the ones still on placeholders) as pure phonemes.
They matter most, because edge-tts cannot say an unvoiced consonant (it says "ess" for
/s/), so today's placeholders are "Suh", "Fuh", "Huh"…
