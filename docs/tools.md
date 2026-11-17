# Tools that are not tests

`npm run perf`, `npm run shots` and `npm run qa` each have a Playwright config of their own
behind an npm script; arguments go after `--` (`npm run qa -- -g "qa seed101$"`). All draw
on the GPU (`gpuProjects`, `tests/gpu.ts`; `WW_GPU=0` for software GL), on one worker. Perf
and the checker serve a build like the suite, each into its own folder
(`node_modules/.ww-perf-dist`, `.ww-qa-dist`; skipped when unchanged, `tests/testBuild.ts`);
`PERF_DEV_SERVER=1` / `QA_DEV_SERVER=1` serve the dev server instead. Shots serve the dev
server from `tests/vite.nowatch.config.ts` (no file watching, so edits wait for the next
run). In a conductor item the suite serves on `CONDUCTOR_PORT`, so give a tool that port only
when no test runs beside it, else another free one; "port already used" means a clash.

Scripts that import game code live in the worktree, never the scratch home (README,
*Operational facts*). Output goes to the scratch home (README, *Storage*).

## Boot timings: `npm run perf`

About 30 s on the build. Times page load to the title and to a quiet hub (`?scene=house`:
input free, nobody talking, still 0.6 s later), each from a fresh browser context, median
of `PERF_RUNS` (5), and the art each fetched. Port `PERF_PORT`, else 5196; `PERF_DIST=<dir>`
builds into another folder. Baselines: `docs/engineering.md`.

## A server's voice for a cast

`PROBE_URL=http://localhost:5174 PROBE_CAST='?ally=jasmine ?villain=jasmine' npx playwright
test -c tests/perf/castVoice.config.ts` plays a whole episode per cast with real voice
against a server it does not start (default `http://localhost:$CONDUCTOR_PORT`;
`PROBE_WORKERS=2` for a long list). Each cast prints a `PROBE {…}` line: Wait screens, every
line that waited for its decode (`lateLines`: over 250 ms or no audio) and fetch timings. A
healthy server shows none (about a minute an episode). `__ww.state()` carries the same
(`waits`, `voice.waits`).

## Screenshots: `npm run shots`

- `SHOTS_TAG=<tag> npm run shots -- shots.pw`: the bedroom, hub, a side room and the victory
  for four casts, and a battle to its first move choice, one shot shortly after every line
  starts, into `ui_shots/<tag>/` (about 5 minutes; `-g bedroom` for one scene). Without a
  file name it plays the battle shots too (long: about a minute a test).
- `SHOTS_TAG=<tag> npm run shots -- polish.pw`: both battles for thirteen casts across every
  fight style (`CASTS` in `tests/shots/polish.pw.ts`), a shot every 1.5 s and at each phase,
  into `polish_034/<tag>/`, with each battle's voice history and any line said twice running
  (`*_voice.json`), the dads' heights in each scene and Pig Curse's callout; clocks at
  `WW_SPEED=2` unless set, `-g <cast>` for one cast. Name the file
  (`polish.pw`): a worktree path ending `_polish` matches the bare word.
- `npx tsx tests/shots/sheet.ts <beforeTag> <afterTag> <out.png>` puts two runs side by side;
  `npx tsx tests/shots/contact.ts <tag>` makes a contact sheet per battle
  (`polish_034/<tag>_sheets/`).
- Port `SHOTS_PORT`, else 5194. Killing a shots run's Playwright process leaves its vite on
  the port: stop it too.
