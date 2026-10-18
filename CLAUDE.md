# CLAUDE.md — Word Warriors

## The project

**Word Warriors** is a learn-to-read game for Julia, age 4. She knows letter names but
not letter sounds; she plays Stardew Valley with an Xbox 360 pad and can hunt-and-peck
letters on a keyboard. She loves exploring rooms (the Stardew part) and stories that
start with her being woken up in bed. Reading sentences fetches things from the rooms of
a small house, and the reward is a flashy mock battle between characters she likes,
which those things power up.

One **episode** (v0.2, Matt 2026-10-18): title → **bedroom** (she wakes; Dada Matt brings
the good news, the helper, and the bad news: the villain and its threat; the house takes
on the villain's mood) → **house part 1** (the hub: the helper teaches her a spell, which
becomes her first battle move word; two side-room doors, one **sentence game** each,
fetching battle items; the front door appears once both are done: a door she cannot use
yet is not there at all) → **battle part 1** (the
items are used, then the villain's ultimate still wins: "too strong, retreat") → **house
part 2** (back at the hub, a secret door to the attic: the villain's counter sentence
fetches the counter-item) → **battle part 2** (the counter beats the ultimate) → victory
with a reading recap. A journey map shows before each battle and the victory.
Testing defaults (`EPISODE_DEFAULTS` in `src/config.ts`): hero Julia, helper Elsa,
villain EvilRilla; the pick screens and the random villain are behind that config.
**Parked** (code kept, out of the episode, reachable by `?scene=`): Sound → Letter,
Blend Path, Word → Picture, Spell the Spell, the alarm and the camp retreat.

**Stack** (decided 2026-10-18): TypeScript + Phaser ^3.90 (not 4) + Vite, npm.
Playwright (workers 1) for browser tests, `node:test` via tsx for pure rules. Dev port
**5174**; Playwright serves its own on **5184** and never reuses a server (both in
`src/port.ts`).
The sibling game `C:\Code\seraphinas\seraphinas-secret` is read-only reference; the
audit of what was taken from it is `wordwarriors-control/reports/wordwarriors__001_seraphina_audit.md`.

## Where things live

| Path | What |
| --- | --- |
| `src/` | Game source. `main.ts` boots Phaser; `config.ts` sizes, depth bands, pad colours. |
| `src/scenes/` | One scene per episode step: Boot, Title, Bedroom, Hub, SentenceRoom (the side rooms), Journey (the map before battles), Victory, Parent; parked: Pick, Alarm, Retreat and `minigames/` (the four v0.1 games). |
| `src/battle/` | The battle simulation: `BattleScene` (the director scripts `part1`/`part2` live in it), `Fighter`, `abilities`, `movement`. |
| `src/episode/Episode.ts` | The episode's state and step list. Scenes call `advance()`; nothing else decides flow. |
| `src/input/` | `Controls` (pad + keys + virtual pad), `TextEntry` (A–Z, spelling only). |
| `src/audio/` | `context`, `sfx` (synthesised), `VoiceBus` (the one voice arbiter). |
| `src/voice/VoiceBank.ts` | Reads `public/voice/manifest.json` only, decodes by group. |
| `src/state/` | `ProgressStore` (localStorage, versioned, per sound and per word). |
| `src/rules/` | Phaser-free round generation. Unit-tested. |
| `src/world/` | `RoomScene` (walk-to-answer rooms) and `Player` (her character as the cursor). |
| `src/ui/`, `src/fx/` | Caption ribbon, follow-the-speaker bubbles, button dots; particles and juice. |
| `content/battle/roster.ts` | **Every character**, good and evil: style, abilities, taunts, ultimate, counter-item. |
| `content/phonics/` | Letter sounds (placeholder spellings by sound class), words, and `sentences.ts` (frames, fetchable key words and their battle items). |
| `content/house/house.ts` | Bedrooms (objects and their reactions), the hub layout, side rooms. |
| `content/voice/` | `script.ts` (narrator templates), `ids.ts` (line ids), `voices.json`, `lines.json` (generated), `clips/` (recordings that override edge-tts). |
| `content/art/assets.ts` | Every art asset id, size and brief. |
| `public/voice/`, `public/art/` | Generated, committed. Do not hand-edit. |
| `tools/voice/` | `compose.ts` (lines.json from data), `build.ts` (audio + manifest), `providers/`. |
| `tools/art/placeholders.ts` | Paints placeholder PNGs and writes `docs/art.md`. |
| `tests/` | Playwright specs + `harness.ts`; `unit/` for node:test. |
| `docs/` | `systems.md` entry points; `engineering.md` measured facts; `content.md` how to add characters, abilities, words, art; `recording.md` Matt's voice side; `art.md` (generated) the art brief. |

## Commands

| Command | What |
| --- | --- |
| `npm run dev` | Serve at http://localhost:5174 |
| `npm run build` | Typecheck, then static `dist/` |
| `npm test` | Unit tests, then the fast Playwright suite |
| `npm run test:slow` / `test:all` | The full-episode walk-through / both |
| `npm run typecheck` | `src`, `tests`, `content`, `tools` |
| `npm run voice:lines` | Regenerate `content/voice/lines.json` from roster + script + phonics |
| `npm run voice:build` | Synthesise new/changed lines (incremental; `--force` for all). Needs `uvx` and network. |
| `npm run art:placeholders` | Paint missing/placeholder art, rewrite `docs/art.md` |
| `npm run art:gen -- <ids…>` | Real art from `content/art/prompts.ts` via Codex's image tool (README, "Real art"); `--force`, `--reprocess`, `--sheet` |
| `npm run voice:status` | Recorded / stale / still edge-tts, letter sounds first |
| `npm run voice:clip -- <id> <file.mp3>` | Put a recording in place of a line |

Adding a character, ability, word or line is data work: edit `content/`, then
`npm run voice:lines && npm run voice:build && npm run art:placeholders`.

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
  The voice folder is ~36 MB after v0.2 (2026-10-18; v0.2's lines were one 16.2 MB
  commit); see `docs/engineering.md`.

## Standing design rules (law)

- **No fail states.** A wrong answer gets a gentle, funny retry (fizzle-and-giggle SFX,
  a wiggle, a joke line) and no penalty. Battles cannot be lost: Part 1 always ends with
  the villain's ultimate flooring the heroes, framed as "too strong, retreat and get
  ready", never as losing. Part 2 always ends in victory.
- **Speech rule:** voice everything except the word she must read. That word is spoken
  only after she answers, as confirmation. Letter SOUNDS, never letter names. The hint
  sounds out letters one by one and never blends them. Two deliberate exceptions:
  Spell the Spell says its word first (it is writing, not reading; the ghost boxes
  show every letter), and the battle's move choice has the partner say which word to
  pick (the brief's design: she hears it and finds it written). Letter sounds are never
  captioned (the placeholder spelling is not text to read). Moves that are choice words
  are never called out during the fight.
- **Move choice holds until she is right** (Julia's first play, 2026-10-18). A wrong pad
  fires nothing: the fight stays frozen, the pad wiggles with the fizzle-and-giggle SFX,
  and the partner says what she picked and what to find ("That wasn't ICE, that was
  HUG! Find ICE!": `not_move_<right>`, `was_move_<picked>`, `find_move_<right>`), as
  often as it takes. Saying the wrong pad's word is fine: she has already picked it.
  The right pad fires the supercharged move. Misses are recorded, never punished.
- **Sentence game speech rule** (v0.2): the sentence's last word is the **key word** and
  is never spoken until she has answered. Pass 1 (listen) is voiced karaoke that stops at
  the key word, which pulses in a beat of silence; pass 2 (her turn) starts with nothing
  lit, each green lights the next word and says it (a parent reads along; green waits for
  the word), except the key word, which lights in silence. Yellow on a frame word says that
  word, yellow on the key word sounds its letters one by one, never blended (a
  non-decodable key word like MICE gets only its first sound). Right: the whole sentence
  is read with the key word. Voice is a prefix line ("EvilRilla is scared of...") plus the
  key word's own `word_<x>` line, so no line can leak the key word. Sentences come from a
  few repeating frames (`content/phonics/sentences.ts`); once a frame is solid
  (`SENTENCE_SOLID` in `src/config.ts`) its listening pass is skipped.
- **All text in the game is UPPER CASE** (v0.2). Line texts in `lines.json` keep their case
  (changing them re-synthesises audio); the caption and every on-screen word upper-case at
  display time. The grown-ups page may stay mixed case.
- **Reading targets never print their answer:** word pictures carry no text; names as
  sight words use the name-free `face_<id>` cards, not the named character cards.
- **Every instruction speaks with the spoken word highlighted** (the caption ribbon; in the
  sentence game the banner is the highlighter and the caption stays out of the way).
- **Narrator** = the episode's ally, or Dada Matt with no ally (Matt, 2026-10-18). If Dada
  Matt is the hero with no ally, Dada Jason narrates. Picks before an ally exists are Dada Matt.
- **Interjections** ("Ha!") are SFX, never `lines.json` lines (Matt, 2026-10-18).
- **Letter sounds** are edge-tts placeholders by sound class (voiced continuants doubled,
  stops/fricatives "Buh"/"Suh"); each is its own line id so Matt's recorded clips replace
  them via `content/voice/clips/` (Matt, 2026-10-18). Measured the same night: edge-tts
  reads doubled consonants as letter names, so only "Mmm" stays doubled and l n r v z use
  "Luh" "Nuh" "Err" "Vuh" "Zuh" (awaiting Matt's sign-off; see `docs/engineering.md`).
- **Spelling words are CVC** (2 warm-ups + the magic word), so the letter-by-letter hint
  is right; spelling slips are recorded apart from reading (`spelling` in ProgressStore).
- **Selection is walking, everywhere** (v0.2). Her character is the cursor; every choice
  (room objects, doors, the battle's move words) is a place she walks to and presses
  green on, never a coloured button. In the battle's move choice her hero walks onto the
  word's pad while the fight is frozen. The only button prompt is a green dot over the
  thing in reach. Yellow always = say it again / hint; green is ignored while an
  instruction plays.
- **The house is data:** bedrooms, the hub and side rooms in `content/house/house.ts`; the
  villain's mood over the house (tint, decals, ambient fx, the wake-up threat) is
  `house` on the villain in the roster. The bedroom has no reading.
- **Sprites move only by bob and squash/scale.**
- **Keyboard:** A–Z belongs to spelling. Arrows move, Space/Enter green, Esc red, Tab
  yellow. Dev keys are F-keys only: F2 skip step, F4 auto-answer, F9 parent page.
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.

## Matt says X → run Y

| Matt says | Run |
| --- | --- |
| "add a character / ability / taunt" | edit `content/battle/roster.ts`, then `voice:lines`, `voice:build`, `art:placeholders` |
| "add words" | edit `content/phonics/words.ts`, same three commands |
| "add a sentence / frame / fetchable item" | edit `content/phonics/sentences.ts` (frames, `FETCH_ITEMS`), same three commands |
| "add a bedroom / side room / villain mood" | edit `content/house/house.ts` or the villain's `house` in the roster, same three commands |
| "turn the pick screens back on" / "random villain" | `EPISODE_DEFAULTS` in `src/config.ts` |
| "here is real art for X" | copy it to `public/art/<id>.png` (ids in `docs/art.md`); for character art also set `FLIP_TO_FACE = true` in `src/config.ts` |
| "here are my letter sound recordings" | see `docs/recording.md` |
