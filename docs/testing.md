# Testing

The lanes and their times are in the README, *Tests*. This file is how the suite works and
how to write for it.

## The suite serves a build

Playwright's server (`tests/vite.test.config.ts`, started by `tests/servers.ts`) runs
`vite build` (about 5 s) into `node_modules/.ww-test-dist`, leaving `public/` in place, then
`vite preview`, which serves `/art/` and `/voice-gen/` straight from `public/`. The build is
skipped when nothing it is built from changed (`tests/testBuild.ts`): `src/`, `content/`,
`index.html`, the vite configs, `tsconfig.json` and the lockfile are hashed into a stamp
beside the build (`.inputs`); the same hash next run reuses the build (about 0.3 s to
check). `WW_REBUILD=1` builds anyway. The server starts with `node`, not `npx` (every `npx`
costs about 2 s here, `node --import tsx` 0.3 s).

So a run tests the code as it was when it started: edits to `src/` or `content/` mid-run
reach no page under test, and a long run beside edits needs nothing set up. A spec edited
mid-run needs a rerun (Playwright loads spec files once). `public/` is served live, so art
written mid-run by `art:gen` can still reach a test. `WW_DEV_SERVER=1` serves the dev
server instead (hot reload; it reloads pages under edits). Test pages add `?hooks=1`, which
turns the test hooks on in a production build.

## Writing a browser test

- A test over about 10 s gets `SLOW` (`{ tag: '@slow' }` from `tests/harness.ts`); `--grep
  @slow` matches the tag, not the title. Keep one cheap test of a new feature untagged (the
  `test:browser` lane) and tag the rest. `SMOKE` (`@smoke`, `npm test`) stays at three tests
  of a few seconds; a new feature never adds a fourth.
- Before adding a slow test, look for a walk that already goes there and fold the check
  into it (a drawn cast's checks into the warm-up's seed sweep, random casts into the soak).
- A test that fails only on some draws is not flaky. Catch it with a 20-30-run
  `--repeat-each` and `--retries=0`. Take expectations from the bank (a stone's sound from
  the bank's `sounds`, as the room does: a doubled letter sounds as its single letter,
  `soundOf`; MB sounds as M). `?words=` only leans a draw; `?bridge=` forces. Room plans can
  be counted in plain node by calling `housePlan` under `globalThis.location = { search:
  '?room=…' }`, as `tests/variety/simulate.ts` drives the episode.
- **Art loads on demand:** a `?scene=` boot may pass through the Wait scene (`s.scene ===
  'Wait'`) while art loads, so wait for the scene you want, never for "anything but Boot".
  Every browser test fails on an `art: not ready` warning (`collectErrors(page, { voice,
  art })`, `art` on by default); the fight, pairs, story-fight and villains sweeps pass
  `voice: true` too, so a missing or undecodable line is an error there.
- **Forcing a key word:** seed the progress blob with `bag: { left: [word], round: 1 }`
  **and** `bagKnown: BAG_WORDS` (`tests/soundout.spec.ts`); without `bagKnown` the store
  tops the bag up with every word.
- **Pressing:** through the virtual pad (`press`), never `page.keyboard.press`: a key's down
  and up can land between two frames and Phaser's polled keys miss it.
- **A hidden tab:** `setHidden(page, hide)` fakes `document.hidden`, `visibilityState`, a
  `visibilitychange` and the window's `blur` / `focus`.
- `voice.history` keeps only the last 200 line ids (`src/voice/VoiceBus.ts`): a test slicing
  it from a saved length saves that length late.
- Throwaway specs live under `tests/`; a spec or config in the scratch home finds no
  `node_modules`.

## What the specs play

Every browser test plays the fixed default episode (the harness adds `cast=default`) and
its rooms play the sentence game (`games=sentence`) unless the URL asks otherwise (`seed=`
for a draw, `game=word_machine`, `games=all` for the real pool). `FORCE_PHONICS_ROOM` follows
the same rule: `games=sentence` and any `game=` keep the test's rooms; `games=all` gets
Charge the Spell or the Stretchy Bridge behind door a, and `SHIFTER_ROOM` the Shape-Shifter
behind door b, so `playRoom` and the bug-hunt checker play them.

Drawn casts: `tests/entry.spec.ts` (two seeds, bedroom to hub; also the warm-up's clue
levels, misses and F9), `tests/soak.spec.ts` (two whole episodes, seed 1 and the next draw,
Charge behind door a), `tests/drawn.spec.ts` (seed 19, the word machine behind door a and
the bridge behind door b, in a shared `beforeAll`), `tests/villains.spec.ts` (`?villain=elsa`,
`ozymandias`, `moriarty`, about 30 s each).

