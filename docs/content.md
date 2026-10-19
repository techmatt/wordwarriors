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
- `counter`: its named counter item, flavour for when the attic's drawn counter word is
  this item's own word (see "The counter sentence" below): `name`, `glyph`, `look`, `how`
  (`block | reflect | swallow | reveal | restore | shutdown | calm | scare`; `swallow`
  is a block whose item then sucks the whole ultimate inside it, Tiamat's Magic Hat), and:
  - `word`: the word the item is named for (HAT → Magic Hat);
  - `words`: the parked Spell the Spell's two warm-ups and magic word, all CVC.
- `arena`: a key of `ARENAS`.
- `house`: its mood as a villain (see "A villain's house mood" below).

Every new character is automatically a hero, an ally (and so a narrator: about 110
narrator lines in its voice), a villain, and a sight word if added to `SIGHT_WORDS`.
It also multiplies the sentence lines: one `sent_<frame>_<id>` prefix per frame with a
name slot, and wake-up lines in each waker's voice. Add its two speakers (`<id>`,
`<id>_evil`) to `content/voice/voices.json`, and bump the roster count in
`tests/unit/rules.test.ts`.

Size note: each narrator adds ~1.4 MB of voice. Generated voice is not committed (it
lives in `public/voice-gen/`, see README *Storage*), so it does not count against the
20 MB per-commit gate.

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

## The counter sentence, and named counter items (`counter.word`)

The attic's sentence after the retreat is drawn fresh each episode (item 015): a
counter frame (`{villain} IS SCARED OF THE {x}`, `HATES THE`, `RUNS FROM THE`,
`CAN NOT STAND THE`, weighted toward shaky frames) and a counter word from her word bag
(see "Key words and the word bag" below). A villain's weakness does not have to make
sense: any pictured, decodable word can beat any villain. The picture she finds swells
into itself, flies into her bag, and in battle 2 a swarm of it scurries at the villain,
who leaps up ("EEK!", "NOT THE MOP!") while the ultimate fizzles. The narrator says
`got_counter_any` ("That is just what we need!"), which fits every word.

The counter word obeys the 009 rule, now checked on the draw: never a move word (battle
1's pads), never a word fetched this episode (battle 1's item banners), never a word
any of the episode's three sentences shows, never the taught spell, and never a word
the episode's hero, ally or villain says or shows first (`saidEarly` in
`src/rules/sentences.ts`: names, abilities, ultimates, taunts, minions, the threat,
their combo). The unit test "the counter is random: any pictured, decodable word,
under the 009 exclusions" checks it for every villain.

