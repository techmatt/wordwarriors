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
  Result ~19 MB. Most of it is narrator lines: 13 narrators × ~110 lines.
- **Size after v0.2** (measured 2026-10-18, `git ls-tree -r -l HEAD public/voice`): 2,771
  files, 35.9 MB committed; `lines.json` has 2,769 lines. The v0.2 voice commit
  (`c5330e7`) added 1,085 lines and 16.2 MB, under the per-commit gate. The growth is
  per-character multiplication: sentence prefixes (frame × roster name), wake-up lines
  (waker × character), plus the 14th character's narrator set.
- **Generated voice left git** (item 008, 2026-10-18) at 3,590 mp3s, 42.3 MB: it lives in
  untracked `public/voice-gen/`, a junction to the Drive folder (README, *Storage*).
  `manifest.json` (1.3 MB) and `.build-cache.json` went with it, not into git: the
  manifest's word timings come from synthesis and are only true of those exact mp3s, and
  every checkout shares the one folder, so a tracked manifest would drift from the audio
  as soon as two branches built. The source of truth that stays tracked is
  `content/voice/lines.json`, `voices.json` and `clips/` (recordings and their hashes).
  The old voice stays in git history: 4,002 blobs under `public/voice/`, 56.6 MB
  (measured 2026-10-21, `git rev-list --objects --all`).
- **A sentence is read as two clips:** the frame's prefix line ("Rilla is scared of...")
  and the key word's own `word_<x>`, so no line can leak a key word and Matt's
  recordings can replace either. The cost: the read-back can sound choppy at the join.
- **Build cache** stores fingerprints only; entries are read back from the previous
  manifest, so manifest data is stored once (saved ~0.6 MB). Reused entries are re-based
  onto the current output folder, so moving the folder needs no rebuild.
- The edge-tts quirks met while building (a voice that returns no audio, merged and split
  word boundaries, hyphens, rime and letter-name spellings) are in README, *Operational
  facts*, with the workaround for each.

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
  spellings other than "Mmm" and "Suh" are untested by ear, except that the short A and
  short O placeholders sound nearly alike when held on the Stretchy Bridge (heard in
  item 054); recordings fix it.

## Browser and tests

- Playwright **workers: 2** on the GPU from item 061 (2026-10-20) to item 079 (3 since, on a
  build: below), 1 on software GL. Fast
  lane (20 tests, files spread over workers, not `--fully-parallel`): 1 worker 130 s, 2
  workers 87 s, 3 workers 83 s with a Charge round stretched to 28 s of game time to the
  read (17 s otherwise; the start-up burst of three boots at once). Slow lane on 2: 58 tests
  in 16.7 minutes, green; the whole real-time episode (6.3 minutes) sets its floor. Per test
  2 workers cost 20-30% (up to 2× for a test sharing the machine with an episode). The boot
  floor was about 2.8 s a test to a quiet hub (page and modules 0.65 s, then 459 PNGs and the
  core voice; item 065 loads art on demand, below); fulfilling `/art/` and `/voice-gen/` from an in-memory `page.route` cache made
  it slower (4.0 s), so every test still fetches through vite.
- **Art on demand (item 065, 2026-10-20), boot timings** (`tests/perf/boot.pw.ts`,
  one worker, GPU, clock speed 5, a fresh browser context each run, median of 5):
  | | before (all 459 PNGs, 45 MB, at boot) | after (on demand) |
  | --- | --- | --- |
  | page load → title | 3.20 s | 1.16 s (47 files, about 2.6 MB) |
  | `?scene=house` → hub shown | 3.21 s (runs between title runs); 7.55 s (five in a row) | 1.40 s (111 files, about 7 MB) |
  | `?scene=house` → quiet hub | 7.70 s; 11.23 s (five in a row) | 5.09 s |
  (After: the final loader, 11:55pm; the sizes are from the first after-run, when the
  spec still read response bodies, which it cannot for the game's `fetch`es.)
  "Quiet" is input free and nobody talking, still so 0.6 s later; about 3.7 s of it is the
  hub's opening lines at speed 5. Before, five hub boots in a row ran slower each (7.8 →
  11.8 s): every boot pulled 45 MB through vite; after, the five were within 0.1 s. The
  first run of a server's life is slower (vite transforms the modules) and is not counted.
- **The suite serves a build (item 079, 2026-10-21)**, `vite build` (about 5 s, `public/`
  not copied: copying its 190 MB cost 14 s) then `vite preview` serving `public/` beside it
  (`tests/vite.test.config.ts`). Same machine, GPU, two workers, warm dev server for the
  before: the browser tests not `@slow` 197 s (one flaky: a boot that never finished) →
  56 s, no retry; the slow lane 977 s (one flaky, the same) → 779 s, no retry. Per test on
  the dev server: the text-fit caption test 68.5 s → 5.7 s, the solid-frame test 57 s
  (failed) / 28 s → 4.3 s, the bridge's level 3 18 s → 11 s, a hub boot 14.5 s → 4.6 s. The
  whole episodes moved least (the real-time one 365 → 367 s; the soak 206 → 161 s). The
  first run after `npm ci` on the dev server (cold: dependencies optimised, nothing
  transformed) took the same lane to its 6-minute cap with 3 failures, every one a boot
  that never reached a scene. Three workers on the build: the slow lane 779 → 578 s, green;
  the real-time episode (6.1 minutes) is now near its floor.
