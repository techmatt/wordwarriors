# Word Warriors

A learn-to-read game for a four-year-old: phonics minigames that power up flashy mock
battles between her favourite characters. Phaser 3 + TypeScript + Vite.

## Run it

```
npm install
npm run dev
```

Then open **http://localhost:5174** in Chrome or Edge and press F11 for fullscreen. Plug
the Xbox 360 pad in first; press green (A) on the title screen. The keyboard works too:
arrows to walk, Space/Enter for green, Tab for yellow (say it again / hint).

**Sound:** browsers keep audio off until a click or key press, and it is not confirmed
that a gamepad press counts. While sound is still off, the title shows a small grown-up
note; one mouse click (or Space) turns it on. To skip that entirely, open the game in a
Chrome started with `--autoplay-policy=no-user-gesture-required`, e.g.
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --autoplay-policy=no-user-gesture-required --user-data-dir=%TEMP%\ww-chrome http://localhost:5174`.

The first `npm install` on a machine also needs Playwright's browser for the tests and
the art painter: `npx playwright install chromium chromium-headless-shell`.

## Playing an episode

Selection is walking everywhere: her hero walks to a thing and green picks it. All
on-screen text is upper case. Yellow (Tab) says the last instruction again, or hints.

1. Title: press green. (The hero / friend / bad-guy picks are off while v0.2 is being
   tested; the cast comes from `EPISODE_DEFAULTS`, below.)
2. **Bedroom.** She is asleep in bed; Dada Matt comes in: "Wake up, wake up!" and she
   presses green to jump out of bed (after 6 seconds she wakes anyway). Then: "Good
   news, Julia! Ellie is here to play! Bad news, Evil Tiamat is coming, and she wants to
   be the queen of the whole house!" The room darkens under the villain's mood (purple
   smoke, dragon scales, a royal banner). No reading: every toy does something silly on green. The door
   is there only for the waker's entrance and again once the news is told ("Find the
   door!"), when it pops out and glows; it sparkles if she has not gone through it 12
   seconds after the news (`DOOR_SPARKLE_MS`).
3. **The house (hub).** The helper (the ally, or the narrator) teaches a spell: she
   stands in the magic circle, presses green, and the word flies into her. That word
   is her first battle move. Then two side doors pop out of the wall. **A door she
   cannot use yet is not there at all** (her first play: told to find the two doors,
   she walked to the shut front door), so every door and exit appears, with a little
   reveal, at the moment it opens.
4. **Side rooms**, one sentence each, on a banner, key word last
   (`WE CAN USE THE NET`, `JULIA NEEDS THE CAT`). Pass 1 is read to her karaoke-style and stops at the key
   word, which pulses in silence (skipped once that frame is solid). Pass 2 is hers:
   each green lights the next word and says it, and yellow says the lit word. At the key
   word three things wake up on pedestals (yellow now sounds the key word's letters one
   at a time, never blended, and never says the word itself); she
   walks to the one the key word names and presses green. Right: the whole sentence
   is read back and the thing flies into her bag (top left). Wrong: a funny retry.
   Each finished room hangs its prize on its door; with both done the front door appears.
5. **Battle part 1** runs by itself (she can steer her hero with the stick; green
   hops). The fetched things pop out of her bag and are used. At a move choice the
   fight freezes, 2–3 word pads glow on the arena floor, the partner says which word;
   she walks her hero onto that pad and presses green. A wrong pad fires nothing: the
   fight stays frozen and the partner says "That wasn't ICE, that was HUG! Find ICE!"
   until she picks the right one, which fires the supercharged move. The first choice
   is the spell she learned. It ends with the villain's ultimate: "Too strong! Retreat!", and the
   heroes pick themselves up and run for home.
6. **The house, part 2.** Back in the hub a secret door pops out: the attic, with the
   villain's counter sentence (`EVIL TIAMAT RUNS FROM THE BUS`: the frame and the word
   are drawn each episode). Then the front door again.
7. **Battle part 2**: the counter beats the ultimate (a swarm of its picture: "NOT THE
   BUS!"; the villain's named item, Evil Tiamat's Magic Hat, when its own word comes
   up), everyone finishes it, and the villain turns good. Victory replays the words she
   read; green plays again.

Key words never repeat until her **word bag** has gone round: every key word (both side
rooms and the attic) is drawn without replacement from the decodable CVC words, kept
with her progress, leaning toward the words she has missed (a word leaves the bag only
when she reads it right first time, so a missed word comes round again soon, and a dev
`?scene=` jump spends nothing). Frames repeat on purpose so their little words become sight words. Details in
`docs/content.md`, "Key words and the word bag"; the grown-ups page (F9) shows the bag.

A journey map shows before each battle, the trip home after the retreat, and the
victory. With the test harness answering instantly a v0.2 episode takes about 4.6
minutes (measured 2026-10-18); a child's pace has not been timed.

The four v0.1 prep games (Sound to Letter, Blend Path, Word to Picture, Spell the
Spell), the alarm and the retreat camp are **parked**: no episode includes them, but
`?scene=` still opens each one.