Rooms: `charge.spec`, `bridge.spec` (three help levels, a wrong picture), `shifter.spec`
(one room at base level, ~8 s; its pacing test slow lane), `rhyme.spec`
(`?scene=room&slot=a&room=rhyme`, three rounds with a miss, ~8 s), `machine.spec`,
`sentenceread.spec`, `digraphs.spec` (`?grab=<word>` picks the hall's word; each
multi-letter unit said once, as its sound), `ending.spec` (recap → THE END → only Dad's 2).
Also `lazyart.spec` (every picture slowed 150 ms: the hub waits, then opens complete),
`hiddenTab.spec` (the voice holds), `heights.spec`, `opening.spec` (a battle opening timed at
real speed). The hunt-named specs (`hunt4`–`hunt7`, `hunt10`, `hunt11`, `lenses`, `rulings`)
hold bug-hunt fixes; move a test to its subject's spec when you next touch it (CLAUDE.md).

Unit tests that guard content: `rules.test.ts` fails when `lines.json` is not what `voice:lines`
composes, or a built clip says older text (run `voice:build`); `qacategories.test.ts` holds
every line in `lines.json` to American spelling.

Shared steps in `tests/harness.ts`: `playRoom(page, opts)` / `playSentenceRoom` take a
`RoomPlay` (`{ wrongFirst, idleMs, wrongPauseMs, dadAway }`); `playChargeRoom`,
`playBridgeRoom`, `playShifterRoom`, `playRhymeRoom`; `chooseWrong`, `toParentAndBack` (F9 out,
red back), `dadLock(page, on?)`, `seedSolidFrames(page, extra)` (before `boot`), `toTheEnd`,
`playAgain`. `leaveBedroom` plays the entry hall's warm-up too unless given `{ grab: false }`.

`playEpisode` checks each battle part's length (40-120 s of simulation time) for whatever
fight style the cast drew. `tests/fights.spec.ts` (slow lane, about 10 s a style at speed
10, `-g cook_off` for one) plays each contest one part; the brawl is the default episode's
own. Evil Moriarty's `magic_show` brawl is left to `villains.spec`: booted straight into
part 2 it runs under the floor. `tests/storyFight.spec.ts` plays the story fight against Evil
Smaug (about 10 s a part, plus no ally and a dad ally); its walks are answered with
`__ww.place` onto `battle.story.walk.spot`. Shots land in `tests/screenshots/fights_*`,
`story_*` and `pairs_*` (ignored).

**Every ally × villain pair:** `npm run test:pairs` (about 35 s a pair on three workers;
about 1 h for all). Off unless run by that script or with `WW_PAIRS` set; otherwise
`pairs.spec.ts` shows one skipped test. An npm script cannot set `WW_PAIRS` under cmd, so the
spec reads `npm_lifecycle_event` (`test:pairs`) as `WW_PAIRS=+`. `WW_PAIRS` is a substring of
`<ally>+<villain>` (`WW_PAIRS=scar+ npm run test:pairs` one ally, `+elsa` one villain); add
`--fully-parallel` to spread one run over the workers. A test's title is `<ally> + <villain>:
…`, so several allies: `WW_PAIRS=+ npx playwright test tests/pairs.spec.ts -g "(elsa|anna) \+ "`.
Never beside art generation (the machine ran out of memory).

## Speed, GPU and workers

The page's clocks run 5× fast (`WW_SPEED`, default 5): timers, tweens, the game loop and
voice playback. `setSpeed(page, k)` changes it mid-run; `playEpisode(page, speeds)` sets it
per part. Whole episodes and `fights.spec` play battles at 10 (`BATTLE_SPEED`,
`WW_BATTLE_SPEED`; a run setting only `WW_SPEED` gets it for battles too). Real pacing is
three `@slow` tests in `tests/episode.spec.ts` at speed 1 with real voice and walking: the
title, bedroom and warm-up; a sentence room (`?scene=room&slot=a`); battle 1 at full length.
`WW_SPEED=1 npm run test:browser` runs the lane at real time.

Test-only shortcuts (tests assert on state and line ids, not audio or walking):

- **Instant voice**, `?voice=instant`, which `boot` adds: no audio, and a line ends once
  `__ww.state()` has reported it speaking (`VoiceBus.seen`), so `until` on `voice.speaking`
  still sees every line. `until` polls every 50 ms (`WW_POLL_MS`). Real voice: `boot(page,
  query, speed, { voice: 'real' })`, any `qa=1` boot, a file setting `VOICE.mode = 'real'`,
  or `WW_VOICE=real` for a run.
- **Teleport**, `__ww.place(x, y)`: her position in a room, or her hero in an open move
  choice. `choose` and the pad pick land that way; `driver.walk = true` steers instead, and
  `walkTo` / `stick` always steer (tests about walking).
- **A fighter's height**: `state().battle.heroes[i].drawn` (and `villains`), never `qaLayout`
  bounds (moving squashes a card up to 7%). A dad's head-to-soles height is `drawn ×
  ADULT_FILL[art]` (`src/config.ts`), hers `drawn × outfitFill(art)` (`src/rules/heights.ts`).
- **Timing at real speed**: boot with `{ voice: 'real' }` and read game time, not wall time
  (`performance.now()` in the page is warped; `state().battle.t` is the battle's clock).
  `?warmup=1` puts the warm-up's word first in a battle boot's fetched things (a second boot
  with `fetched=` copied from the first draws other rooms: the list feeds the draw). A cold
  `?scene=room` boot loads its voice as the room opens, so a visit measures 3 to 4 s long:
  warm it first (F9 for 2 s and back) or time it inside an episode, same seeds before and
  after.
- **Short battle**, `?battle=short`: the director's waits at a fifth (`SHORT_BEATS`); combo,
  ultimate and finish keep their length. Fails `expectFightLength`, so fights, whole
  episodes and pairs keep the full length.

The voice and art fetch timeouts run on the wall clock (`src/realTime.ts`; the harness
keeps the real `setTimeout` as `__wwRealSetTimeout`), so a sped-up clock does not abort
fetches. Load still stretches a Charge round's game time beside a second worker, so the
snappy round in `charge.spec.ts` asserts its limits only on one worker; elsewhere it logs a
`timing` annotation. Timing run: `npx playwright test tests/charge.spec.ts -g snappy
--workers=1`.

The browser draws with the GPU (full `chromium`, `--use-angle=d3d11`; `gpuProjects` in
`tests/gpu.ts`, every config's one project: 1280×720 and
`--autoplay-policy=no-user-gesture-required`): battles at ~56 fps against software GL's
11-18. `WW_GPU=0` goes back to software GL (one worker, so the Charge timing asserts there).
Three workers on the GPU (`playwright.config.ts`); `WW_WORKERS=<n>` for a run (`1` when memory
is short). Files go to workers in name order and two tests of one spec never run at once
(`fullyParallel` was slower); `WW_EPISODES_FIRST=1` lists the whole-episode specs first. A
run that times something wants `--workers=1`. A plugged-in pad can drive the GPU browser
(*Bug-hunt checker* in `docs/tools.md`).

## Ports and servers

The suite serves on 5184 (`TEST_PORT`, `src/port.ts`), never the dev port 5174, and fails at
once if 5184 is busy rather than test the wrong code. With `CONDUCTOR_PORT` set it serves
there instead, so a conductor run needs nothing started by hand. Never serve vite yourself
from Claude Code and point `WW_BASE_URL` at it: a backgrounded server dies at its background
timeout, mid-suite. Run the Playwright process itself in the background; its server lives as
long as the run. `WW_BASE_URL` is for a server you keep running yourself.

Side tools' ports: shots 5194 (`SHOTS_PORT`), the checker 5195 (`QA_PORT`), perf 5196
(`PERF_PORT`); none falls back to `CONDUCTOR_PORT`.

**Two runs in one worktree** need their own port, build folder and output folder:
`CONDUCTOR_PORT=<free port> WW_TEST_DIST=node_modules/.ww-test-dist-<tag> npx playwright
test <spec> --output=test-results-<tag>`. `npm test` empties `test-results/` as it starts,
so keep nothing there.

**Stopping a backgrounded run leaves it running:** stopping the shell kills neither `node
…@playwright\test\cli.js`, its workers nor the `vite` it serves, which keeps the port (the
next run fails with "5184 is already used"). Find them by command line (PowerShell
`Get-CimInstance Win32_Process | ? CommandLine -like '*<worktree>*'`, or `netstat -ano |
findstr <port>`), check they are this worktree's, and stop them.

**A timeout "waiting for title" with `scene=` empty** never got past boot loading: usually a
loaded machine (`(Get-CimInstance Win32_Processor).LoadPercentage`). Rerun those tests alone
before suspecting the code. On the dev server, "Execution context was destroyed" is a reload
under edits. On the GPU, vite's terminal shows `voice: could not decode ... Failed to fetch`
when a test ends mid-decode: harmless.

**Known flakes:** `banner.spec` "the widest fetch / counter sentence" (the dialogue box 20 px
over Dad) fails about one run in six and passes on the retry; `test:slow` reports it flaky.
`charge.spec` "M83: the battle's runes leave a 250 ms beat" (real voice) measures gaps from
about 170 to 600 ms run to run; 7 of 11 attempts had one under 240 ms (Nov 16), so it
often fails `test:browser` retry included. The gap below 250 ms may be a real miss of the beat, not only the test.
Hunt 13: a whole Charge episode at `WW_SPEED=1` had no rune gap under 200 ms, while every speed-5 sweep logs
160 to 200 ms ones: most likely the warped test clock, not play.
