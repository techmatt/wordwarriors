# CLAUDE.md — Word Warriors

## The project

**Word Warriors** is a learn-to-read game for Julia, age 4. She knows letter names but
not letter sounds; she plays Stardew Valley with an Xbox 360 pad and can hunt-and-peck
letters on a keyboard. She loves exploring rooms and stories that start with her being
woken up in bed. Reading fetches things from the rooms of a small house, and the reward
is a flashy mock battle between characters she likes, which those things power up.

One **episode** (step list in `src/episode/state.ts`; walked through in
`docs/episode.md`): title → **bedroom** (a dad wakes her with the good news, the
helper, and the bad news, the villain; the house takes on the villain's mood; no
reading) → **entry hall warm-up** (`src/scenes/EntryScene.ts`: grab one of nine pictures
from a letter-sound clue; it is her first battle item) → **house part 1** (the hub:
the helper's story scene ends in the **gift word**, her first move word; two side-room
doors, each a minigame from a weighted pool (the **sentence game**, the word machine)
fetching battle items; the front door appears once both are done). For the beta one
door is always a phonics game (`FORCE_PHONICS_ROOM`), at random **Charge the Spell**
(one short word: the helper says each rune's sound and she says it back, no presses;
then she reads the word and Dad judges with keys 1 / 2; the word is a battle item and
its runes fire in the battle) or the **Stretchy Bridge** (she slides over a word's
letter stones, each sound held, and blends the whole word to pick its picture). Then
→ **battle part 1** (the villain's ultimate wins: "too strong, retreat") →
**house part 2** (a secret attic door: the counter sentence fetches the counter-item) →
**battle part 2** (the counter beats the ultimate) → **victory scene**
(`content/house/endings.ts`) → victory with a reading recap → THE END (only Dad's 2 starts the next episode). A journey map shows before
each battle, house part 2 (the way home after the retreat) and the victory.

The cast is drawn every episode (`src/rules/cast.ts`, `ACTIVE_CAST` and `CAST_ODDS` in
`src/config.ts`): villain, ally, the waking dad and each dad's form, and the helper's
quest place. The fixed default episode (`EPISODE_DEFAULTS`, `?cast=default`, what the
tests play): hero Julia, helper Ellie, villain Evil Tiamat. **Parked** (code kept, out
of the episode, reachable by `?scene=`): Sound → Letter, Blend Path, Word → Picture,
Spell the Spell, the alarm and the camp retreat.

**Stack:** TypeScript + Phaser ^3.90 (not 4) + Vite, npm. Playwright (three workers, on a build) for
browser tests, `node:test` via tsx for pure rules. Dev port **5174** (`src/port.ts`);
Playwright serves its own (README, *Ports and servers*). The sibling game
`C:\Code\seraphinas\seraphinas-secret` is read-only reference.

## Where things live

`docs/systems.md` is the entry point for each system; this is the map.

| Path | What |
| --- | --- |
| `src/` | Game source. `main.ts` boots Phaser; `config.ts` sizes, depth bands, pad colours and every tuning knob named below; `hookState.ts` what scenes publish for the tests (and `walkObjects`), `testHooks.ts` installs `window.__ww`; `realTime.ts` wall-clock timeouts (network, decode) the tests' fast clocks do not stretch. |
| `src/scenes/` | One scene per episode step: Boot, Title, Bedroom, Entry (the warm-up), Hub, the side rooms' games (SentenceRoom, WordMachine, ChargeRoom, BridgeRoom), Journey, Ending (the victory scene), Victory (the recap), TheEnd, Parent, Wait (shown while a scene's art loads) and Debug (minigame debug mode's pedestals); parked: Pick, Alarm, Retreat and `minigames/` (the v0.1 games, Spell the Spell among them). "Minigame" means only a pool entry (`src/rules/minigames.ts`). |
| `src/battle/` | The battle simulation: `BattleScene` (the director scripts `part1`/`part2`), `Fighter`, `abilities`, `movement`, `moveChoice` (`MoveChoice`: the frozen-fight word pick), `padPlace` (where its pads go), `hud` (`BattleHud`: names, bars, fetched things, runes); `stages/` stages each fight style. |
| `src/episode/` | `Episode.ts` the episode's flow (scenes call `advance()`; nothing else decides flow), re-exporting `state.ts` (`episode`, the step list), `draws.ts` (the cast draw and what is remembered), `cast.ts` (who plays whom) and `plans.ts` (the episode's other draws); `debug.ts` minigame debug mode's sandboxed runs, `lineVariants.ts` narrator line variants said in turn and the taunts said. All but `Episode.ts` are Phaser-free. |
| `src/input/` | `Controls` (pad + keys + virtual pad), `TextEntry` (A–Z, spelling only), `dadLock`, `dadButtons` (keys 1 / 2, Dad's no / yes), `debugKey` (key 0, minigame debug mode). |
| `src/audio/` | `context`, `sfx` and `music` (synthesised), `VoiceBus` (the one voice arbiter), `holdSound` (letter sounds cut to hold or play once). |
| `src/voice/VoiceBank.ts` | Reads `public/voice-gen/manifest.json` (lines.json only for mute captions when the manifest is missing), decodes by group. |
| `src/art/` | Art on demand: `ArtBank` (load, the `art: not ready` safety net), `needs` (`artFor`: each scene's art), `gate` (`startScene`: every scene starts through it, behind the Wait scene when its art lags). |
| `src/state/` | `ProgressStore` (localStorage, versioned, per sound and per word). |
| `src/rules/` | Phaser-free, unit-tested: the cast, word bank, moves and gift word, warm-up, sentences, word machine, minigame pool, story and victory-scene draws; `difficulty` (the `DIFFICULTY` knob over every help ramp), `recent` (rotations across episodes) and `random` (seeded rand, shuffle, pick). |
| `src/world/` | `RoomScene` (walk-to-answer rooms), `SideRoom` (the base class every side room's game extends, the parked v0.1 games too: no-fail `wrong()`; the piece meter and `right()` are the parked games' only) and `HouseSideRoom` (the four live rooms' base), `Player` (her character as the cursor), `houseMood`. |
| `src/ui/`, `src/fx/` | Caption ribbon, follow-the-speaker bubbles, button dots, bag, `cornerTag` (the grown-ups' DOM corner tags: dad lock, Dad's 1 / 2 cue, DEBUG); particles and juice, `sceneGen` (`SceneGen`: stops a scene run's await chain at shutdown). |
| `src/qa/` | The bug-hunt checker's in-page probe (`?qa=1`; README, *The bug-hunt checker*). |
| `content/battle/roster.ts` | **Every character**, good and evil: style, abilities, taunts, ultimate, counter-item, the villain's house mood. Every roster character is also a villain. The dads' forms are roster characters with `person`. |
| `content/battle/fights.ts`, `forms.ts` | Fight styles (race, rope pull, beam clash, cook-off, brawl); outfits (a character's images for a scenario). |
| `content/house/` | `house.ts` bedrooms, hub, side rooms, entry hall, quest places (`PLACES`); `quests.ts` each ally's quest; `scenes.ts` the hub's story scenes; `endings.ts` the victory scenes. |
| `content/phonics/` | `bank.ts` **the word bank** (every word she reads: level, role `thing` / `action` / `both`); `effects.ts` each word's battle effect; `letters.ts` letter sounds; `sentences.ts` frames; `families.ts` the word machine's rimes; `runes.ts` Charge the Spell's runes; `words.ts`, `spelling.ts`. |
| `content/voice/` | `script.ts` (narrator templates), `ids.ts` (every line id and narrator key comes from its builders, in game and composer alike: never spell `find_move_${w}` by hand), `voices.json`, `lines.json` (generated), `clips/` (recordings that override edge-tts). |
| `content/art/` | `assets.ts` every art id and size; `prompts.ts` the real-art prompts. |
| `public/art/` | Generated, committed. Do not hand-edit. |
| `public/voice-gen/`, `art-originals/` | Untracked junctions to the Drive folder (README, *Storage*): generated voice; full-res art and Matt's private photos. Do not hand-edit. |
| `tools/voice/`, `tools/art/` | `compose.ts` (lines.json from data), `build.ts` (audio + manifest), `import.ts` + `split.ts` (a recorder zip into clips), `clips.ts` (`installClip`), `audio.ts` (codecs); `placeholders.ts`, `generate.ts`, `alts.ts`. |
| `tools/shared.ts`, `tools/phonics/audit.ts` | `isMain`, `runMain`, `exists`, `readLines`, `ART_DIR`, `pngDataUrl` / `fromDataUrl`, shared by the voice and art tools; `bank:audit` (the word bank's coverage table). |
| `tools/recorder/` | `phonics-recorder.html`, the page Matt records the letter sounds on (README, *Matt's recordings*); its hosted copy is synced by the planner, never edited here. |
| `tests/` | Playwright specs + `harness.ts`, `sheets.ts` (`contactSheet`); `unit/` for node:test (`unit/seeds.ts`: `memory`, `seeded`, `seededLcg`); `qa/probe.ts` (`qaLayout`, `qaSince`); `shots/` UI screenshots and `perf/` boot timings (README, *Not tests*); `qa/` the bug-hunt checker. |
| `docs/` | `systems.md` entry points; `episode.md` an episode step by step (the cast draw, dad lock, the phonics rooms, dev keys and `?scene=` URLs, difficulty and variety); `engineering.md` measured facts; `content.md` how to add each kind of content; `recording.md` Matt's voice side; `art.md` (generated) the art brief; `qa-findings.md` the bug-hunt findings (known issues and Matt's calls). |

## Commands

A fresh worktree has no `node_modules/`: run `npm ci` first (README, *Run it*).

| Command | What |
| --- | --- |
| `npm run dev` | Serve at http://localhost:5174 |
| `npm run build` / `npm run preview` | Typecheck, then static `dist/` / serve it |
| `npm run typecheck` | `src`, `tests`, `content`, `tools` |
| `npm test` | Fast lane, after every change (~20 s): unit tests, then the three `@smoke` browser tests |
| `npm run test:unit` | The unit tests alone (~7 s) |
| `npm run test:browser` | Before a commit (~50 s): every browser test not tagged `@slow`, plus the specs covering what changed (`npx playwright test <spec>`). A new browser test over ~10 s gets `SLOW` (README, *Tests*) |
| `npm run test:slow` | The slow lane alone (most of the full run: `@slow`: the real-time scene tests, the whole episodes, the soak) |
| `npm run test:all` | The full run (~5 min): unit tests and every browser test. **Not by default:** only for a change touching every scene |
| `npm run voice:lines` | Regenerate `content/voice/lines.json` from roster + script + phonics |
| `npm run voice:build` | Synthesise new/changed lines (`--force` all, `--prune` drop unused). Needs `uv` and network |
| `npm run voice:status` | Recorded / stale / still edge-tts, letter sounds first |
| `npm run voice:clip -- <id> <file.mp3>` | Put a recording in place of a line |
| `npm run voice:import -- <zip> [--take gNN] [--dry]` | A phonics-recorder zip into clips; writes `scratch/voice-import/review.html` |
| `npm run art:placeholders` | Paint missing/placeholder art, rewrite `docs/art.md` |
| `npm run art:gen -- <ids…>` | Real art via Codex's image tool (README, *Real art*) |
| `npm run art:alts -- <ids…> --sheet=<file>` | Draw candidates (3 per id) and a comparison sheet; the game's art is untouched |
| `npm run art:pick -- <id> <n>` | Make candidate `n` the game's art (`0` restores the original) |
| `npm run bank:audit` | The word bank's coverage table (`-- --gaps` the shortfalls; README, *The word bank's coverage rule*) |
| `npm run perf` | Boot timings (~1.5 min; its own Playwright config, `tests/perf/`) |
| `SHOTS_TAG=<tag> npm run shots [-- shots.pw \| polish.pw]` | UI and battle screenshots into `scratch/` (README, *Not tests*) |
| `QA_TAG=<tag> npm run qa [-- -g <scenario>]` | The bug-hunt checker (README, *The bug-hunt checker*) |
| `npm run test:pairs` | Every ally × villain pair (~1 h; `WW_PAIRS=<part>` for some). Otherwise `pairs.spec.ts` shows one skipped test |

**Faster tests over thorough tests where reasonable** (Matt, 2026-10-21): fewer seeds, a
faster clock, one walk shared by several checks; Matt scales coverage up when he notices
problems. Test-only shortcuts (README, *Speed, GPU and workers*): `boot` adds
`?voice=instant` (a line ends once `__ww.state()` has seen it; `{ voice: 'real' }` for a test
about voice, captions or pacing), `choose` and the move choice teleport with `__ww.place(x, y)`
(`driver.walk` or `walkTo` for walking tests), and `?battle=short` cuts the director's waits
for tests needing only the move choice or the finish.

The timed Charge round asserts its limits only on one worker:
`npx playwright test tests/charge.spec.ts -g snappy --workers=1` (README, *Speed, GPU and
workers*).

The suite serves a build made as the run starts (`tests/vite.test.config.ts`), so edits to
`src/` or `content/` mid-run reach no page under test; only `WW_DEV_SERVER=1` (the dev
server, hot reload and all) still reloads under them (README, *Tests*).

Adding a character, ability, word or line is data work: edit `content/`, then
`npm run voice:lines && npm run voice:build && npm run art:placeholders` ("the three
commands").

A **candidate round** (`art:alts`) changes nothing tracked, so it may run as a
**readonly** item; a new look is a `--brief` file in `scratch/`, not an edit to
`content/art/prompts.ts`. **Promotion** (`art:pick`) is a normal item ("for X I pick n"
in `docs/content.md`, *Matt says X → run Y*; README, *Candidates*).

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

- **No automatic difficulty.** Every help ramp (warm-up, bridge, a solid frame's skipped
  listening pass, sound-alike distractors; Charge the Spell has none) records her level
  but gives its most helpful start until Matt raises `DIFFICULTY`. Words are chosen per game
  by length in sound units, never by level: decoding games short, recognition roles any.
  Every rotation (cast, forms, rooms, games, variants, scenes, words) remembers across
  episodes through the store's `recent` (`src/rules/recent.ts`).
- **No fail states.** A wrong answer gets a gentle, funny retry (fizzle-and-giggle SFX,
  a wiggle, a joke line) and no penalty. Battles cannot be lost: Part 1 always ends with
  the villain's ultimate flooring the heroes, framed as "too strong, retreat and get
  ready", never as losing. Part 2 always ends in victory.
- **Speech rule:** voice everything except the word she must read; that word is spoken
  only after she answers, as confirmation. Letter SOUNDS, never letter names. A hint
  sounds out letters one by one (a digraph, SH CH TH CK, as one sound) and never blends
  them. Letter sounds are never captioned (the placeholder spelling is not text to
  read). Two deliberate exceptions: Spell the Spell says its word first (it is writing,
  not reading; the ghost boxes show every letter), and in the battle's move choice the
  partner says which word to pick (she hears it and finds it written). Choice-word
  moves are never called out during the fight.
- **Move choice holds until she is right.** A wrong pad fires nothing: the fight stays
  frozen, the pad wiggles with the fizzle-and-giggle SFX, and the partner says what she
  picked and what to find ("That wasn't ICE, that was HUG! Find ICE!": `not_move_<right>`,
  `was_move_<picked>`, `find_move_<right>`), as often as it takes. Saying the wrong
  pad's word is fine: she has already picked it. The right pad fires the supercharged
  move. Misses are recorded, never punished.
- **Sentence game:** the sentence's last word is the **key word**, never spoken until
  she has answered. Pass 1 (listen) is voiced karaoke that stops at the key word, which
  pulses in a beat of silence; it is skipped once the frame is solid (`SENTENCE_SOLID`),
  only from `DIFFICULTY` 2.
  Pass 2 (her turn) starts with nothing lit; her one green reads the whole sentence,
  each frame word lit as its own line is said, and stops at the key word, which lights
  in silence and is then sounded out unit by unit (a digraph one sound), never blended
  and never said whole (a non-decodable key word like MICE gets only its first sound).
  Then the pictures wake and her next green takes the one she stands at. Yellow before
  that first green says the instruction again; after it, yellow (and a miss) sounds the
  key word out again. Right: the
  whole sentence is read with the key word. Voice is a prefix line ("Rilla is scared
  of...") plus the key word's own `word_<x>` line, so no line can leak the key word. A
  name in a sentence is the bare character name, the villain's too. Key words, the
  attic's counter word included, come from her word bag: without replacement across
  episodes, leaning to shaky words, never one the episode says or shows first.
- **All text in the game is UPPER CASE**, upper-cased at display time; line texts in
  `lines.json` keep their case (changing them re-synthesises audio). The grown-ups page
  may stay mixed case.
- **Reading targets never print their answer:** word pictures carry no text; names as
  sight words use the name-free `face_<id>` cards. The entry hall's warm-up too: its
  pictures carry no words (with them she matched letters instead of sounding out); its
  word is spoken, so it is never read later that episode, and the hall shows none of the
  words she will read.
- **Every instruction speaks with the spoken word highlighted** (the caption ribbon; in the
  sentence game the banner highlights and the caption stays out of the way).
- **Narrator** = the episode's ally, or with no ally the dad who woke her, in his own
  voice whatever his form. Picks before an ally exists are Dada Matt.
- **Interjections** ("Ha!") are SFX, never `lines.json` lines.
- **Letter sounds** are edge-tts placeholders by sound class (`content/phonics/letters.ts`;
  why the spellings are what they are: `docs/engineering.md`), each its own line id, so
  Matt's recordings in `content/voice/clips/` replace them.
- **Spelling words are CVC**, so the letter-by-letter hint is right; spelling slips are
  recorded apart from reading (`spelling` in ProgressStore).
- **Selection is walking, everywhere.** Her character is the cursor; every choice (room
  objects, doors, the battle's move words) is a place she walks to and presses green
  on, never a coloured button (in the move choice, the word's pad). The only button prompt is a green dot over the thing in
  reach. Yellow always = say it again / hint; green is ignored while an instruction plays.
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
  **dad lock**: she walks, no press does anything, timed re-prompts wait
  (`docs/episode.md`, *Dad lock*). **0** toggles **minigame debug mode** in a game room,
  lock or not; nothing played there counts (`docs/episode.md`, *Minigame debug mode*).
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.

## Matt says X → run Y

"The three commands" are `voice:lines`, `voice:build`, `art:placeholders`.

What to run when Matt asks for a content or tuning change ("add a character", "make it
harder", "for X I pick n"): `docs/content.md`, *Matt says X → run Y*.