**`EPISODE_DEFAULTS`** in `src/config.ts` sets who is in an episode: `hero: 'julia'`,
`ally: 'ellie'` (or `null`), `villain: 'tiamat'` (since item 014; Elsa and EvilRilla
before); `pickScreens: true` brings the pick screens back; `randomVillain: true` (picks
off) draws a surprise villain. Matt dictates the values; a prompt applies them.

The cast also picks a **scenario** (item 016): **`ally: 'dada_jason'`** in
`EPISODE_DEFAULTS` is the chef episode, one line to switch, and Julia is chef Julia
(`char_julia_chef`, her face card `face_julia_chef`) from the moment she gets out of
bed. Which outfit goes with which cast is `FORMS` in `content/battle/forms.ts` (data;
see `docs/content.md`, "A form"). `?ally=dada_jason` tries it without changing the default.

A giant villain (roster `size` 2 or more: Evil Tiamat) is staged as one: she holds her
own half of the arena instead of walking over the heroes (`stomp` in
`src/battle/movement.ts`), steps to the front for her ultimate so growing fills the
screen floor to top, and her ultimate also sweeps the whole arena (`giantSweep`).
Ellie fights with bubbles (item 016): giant bubbles (BIG, the spell she teaches), a
Bubble Trap that floats an enemy away (POP), a bubble shield and the Mega Bubble Storm,
all drawn with the generated `fx_bubble` texture, plus one sword move, Spinny Swords
(ZIP), whose `prop_silver_sword` the `orbit` kind draws round her, so they show with
whatever Ellie image is in the game.

Grown-ups page (progress per sound and word): **F9**, or hold **LB + RB** for two
seconds on the title screen. On that page, **F8** twice erases all progress.

Dev keys: **F2** skip the current step, **F4** answer correctly. Jump straight into a
step with a URL, e.g. `http://localhost:5174/?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug`.
Later steps get the episode they would have had by then (spell learned, earlier rooms
done, items in the bag):

| URL | Opens |
| --- | --- |
| `?scene=bedroom` | The wake-up |
| `?scene=house` / `?scene=house&part=2` | The hub; part 2 has the attic door |
| `?scene=room&slot=a` (or `b`, `counter`) | A side room; `counter` is the attic |
| `?scene=battle&part=1` (or `2`) | A battle |
| `?scene=victory&read=cat,sun,julia` | Victory, recapping those words |
| `?scene=pick`, `?scene=parent` | A pick screen; the grown-ups page |
| `?scene=sound` / `blend` / `picture` / `spell` / `alarm` / `retreat` | Parked v0.1 steps |

Extras: `hero=`, `ally=` (`none` for no ally), `villain=`, `fetched=net,fan` (the
battle items; that is the default), `nojourney` (skip the map).

## Tests

