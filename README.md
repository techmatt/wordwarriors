# Word Warriors

A learn-to-read game for a four-year-old: phonics minigames that power up flashy mock
battles between her favourite characters. Phaser 3 + TypeScript + Vite.

## Run it

```
npm ci
npm run dev
```

`npm ci` installs exactly what `package-lock.json` pins (a fresh checkout or worktree);
`npm install <pkg>` only when adding or bumping a dependency, committing the lock file.

Then open **http://localhost:5174** in Chrome or Edge and press F11 for fullscreen. Plug
the Xbox 360 pad in first; press green (A) on the title screen. The keyboard works too:
arrows to walk, Space/Enter for green, Tab for yellow (say it again / hint), Esc for red, 3 for blue, and the
backquote / tilde key for dad lock (`docs/episode.md`, *Dad lock*). The number keys **1** (no) and **2** (yes) are
Dad's, for the games that ask him whether she said it (`docs/episode.md`, *Dad buttons*).

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
the art painter: `npx playwright install chromium chromium-headless-shell`.

A fresh conductor worktree has no `node_modules/`: run `npm ci` first (about a minute).
Without it `npx tsc` lands on npm's "this is not the tsc command you are looking for"
stub and `npx tsx` cannot find `@playwright/test`. The Playwright browsers are per
machine, so a worktree does not need them again.

## Playing an episode

Title → bedroom (a dad wakes her: the helper, the villain) → the entry hall's warm-up →
the quest place (the hub: the gift word, two side-room doors, one of them Charge the Spell
or the Stretchy Bridge) → battle part 1 (too strong, retreat) → the hub again (the attic's
counter word) → battle part 2 → the victory scene → the recap. Selection is walking
everywhere; yellow (Tab) says it again or hints.

**[`docs/episode.md`](docs/episode.md)** walks through every step, who is in an episode
(the cast draw, `EPISODE_DEFAULTS`), dad lock and Dad's buttons, Charge the Spell, the
Stretchy Bridge and held sounds, the dev keys and `?scene=` URLs, and difficulty and
variety (`DIFFICULTY`, `VARIETY`).

## Tests

Two lanes (re-measured in item 061, 2026-10-20):

