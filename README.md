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

1. Title: press green.
2. Walk to a hero card and press green. Then a friend (or "nobody"). Then a bad guy
   (or the "?" surprise).
3. The alarm plays (the friend, or Dada Matt, says "Bad news!"); a journey map shows
   the way ahead before each big step.
4. Two prep minigames, walking to answers: Sound to Letter makes a power gem, Blend
   Path makes star ammo, Word to Picture calls a helper. Yellow (Tab) says it again.
5. Battle part 1 runs by itself; when the move words appear on dots, press the button
   of that colour. It ends with the villain's ultimate: the heroes retreat to camp.
6. Walk to the glowing item at camp; Spell the Spell: type the letters in the ghost
   boxes on the keyboard to forge the counter-item.
7. Battle part 2: the counter-item beats the ultimate, everyone finishes it, and the
   villain turns good. Victory replays the words she read; green plays again.

A whole episode takes roughly 10–15 minutes for a child (about 4.5 minutes when the
test harness answers instantly).

Grown-ups page (progress per sound and word): **F9**, or hold **LB + RB** for two
seconds on the title screen.

Dev keys: **F2** skip the current step, **F4** answer correctly. Jump straight into a
step with a URL, e.g. `http://localhost:5174/?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug`
(`scene` = pick, alarm, sound, blend, picture, spell, battle, retreat, victory, parent).

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
  about 19 MB (1,557 lines then; 1,630 now, still about 19 MB).
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
- The full-episode test (`npm run test:slow`) takes about 4–5 minutes: every line is
  real speech and green is ignored until an instruction finishes.
- Headless Chromium renders the battle at roughly 8–18 fps (software GL). With the GPU
  (Playwright `channel: 'chromium'` plus `--use-angle=d3d11`) the same battle holds a
  steady 56 fps on this machine (measured 2026-10-18, 2 heroes vs Evil Smaug). Tests
  never assert on frame rate or displacement.
