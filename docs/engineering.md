# Engineering facts

Measured facts and the reasons behind non-obvious choices. Do not re-litigate one
without a new measurement.

## Voice

- **edge-tts goes through Python.** 2026-10-18: npm `edge-tts-universal` 1.4.0 gets HTTP
  403 on the websocket handshake (and then hangs: its `open` promise never settles).
  Upstream Python `edge-tts` 7.3.1 uses a v2 Sec-MS-GEC token (modified SHA-256 + CS64)
  and works. `tools/voice/providers/edge_tts_worker.py` runs under `uvx` with a pinned
  version; the TS build talks to a pool of 4 workers over JSON lines.
- **Size.** Measured at 1,557 lines (now 1,630, ~19 MB). Untrimmed: 23.7 MB, of which 2,976 s speech. edge-tts pads each
  clip with ~1.5 s of silence; `tools/voice/mp3.ts` trims at the last word + 0.2 s on
  MP3 frame boundaries (MPEG-2 Layer III, 24 kHz, 48 kbps, 144-byte / 24 ms frames).
  Result ~19 MB. Most of it is narrator lines: 13 narrators × ~110 lines. The next big
  content addition will cross the 20 MB commit gate, which needs Matt's say-so; options
  are fewer possible narrators, or narrator lines that do not name heroes/villains.
- **Size after v0.2** (measured 2026-10-18, `git ls-tree -r -l HEAD public/voice`): 2,771
  files, 35.9 MB committed; `lines.json` has 2,769 lines. The v0.2 voice commit
  (`c5330e7`) added 1,085 lines and 16.2 MB, under the per-commit gate. The growth is
  per-character multiplication: sentence prefixes (frame × roster name), wake-up lines
  (waker × character), plus the 14th character's narrator set.
- **Build cache** stores fingerprints only; entries are read back from the previous
  manifest, so manifest data is committed once (saved ~0.6 MB).
- `en-AU-WilliamMultilingualNeural` failed "No audio was received" on most lines.
- edge-tts sometimes times "Dragon Parade" as one boundary; `align.ts` splits merged
  tokens by letter count.

## Phonics spike (from Seraphina's Secret, `git show ca4eee9:scratch/voice_pipeline_spike_report.md`)

- 22 renderings of /s/ tested. Unvoiced consonants (s, f, th, h) come out as the letter
  name ("ess"); the best stand-in was `"Suh"` at -25%.
- Voiced continuants work: "Mmm" gave 0.36 s of clean hum; "Shhh" works.
- SSML `<phoneme>` is impossible twice over: `edge-tts-universal` xml-escapes all input,
  and the Edge endpoint has refused custom SSML since ~2022.
- Firefly turned "Shhh" into silence.
- **Doubling fails here too** (measured 2026-10-18, word-boundary span with GuyNeural at
  -20%): "Lll" 1.26 s, "Rrr" 1.26, "Vvv" 1.26, "Zzz" 1.25, "Sss" 1.25, "Nnn" 1.08, "Guh"
  1.23, "Ks" 1.01, against 0.4–0.75 s for single syllables ("Buh" 0.58, "Mmm" 0.70).
  The long spans fit edge-tts reading the letters by name. Inferred from timing, not
  heard. Only "Mmm" kept its doubling; l n r v z use "Luh" "Nuh" "Err" "Vuh" "Zuh".
- So: placeholders by class here (`content/phonics/letters.ts`), each its own line id;
  Matt's recorded phoneme clips replace them through `content/voice/clips/`. The
  spellings other than "Mmm" and "Suh" are untested by ear.

## Browser and tests

- Playwright **workers: 1** (Seraphina measured 2 workers as 2.3–2.4× slower per test,
  and frame-rate-sensitive assertions broke).
- Headless Chromium runs the battle at 11–18 fps here (software GL, ~10 fighters, heavy
  particles); the title and rooms at ~25–60. With the GPU (`channel: 'chromium'`,
  `--use-angle=d3d11`) the battle holds 56 fps; halving particles changed nothing in
  software mode, so the software cost is fill rate, not particle count. Tests assert on state and counters, never
  on displacement or timing.
- Phaser `time.timeScale` and `tweens.timeScale` are driven every battle frame from
  hit-stop × slow-mo × the move-choice freeze; anything that must run in wall-clock time
  under a freeze (the hit flash) uses `window.setTimeout`.
- Windows 10's Segoe UI Emoji lacks Emoji 13+; placeholder glyphs avoid 🪙 🪭 🪞 🪲 🥸 🪨.
