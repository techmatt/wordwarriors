# Voice and art pipeline

How to record: `docs/recording.md`. Where files live: `docs/storage.md`.

## Matt's recordings

**The recorder** is one self-contained page, `tools/recorder/phonics-recorder.html`: 12 cards,
each three words with their sounds. Email the file (it opens from downloads in Chrome, Edge
or Firefox; the microphone works from `file://`) or send the hosted link. The hosted copy is
`C:\Code\techmatt.github.io\phonics-recorder.html` (Matt's GitHub Pages repo): never edit it
there. Whatever rewrites the repo's copy (`recorder:missing`, `voice:lines`, `voice:import`)
copies it over when that folder exists, and Matt commits it. Nothing leaves their computer
until **Download zip** saves `phonics-<name>.zip`; put the zip in `voice-import/` in the
scratch home.

- **`?only=<ids>`** (`?only=f,a`): just those sounds, one card each, in the order asked; a
  sound with no card in the full set gets an extra card (`EXTRA`). Ids are the game's sound
  keys (`sh`, `long_e`, `th_voiced`; `ck` is the K card). Takes are `g` + the full card's
  number + the sound (`g02f`; extra cards from 13); more in `docs/recording.md`.
- **`?missing`** is `?only=` with the page's `MISSING` list (zip `phonics-<name>-missing.zip`):
  every sound a live bank word sounds out whose `letter_<x>_sound` has no good recording (no
  clip, a stale one, or one the sound's `rerecord` in `content/phonics/letters.ts` names,
  asked for until an import replaces that file). `EXTRA` cards use the sound's `example`
  word (or the first live word with it) and the tip from its `record`. Both live in the
  page's `missing:begin` / `missing:end` block, written by **`npm run recorder:missing`**
  (`tools/recorder/missing.ts`, which prints each missing sound's words); `voice:lines` and
  `voice:import` run it, and `tests/unit/recorder.test.ts` fails while it is stale.
- **The zip:** `manifest.json` (format `phonics-recorder/2`: `recorder`, the speaker's name;
  each take's `group`, `entries` of sound, word, `kind`, `repeats`, and `counted`) and
  `takes/gNN.wav`, mono at the browser's rate. A format-1 zip has no name and is taken as
  Matt's.

**`npm run voice:import -- <zip> [--take gNN] [--allow-short] [--dry]`** (`tools/voice/import.ts`,
splitter `tools/voice/split.ts`):

- Each card is high-passed at 80 Hz, cut by its loudness envelope, and must hold exactly 12
  sounds (word, three repeats, three times), or nothing installs and it says which card to
  re-record and why: "no sound" (empty take), "found 10 … ran together" (pauses under about
  0.25 s), "too quiet" (a sound over 30 dB under the card's loudest), "did it stop early?".
- Each clip is widened to its soft edges, faded (5 / 15 ms), normalised to -17 dBFS RMS
  (peak at most -1 dBFS), padded with 30 ms of silence, and encoded as 96 kbps mono MP3 by
  `@breezystack/lamejs` (pure JS, installed by `npm ci`).
- For each sound it takes the most typical repeat (the medoid, by band spectrum and length)
  that passes the bridge's hold check (`holdPlan`: a held sound must loop 0.1 s or more). If
  none passes, the word goes in and the sound does not, unless `--allow-short` (Matt's call):
  then the repeat with the longest steady part goes in, with a note. F is not a held sound:
  it is `whole` in `content/phonics/letters.ts` (Matt: "go with a fuh version"), so the bridge
  plays it uncut, the importer takes any repeat, and the recorder's F card asks for "fuh".
- Clips install as `content/voice/clips/<id>.<hash8>.mp3` for `letter_<x>_sound` (the K card
  fills `letter_ck_sound` too) and `word_<word>` where the game has the word, `provider` the
  recorder's name; a replaced file is deleted, and the hash makes `voice:build` rebuild. A
  sound with no line yet waits in `index.json`'s `waiting` map until the next import. A later
  card's word replaces an earlier card's.
- Every run writes `voice-import/review.html` in the scratch home (envelopes, cuts, each clip
  with a player and the bridge's cut); `--dry` writes only that.

Then `npm run voice:build` (no network: recorded lines are copied). The recorder counts takes
with the importer's own detector (its `detector:begin` / `detector:end` block;
`tests/unit/voiceImport.test.ts` runs both side by side), so a take the page counts is one the
importer takes. Matt's card 1 is a real take in the unit tests
(`tests/fixtures/voice/matt-g01-good.wav`). Check imports by ear on `listen.html`
(`docs/tools.md`).

## Voice build facts

- **edge-tts runs through Python via `uvx`**: `voice:build` spawns `uvx --from
  edge-tts==7.3.1 python tools/voice/providers/edge_tts_worker.py`; `uv` must be on PATH. If
  the endpoint breaks, bump the pin in `tools/voice/providers/edgeTts.ts` (why:
  `docs/engineering.md`, *Voice*).
- **A carrier line** (`cut` in `lines.json`, such as the short A cut from "Add") is decoded
  by `uv run --no-project --with miniaudio python tools/voice/decode_mp3.py` (network on first
  use). The cut is in the line's fingerprint, so changing `keepDb` (`content/phonics/letters.ts`)
  or `CARRIER_CUT` (`tools/voice/carrier.ts`: `ONSET_DB`, `SPLIT`, `FINISH` from
  `tools/voice/split.ts`, and `CUT_VERSION`) re-cuts by itself. A change to the cut's code,
  not its numbers, bumps `CUT_VERSION`. A recorded clip is split once at import: re-import
  the zip to re-split it.
- The build cuts each clip's edge-tts silence after the last word + 0.2 s (`tools/voice/mp3.ts`).
- Keep hyphens out of lines: "push-ups" counts as one word in the text and is timed as two,
  so `voice:build` rejects it. A two-word name timed as one boundary is split by `align.ts`.
- A rime said alone (`rime_at`) should time about 0.7 s. Spellings that read as letters run
  long ("Ett" 1.39 s, so "Eht"; "En" risks N's name, so "Ehn"; "Ihg", "Uhn", "Utt", "Hihg"
  ~0.6 s). Check a new rime's span in `public/voice-gen/manifest.json` after `voice:build`.
- `en-AU-WilliamMultilingualNeural` returns "No audio was received" for most lines;
  Jormungandr uses `en-NZ-MitchellNeural`.
- About 4.6 lines a second on 4 workers.

## Real art: `art:gen`

`npm run art:gen -- <ids…>` draws real art with OpenAI's Codex CLI image tool on Matt's
ChatGPT Plus login. No API key is used, and none should be. Each id's prompt is in
`content/art/prompts.ts`: a shared style block plus the asset's brief from `docs/art.md` (so a
changed `look` changes the prompt), or a hand-written `HAND` one. No ids means every id;
existing real art is skipped unless `--force`; `--sheet` rebuilds the contact sheet
(`art_contact.png` in the scratch home), `--sheet-out=<file>` of the named ids; `--reprocess`
re-cuts game PNGs from the originals (keying changes); `--shrink` re-quantizes the named
PNGs. Run it backgrounded; several runs on disjoint ids run side by side fine.

- **What it runs:** `codex exec --json --skip-git-repo-check -s read-only -C <scratch
  home>/codex -`, prompt on stdin (no shell quoting). Codex never writes the repo; its
  `image_gen` saves to `~/.codex/generated_images/<thread>/exec-<item>.png`, collected via the
  `thread.started` event. `codex` is an npm `.cmd` shim, so Node spawns it through a shell.
  It prints the plan's allowance (the session file's `rate_limits`) after each image and
  stops at a usage limit; it never touches `auth.json`.
- **Output:** the original to `art-originals/<id>.png` (with `log.jsonl`); the game PNG to
  `public/art/<id>.png`, the only file committed. Sprites are drawn on #00FF00, keyed
  (`tools/art/chroma.ts`, key colour the border's median; each prints its green-fringe pixel
  count, 0 clean), trimmed and fitted to twice their display box; rooms are cropped to
  1280×720. `npm run dev` (or `WW_DEV_SERVER=1`) reloads the page on art written mid-run. PNGs are palette-quantized with `sharp`
  (`shrinkPng`, `tools/art/generate.ts`): a room ~0.3 MB, a sprite 40–80 KB.
- **Cost:** 27–75 s an image (photo references the slow end), about 0.25–0.5% of the
  5-hour window each. The allowance printed is the plan's, so side-by-side runs all climb.
  "Selected model is at capacity" skips a candidate; top up with `--n=1`.
- **Family likeness:** Julia, Ellie, Dada Matt and Dada Jason are drawn from Matt's photos in
  `art-originals/refs/` (private; never commit). `REFS` in `content/art/prompts.ts` names each
  photo and crop; the crop (`art-originals/refs/crops/<id>.png`) goes with `codex exec -i`
  (before `--json`) for that person's `char_*` and `face_*` ids, and outfit ids
  `char_<person>_<word>` / `face_<person>_<word>` (`refFor`; an outfit is a record in
  `content/battle/outfits.ts`). The prompt asks for a flat cartoon; a run with no image retries text-only;
  `--no-ref` skips the photo. `REFS` kinds `style` (a feel, not a copy) and `toy` (a plush,
  not a person); an entry's `ids` limits it.
- **Gotchas:**
  - The tool ignores pixel sizes and picks square, portrait (1024×1536) or landscape from the
    prompt's words, so the script names the shape.
  - It refuses prompts too close to a film character ("rejected the generation", no image);
    "not a lookalike of X" does not help; design away from the film.
  - Keep green out of designs. Thin see-through parts and glows come out green-tinted: list a
    sprite with no green of its own in `NO_GREEN`. Every family sprite is keyed that way
    (`FAMILY_ART`); a family form wearing dark green goes in `LIGHT_GREEN` (`keyMode`,
    `'lightGreen'` in `chroma.ts`: green un-mixed by brightness, none under 120, fully from
    170), not `NO_GREEN`, or it comes out grey-teal. Green things themselves stay out of
    `NO_GREEN`; open green shapes key badly either way, so draw them solid.
  - **A green subject goes on a magenta screen:** `#FF00FF` with `keyMode` `keep` kept emerald
    solid where green robes on #00FF00 got see-through patches. Ask for "nothing in the subject
    is pink or magenta"; give a glow a solid outlined shape. `art:alts` and `art:gen` draw on
    green, so promote such a candidate by copying its original to `art-originals/<id>.png` and
    `art:gen -- <id> --reprocess`.
  - The tool draws its own copies of things the game draws on top; room prompts say what to
    leave out. An action word's picture rarely names itself, so it is only shown after she
    has read the word.
  - A new `prop_word_machine` means refitting `WINDOW` / `PANEL` in `src/scenes/WordMachine.ts`
    (fractions of the cut PNG).

## Candidates: `art:alts`, `art:pick`

```
npm run art:alts -- <ids…> [--n=3] [--sheet=<name>] [--sheet-only] [--manifest-only] [--no-ref] [--brief=scratch/<brief>.txt] [--ref=<image>]
npm run art:pick -- <id> <n|keep|0> [<id> <n|keep|0>…] [--round=<name>]
```

A round changes nothing tracked (candidates in `art-originals/alts/<id>-<n>.png`, numbered on;
sheet, picker manifest `<name>.json` and preview cuts in `art-originals/picks/`), so it may run
as a readonly item; promotion is one `art:pick` (below), a request or a parked edit. `--sheet=<name>` names the round
(`picks/<name>.png`, `.json`, `<name>/`; `scratch/<name>.png` lands there too); without it,
by the minute it started, so two runs started together collide: name each. The sheet shows
the current image, then each candidate cut as the game cuts it; `--sheet-only` and
`--manifest-only` rebuild without drawing (also the fix when a brand-new id had no
placeholder: run `art:placeholders` before `art:alts`). Row notes: `PICK_NOTES`. Run
directly, the tool needs its subcommand (`npx tsx tools/art/alts.ts alts <ids…>`). Stopping a
backgrounded loop leaves the running `tsx` to finish its candidate: check
`Get-CimInstance Win32_Process` and delete what it drew.

- **`--brief=<file>`** (in the scratch home) replaces the tracked asset prompt; style block,
  photo and `NOTES` still go round it. Its label is the file's base name, a lower-case slug.
  One id per run, and briefs for one id one after another (side by side they number alike);
  each candidate gets a sidecar `alts/<id>-<k>.json`. Briefs are `<item>_<name>_<look>.txt`.
- **A round only for this round's candidates:** the manifest lists every candidate an id has,
  earlier rounds' too. Item 183 ran `--manifest-only --sheet=<name>` over all its ids, then
  kept `current` and the options labelled `brief <item>_…` (its script:
  `experiments/results/183_art_round_leftovers/merge.py`).
- **An id the game does not have yet** (a word a later item adds): `art:alts` refuses ids not
  in `content/art/assets.ts`. Item 183 drew `pic_robot` with an uncommitted
  `assets.push({ id: 'pic_robot', kind: 'picture', w: 200, h: 200, … })` and a stand-in
  `public/art/pic_robot.png`, reverted both after `--manifest-only`; the candidates waited in
  `alts/` until item 184 added ROBOT to the bank and ran `art:pick`. Simpler (items 188, 191):
  add the word to the bank and run `art:placeholders`; its placeholder keeps it waiting for
  art (stored, by derivation) with its `pic_<word>` asset, so `art:alts` works with no stand-in.
- **`--ref=<image>`** attaches another version of the same character in place of the photo
  (`DESIGN_REF`, `tools/art/generate.ts`): keep face, hair, build; ask for the green
  background like the picture's.
- **Corrections** for an id are `NOTES` in `content/art/prompts.ts`; they end the prompt.
- **`art:pick -- <id> <n> [<id> <n|keep>…] [--round=<name>]` is the whole promotion** (item
  191): one command, then commit what it lists; no other file needs a hand edit for the word
  to go live. So a promotion needs no item of its own: a planner request or a parked edit
  ("art:pick pic_x 2 pic_y keep") is enough. Per pair it:
  - copies candidate `n` to `art-originals/<id>.png` and cuts it into `public/art/`. The first
    pick saves the original in `art-originals/restore/` (`<id>.png`, `<id>.game.png`; a
    placeholder only the latter; later picks leave it), so `art:pick -- <id> 0` restores the
    art (its `PICTURES` line and note stay: `git checkout` them). The id's other candidates
    are deleted (the next round numbers from 1), so pick only once Matt has chosen;
  - a candidate drawn from a brief: a word picture's brief is written into its `PICTURES`
    line, without the "A single clear picture of" and closing boilerplate `derived` adds back
    (`tools/art/promote.ts`, `pictureFromBrief`). Any other id still prints the brief to write
    by hand (a character's `look` in its roster group file, then `art:placeholders`; a face
    card or anything else a `HAND` entry), or later runs draw the old look;
  - sets the id's `PICK_NOTES` row's "`current` is candidate n of <round> …" sentence;
  - records the decision in its round, the newest `picks/*.json` manifest with a row for the
    id (`--round=` to choose), in `picks/<round>.decided.json`. `<id> keep` records a row Matt
    kept as it is. Once every row is decided, the round is archived in Drive (`archive\`,
    `docs/storage.md`, *Disk*): sheet, manifest, decisions and previews to
    `art-originals\picks\`, the kept rows' candidates to `art-originals\alts_<round>_passed\`,
    and the briefs to `wordwarriors-scratch\` (their folder kept, an emptied one removed).
  Then it rewrites `content/art/waiting.ts` (`tools/art/waiting.ts`); when that changes (a
  word went live), the golden draws (`tests/unit/plansGolden.json`), the recorder's
  `?missing` and `docs/art.md` follow, and it prints `git status` to commit. It checks every
  pair (and `--round`) before changing anything, and rewrites the derived files even if a pair
  fails later; if one of them fails to rewrite, `npx tsx tools/art/waiting.ts --follow` reruns
  them. A round's archive takes only its own candidates (its manifest's numbers), so a later
  round's for the same id stay in `alts/`.
- **A word waiting for its picture is out of play by itself** (item 191): a new word's
  painted placeholder (`art:placeholders`) puts it on `content/art/waiting.ts`, so the bank
  stores it with no line in `STORED_WHY`; `art:pick` taking its picture live takes it off.
  The tests check rules (no live word without a picture of its own, no stored word drawn),
  so they list no word to edit. Dry run: `experiments/results/191_one_step_promotion/`.

## Images outside the game: `art:freeform`

`npm run art:freeform -- art-originals/<folder>/spec.json [--n=3] [--jobs=4] [--manifest-only] [--recut]`
for a picker of images that are not game art. The spec is `{name, title, intro?, style,
rows: [{id, label, note?, shape, aspect, prompt}]}`: `shape` the words the tool takes its
shape from, `aspect` the exact centred cut (`[3, 4]`: keep the subject off the edges that go;
a drawing over a quarter off is dropped). Keep the folder under `art-originals/` (prompts stay
out of git). `portrait` draws 1024×1536; `wide landscape` ~2.3:1, useless for 4:3; `standard
landscape, 4:3 aspect ratio (1536x1024), not ultra-wide, not panoramic` draws 1536×1024.
Output: `<id>-<k>.png` cuts, `originals/`, `sheets/<id>.png`, `<name>.json` (the `pick:`
path). A run draws only what is missing (move a cut out to redraw) and stops at a usage
limit. A later round gets its own subfolder spec (`<folder>/r2/spec.json`), since every cut
beside a spec counts as a candidate. A row's `current: {key, image, label?}` shows an
existing image first as the default, `more` after; keep copies in a subfolder.

- **A new character's first look:** a spec with `key: {mode, box}` (keyed, trimmed and fitted;
  the cast's box `{w: 400, h: 500}`, `portrait`, `[2, 3]`), `looks: [{label, prompt}]` per
  row, `kind: 'many'` for keep-or-drop; keep it in `art-originals/picks/<name>/`.
- A rider's 2:3 art is limited by height: `size` sets how tall it stands, `box` keeps it
  crisp. A face card can be a square crop of an original, `--reprocess`ed.
- **Prompting:** the model drifts to sunset skylines and wet floors unless ruled out ("no
  water, no puddles, no wet reflections"), reads "pipe" as a smoking pipe, and overshoots
  "brighter" (say "serious, weathered, naturalistic; no HDR gloss" and give small counts). To
  keep people off part of a picture, say where they are as well as where they are not.

Renaming a character's id: `docs/storage.md`, *Renaming a character*.