- **A faster slow lane (item 081, 2026-10-21)**, three workers on the build. The real-time
  episode at speed 1 throughout was 361 s; real for the bedroom, the warm-up, the hub's
  helper scene, door a's sentence room and battle 1, the rest at 5 and battle 2 at 10, it is
  about 210 s (real seconds per part: bedroom 31, warm-up 22, hub scene 18, door a 32, door
  b 8 at speed 5, battle 1 73, hub part 2 11 at 5, battle 2 11 at 10). A contest fight style
  through both battles: 33 s at clock speed 5, 24-28 s at 8, 21-23 s at 10. Speed 10 and 8
  each failed sky_race 1 run in 3 on the finish-flag check until it read the flag a frame
  after hearing the line (the battle publishes its state once a frame, the voice live); then
  10 was green three runs running. The whole drawn episodes for the bridge (101 s), the
  machine (88 s) and Charge (77 s) became one shared episode (`tests/drawn.spec.ts`) and the
  soak's own two.
- **Art and voice share the dev server's six HTTP/1.1 connections** (item 065). `<img>`
  requests rank below `fetch` in Chromium and starved behind the voice bank's twelve
  clip fetches (a battle sat in the Wait scene); `priority: 'low'` fetches are held
  back the same way. So art is fetched: high priority, 4 at a time, for a scene about
  to show; the default, 2 at a time, for the background; and the voice queue starts no
  new background decodes while a scene waits for its art. Aborting a slow fetch
  re-queues it at the back: with a 30 s timeout (6 s real at test speed 5) the
  slow-art test thrashed to a minute; the timeout is 2 minutes.
- **The cook-off fight test fails on main too** (checked 2026-10-20 11:48pm with main's
  `src`): `fights.spec` cook_off collects 128-216 `voice: could not decode … AbortError`
  (VoiceBank's 15 s fetch timeout, 3 s real at speed 5) across its two boots. Not item
  065's; the other fight styles pass. Item 069 put the voice and art fetch timeouts on the
  wall clock (`src/realTime.ts`), so test speed no longer shortens them.
- Before item 061: workers 1 (Seraphina measured 2 workers as 2.3–2.4× slower per test,
  and frame-rate-sensitive assertions broke). Re-measured here 2026-10-18 on the 9 smoke
  tests at clock speed 3 (`--fully-parallel`): 1 worker 2m24s, 2 workers 2m02s, 3 workers
  1m48s; each test ran 1.5–2× slower, so it bought 15–25% at a flake risk, and stayed off.
  (Without `--fully-parallel`, `--workers` does nothing: the tests are in one file.)
- **Test clock speed** (`WW_SPEED`, `tests/harness.ts`, item 019): an init script scales
  every page clock (`performance.now`, `Date.now`, timers, the rAF timestamp) and voice
  `playbackRate` by the same factor. Phaser's tweens read `Date.now` and its loop the rAF
  time, so both follow. Smoke suite, same machine: speed 1 4m22s, 3 2m24s, 6 5m32s (at 6
  her walking and the battle hero's walk overshoot at 15–20 fps and the harness keeps
  re-aiming). The speed-up is ~2.5× not 3×: voice decoding, page loads and Phaser's
  first 120 frames (capped to 16.7 ms each) run in real time. Voice `time()` reads the
  audio clock, which is not warped, so the karaoke highlight lags a sped-up clip; no test
  asserts on it.
- Serving a production build (`vite preview`) instead of the dev server saved nothing
  worth its 5 s build: smoke suite 2m12s against 2m24s. GPU (`channel: 'chromium'`,
  `--use-angle=d3d11`) at speed 3 was 1m55s in one run and 3m05s in another; not adopted
  then. Re-measured 2026-10-19 (item 036): one fight style through both battles 53 s on
  the GPU against 78 s in software, the fast lane 76 s against 82 s, so the GPU is now
  the default (`WW_GPU=0` for software). With the GPU's frame rate her walking keeps up
  at a faster clock: three slow tests (Battle part 2, the machine wrong-first, a warm-up
  seed) took 99 s at speed 3, 81 s at 4, 73 s at 5, all green, so the default is now 5.
  Three workers with `--fully-parallel` on the
  fast lane: 89 s against 82 s on one, so still one worker.
- Battle fighters move by `min(0.05 s, frame delta) × time scale` (`BattleScene.update`),
  while the director's clock (`now`) takes the frame delta unclamped. At software GL's
  11-18 fps and clock speed 3 a frame can be well over 50 ms of game time, so fighters
  can fall behind the director's timeline; at the GPU's ~56 fps the clamp rarely bites
  (read from the code, not measured).
- Fixed cost of any Playwright run here: about 9 s (vite start, browser launch).
- The soak's heap line: 60 MB after both episodes at speed 1, 86 MB after both at speed 3
  (2026-10-18). Flat between episodes either way, which is what it watches; compare like
  with like.
- Headless Chromium runs the battle at 11–18 fps here (software GL, ~10 fighters, heavy
  particles); the title and rooms at ~25–60. With the GPU (`channel: 'chromium'`,
  `--use-angle=d3d11`) the battle holds 56 fps; halving particles changed nothing in
  software mode, so the software cost is fill rate, not particle count. Tests assert on state and counters, never
  on displacement or timing.
- Phaser `time.timeScale` and `tweens.timeScale` are driven every battle frame from
  hit-stop × slow-mo × the move-choice freeze; anything that must run in wall-clock time
  under a freeze (the hit flash) uses `window.setTimeout`.
- Windows 10's Segoe UI Emoji lacks Emoji 13+; placeholder glyphs avoid 🪙 🪭 🪞 🪲 🥸 🪨.