`npm test` runs the unit tests and the fast Playwright suite (about 3 minutes);
`npm run test:slow` plays a whole episode and then two back to back (about 14 minutes).
They start their own server on port 5184 (`TEST_PORT` in `src/port.ts`), never the dev
port 5174, so a test run in a worktree cannot attach to the main checkout's dev server.
If 5184 is busy (another worktree's run) the suite fails at once rather than testing the
wrong code.

## Content work

Everything is data under `content/`; `docs/content.md` walks through each kind. After editing it:

```
npm run voice:lines     # regenerate content/voice/lines.json
npm run voice:build     # synthesise new or changed lines into public/voice-gen/
npm run art:placeholders  # paint missing art, rewrite docs/art.md
```

## Storage

Every file has exactly one home (Matt, 2026-10-18):

- **git:** source, data, Matt's voice recordings (`content/voice/clips/`) and the
  game-sized art (`public/art/`).
- **Drive** (`C:\Code\gdrive-sync\wordwarriors\`, a Google Drive sync folder): expensive,
  irreplaceable or private files that do not belong in git. They live there; the repo
  path is a directory junction (`mklink /J`) to them, git-ignored.
  - `art-originals/` → `…\wordwarriors\art-originals`: full-res art, `log.jsonl`, and
    Matt's family photos in `refs/` (private: never copy them into the tracked tree).
  - `public/voice-gen/` → `…\wordwarriors\voice-gen`: the edge-tts mp3s, `manifest.json`
    and `.build-cache.json`. Recordings are copied in from `content/voice/clips/` by
    `voice:build`, which overrides edge-tts with them as before.
- **Nowhere:** anything a command rebuilds cheaply: contact sheets, `refs/crops/`,
  `dist/`, test output, `node_modules/`.

The main checkout holds the junctions; conductor links each worktree's to the same Drive
folders, so a worktree shares one copy and never needs a full voice rebuild. Because the
voice folder is shared, `voice:build` keeps mp3s of lines that left `lines.json` (another
branch may still speak them); `voice:build -- --prune` deletes them. A checkout without
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
  trouble or slowing each other, which is the way to do a big batch.
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
  - The tool sometimes draws its own copy of things the game draws on top (the bedroom
    has toys of its own). Prompts for rooms say what to leave out.

### Candidates to choose from (`art:alts`, `art:pick`)

When an image is weak but Matt should see the options before it changes, draw
candidates instead of overwriting it:

```
npm run art:alts -- <ids…> [--n=3] [--sheet=scratch/<name>.png] [--sheet-only] [--manifest-only] [--no-ref]
npm run art:pick -- <id> <n>
```

`art:alts` writes a picker manifest for conductor's picker page by itself, `scratch/<name>.json` beside the sheet, with each candidate cut as the game shows it into `scratch/<name>/` (row notes: `PICK_NOTES` in `content/art/prompts.ts`); `--manifest-only` rewrites it without drawing.

- `art:alts` draws `n` (default 3) new images per id with the same prompt and photo
  reference as `art:gen` and keeps them as `art-originals/alts/<id>-<n>.png`, numbered on
  from the last one there. The game's art is not touched. `--sheet=<file>` writes a
  contact sheet of the named ids: one row per id, the current game image first
  (labelled `current`), then each candidate labelled with its `<n>`, cut exactly as the
  game would cut it and all drawn at one scale. `--sheet-only` rebuilds the sheet
  without drawing.
- `art:pick -- <id> <n>` makes candidate `n` the game's art: it becomes
  `art-originals/<id>.png` and is cut into `public/art/<id>.png` by the same keying,
  trimming and palette shrink as `art:gen`. Commit the PNG afterwards. The first pick of
  an id saves the original as candidate 0 (`<id>-0.png`, and `<id>-0.game.png`, the
  committed PNG byte for byte), so `art:pick -- <id> 0` puts it back.
- Corrections for an id (what an earlier image got wrong: a likeness, a prop that
  crowds a face) are `NOTES` in `content/art/prompts.ts`; they end the prompt for both
  `art:gen` and `art:alts`.
- An outfit of a family member (`char_julia_chef`, item 012) is a hand-added entry in
  `content/art/assets.ts`, not a roster character: `refFor` gives any
  `char_<person>_<word>` id that person's photo reference, and the brief reuses their
  roster look up to the clothes. Its sheet is `scratch/art_alts_012_julia_chef.png`, its
  picker manifest `scratch/art_alts_012_julia_chef.json`. An outfit's face card is
  `face_<person>_<word>` (`face_julia_chef`, item 016), which `refFor` also matches;
  its sheet is `scratch/art_alts_016_julia_chef.png`, its manifest
  `scratch/art_alts_016_julia_chef.json`.
- `scratch/` is a junction to the main checkout's: a script in it imports with `../../`
  from the main checkout, not the worktree. Keep throwaway scripts outside it.
- Item 009's sheets (2026-10-18) are `scratch/art_alts_009_<group>.png`; its picker
  manifest, all 13 ids in one, is `scratch/art_alts_009.json`.
- Item 013's (Tiamat, all six of her ids) are `scratch/art_alts_013_tiamat.png` and
  `scratch/art_alts_013_tiamat.json`. Three `art:alts` runs on disjoint ids ran side
  by side; each writes its own sheet and manifest, so one `--sheet-only` run over all
  the ids afterwards makes the combined one.
- When Codex answers "Selected model is at capacity", `art:alts` skips that candidate
  and goes on (2026-10-18), so an id can end up with fewer than `n`. Top it up with
  `art:alts -- <id> --n=1`; it numbers on from the last candidate.

## Operational facts

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
- edge-tts pads each clip with ~1.5 s of silence; the build cuts mp3 frames after the
  last word + 0.2 s (`tools/voice/mp3.ts`). That took the voice folder from 23.7 MB to
  about 19 MB (1,557 lines then). Generated voice left git on 2026-10-18 (item 008) at
  3,590 mp3s, 42.3 MB with manifest and cache; it lives in `public/voice-gen/` (*Storage*).
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji
  font lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- The game itself needs no network: art is committed, voice is on disk in `public/voice-gen/`.
- Stopping a backgrounded `npx vite` by killing its launcher leaves the node server
  still listening on 5174 (seen 2026-10-18). Find it with `netstat -ano | findstr 5174`
  and stop that PID.
- Long Playwright runs: point them at a build so edits to `src/` do not hot-reload the
  page under test: `npx vite build --outDir scratch/dist-test`, `npx vite preview --outDir
  scratch/dist-test --port 5175`, then `WW_BASE_URL=http://localhost:5175 npx playwright test`.
  Test pages add `?hooks=1`, which turns the test hooks on in a production build.
- Until 2026-10-18 the suite reused whatever answered on 5174, so a run in a worktree
  silently tested the main checkout's dev server. It now always starts its own vite on
  5184 (`TEST_PORT`) and never reuses one; with `WW_BASE_URL` set it starts none.
- The full-episode test (`npm run test:slow`) takes about 4–5 minutes: every line is
  real speech and green is ignored until an instruction finishes.
- Headless Chromium renders the battle at roughly 8–18 fps (software GL). With the GPU
  (Playwright `channel: 'chromium'` plus `--use-angle=d3d11`) the same battle holds a
  steady 56 fps on this machine (measured 2026-10-18, 2 heroes vs Evil Smaug). Tests
  never assert on frame rate or displacement.
