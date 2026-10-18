# Content: adding characters, abilities, words and art

Everything below is data. None of it needs engine code unless it wants an ability
`kind` or a movement `style` that does not exist yet.

After any content change, run:

```
npm run voice:lines        # lines.json from the data
npm run voice:build        # synthesise new or changed lines (needs uv + network)
npm run art:placeholders   # paint placeholders for new art ids, rewrite docs/art.md
npm run test:unit          # checks every derived voice id exists, roster completeness
```

## A character (`content/battle/roster.ts`)

One `CharacterSpec` in `ROSTER`:

- `id`: lowercase, used in every derived id (`char_<id>_good`, `taunt_<id>_evil_<key>`…).
- `description`: one sentence, an original archetype.
- `good` and `evil`: each a `FighterSpec`:
  - `displayName` (`"Evil Smaug"`), optional `sayName` when edge-tts mispronounces
    (same number of words).
  - `look` (the art brief), `palette` `[main, accent]`, `glyph` (placeholder emoji; avoid
    Emoji 13+, Windows 10 lacks them).
  - `style`: `hover | twirl | stomp | dodge | slither | blink | fly | march`.
  - `speed` (px/s), `size` (1 person, 1.4 big, 1.8 giant), `hp` (cosmetic).
  - `abilities`: three or more `AbilitySpec`; at least two on the good side should carry
    a `word` from `MOVE_WORDS`, so the move-choice pause has words to offer.
  - `ultimate`: the evil one floors the heroes in Part 1 and is countered in Part 2.
  - `taunts`: `{ key, text }`, short, no interjections ("Ha!" is an SFX).
- `counter`: the item Spell the Spell makes: `name`, `glyph`, `look`, `how`
  (`block | reflect | reveal | restore | shutdown | calm`), and `words`: two warm-up
  words and the magic word, each 2–5 letters.
- `arena`: a key of `ARENAS`.

Every new character is automatically a hero, an ally (and so a narrator: about 110
narrator lines in its voice), a villain, and a sight word if added to `SIGHT_WORDS`.
Add its two speakers (`<id>`, `<id>_evil`) to `content/voice/voices.json`.

Size note: each narrator adds ~1.4 MB of voice. The voice folder is ~19 MB; the 20 MB
commit gate needs Matt's say-so before it is crossed.

## An ability (`AbilitySpec`)

`{ id, name, kind, cooldown, color, color2?, power, count?, glyph?, status?, minion?,
duration?, homing?, word?, shout? }`. Kinds: `bolt beam cone lightning slam spin dash
summon polymorph freeze teleport clones trap rain shield heal grow coil eclipse wave
grid` (one function each in `src/battle/abilities.ts`). `power` 1–3 scales damage,
particles and shake. `shout: true` plays the "Ha!" SFX.

A minion is a `MinionSpec` in `MINIONS` (one ability, its own style).
A team combo is a `ComboSpec` in `COMBOS` (`pair` of character ids + an ability);
any other pair uses `DEFAULT_COMBO`.

## Words (`content/phonics/words.ts`)

`{ word, glyph | draw, decodable: true }` for a CVC word with a picture; sight words
(`decodable: false`) use a character's card as the picture. Blend Path uses only
decodable words; Word to Picture mixes in one sight word per round.

## Letter sounds (`content/phonics/letters.ts`)

`say` is the edge-tts placeholder. Real phonemes replace them line by line with
`npm run voice:clip -- letter_<x>_sound <file.mp3>` (see `docs/recording.md`).

## Narrator lines (`content/voice/script.ts`)

Templates composed once per narrator (`{hero}`, `{villain}`, `{item}`, `{word}`).
Never put a reading word in one: the unit tests check.

## Art

Every id is in `docs/art.md` with its size and brief. Drop a PNG at
`public/art/<id>.png`; the painter will never overwrite it. When real *character* art
lands, set `FLIP_TO_FACE = true` in `src/config.ts` so she faces the way she walks
(off now because mirroring a placeholder card mirrors its name).
