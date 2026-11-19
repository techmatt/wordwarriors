# CLAUDE.md — Word Warriors

## The project

**Word Warriors** is a learn-to-read game for Julia, age 4. She knows letter names but
not letter sounds, plays with an Xbox 360 pad and can hunt-and-peck on a keyboard.
Reading fetches things from the rooms of a small house; the reward is a flashy mock
battle between characters she likes, powered up by what she fetched.

An **episode**: bedroom wake-up → entry hall warm-up → the hub and two side rooms →
battle part 1 (the villain's ultimate wins: retreat) → the attic's counter sentence →
battle part 2 (victory) → victory scene and recap → THE END. Steps: `src/episode/state.ts`;
everything else (cast draw, choice mode, rooms, dev keys, `?scene=` URLs): `docs/episode.md`.
The tests play the fixed default episode (`EPISODE_DEFAULTS`, `?cast=default`: Julia,
helper Ellie, villain Evil Tiamat). **Parked** games keep their code but are out of the
episode, reachable by `?scene=`: Sound → Letter, Blend Path, Word → Picture, Spell the
Spell, the alarm and the camp retreat.

**Stack:** TypeScript + Phaser ^3.90 (not 4) + Vite, npm. Playwright for browser tests,
`node:test` via tsx for pure rules. Julia plays on conductor's `game` target, **:5240**;
`npm run dev` uses 5174 (`src/port.ts`); test ports: README, *Ports and servers*.
`C:\Code\seraphinas\seraphinas-secret` is a read-only reference.

**Docs:** the README's table lists them; `docs/systems.md` has each system's entry point.

## Where things live

| Path | What |
| --- | --- |
| `src/` | `main.ts` boots Phaser; `config.ts` every size and tuning knob; `hookState.ts` / `testHooks.ts` the tests' `window.__ww` |
| `src/scenes/` | One scene per episode step; the live side rooms (`SentenceRoom` … `RhymeRoom`); Wait, DebugRoom, Parent, Pick; parked: Alarm, Retreat, `minigames/`. "Minigame" means only a pool entry (`src/rules/minigames.ts`) |
| `src/battle/` | `BattleScene` (the director), `sim`, `abilities` (every ability kind), `moveChoice`; `stages/` fight styles; `story/` the story fight |
| `src/episode/` | `Episode.ts` the flow (scenes call `advance()`; nothing else decides flow); the rest Phaser-free (`state.ts`, `draws.ts`, `plans.ts`, …) |
| `src/input/` | `Controls` (pad, keys, virtual pad), `TextEntry` (A–Z), dad lock, Dad's buttons, debug key |
| `src/audio/`, `src/voice/`, `src/listen/` | Synthesised sfx and music; `VoiceBus` (the one voice arbiter), `VoiceBank` (reads `public/voice-gen/manifest.json`); `listen.html`'s code |
| `src/art/` | `ArtBank`, `needs` (`artFor`), `gate` (`startScene`: every scene starts through it), `pictureBox` |
| `src/state/` | `ProgressStore` (localStorage, versioned); `progress.ts` the one instance; its save file (`saveFile*.ts`, `mirror.ts`; `docs/storage.md`) |
| `src/rules/` | Phaser-free, unit-tested rules and draws: `rooms` (`episodePlans`), `recent` (rotations across episodes), `random` (seeded) |
| `src/world/` | `RoomScene` (walk-to-answer rooms), `SideRoom.ts` (every side room's base), `Player`, `houseMood` |
| `src/ui/`, `src/fx/`, `src/qa/` | Captions, bubbles, the sentence `banner`; particles, `sceneGen`; the bug-hunt checker's probe (`?qa=1`) |
| `content/battle/` | `roster.ts` **every character** (group files in `roster/`; every one is also a villain; the dads' forms have `person`); `fights.ts`, `outfits.ts`, `stories/` (`docs/content.md`) |
| `content/house/` | `house.ts` rooms and quest places; `quests.ts`; `scenes.ts` hub scenes; `endings.ts` victory scenes |
| `content/phonics/` | `bank.ts` **the word bank**; letter sounds, sentence frames, families, runes, battle effects, spelling (`docs/content-words.md`) |
| `content/voice/` | `script.ts` narrator templates; `ids.ts` (build every line id with its builders, never by hand like `find_move_${w}`); `lines.json` (generated); `clips/` Matt's recordings |
| `content/art/` | `assets.ts` art ids and sizes; `prompts.ts` real-art prompts |
| `public/art/` | Generated, committed. Do not hand-edit |
| `public/voice-gen/`, `art-originals/` | Untracked junctions to the Drive folder (`docs/storage.md`). Do not hand-edit |
| `C:\Code\wordwarriors-scratch` | **The scratch home**, outside the repo (`tools/scratch.ts`): logs, briefs, throwaway output, shot runs. Never make a `scratch/` folder in a checkout; a `scratch/…` tool argument means this folder (`docs/storage.md`) |
| `tools/` | `voice/`, `art/`, `phonics/audit.ts`; `recorder/phonics-recorder.html` (its hosted copy is never edited there) |
| `tests/` | Playwright specs, `harness.ts`; `unit/` node:test; `shots/`, `perf/`, `qa/`, `variety/` (`docs/tools.md`); `fixtures/`; the suite's plumbing at the root (`docs/testing.md`) |
| `docs/` | `rulings.md` Matt's standing calls; `qa-findings.md` known issues, the open hunt; `art.md` generated; the rest: the README's table |

## Commands

A fresh worktree has no `node_modules/`: `npm ci` first (README, *Run it*).

**Tests** (each lane's contents, times and `npm run golden`: README, *Tests*):
`npm run typecheck` (~2 s; the test runs do not typecheck); **`npm test` after every
change** (~35 s, unit and `@smoke`); **`npm run test:browser` before a commit** (~3 min),
plus the specs covering what changed (`npx playwright test <spec>`). `test:slow` /
`test:all` **not by default**: only for a change touching every scene.

| Command | What |
| --- | --- |
| `npm run dev` / `build` / `preview` / `play` | Serve (5174) / typecheck and build `dist/` / serve it / play the suite's build |
| `npm run voice:lines` / `voice:build` / `voice:status` | Compose `lines.json`; synthesise changed lines (needs `uv` and network); what is recorded |
| `npm run voice:clip -- <id> <file>` / `voice:import -- <zip>` / `recorder:missing` | Install a recording / a phonics-recorder zip / refresh the recorder's `?missing` list (`docs/voice-art-pipeline.md`) |
| `npm run art:placeholders` / `art:gen -- <ids…>` | Paint missing art and rewrite `docs/art.md` / real art |
| `npm run art:alts -- <ids…>` / `art:pick -- <id> <n>` / `art:freeform` | Draw candidates / promote one / images outside the game (`docs/voice-art-pipeline.md`) |
| `npm run bank:audit` | The word bank's coverage table (README, *The word bank's coverage rule*) |
| `npm run variety`, `perf`, `shots`, `qa` | Simulated episodes' variety, boot timings, screenshots, the bug-hunt checker (`docs/tools.md`) |

**Faster tests over thorough tests where reasonable** (Matt): fewer seeds, a faster
clock, one walk shared by several checks; Matt scales coverage up on problems. A new browser test over ~10 s gets `SLOW`. Test-only shortcuts and
`WW_WORKERS`: `docs/testing.md`, *Speed, GPU and workers*.

**Content work:** adding a character, ability, word or line is editing `content/`, then
"the three commands": `npm run voice:lines && npm run voice:build && npm run
art:placeholders`. When Matt asks for a content or tuning change ("add a character",
"make it harder", "for X I pick n"): `docs/content.md`, *Matt says X → run Y*.

**Art rounds:** a candidate round (`art:alts`) changes nothing tracked, so it may run as
a **readonly** item; a new look is a `--brief` file in the scratch home, not an edit to
`content/art/prompts.ts`. Its sheet, picker manifest and preview cuts go to
`art-originals/picks/` (a junction, so `pick:` can name it). It never asks Matt which
candidate to promote: it ends with `pick:` in the report's header; promotion (`art:pick`) rides a later, normal item.

## Standing contract

- **Reports** go to the path and header conductor's preamble gives, never into this repo.
  ~60-line soft target. Findings, decisions and surprises only; mention tests only for a
  red you could not fix. End with `Report written to <path>`.
- **Commit to the branch you are on.** Commit incrementally as pieces work.
- **Times** in reports and docs are local 12-hour clock times (e.g. 1:40am).
- **Steps over ~30 s run backgrounded**, with a completion waiter on the real process
  (the `npx tsx …` / `playwright` process itself), never on a launcher wrapper.
- **LF line endings** (`.gitattributes` `* text=auto eol=lf`).
- **Operational facts learned while working go into the README** (*Operational facts*)
  or the docs file of their subject, never only into a report.
- **Specs are named by subject, not by bug hunt** (Matt). The hunt-named specs (`hunt4`–
  `hunt7`, `hunt10`, `hunt11`, `lenses`, `rulings`) empty out gradually: when an item next
  touches a test in one, it moves that test (and its neighbours on the same subject) to the
  subject's spec. No sweep.

## House rules

- **Never commit 20 MB or more of tree bytes without Matt's explicit prior confirmation.**
  Art counts; generated voice is untracked and does not.
- **Matt never edits config or content by hand**; prompts apply the values he dictates.
- **Every file has one home** (`docs/storage.md`): git, the Drive folder behind the
  junctions, or nowhere for anything rebuilt cheaply.

## Standing design rules (law)

- **No automatic difficulty.** Every help ramp (warm-up, bridge, Shape-Shifter, rhyme room,
  a solid frame's skipped listening pass, sound-alike distractors; Charge the Spell has
  none) records her level but starts at its most helpful until Matt raises `DIFFICULTY`.
  Each game picks words by length in sound units, never by level: decoding games short,
  recognition roles any. Every rotation (cast, forms, rooms, games, variants, scenes,
  words) remembers across episodes through the store's `recent` (`src/rules/recent.ts`).
- **No fail states.** A wrong answer gets a gentle, funny retry (fizzle-and-giggle SFX, a
  wiggle, a joke line) and no penalty; misses are recorded, never punished. Battles
  cannot be lost: Part 1 always ends with the villain's ultimate flooring the heroes,
  framed as "too strong, retreat and get ready", never as losing. Part 2 always ends in
  victory.
- **Speech rule:** voice everything except the word she must read; that word is spoken
  only after she answers, as confirmation. Letter SOUNDS, never letter names, and never
  captioned (the placeholder spelling is not text to read). A hint sounds out letters one
  by one (a digraph, SH CH TH CK, as one sound) and never blends them. No clue, hint or
  teaching line says a letter's name, not even as a bridge to its sound (X-RAY's "ecks"
  aside). Speech-rule exceptions: Spell the Spell says its word first (it is writing, not reading; the ghost
  boxes show every letter); in the battle's move choice the partner says which word to
  pick (she hears it and finds it written); and the rhyme room's miss says the rhyme
  whole ("Bug, tug... thumb? Listen: bug, tug, rug!"). Choice-word moves are never called
  out during the fight.
- **Move choice holds until she is right.** A wrong pad fires nothing: the fight stays
  frozen, the pad wiggles with the fizzle-and-giggle SFX, and the partner says what she
  picked and what to find ("That wasn't ICE, that was HUG! Find ICE!": `not_move_<right>`,
  `was_move_<picked>`, `find_move_<right>`), as often as it takes. Saying the wrong pad's
  word is fine: she has already picked it. The right pad fires the supercharged move.
- **Sentence game:** the sentence's last word is the **key word**, never spoken until she
  has answered.
  - Pass 1 (listen): voiced karaoke that stops at the key word, which pulses in a beat of
    silence. Skipped once the frame is solid (`SENTENCE_SOLID`), only from `DIFFICULTY` 2.
  - Pass 2 (her turn) starts with nothing lit. Her one green reads the sentence, each
    frame word lit as its line is said, up to the key word, which lights in silence and is
    then sounded out unit by unit (a digraph one sound), never blended and never said
    whole (a non-decodable key word like MICE gets only its first sound). Then the
    pictures wake and her next green takes the one she stands at. Yellow before that
    first green repeats the instruction; after it, yellow (and a miss) sounds the key word
    out again. Right: the whole sentence is read with the key word.
  - Voice is a prefix line ("Rilla is scared of...") plus the key word's own `word_<x>`
    line, so no line can leak the key word. A name in a sentence is the bare character
    name, the villain's too.
  - Key words, the attic's counter word included, come from her word bag: without
    replacement across episodes, leaning to shaky words, never one the episode says or
    shows first.
- **All text in the game is UPPER CASE**, upper-cased at display time; line texts in
  `lines.json` keep their case (changing them re-synthesises audio). The grown-ups page
  may stay mixed case.
- **Reading targets never print their answer:** word pictures carry no text; names as
  sight words use the name-free `face_<id>` cards. The entry hall's warm-up pictures carry
  no words either; its word is spoken, so it is never read later that episode, and the
  hall shows none of the words she will read.
- **Every instruction speaks with the spoken word highlighted** (the caption ribbon; in the
  sentence game the banner highlights and the caption stays out of the way).
- **Narrator** = the episode's ally, or with no ally the dad who woke her, in his own
  voice whatever his form. Picks before an ally exists are Dada Matt.
- **Interjections** ("Ha!") are SFX, never `lines.json` lines.
- **Letter sounds** are edge-tts placeholders by sound class (`content/phonics/letters.ts`;
  why: `docs/engineering.md`), each its own line id, so Matt's recordings in
  `content/voice/clips/` replace them.
- **Spelling words are CVC**, so the letter-by-letter hint is right; spelling slips are
  recorded apart from reading (`spelling` in ProgressStore).
- **Selection is walking, everywhere.** Her character is the cursor; every choice (room
  objects, doors, the battle's move words on their pads) is a place she walks to and
  presses green on, never a coloured button. The only button prompt is a green dot over
  the thing in reach. Yellow always = say it again / hint; green is ignored while an
  instruction plays.
- **The house is data:** rooms in `content/house/house.ts`; the villain's mood over the
  house (tint, decals, ambient fx, the wake-up threat) is `house` on the villain in the
  roster.
- **A door she cannot use yet is not there at all.**
- **Sprites move only by bob and squash/scale.**
- **Keyboard:** A–Z belongs to spelling. Arrows move, Space/Enter green, Esc red, Tab
  yellow, 3 blue (never Shift: five presses open Sticky Keys). In free play green jumps
  and blue / red / yellow cast wherever they mean nothing else. **1 / 2 are Dad's no /
  yes** (`src/input/dadButtons.ts`): live even under dad lock, only where a game asks him,
  with a small 1 ✗ / 2 ✓ cue in a corner. Dev keys are F-keys only. Backquote / tilde
  toggles **dad lock**: she walks, no press does anything, timed re-prompts wait. **0**
  toggles **minigame debug mode** in a game room, lock or not; nothing played there counts.
  Details: `docs/episode.md`.
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.
