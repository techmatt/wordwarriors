# Word Warriors

A learn-to-read game for a four-year-old: phonics minigames that power up flashy mock
battles between her favourite characters. Phaser 3 + TypeScript + Vite.

| Doc | What |
| --- | --- |
| [`docs/episode.md`](docs/episode.md) | Every step of an episode, the cast draw, dad lock, dev keys, `?scene=` URLs |
| [`docs/systems.md`](docs/systems.md) | Each system's entry point |
| [`docs/content.md`](docs/content.md) | Adding content; *Matt says X → run Y* |
| [`docs/testing.md`](docs/testing.md) | How the suite works, writing tests, speed, ports |
| [`docs/tools.md`](docs/tools.md) | Perf, shots, variety, `listen.html`, the bug-hunt checker |
| [`docs/voice-art-pipeline.md`](docs/voice-art-pipeline.md) | Recordings and `voice:import`, voice build facts, real art, candidates |
| [`docs/storage.md`](docs/storage.md) | Where every file lives, the Drive junctions, the scratch home, disk |
| [`docs/engineering.md`](docs/engineering.md) | Measured facts |
| [`docs/qa-findings.md`](docs/qa-findings.md), [`docs/rulings.md`](docs/rulings.md) | Known issues and Matt's calls |

## Run it

```
npm ci
npm run dev
```

Then open **http://localhost:5174** in Chrome or Edge and press F11. Plug the Xbox 360 pad in
first; press green (A) on the title. Keyboard: arrows walk, Space/Enter green, Tab yellow
(say it again / hint), Esc red, 3 blue, backquote / tilde dad lock. **1** (no) and **2**
(yes) are Dad's buttons; at THE END only Dad's 2 starts the next episode. **0** toggles
minigame debug mode in a game room. Wherever she is free to move, green jumps and blue, red
and yellow cast (free play). Nothing is bound to Shift (it opens Sticky Keys). Details:
`docs/episode.md`.

- **`npm ci`** installs exactly what `package-lock.json` pins (about a minute). A fresh
  checkout or worktree needs it first: without it `npx tsc` lands on npm's "not the tsc
  command" stub and `npx tsx` cannot find `@playwright/test`. `npm install <pkg>` only to add
  or bump a dependency, committing the lock file.
- The first install on a machine also needs `npx playwright install chromium
  chromium-headless-shell` (per machine, not per worktree).
- **`npm run play`** plays a production build: the suite's build (`tests/testBuild.ts`,
  skipped when nothing changed) served by `vite preview -c tests/vite.test.config.ts` on 5174
  (`-- --port <n>` for another), `public/` served in place. It shares the suite's build
  folder, so not while a test run in the same checkout serves it.
- **Sound:** browsers keep audio off until a click or key press (a gamepad press may not
  count). While it is off the title shows a small grown-up note; one click or Space turns it
  on. To skip that, start Chrome with `--autoplay-policy=no-user-gesture-required`, e.g.
  `"C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required --user-data-dir=%TEMP%\ww-chrome http://localhost:5174`.
- **Start-up** should reach the title in about 2 s. A minute or more means Vite's watcher is
  walking something big: check for a big folder in the checkout (a `scratch/` folder belongs
  in the scratch home) and that `server.watch.ignored` in `vite.config.ts` still ignores
  `scratch`, `art-originals` and `public/voice-gen`. Ignoring the voice junction does not stop
  new clips being served (Vite serves a `public/` junction live). A dev server holds its
  watched folders open: nothing under it can be renamed while it runs.
- **A slow server shows as the Wait screen and late lines** (lines silent past 4 s,
  `ENSURE_TIMEOUT_MS`), whichever cast plays. Background voice clips take four
  low-priority slots (`BACKGROUND_SLOTS`, `src/voice/VoiceBank.ts`) so a line or a scene's
  art always finds one of Chrome's six connections. To measure a server: `docs/tools.md`, *A
  server's voice for a cast*.
