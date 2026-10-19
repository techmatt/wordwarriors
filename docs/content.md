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

A new character is defined but not drawn into random
episodes until its id is added to `ACTIVE_CAST` in `src/config.ts` (`allies`,
`villains`, or both); `?ally=<id>` / `?villain=<id>` play it either way. Its `size`
also sets how tall it stands beside her in rooms and the victory scene (`castScale`).

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
    a `word` from `MOVE_WORDS`, so the move-choice pads have words to offer, and each
    can list more words that suit it in `words` (item 018: every good fighter answers
    to six or more; see "Move words and the move bag" below). As a helper, its first
    `word` the hero lacks is the spell it teaches in the hub (`src/rules/spell.ts`).
  - `reformed` (on the character, beside `counter`): two or more short, kid-funny lines
    the villain says in its good voice once beaten ("Sorry I was so stormy!"); the
    battle's end says the first, the victory scene the second (item 027), so the
    second should work as something said to friends at a party. Voiced as
    `reformed_<id>_<key>` in the villain's voice group.
  - `ultimate`: the evil one floors the heroes in Part 1 and is countered in Part 2.
  - `taunts`: `{ key, text }`, short, no interjections ("Ha!" is an SFX).
    A homograph edge-tts reads the wrong way gets a `say` respelling (item 020: "Bow"
    is said "Bough"; the Wind-up Mice have `counter.sayName` "Whined-up Mice"). Watch
    for bow, wind, tear, read, live and lead.
