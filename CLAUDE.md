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
on the villain's mood) → the **entry hall warm-up** (item 033, `src/scenes/EntryScene.ts`:
"Before we head out, let's grab the ...", nine labelled pictures, a clue in letter names
and letter sounds at the word's level on a ramp, `GRAB` in `src/config.ts`; the grabbed
thing is her first battle item) → **house part 1** (the hub: the helper's story scene, item 037,
`content/house/scenes.ts`: a spell, a dish, a gadget, a toy, trailing off into the **gift
word**, an action word from the bank, which becomes her first battle move word; two side-room doors, one **sentence game** each,
fetching battle items; the front door appears once both are done: a door she cannot use
yet is not there at all) → **battle part 1** (the
items are used, then the villain's ultimate still wins: "too strong, retreat") → **house
part 2** (back at the hub, a secret door to the attic: the villain's counter sentence
fetches the counter-item) → **battle part 2** (the counter beats the ultimate) → a
**victory scene** (item 027, `content/house/endings.ts`: the villain, good again, and
everyone there doing something nice together, four voiced lines) → victory with a
reading recap. A journey map shows before each battle and the victory.
The cast is drawn every episode (item 025, `src/rules/cast.ts`): a villain from the
active cast's villains (`ACTIVE_CAST` in `src/config.ts`; never her last two), an
active ally, the waking dad (Matt 60%, Jason 40%;
the other dad half the time too), each dad in a random form (builder, weightlifter,
cyberdecker, spell-blade Matt; chef, warrior, warlock Jason), and the helper's quest
place (`content/house/quests.ts`) instead of the house. The fixed default episode
(`EPISODE_DEFAULTS` in `src/config.ts`, `?cast=default`, what the tests play): hero
Julia, helper Ellie (she fights with bubbles and one summoned-sword move), villain Evil
Tiamat (a giant; her named counter is the Magic Hat, shown when the bag draws HAT).
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
| `src/scenes/` | One scene per episode step: Boot, Title, Bedroom, Entry (the warm-up), Hub, the side rooms' games (SentenceRoom, WordMachine), Journey (the map before battles), Ending (the victory scene), Victory, Parent; parked: Pick, Alarm, Retreat and `minigames/` (the four v0.1 games). |
| `src/battle/` | The battle simulation: `BattleScene` (the director scripts `part1`/`part2` live in it), `Fighter`, `abilities`, `movement`. |
| `src/episode/Episode.ts` | The episode's state and step list. Scenes call `advance()`; nothing else decides flow. |
| `src/input/` | `Controls` (pad + keys + virtual pad), `TextEntry` (A–Z, spelling only). |
| `src/audio/` | `context`, `sfx` (synthesised), `VoiceBus` (the one voice arbiter). |
| `src/voice/VoiceBank.ts` | Reads `public/voice-gen/manifest.json` only, decodes by group. |
| `src/state/` | `ProgressStore` (localStorage, versioned, per sound and per word). |
| `src/rules/` | Phaser-free round generation. Unit-tested. |
| `src/world/` | `RoomScene` (walk-to-answer rooms) and `Player` (her character as the cursor). |
| `src/ui/`, `src/fx/` | Caption ribbon, follow-the-speaker bubbles, button dots; particles and juice. |
| `content/battle/roster.ts` | **Every character**, good and evil: style, abilities, taunts, ultimate, counter-item. Every roster character is also a villain. The dads' forms are roster characters with `person` (voiced, narrating and waking as the dad). |
| `content/battle/fights.ts`, `src/battle/stages/` | Fight styles (item 031): a sky race, a rope pull, a spell-beam clash, a cook-off, the brawl. `fight` on a villain, `fightNudge` on an ally; each kind's staging. |
| `content/battle/forms.ts` | Outfits: a character's images for a scenario (Julia the chef beside chef Dada Jason, the knight beside warrior Dada Jason). |
| `content/house/quests.ts` | Quests: each ally's place to train and its setup lines (three variants, `quest_<owner>_<n>`); places themselves are `PLACES` in `house.ts`. |
| `content/house/scenes.ts`, `src/rules/story.ts` | The hub's story scenes (item 037): 2–3 per helper, each ending in the narrator's `gift_word_<w>`; the draw of the episode's quest line and scene (variant 1 of each with `?cast=default`). |
| `content/phonics/bank.ts`, `src/rules/bank.ts` | **The word bank** (item 037): every word she reads, levels (1 CVC, 2 blend, 3 digraph), vowel / onset / rime derived from the spelling, role `thing` / `action` / `both`. The one weighting every draw uses (shakiness × coverage × level gate, `BANK_DRAW` in `src/config.ts`) and the distractors (sharing onset or rime once a word is firm). |
| `content/phonics/effects.ts`, `src/rules/moves.ts` | Every bank word's battle effect (a thing is a fetched item, an action a move pad her hero casts; a teammate's own word fires their styled ability); the episode's move choices and the gift word (`drawGift`). |
| `src/rules/grab.ts` | The home warm-up (item 033): the word draw, the hall's pictures, the ramp, the clue per level (a digraph is one sound). |
| `src/rules/cast.ts`, `src/rules/minigames.ts` | The episode's cast draw; the rooms' weighted minigame pool (the sentence game's frames, the word machine). |
| `content/phonics/families.ts`, `src/rules/wordMachine.ts` | The word machine (item 026): word families (rimes from the bank's single-onset words, silly onsets) and each visit's rounds. |
| `content/phonics/` | Letter sounds (placeholder spellings by sound class; `DIGRAPH_SOUNDS` SH CH TH CK), `words.ts` (the bank's pictured words as `CVC_WORDS`, sight words, move pictures), and `sentences.ts` (frames, key-word look-alikes; `FETCH_ITEMS` from the bank's things). |
| `content/house/house.ts` | Bedrooms (objects and their reactions), the hub layout, side rooms, quest places. |
| `content/house/endings.ts`, `src/rules/endings.ts` | The victory scenes (item 027): backgrounds, props, lines by role; the draw and who says what. |
| `content/voice/` | `script.ts` (narrator templates), `ids.ts` (every line id and narrator key is built by its builders, game and composer alike: never spell `find_move_${w}` by hand), `voices.json`, `lines.json` (generated; the game reads `public/voice-gen/manifest.json`), `clips/` (recordings that override edge-tts). |
| `content/art/assets.ts` | Every art asset id, size and brief. |
| `public/art/` | Generated, committed. Do not hand-edit. |
| `public/voice-gen/` | Generated voice (mp3s, manifest, build cache). Untracked: a junction to the Drive folder. Do not hand-edit. |
| `art-originals/` | Full-res art, `log.jsonl`, Matt's photos (`refs/`, private). Untracked: a junction to the Drive folder. |
| `tools/voice/` | `compose.ts` (lines.json from data), `build.ts` (audio + manifest), `providers/`. |
| `tools/art/placeholders.ts` | Paints placeholder PNGs and writes `docs/art.md`. |
| `tests/` | Playwright specs + `harness.ts`; `unit/` for node:test. |
| `docs/` | `systems.md` entry points; `engineering.md` measured facts; `content.md` how to add characters, abilities, words, art; `recording.md` Matt's voice side; `art.md` (generated) the art brief. |

## Commands

A fresh worktree has no `node_modules/`: run `npm ci` first (README, *Run it*).

| Command | What |
| --- | --- |
| `npm run dev` | Serve at http://localhost:5174 |
| `npm run build` | Typecheck, then static `dist/` |
| `npm test` | Fast lane, after every change (~1 min): unit tests, then the browser tests under 10 s each |
| `npm run test:all` | Everything (~18 min): fast lane + slow lane. **Not by default** (Matt, 2026-10-20): before a commit run the fast lane plus the browser specs covering what changed (`npx playwright test <spec>`); the full suite only when clearly needed (a change touching every scene). Browser tests draw on the GPU; `WW_GPU=0` for software GL |
| `npm run test:slow` | Slow lane alone: tests tagged `@slow`, the real-time full episode, the two-episode soak |
| `npm run typecheck` | `src`, `tests`, `content`, `tools` |
| `npm run voice:lines` | Regenerate `content/voice/lines.json` from roster + script + phonics |
| `npm run voice:build` | Synthesise new/changed lines (incremental; `--force` for all). Needs `uvx` and network. |
| `npm run art:placeholders` | Paint missing/placeholder art, rewrite `docs/art.md` |
| `npm run art:gen -- <ids…>` | Real art from `content/art/prompts.ts` via Codex's image tool (README, "Real art"); `--force`, `--reprocess`, `--sheet` |
| `npm run art:alts -- <ids…> --sheet=<file>` | Draw 3 candidates per id into `art-originals/alts/` and a comparison sheet; the game's art is untouched. `--brief=scratch/<name>.txt` (one id) draws from that prompt instead of the tracked one |
| `npm run art:pick -- <id> <n>` | Make candidate `n` the game's art (`0` restores the original); commit the PNG. A brief's candidate: it prints the brief, which goes into the game's prompt in the same commit |
| `npm run voice:status` | Recorded / stale / still edge-tts, letter sounds first |
| `npm run voice:clip -- <id> <file.mp3>` | Put a recording in place of a line |
| `npm run test:unit` | The unit tests alone (~3 s) |
| `npm run preview` | Serve the built `dist/` |

A **candidate round** (draw + contact sheet + picker manifest) writes only to the shared,
git-ignored `art-originals/alts/` and `scratch/`, changes nothing tracked, and may run as
a **readonly** item; a new look is a `--brief` file in `scratch/`, not an edit to
`content/art/prompts.ts`. **Promotion** (`art:pick`) is a normal item: it commits the PNG
and writes a brief's text into the game (the roster `look` for a character, else `HAND`
in `content/art/prompts.ts`) so the prompt matches the art (README, *Candidates*).

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
  Generated voice is no longer committed (2026-10-18), so voice work no longer counts
  against this; art still does.
- **Storage: every file has one home** (README, *Storage*): git for source, data, Matt's
  recordings and game-sized art; the Drive folder `C:\Code\gdrive-sync\wordwarriors\`
  (reached through the junctions `art-originals/` and `public/voice-gen/`) for
  expensive, irreplaceable or private files; nowhere for anything rebuilt cheaply.

## Standing design rules (law)

- **No fail states.** A wrong answer gets a gentle, funny retry (fizzle-and-giggle SFX,
  a wiggle, a joke line) and no penalty. Battles cannot be lost: Part 1 always ends with
  the villain's ultimate flooring the heroes, framed as "too strong, retreat and get
  ready", never as losing. Part 2 always ends in victory.
- **Speech rule:** voice everything except the word she must read. That word is spoken
  only after she answers, as confirmation. Letter SOUNDS, never letter names. The hint
  sounds out letters one by one (a digraph, SH CH TH CK, as one sound) and never blends them. Two deliberate exceptions:
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
  word, yellow on the key word sounds its letters one by one (SH as one), never blended (a
  non-decodable key word like MICE gets only its first sound). Right: the whole sentence
  is read with the key word. Voice is a prefix line ("Rilla is scared of...") plus the
  key word's own `word_<x>` line, so no line can leak the key word. Sentences come from a
  few repeating frames (`content/phonics/sentences.ts`); a name in a sentence is the bare
  character name, the villain too (JORMUNGANDR RUNS FROM THE FAN, item 038); once a frame is solid
  (`SENTENCE_SOLID` in `src/config.ts`) its listening pass is skipped. Key words, the
  attic's counter word included, come from her word bag (item 015): without replacement
  across episodes, leaning to shaky words, never one the episode says or shows first.
- **All text in the game is UPPER CASE** (v0.2). Line texts in `lines.json` keep their case
  (changing them re-synthesises audio); the caption and every on-screen word upper-case at
  display time. The grown-ups page may stay mixed case.
- **Reading targets never print their answer:** word pictures carry no text; names as
  sight words use the name-free `face_<id>` cards, not the named character cards. The one
  exception is the entry hall's warm-up (item 033): there she finds a word by its letters,
  so each picture has its word on a plaque; its word is spoken, so it is never read later
  that episode, and the hall shows none of the words she will read.
- **Every instruction speaks with the spoken word highlighted** (the caption ribbon; in the
  sentence game the banner is the highlighter and the caption stays out of the way).
- **Narrator** = the episode's ally, or with no ally the primary dad, the one who woke
  her (Matt, 2026-10-18; item 025), in his own voice whatever his form. Picks before an
  ally exists are Dada Matt.
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
  Backquote / tilde is **dad lock** (item 038, `src/input/dadLock.ts`): she walks, no
  press does anything, timed re-prompts wait; again to unlock.
- Elsa, Anna and Jasmine are named in data and lines but described and drawn as
  original archetypes, not lookalikes.

## Matt says X → run Y

| Matt says | Run |
| --- | --- |
| "add a character / ability / taunt" | edit `content/battle/roster.ts`, then `voice:lines`, `voice:build`, `art:placeholders` |
| "add words" / "add a move word" | a `BANK` entry in `content/phonics/bank.ts` (role `thing`, `action` or `both`), its picture brief in `PICTURES` (`content/art/prompts.ts`) and its battle effect in `content/phonics/effects.ts` (`docs/content.md`, "A word"), same three commands |
| "Julia knows X" / "she doesn't know what X is" | remove / add `odd` on X's `BANK` entry in `content/phonics/bank.ts` (an odd word is never a picture to match; `docs/content.md`, "A word") |
| "more wake-up lines" / "another sorry for X" | `WAKE_LINES` in `content/voice/script.ts` (`up_<n>`, `good_<n>`, `door_<n>`, `WAKE_VARIANTS`); `reformed.sorry` / `.ending` on X in the roster; then `voice:lines`, `voice:build` |
| "add a sentence / frame" / "what X does in battle" | `FRAMES` in `content/phonics/sentences.ts`; X's effect in `content/phonics/effects.ts`; same three commands |
| "add a hub scene / quest line" | `HUB_SCENES` in `content/house/scenes.ts`; a quest's `lines` in `content/house/quests.ts` (`docs/content.md`, "A hub scene", "A quest"), same three commands |
| "X casts spells" / "X's gift should sound like a spell" | `CASTERS` in `content/house/scenes.ts`; spell-sounding words are `spell` on `BANK` entries in `content/phonics/bank.ts` |
| "blends sooner / later" / "digraphs sooner / later" | `BANK_DRAW.levels` in `src/config.ts` (`start`, `full`, `min` per level) |
| "add a bedroom / side room / villain mood" | edit `content/house/house.ts` or the villain's `house` in the roster, same three commands |
| "turn the pick screens back on" / "always the same cast" | `EPISODE_DEFAULTS` in `src/config.ts` (`pickScreens`, `randomCast: false`) |
| "Matt should wake her more / less often" | `CAST_ODDS` in `src/config.ts` |
| "switch X on / off" (in the random cast) | `ACTIVE_CAST` in `src/config.ts` (allies, villains; persons, a dad in all his forms) |
| "add a dad form" / "add a quest" / "add a minigame" | `docs/content.md`: a roster entry with `person`; `QUESTS` + `PLACES`; `MINIGAMES` |
| "add a word family / silly word" / "more or fewer machine words" | `RIMES` in `content/phonics/families.ts` (then `voice:lines`, `voice:build`); `WORD_MACHINE` in `src/config.ts` |
| "add a victory scene" / "change what they say at the end" | `ENDINGS` in `content/house/endings.ts` (`docs/content.md`, "A victory scene"), same three commands, then `art:alts` |
| "make X a race / a cook-off" / "chef Jason should cook more" | `fight` on X in `content/battle/roster.ts`; `fightNudge.chance` on `dada_jason` (`docs/content.md`, "A fight style") |
| "make it the chef episode" | `?ally=dada_jason` (Julia's chef form follows; outfits are `content/battle/forms.ts`) |
| "here is real art for X" | copy it to `public/art/<id>.png` (ids in `docs/art.md`); for character art also set `FLIP_TO_FACE = true` in `src/config.ts` |
| "here are my letter sound recordings" | see `docs/recording.md` |
| "the warm-up is too hard / too easy" / "start new words at level N" | `GRAB.startLevel` (and `helpAfter`) in `src/config.ts` |
| "for X I pick n" (from an `art_alts_*` sheet) | `npm run art:pick -- X n`, commit `public/art/X.png`; if it prints a brief, write that into X's roster `look` (or `HAND`) in the same commit |
| "try a new look for X" / "draw X as …" | a brief file in `scratch/`, then `npm run art:alts -- X --n=2 --brief=scratch/<name>.txt --sheet=scratch/art_alts_<item>_<name>.png` (readonly; Matt picks) |