- The game itself needs no network: art is committed, voice is on disk in
  `public/voice-gen/`.

## Playing an episode

Title → bedroom (a dad wakes her: the helper, the villain) → the entry hall's warm-up → the
hub (the gift word and two side-room doors: door a Charge the Spell or the Stretchy Bridge;
door b the Shape-Shifter in 3 episodes of 7, never twice running, else a sentence frame, the
word machine or the rhyme room) → battle part 1 (too strong, retreat) → the hub again (the
attic's counter word) → battle part 2 → the victory scene → the recap → THE END (Dad's 2
plays again). Selection is walking everywhere; yellow says it again or hints.

**[`docs/episode.md`](docs/episode.md)** walks through every step, the cast draw
(`EPISODE_DEFAULTS`), choice mode, dad lock and Dad's buttons, the side rooms, dev keys and
`?scene=` URLs, and difficulty and variety (`DIFFICULTY`, `VARIETY`).

## Tests

Times on this machine (the GPU, three workers); how the suite works: `docs/testing.md`.

| Command | When | What |
| --- | --- | --- |
| `npm test` | After every change (~35 s) | Unit tests and the three `@smoke` browser tests (`tests/fastLane.ts`; arguments go to Playwright; stops itself at 2 minutes) |
| `npm run test:unit` | | Unit tests alone (~27 s; `plansGolden.test` the long pole) |
| `npm run typecheck` | | `src`, `tests`, `content`, `tools` (~2 s). The test runs do not typecheck |
| `npm run test:browser` | Before a commit (~3 min) | Every browser test not tagged `@slow`, plus the specs covering what changed (`npx playwright test <spec>`). Stops itself at 6 minutes |
| `npm run test:slow` / `test:all` | Not by default (Matt): only for a change touching every scene | The `@slow` lane (~5 min) / everything (~6 min) |
| `npm run test:pairs` | When asked | Every ally × villain pair (~1 h; `docs/testing.md`) |

`npx playwright test --list` (with `--grep @slow` or `--grep-invert @slow`) gives the counts.
The suite serves a build made as the run starts, so edits mid-run reach no page under test.

**The golden draws:** `tests/unit/plansGolden.test.ts` pins the house plan's seeded draws
(every minigame kind behind each door) against `plansGolden.json`, so a refactor stays green.
A change meant to alter the draws rewrites the JSON on purpose, from the worktree root:

```
npm run golden
```

On a merge or rebase conflict in tests/unit/plansGolden.json, take either side and rerun the recipe; never resolve it by hand.

### Speed, GPU and workers

Clocks 5× fast (`WW_SPEED`), battles at 10, three GPU workers (`WW_WORKERS`, `WW_GPU=0`),
instant voice, teleport and short battles: `docs/testing.md`, *Speed, GPU and workers*.

### Ports and servers

The suite serves on 5184 (`CONDUCTOR_PORT` when set), never the dev port 5174; shots 5194,
the checker 5195, perf 5196 (`src/port.ts`). Two runs in one worktree, stopping a run, boot
timeouts: `docs/testing.md`, *Ports and servers*.

### Not tests: boot timings, screenshots and variety

`npm run perf`, `SHOTS_TAG=<tag> npm run shots`, `npm run variety -- --episodes=300 --seed=1`
and the cast-voice probe: `docs/tools.md`.

### The bug-hunt checker

`QA_TAG=<tag> npm run qa` (batches by `QA_SET`; it records, it does not test):
`docs/tools.md`, *The bug-hunt checker*. Findings and Matt's calls: `docs/qa-findings.md`.

## Content work

Everything is data under `content/`; `docs/content.md` walks through each kind. After editing
it, the three commands:

```
npm run voice:lines       # regenerate content/voice/lines.json
npm run voice:build       # synthesise new or changed lines into public/voice-gen/
npm run art:placeholders  # paint missing art, rewrite docs/art.md
```

