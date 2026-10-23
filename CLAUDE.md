# CLAUDE.md — Word Warriors

## The project

**Word Warriors** is a learn-to-read game for Julia, age 4. She knows letter names but
not letter sounds, plays with an Xbox 360 pad and can hunt-and-peck on a keyboard.
Reading fetches things from the rooms of a small house; the reward is a flashy mock
battle between characters she likes, powered up by what she fetched.

An **episode** runs bedroom wake-up → entry hall warm-up → the hub and two side-room
minigames → battle part 1 (the villain's ultimate wins: retreat) → the attic's counter
sentence → battle part 2 (victory) → victory scene and recap → THE END. Step list:
`src/episode/state.ts`; each step, the cast draw, the phonics rooms, dev keys and
`?scene=` URLs: `docs/episode.md`. The tests play the fixed default episode
(`EPISODE_DEFAULTS`, `?cast=default`: Julia, helper Ellie, villain Evil Tiamat).
**Parked** games (code kept, out of the episode, reachable by `?scene=`): Sound → Letter,
Blend Path, Word → Picture, Spell the Spell, the alarm and the camp retreat.

**Stack:** TypeScript + Phaser ^3.90 (not 4) + Vite, npm. Playwright for browser tests,
`node:test` via tsx for pure rules. Dev port **5174** (`src/port.ts`); Playwright serves
its own (README, *Ports and servers*). `C:\Code\seraphinas\seraphinas-secret` is a
read-only reference.

## Where things live

`docs/systems.md` gives each system's entry point; this is the map.

| Path | What |
| --- | --- |
| `src/` | `main.ts` boots Phaser; `config.ts` sizes, depth bands and every tuning knob; `hookState.ts` / `testHooks.ts` the tests' `window.__ww`; `realTime.ts` wall-clock timeouts the tests' fast clocks do not stretch |
| `src/scenes/` | One scene per episode step, the live side rooms (SentenceRoom, WordMachine, ChargeRoom, BridgeRoom, ShifterRoom), Wait (art loading), Debug (minigame debug mode), Parent; parked: Pick, Alarm, Retreat, `minigames/`. "Minigame" means only a pool entry (`src/rules/minigames.ts`) |
| `src/battle/` | `BattleScene` (the director, `part1`/`part2`), `Fighter`, `moveChoice` (the frozen-fight word pick), `hud`; `stages/` each fight style; `story/` the story fight |
| `src/episode/` | `Episode.ts` the flow (scenes call `advance()`; nothing else decides flow); Phaser-free `state.ts`, `draws.ts`, `cast.ts`, `plans.ts`, `debug.ts`, `lineVariants.ts` |
| `src/input/` | `Controls` (pad, keys, virtual pad), `TextEntry` (A–Z), `dadLock`, `dadButtons`, `debugKey` |
| `src/audio/`, `src/voice/` | Synthesised sfx and music, `VoiceBus` (the one voice arbiter), `holdSound`; `VoiceBank` (reads `public/voice-gen/manifest.json`) |
| `src/art/` | `ArtBank`, `needs` (`artFor`), `gate` (`startScene`: every scene starts through it) |
| `src/state/` | `ProgressStore` (localStorage, versioned) |
| `src/rules/` | Phaser-free, unit-tested game rules and draws; `difficulty`, `recent` (rotations across episodes), `random` (seeded) |
| `src/world/` | `RoomScene` (walk-to-answer rooms), `SideRoom.ts` (`SideRoom`, every side room's base, and `HouseSideRoom`, the live rooms' base), `Player`, `houseMood` |
| `src/ui/`, `src/fx/`, `src/qa/` | Captions, bubbles, button dots, `cornerTag`; particles, `sceneGen`; the bug-hunt checker's probe (`?qa=1`) |
| `content/battle/` | `roster.ts` **every character** (every one is also a villain; the dads' forms have `person`); `fights.ts` fight styles; `forms.ts` outfits; `stories/` story-fight scripts |
| `content/house/` | `house.ts` rooms and quest places; `quests.ts`; `scenes.ts` hub story scenes; `endings.ts` victory scenes |
| `content/phonics/` | `bank.ts` **the word bank**; `effects.ts` battle effects; `letters.ts`; `sentences.ts`; `families.ts`; `runes.ts`; `words.ts`, `spelling.ts` |
| `content/voice/` | `script.ts` narrator templates; `ids.ts` (build every line id with its builders, never by hand like `find_move_${w}`); `lines.json` (generated); `clips/` Matt's recordings |
| `content/art/` | `assets.ts` art ids and sizes; `prompts.ts` real-art prompts |
| `public/art/` | Generated, committed. Do not hand-edit |
| `public/voice-gen/`, `art-originals/` | Untracked junctions to the Drive folder (README, *Storage*). Do not hand-edit |
| `tools/` | `voice/`, `art/`, `shared.ts`, `phonics/audit.ts`; `recorder/phonics-recorder.html` (its hosted copy is synced by the planner, never edited here) |
| `tests/` | Playwright specs, `harness.ts`; `unit/` node:test; `shots/`, `perf/`, `qa/` (README, *Not tests*) |
| `docs/` | `systems.md`, `episode.md`, `engineering.md` (measured facts), `content.md` (adding content), `recording.md`, `art.md` (generated), `qa-findings.md` (known issues and Matt's calls) |

## Commands

A fresh worktree has no `node_modules/`: run `npm ci` first (README, *Run it*). Lanes,
times and test counts: README, *Tests*.

| Command | What |
| --- | --- |
| `npm run dev` | Serve at http://localhost:5174 |
| `npm run build` / `npm run preview` | Typecheck, then static `dist/` / serve it |
| `npm run typecheck` | `src`, `tests`, `content`, `tools` (the tests do not typecheck) |
| `npm test` | Fast lane, after every change (~14 s): unit tests and the `@smoke` browser tests |
| `npm run test:unit` | Unit tests alone |
| `npm run test:browser` | Before a commit (~95 s): every browser test not tagged `@slow`, plus the specs covering what changed (`npx playwright test <spec>`) |
| `npm run test:slow` / `npm run test:all` | The `@slow` lane (~5 min) / everything (~6 min). **Not by default:** only for a change touching every scene |
| `npm run test:pairs` | Every ally × villain pair (~1 h) |
| `npm run voice:lines` / `voice:build` / `voice:status` | Compose `lines.json`; synthesise changed lines (needs `uv` and network); what is recorded |
| `npm run voice:clip -- <id> <file>` / `voice:import -- <zip>` | Install a recording / a phonics-recorder zip (README, *Matt's recordings*) |
| `npm run art:placeholders` / `art:gen -- <ids…>` | Paint missing art and rewrite `docs/art.md` / real art (README, *Real art*) |
| `npm run art:alts -- <ids…>` / `art:pick -- <id> <n>` | Draw candidates / promote one (README, *Candidates*) |
| `npm run bank:audit` | The word bank's coverage table (README, *The word bank's coverage rule*) |
| `npm run perf`, `SHOTS_TAG=<tag> npm run shots`, `QA_TAG=<tag> npm run qa` | Boot timings, screenshots, the bug-hunt checker (README, *Not tests*, *The bug-hunt checker*) |

**Faster tests over thorough tests where reasonable** (Matt): fewer seeds, a faster
clock, one walk shared by several checks; Matt scales coverage up when he notices
problems. A new browser test over ~10 s gets `SLOW`. Test-only shortcuts (instant voice,
teleport, short battle), the timed Charge round's one-worker run and `WW_WORKERS`:
README, *Speed, GPU and workers*. The suite serves a build made as the run starts, so
edits mid-run reach no page under test (README, *Tests*).

**Content work:** adding a character, ability, word or line is editing `content/`, then
"the three commands": `npm run voice:lines && npm run voice:build && npm run
art:placeholders`. When Matt asks for a content or tuning change ("add a character",
"make it harder", "for X I pick n"): `docs/content.md`, *Matt says X → run Y*.

**Art rounds:** a candidate round (`art:alts`) changes nothing tracked, so it may run as
a **readonly** item; a new look is a `--brief` file in `scratch/`, not an edit to
`content/art/prompts.ts`. It never asks Matt which candidate to promote: it finishes with
`pick:` in the report's header, and promotion (`art:pick`) rides a later, normal item.

## Standing contract

- **Reports** go to the path and header conductor's preamble gives, never into this repo.
  ~60-line soft target. Findings, decisions and surprises only; mention tests only for a
  red you could not fix. End with `Report written to <path>`.
- **Commit to the branch you are on.** Commit incrementally as pieces work.
- **Times** in reports and docs are local 12-hour clock times (e.g. 1:40am).
- **Steps over ~30 s run backgrounded**, with a completion waiter on the real process
  (the `npx tsx …` / `playwright` process itself), never on a launcher wrapper.
- **LF line endings** (`.gitattributes` `* text=auto eol=lf`).
- **Operational facts learned while working go into the README**, never only into a report.

## House rules

- **Never commit 20 MB or more of tree bytes without Matt's explicit prior confirmation.**
  Art counts; generated voice is untracked and does not.
- **Matt never edits config or content by hand**; prompts apply the values he dictates.
- **Every file has one home** (README, *Storage*): git, the Drive folder behind the
  junctions, or nowhere for anything rebuilt cheaply.

## Standing design rules (law)

- **No automatic difficulty.** Every help ramp (warm-up, bridge, Shape-Shifter, a solid
  frame's skipped listening pass, sound-alike distractors; Charge the Spell has none)
  records her level but starts at its most helpful until Matt raises `DIFFICULTY`. Each
  game picks words by length in sound units, never by level: decoding games short,
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
  by one (a digraph, SH CH TH CK, as one sound) and never blends them. Where a letter's
  name holds its sound (B D F J K L M N P R S T V Z) a hint or teaching line may say the
  name as a bridge to it ("M's name is Em... squeeze off the front: mmm",
  `letter_<x>_hides`). Two deliberate exceptions: Spell the Spell says its word first
  (it is writing, not reading; the ghost boxes show every letter), and in the battle's
  move choice the partner says which word to pick (she hears it and finds it written).
  Choice-word moves are never called out during the fight.
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
  no words either (with them she matched letters instead of sounding out); its word is
  spoken, so it is never read later that episode, and the hall shows none of the words
  she will read.
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
  with a small 1 ✗ / 2 ✓ cue in a corner. Dev keys are F-keys only: F2 skip step, F4
  auto-answer (Dad's yes where he is asked), F9 parent page. Backquote / tilde toggles
  **dad lock**: she walks, no press does anything, timed re-prompts wait. **0** toggles
  **minigame debug mode** in a game room, lock or not; nothing played there counts. Both:
  `docs/episode.md`.
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.
