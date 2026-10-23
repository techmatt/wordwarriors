# Word Warriors

A learn-to-read game for a four-year-old: phonics minigames that power up flashy mock
battles between her favourite characters. Phaser 3 + TypeScript + Vite.

## Run it

```
npm ci
npm run dev
```

`npm ci` installs exactly what `package-lock.json` pins (about a minute). A fresh checkout
or conductor worktree has no `node_modules/` and needs it first: without it `npx tsc` lands
on npm's "this is not the tsc command you are looking for" stub and `npx tsx` cannot find
`@playwright/test`. `npm install <pkg>` only when adding or bumping a dependency,
committing the lock file.

Then open **http://localhost:5174** in Chrome or Edge and press F11 for fullscreen. Plug
the Xbox 360 pad in first; press green (A) on the title screen. The keyboard works too:
arrows to walk, Space/Enter for green, Tab for yellow (say it again / hint), Esc for red, 3 for blue, and the
backquote / tilde key for dad lock (`docs/episode.md`, *Dad lock*). The number keys **1** (no) and **2** (yes) are
Dad's, for the games that ask him whether she said it (`docs/episode.md`, *Dad buttons*);
at the end of an episode her green takes the recap to a **THE END** screen (item 085: this
episode's hub full screen, her heroes on it), and only Dad's **2** starts the next one there
(her buttons and Dad's 1 do nothing, so she never starts a new episode without a grown-up).
Key **0** toggles **minigame debug mode** in any game room (the hub, the warm-up, a side
room or the attic), in real play as in dev builds and under dad lock too: a small DEBUG tag
shows top left, the room's own things go, its door out is open, and one pedestal per
minigame stands there; green at one plays it, and finishing puts a ✔ on it. Nothing played
there counts (no progress, word bag, rotations or recap, nothing on the grown-ups page);
0 again brings the room back (`docs/episode.md`, *Minigame debug mode*).

**Free play** (item 060): wherever she is free to move and no answer is open (the rooms,
the bedroom once she is awake, the hub, the battle's fight outside a move choice), her
character has toys. Green jumps: a tap hops, a hold goes higher and floats down. Blue
(the **3** key), red (Esc) and yellow (Tab) cast: blue bolts, red sparkle stars, yellow fun
things (stars, hearts, snowballs; the chef throws donuts and cookies, the knight sword
flashes and gold stars). A tap is one shot; a hold charges a big one. A button that
means something there keeps its meaning (green on a door, sign or thing in reach; yellow
says it again where there is something to say). It is pure play: it never changes an
answer, a battle or what a scene does. Dad lock silences it. At most
`FREE_PLAY.maxShots` shots fly at once (one more and the oldest just goes); the knobs are
`FREE_PLAY` in `src/config.ts`. Blue is a number key, not Shift, because five Shift
presses in a row open Windows' Sticky Keys dialog (amendment 1579); the game binds
nothing to Shift.

**Sound:** browsers keep audio off until a click or key press, and it is not confirmed
that a gamepad press counts. While sound is still off, the title shows a small grown-up
note; one mouse click (or Space) turns it on. To skip that entirely, open the game in a
Chrome started with `--autoplay-policy=no-user-gesture-required`, e.g.
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required --user-data-dir=%TEMP%\ww-chrome http://localhost:5174`.

The first install on a machine also needs Playwright's browser for the tests and
the art painter: `npx playwright install chromium chromium-headless-shell`. The
Playwright browsers are per machine, so a worktree does not need them again.

## Playing an episode

Title → bedroom (a dad wakes her: the helper, the villain) → the entry hall's warm-up →
the quest place (the hub: the gift word, two side-room doors, one of them Charge the Spell
or the Stretchy Bridge) → battle part 1 (too strong, retreat) → the hub again (the attic's
counter word) → battle part 2 → the victory scene → the recap → THE END (Dad's 2 plays
again). Selection is walking everywhere; yellow (Tab) says it again or hints.

**[`docs/episode.md`](docs/episode.md)** walks through every step, who is in an episode
(the cast draw, `EPISODE_DEFAULTS`), dad lock and Dad's buttons, Charge the Spell, the
Stretchy Bridge and held sounds, the dev keys and `?scene=` URLs, and difficulty and
variety (`DIFFICULTY`, `VARIETY`).

## Tests

Three commands (times on this machine, the GPU, three workers; how each got there, item by
item: `docs/engineering.md`, *Browser and tests*):

- **Fast lane, after every change: `npm test`** (about 14 s on one worker, item 105, against about 24 s one after the
  other; 21 s on three workers before it, not yet timed on three since): the unit
  tests (about 7 s alone) and, at the same time, the three browser tests tagged `@smoke`
  (`SMOKE` in `tests/harness.ts`): the title and the grown-ups page, the hub's free play, and
  a sentence room's banner. `tests/fastLane.ts` runs both, streams the browser side and
  prints the unit tests' output whole when they end; it fails if either fails, and passes its
  arguments to Playwright (`npm test -- --workers=1`). The browser side stops itself at 2
  minutes (`--global-timeout`). `npm run test:unit` runs the unit tests alone.
  `npm run typecheck` checks `src`, `tests`, `content` and `tools` (both tsconfigs, about
  2 s; `npm run build` runs it first), which the tests do not.
  `tests/unit/plansGolden.test.ts` pins the house plan's seeded draws (every minigame kind
  behind each door; item 091) against `plansGolden.json`: a refactor leaves it green. A
  change meant to alter the draws rewrites the JSON on purpose, from the worktree root:
  `npx tsx -e "import('./tests/unit/plansGolden.ts').then((m) => require('node:fs').writeFileSync('tests/unit/plansGolden.json', JSON.stringify(m.goldenDraws(), null, 1) + '\n'))"`.
- **Before a commit: `npm run test:browser`** (about 95 s, 52 tests, one of them the skipped
  pairs placeholder, item 117; 24 tests and 50 s in item 079) plus the specs that cover
  what changed (`npx playwright test <spec>`, both lanes of it). `test:browser` is every
  browser test not tagged `@slow` (the smoke three among them): one of each newer room
  (the bridge at level 3, a Charge round, free play's shots and jump, the word machine
  opening), the cover check on Smaug's counter banner, the two layout checks, title and
  the grown-ups page, a solid sentence frame, dad lock, a key held through a scene change,
  Spell the Spell, the cast and fight-style overrides, never last episode's victory scene,
  and the three text-fit checks. It stops itself at 6 minutes, so a hang fails inside
  Claude Code's 10-minute background cap instead of being killed by it.
- **Everything: `npm run test:all`** (about 6.3 minutes at item 105's 136 browser tests; 149
  since item 116): the unit tests, then every browser test. The slow lane alone is
  `npm run test:slow` (about 5 minutes at item 105's 86 tests; 97 since item 116: the story
  fight, the new villains' episodes, solo mode): every test tagged `@slow`. Its longest (item 105): the soak (67 s,
  Charge the Spell's whole episodes too), real-time battle 1 (67 s), the real-time title,
  bedroom and warm-up (56 s), the default whole episode at speed (32 s), the real-time
  sentence room (28 s), the Shape-Shifter's yellow-and-green mash (19 s), the shared drawn episode (`tests/drawn.spec.ts`, the
  word machine and the bridge), and each contest fight style's one part at clock speed 10
  (10 s). The test-only shortcuts that keep it there: *Speed, GPU and workers*. Not run by
  default (Matt, 2026-10-20): only when clearly needed, such as a change touching every
  scene. Files go to workers in plain name order (`WW_EPISODES_FIRST=1` puts the
  whole-episode specs, `episode`, `soak` and `drawn`, in a project listed first; item 085
  timed it slower).

**The suite serves a build** (item 079, `tests/vite.test.config.ts`): Playwright's server
runs `vite build` (about 5 s; into `node_modules/.ww-test-dist`, leaving `public/` where it
is) and then `vite preview`, which serves `/art/` and `/voice-gen/` straight from `public/`.
The build is skipped when nothing it is built from changed (item 105, `tests/testBuild.ts`):
`src/`, `content/`, `index.html`, the vite configs, `tsconfig.json` and the lockfile are
hashed by content into a stamp beside the build (`.inputs`), and the same hash next run
serves the build already there (about 0.3 s to check). `WW_REBUILD=1` builds anyway. The
server starts both with `node`, not `npx`: on this machine every `npx` costs about 2 s
before the tool starts, `node --import tsx` 0.3 s (item 105).
On the dev server every page boot fetched a few hundred modules transformed on request,
and with two workers boots and voice fetches stretched: the before-and-after is in
`docs/engineering.md` (the text-fit caption test 66 s on the dev server, 6 s on the build; the
solid-frame test 28-57 s and flaky, 5 s). A build also means edits to `src/` mid-run reach
no page under test, so a long run beside edits needs nothing set up. A run tests the code
as it was when the run started. `WW_DEV_SERVER=1` serves the dev server instead (as before
item 079), for a run that wants hot reload or to rule the build out.

Item 079 measured the old dev-server lanes from a cold worktree too: the first run after
`npm ci` (vite optimising its dependencies, nothing transformed yet) took the then fast
lane to its 6-minute cap with three tests failing at "waiting for booted; scene=". The
build has no cold start of that kind.

### Writing a browser test

A new browser test that takes more than about 10 s gets `SLOW` (`{ tag: '@slow' }`, from
`tests/harness.ts`) as its options; `--grep @slow` matches the tag, not the title. Item 061
found the fast lane at 7.8 minutes because 19 tests over 10 s (most of `cover`, `freeplay`,
`bridge` and `charge`) had come in untagged; keep one cheap test of a new feature in the browser
lane (`test:browser`) and tag the rest. `SMOKE` (`@smoke`, `npm test`) stays at three tests of a few seconds
each (item 079): a new feature gets an untagged test in `test:browser`, not a fourth smoke
test. A test that fails only on some draws is not flaky: the bridge's
level-1 test failed whenever it drew EGG (it expected `letter_gg_sound`; a doubled letter
sounds as its single letter, `soundOf`) and passed on the retry's other draw; the level-3
test the same way on THUMB and LAMB (MB sounds as M; item 072: the spec now takes each
stone's sound from the bank's `sounds`, as the room does). Before adding
a slow test, look for a walk that already goes there: item 036 took the full run from 45
minutes back down by folding new checks into walks that were already played (a drawn
cast's bedroom checks into the warm-up's seed sweep, the random-cast episodes into the
soak and the word machine's episode, the brawl's checks into every whole episode).

**Art loads on demand** (item 065): a test that reaches a scene with `?scene=` may pass
through the Wait scene (`s.scene === 'Wait'`) while that scene's art loads, so wait for
the scene you want, never for "anything but Boot". `tests/lazyart.spec.ts` (the browser lane, `test:browser`)
slows every picture by 150 ms and checks the hub waits, then opens with nothing missing.
A browser test fails on any `art: not ready` warning (`collectErrors(page, { voice, art })`;
`art` defaults on). The fight and pairs sweeps (`tests/fights.spec.ts`, `pairs.spec.ts`)
pass `art: false` on purpose: the art check there is deferred.

To force a key word, seed the progress blob with `bag: { left: [word], round: 1 }` **and**
`bagKnown: BAG_WORDS` (`tests/soundout.spec.ts`): a blob without `bagKnown` counts as one
from before item 035, and the store tops the bag up with every word added since (item 048).

### What each spec plays

Every browser test plays the fixed default episode (`tests/harness.ts` adds
`cast=default`) unless its URL asks for a draw (`seed=`): drawn casts walk from the bedroom
through the warm-up to the quest place in `tests/entry.spec.ts` (two seeds; four until
item 081), and three whole random episodes play in the slow lane, two in `tests/soak.spec.ts`
(seed 1 and the draw after it) and one in `tests/drawn.spec.ts` (seed 19) (item 025), plus
one per item 115 villain in `tests/villains.spec.ts` (`?villain=elsa`, `ozymandias`,
`moriarty`, a drawn cast round each, about 30 s apiece).

The same way, every browser test's rooms play the sentence game (the harness adds
`games=sentence`) unless its URL asks for a game (`game=word_machine`) or the whole pool
(`games=all`). `FORCE_PHONICS_ROOM` follows the same rule: the harness's `games=sentence`
and any `game=` keep the test's own rooms, while `games=all` (the real draw) and the
game itself get Charge the Spell behind door a, so `playRoom` and the bug-hunt checker
play it (`playChargeRoom`: wait for the read, then Dad's answer); `tests/charge.spec.ts`
covers the room, the dad key, dad lock, the read's timeout, the round's length and the
runes in battle (items 053, 059). The forced room is Charge the Spell or the Stretchy Bridge at random, so
`playRoom` and the bug-hunt checker play the bridge too (`playBridgeRoom`: slide across
with the stick, Dad's yes where he is asked, the right picture); `tests/bridge.spec.ts`
covers its three help levels and a wrong picture (item 054). `FORCE_SHIFTER_ROOM` follows
the same rule for the Shape-Shifter behind door b (item 096): `playRoom` plays it
(`playShifterRoom`: each link's right picture or stone, a wrong one first with
`wrongFirst`), and `tests/shifter.spec.ts` plays one room through both beats at base level
(untagged, ~8 s; its pacing test is slow lane). `tests/hunt6.spec.ts` (item 102) keeps the sixth hunt's Shape-Shifter
fixes: the lit letter's pulse, the next link's options clear of her, yellow and green mashed
through misses and morphs, the grown-ups page at each point of a link, dad lock and key 0,
a level-1 stone reached while a line plays, Dad's 2 in the frame key 0 leaves a debug Charge
read, and THE END's tallest grown-up under its title. `tests/hunt7.spec.ts` (item 116) keeps the
seventh's: her outfits for items 111 and 114's allies at her dress height and yellow mashed
at the story fight's gold grab (slow lane), and Charge back from the grown-ups page asking no
rune art the word lacks (fix 124, browser lane).
`playRoom(page, opts)` and `playSentenceRoom(page, opts)` take a `RoomPlay`
(`{ wrongFirst, idleMs, wrongPauseMs }`: a wrong answer first; in a sentence room a stand
at the key word and a pause after the wrong object). Other shared steps in
`tests/harness.ts`: `chooseWrong(page)` (a wrong object in the find pass, then the retry
open), `toParentAndBack(page)` (F9 out, red back), `dadLock(page, on?)` (set or read the
lock) and `seedSolidFrames(page, extra)` (every fetch frame solid, before `boot`).
`tests/machine.spec.ts` opens the word machine in the browser lane (`test:browser`), and in
the slow lane plays whole visits (a silly tile first, F9 out and back) (item 026).
The newer rooms' whole episodes share walks (item 081): `tests/drawn.spec.ts` plays one
drawn episode with the word machine behind door a and the bridge behind door b
(`?game=word_machine&room=bridge`) in its `beforeAll`, and a test for each room checks
its own; the soak's two episodes have Charge the Spell behind door a (`room=charge`; door b
a sentence room) and check it in each.

`leaveBedroom` also plays the entry hall's
warm-up (item 033) unless given `{ grab: false }`, so a test that walks out of the bedroom
lands in the hub as before; `tests/entry.spec.ts` (slow lane) plays the warm-up itself:
each level's clue, three misses, F9 out and back, and two drawn casts from the bedroom.

`playEpisode` checks each battle part's length (45-120 s of simulation time) for whatever
fight style the cast drew; `tests/fights.spec.ts` sweeps the contests, one battle part
each (item 083, alternating: the race and the beam clash part 2, the race for its finish
line; the rope pull and the cook-off part 1; both parts until then; item 115's frost clash
and space race part 1), and the brawl is the default episode's own. A brawl with its own id
(Evil Moriarty's `magic_show`) is left to `tests/villains.spec.ts`'s whole episode: booted
straight into part 2 it ran 44.5 s, under the floor, where in an episode it passes.

Item 085's specs: `tests/digraphs.spec.ts` sounds KING and SHELL out in the entry hall
(`?grab=<word>` picks the hall's word) and checks each multi-letter unit is said once, as
its sound, never its letters; `tests/sentenceread.spec.ts` plays the sentence room's
single-green read, then a wrong and a right picture; `tests/ending.spec.ts` the recap →
THE END → only Dad's 2. Tests reach THE END with `toTheEnd(page)` and leave it with
`playAgain(page)` (`tests/harness.ts`). `voice.history` keeps only the last 200 line ids
(`src/audio/VoiceBus.ts`), so a test slicing it from a saved length saves that length late.

`tests/lenses.spec.ts` (item 080) keeps the third bug hunt's fixes: a held F8, the
grown-ups page under dad lock, the lock badge after a resize, a hidden tab holding the
voice (it fakes the tab switch: `document.hidden` and a `visibilitychange`, which is what
Phaser and the game listen for), and the move choice's stick hint under dad lock (slow
lane). Press a button through the virtual pad (`press`), not `page.keyboard.press`: a
key's down and up can land between two frames, and Phaser's polled keys miss it.

### Speed, GPU and workers

The browser tests run the page's clocks 5× fast (`WW_SPEED`, default 5; `tests/harness.ts`):
timers, tweens, the game loop and voice playback together. `setSpeed(page, k)` changes it
mid-run (item 081: each clock is rebased where it stands), and `playEpisode(page, speeds)`
sets it as each part of an episode starts. Whole episodes play their battles at clock speed
10 (`BATTLE_SPEED`, `WW_BATTLE_SPEED`; a run that sets only `WW_SPEED` gets that for battles
too), and so does `tests/fights.spec.ts`: a fight's checks are counts and simulation time.
Speed 10 held green on every fight style over three runs once the race's finish-flag check
read the flag a frame after hearing the line (the battle publishes its state once a frame,
the voice live); speed 8 gained nothing over 10 there. Real pacing is covered by three
tests in `tests/episode.spec.ts` at clock speed 1 with real voice and real walking (item 083;
until then one episode with those parts at real time, about 210 s): the title, the bedroom
and the warm-up (about 55 s); a sentence room from `?scene=room&slot=a` (23 s); battle 1 from
`?scene=battle&part=1` at full length (72 s). Each is its own test, so they run on separate
workers. The default episode's end-to-end checks (three fetched, the villain's two reformed
lines, the recap's pictures) play the whole episode at the suite's speeds (about 36 s).
`WW_SPEED=1 npm run test:browser` runs the browser lane at real time.

**Test-only shortcuts** (item 083; tests assert on state and line ids, not on audio or walking):

- **Instant voice**, `?voice=instant`, which `boot` adds unless told otherwise: no audio, no
  decode wait, and a line ends as soon as a `__ww.state()` call has reported it as speaking
  (`VoiceBus.seen`; its estimated length is the backstop), so `until` on `voice.speaking`
  still sees every line and `voice.history` keeps every id. `until` polls every 50 ms (100
  until item 083; `WW_POLL_MS=<ms>` for a run, item 105: at 20 ms the default whole episode
  took 29 s against 32 s, a line-heavy subset of nine tests 92 s against 96 s, one worker; not
  the default until a few full runs show it holds green). Real voice: `boot(page, query, speed, { voice: 'real' })` for a test about
  the voice, its captions or real pacing (the real-time scene tests, the hidden tab); any
  `qa=1` boot (the probe's caption box checks: `layout.spec`, `cover.spec`); a file that
  sets `VOICE.mode = 'real'` (the bug-hunt checker, the shots); or `WW_VOICE=real` for a
  whole run.
- **Teleport**, `__ww.place(x, y)` (`place` in the harness): puts her at (x, y) in a room, or
  her hero in an open move choice. `choose` and the move choice's pad pick land that way, so
  a test not about walking no longer steers. `driver.walk = true` steers instead (the
  bug-hunt checker, the real-time tests); `walkTo` and `stick` always steer, for tests
  about walking (free play, M3, the stick hint, the bridge's slide).
- **How tall a fighter stands**: `state().battle.heroes[i].drawn` (and `villains`), its
  picture's height standing still. Not `qaLayout` bounds: moving squashes a card up to 7%
  and the villain is always moving, so a 5-10% check on bounds failed 2 runs in 3 (item 093).
  A dad's head-to-soles height is `drawn × ADULT_FILL[art]` (`src/config.ts`), hers
  `drawn × outfitFill(art)` (`src/rules/heights.ts`, hunt 6, M32; `tests/heights.spec.ts` checks chef Julia against
  her dress).
- **Timing a room or a battle opening at real speed**: boot with `{ voice: 'real' }` at the
  usual `SPEED` and read game time, not wall time: `performance.now()` in the page is warped
  to game time, and `state().battle.t` is the battle's own clock (`tests/shifter.spec.ts`'s
  pacing test, `tests/opening.spec.ts`). Hunt 6's "34 s to PICK A MOVE!" with eight things
  counted from the first thing out of the bag: 37.3 s on that measure before M28, 24.7 s after.
  `?warmup=1` puts the warm-up's word first in a battle boot's fetched things; a second boot
  with `fetched=` copied from the first draws other rooms (the list feeds the draw), so its
  words do not group into a room's volley.
- **Short battle**, `?battle=short`: the director's waits between story beats at a fifth
  (`SHORT_BEATS`, `BattleScene.beat`); the combo, the ultimate and the finish keep their
  length. For tests that need only the move choice or the finish (rulings, lenses' stick
  hint, Charge's runes in battle, cover, free play's battle, smoke's two battles). A short
  battle fails `expectFightLength`; fights, whole episodes and pairs keep the full length.

The game's own timeouts run on that clock too, except the network's: until item 069
`VoiceBank`'s 15 s voice fetch timeout was 3 s of real time in a test, so on a loaded
machine voice fetches aborted (`voice: could not decode … AbortError: signal is aborted
without reason`), lines played with no audio, and `tests/fights.spec.ts` failed 1-2 of its
5 tests. The voice and art fetch timeouts now run on the wall clock (`src/realTime.ts`;
the harness keeps the real `setTimeout` as `__wwRealSetTimeout`). Load still stretches
a Charge round's game time past its limits beside a second worker, so the timed round (the
snappy round in `charge.spec.ts`) asserts them only on one worker (item 072): in the
two-worker lanes it logs its time (and a `timing` annotation) and goes on. The timing run:
`npx playwright test tests/charge.spec.ts -g snappy --workers=1` (about 30 s; 17.7 s to the
read and 28.7 s in all against 22 s and 32 s, 2026-10-21). `WW_GPU=0` runs on one worker,
so it asserts there too.

The browser draws with the GPU (Playwright's full `chromium` channel, `--use-angle=d3d11`;
`gpuProjects` in `tests/gpu.ts`, the one project every config runs: Desktop Chrome's
1280×720 viewport, and always `--autoplay-policy=no-user-gesture-required`, GPU or not): battles run at ~56 fps instead of headless software GL's 11-18,
and a fight-style test takes 53 s instead of 78 s. `WW_GPU=0` goes back to software GL (for
a machine without a usable GPU, or to rule the GPU out when something looks wrong). Three
workers on the GPU, one on software GL (`playwright.config.ts`; the worker timings behind
it, items 061 and 079: `docs/engineering.md`, *Browser and tests*). `WW_WORKERS=<n>` sets the
count for a run (item 105; `WW_WORKERS=1` when the machine is short of memory, as conductor
sometimes asks). Tests are spread by file, so two tests of one spec never run at once:
item 105 timed `fullyParallel` on three workers at 6.7 minutes for every browser test against
6.1 by file (the long tests bunched at the end). A run that times something
(the Charge round's limits, above) wants `--workers=1`.

### Ports and servers

The suite starts its own server on port 5184 (`TEST_PORT` in `src/port.ts`), never the dev
port 5174, so a test run in a worktree cannot attach to the main checkout's dev server.
If 5184 is busy (another worktree's run) the suite fails at once rather than testing the
wrong code. With `CONDUCTOR_PORT` set (a conductor item is given one) the suite serves
itself on that port instead (item 047, `playwright.config.ts`), so a conductor run needs nothing started by hand:
`npm test` or `npx playwright test <spec>` as usual. Do not serve vite yourself from a
Claude Code session and point `WW_BASE_URL` at it: a backgrounded server is stopped after
its background `timeout` (10 minutes by default), mid-suite, and every later test fails
(item 043). Run the playwright process itself in the background instead; the server it
starts lives exactly as long as the run. `WW_BASE_URL` stays for a server you keep
running yourself (a `vite preview` of a build).

**Two runs in one worktree at once** (item 085, parallel helpers): each needs its own port,
build folder and output folder, or the second build overwrites the first one's served files
and the second run empties the first one's `test-results/`:
`CONDUCTOR_PORT=<free port> WW_TEST_DIST=node_modules/.ww-test-dist-<tag> npx playwright test <spec> --output=test-results-<tag>`.
A spec or config under `scratch/` does not work: `scratch/` is a junction to the main
checkout's, so it loads the main checkout's `node_modules` ("two different versions of
@playwright/test"); throwaway specs live under `tests/`.

A test that times out "waiting for title" (or "parent page", "hub quiet") with `scene=`
empty never got past the boot's loading. Seen in item 034 when the machine was loaded (and
in any run where `src/` changed underneath on the dev server, which reloads the page): the same
tests passed when rerun alone. Rerun them alone before suspecting the code. Item 076 saw
the same with the CPU at 100% from other programs: `(Get-CimInstance
Win32_Processor).LoadPercentage` in PowerShell shows it; at ~20% the same specs passed. The same
reload shows as "page.evaluate: Execution context was destroyed, most likely because of a
navigation" (item 067: five slow specs lost to edits made mid-run). Since item 079 the
suite serves a build (*Tests*), so edits to `src/` or `content/` mid-run reach no page;
only a `WW_DEV_SERVER=1` run still reloads under them. A playwright run loads its spec files
once at its start, so a spec edited mid-run needs a rerun.

### Not tests: boot timings and screenshots

`npm run perf`, `npm run shots` and `npm run qa` (below) each have a Playwright config of
their own, behind an npm script (item 072). (`npm run test:pairs` is not one of them: it is a
normal suite spec on the main config, off unless asked for; *Operational facts*.)
Arguments for Playwright go after `--` (`npm run qa -- -g "qa seed101$"`). All three
configs draw on the GPU (`gpuProjects`, `tests/gpu.ts`; `WW_GPU=0` for software GL), on one
worker, and serve the game from `tests/qa/vite.qa.config.ts`: no file watching, so edits
made during a run wait for the next one instead of reloading the page.

**Boot timings:** `npm run perf` (about 1.5
minutes; not a test, it prints) times page load to the title and to a quiet hub
(`?scene=house`: input free, nobody talking, still so 0.6 s later), each from a fresh
browser context, median of `PERF_RUNS` (5), and the art each fetched. Its server takes
`PERF_PORT`, else `CONDUCTOR_PORT`, else 5196. Item 065's before and after are in
`docs/engineering.md`.

**Screenshots for judging the UI by eye** (not tests; item 024):
`SHOTS_TAG=<tag> npm run shots -- shots.pw` plays the
bedroom, the hub and a side room, and the victory for four casts (and a battle up to its
first move choice), shooting every line shortly after it starts into
`scratch/ui_shots/<tag>/` (about 5 minutes; `-g bedroom` for one scene). Without a file
name `npm run shots` plays the battle shots below as well. It serves its own vite on
`SHOTS_PORT`, else 5194 (in a conductor item: `SHOTS_PORT=$CONDUCTOR_PORT`; the suite serves
there too, so a test run started while shots run stops at "port already used": run them one
after the other, or give one another free port). Since item 072
it draws on the GPU, as the suite does, so shots from before then (software GL) differ
from later ones in more than the change being judged. `npx tsx tests/shots/sheet.ts <beforeTag> <afterTag> <out.png>` puts
two runs side by side.

**Battle shots** (item 034): `SHOTS_TAG=<tag> npm run shots -- polish.pw` plays both battles for eight casts across the five
fight styles (`CASTS` in `tests/shots/polish.pw.ts`), shooting every 1.5 s and at each new
phase into `scratch/polish_034/<tag>/`, with each battle's voice history and any line said
twice in a row (`*_voice.json`); also the dads' heights in the bedroom, entry hall, hub and
victory scene, and Pig Curse's callout. About 16 minutes at `WW_SPEED=2` (the default
there). Name the spec file (`polish.pw`), not `polish`: every path in a worktree called
`…_polish` matches the bare word. `npx tsx tests/shots/contact.ts <tag>` makes one
contact sheet per battle in `scratch/polish_034/<tag>_sheets/`. To shoot "before" (the
base commit's code; the server no longer reloads under edits), run it from a second worktree at the base commit
(junction its `node_modules`, `public/voice-gen` and `scratch` to this one's). Unlink those
junctions (`cmd /c rmdir <path>`) before `git worktree remove --force`, so nothing is
deleted through them.

**Variety across many episodes** (item 121): `npm run variety -- --episodes=300 --seed=1`
(about 1 s per hundred episodes; no browser) plays drawn episodes in a row on one progress
store, through the episode's own draws (`src/episode/draws.ts`, `plans.ts`), answering for
her as the scenes record it (`--right=0.85` right first time). It prints one row per
dimension (words per game, phonics, frames, voice variants, pictures, cast, places, games,
fights, items), worst first: the pool, how many came up, the median gap before one comes
back, the share back within 2 episodes, the most drawn against the mean, and what never
came up. `--json=<file>` keeps the rows; `--only=<name,…>` narrows them. `Math.random` is
seeded, so a seed replays; a change to any draw or to the bank moves every later episode,
so compare the same seeds before and after. Item 121's before and after runs are its report's.

### The bug-hunt checker

`QA_TAG=<tag> npm run qa` plays whole episodes at
clock speed 5 across casts, dads' forms, places, all five fight styles, the word machine,
wrong answers everywhere, dad lock, seeded progress (blends and digraphs open) and three
episodes back to back (`SCENARIOS` in `tests/qa/qa.pw.ts`; `-g <name>` for one,
`QA_SET=quick` for three, `QA_SET=more` for the second batch: the other places and dads'
forms, an idle child who stands still at every choice, more seeds; `QA_SET=new` for the
third, item 069's: a busy child pressing blue, red and yellow all episode (free play),
`DIFFICULTY` 2 and 3 with seeded progress, Charge and the bridge answered right, and four
real draws back to back; `QA_SET=lenses` the fourth, item 080's, below; `QA_SET=recent` the
fifth, item 089's, below; `QA_SET=cast` the seventh hunt's, below; `QA_SET=hunt8` the eighth's, below;
`QA_SET=all` every batch).
About 1.5 minutes an episode, 26 minutes the first batch. It is not a test: it records.
In a conductor item pass its port: `QA_PORT=$CONDUCTOR_PORT`. The suite (`playwright.config.ts`)
serves on `CONDUCTOR_PORT` too, so a test run beside a sweep needs another
(`CONDUCTOR_PORT=<free port> npx playwright test …`), or it stops at "port already used".
`--workers=3` alone still plays one scenario at a time (the scenarios are one file): add
`--fully-parallel` (`QA_SET=cast` on three workers: about 6 minutes). A second sweep beside a
long one (the real-speed `variants6`) needs its own build and port:
`QA_DIST=node_modules/.ww-qa-dist2 QA_PORT=<free port>`; sharing the build folder would
rebuild it under the first sweep's pages. A scenario shoots at most 400 shots an episode (`Recorder`'s `max`); past it the run goes on
unshot, which looks like a hang (hunt 7). Give each its own `QA_TAG` as well: Playwright's
output folder is per tag (`test-results/qa-<tag>`), since a run empties its folder as it starts. `scratch/` is the main checkout's folder (a
junction): a probe script kept there that imports `../../src/…` runs the main checkout's
code, not the worktree's (hunt 7 lost a round to it); keep such scripts in the worktree.

- **Item 069's checks:** free play never over its cap of live shots (`shots-over-cap`), a
  busy child whose casts never fired (`mash-dead`), and in a scenario whose URL forces no
  cast or room, the rotations across episodes (`repeat`: the villain or victory scene of
  the episode before is a bug, the same ally or side rooms a look; `repeat-word`: a word
  read in an earlier episode of the run). Each scenario's JSON lists what each episode
  drew (`drawn`).
- **Item 080's lenses** (`QA_SET=lenses`, about 25 minutes): `reload_points` reloads the
  page at five points (bedroom, a side room, battle 1's choice, hub part 2, the victory
  scene), one episode each, and lists what the store held either side (`probes` in its
  JSON; `reload-store` when a reload itself changed it); `hidden_tab` switches the tab
  away for 2.5 s every 9 s (Phaser's visibility and blur events; a real hidden tab also
  stops animation frames, which this does not, so its frame spikes are expected);
  `resize` cycles six window sizes; `slow_net` slows every voice and art fetch by 0.3 to
  1.5 s, `flaky_net` fails one in seven (never the manifest; `netFailed` lists them);
  `lock_all` turns dad lock on at thirteen points of an episode, presses every button and
  checks nothing moved (`dadlock-leak`) and the badge shows (`dadlock-badge`), listing the
  lines that started while locked; `parent_all` opens the grown-ups page at each point
  and checks F9 comes back to the same scene (`parent-return`) and the store did not
  change (`parent-store`); `parent_none` is the same seed with no visits, to compare.
  Also `qa flags <url>`, 58 URLs and odd values each watched 9 s (`flag-stuck` when one
  never leaves Boot or Wait; JSON and shots in `flags/`), and `qa devkeys skip` (F2 at
  every step, then an episode played through) and `qa devkeys auto` (F4 and green to the
  recap).
- **Item 089's batch** (`QA_SET=recent`, items 081-088's changes; first swept in item 092, about 17 minutes):
  `debug_rooms` turns minigame debug mode on at six points (the warm-up, the hub in both
  parts, both side rooms, the attic), plays a game from its pedestal at each (the four in
  turn) and turns it off: the store, the episode and the room must be as they were
  (`debug-leak`, `debug-return`), the pedestal checked (`debug-check`) and the DEBUG tag
  only while on (`debug-tag`); `end_mash` presses her buttons, Dad's 1, key 0 and dad lock
  at the recap and THE END and goes to the grown-ups page and back: only Dad's 2 may
  leave (`end-leak`) and nothing may be stored (`end-store`); `variants6` plays six drawn
  episodes; `voiceless` plays one with the voice manifest missing (captions only).
- **The seventh hunt's batch** (`QA_SET=cast`, item 116, about 6 minutes on three workers):
  each ally from items 111 and 114 once, against the new villains of item 115 and their own
  fights (frost clash, space race, magic show) and older ones, Evil Smaug's story fight twice
  (`jasmine_story`; `rilla_story_wrong` with wrong picks and a busy child), and three drawn
  episodes back to back (`drawn_cast3`). `spawn-in-reach` leaves out a lone answer (the bed
  she wakes in, the hub's secret door); `locked-silent` leaves out Charge the Spell (its
  quiet beats are hers to say the sounds back); `clipped-line` leaves out a story fight's
  back-and-forth (`story_` lines), as it does battle shouts. New check: `pad-in-reach` (look),
  a move pad opening within her reach (fix 119), once a choice.
  Every scenario also checks the transcript: a narrator line's variants said in turn
  across the run (`variant-repeat`, a look: a variant picked while the voice bus dropped
  it shows as a gap; not with debug games in the run, whose sandbox puts the rounds back)
  and no taunt over twice an episode (`taunt-over-cap`).
- **Item 092's additions:** a store change names its fields (`wordwarriors.progress
  words.box`; a room started again after key 0 or F9 says its opening line's next
  variant, `debug-restart-line`, a look); the overlaps already ruled on (W5, W12, W21) are
  `target-covered-ruled`, a look; `voiceless` really runs with no manifest (its 404 goes in
  before boot) and its silent lines are the point; ten more URL flags (`scene=theend`,
  `grab=`, `battle=`, `cast=`, `games=`). A move choice whose pad never takes green stops
  the run naming her position, the pads and the running scenes (M20 in
  `docs/qa-findings.md`).
- **Item 102's additions:** a choice that appears within reach of her is a bug
  (`spawn-in-reach`: green mashed through the round's line picks it unwalked; only spots new
  since the last poll count, so the driver's teleport onto a spot never does), and the
  Shape-Shifter's first creature wearing its word on its label is not a giveaway (it is said
  and shown, not read).
- **The eighth hunt's batch** (`QA_SET=hunt8`, item 125, about 8 minutes on three workers):
  `newwords3` (three drawn episodes leaning to item 121's words, `words=new`), `charge_solo3`
  (Charge forced, Dad never presses: solo must last the session, M34; `solo-lost`, a bug, when an
  episode ends not solo), `shifter5` (five drawn episodes with the Shape-Shifter:
  `chain-repeat`, a look, when an episode's chain shares a link with the six the store kept
  before it, or is one of them; M36), `warrior_story` and `moriarty_story_wrong` (the story
  fight with a dad's outfit, and with Moriarty at 1.3 and wrong picks). `qa flags` gained
  `words=` odd values. A word confirmation's shot is read as said even before the bus
  reports it speaking (W33), and the hub's circle under the story's own lines is ruled
  (W35); under the line sending her there it stays a bug. `playChargeRoom(page, 'away')`
  (harness) leaves Dad out, and `RoomPlay.dadAway` passes it through `playRoom`.
- **A busy machine slows the sweep's own server:** with many agents or a typecheck
  running beside it, voice fetches from the checker's Vite server passed their 15 s
  timeout (`voice: could not decode ... AbortError` in the log) and lines played silent.
  Sweep on a quiet machine, or read those `voice-silent` issues as the machine's. Much of
  that was the dev server's own scan (below): on the build server, item 092's sweeps had no
  decode failures.
- **Silent lines at test speed are a look, not a bug** (item 069): at speed 5 the game asks
  for lines five times faster than the decode queue serves them (a drawn narrator's ~500
  clips), so lines still `queued` or `decoding` play silent in a sweep, while a whole
  episode at real speed had none. Check one at real speed before calling it a bug:
  `WW_SPEED=1 QA_TAG=<tag> npm run qa -- -g "qa seed101$"`
  (about 7 minutes). A scenario of several episodes at real speed outlasts the config's
  30-minute test timeout: pass Playwright's own (`-- -g "qa variants6$" --timeout=6600000`
  for six episodes, item 102). `failed`, `none` and `suspended` stay bugs at any speed.
- **A game controller plugged in can play along** (item 092, M20): the GPU test browser
  reads a real pad once it reports input, and a stick drifting past the 0.25 deadzone walks
  her off a move pad the driver put her on. Twice a sweep stopped "green on the pad never
  picked" with her hero off the pad; the driver now puts her back before each retry. Sweep
  with the pad unplugged to rule it out.
- **A busy child and the driver:** the mash scenarios' yellow waits while the driver answers
  (`driver.busy` in the harness), or a replay it starts locks the room as green lands and
  the driver waits for an answer that never comes.

- **Shots only at moments:** each scene change, each line (a moment in, so the box and
  karaoke are up), each new round, move choice and battle phase, each victory-scene line,
  the recap. About 150 an episode in `scratch/qa/<tag>/<scenario>/`.
- **Checks at each shot** (`tests/qa/checks.ts`): words off the screen, lower-case
  text, tiny text, text over text, a target under the dialogue box, placeholder art; the
  sentence key word or the machine's word said or shown before she answers; lines with
  no manifest entry (`voice-no-line`) or played with no clip (`voice-silent`, with why:
  its decode `queued` or `decoding`, `failed`, `none` asked for, or the audio context
  `suspended`); console warnings; input locked over 20 s or silent over
  2.5 s; frames over 250 ms; objects, tweens, timers and listeners growing from one
  episode to the next; and a stall (any wait timing out) with its last shot.
- **Matt's categories** (item 059; the list heads `docs/qa-findings.md`, and a hunt
  checks every one), automated where they can be in `tests/qa/wording.ts`: British
  spelling on screen or said (`not-american`), a picture with its own word printed
  beside it (`giveaway`), a clipped line (`clipped-line`, a heuristic look; battle
  shouts are left out), and a room past its game-time budget (`slow-room`,
  `ROOM_BUDGET_MS`; scenarios that answer wrong on purpose are not timed).
  `tests/unit/qacategories.test.ts` holds every line in `lines.json` to American spelling.
  Each `<scenario>.json` also carries the run's transcript (`said`, line ids in order)
  and `repeated`, every line said more than twice (item 087; letter sounds, words,
  sentence prefixes and the move choice's lines are left out; a several-episode
  scenario counts all its episodes together).
  Missing voice lines (item 062): every scenario also lists each line in `lines.json`
  with no manifest entry (`voice-unbuilt`), a clip for older text (`voice-stale`) or no
  mp3 (`voice-no-clip`); the same check is a unit test, and `rules.test.ts` fails when
  `lines.json` is not what `voice:lines` composes.
- **Art shown before it loaded** (item 065, `art-late`, a bug): art loads on demand
  (`src/art/`, `docs/systems.md`, "Art on demand"), so the probe logs every art id a
  scene asked for before it was in (`art: not ready <id> (<scene>)`) and every scene that
  opened with any of its `artFor` art still loading. The browser tests count the same
  warning as an error (`collectErrors`).
- **The probe** (`src/qa/probe.ts`) is what the page adds for it, only with `?qa=1` (and
  the test hooks): the voice log, frame times and long tasks per scene, lock stretches,
  missing art, console capture, `layout()` and `counts()` on `window.__wwqa`.
- `npx tsx tests/qa/report.ts <tag>` merges the issues across scenarios into
  `scratch/qa/<tag>/summary.md` (bugs first, each with a shot) with frame and heap tables,
  and contact sheets in `scratch/qa/<tag>/sheets/`.
- **One moment instead of a sweep:** `QA_LOOK='scene=house&cast=default' QA_LOOK_S=30
  QA_LOOK_GREEN=0` records that URL for 30 s into `scratch/qa/<tag>/look/`.
- Its server (port 5195, `QA_PORT` to move it) serves a production build made as the
  sweep starts (`node_modules/.ww-qa-dist`, as the suite does; item 092), so editing
  `src/` during a sweep neither reloads it nor mixes code. Since item 122 it is the
  suite's `tests/testBuild.ts`: a sweep with nothing changed since the last reuses its
  build (`WW_REBUILD=1` builds anyway). The dev server it used before
  (`QA_DEV_SERVER=1` brings it back) spent its first minutes scanning the tree, voice and
  art junctions included: every scenario of a sweep timed out at boot behind it ("timed
  out waiting for title", an empty shot), and once up it took 4 to 9 s a voice fetch
  (`could not decode ... AbortError`), on an idle machine. **Do not run a second browser run
  (a look, the test suite) beside a sweep:** on this machine the second GPU browser
  starves the first, and scenarios time out at boot with an empty scene (seen in item 039).
- Known issues and Matt's calls are in `docs/qa-findings.md`; a hunt reads it first and
  does not re-report them.
- A throwaway script that imports game code does not go in `scratch/` (*Operational
  facts*).

## Content work

Everything is data under `content/`; `docs/content.md` walks through each kind. After editing it:

```
npm run voice:lines     # regenerate content/voice/lines.json
npm run voice:build     # synthesise new or changed lines into public/voice-gen/
npm run art:placeholders  # paint missing art, rewrite docs/art.md
```

`npm run voice:status` lists every line as recorded, stale (the text changed since the
recording) or still edge-tts, letter sounds first (`docs/recording.md`).

### Matt's recordings: the phonics recorder and `voice:import`

**The recorder** is one self-contained page, `tools/recorder/phonics-recorder.html`: 12
cards, each three words with their sounds (`docs/recording.md` says how to record). To
send it to someone, either **email the file** (they open it in Chrome, Edge or Firefox
straight from their downloads; the browser asks for the microphone, which works from a
`file://` page), or **send the hosted link**. The hosted copy is
`C:\Code\techmatt.github.io\phonics-recorder.html`, Matt's GitHub Pages repo, served
over HTTPS. Don't edit it there: after each change to the repo's copy the planner copies
it over, and Matt commits it. Nothing leaves their computer until they press
**Download zip**, which saves `phonics-<name>.zip` (stored, no compression, about 16 MB
for all 12 cards). That zip comes back by email or a shared folder; put it in
`scratch/voice-import/`.

**`?missing`** (item 108) opens the page with only the sounds still to record, each its
own card of one word and its sound three times: today F (FAN) and A (CAT), the `MISSING`
list in the page. Its takes are `g02f` and `g07a` (the full card's number and the sound), so
they never mix with the full page's in the browser's storage, and its zip,
`phonics-<name>-missing.zip`, imports like any other.

The zip holds `manifest.json` (format `phonics-recorder/2`: `recorder`, the speaker's
name, now required; each take's card `group` `g01`…`g12`, `entries` of sound, word,
`kind`, `repeats`, and `counted`, the sounds the page heard) and `takes/gNN.wav`, one
mono WAV per card at the browser's rate (48 kHz here). The importer reads format 1 too;
a format-1 zip has no name and is taken as Matt's.

**`npm run voice:import -- <zip> [--take gNN] [--dry]`** (`tools/voice/import.ts`, the
splitter `tools/voice/split.ts`, ported from item 055's prototype):

- each card is high-passed at 80 Hz, cut by its loudness envelope, and must hold
  exactly 12 sounds (word, three repeats, three times). Otherwise it installs nothing
  and says which card to re-record and why. "No sound" is an empty take; "found 10
  sounds, expected 12: sounds ran together at 8.4 s" means pauses under about 0.25 s;
  "too quiet to tell from noise" is a sound more than 30 dB under the card's loudest
  (20 until item 063: a held SSSS sits 18 to 24 dB under its word, and was dropped);
  "did it stop early?" means the take is short;
- each clip is widened to its soft edges, faded (5 / 15 ms), normalised to -17 dBFS RMS
  (peak at most -1 dBFS), padded with 30 ms of digital silence, and encoded as 96 kbps
  mono MP3 by `@breezystack/lamejs` (pure JS, a devDependency: nothing to install but
  `npm ci`);
- for each sound it takes the most typical of the three repeats (the medoid, by band
  spectrum and length) that passes the bridge's hold check (`holdPlan`; a held sound
  must loop 0.1 s or more), falling back to the next closest. If none passes, the word
  goes in and the sound doesn't;
- clips install as `content/voice/clips/<id>.<hash8>.mp3` for `letter_<x>_sound` (the K
  card fills `letter_ck_sound` too) and `word_<word>` where the game has that word, with
  `provider` the recorder's name. A file it replaces is deleted. The hash in the name
  makes `voice:build` rebuild a re-record. A sound the game has no line for yet waits in
  `index.json`'s `waiting` map and is moved in by the next import once the line exists;
- every run writes `scratch/voice-import/review.html` (with its audio in `review/`):
  each card's envelope, cuts, threshold and floor, then every clip with a player, its
  target id and the bridge's cut of each repeat, played once as the bridge plays it. `--dry` writes only that.

Then `npm run voice:build` (no network: recorded lines are copied, not synthesised).
The recorder counts each take with the importer's own detector (its `detector:begin` /
`detector:end` block; `tests/unit/voiceImport.test.ts` runs the two side by side), so a
take the page says counts out is one the importer takes. Matt's card 1 is a real take in
the unit tests (`tests/fixtures/voice/matt-g01-good.wav`).

Matt's recording 2 (2026-10-20, all 12 cards, recorded with the format-1 page before
these changes): cards 2, 4, 6, 8 and 9 went in (D P H J G Y E I O U SH CH and 15 words);
1, 3, 5, 7, 10, 11 and 12 were refused (repeats about 0.2 s apart ran together, quiet S
and K hisses, card 3 stopped after 5.6 s). F, L and V were said "fuh", "luh", "vuh" with
about 0.1 s of the sound itself, so none of their repeats holds on the bridge.

Matt's recording 3 (`phonics-matt.zip`, 2026-10-20, all 12 cards on the format-2 page,
item 063) replaced it: every card counted 12 and went in, 67 clips. F is still skipped:
each repeat is about 0.2 s of hiss at -47 dB and then half a second of voiced "uh" 35 dB
louder, so the bridge keeps 0.06 s. L and V now hold. Card 10's KEY replaces card 7's
(the later card wins); THIS, ACORN, ICE and UNICORN are not game words, so card 11 and
12 install their sounds only.

### The word bank's coverage rule

The bank covers phonics by rule, not by luck. Counting only familiar pictured words
(`THINGS`: not `odd`, not actions), `COVERAGE` in `content/phonics/bank.ts` asks for:

- **3 per first sound**, every letter sound and digraph (QU counts as Q), unless an
  entry there gives a lower target and why: I, O, U and X have 1 and A and Z 2, through
  words with sounds she has not been taught (item 058, below); E, Q, W, Y and TH have
  1 or 2; voiced TH none;
- **a last sound** for the sounds words end on: 3 each for B D G K L M N P S T X CK NG
  SH, fewer for F Z CH TH, with reasons;
- **8 per short vowel**; **2 pictures per word-machine family**, and the families listed
  must stay families (-ING and -OCK joined in 056);
- **the Stretchy Bridge**: 3 early words (levels 1–2, a short vowel) per first sound in
  `COVERAGE.bridgeStarts` (R, V and J have 2, with reasons), so the far bank can show two that start like the word and differ later;
- **long vowels**: long E 3, long O, A and I 2 each, long U none yet.

`npm run bank:audit` prints the table (`-- --gaps` only the shortfalls) and the
two-sound trios (MAT MAP MAN). `tests/unit/coverage.test.ts` fails when a row drops
under its target, so removing a word, marking one `odd` or retiring a family that
leaves a letter short goes red. Lower a target only with its reason.

Sound units (056): QU and NG are units like SH (QU sounds as Q's "Kwuh"), and doubled
letters (EGG, BELL: FF LL SS ZZ GG) are one unit sounding as the letter, without
raising the level. A hand-`spelled` word with one short vowel (THUMB: TH U MB, MB
saying M) is tagged like any word; a long-vowel one marked `late` is level 3, and a
silent letter (the E of KITE) has the sound `''`: the hints (the sentence game's and the
warm-up's clue) light it and say nothing.

Untaught sounds (item 058, Matt's ruling): a familiar picture word may hold a sound she
has not been taught. It is spelled by hand, each unit with its sound, and each such
sound is its own placeholder line like a long vowel (`UNTAUGHT_SOUNDS` in
`content/phonics/letters.ts`, the end of `LONG_VOWEL_SOUNDS`): `long_oo` "Oo" (ZOO,
IGLOO), `schwa` "Uh" (ZEBRA's A, OCTOPUS's second O and U, UMBRELLA's A) and `x_name`
"Ecks" (X-RAY, X said by its name; the audit counts it in the X row, since no familiar
picture starts with KS). A word holding one takes the long path: level 3 (`late`), no
short-vowel tag, never in a family or on the bridge. That is how Z (ZOO, ZEBRA), A
(APPLE, beside ANT), I (IGLOO), O (OCTOPUS), U (UMBRELLA) and X (X-RAY) got pictures.
The U rune's gesture became a finger pointing up, since its umbrella is now a word's
picture.

A word that is said in a narrator line, a threat, a quest line, a hub scene or a rune
gesture cannot join the bank until that line is reworded (the unit tests name it):
WELL ("well done"), WITCH (Bavmorda), SAND (Jasmine's threat) and SWING (a rune) stayed
out for that; QUEEN, EGG and SHELL went in after their lines were reworded.

## Storage

Every file has exactly one home (Matt, 2026-10-18):

- **git:** source, data, Matt's voice recordings (`content/voice/clips/`) and the
  game-sized art (`public/art/`).
- **Drive** (`C:\Code\gdrive-sync\wordwarriors\`, a Google Drive sync folder): expensive,
  irreplaceable or private files that do not belong in git. They live there; the repo
  path is a directory junction (`mklink /J`) to them, git-ignored.
  - `art-originals/` → `…\wordwarriors\art-originals`: full-res art (`<id>.png`, what
    `art:gen --reprocess` cuts), `log.jsonl`, the originals `art:pick -- <id> 0` puts
    back (`restore/`), candidates still waiting on Matt (`alts/`), and Matt's family
    photos in `refs/` (private: never copy them into the tracked tree).
  - `public/voice-gen/` → `…\wordwarriors\voice-gen`: the edge-tts mp3s, `manifest.json`
    and `.build-cache.json`. Recordings are copied in from `content/voice/clips/` by
    `voice:build`, which overrides edge-tts with them as before.
- **Nowhere:** anything a command rebuilds cheaply: contact sheets, `refs/crops/`,
  `dist/`, test output, `node_modules/`.
- **Shot runs fill the disk.** Every shot is a ~1 MB PNG: a bug-hunt sweep is 1.6–4.3 GB
  in `scratch/qa/<tag>/`, a battle-shots run ~0.5 GB in `scratch/polish_034/<tag>/`.
  Once a run's findings are written up (`docs/qa-findings.md`, a report), delete its
  PNGs and keep its `summary.md`, `*.json` and the shots the summary cites. Item 051 did
  this for every run to date: 16.6 GB of `scratch/` became 1.3 GB. Item 052 then deleted
  item 039's cited shots and contact sheets too (`scratch/qa/` keeps only each run's
  `summary.md` and JSON, so a summary's shot links are dead).
- **Nothing old is kept forever** (item 052). Once Matt's picks from a candidate round
  are promoted, the candidates he did not pick are disposable (redrawing one costs ~1%
  of a 5-hour Codex window): `art:pick` deletes the id's candidates itself, and the
  round's sheet, manifest, preview folder and briefs in `scratch/` go too. A finished
  item's leftover worktree goes with `git worktree remove --force <path>` from the main
  checkout (junctions unlinked first, *Battle shots*), then `git worktree prune`; its
  `conductor/*` branch stays. Item 052 did this for everything to date: `alts/` 1.3 GB
  to 39 MB, `scratch/` 1.2 GB to 22 MB, the worktrees folder 1.4 GB to 0.3 GB.
- **The archive** (item 084): `C:\Code\gdrive-sync\wordwarriors\archive\` holds what
  is irreplaceable but not needed day to day, at its old relative path. It has Matt's raw
  phonics-recorder zips and takes (`archive\scratch\voice-import\`), which
  `voice:import` already cut into `content/voice/clips/`. Item 084 deleted the
  bug-hunt PNGs and contact sheets of hunts 2 and 3 (`scratch/` 8.5 GB to 8 MB). The main
  checkout is now `node_modules/` (~285 MB) and `.git` (~120 MB, 45 MB of that the
  edge-tts mp3s committed under `public/voice/` before the voice moved to Drive).
  Measure with a walk that never follows a link (`os.scandir`, skipping
  `is_junction()` / `is_symlink()`), so Drive is counted once, at its real home.

The main checkout holds the junctions; conductor links each worktree's to the same Drive
folders, so a worktree shares one copy and never needs a full voice rebuild. Because the
voice folder is shared, `voice:build` keeps mp3s of lines that left `lines.json` (another
branch may still speak them) and lists them at its end, with their count and size.
**Stale voice audio** (item 078): `npm run voice:build -- --prune` deletes them and prints
what went (`PRUNED:`). Run it from main, or from a branch at main, after the item that
retired the lines has landed: from a checkout behind main it deletes audio main still
speaks (the fix is a `voice:build` in main). The manifest and `.build-cache.json` need no
pruning: every build writes them from its own `lines.json`. Item 078 pruned 997 mp3s
(11.2 MB), retired lines since the voice folder began (old moves, item 059's Charge lines,
item 071's two rainbow lines). The flip side: there
is one `manifest.json`, so a branch that changes a line's text and runs `voice:build`
changes what main speaks for that id too, before the branch lands (item 009 re-voiced
630 `need_item_*`/`made_item_*`/`got_counter_*` lines this way). The same goes for
lines: a build writes the manifest from its own `lines.json`, so one from a checkout
without some lines (an older branch, a worktree cut before a merge) drops them for
everyone. Since item 062 it says so in a `DROPPED:` block; if main still speaks them, run
`voice:build` in main. A checkout without
`public/voice-gen/` runs mute with captions (since item 082 their texts come from
`content/voice/lines.json`, loaded only then), and the unit test that checks the manifest
fails. To link one by hand: `mklink /J public\voice-gen C:\Code\gdrive-sync\wordwarriors\voice-gen`
(in `cmd`, from the checkout root).

## Real art (Codex image generation)

`npm run art:gen -- <ids…>` draws real art with OpenAI's Codex CLI image tool, on Matt's
ChatGPT Plus login. No API key is used, and none should be. Every asset id has a prompt in
`content/art/prompts.ts`: a shared style block plus the asset's brief from `docs/art.md`
(so a changed `look` in the roster or the house changes the prompt), or a hand-written one
where the brief alone draws the wrong thing. No ids means every id; ids that already have
real art are skipped unless `--force`; `--sheet` only rebuilds the contact sheet;
`--sheet-out=<file>` writes it there, of the named ids only; `--reprocess` re-cuts the game
PNGs from the kept originals without asking Codex (use it for keying changes); `--shrink`
re-quantizes the named ids' committed PNGs. Run it backgrounded: each run does one image at
a time.

- **Numbers (2026-10-18, batch 1, ~180 images):** 27–55 s per image, about 0.3% of the Plus
  plan's 5-hour window per image (so roughly 300 images per window) and well under 0.1% of
  the weekly one. Three `art:gen` runs on disjoint id lists ran side by side without
  trouble or slowing each other, which is the way to do a big batch. The allowance each
  run prints is the plan's, so with runs side by side it climbs by all of their images
  (item 009: 60% to 76% for about 51 images over four runs, still ~0.3% each).
- **Committed PNGs are palette-quantized** with `sharp` (`shrinkPng` in
  `tools/art/generate.ts`): a room drops from 1.8 MB to about 0.3 MB, a sprite from about
  280 KB to 40–80 KB, with no visible change on flat cel-shaded art. The whole art folder
  is about 20 MB this way; unquantized it would have been about 75 MB.
- **Art written mid-run:** `art:gen` writes into `public/`. Only `npm run dev` or a
  `WW_DEV_SERVER=1` run reloads the page on that (a Playwright run then fails with
  "execution context was destroyed"); the default suite serves a build, but it serves
  `public/` live, so art written mid-run can still reach a test. Test after generating.

- **What it runs:** `codex exec --json --skip-git-repo-check -s read-only -C scratch/codex -`,
  with the prompt on stdin. Codex never writes into the repo. Its built-in `image_gen` tool
  saves every image to `~/.codex/generated_images/<thread id>/exec-<item id>.png` whatever
  the sandbox is, and the script collects it from there, using the `thread.started`
  event in the `--json` output.
- **Where things go:** the full-resolution original goes to `art-originals/<id>.png`
  (git-ignored, with `log.jsonl`: seconds, thread, allowance). The game-sized PNG goes to
  `public/art/<id>.png`; that is the only file committed. Sprites are generated on #00FF00,
  keyed to transparency (`tools/art/chroma.ts`), trimmed, and fitted to twice their
  display box. Rooms and arenas are cropped to fill 1280×720. The contact sheet is
  `scratch/art_contact.png`.
- **Keeping the originals:** `art-originals/` is a junction into the Drive folder (see
  *Storage*), so what `art:gen` writes there is kept whichever checkout ran it. `scratch/`
  is git-ignored and shared with the main checkout; the contact sheet is rebuilt by
  `--sheet` and kept nowhere.
- **Family likeness (2026-10-18, item 007):** Julia, Ellie, Dada Matt and Dada Jason are
  drawn from Matt's photos in `art-originals/refs/` (private, git-ignored, shared with the
  main checkout; never commit or copy them into the tracked tree). `REFS` in
  `content/art/prompts.ts` names each person's photo and a crop box; `art:gen` cuts the
  crop to `art-originals/refs/crops/<id>.png` and passes it with `codex exec -i` for that
  character's `char_*` and `face_*` ids (the `-i` goes before `--json`, because it takes
  several files and would swallow the `-` that means stdin). The image tool accepted the
  photo references, the children's too, and the likeness is far better than words alone.
  A photo pulls the drawing towards a realistic painting, so the prompt asks for a flat
  cartoon. If a photo run brings back no image it is retried with text alone;
  `--no-ref` skips the photo. The roster looks still describe each person in words.
  Two other kinds of `REFS` entry: `style` (Scar, item 028: a picture to take the feel
  from, not to copy) and `toy` (Bluerilla, item 110: Julia's plush gorilla, kept as a
  likeness of the toy, not a person). An entry's `ids` limits it to those ids, so the
  plush photo goes only with `char_rilla_good`, not EvilRilla or `face_rilla`.
- **Allowance:** Codex logs the plan's usage in its session file
  (`~/.codex/sessions/…/rollout-*-<thread>.jsonl`, `rate_limits`: percent of a 5-hour
  and a 1-week window). The script prints it after each image and stops at the first
  usage-limit message. It reads nothing else from `~/.codex`; `auth.json` is never touched.
- **Gotchas (2026-10-18, Codex 0.163):**
  - `--sandbox workspace-write` still reported `sandbox: read-only` on Windows. Codex was
    "blocked by policy" from reading its own `~/.codex/skills/.system/imagegen/SKILL.md`
    and could not save into the folder. None of that matters when the image is collected
    from `generated_images`; no sandbox-bypass flag is needed.
  - In PowerShell, `"… $imagegen …"` in double quotes expands to nothing. Passing the
    prompt on stdin avoids all shell quoting.
  - `codex` is an npm `.cmd` shim, so Node can only spawn it through a shell.
  - The image tool ignores pixel sizes. It picks square, portrait (1024×1536) or
    landscape from the words in the prompt, so the script says which shape it wants.
  - The key colour is taken from the image border, because the model's "#00FF00" is not
    exact. The dark outlines stop the flood fill, so a green leaf inside the subject
    survives. The script prints a green-fringe pixel count per sprite; 0 is clean.
  - Thin see-through parts (a cage's back bars, glow drawn over the screen) come out
    green-tinted. List a sprite in `NO_GREEN` (`content/art/prompts.ts`) if it has no
    green of its own: any green tint in it is then treated as the screen showing through.
  - The image tool's safety system refuses prompts too close to a film character, and
    the run just ends with "rejected the generation" and no image. Four prompts for an
    ice sorceress with pale hair and an icy-blue snowflake gown were refused, even
    with "original design" and without the braid. A white-and-gold gown went through.
    Writing "not a lookalike of X" does not help. Batch 1: Evil Elsa as the winter
    queen in a dark gown with long silver hair was refused too; a spiky silver pixie cut
    and a short crystal tunic went through at once. Anna and Jasmine, designed away from
    the films from the start (short curls, no teal), were not refused.
  - Keep green out of a sprite's design where it can be: a green toy block got keyed
    half-transparent. A glow over the screen (the magic circle) comes out green-tinted;
    `NO_GREEN` fixes that.
  - A thing that is green itself (grass, a bush, an elf) stays out of `NO_GREEN`, or it
    comes out grey. Open green shapes with screen showing between them key badly either
    way: item 056's loose grass tuft got pink-grey holes between its blades, under both
    the default cut and `LIGHT_GREEN`. Draw it as a solid shape instead (GRASS is a block
    of turf on brown soil).
  - The tool sometimes draws its own copy of things the game draws on top (the bedroom
    has toys of its own). Prompts for rooms say what to leave out.

### Candidates to choose from (`art:alts`, `art:pick`)

When an image is weak but Matt should see the options before it changes, draw
candidates instead of overwriting it:

```
npm run art:alts -- <ids…> [--n=3] [--sheet=scratch/<name>.png] [--sheet-only] [--manifest-only] [--no-ref] [--brief=scratch/<brief>.txt] [--ref=<image>]
npm run art:pick -- <id> <n>
```

**A candidate round changes nothing tracked** (item 041): drawing, the contact sheet and
the picker manifest all go to `art-originals/alts/` and `scratch/`, shared and
git-ignored, so a round may run as a **readonly** item beside other work. Promotion
(`art:pick`) is a normal item: it changes `public/art/` and, for a brief, the game's prompt.

- **Trying a new look: `--brief=<file>`.** The file (in `scratch/`, any extension) holds
  the asset prompt to use instead of the tracked one in `content/art/prompts.ts`: the
  same style block, photo reference and `NOTES` correction go round it. Its name is the
  file's base name (a lower-case slug). One id per run, so one run per brief; run briefs
  for the same id one after another, since side-by-side runs on one id would number
  their candidates alike. Each candidate drawn from a brief gets a sidecar
  `art-originals/alts/<id>-<k>.json` (brief name, file, text, the whole prompt, whether
  the photo went with it), and the sheet and picker label that candidate with the
  brief's name; the row's note lists which candidates came from which brief.
- **Matching a character's other version: `--ref=<image>`** (item 112). Attaches that
  image in place of the photo reference, worded as the same character's other version
  (`DESIGN_REF` in `tools/art/generate.ts`): keep the face, hair and build, change what
  the prompt or brief changes. Good Anna's round was drawn with
  `--ref=art-originals/char_anna_evil.png` and a brief per look. The log and the brief's
  sidecar record the image (`design`). Its first wording ("do not copy the picture's
  background") got a painted dark backdrop and no green screen, so the cut was ruined:
  the wording now asks for the green background like the picture's.
- Stopping a backgrounded `for … npx tsx tools/art/alts.ts …` loop (the shell's task
  stop) kills the loop but not the running `tsx`: it finishes its candidate in `alts/`
  and writes into the same log (item 112). Check with `Get-CimInstance Win32_Process`
  filtered on the id, and delete what it drew before a clean rerun.
- **Promoting a brief's candidate:** `art:pick` prints the brief after cutting the image.
  Write it into the game in the same commit: a character's `look` in
  its `content/battle/roster/` group file (its prompt is derived from that, so `docs/art.md` follows;
  rerun `art:placeholders`), anything else a `HAND` entry in `content/art/prompts.ts`.
  Otherwise `art:gen --force` and later rounds would draw the old look.
- **A brand-new id** (a new word's `pic_<word>`): run `art:placeholders` before
  `art:alts`. The drawing works without it, but the sheet's `current` tile reads
  `public/art/<id>.png` and the run fails at the sheet with ENOENT (item 043); then
  `art:alts -- <ids…> --sheet=<same> --sheet-only` finishes it without redrawing.

`art:alts` writes a picker manifest for conductor's picker page by itself, `scratch/<name>.json` beside the sheet, with each candidate cut as the game shows it into `scratch/<name>/` (row notes: `PICK_NOTES` in `content/art/prompts.ts`); `--manifest-only` rewrites it without drawing.

- `art:alts` draws `n` (default 3) new images per id with the same prompt and photo
  reference as `art:gen` and keeps them as `art-originals/alts/<id>-<n>.png`, numbered on
  from the last one there. The game's art is not touched. `--sheet=<file>` writes a
  contact sheet of the named ids: one row per id, the current game image first
  (labelled `current`), then each candidate labelled with its `<n>`, cut exactly as the
  game would cut it and all drawn at one scale. `--sheet-only` rebuilds the sheet
  without drawing.
- Several `art:alts` runs side by side on disjoint ids draw fine (item 040: four runs,
  33 images in about 12 minutes). Run directly, the tool wants its subcommand first
  (`npx tsx tools/art/alts.ts alts <ids…>`); without it the first id is taken as the
  command and skipped. A run whose id list names a picture deleted meanwhile still
  draws its candidates and fails only at the sheet: rebuild it with `--sheet-only`.
  Without `--sheet` a run names its sheet by the minute it started
  (`scratch/art_alts_<date>_<hhmm>.*`), so two runs started together overwrite one
  sheet and manifest (item 046): give each its own `--sheet`, or build the combined one
  with `--sheet-only` afterwards and delete the timestamped one.
- `art:pick -- <id> <n>` makes candidate `n` the game's art: it becomes
  `art-originals/<id>.png` and is cut into `public/art/<id>.png` by the same keying,
  trimming and palette shrink as `art:gen`. Commit the PNG afterwards. The first pick of
  an id saves the original in `art-originals/restore/` (`<id>.png`, and
  `<id>.game.png`, the committed PNG byte for byte), so `art:pick -- <id> 0` puts it
  back; a later pick leaves it alone. A placeholder has no original, so it has only
  `<id>.game.png`. Before item 020 a second pick overwrote that file with the art then
  in the game: pic_zap's and pic_pow's original is item 018's promotion, not the painted
  placeholder (`art:placeholders` repaints one). Up to item 051 the original was
  candidate 0 in `alts/` (`<id>-0.png`, `<id>-0.game.png`); item 052 moved them all.
- **A pick deletes the id's other candidates** (item 052): every `alts/<id>-<n>.png`
  and brief sidecar goes once the pick is copied to `art-originals/<id>.png` (which
  `--reprocess` reads) and cut, and on `art:pick -- <id> 0` too. So pick from a round
  only when Matt has chosen for that id: a later round on it numbers from 1 again, and
  an old sheet's numbers no longer exist. Then delete the round's `scratch/` sheet,
  manifest, preview folder and briefs once every id in it is decided. `alts/` holds
  only rounds still waiting (`ls art-originals/alts/`): on 2026-10-22, none. Item 123
  promoted item 124's story splashes (`fx_story_fire` 1, `fx_story_tail` 1,
  `fx_story_spin` 2, `fx_story_dive` 3). Item 122 promoted item 120's story props
  (`prop_fight_stone` 1, `prop_fight_ledge` 2, `prop_fight_hoard` 1);
  item 115 promoted item 113's face cards (`face_anna` 1, `face_rilla` 2, drawn with `--ref` on
  each promoted full body). Items 110's and 112's rounds are gone too (promoted by item
  113: Bluerilla 5, good Anna 1), as are items 109's, 009's and 040's.
- Corrections for an id (what an earlier image got wrong: a likeness, a prop that
  crowds a face) are `NOTES` in `content/art/prompts.ts`; they end the prompt for both
  `art:gen` and `art:alts`.
- An outfit of a family member (`char_julia_chef`, item 012) is a record in
  `content/battle/outfits.ts` (its prompt parts; `content/art/assets.ts` makes the entries),
  not a roster character: `refFor` gives any
  `char_<person>_<word>` id that person's photo reference, and the brief reuses their
  roster look up to the clothes. An outfit's face card is `face_<person>_<word>`
  (`face_julia_chef`, item 016), which `refFor` also matches.
- **Where each round is:** a round's sheet and picker manifest are
  `scratch/art_alts_<item>_<name>.png` / `.json` (`ls scratch/art_alts_*`; only the
  rounds still waiting are there, item 052), and a brief round's briefs are
  `scratch/<item>_<name>_<look>.txt`. Runs side by side each write their own sheet and
  manifest; one `--sheet-only` run over all the ids afterwards makes the combined one.
- **Measured costs:** a word picture takes 30 to 50 s and about 0.25 to 0.3% of Codex's
  5-hour window; with a photo reference 35 to 75 s and up to 0.5% (items 032, 035,
  037, 041, 2026-10-19 to 20). Four runs of about 20 ids side by side drew 243 images in
  about 50 minutes and took the 5-hour window from 7% to 66%, the weekly from 30% to 39%
  (item 037). Five runs side by side (two `art:gen`, three `art:alts`) drew 19 word
  pictures in about 4 minutes, 31 to 52 s each, and took the 5-hour window to 5%
  (about 0.25% each), the weekly not past 7% (item 070, 2026-10-21).
- An action word's picture is the hardest to make name itself (SNAP comes out a
  crocodile, LIFT a crane): it is only ever shown after she has read the word, never as
  the thing to find.
- Item 041's cyber briefs use `MATT_LIFTER`'s wording (fit, not bulky), not
  `MATT_FACE`'s bodybuilder.
- Item 043's round (evil chef Jason without the moustache, cyber Matt's face card): Matt
  picked `char_dada_jason_evil` 1 and `face_dada_matt_cyber` 4 (promoted by item 046; a
  face card's brief goes into `HAND`, since its derived prompt follows the full-body
  `look`).
- Item 044's round (the dads' good forms recoloured: Jason forest green, builder and
  lifter Matt blue): Matt's picks were promoted by item 046, then its face round.
- **Green family art must leave `NO_GREEN`.** Every family sprite is keyed as having no
  green (`FAMILY_ART` in `content/art/prompts.ts`), so `keyGreen` treats any green lean as
  screen showing through: a forest-green Jason comes out grey-teal and see-through. Item
  046 carved Jason's three good forms and their face cards out (`GREEN_JASON`); his evil
  forms stay keyed. A green candidate must be out of the set before `art:pick` and
  before `art:alts` cuts the sheet (item 044's per-run sheets showed the washed-out
  cut). Item 049
  keys them light-green-only instead (`LIGHT_GREEN`, `keyMode` in
  `content/art/prompts.ts`, `'lightGreen'` in `tools/art/chroma.ts`): green-leaning
  pixels are un-mixed by how bright their green is, none under 120 and fully from 170,
  so the screen between whisk wires and a lime glow go while his forest green (measured
  under 120) stays solid. `art:gen`, `--reprocess`, `art:alts` and `art:pick` all take
  the mode from `keyMode`. A family form that wears dark green goes in `LIGHT_GREEN`,
  not `NO_GREEN`.
- A script in `scratch/` that imports `../tools/…` or `../content/…` (or `../src/…`) gets
  the **main checkout's** copy, not the worktree's: `scratch/` is a junction and Node
  resolves the real path (item 049; `content/` the same, item 074). Import by absolute path
  (`pathToFileURL(path.resolve('content/…'))`) from the worktree root.
- `npm test` empties `test-results/` as it starts (Playwright's output folder): a
  script or log kept there by a run beside it is deleted. Keep logs in `scratch/`.
- A new `prop_word_machine` means refitting `WINDOW` / `PANEL` in
  `src/scenes/WordMachine.ts`: fractions of the cut `public/art` PNG (centre and radius
  of the glass, centre and size of the blank panel), checked with machine.spec's
  `tests/screenshots/026_round1.png`.
- **Picture letters (item 097):** Charge's `rune_<sound>` ids are the one art whose prompt
  asks for a letter: `spriteStyle` in `content/art/prompts.ts` gives them `LETTER_STYLE`,
  the shared style with "no letters" swapped for "only the named capital letter". Each
  brief is derived from the rune's `picture` in `content/phonics/runes.ts` (word and how
  it makes the letter's shape), so a new look edits `look` there. Since item 103 the
  stone shows them in place of a painted letter: the Charge room's stone (150 px), a done
  Charge door's badge (the word's first rune, 54 px) and the battle's charged-move stone
  (84 px); `artFor` loads only the plan's and `episode.charged`'s runes. The battle HUD's
  30 px rune chips keep the bare letter: a picture letter does not read at that size.
- When Codex answers "Selected model is at capacity", `art:alts` skips that candidate
  and goes on (2026-10-18), so an id can end up with fewer than `n`. Top it up with
  `art:alts -- <id> --n=1`; it numbers on from the last candidate.

## Operational facts

- **Phaser sizes a Text by a fixed sample string (`|MÃ‰qgy`), not its own glyphs**
  (item 085): in Chrome on Windows an emoji stands about 14% of the font size above that
  sample and 3% below it, so every emoji drawn as text (the journey map's 🏰, the ear on
  the yellow dot) had its top cut flat. `installGlyphMetrics` (`src/ui/glyphMetrics.ts`,
  called once in `main.ts`) measures a text's emoji with the sample, so no hand padding is
  needed; text without emoji measures as before.
- **Stopping a backgrounded Playwright run leaves it running** (item 069): Claude Code's
  TaskStop on the shell kills the shell, not the `node …@playwright\test\cli.js`, its
  worker or the `vite` it serves, which keeps the port. Find them by command line
  (PowerShell `Get-CimInstance Win32_Process | ? CommandLine -like '*<worktree>*'`) and
  `Stop-Process` them before starting another run on that port.
- **edge-tts runs through Python, via `uvx`.** On 2026-10-18 Microsoft's endpoint refused
  the npm `edge-tts-universal` 1.4.0 handshake with HTTP 403 (the websocket never opens
  and the library hangs instead of erroring). Upstream Python `edge-tts` 7.3.1 had moved
  to a "v2" token and works. `voice:build` spawns `uvx --from edge-tts==7.3.1 python
  tools/voice/providers/edge_tts_worker.py`; `uv` must be on PATH. If the endpoint
  breaks again, bump the pin in `tools/voice/providers/edgeTts.ts`.
- **A carrier line (`cut` in `lines.json`, item 085: the short A, cut from "Add") is
  decoded by `uv run --no-project --with miniaudio python tools/voice/decode_mp3.py`.**
  The first such build fetches `miniaudio`, so it needs network like the rest. The cut's
  thresholds (`tools/voice/carrier.ts`) are not in the line's fingerprint: after changing
  them, `voice:build -- --force` (or delete `letter_a_sound.mp3`) to re-cut.
- `en-AU-WilliamMultilingualNeural` returned "No audio was received" for most lines
  (2026-10-18); Jormungandr uses `en-NZ-MitchellNeural` instead.
- edge-tts sometimes times a two-word name as one boundary ("Dragon Parade");
  `align.ts` splits it rather than failing.
- The other way round fails: a hyphenated word ("push-ups") counts as one word in the
  text and is timed as two, so `voice:build` rejects the line ("expected 16 spoken
  words ... timed 17"), even with a `say` that spells it as two (item 025). Keep
  hyphens out of lines.
- A rime said alone is a one-syllable line (`rime_at`, item 026), timed about 0.7 s.
  "Ett" came back at 1.39 s (read as letters) and is spelled "Eht"; "En" risks the letter
  name N and is "Ehn". Item 037's measured the same way (2026-10-19): "Igg" 1.25 s, "Unn"
  1.02 s, "Uht" 1.30 s, "Hig" 1.16 s; "Ihg", "Uhn", "Utt" and "Hihg" all about 0.6 s. A
  doubled final letter is not safe either way. Check a new rime's span in `public/voice-gen/manifest.json` after
  `voice:build`.
- `voice:build` made item 037's 3,708 new lines (every action word's five narrator
  lines for all 16 narrators, the hub scenes, the quest variants, 81 word lines) in 13.5
  minutes on 4 workers, about 4.6 lines a second (2026-10-19).
- Letter names (`letter_<x>_name`, item 033) are one-word lines spelled for edge-tts
  ("Vee", "Aitch"): "Double you" for W is timed as two words and fails `voice:build`'s
  word count, so it is "Dubbelyou". Measured 2026-10-19: 0.6–0.9 s each, F 1.35 s, R 1.08 s.
  At real speed the warm-up walked straight (the harness's path) takes about 18 s from the
  hall opening to out of its door.
- edge-tts pads each clip with ~1.5 s of silence; the build cuts mp3 frames after the
  last word + 0.2 s (`tools/voice/mp3.ts`). That took the voice folder from 23.7 MB to
  about 19 MB (1,557 lines then). Generated voice left git on 2026-10-18 (item 008) at
  3,590 mp3s, 42.3 MB with manifest and cache; it lives in `public/voice-gen/` (*Storage*).
- **A throwaway script that imports game code does not go in `scratch/`.** `scratch/` is
  a junction into the main checkout, so a `.ts` file run from there with `npx tsx`
  resolves its relative imports against the main checkout's code, not the worktree's
  (items 027 and 039: a fix looked "missing"). Put it in the worktree (the root, or
  `test-results/` when no `npm test` runs meanwhile, since that empties it) and delete it
  after; or import by `file:///` URL; or keep the body in `scratch/` and run it from the
  worktree root as `node --import tsx --input-type=module -e "$(cat scratch/<file>.mjs)"`
  (its `./content/...` imports then resolve against the root).
- The bubble pops in over 180 ms (scale 0.2 to 1): a screenshot taken just as a bark
  starts shows it tiny. Wait half a second after a line starts before a shot.
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji
  font lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- The game itself needs no network: art is committed, voice is on disk in `public/voice-gen/`.
- Stopping a backgrounded `npx vite` by killing its launcher leaves the node server
  still listening on 5174 (seen 2026-10-18). Find it with `netstat -ano | findstr 5174`
  and stop that PID. A killed `npm run test:all` does the same on 5184 (the next run then
  fails at once with "5184 is already used"; seen 2026-10-18): check the PID's command
  line is this worktree's vite before stopping it. Background `test:all` takes about 5
  minutes (*Tests*), so a 10-minute background timeout suffices (its history:
  `docs/engineering.md`, *Lane times, item by item*).
- Every active ally × villain pair (item 030): `npm run test:pairs`
  (`WW_PAIRS=scar+ npm run test:pairs` plays one ally's seven). Off unless run by that script or with `WW_PAIRS` set:
  otherwise `pairs.spec.ts` shows one skipped test saying so (item 072). An npm script
  cannot set `WW_PAIRS` under Windows' cmd, so the spec reads npm's `npm_lifecycle_event`
  (`test:pairs`) as `WW_PAIRS=+`. Shots and voiced ids land in `tests/screenshots/pairs_*`.
  The active cast is 16 ally forms × 7 villains less the three where the ally is the
  villain's own person (Elsa, Ozymandias, Moriarty): 109 pairs, about 35 s a pair on three
  workers (2026-10-22). `WW_PAIRS` is a
  substring of `<ally>+<villain>`, so `WW_PAIRS=+elsa` plays Evil Elsa's pairs only.
  `--fully-parallel` spreads one run over the three workers: item 115's 45 pairs
  (`WW_PAIRS=+ npx playwright test tests/pairs.spec.ts -g "\+ (elsa|ozymandias|moriarty):"
  --fully-parallel`) took 9 minutes, about 35 s a pair, where one worker would take 26. Several allies at once: `WW_PAIRS=+ npx playwright
  test tests/pairs.spec.ts -g "(elsa|anna) \+ "` (a title is `<ally> + <villain>: …`).
  Such a run uses one worker: item 114's 12 pairs (three allies) took 7 minutes.
  Run batches one ally at a time, never beside art generation (item 028 ran both and the
  machine ran out of memory). The 36 took 1.2 hours on 2026-10-19 (item 031, about 2 minutes a pair).
- Every contest fight style, one battle part each (item 031; one part per style since
  item 083): `tests/fights.spec.ts`, slow lane, about 10 s a style at clock speed 10 (item
  083; the brawl is the default episode's own, played by every default whole episode); shots of each style's big beats (combo, ultimate, counter, finish)
  land in `tests/screenshots/fights_*`. `-g cook_off` plays one style.
- The story fight against Evil Smaug (item 107): `tests/storyFight.spec.ts`, slow lane,
  about 10 s a part at clock speed 10, plus one test with no ally and with a dad as the
  ally (part 2, `?battle=short`). A story fight is no contest, so `fights.spec.ts` skips
  it. Its walks (a dodge, the grab) are answered with `__ww.place` onto `battle.story.walk.spot`;
  shots of the walks, picks and big beats land in `tests/screenshots/story_*`. At real
  speed with real voice and 3 s to answer each input, part 1 took 2.6 minutes and part 2
  1.1 minutes (2026-10-22).
- Long Playwright runs: since item 079 every run serves a build of the code as it was at
  its start (*Tests*, "The suite serves a build"), so edits to `src/` mid-run reach no page
  under test and nothing needs setting up. Test pages add `?hooks=1`, which turns the test
  hooks on in a production build.
- Real time is three `@slow` tests in `tests/episode.spec.ts` since item 083 (the title,
  bedroom and warm-up; a sentence room; battle 1; *Speed, GPU and workers*): in them every
  line is real speech and green is ignored until an instruction finishes. The default whole
  episode beside them plays at the suite's speeds. Everything else runs at clock speed 5,
  battles at 10 (3 before item 036 moved the tests to the GPU). Speed 6 in software GL was
  slower, not faster (her walking overshoots at headless frame rates); measurements in
  `docs/engineering.md`.
- On the GPU, vite's terminal shows `voice: could not decode ... Failed to fetch` warnings
  and `at async Promise.all` stack lines during a test run: a test ending while its page is
  still decoding voice groups aborts the fetches. Harmless; the tests' own checks only count
  voice problems while the page is up.
