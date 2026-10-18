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

The first `npm install` on a machine also needs Playwright's browser for the tests and
the art painter: `npx playwright install chromium chromium-headless-shell`.

## Playing an episode

1. Title: press green.
2. Walk to a hero card and press green. Then a friend (or "nobody"). Then a bad guy
   (or the "?" surprise).
3. The alarm plays; then two prep minigames make a power gem, star ammo or a helper.
4. Battle part 1 runs by itself; when the move dots appear, press the button of that
   colour. It ends with the villain's ultimate: the heroes retreat.
5. Spell the Spell: type the letters shown in the ghost boxes on the keyboard.
6. Battle part 2: the counter-item beats the ultimate; victory.

Grown-ups page (progress per sound and word): **F9**, or hold **LB + RB** for two
seconds on the title screen.

Dev keys: **F2** skip the current step, **F4** answer correctly. Jump straight into a
step with a URL, e.g. `http://localhost:5174/?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug`
(`scene` = pick, alarm, sound, blend, picture, spell, battle, retreat, victory, parent).

## Content work

Everything is data under `content/`. After editing it:

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
  about 19 MB for 1,557 lines.
- Placeholder art is painted in headless Chromium so emoji render; Windows 10's emoji
  font lacks Emoji 13+ glyphs (🪙 🪭 🪞 🪲 🥸 🪨), so the roster avoids them.
- The game itself needs no network: voice and art are committed.
