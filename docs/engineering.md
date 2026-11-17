# Engineering facts

Measured facts and the reasons behind non-obvious choices. Do not re-litigate one
without a new measurement. All timings are this machine (Windows 10, the GPU unless
said otherwise).

## Voice

- **edge-tts goes through Python.** npm `edge-tts-universal` 1.4.0 gets HTTP 403 on the
  websocket handshake and then hangs (its `open` promise never settles). Python `edge-tts`
  7.3.1 uses a v2 Sec-MS-GEC token and works. `tools/voice/providers/edge_tts_worker.py`
  runs under `uvx` with a pinned version; `tools/voice/build.ts` talks to a pool of 4
  workers over JSON lines.
- **Trimming.** edge-tts pads each clip with about 1.5 s of silence; `tools/voice/mp3.ts`
  trims at the last word + 0.2 s on MP3 frame boundaries (MPEG-2 Layer III, 24 kHz,
  48 kbps, 144-byte / 24 ms frames).
- **Generated voice is not in git.** It lives in untracked `public/voice-gen/`, a junction
  to the Drive folder (`docs/storage.md`), with `manifest.json` and `.build-cache.json`:
  the manifest's word timings come from synthesis and are only true of those exact mp3s,
  and every checkout shares the one folder, so a tracked manifest would drift from the
  audio as soon as two branches built. Tracked: `content/voice/lines.json`, `voices.json`
  and `clips/` (recordings and their hashes). The line count grows by multiplication
  (sentence prefixes are frame × roster name, wake-up lines waker × character, a narrator
  set per character). The old committed `public/voice/` stays in git history (4,002 blobs,
  56.6 MB); no history rewrite.
- **A sentence is read as two clips:** the frame's prefix line ("Rilla is scared of...")
  and the key word's own `word_<x>`, so no line can leak a key word and Matt's recordings
  can replace either. The cost: the read-back can sound choppy at the join.
- **Build cache** stores fingerprints only; entries are read back from the previous
  manifest, so manifest data is stored once. Reused entries are re-based onto the current
  output folder, so moving the folder needs no rebuild.
- **Fetch priorities** (`src/voice/VoiceBank.ts`, `src/art/ArtBank.ts`). The server's six
  HTTP/1.1 connections are shared by art and voice, and Chromium ranks `<img>` below
  `fetch` and holds `priority: 'low'` back while higher ones keep coming. So: a voice line
  asked for is fetched at `high`, background voice at `low` in 4 slots (12 decoding at
  once); art for a scene about to show at `high`, 4 at a time, background art at the
  default priority, 2 at a time; the voice queue starts no new background decode while a
  scene waits for its art. Boot awaits only the voice manifest. Aborting a slow fetch
  re-queues it at the back, so the timeouts are long (art 2 minutes, voice 15 s) and on
  the wall clock (`src/realTime.ts`), which the tests' fast clock does not shorten.
