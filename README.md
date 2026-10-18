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
   news, Julia! Elsa is here to play! Bad news, EvilRilla is coming, and he's going to
   eat Dada Jason's car!" The room darkens under the villain's mood (footprints, a
   cracked window). No reading: every toy does something silly on green. The door
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
   (`WE CAN USE THE NET`). Pass 1 is read to her karaoke-style and stops at the key
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
   villain's counter sentence (`EVILRILLA IS SCARED OF MICE`). Then the front door again.
7. **Battle part 2**: the counter-item beats the ultimate, everyone finishes it, and
   the villain turns good. Victory replays the words she read; green plays again.

A journey map shows before each battle, the trip home after the retreat, and the
victory. With the test harness answering instantly a v0.2 episode takes about 4.6
minutes (measured 2026-10-18); a child's pace has not been timed.

The four v0.1 prep games (Sound to Letter, Blend Path, Word to Picture, Spell the
Spell), the alarm and the retreat camp are **parked**: no episode includes them, but
`?scene=` still opens each one.

**`EPISODE_DEFAULTS`** in `src/config.ts` sets who is in an episode: `hero: 'julia'`,
`ally: 'elsa'` (or `null`), `villain: 'rilla'`; `pickScreens: true` brings the pick
screens back; `randomVillain: true` (picks off) draws a surprise villain. Matt
dictates the values; a prompt applies them.

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
They start the dev server themselves if it is not running.

## Content work

Everything is data under `content/`; `docs/content.md` walks through each kind. After editing it:

```
npm run voice:lines     # regenerate content/voice/lines.json
npm run voice:build     # synthesise new or changed lines into public/voice/
npm run art:placeholders  # paint missing art, rewrite docs/art.md
```

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
  about 19 MB (1,557 lines then). v0.2 added 1,085 lines in one commit (`c5330e7`,
  16.2 MB, under the 20 MB per-commit gate); the committed folder is
  2,771 files, 35.9 MB (measured 2026-10-18 from `git ls-tree -r -l HEAD public/voice`).
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji
  font lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- The game itself needs no network: voice and art are committed.
- Stopping a backgrounded `npx vite` by killing its launcher leaves the node server
  still listening on 5174 (seen 2026-10-18). Find it with `netstat -ano | findstr 5174`
  and stop that PID.
- Long Playwright runs: point them at a build so edits to `src/` do not hot-reload the
  page under test: `npx vite build --outDir scratch/dist-test`, `npx vite preview --outDir
  scratch/dist-test --port 5175`, then `WW_BASE_URL=http://localhost:5175 npx playwright test`.
  Test pages add `?hooks=1`, which turns the test hooks on in a production build.
- A dev server on 5174 started from the main checkout serves the main branch's code,
  not this worktree's. Playwright's `reuseExistingServer` attaches to whatever answers
  on 5174, so with that server running the suite tests the wrong game (old scenes, old
  hooks) without any warning. From a worktree, serve on another port and point the
  suite at it: `npx vite --port 5184` (the CLI port overrides `src/port.ts`), then
  `WW_BASE_URL=http://localhost:5184 npx playwright test`. With `WW_BASE_URL` set,
  Playwright starts no server of its own.
- The full-episode test (`npm run test:slow`) takes about 4–5 minutes: every line is
  real speech and green is ignored until an instruction finishes.
- Headless Chromium renders the battle at roughly 8–18 fps (software GL). With the GPU
  (Playwright `channel: 'chromium'` plus `--use-angle=d3d11`) the same battle holds a
  steady 56 fps on this machine (measured 2026-10-18, 2 heroes vs Evil Smaug). Tests
  never assert on frame rate or displacement.