- To shoot "before", run from a second worktree at the base commit (junction its
  `node_modules` and `public/voice-gen` to this one's). Unlink those junctions (`cmd /c rmdir
  <path>`) before `git worktree remove --force`, so nothing is deleted through them.
- Moving candidates can be recorded as looping WebPs (a shots spec plays each at real time,
  sharp joins the frames); conductor's picker plays animated WebPs. Git history has a model
  spec (`tests/shots/ambience.pw.ts`).
- The bubble pops in over 180 ms: wait half a second after a line starts before a shot.

## Variety across many episodes: `npm run variety`

`npm run variety -- --episodes=300 --seed=1` (about 1 s per hundred episodes, no browser)
plays drawn episodes on one progress store through the episode's own draws
(`src/episode/draws.ts`, `plans.ts`), answering for her (`--right=0.85` right first time). One
row per dimension (words per game, phonics, frames, voice variants, pictures, cast, places,
games, fights, items), worst first: pool, how many came up, median gap, share back within 2
episodes, most drawn against the mean, never drawn. `--json=<file>` keeps the rows with each
item's `counts`; `--only=<name,…>` narrows. Below: the Shape-Shifter's visits (short ones,
ones changing all three places), episodes whose door a, door b or attic game came straight
back, every action word shown as a picture to pick, and stored words drawn; any of the last
three above 0 exits 1. `Math.random` is seeded, so a seed replays; any change to a draw or
the bank moves every later episode, so compare the same seeds before and after. A per-visit
share is steadier than a raw count.

**A before run** needs no checkout: `mkdir -p node_modules/.ww-before && git archive <commit>
| tar -x -C node_modules/.ww-before`, then run `npx tsx tests/variety/simulate.ts` inside it
(it finds the worktree's `node_modules` above it).

**The Shape-Shifter's words:** a word's share follows the word graph (`SHIFT_WORDS`, a link a
one-letter change between non-look-alikes), not draw weights. Before adding words, measure
the graph's components, longest chains and which words the best four-link chains hold; a
dense grid (CAN CAP CAT MAN MAP PAN) holds most chains. Per-word share: `--json=`, then a
word's `counts` in "shifter words (start and links)" over `shifterLinks`. A bank word's
`glyph` must not be a journey-map stop's (🌅 ⚔️ 🏆, 🏠 at home): `planInput` counts it as shown,
so it is never a key word. BED is never a key word or the counter (her bed is in the
bedroom, `notKeys`); other games read it.

## Listening through the sounds: `listen.html`

**http://localhost:5174/listen.html** (dev server; `npm run preview` serves it too): a plain
page, no Phaser, to check every phonic sound by ear. A short set of live words
(`src/listen/words.ts`) covering every sound a live word sounds out: the newest takes' words
first, then a greedy cover, then more words for the hard sounds (`HARD`) until each is heard
twice where the bank allows. Each word plays as the game sounds it out (a unit at a time,
letters lit, `SOUND_GAP_MS` between), then whole; **Play all**, a word's ▶ or a sound's chip;
Esc stops. Each chip shows its clip's `provider` (dashed for edge-tts) and NEW for the latest
import. Sounds with a line but in no live word are listed below. It plays the built clips, so
run `voice:build` after an import; under `npm run preview` build again too, or use the dev
server. `tests/unit/listen.test.ts` checks the cover.

## The bug-hunt checker: `npm run qa`

`QA_TAG=<tag> npm run qa` plays whole episodes at clock speed 5 across casts, dads' forms,
places, every fight style, the word machine, wrong answers, dad lock, seeded progress and
episodes back to back (`SCENARIOS` in `tests/qa/qa.pw.ts`). It records, it does not test:
about 1.5 minutes an episode, 26 minutes the first batch. Batches: `QA_SET=quick` (three),
`more`, `new`, `lenses`, `recent`, `cast`, `hunt8` … `hunt13`, `all`; what each plays and
the checks each hunt added: `docs/qa-findings.md`. A scenario outside the first batch needs
its set (or `QA_SET=all`) even with `-g` (`QA_SET=recent -- -g "qa variants6$"`), else "No
tests found"; its batch is its `batch` field (none: the first batch; `quick: true` adds it to
the quick three), and a new hunt's batch is a new name in `BATCHES` plus an entry in
`docs/qa-findings.md`. Known issues and Matt's calls are in `docs/qa-findings.md`; a hunt
reads it first and does not re-report them.

**Running it**

- Port 5195 (`QA_PORT`); in a conductor item `QA_PORT=$CONDUCTOR_PORT`, and a test run
  beside it needs another port. A second sweep beside a long one needs its own build and
  port (`QA_DIST=node_modules/.ww-qa-dist2 QA_PORT=<free port>`) and every sweep its own
  `QA_TAG` (the output folder `test-results/qa-<tag>` is emptied as a run starts).
- `--workers=3` alone still plays one scenario at a time: add `--fully-parallel`.
- **Never run a second browser run beside a sweep:** the second GPU browser starves the
  first and scenarios time out at boot. Sweep on a quiet machine; a busy one makes voice
  fetches time out (`voice-silent`).
- **Stopping a sweep part way** leaves its workers, browsers and `vite preview` on the port.
  Find the server with `Get-NetTCPConnection -LocalPort <port> -State Listen` and the workers
  by command line (`node_modules\playwright\lib\worker\workerProcess` under this worktree);
  `taskkill /PID <pid> /T /F` those. Other items' browsers are not yours.
- **A game controller plugged in can play along:** the GPU browser reads a real pad, and a
  drifting stick walks her off where the driver put her. `choose` walks her back before green
  (up to three times when 80 px or more off) and `hubGo` presses a door again; still, sweep
  with the pad unplugged.
- **A busy child and the driver:** the mash scenarios' yellow waits while the driver answers
  (`driver.busy`).
- **Silent lines at speed 5 are a look, not a bug:** lines still `queued` or `decoding` play
  silent. Check at real speed first: `WW_SPEED=1 QA_TAG=<tag> npm run qa -- -g "qa
  seed101$"` (about 7 minutes); several real-speed episodes need `--timeout=6600000`.
  `failed`, `none` and `suspended` are bugs at any speed.
- A scenario shoots at most 400 shots an episode (`Recorder`'s `max`); past it the run goes
  on unshot, which looks like a hang. A wedged page reads "(the page stopped answering)":
  the stall's shot, recorder and probe read are bounded at 20 s each.
- `npx tsx tests/qa/report.ts <tag>` merges issues into `qa/<tag>/summary.md` (bugs first,
  each with a shot) with frame and heap tables and contact sheets in `qa/<tag>/sheets/`;
  minutes for a big sweep, so background it.
- **One moment instead of a sweep:** `QA_LOOK='scene=house&cast=default' QA_LOOK_S=30
  QA_LOOK_GREEN=0` records that URL for 30 s into `qa/<tag>/look/`.
- **Choice mode and a keyboard child** (hunt 13): a scenario's `choice` plays every episode
  through choice mode (`via: 'title'` blue, or `'bedroom'` Dad's 2; `back` presses red on the
  villain cards), with `pick-self`, `pick-name-silent`, `pick-cast` and `pick-recent` issues;
  `pick` is a probe point. `keys` makes a `mash` child also peck A-Z, 3-9, Shift and Tab. The
  busy child holds off at the title and in the picks (blue there opens choice mode and red
  leaves it: a grown-up's).

**What it checks** (`tests/qa/checks.ts`, `tests/qa/wording.ts`), at each moment shot (each
scene change, line, round, move choice, battle phase, victory line, the recap; about 150 an
episode in `qa/<tag>/<scenario>/`): words off screen, lower-case, tiny or overlapping text, a
target under the dialogue box, placeholder art; the key word or machine word said or shown
early; `voice-no-line`, `voice-silent` (with why: `queued`, `decoding`, `failed`, `none`,
`suspended`), `voice-unbuilt`, `voice-stale`, `voice-no-clip`; console warnings; input locked
over 20 s (Charge 68 s) or silent over 2.5 s; frames over 250 ms; objects, tweens, timers and
listeners growing between episodes; stalls; `art-late` (art asked for before it loaded);
Matt's categories where automated (`not-american`, `giveaway`, `clipped-line`, `slow-room`
against `ROOM_BUDGET_MS`). Each `<scenario>.json` carries the transcript (`said`) and
`repeated` (lines said more than twice, letter sounds, words, prefixes and move-choice lines
left out). The probe (`src/qa/probe.ts`, only with `?qa=1`) adds the voice log, frame times,
lock stretches, missing art, console capture and `layout()` / `counts()` on `window.__wwqa`.

**Retention:** each sweep prunes `qa/` first (`tests/qa/prune.ts`, the config's
`globalSetup`; `QA_PRUNE=0` skips, `npx tsx tests/qa/prune.ts --dry` lists). It keeps every run of the last three hunts
(the starting sweep counted), any run a kept hunt cites (`qa/<tag>/`, `QA_TAG=<tag>` or
`` `<tag>` `` in a kept `summary.md` or those hunts' sections of `docs/qa-findings.md`), and
runs outside a hunt no older than the oldest kept hunt's first run. A kept hunt whose
rulings have landed (its `## Hunt <N>` section written, every *Matt's calls* row's Ruling
filled) keeps only each run's `summary.md`, JSON and cited shots. **Write a ruling into every
row** (an empty cell keeps the hunt's tens of GB), and write the calls rows before committing
a hunt's section mid-run (a section with no calls table counts as ruled). **Name a hunt's
tags `h<N>…`** (`h12a`): the number ties a run to its hunt. A look worth keeping past three
hunts belongs in a report or `docs/`.
