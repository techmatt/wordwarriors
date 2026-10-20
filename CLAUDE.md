# CLAUDE.md — Word Warriors

## The project

**Word Warriors** is a learn-to-read game for Julia, age 4. She knows letter names but
not letter sounds; she plays Stardew Valley with an Xbox 360 pad and can hunt-and-peck
letters on a keyboard. She loves exploring rooms and stories that start with her being
woken up in bed. Reading fetches things from the rooms of a small house, and the reward
is a flashy mock battle between characters she likes, which those things power up.

One **episode** (step list in `src/episode/Episode.ts`; walked through in README,
*Playing an episode*): title → **bedroom** (a dad wakes her with the good news, the
helper, and the bad news, the villain; the house takes on the villain's mood; no
reading) → **entry hall warm-up** (`src/scenes/EntryScene.ts`: grab one of nine labelled
pictures from a letter clue; it is her first battle item) → **house part 1** (the hub:
the helper's story scene ends in the **gift word**, her first move word; two side-room
doors, one **sentence game** each, fetch battle items; the front door appears once both
are done) → **battle part 1** (the villain's ultimate wins: "too strong, retreat") →
**house part 2** (a secret attic door: the counter sentence fetches the counter-item) →
**battle part 2** (the counter beats the ultimate) → **victory scene**
(`content/house/endings.ts`) → victory with a reading recap. A journey map shows before
each battle and the victory.

The cast is drawn every episode (`src/rules/cast.ts`, `ACTIVE_CAST` and `CAST_ODDS` in
`src/config.ts`): villain, ally, the waking dad and each dad's form, and the helper's
quest place. The fixed default episode (`EPISODE_DEFAULTS`, `?cast=default`, what the
tests play): hero Julia, helper Ellie, villain Evil Tiamat. **Parked** (code kept, out
of the episode, reachable by `?scene=`): Sound → Letter, Blend Path, Word → Picture,
Spell the Spell, the alarm and the camp retreat.

**Stack:** TypeScript + Phaser ^3.90 (not 4) + Vite, npm. Playwright (one worker) for
browser tests, `node:test` via tsx for pure rules. Dev port **5174** (`src/port.ts`);
Playwright serves its own (README, *Tests*). The sibling game
`C:\Code\seraphinas\seraphinas-secret` is read-only reference.

## Where things live

`docs/systems.md` is the entry point for each system; this is the map.

| Path | What |
| --- | --- |
| `src/` | Game source. `main.ts` boots Phaser; `config.ts` sizes, depth bands, pad colours and every tuning knob named below. |
| `src/scenes/` | One scene per episode step: Boot, Title, Bedroom, Entry (the warm-up), Hub, the side rooms' games (SentenceRoom, WordMachine), Journey, Ending (the victory scene), Victory, Parent; parked: Pick, Alarm, Retreat and `minigames/` (the v0.1 games, Spell the Spell among them). |
| `src/battle/` | The battle simulation: `BattleScene` (the director scripts `part1`/`part2`), `Fighter`, `abilities`, `movement`; `stages/` stages each fight style. |
| `src/episode/Episode.ts` | The episode's state and step list. Scenes call `advance()`; nothing else decides flow. |
| `src/input/` | `Controls` (pad + keys + virtual pad), `TextEntry` (A–Z, spelling only), `dadLock`. |
| `src/audio/` | `context`, `sfx` and `music` (synthesised), `VoiceBus` (the one voice arbiter). |
| `src/voice/VoiceBank.ts` | Reads `public/voice-gen/manifest.json` only, decodes by group. |
| `src/state/` | `ProgressStore` (localStorage, versioned, per sound and per word). |
| `src/rules/` | Phaser-free, unit-tested: the cast, word bank, moves and gift word, warm-up, sentences, word machine, minigame pool, story and victory-scene draws. |
| `src/world/` | `RoomScene` (walk-to-answer rooms), `Player` (her character as the cursor), `houseMood`. |
| `src/ui/`, `src/fx/` | Caption ribbon, follow-the-speaker bubbles, button dots, bag; particles and juice. |
| `src/qa/` | The bug-hunt checker's in-page probe (`?qa=1`; README, *The bug-hunt checker*). |
| `content/battle/roster.ts` | **Every character**, good and evil: style, abilities, taunts, ultimate, counter-item, the villain's house mood. Every roster character is also a villain. The dads' forms are roster characters with `person`. |
| `content/battle/fights.ts`, `forms.ts` | Fight styles (race, rope pull, beam clash, cook-off, brawl); outfits (a character's images for a scenario). |
| `content/house/` | `house.ts` bedrooms, hub, side rooms, entry hall, quest places (`PLACES`); `quests.ts` each ally's quest; `scenes.ts` the hub's story scenes; `endings.ts` the victory scenes. |
| `content/phonics/` | `bank.ts` **the word bank** (every word she reads: level, role `thing` / `action` / `both`); `effects.ts` each word's battle effect; `letters.ts` letter sounds; `sentences.ts` frames; `families.ts` the word machine's rimes; `words.ts`, `spelling.ts`. |
| `content/voice/` | `script.ts` (narrator templates), `ids.ts` (every line id and narrator key comes from its builders, in game and composer alike: never spell `find_move_${w}` by hand), `voices.json`, `lines.json` (generated), `clips/` (recordings that override edge-tts). |
| `content/art/` | `assets.ts` every art id and size; `prompts.ts` the real-art prompts. |
| `public/art/` | Generated, committed. Do not hand-edit. |
| `public/voice-gen/`, `art-originals/` | Untracked junctions to the Drive folder (README, *Storage*): generated voice; full-res art and Matt's private photos. Do not hand-edit. |
| `tools/voice/`, `tools/art/` | `compose.ts` (lines.json from data), `build.ts` (audio + manifest); `placeholders.ts`, `generate.ts`, `alts.ts`. |
| `tests/` | Playwright specs + `harness.ts`; `unit/` for node:test; `shots/` UI screenshots (README, *Tests*); `qa/` the bug-hunt checker. |
| `docs/` | `systems.md` entry points; `engineering.md` measured facts; `content.md` how to add each kind of content; `recording.md` Matt's voice side; `art.md` (generated) the art brief; `qa-findings.md` the bug-hunt findings (known issues and Matt's calls). |

## Commands

A fresh worktree has no `node_modules/`: run `npm ci` first (README, *Run it*).

| Command | What |
| --- | --- |
| `npm run dev` | Serve at http://localhost:5174 |
| `npm run build` / `npm run preview` | Typecheck, then static `dist/` / serve it |
| `npm run typecheck` | `src`, `tests`, `content`, `tools` |
| `npm test` | Fast lane, after every change (~1 min): unit tests, then the browser tests not tagged `@slow` |
| `npm run test:unit` | The unit tests alone (~3 s) |
| `npm run test:slow` | The slow lane alone (`@slow`, the real-time episode, the soak) |
| `npm run test:all` | Both lanes (~18 min). **Not by default:** before a commit run the fast lane plus the specs covering what changed (`npx playwright test <spec>`); the full suite only for a change touching every scene |
| `npm run voice:lines` | Regenerate `content/voice/lines.json` from roster + script + phonics |
| `npm run voice:build` | Synthesise new/changed lines (`--force` all, `--prune` drop unused). Needs `uv` and network |
| `npm run voice:status` | Recorded / stale / still edge-tts, letter sounds first |
| `npm run voice:clip -- <id> <file.mp3>` | Put a recording in place of a line |
| `npm run art:placeholders` | Paint missing/placeholder art, rewrite `docs/art.md` |
| `npm run art:gen -- <ids…>` | Real art via Codex's image tool (README, *Real art*) |
| `npm run art:alts -- <ids…> --sheet=<file>` | Draw candidates (3 per id) and a comparison sheet; the game's art is untouched |
| `npm run art:pick -- <id> <n>` | Make candidate `n` the game's art (`0` restores the original) |

Adding a character, ability, word or line is data work: edit `content/`, then
`npm run voice:lines && npm run voice:build && npm run art:placeholders` ("the three
commands" below).

A **candidate round** (`art:alts`) changes nothing tracked, so it may run as a
**readonly** item; a new look is a `--brief` file in `scratch/`, not an edit to
`content/art/prompts.ts`. **Promotion** (`art:pick`) is a normal item: commit the PNG,
and for a brief's candidate write the brief it prints into the roster `look` (a
character) or `HAND` in `content/art/prompts.ts`, in the same commit (README,
*Candidates*).

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
- **Matt never edits config or content by hand**; prompts apply the values he dictates.
- **Never commit 20 MB or more of tree bytes without Matt's explicit prior confirmation.**
  Art counts; generated voice is untracked and does not.
- **Every file has one home** (README, *Storage*): git, the Drive folder behind the
  junctions, or nowhere for anything rebuilt cheaply.

## Standing design rules (law)

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
  pulses in a beat of silence; it is skipped once the frame is solid (`SENTENCE_SOLID`).
  Pass 2 (her turn) starts with nothing lit; each green lights the next word and says
  it (green waits for the word), except the key word, which lights in silence. Yellow on
  a frame word says it; yellow on the key word sounds its letters one by one, never
  blended (a non-decodable key word like MICE gets only its first sound). Right: the
  whole sentence is read with the key word. Voice is a prefix line ("Rilla is scared
  of...") plus the key word's own `word_<x>` line, so no line can leak the key word. A
  name in a sentence is the bare character name, the villain's too. Key words, the
  attic's counter word included, come from her word bag: without replacement across
  episodes, leaning to shaky words, never one the episode says or shows first.
- **All text in the game is UPPER CASE**, upper-cased at display time; line texts in
  `lines.json` keep their case (changing them re-synthesises audio). The grown-ups page
  may stay mixed case.
- **Reading targets never print their answer:** word pictures carry no text; names as
  sight words use the name-free `face_<id>` cards. The one exception is the entry hall's
  warm-up: she finds a word by its letters, so each picture has its word on a plaque;
  that word is spoken, so it is never read later that episode, and the hall shows none
  of the words she will read.
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
  on, never a coloured button. In the move choice her hero walks onto the word's pad
  while the fight is frozen. The only button prompt is a green dot over the thing in
  reach. Yellow always = say it again / hint; green is ignored while an instruction plays.
- **The house is data:** rooms in `content/house/house.ts`; the villain's mood over the
  house (tint, decals, ambient fx, the wake-up threat) is `house` on the villain in the
  roster.
- **A door she cannot use yet is not there at all.**
- **Sprites move only by bob and squash/scale.**
- **Keyboard:** A–Z belongs to spelling. Arrows move, Space/Enter green, Esc red, Tab
  yellow. Dev keys are F-keys only: F2 skip step, F4 auto-answer, F9 parent page.
  Backquote / tilde is **dad lock**: she walks, no press does anything, timed re-prompts
  wait; again to unlock.
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.

## Matt says X → run Y

"The three commands" are `voice:lines`, `voice:build`, `art:placeholders`.

| Matt says | Run |
| --- | --- |
| "add a character / ability / taunt" | `content/battle/roster.ts`, the three commands |
| "add words" / "add a move word" | a `BANK` entry in `content/phonics/bank.ts` (role `thing`, `action` or `both`), its picture brief in `PICTURES` (`content/art/prompts.ts`), its battle effect in `content/phonics/effects.ts` (`docs/content.md`, "A word"), the three commands |
| "Julia knows X" / "she doesn't know what X is" | remove / add `odd` on X's `BANK` entry (an odd word is never a picture to match) |
| "more wake-up lines" / "another sorry for X" | `WAKE_LINES` in `content/voice/script.ts` (`up_<n>`, `good_<n>`, `door_<n>`, `WAKE_VARIANTS`); `reformed.sorry` / `.ending` on X in the roster; then `voice:lines`, `voice:build` |
| "add a sentence / frame" / "what X does in battle" | `FRAMES` in `content/phonics/sentences.ts`; X's effect in `content/phonics/effects.ts`; the three commands |
| "add a hub scene / quest line" | `HUB_SCENES` in `content/house/scenes.ts`; a quest's `lines` in `content/house/quests.ts` (`docs/content.md`, "A hub scene", "A quest"), the three commands |
| "X casts spells" / "X's gift should sound like a spell" | `CASTERS` in `content/house/scenes.ts`; `spell` on `BANK` entries marks spell-sounding words |
| "blends sooner / later" / "digraphs sooner / later" | `BANK_DRAW.levels` in `src/config.ts` (`start`, `full`, `min` per level) |
| "add a bedroom / side room / villain mood" | `content/house/house.ts` or the villain's `house` in the roster, the three commands |
| "turn the pick screens back on" / "always the same cast" | `EPISODE_DEFAULTS` in `src/config.ts` (`pickScreens`, `randomCast: false`) |
| "Matt should wake her more / less often" | `CAST_ODDS` in `src/config.ts` |
| "switch X on / off" (in the random cast) | `ACTIVE_CAST` in `src/config.ts` (allies, villains; persons, a dad in all his forms) |
| "add a dad form" / "add a quest" / "add a minigame" | `docs/content.md`: a roster entry with `person`; `QUESTS` + `PLACES`; `MINIGAMES` |
| "add a word family / silly word" / "more or fewer machine words" | `RIMES` in `content/phonics/families.ts` (then `voice:lines`, `voice:build`); `WORD_MACHINE` in `src/config.ts` |
| "add a victory scene" / "change what they say at the end" | `ENDINGS` in `content/house/endings.ts` (`docs/content.md`, "A victory scene"), the three commands, then `art:alts` |
| "make X a race / a cook-off" / "chef Jason should cook more" | `fight` on X in the roster; `fightNudge.chance` on `dada_jason` (`docs/content.md`, "A fight style") |
| "make it the chef episode" | `?ally=dada_jason` (Julia's chef form follows; outfits are `content/battle/forms.ts`) |
| "here is real art for X" | copy it to `public/art/<id>.png` (ids in `docs/art.md`) |
| "here are my letter sound recordings" | `docs/recording.md` |
| "the warm-up is too hard / too easy" / "start new words at level N" | `GRAB.startLevel` (and `helpAfter`) in `src/config.ts` |
| "for X I pick n" (from an `art_alts_*` sheet) | `npm run art:pick -- X n`, commit `public/art/X.png`; if it prints a brief, write it into X's roster `look` (or `HAND`) in the same commit |
| "try a new look for X" / "draw X as …" | a brief file in `scratch/`, then `npm run art:alts -- X --n=2 --brief=scratch/<name>.txt --sheet=scratch/art_alts_<item>_<name>.png` (readonly; Matt picks) |