- **Fast lane, after every change: `npm test`** (about 1½ minutes: the unit tests 5 s, then 20
  browser tests in 87 s on two workers, most 3-7 s each, none over 12 s on one worker;
  130 s with `--workers=1`). The browser tests not tagged
  `@slow`: one of each newer room (the bridge at level 3, a Charge round, free play's
  shots and jump, the word machine opening), the cover check on Smaug's counter banner, the
  two layout checks, title and the grown-ups page, a solid sentence frame, dad lock, a key
  held through a scene change, Spell the Spell, the cast and fight-style overrides, never
  last episode's victory scene, and the three text-fit checks. It stops itself at 6
  minutes (`--global-timeout`), so a hang fails inside Claude Code's 10-minute background
  cap instead of being killed by it. `npm run test:unit` runs the unit tests alone (5 s).
  On 2026-10-21 (item 068, after item 067's variety test) the lane was 22 browser tests in
  2.0 minutes. `npm run typecheck` checks `src`, `tests`, `content` and `tools` (both
  tsconfigs; `npm run build` runs it first), which the tests do not.
- **Everything: `npm run test:all`** (about 19 minutes; 31 before item 061). The fast lane
  plus the slow lane, which `npm run test:slow` runs alone (about 17 minutes, 58 tests on two
  workers): every test tagged `@slow`, the one whole episode at real time (6 minutes, the
  lane's floor: the other worker plays everything else meanwhile), the whole drawn episodes
  (1.5-1.9 minutes each), the soak (3 minutes). Not run by default (Matt, 2026-10-20): before a commit, the fast lane
  plus the browser specs that cover what changed (`npx playwright test <spec>`, both
  lanes of it); the full suite only when clearly needed, such as a change touching every scene.

### Writing a browser test

A new browser test that takes more than about 10 s gets `SLOW` (`{ tag: '@slow' }`, from
`tests/harness.ts`) as its options; `--grep @slow` matches the tag, not the title. Item 061
found the fast lane at 7.8 minutes because 19 tests over 10 s (most of `cover`, `freeplay`,
`bridge` and `charge`) had come in untagged; keep one cheap test of a new feature in the fast
lane and tag the rest. A test that fails only on some draws is not flaky: the bridge's
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
the scene you want, never for "anything but Boot". `tests/lazyart.spec.ts` (fast lane)
slows every picture by 150 ms and checks the hub waits, then opens with nothing missing.
A browser test fails on any `art: not ready` warning (`collectErrors`).

To force a key word, seed the progress blob with `bag: { left: [word], round: 1 }` **and**
`bagKnown: BAG_WORDS` (`tests/soundout.spec.ts`): a blob without `bagKnown` counts as one
from before item 035, and the store tops the bag up with every word added since (item 048).

### What each spec plays

Every browser test plays the fixed default episode (`tests/harness.ts` adds
`cast=default`) unless its URL asks for a draw (`seed=`): drawn casts walk from the bedroom
through the warm-up to the quest place in `tests/entry.spec.ts` (four seeds), and three
whole random episodes play in the slow lane, two in `tests/soak.spec.ts` (seed 1 and the
draw after it) and one in the word machine's episode (seed 19) (item 025).

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
covers its three help levels, a wrong picture and a drawn episode (item 054).
`tests/machine.spec.ts` opens the word machine in the fast lane, and in
the slow lane plays whole visits (a silly tile first, F9 out and back) and a whole
episode with it behind door a (item 026).

`leaveBedroom` also plays the entry hall's
warm-up (item 033) unless given `{ grab: false }`, so a test that walks out of the bedroom
lands in the hub as before; `tests/entry.spec.ts` (slow lane) plays the warm-up itself:
each level's clue, three misses, F9 out and back, and four drawn casts from the bedroom.

`playEpisode` checks each battle part's length (45-120 s of simulation time) for whatever
fight style the cast drew; `tests/fights.spec.ts` sweeps the four contests through both
battles (the brawl is the default episode's own).

### Speed, GPU and workers

The browser tests run the page's clocks 5× fast (`WW_SPEED`, default 5; `tests/harness.ts`):
timers, tweens, the game loop and voice playback together. The full-episode test alone
runs at real time (speed 1), so real pacing stays covered. `WW_SPEED=1 npm test` runs
the fast lane at real time.

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
`playwright.config.ts`): battles run at ~56 fps instead of headless software GL's 11-18,
and a fight-style test takes 53 s instead of 78 s. `WW_GPU=0` goes back to software GL (for
a machine without a usable GPU, or to rule the GPU out when something looks wrong). Two
workers on the GPU, one on software GL (item 061, `playwright.config.ts`): two take the fast
lane from 130 s to 87 s and the slow lane to 17 minutes (one worker: 23 minutes before item
061 moved 19 tests into it, so about 27 now, not measured), each test 20-30% slower
(up to 2× beside the real-time episode) but two at a time; three saved nothing more (83 s)
and stretched a Charge round's game time past its limit. Tests are spread by file, so two
tests of one spec never run at once. A run that times something (the Charge round's
limits, above) wants `--workers=1`.

### Ports and servers

The suite starts its own server on port 5184 (`TEST_PORT` in `src/port.ts`), never the dev
port 5174, so a test run in a worktree cannot attach to the main checkout's dev server.
If 5184 is busy (another worktree's run) the suite fails at once rather than testing the
wrong code. With `CONDUCTOR_PORT` set (a conductor item is given one) the suite serves
itself on that port instead (item 047), so a conductor run needs nothing started by hand:
`npm test` or `npx playwright test <spec>` as usual. Do not serve vite yourself from a
Claude Code session and point `WW_BASE_URL` at it: a backgrounded server is stopped after
its background `timeout` (10 minutes by default), mid-suite, and every later test fails
(item 043). Run the playwright process itself in the background instead; the server it
starts lives exactly as long as the run. `WW_BASE_URL` stays for a server you keep
running yourself (a `vite preview` of a build).

A test that times out "waiting for title" (or "parent page", "hub quiet") with `scene=`
empty never got past the boot's loading. Seen in item 034 when the machine was loaded (and
in any run where `src/` changed underneath: the dev server reloads the page): the same
tests passed when rerun alone. Rerun them alone before suspecting the code. The same
reload shows as "page.evaluate: Execution context was destroyed, most likely because of a
navigation" (item 067: five slow specs lost to edits made mid-run). Do not edit `src/`
or `content/` while a browser run is going, or point the run at a `vite preview` build
with `WW_BASE_URL`. A playwright run loads its spec files
once at its start, so a spec edited mid-run needs a rerun.

### Not tests: boot timings and screenshots

Each has a Playwright config of its own, behind an npm script (item 072): `npm run perf`,
`npm run shots`, `npm run qa` (below), and `npm run test:pairs` (*Operational facts*).
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
`SHOTS_PORT`, else 5194 (in a conductor item: `SHOTS_PORT=$CONDUCTOR_PORT`). Since item 072
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

### The bug-hunt checker (item 039)

`QA_TAG=<tag> npm run qa` plays whole episodes at
clock speed 5 across casts, dads' forms, places, all five fight styles, the word machine,
wrong answers everywhere, dad lock, seeded progress (blends and digraphs open) and three
episodes back to back (`SCENARIOS` in `tests/qa/qa.pw.ts`; `-g <name>` for one,
`QA_SET=quick` for three, `QA_SET=more` for the second batch: the other places and dads'
forms, an idle child who stands still at every choice, more seeds; `QA_SET=new` for the
third, item 069's: a busy child pressing blue, red and yellow all episode (free play),
`DIFFICULTY` 2 and 3 with seeded progress, Charge and the bridge answered right, and four
real draws back to back; `QA_SET=all` every batch).
About 1.5 minutes an episode, 26 minutes the first batch. It is not a test: it records.
In a conductor item pass its port: `QA_PORT=$CONDUCTOR_PORT`.

- **Item 069's checks:** free play never over its cap of live shots (`shots-over-cap`), a
  busy child whose casts never fired (`mash-dead`), and in a scenario whose URL forces no
  cast or room, the rotations across episodes (`repeat`: the villain or victory scene of
  the episode before is a bug, the same ally or side rooms a look; `repeat-word`: a word
  read in an earlier episode of the run). Each scenario's JSON lists what each episode
  drew (`drawn`).
- **Silent lines at test speed are a look, not a bug** (item 069): at speed 5 the game asks
  for lines five times faster than the decode queue serves them (a drawn narrator's ~500
  clips), so lines still `queued` or `decoding` play silent in a sweep, while a whole
  episode at real speed had none. Check one at real speed before calling it a bug:
  `WW_SPEED=1 QA_TAG=<tag> npm run qa -- -g "qa seed101$"`
  (about 7 minutes). `failed`, `none` and `suspended` stay bugs at any speed.
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
- Its server (port 5195, `QA_PORT` to move it) does not watch files, so editing `src/`
  during a sweep neither reloads it nor mixes code. **Do not run a second browser run
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

### Matt's recordings: the phonics recorder and `voice:import` (item 057)

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
  target id and the bridge's cut of each repeat, looped. `--dry` writes only that.

Then `npm run voice:build` (no network: recorded lines are copied, not synthesised).
The recorder counts each take with the importer's own detector (its `detector:begin` /
`detector:end` block; `tests/unit/voiceImport.test.ts` runs the two side by side), so a
take the page says counts out is one the importer takes.

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

### The word bank's coverage rule (item 056)

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

The main checkout holds the junctions; conductor links each worktree's to the same Drive
folders, so a worktree shares one copy and never needs a full voice rebuild. Because the
voice folder is shared, `voice:build` keeps mp3s of lines that left `lines.json` (another
branch may still speak them); `voice:build -- --prune` deletes them. The flip side: there
is one `manifest.json`, so a branch that changes a line's text and runs `voice:build`
changes what main speaks for that id too, before the branch lands (item 009 re-voiced
630 `need_item_*`/`made_item_*`/`got_counter_*` lines this way). The same goes for
lines: a build writes the manifest from its own `lines.json`, so one from a checkout
without some lines (an older branch, a worktree cut before a merge) drops them for
everyone. Since item 062 it says so in a `DROPPED:` block; if main still speaks them, run
`voice:build` in main. A checkout without
`public/voice-gen/` runs mute with captions, and the unit test that checks the manifest
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
- **Test runs reload under you:** `art:gen` writes into `public/`, and a vite dev server
  full-reloads the page on that, so a Playwright run during generation fails with
  "execution context was destroyed". Test after generating, or against a build.

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
npm run art:alts -- <ids…> [--n=3] [--sheet=scratch/<name>.png] [--sheet-only] [--manifest-only] [--no-ref] [--brief=scratch/<brief>.txt]
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
- **Promoting a brief's candidate:** `art:pick` prints the brief after cutting the image.
  Write it into the game in the same commit: a character's `look` in
  `content/battle/roster.ts` (its prompt is derived from that, so `docs/art.md` follows;
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
  manifest, preview folder and briefs once every id in it is decided. `alts/` now holds
  only rounds still waiting: item 009's `arena_street`, `char_anna_evil`,
  `char_dada_matt_evil`, `face_julia` (never promoted; `scratch/art_alts_009*` kept
  for them) and item 040's `pic_chin`, `pic_dish`, `pic_sand`, `pic_ten` (words
  since cut from the bank; previews in `scratch/040_alts_pic_*`).
- Corrections for an id (what an earlier image got wrong: a likeness, a prop that
  crowds a face) are `NOTES` in `content/art/prompts.ts`; they end the prompt for both
  `art:gen` and `art:alts`.
- An outfit of a family member (`char_julia_chef`, item 012) is a hand-added entry in
  `content/art/assets.ts`, not a roster character: `refFor` gives any
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
- When Codex answers "Selected model is at capacity", `art:alts` skips that candidate
  and goes on (2026-10-18), so an id can end up with fewer than `n`. Top it up with
  `art:alts -- <id> --n=1`; it numbers on from the last candidate.

## Operational facts

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
  after; or import by `file:///` URL.
- The bubble pops in over 180 ms (scale 0.2 to 1): a screenshot taken just as a bark
  starts shows it tiny. Wait half a second after a line starts before a shot.
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji
  font lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- The game itself needs no network: art is committed, voice is on disk in `public/voice-gen/`.
- Stopping a backgrounded `npx vite` by killing its launcher leaves the node server
  still listening on 5174 (seen 2026-10-18). Find it with `netstat -ano | findstr 5174`
  and stop that PID. A killed `npm run test:all` does the same on 5184 (the next run then
  fails at once with "5184 is already used"; seen 2026-10-18): check the PID's command
  line is this worktree's vite before stopping it. Background `test:all` needs a timeout
  over its ~18 minutes; a 10-minute limit kills it partway, so give it 40. It had grown
  to 26 minutes with items 025 and 026, 37 with item 031's fight styles and 45 with item
  033's warm-up spec (2026-10-19); item 036 brought it back to 18 (8:49pm the same day):
  duplicated walks folded together, the GPU, clock speed 5. The one real-time episode is
  6 of those minutes.
- Every active ally × villain pair (item 030): `npm run test:pairs`
  (about 1.8 minutes a pair at clock speed 3, an hour for all 36; `WW_PAIRS=scar+ npm run
  test:pairs` plays one ally's four). Off unless run by that script or with `WW_PAIRS` set:
  otherwise `pairs.spec.ts` shows one skipped test saying so (item 072). An npm script
  cannot set `WW_PAIRS` under Windows' cmd, so the spec reads npm's `npm_lifecycle_event`
  (`test:pairs`) as `WW_PAIRS=+`. Shots and voiced ids land in `tests/screenshots/pairs_*`.
  Run batches one ally at a time, never beside art generation (item 028 ran both and the
  machine ran out of memory). An edit to `src/` mid-run reloads the dev server's page and
  fails the pair in play ("execution context was destroyed"): use a build, below.
  The 36 took 1.2 hours on 2026-10-19 (item 031, about 2 minutes a pair).
- Every contest fight style through both battles (item 031): `tests/fights.spec.ts`, slow
  lane, about 2½ minutes (the brawl is the default episode's own, played by every default
  whole episode); shots of each style's big beats (combo, ultimate, counter, finish)
  land in `tests/screenshots/fights_*`. `-g cook_off` plays one style.
- Long Playwright runs: point them at a build so edits to `src/` do not hot-reload the
  page under test: `npx vite build --outDir scratch/dist-test`, `npx vite preview --outDir
  scratch/dist-test --port 5175`, then `WW_BASE_URL=http://localhost:5175 npx playwright test`.
  Test pages add `?hooks=1`, which turns the test hooks on in a production build.
- Until 2026-10-18 the suite reused whatever answered on 5174, so a run in a worktree
  silently tested the main checkout's dev server. It now always starts its own vite on
  5184 (`TEST_PORT`; `CONDUCTOR_PORT` when set, item 047) and never reuses one; with
  `WW_BASE_URL` set it starts none.
- The full-episode test (`npm run test:slow`) takes about 6 minutes: every line is
  real speech and green is ignored until an instruction finishes. It is the one test at
  real time; everything else runs at clock speed 5 (3 before item 036 moved the tests to
  the GPU). Speed 6 in software GL was slower, not faster (her
  walking overshoots at headless frame rates); measurements in `docs/engineering.md`.
- Headless Chromium renders the battle at roughly 8–18 fps (software GL). With the GPU
  (Playwright `channel: 'chromium'` plus `--use-angle=d3d11`) the same battle holds a
  steady 56 fps on this machine (measured 2026-10-18, 2 heroes vs Evil Smaug); the tests
  draw that way since item 036 (`WW_GPU=0` for software). Tests never assert on frame
  rate or displacement.
- On the GPU, vite's terminal shows `voice: could not decode ... Failed to fetch` warnings
  and `at async Promise.all` stack lines during a test run: a test ending while its page is
  still decoding voice groups aborts the fetches. Harmless; the tests' own checks only count
  voice problems while the page is up.