- `counter`: its named counter item, flavour for when the attic's drawn counter word is
  this item's own word (see "The counter sentence" below): `name`, `glyph`, `look`, `how`
  (`block | reflect | swallow | reveal | restore | shutdown | calm | scare`; `swallow`
  is a block whose item then sucks the whole ultimate inside it, Tiamat's Magic Hat), and:
  - `word`: the word the item is named for (HAT → Magic Hat);
  - optional `sayName`, for edge-tts, like a fighter's.
- The parked Spell the Spell's words (two warm-ups and a magic word, all CVC) are not
  on the roster: add the character's triple to `SPELL_WORDS` in
  `content/phonics/spelling.ts` (item 020).
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

The counter word obeys the 009 rule, now checked on the draw: never a word on battle
1's move pads (planned with the episode, item 018), never a word fetched this episode (battle 1's item banners), never a word
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
duration?, homing?, word?, shout?, art?, upright?, guard? }`. Kinds: `bolt beam cone lightning
slam spin dash summon polymorph freeze teleport clones trap rain shield heal grow coil
eclipse wave grid orbit` (one function each in `src/battle/abilities.ts`). `power` 1–3
scales damage, particles and shake. `shout: true` plays the "Ha!" SFX. `art` is an art
id drawn instead of a glyph for bolts, rain and orbits (Ellie's `prop_silver_sword`,
drawn point up), or a built-in fx texture: `fx_bubble` is a see-through bubble tinted
the ability's `color`/`color2` (Ellie's bubbles); `upright: true` keeps it from
spinning or tilting. `orbit` rings the caster with `count` of them for `duration` seconds,
then flings them, and `guard: true` shields her while they spin. Statuses: `freeze pig
stun burn bubble`; `bubble` (Ellie's Bubble Trap) floats the target up and away in a
giant bubble for `duration` seconds, then pops it.

A minion is a `MinionSpec` in `MINIONS` (one ability, its own style).
A team combo is a `ComboSpec` in `COMBOS` (`pair` of character ids + an ability, and
optionally `second`, what the second of the pair fires instead: Julia's stars and
Ellie's bubble ring in Star Bubble Spin); any other pair uses `DEFAULT_COMBO`.

## A form: a character's outfit for a scenario (`content/battle/forms.ts`)

A character normally appears as its roster images (`char_<id>_good`, `face_<id>`). A
form swaps them when the episode's cast matches: `FORMS.julia` has
`{ id: 'chef', art: 'char_julia_chef', face: 'face_julia_chef', when: { ally: 'dada_jason' } }`,
so with Dada Jason the chef as ally Julia is chef Julia from the moment she gets out of
bed: walking in every room, in battle, on the journey map and at the victory, and her
face card when JULIA is a word to read. Asleep in bed, the title and the pick screens
keep her default images. To add one: an outfit entry in `content/art/assets.ts` (like
`char_julia_chef`, and a `face_<id>_<outfit>` card), `art:alts` / `art:pick` for its
images, then a line in `FORMS` with a `when` on the ally, the villain or both. The
first match wins. The `when` names a roster id, so a dad's form counts: Julia is a little
knight (`char_julia_knight`) beside warrior Dada Jason (`dada_jason_warrior`, item 025).
`skipTaunts` lists taunt keys that do not fit the outfit (chef and knight Julia never
say "My wand is sparkly!"). (An outfit only swaps images; a dad's form is a whole character: next section.) The game asks `castArt(id)` / `castFace(id)` in
`src/episode/Episode.ts`, never `charArt` directly, for anything shown after she wakes.

## A dad's form: another whole character (`person` in the roster)

Item 025 gave the dads forms that change more than clothes: weightlifter, cyberdecker and
spell-blade Dada Matt (`dada_matt_lifter`, `dada_matt_cyber`, `dada_matt_blade`), warrior
and warlock Dada Jason (`dada_jason_warrior`, `dada_jason_warlock`). Each is a full
`CharacterSpec` in `ROSTER` with `person: 'dada_matt'` and a `form` name (`lifter`):
its own good and evil fighters, abilities (move words from `MOVE_WORDS`), taunts,
ultimate, counter item, arena, house mood and reformed lines, and a quest. The person's
own entry carries the default form's name (`form: 'builder'`). What follows from `person`:

- **Voice**: every line of the form is spoken by the person's speaker (`dada_matt`,
  `dada_matt_evil`), so no `voices.json` entry is needed. Narrator lines, the wake-up
  and the sentence prefix lines are per person (`PERSONS`); names are the person's
  ("Dada Matt", "Evil Dada Matt"), so sentences read the same.
- **Art**: `char_<form id>_good`, `char_<form id>_evil`, `face_<form id>`, drawn from
  the person's photo (`refFor` matches `char_dada_matt_<anything>`). The look starts
  from the person's face (`MATT_FACE`, `JASON_FACE` in roster.ts); only clothes and props change.
- **Casting**: `drawCast` gives each dad one form per episode, and he is that form in
  every role (the waker, the ally, the villain). `castId('dada_matt')` is the form he
  plays now; `castArt`/`castFace` use it, so the caption portrait shows the lifter.
- Combos are written for persons (Julia and any Dada Matt high-five).

To add one: a roster entry like `dada_matt_lifter`, a `SPELL_WORDS` triple, a quest,
then `voice:lines`, `voice:build`, `art:placeholders`, and `art:alts` for its three
images, its counter item and its decals. Hyphens stay out of its lines (README,
*Operational facts*).

## A quest (`content/house/quests.ts`) and a quest place (`PLACES`, `content/house/house.ts`)

A quest is `QUESTS[<roster id>] = { place, text, say? }`: the place the helper takes her
and the setup line the helper says in the bedroom after the bad news, in their own
voice (`quest_<id>`, group core). No reading words in it (rules.test.ts), and its words
never become key words that episode (`saidBefore`). A character with no entry takes
`HOME_QUEST`: the house, and the narrator's "we have to train right here at home".

A place is `{ id, name, glyph, look, palette, rooms: [two side rooms], secret }`, and
optionally `outdoor: true` (open sky behind: the villain's decals all lie on the floor,
none hang in the air) and `moodFloor: [x, y, w, h]` (where floor decals lie when the
art's floor is not the house hub's, like the treehouse deck); its
art is `room_place_<id>` (the hub, laid out like the house's: the game draws the
helper, the magic circle, the doors and a `prop_portal` way out on top) and
`room_side_<room id>` for each room. Several characters may share a place; tier-two
places share the `secret_hideout` secret room. The glyph is the journey map's stop and
the secret door's plaque. Look at one with `?place=<id>`.

## A minigame (`MINIGAMES`, `src/rules/minigames.ts`)

Each episode draws three games from the pool, one per room (two fetch games, then
the counter game), weighted, never the same entry twice, apart from the quest. An
entry is `{ id, scene, weight, slots: ['fetch'] | ['counter'] | both, frame?, machine? }`:
each sentence frame is one entry (`sentence:<frame>`, weight 1 times the frame's
shakiness), and the word machine is one more (`word_machine`, fetch rooms only, weight
`WORD_MACHINE.weight` in `src/config.ts` times how shaky her word families are: about
every other episode). A new game is one entry and its scene; the room's `RoomPlan`
(a union by `kind`, `src/rules/sentences.ts`) carries `game` and `scene`, and `enterRoom`
starts that scene. Whatever it plays, it must end in a word she read: `plan.key` (the
prize on the hub door, or the counter) and `plan.fetches` (every word read there, each a
battle item from a fetch room). Words a game uses are planned in `episodePlans`, so
they stay out of the other rooms and the counter.

Look at one game: `?game=word_machine` puts it behind door a; `?games=sentence` draws
from the sentence game alone (the tests' default).

## A victory scene (`ENDINGS`, `content/house/endings.ts`)

After battle 2, before the recap, one scene plays (`src/scenes/EndingScene.ts`; the
draw and the script are `src/rules/endings.ts`). A scene is `{ id, glyph, palette, look,
props, stand, open, cheer, close, fit?, villains }`:

- `look`: the background's brief (`room_end_<id>`); keep the middle and the floor clear
  where the cast stands. `props`: `{ id, look, glyph, x, y, w, h, front? }`, art
  `prop_end_<id>`, feet at `x, y`; a `front` prop (the table, the boat, the fort) stands
  lower than the cast and so is drawn over them; with `cut` (a fraction of its height)
  only the part below it is, and the rest behind them (the boat's hull over them, its
  sail behind). A tall prop that should not hide faces (the party table, the fort)
  stands behind the cast instead: its feet higher than theirs.
- `stand`: the cast's feet line `y`, the span `left`–`right` they spread over, their
  height `h`, and an optional `gap` nobody stands in (the campfire).
- `open` (the host: the narrator), `cheer` (the hero), `close` (someone else there):
  `{ text, say? }`, with no names, so any cast can say them; each is voiced for every
  person (`end_<person>_<scene>_<key>`, group `end_<person>`). The villain's line between
  `open` and `cheer` is its own second `reformed` line, so the replies must follow any of
  them ("Yay! Come and sit with us!").
- `fit`: `{ form, text }`, a dad form (roster id) that suits the scene; when he is there
  (not as the villain) he says it in place of `close`, voiced only for him. `villains`:
  roster ids whose reformed line suits it. A scene that fits the cast either way is
  `FIT_WEIGHT` (3) times likelier; last episode's scene (ProgressStore `ending`) is
  never drawn.

Four lines plus the pauses (`ENDING_PAUSE`) come to about 18–24 s; the unit test checks
every scene for every cast shape against the built voice and keeps it under 30 s. After
adding one: `voice:lines`, `voice:build`, `art:placeholders`, then `art:alts` for its
background and props. Look at it with `?scene=victory&ending=<id>`.

## A word family (`content/phonics/families.ts`, the word machine)

The word machine (item 026, `src/scenes/WordMachine.ts`) teaches onset + rime: a
picture in its window, a rime on its panel (AT), letter tiles on the floor; stepping on
a tile says its sound, green slots it in, and the machine says the sound and the rime
apart, never blended. A wrong tile makes a silly word ("That makes... ZAT! A silly
word!"). A visit is `WORD_MACHINE.rounds` words, up to `perFamily` from one family, then
another family; every word built is a battle item.

- **Families come from the pictured words.** Any rime with two or more decodable CVC
  words in `words.ts` and an entry in `RIMES` is a family (today -AT, -AN, -AP, -EN, -ET,
  -OG). A new pictured word (MUG, RUG) opens -UG once `RIMES` has `ug`.
- **A rime** is `{ say, silly }`: `say` is the edge-tts spelling of the rime alone (one
  syllable, about 0.7 s; "Ett" came back 1.4 s, read as letters, so -ET is "Eht"); its line
  is `rime_<rime>`, a placeholder for Matt's recording.
- **Silly onsets** make the wrong tiles: each must be nonsense (not a word, not a name,
  not slang, not a homophone of a real word: no KAT, NAT, ZAP, YEN, JAN, and never J or F
  before AP), at least `tiles - 1` per family. Each is a `silly_<word>` line.
- Then `voice:lines`, `voice:build`. The unit tests check every silly word against the
  game's words and a block list.
- **Later modes** (`flip`, `real_or_silly`): `MachineMode` in `src/rules/wordMachine.ts`;
  each tile already carries what it makes and whether that is a real word. A mode is a
  plan there and a branch at `startRound` in the scene.

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
  NO, FOR): repetition is the point, and 3–5 frames of each kind is right. A frame word
  that is also a CVC word (CAN) is fine: the draw keeps every word of the episode's
  three sentences out of its key words, so WE CAN USE THE CAN never happens.
- Today: fetch `we_can_use_the`, `helper_needs_a`, `go_get_the`, `we_need_a`,
  `hero_needs_the`; counter `scared_of_the`, `villain_hates_the` (a fetch frame until
  item 015, so it kept its id and progress), `runs_from_the`, `no_match_for_the`
  (CAN NOT STAND THE until item 020).
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

## Move words and the move bag (`src/rules/moves.ts`, ProgressStore `moveBag`)

`MOVE_WORDS` (`content/battle/roster.ts`) is the pool, 26 words since item 018. An
ability answers to its `word` and its `words`. When the house is planned,
`planMoves` plans all four move choices too (two per battle part): the first of each
part is the spell, the other right words come out of her **move bag**, the 015 bag
logic over the move words (without replacement across episodes, shaky words more
often, a word leaves only when she picks it right first time). Each choice shows 2 or
3 pads; the wrong ones are her team's other words, ones she has not seen this episode
first. The owner of the right word fires it (her hero fires the spell, with the
helper's move). Planning up front is what lets the attic's counter word keep clear of
exactly the words battle 1 shows (`battle1Words`).

A new move word: add it to `MOVE_WORDS`, to an ability's `words`, and give it a
picture: a reading word's own `pic_<word>`, or a `MOVE_PICTURES` entry
(`content/phonics/words.ts`) plus its line in `PICTURES` (`content/art/prompts.ts`).
The super shows a fan of that picture and the recap shows it beside the word. Then
`voice:lines`, `voice:build`, `art:placeholders` (narrator `use_move_`, `teach_word_`,
`not_move_`, `was_move_`, `find_move_` lines and its `word_` line are composed).

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