- **A slow server, measured** (`tests/perf/castVoice.pw.ts`: a whole episode at the
  suite's speeds with real voice, a proxy adding 300 ms to every clip and picture): the
  title at 3.3-3.7 s, one Wait screen (the bedroom's pictures, 4.5 s), each line asked
  for 310-580 ms late, fetches p95 about 340 ms; the background decodes about 13 clips a
  second there, less than the suite's fast clock asks for. On healthy servers (fresh or
  warm `npm run dev`, the build) no cast shows a Wait screen or a line that waits.
- The edge-tts quirks (a voice that returns no audio, merged and split word boundaries,
  hyphens, rime and letter-name spellings) and their workarounds: `docs/voice-art-pipeline.md`,
  *Voice build facts*.

## Letter sounds

Placeholders by sound class (`content/phonics/letters.ts`), each its own line id, so
Matt's recorded phoneme clips in `content/voice/clips/` replace them. Why placeholders
cannot be better (first measured in Seraphina's Secret,
`git show ca4eee9:scratch/voice_pipeline_spike_report.md`):

- Of 22 renderings of /s/, unvoiced consonants (s, f, th, h) come out as the letter name
  ("ess"); the best stand-in is `"Suh"` at -25%. Voiced continuants work ("Mmm" gives
  0.36 s of clean hum; "Shhh" works). Firefly turns "Shhh" into silence.
- SSML `<phoneme>` is impossible: `edge-tts-universal` xml-escapes all input, and the
  Edge endpoint has refused custom SSML since about 2022.
- **Doubling fails** (word-boundary span, GuyNeural at -20%): "Lll", "Rrr", "Vvv", "Zzz",
  "Sss" about 1.25 s, "Nnn" 1.08, against 0.4-0.75 s for single syllables ("Buh" 0.58,
  "Mmm" 0.70): the long spans fit edge-tts reading the letters by name (inferred from
  timing, not heard). Only "Mmm" keeps its doubling; l n r v z use "Luh" "Nuh" "Err"
  "Vuh" "Zuh". Spellings other than "Mmm" and "Suh" are untested by ear.
- **Short A is cut from a carrier word.** LPC formants (median over the vowel's middle,
  GuyNeural at -20%): edge-tts "Aah", "Ah" and "Ahh" are one vowel, F1 806 / F2 1217 Hz,
  the O of HOT, not the A of CAT (F2 about 1,700). "Aa" is 464 / 2210 (EH or AY); "Am",
  "Ap" and "Ant" glide or are read as letters. Inside a word the vowel is right: "Add"
  797 / 1705, "At" 785 / 1706, "Cap" 800 / 1707, "Cat" 832 / 1692. Matt's recording of
  "Aah" glides up toward EH / I, and the Stretchy Bridge's hold planner stretches its
  last 0.29 s, the most glided part. So `letters.ts` gives A a `carrier` ("Add"): the
  line asks edge-tts for "Add." and the build (`tools/voice/carrier.ts`, decoding with
  `decode_mp3.py`, miniaudio under `uv`) keeps the onset to where loudness first falls
  6 dB under the peak (before the D), then finishes it like a recording (fades, -17 dB
  RMS, 30 ms pads): 0.37 s, steady F1 794 / F2 1711, hold-checked as `hold`. Changing a
  line's spoken text marks Matt's clip for it stale (`voice:status` lists it under
  "stale (re-record)"); a new recording overrides the cut.
- **Short O needs no carrier:** edge-tts "Ah" is 806 / 1217 (HOT 870 / 1342, "Odd"
  816 / 1261), and Matt's recorded O, the one that plays, is a steady 706 / 1183.

## Browser and tests

- **The suite serves a build** (`tests/vite.test.config.ts`): `vite build` (4-5 s;
  `public/` not copied, which would cost 14 s), then `vite preview` serving `public/`
  beside it. Against a warm dev server it cut the browser tests not `@slow` from 197 s to
  56 s and removed the flaky boots that never reached a scene; a cold dev server (first
  run after `npm ci`) failed boots outright.
- **Workers: 3 on the GPU, 1 on software GL** (`playwright.config.ts`, `WW_WORKERS`).
  Tests spread by file, not `fullyParallel` (on three workers it took 6.7 minutes against
  about 6.3: the long tests bunched last). Files go in plain name order: a project running
  the whole-episode specs first was slower (5.3 against 4.7 minutes;
  `WW_EPISODES_FIRST=1` brings it back). A second or third worker makes each test 20-30%
  slower (up to 2× beside an episode), so time anything by eye on `--workers=1`.
- **GPU** (`channel: 'chromium'`, `--use-angle=d3d11`; `tests/gpu.ts`, `WW_GPU=0` for
  software): the battle holds about 56 fps against 11-18 fps in headless software GL
  (title and rooms 25-60); halving particles changed nothing in software, so the cost is
  fill rate. One fight style through both battles: 53 s GPU, 78 s software.
- **Test clock speed** (`WW_SPEED`, default 5, `tests/harness.ts`): an init script scales
  every page clock (`performance.now`, `Date.now`, timers, the rAF timestamp) and voice
  `playbackRate` alike, so Phaser's tweens and loop follow. The gain is below the factor:
  voice decoding, page loads and Phaser's first 120 frames (capped at 16.7 ms) run in real
  time. Above 5 on software GL her walk overshoots at 15-20 fps and the harness keeps
  re-aiming. Voice `time()` reads the audio clock, not warped, so the karaoke highlight
  lags a sped-up clip; no test asserts on it. Battles run at 10: a finish-flag check must
  read the flag a frame after hearing the line (the battle publishes its state once a
  frame, the voice live).
- **Test-only shortcuts** (instant voice, teleports, room parts at 5, battles at 10): the
  default whole episode takes about 36 s (bedroom 3.9, warm-up 2.4, hub scene 1.0, door a
  2.9, door b 3.2, battle 1 7.0, hub part 2 4.2, battle 2 8.2). The slow lane's real-time
  episode (real for the bedroom, warm-up, hub scene, door a and battle 1; the rest at 5,
  battle 2 at 10) takes about 210 s and sets that lane's floor.
- **Boot timings** (`npm run perf`, `tests/perf/boot.pw.ts`: one worker, clock speed 5, a
  fresh context each run, median of 5; art loads on demand):
  | | build | dev server (`PERF_DEV_SERVER=1`) |
  | --- | --- | --- |
  | page load → title | 1.07 s (37 files, 2.5 MB) | 1.27 s |
  | `?scene=house` → hub shown | 1.25 s (117 files, 7.2 MB) | 1.48 s |
  | `?scene=house` → quiet hub | 2.12 s | 2.35 s |
  "Quiet" is input free and nobody talking, still so 0.6 s later. A whole perf run takes
  26 s on the build against 1.8 minutes on the dev server (its first transforms). Loading
  all art at boot (459 PNGs, 45 MB) took the title to 3.2 s and slowed each successive
  boot; serving `/art/` and `/voice-gen/` from an in-memory `page.route` cache was slower
  than fetching through the server.
- **Lane times**: `npm test`
  about 35 s, the unit tests its long pole (`grab.test`'s hall-objects sweep and
  `plansGolden.test` the longest files); `test:browser` about 3 minutes; `test:slow` about
  5; `test:all` about 6. Test counts: README, *Tests*.
- **Start-up costs:** any Playwright run about 9 s fixed (server start, browser launch);
  `npx <tool>` about 2.2 s before the tool starts, `node --import tsx` 0.3 s, `npm`
  itself 0.8 s.
- Battle fighters move by `min(0.05 s, frame delta) × time scale` (`BattleScene.update`),
  while the director's clock (`now`) takes the frame delta unclamped, so at a low frame
  rate and a fast clock fighters can fall behind the director's timeline; at the GPU's
  frame rate the clamp rarely bites (read from the code, not measured). Tests assert on
  state and counters, never on displacement or timing.
- The soak's heap line: 60 MB after both episodes at speed 1, 86 MB at speed 3, flat
  between episodes either way, which is what it watches; compare like with like.
- Phaser `time.timeScale` and `tweens.timeScale` are driven every battle frame from
  hit-stop × slow-mo × the move-choice freeze; anything that must run in wall-clock time
  under a freeze (the hit flash) uses `window.setTimeout`.
- In a contest the held bodies keep rocking through the move choice's slow clock after
  the pads are placed (the tug's rock is up to 26 px), so pads keep 40 px off them
  (`CONTEST_SWAY`, `src/battle/moveChoice.ts`), and any cover at all counts as covering.
- Windows 10's Segoe UI Emoji lacks Emoji 13+; placeholder glyphs avoid 🪙 🪭 🪞 🪲 🥸 🪨.

## Play timings (real speed, measured in the last bug hunt)

Boot to title about 0.7 s, to a quiet hub about 1.8 s; a two-word Charge visit about
28 s; a rhyme-room visit about 31 s; battle part 1 to PICK A MOVE! about 30 s; F's "fuh"
clip 0.6 s.

## Phaser facts that bit

- **A camera's `fadeEffect.isComplete` stays true after a `fadeIn`:** Phaser's Fade sets
  it when any fade ends, in either direction, and clears it only when the next fade
  starts. A guard on a closing fade needs its own flag (`BattleScene`'s `closing`, set by
  `closeFade`, which the F9 guard reads).
- **A tween started over another on the same property keeps the value it started from:**
  a yoyo bounce begun during a Back.easeOut pop-in's overshoot yoyos back to the
  overshoot, leaving the object too big. End such a bounce on its settled value
  (`onComplete`).
- **Tweens run on in a paused fight unless paused:** a looping alpha tween (a trap card's
  pulse) undoes the move choice's fade-back at once, so the choice pauses the veiled
  things' tweens.