**Named counter items are flavour.** When the draw lands on the villain's own
`counter.word` (HAT for Evil Tiamat), battle 2 shows the named item (`item_<id>` art,
its banner, its `how`) and the narrator says `got_counter_<villain>` ("We found the Magic
Hat!"). That word is drawn `NAMED_COUNTER_BOOST` (3) times as often as any other while
it is in the bag. A named word is a whole word of the item's `name` and stays out of
every name, ability, ultimate, taunt and threat in the roster (unit test "named counter
words are pictured, and never in any name, ability, taunt or threat"). MICE is not
decodable, so EvilRilla's Wind-up Mice never come up in the episode now. Changing an
item's `id` needs new `item_<id>` art (`npm run art:gen -- item_<id>`). With `how:
'scare'` the swarm is the item's `glyph`.

The named items (the sentence column is how they read when their word comes up):

| Villain | Counter sentence | Battle-2 item | `how` |
| --- | --- | --- | --- |
| Evil Julia | … SCARED OF THE BED | Cozy Bed | calm |
| Evil Ellie | … SCARED OF THE TUB | Bubble Tub | calm |
| Evil Seraphina | … SCARED OF THE NUT | Golden Nut | calm |
| Evil Dada Matt | … SCARED OF THE LOG | Giant Log | block |
| Evil Dada Jason | … SCARED OF THE VAN | Clean-Up Van | restore |
| Evil Elsa | … SCARED OF THE CUP | Cocoa Cup | restore |
| Evil Anna | … SCARED OF THE CAT | Cuddly Cat | calm |
| Evil Jasmine | … SCARED OF THE BAT | Flappy Bat | reflect |
| Evil Ozymandias | … SCARED OF THE RAT | Brave Rat | scare |
| Evil Jormungandr | … SCARED OF THE FOX | Tickle Fox | restore |
| Evil Smaug | … SCARED OF THE BAG | Gold Bag | block |
| Evil Tiamat | … SCARED OF THE HAT | Magic Hat | swallow |
| Evil Scar | … SCARED OF THE BUG | Glitch Bug | shutdown |
| Evil Moriarty | … SCARED OF THE MAP | Truth Map | reveal |
| Evil Bavmorda | … SCARED OF THE CAP | Bounce Cap | reflect |
| EvilRilla | … SCARED OF MICE | Wind-up Mice | scare |

## An ability (`AbilitySpec`)

`{ id, name, kind, cooldown, color, color2?, power, count?, glyph?, status?, minion?,
duration?, homing?, word?, shout?, art?, guard? }`. Kinds: `bolt beam cone lightning
slam spin dash summon polymorph freeze teleport clones trap rain shield heal grow coil
eclipse wave grid orbit` (one function each in `src/battle/abilities.ts`). `power` 1–3
scales damage, particles and shake. `shout: true` plays the "Ha!" SFX. `art` is an art
id drawn instead of a glyph for bolts, rain and orbits (Ellie's `prop_silver_sword`,
drawn point up); `orbit` rings the caster with `count` of them for `duration` seconds,
then flings them, and `guard: true` shields her while they spin.

A minion is a `MinionSpec` in `MINIONS` (one ability, its own style).
A team combo is a `ComboSpec` in `COMBOS` (`pair` of character ids + an ability, and
optionally `second`, what the second of the pair fires instead: Julia's stars and
Ellie's sword ring in Star Sword Spin); any other pair uses `DEFAULT_COMBO`.

## Words (`content/phonics/words.ts`)

`{ word, glyph | draw, decodable: true }` for a CVC word with a picture; sight words
(`decodable: false`) use a character's name-free face card as the picture.
`SPECIAL_WORDS` are non-CVC sentence key words kept for the story (MICE). Every
`CVC_WORDS` entry can stand in a side room as a wrong-answer object. (The parked Blend
Path uses only decodable words; Word to Picture mixes in one sight word per round.)

## A sentence frame (`content/phonics/sentences.ts`)

One `Frame` in `FRAMES`: `{ id, text, use }`.

- `text` is upper case; slots are `{villain}`, `{helper}`, `{hero}` and `{x}`; at most
  one name slot; `{x}` (the key word) is always last.
- `use: 'fetch'` frames fill the two side rooms (two different ones per episode,
  weighted toward shaky frames); `use: 'counter'` frames fill the attic (one per
  episode, weighted the same way) and name the villain.
- Keep to the little words that should become sight words (IS, THE, A, OF, WE, CAN,
  NOT): repetition is the point, and 3–5 frames of each kind is right. A frame word
  that is also a CVC word (CAN) is fine: the draw keeps every word of the episode's
  three sentences out of its key words, so WE CAN USE THE CAN never happens.
- Today: fetch `we_can_use_the`, `helper_needs_a`, `go_get_the`, `we_need_a`,
  `hero_needs_the`; counter `scared_of_the`, `villain_hates_the` (a fetch frame until
  item 015, so it kept its id and progress), `runs_from_the`, `can_not_stand_the`.
- The composer makes one prefix line per frame (`sent_<id>`), or per frame × roster
  character when it has a name slot (`sent_<id>_<character>`), plus a `word_<token>`
  line for any new token. A name-slot frame costs one line per character.
- Progress is per frame (`frames` in ProgressStore): `SENTENCE_SOLID` in
  `src/config.ts` says when a frame skips the listening pass.

## A fetchable item (`FETCH_ITEMS`, same file)

`{ word, look, ability }`: a key word a side room can ask for, and what it does when it
pops out of her bag in both battles.

- `word`: CVC, already in `CVC_WORDS` with a `pic_<word>` picture. Every CVC word has
  an item since item 015; a new CVC word needs one too, or it can only be a counter.
- `ability`: write it with the `use(word, kind, color, extra)` helper, so its id is
  `item_<word>` and its banner "The net". Any ability kind works; a `summon` item needs
  a `MinionSpec` in `MINIONS` (`hen`, `dog` fight on her side). `...pic(word)` makes a
  `bolt` or `rain` fling or drop the word's own picture, the right way up.

## Key words and the word bag (`src/rules/sentences.ts`, ProgressStore `bag`)

Every key word (both side rooms and the attic) comes out of her word bag: every
decodable `CVC_WORDS` word (`BAG_WORDS`), drawn without replacement and kept with her
progress in localStorage. A word leaves the bag when she reads it right first time
(drawing alone spends nothing, so an abandoned episode or a `?scene=` jump costs her
bag no words); when no word the episode can use is left, the bag refills (a new
round, minus this episode's words). Within the bag, shaky words are drawn more often
(`shakiness`), and a word she missed (any wrong try) stays in, so it comes round
again soon. No key word repeats within
an episode. The grown-ups page (F9) shows the round, words seen and left, and the
shaky words. Erasing progress (F8 twice) empties the bag too.

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
