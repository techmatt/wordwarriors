# Content: adding characters, abilities, words, sentences, rooms and art

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
  - optional `mount` (`'carpet'` is drawn; any emoji works, e.g. `'🧹'`) and `trail`
    (`{ tint: [colours], shape: 'spark' | 'star' | 'smoke' | 'square' }`, its aura).
  - `speed` (px/s), `size` (1 person, 1.4 big, 1.8 giant), `hp` (cosmetic).
  - `abilities`: three or more `AbilitySpec`; at least two on the good side should carry
    a `word` from `MOVE_WORDS`, so the move-choice pads have words to offer. As a
    helper, its first worded ability the hero lacks is the spell it teaches in the hub
    (`src/rules/spell.ts`).
  - `ultimate`: the evil one floors the heroes in Part 1 and is countered in Part 2.
  - `taunts`: `{ key, text }`, short, no interjections ("Ha!" is an SFX).
- `counter`: the item that beats the ultimate in Part 2: `name`, `glyph`, `look`, `how`
  (`block | reflect | reveal | restore | shutdown | calm | scare`), and:
  - `word`: the key word of its counter sentence in the attic (see below);
  - `frame`: `scared_of` (`EVILRILLA IS SCARED OF MICE`) or `scared_of_the`;
  - `words`: the parked Spell the Spell's two warm-ups and magic word, all CVC.
- `arena`: a key of `ARENAS`.
- `house`: its mood as a villain (see "A villain's house mood" below).

Every new character is automatically a hero, an ally (and so a narrator: about 110
narrator lines in its voice), a villain, and a sight word if added to `SIGHT_WORDS`.
It also multiplies the sentence lines: one `sent_<frame>_<id>` prefix per frame with a
name slot, and wake-up lines in each waker's voice. Add its two speakers (`<id>`,
`<id>_evil`) to `content/voice/voices.json`, and bump the roster count in
`tests/unit/rules.test.ts`.

Size note: each narrator adds ~1.4 MB of voice. The committed voice folder is ~36 MB
(v0.2); no single commit may add 20 MB or more without Matt's say-so.

## A villain's house mood (`CharacterSpec.house`)

How the house looks once this one is the villain (`src/world/houseMood.ts` lays it over
the bedroom after the news, the hub and every side room; no room art is per-villain):

- `threat`: a clause for Dada Matt's wake-up, "Bad news, EvilRilla is coming, and
  `he's going to eat Dada Jason's car`!" Fun, not scary, no CVC reading words.
  Optional `threatSay` (same word count) when edge-tts needs help.
- `tint`: laid over every room at low alpha.
- `decals`: `{ id, glyph, look, count }`, things it left lying about. Prefix the id with
  the character id (`rilla_footprint`); each is art `decal_<id>`.
- `fx`: `frost | embers | quake | sparkle | smoke | none`.

## The counter sentence (`counter.word`, `counter.frame`)

The attic's sentence after the retreat: `{villain} IS SCARED OF [THE] {x}`. `word`
must have a picture she can find: a CVC word in `CVC_WORDS` (`pic_<word>`), or, when
the story wants a non-decodable word, one added to `SPECIAL_WORDS` (its yellow hint
gives only the first sound, as for a name). Use `scared_of_the` when the word reads
better with THE. Its `word_<x>` line is composed automatically. A new counter frame is
a `FRAMES` entry with `use: 'counter'` plus its id in the `CounterItem.frame` type.

The counter word must not be heard or seen before the attic, so it may not be a move
word, a `FETCH_ITEMS` word, a frame word, or a whole word in any name, ability,
ultimate, taunt or house threat in the roster. The unit test "counter words are never
spoken or shown before the attic" checks all of that. At run time the episode also
keeps the taught spell and the counter word out of the side rooms' key words, and a
room's other two objects are never a look-alike of the key word (`LOOKALIKES` in
`content/phonics/sentences.ts`) or a word the sentence itself shows.

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
(`decodable: false`) use a character's name-free face card as the picture.
`SPECIAL_WORDS` are non-CVC sentence key words kept for the story (MICE). Every
`CVC_WORDS` entry can stand in a side room as a wrong-answer object. (The parked Blend
Path uses only decodable words; Word to Picture mixes in one sight word per round.)

## A sentence frame (`content/phonics/sentences.ts`)

One `Frame` in `FRAMES`: `{ id, text, use }`.

- `text` is upper case; slots are `{villain}`, `{helper}` and `{x}`; at most one name
  slot; `{x}` (the key word) is always last.
- `use: 'fetch'` frames fill the two side rooms (two different ones per episode,
  weighted toward shaky frames); `use: 'counter'` frames are for `counter.frame`.
- Keep to the little words that should become sight words (IS, THE, A, OF, WE, CAN):
  repetition is the point. Never put a fetch word or counter word in a frame: the
  prefix line would say it before she answers (why CAN is not a fetch item).
- The composer makes one prefix line per frame (`sent_<id>`), or per frame × roster
  character when it has a name slot (`sent_<id>_<character>`), plus a `word_<token>`
  line for any new token. A name-slot frame costs one line per character.
- Progress is per frame (`frames` in ProgressStore): `SENTENCE_SOLID` in
  `src/config.ts` says when a frame skips the listening pass.

## A fetchable item (`FETCH_ITEMS`, same file)

`{ word, look, ability }`: a key word a side room can ask for, and what it does when it
pops out of her bag in both battles.

- `word`: CVC, already in `CVC_WORDS` with a `pic_<word>` picture, and not a frame word.
- `ability`: write it with the `use(word, kind, color, extra)` helper, so its id is
  `item_<word>` and its banner "The net". Any ability kind works; a `summon` item needs
  a `MinionSpec` in `MINIONS` (`hen`, `dog` fight on her side).
- Every item is in the pool for every episode; shaky words come up more often.

## A bedroom, or a bedroom object (`content/house/house.ts`)

A `BedroomSpec` in `BEDROOMS`: `{ id, look, palette, bed, door, waker, objects }`.
Positions are design pixels (1280×720), at the feet of the thing. Art: `room_bedroom_<id>`.
Only `BEDROOMS[0]` is played today; a second one is data, plus a choice in
`BedroomScene` of which to use.

A `BedroomObject`: `{ id, glyph, look, x, y, w, h, reaction, sound }`. `reaction` is
`wiggle | pop | alive | bounce | glow | squeak`; `sound` is one of the `ReactionSound`
SFX (`boing zap summon pew oink shout poof key whoosh`). No words, no reading: it is the
room she pokes for fun. Art: `obj_<id>`, so object ids are unique across bedrooms.

## A side room (`SIDE_ROOMS`, same file)

`{ id, name, look, glyph, palette, spots, entry }`: `spots` are the three pedestals,
`entry` where she comes in. Art: `room_side_<id>`. Any room but `attic`
(`COUNTER_ROOM`) joins `FETCH_ROOMS`, from which the hub draws two per episode for its
`a` and `b` doors. Door positions are `HUB.doors`.

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
