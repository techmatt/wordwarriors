# Engineering facts

Measured facts and the reasons behind non-obvious choices. Do not re-litigate one
without a new measurement.

## Voice

- **edge-tts goes through Python.** 2026-10-18: npm `edge-tts-universal` 1.4.0 gets HTTP
  403 on the websocket handshake (and then hangs: its `open` promise never settles).
  Upstream Python `edge-tts` 7.3.1 uses a v2 Sec-MS-GEC token (modified SHA-256 + CS64)
  and works. `tools/voice/providers/edge_tts_worker.py` runs under `uvx` with a pinned
  version; the TS build talks to a pool of 4 workers over JSON lines.
- **Size.** Measured at 1,557 lines (2026-10-18; `lines.json` had 11,543 on
  2026-10-21). Untrimmed: 23.7 MB, of which 2,976 s speech. edge-tts pads each
  clip with ~1.5 s of silence; `tools/voice/mp3.ts` trims at the last word + 0.2 s on
  MP3 frame boundaries (MPEG-2 Layer III, 24 kHz, 48 kbps, 144-byte / 24 ms frames).
  Result ~19 MB then, most of it narrator lines.
- **Size after v0.2** (history: the committed `public/voice` is gone since item 008,
  below; measured 2026-10-18, `git ls-tree -r -l HEAD public/voice`): 2,771
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
- **A slow server, measured** (item 150, 2026-10-24; a whole episode at the suite's speeds
  with real voice, the build behind a proxy adding 300 ms to every clip and picture;
  `tests/perf/castVoice.pw.ts`). Before: the title at 17.6 s (boot awaited core's 293
  clips), 3 Wait screens (bedroom 4.5 s, entry 0.9 s, hub 0.7 s), 31-37 lines starting
  0.6-0.9 s late, every fetch about 930 ms (three answers' time: twelve voice fetches at
  `fetch`'s default high priority queued for six connections, the art and the line being
  said among them). After (background voice at four slots and `low`, a line asked for at
  `high`, boot awaiting only the manifest): the title at 3.3-3.7 s, one Wait screen (the
  bedroom's 56 pictures, 4.5 s, the title left after 0.1 s), each line asked for 310-580 ms
  late (one answer), fetches p95 about 340 ms. More lines wait at all (79), as the
  background now decodes about 13 clips a second there, less than the suite's fast clock
  asks for. Jasmine and the default cast were alike before and after. On the healthy
  servers (fresh and warm `npm run dev`, Matt's day-old one, the build) no cast showed a
  Wait screen or a line that waited.
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
- **Short A is cut from a carrier word** (item 085: Matt heard CAP's A as "I"). Measured
  with LPC formants (median over the vowel's middle, GuyNeural at -20%;
  `085/formants.py`, `envelope.py` in the scratch home, `C:\Code\wordwarriors-scratch`): edge-tts "Aah", "Ah" and "Ahh" are the same
  vowel, F1 806 / F2 1217 Hz, the O of HOT, not the A of CAT (F2 about 1,700). "Aa" is
  F1 464 / F2 2210 (an EH or AY), "Am", "Ap" and "Ant" glide or are read as letters. Inside a
  word the vowel is right: "Add" 797 / 1705, "At" 785 / 1706, "Cap" 800 / 1707, "Cat" 832 /
  1692. Matt's recording of "Aah" (item 063) starts at 680 / 1810 and rises to 636 / 1920:
  it glides up toward EH / I, and the bridge's hold planner stretches its last 0.29 s,
  which is the most glided part. So `letters.ts` gives A a `carrier` ("Add"). The line asks
  edge-tts for "Add." and the build (`tools/voice/carrier.ts`) decodes it
  (`decode_mp3.py`, miniaudio under `uv`), keeps the onset to where loudness first falls
  6 dB under the peak (before the D), then finishes it like a recording (fades, -17 dB RMS,
  30 ms pads). Result: 0.37 s, steady F1 794 / F2 1711 (thirds 793/1680, 787/1712,
  818/1751), hold-checked as `hold` with a 0.21 s steady part. Changing the line's spoken
  text marked Matt's A clip stale (Matt's call, by default, item 085). `voice:status` lists
  it under "stale (re-record)", and a new recording overrides the cut as before.
- **Short O needs no carrier**: edge-tts "Ah" is F1 806 / F2 1217 (HOT is 870 / 1342, "Odd"
  816 / 1261), and Matt's recorded O, the one that plays, is a steady 706 / 1183.

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
- **Perf times the build (item 133, 2026-10-23, 3:55pm)**, as the suite and the checker serve
  it; the new baseline, beside the dev server on the same tree minutes later
  (`PERF_DEV_SERVER=1`). Same spec, one worker, GPU, median of 5:
  | | build (`npm run perf`) | dev server |
  | --- | --- | --- |
  | page load → title | 1.07 s (37 files, 2.5 MB) | 1.27 s |
  | `?scene=house` → hub shown | 1.25 s (117 files, 7.2 MB) | 1.48 s |
  | `?scene=house` → quiet hub | 2.12 s | 2.35 s |
  The whole run: 26 s against 1.8 minutes (the dev server's first transforms). Item 065's
  quiet hub (5.09 s) predates item 083's shorter hub opening, so it no longer compares.
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
- **Test-only shortcuts (item 083, 2026-10-21)**, three workers on the build. The full run was
  5.6 minutes of browser tests (one run, 96 passed, 3 failed: the two layout checks and the
  hidden-tab test, which need real voice; fixed after it), against 7.1 in item 081. The sum of
  every test's time was 810 s (plus the shared drawn episode's `beforeAll`), so three
  workers are near the floor. The default whole episode with instant voice, teleports, room
  parts at 5 and battles at 10 took 36 s (parts: bedroom 3.9, warm-up 2.4, hub scene 1.0, door
  a 2.9, door b 3.2, battle 1 7.0, hub part 2 4.2, battle 2 8.2). The real time split three
  ways: title, bedroom and warm-up 55 s, a sentence room 23 s, battle 1 72 s. Each contest
  fight style's one part took about 10 s. The soak took 72 s, against 2.2 minutes in item 081.
  The rope pull's pad miss (M7/M17, 0.26% of Jormungandr under a sign) had two causes:
  `placePads` returned a layout under 0.5% cover as "covering nobody", and in a contest the
  held bodies keep rocking through the choice's slow clock after the pads are placed (the
  tug's rock is up to 26 px). Now any cover counts, and a contest keeps the signs 40 px off
  them (`CONTEST_SWAY`, moveChoice.ts). The two rulings tests were 10 of 10 green after it.
- **Lane times, item by item** (moved from the README's *Tests* in item 088; this machine,
  the GPU). `npm test`: 3.4 minutes before item 079, about 20 s since (the smoke three).
  `test:browser`: 197 s and one flaky as item 079 found it (then the fast lane, on the dev
  server), about 50 s since. `test:all` (browser tests after the unit tests): 26 minutes
  with items 025 and 026, 37 with item 031's fight styles, 45 with item 033's warm-up spec
  (2026-10-19); item 036 brought it back to 18 the same day (duplicated walks folded
  together, the GPU, clock speed 5), the one real-time episode 6 of them (3.5 once item 081
  played half of it at speed); about 20 before item 079, 10.2 in item 079, 7.2 in item 081,
  5.8 in item 083 (5.6 in the run above), 4.7 in item 085. Item 081 put the whole-episode
  specs (`episode`, `soak`, `drawn`) in a project listed first; item 085 timed it against
  plain name order on the same tree (three workers, `--retries=0`): 5.3 and 5.3 minutes
  against 4.7 and 4.7, so name order is back (`WW_EPISODES_FIRST=1` restores the project).
  Item 085 ran `test:all` green twice in a row with no retries (4.7 minutes, 103 tests)
  after two test fixes: Charge's rune-timing test on real voice (instant voice let the
  harness's polling swallow a line before the test's frame sampler saw it) and battle part
  2's ability count under `battle=short`.
  Test counts, as the README had them: `test:browser` 24 tests (about 50 s) in item 079, 55
  since hunt 9, 86 in item 147; `test:all` 136 browser tests in item 105 (about 6.3 minutes), 149 since item
  116, 154 in item 132, 193 in item 147; `test:slow` 86 tests in item 105 (about 5 minutes), 97 since item 116
  (the story fight, the new villains' episodes, solo mode), 99 in item 132 (counted after
  one hub check moved from `cover.spec` into the browser lane's `layout.spec`), 107 in item
  147 (counts listed 2026-10-24). `npm test` was about 24 s
  run one after the other before item 105 (21 s on three workers), 14 s on one worker since;
  34 s in item 147 (2026-10-24), the unit tests now the long pole (33 s: `grab.test`'s
  hallObjects sweep 18 s, every grab word × 15 seeds; `plansGolden.test` 13 s), with
  `test:browser` 168 s (86 tests, one flaky).
- **Item 105 (2026-10-22), lane times before it**, three workers, the GPU: `npm test` 21 s (unit
  9 s, then the smoke three 12 s), `test:browser` 89 s (50 tests, 229 s summed), `test:slow`
  297 s (86 tests, 797 s summed, `episode.spec.ts` alone 183 s on one worker), `test:all`
  about 6.3 minutes (136 browser tests in 6.1). `fullyParallel` on three workers: 6.7 minutes
  for every browser test (the workers 394 / 306 / 346 s busy: the long tests bunched last),
  so tests still spread by file. Start-up costs on this machine: `npx <tool>` about 2.2 s
  before the tool starts, `node --import tsx` 0.3 s, `npm` itself 0.8 s; the suite's
  `vite build` 4-5 s (18 s once with the machine short of memory). Each unit file alone:
  36.7 s summed, `shifter.test.ts` the longest (4.7 s; its 200 seeded draws 3 s, one
  `planShifter` about 15 ms as it lists every chain), then `sentences.test.ts` 3.6 s. After
  the build skip, `node` for `npx`, the shifter draws in a file of their own and the unit and
  smoke tests at once (one worker, conductor short of memory): the smoke three 15.1 → 12.6 s,
  the unit run 9.0 → 6.9 s, `npm test` about 24 → 14 s.
- **Art and voice share the dev server's six HTTP/1.1 connections** (item 065). `<img>`
  requests rank below `fetch` in Chromium and starved behind the voice bank's twelve
  clip fetches (a battle sat in the Wait scene); `priority: 'low'` fetches are held
  back the same way. So art is fetched: high priority, 4 at a time, for a scene about
  to show; the default, 2 at a time, for the background; and the voice queue starts no
  new background decodes while a scene waits for its art. Aborting a slow fetch
  re-queues it at the back: with a 30 s timeout (6 s real at test speed 5) the
  slow-art test thrashed to a minute; the timeout is 2 minutes.
- **The cook-off fight test's decode aborts (fixed in item 069)** (checked 2026-10-20 11:48pm with main's
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
  then (2026-10-18; the build was adopted in item 079, above). Re-measured 2026-10-19 (item 036): one fight style through both battles 53 s on
  the GPU against 78 s in software, the fast lane 76 s against 82 s, so the GPU is now
  the default (`WW_GPU=0` for software). With the GPU's frame rate her walking keeps up
  at a faster clock: three slow tests (Battle part 2, the machine wrong-first, a warm-up
  seed) took 99 s at speed 3, 81 s at 4, 73 s at 5, all green, so the default is now 5.
  Three workers with `--fully-parallel` on the
  fast lane: 89 s against 82 s on one, so still one worker (superseded: 2 workers from
  item 061, 3 since item 079, above).
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

## Phaser facts that bit

- **A camera's `fadeEffect.isComplete` stays true after a `fadeIn`** (hunt 11): Phaser's Fade sets it
  when any fade ends, in either direction, and clears it only when the next fade starts. Fix 145's
  guard ("no F9 in the closing fade") read it, so from the battle's 300 ms opening fade-in on, F9 did
  nothing in every battle. A closing fade needs its own flag (`BattleScene.closeFade`).
- **A tween started over another on the same property keeps the value it started from** (hunt 11):
  the rhyme room's "said" bounce (scale 1.08, yoyo) began 200 ms into its card's pop-in, while
  Back.easeOut overshot to about 1.09, and yoyoed back to 1.09, so the card stayed 9% bigger. End
  such a bounce on its settled value (`onComplete`).
- **Tweens run on in a paused fight unless paused**: the move choice fades the fight back by setting
  alpha, and a looping alpha tween (a trap card's pulse) undoes it at once; the choice pauses the
  veiled things' tweens (hunt 11, fix 195).