`npm run voice:status` lists every line as recorded, stale or still edge-tts, letter sounds
first (`docs/recording.md`).

### Matt's recordings: the phonics recorder and `voice:import`

The recorder page (`tools/recorder/phonics-recorder.html`, `?only=`, `?missing`), its hosted
copy (never edited there) and `npm run voice:import -- <zip>`: `docs/voice-art-pipeline.md`.

### Listening through the sounds: `listen.html`

http://localhost:5174/listen.html plays every phonic sound as the game sounds it out:
`docs/tools.md`.

### The word bank's coverage rule

The bank covers phonics by rule, not luck. Counting only familiar pictured words (`THINGS`:
not `odd`, not stored, not actions), `COVERAGE` in `content/phonics/bank.ts` asks for:

- **3 per first sound**, every letter sound and digraph (QU counts as Q), unless an entry
  gives a lower target and why;
- **a last sound** for the sounds words end on (3 each for B D G K L M N P S T X CK NG, fewer
  with reasons);
- **8 per short vowel**; **2 pictures per word-machine family**, and the listed families must
  stay families;
- **the Stretchy Bridge:** 3 early words (levels 1–2, a short vowel) per first sound in
  `COVERAGE.bridgeStarts`, so the far bank can show two that start like the word;
- **long vowels**, by their own targets.

`npm run bank:audit` prints the table (`-- --gaps` only shortfalls) and the two-sound trios
(MAT MAP MAN). `tests/unit/coverage.test.ts` fails when a row drops under its target, so
removing, storing or marking a word `odd`, or retiring a family, can go red. Lower a target
only with its reason.

**Sound units:** QU and NG are units like SH (QU sounds as Q's "Kwuh"); doubled letters (FF
LL SS ZZ GG) are one unit sounding as the letter, without raising the level. A hand-`spelled`
word with one short vowel (THUMB: TH U MB, MB saying M) is tagged like any word; a long-vowel
one marked `late` is level 3; a silent letter (KITE's E) has the sound `''`, lit and unsaid.

**Untaught sounds** (Matt's ruling): a familiar picture word may hold a sound she has not
been taught, spelled by hand, each such sound its own placeholder line (`UNTAUGHT_SOUNDS` in
`content/phonics/letters.ts`): `long_oo` (ZOO, IGLOO), `schwa` (ZEBRA, OCTOPUS, UMBRELLA),
`ow` (COW), `x_name` (X-RAY). Such a word is level 3 (`late`), never in a family or on the
bridge.

A word said in a narrator line, threat, quest line, hub scene or rune gesture cannot join
the bank until that line is reworded (the unit tests name it).

### Stored words

A **stored** word is out of every pool (`THINGS`, `ACTIONS`, `LIVE`), so nothing draws it at
any difficulty and a saved bag drops it. `STORED_WHY` in `content/phonics/bank.ts` lists each
with its reason; the grown-ups page lists them on page 3. Today that is BUSH (a wrong short
U) and item 188's UNICORN, TEDDY, ROCKET and BALL, held until their pictures are picked
(`art_alts_188`); HELMET, stored while it had no picture, is live since item 187.
Every other word, `odd` ones included, is live (Matt). A stored word keeps its entry,
picture, `word_<x>` line, effect and move lines (the composer writes them from `ALL_ACTIONS`
and `ALL_FAMILIES`), so storing or restoring one changes nothing in `lines.json`. **To bring
one back, delete its line in `STORED_WHY`**, then `npm run bank:audit`, `npm test` and `npm
run variety` (which exits 1 if a stored word is drawn). A stored word stays in a roster
ability's `words` and a story beat's `answers` (both filtered when drawn); a villain's named
counter waits while its word is stored (`tests/unit/namedCounters.test.ts`). An `odd` thing is
out of play, but an odd `both` word keeps its move pad.

A word a cast's own lines say first (Elsa's ICE, Smaug's DRAGON) is only weighed down in that
episode's key draws (`softSaid`, `SOFT_SAID_WEIGHT`; Matt: hearing it in a character line
first is no problem), never kept out (`tests/unit/castSaid.test.ts`).

## Storage

Every file has one home: git, the Drive folder behind the junctions (`art-originals/`,
`public/voice-gen/`), the scratch home `C:\Code\wordwarriors-scratch` (never a `scratch/`
folder in a checkout), or nowhere. Details, the shared voice folder's rules (`--prune`,
`DROPPED:`) and disk: `docs/storage.md`.

## Real art (Codex image generation)

`npm run art:gen -- <ids…>` on Matt's ChatGPT Plus login, no API key: `docs/voice-art-pipeline.md`.

### Candidates to choose from (`art:alts`, `art:pick`)

`docs/voice-art-pipeline.md`, *Candidates*. A candidate round changes nothing tracked.

### Images outside the game (`art:freeform`)

`docs/voice-art-pipeline.md`, *Images outside the game*.

### Picture letters

Charge's `rune_<sound>` ids are the one art whose prompt asks for a letter: `spriteStyle` in
`content/art/prompts.ts` gives them `LETTER_STYLE` ("only the named capital letter"). Each
brief comes from the rune's `picture` in `content/phonics/runes.ts`, so a new look edits
`look` there. They show on the Charge room's stone (150 px), a done Charge door's badge (54
px) and the battle's charged-move stone (84 px); `artFor` loads only the plan's and
`episode.charged`'s runes. The battle HUD's 30 px rune chips keep the bare letter: a picture
letter does not read at that size.

## Operational facts

**New operational facts go here**, or into the docs file of their subject (`docs/testing.md`,
`docs/tools.md`, `docs/voice-art-pipeline.md`, `docs/storage.md`), never only into a report.

- **Julia's progress is in `C:\Code\gdrive-sync\wordwarriors\progress\progress.json`** (item
  186): the store's JSON, mirrored by the main checkout's dev server on every write, with a
  dated daily backup beside it. Read her progress there, not from a browser. A fresh origin (a
  new port, browser or cleared storage) restores from it at boot. Worktrees and test servers
  never touch it. Details: `docs/storage.md`, *Her save file*.

- **A throwaway script that imports game code does not go in the scratch home:** outside
  every checkout, a `.ts` file run from there finds neither the game's code nor
  `node_modules`. Put it in the worktree and delete it after; or import by `file:///` URL
  (`pathToFileURL(path.resolve('content/…'))` from the worktree root); or keep the body in the
  scratch home and run it from the worktree root as `node --import tsx --input-type=module -e
  "$(cat <scratch home>/<file>.mjs)"`. Throwaway specs live under `tests/`.
- **Stopping a backgrounded process by its launcher leaves the real one running:** a
  Playwright run's `cli.js`, workers and `vite`; an `npx vite` on 5174. Find them by command
  line or port (`netstat -ano | findstr <port>`), check they are this worktree's, and stop
  them (`docs/testing.md`, *Ports and servers*).
- **Phaser sizes a Text by a fixed sample string, not its own glyphs:** an emoji stands above
  that sample in Chrome on Windows. `installGlyphMetrics` (`src/ui/glyphMetrics.ts`, called in
  `main.ts`) measures emoji text properly, so no hand padding is needed.
- **Phaser drops a key event already `defaultPrevented`:** `installBrowserKeys`
  (`src/input/browserKeys.ts`) prevents only the browser's own keys (F1 F3 F6 F7 F10,
  ContextMenu, `/`, `'`) in the capture phase, and Tab in a bubble listener once the game is
  READY; the dev keys and buttons are Controls'.
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji font
  lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- Voice build gotchas (edge-tts via `uvx`, carriers, hyphens, rimes):
  `docs/voice-art-pipeline.md`, *Voice build facts*.
