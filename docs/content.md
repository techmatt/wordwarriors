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
also sets how tall it stands beside her in rooms and the victory scene (`castScale`),
except a dad in any form: he is always `ADULT_HEIGHT` (1.5) times her height, in battle
too, whatever his `size` (item 034; `size` still drives the fight).

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
  - `abilities`: three or more `AbilitySpec`. The `words` that suit one are
    flavour (item 037): bank action words (`MOVE_WORDS`), or POW and ICE, which are
    never on a pad. When a pad's word is one a teammate's ability answers to, that
    teammate fires the styled move instead of the word's own effect; as a helper, its
    words are twice as likely to be the gift word, which her hero then fires with its
    move (see "Move words and the move bag" below). At least two of a character's good
    abilities have `words` (one list per ability since item 047).
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
  `he's going to eat Dada Jason's car`!" Fun, not scary, no reading words (no pictured bank word: warlock Dada
  Jason's toad is not a FROG); its words are kept off that episode's pads and gift word.
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
sense: any pictured bank word can beat any villain. The picture she finds swells
into itself, flies into her bag, and in battle 2 a swarm of it scurries at the villain,
who leaps up ("EEK!", "NOT THE MOP!") while the ultimate fizzles. The narrator says
`got_counter_any` ("That is just what we need!"), which fits every word.

The counter word obeys the 009 rule, now checked on the draw: never a word on battle
1's move pads (planned with the episode, item 018), never a word fetched this episode (battle 1's item banners), never a word
any of the episode's three sentences shows, never the gift word or any word on either
battle's pads (no key word is), and never a word the episode's hero, ally or villain
says or shows first (`saidEarly` in `src/rules/sentences.ts`: names, abilities,
ultimates, taunts, minions, the threat, their combo) or the quest line and hub scene
say. The unit test "the counter is random: any pictured, decodable word,
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
duration?, homing?, word?, words?, shout?, art?, upright?, guard?, callout? }`, written
`ab(...)` in the roster, an ultimate `ult(...)` (no cooldown: the director fires it). Kinds: `bolt beam cone lightning
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

A big move (power 2+) is called out as it fires, voiced and on its banner, as `<name>!`,
unless that would say a move word on a pad still to come. A move whose name says a move
word (Evil Bavmorda's Pig Curse) gets a `callout` that says none ("Curly Tail Curse!"),
or it is never called out while that word is on a pad (item 034). The melee kinds (`slam
spin dash teleport`) carry the caster to the target in the brawl; in a contest (race, rope
pull, clash, cook-off) the stage holds the caster to its place, so they play there and
send their force across.

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
its own good and evil fighters, abilities (flavour move words from `MOVE_WORDS`), taunts,
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
hub scenes, then `voice:lines`, `voice:build`, `art:placeholders`, and `art:alts` for its three
images, its counter item and its decals. Hyphens stay out of its lines (README,
*Operational facts*).

## A quest (`content/house/quests.ts`) and a quest place (`PLACES`, `content/house/house.ts`)

A quest is `QUESTS[<roster id>] = { place, lines }`: the place the helper takes her,
and the setup lines (`{ text, say? }`, three each today), one of which the helper says
in the bedroom after the bad news, in their own voice (`quest_<id>_<n>`, group core).
Each episode draws one with the cast (`src/rules/story.ts`; `?cast=default` always says
the first, so the tests hear the same line). A new line is one more entry in `lines`.
No bank word at all in it, thing or action (rules.test.ts), no interjection, and commas
rather than a mid-line "!" or "."; its words never become key words, pads or the gift
that episode (`storyWords`). A character with no entry takes `HOME_QUEST`: the house,
and the narrator's "we have to train right here at home" (`nar_<narrator>_quest_home_<n>`).

A place is `{ id, name, glyph, look, palette, rooms: [two side rooms], secret }`, and
optionally `outdoor: true` (open sky behind: the villain's decals all lie on the floor,
none hang in the air) and `moodFloor: [x, y, w, h]` (where floor decals lie when the
art's floor is not the house hub's, like the treehouse deck); its
art is `room_place_<id>` (the hub, laid out like the house's: the game draws the
helper, the magic circle, the doors and a `prop_portal` way out on top) and
`room_side_<room id>` for each room. Several characters may share a place; tier-two
places share the `secret_hideout` secret room. The glyph is the journey map's stop and
the secret door's plaque. Look at one with `?place=<id>`.

## A hub scene (`HUB_SCENES`, `content/house/scenes.ts`)

How the helper gives her the gift word in the hub (item 037): a spell from a caster
(`CASTERS`; only theirs may say "spell"),
something chef Dada Jason cooks up, a gadget builder Dada Matt builds, a toy Ellie
shares. `HUB_SCENES[<roster id>]` is a list of scenes (2–3 per helper, each dad form its
own); each episode draws one (`src/rules/story.ts`, variant 1 with `?cast=default`). A
scene is `S(prop, lines, circle, done)`:

- `prop`: what pops up over the helper with the word written on it: an art id
  (`prop_scroll`) or an emoji drawn on a white card.
- `lines`: two to four, in the helper's person's voice. The word is drawn from the bank
  (any action word), so no line may name it or hint at which: the last trails off ("When
  you press the button, it goes...") into the narrator's `gift_word_<word>` clip.
- `circle`: sends her to the glowing spot (`SPOT(...)` / `CIRCLE(...)`); yellow says it
  again. `done`: once the word has flown into her ("..., let us look around!").

The same rules as a quest line: no bank word, no interjection, commas not a mid-line
"!" or "." (rules.test.ts). Voiced as `hub_<owner>_<n>_<key>` (`line1`…, `circle`,
`done`) in the owner's person's narrator group. A helper without scenes plays
`ANY_SCENES`, voiced per narrator (`nar_<narrator>_hub_any_<n>_<key>`). Then
`voice:lines` and `voice:build`. Look at one with `?scene=house&ally=<id>&seed=<n>`.

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

## A fight style (`FIGHTS`, `content/battle/fights.ts`)

Item 031: not every showdown is a brawl. A style is data plus a staging:

- **Data** (`FightSpec`): `{ id, kind, name, arena?, banner, tooStrong, win, lines,
  props? }`. `kind` picks the staging code (`brawl`, `race`, `tug`, `clash`,
  `cookoff`: `src/battle/stages/`), so a second race (a sea race, a broom race) is data
  only. `arena` is an `ARENAS` key in the roster (art `arena_<key>`), else the villain's
  own arena. `banner` is the big word as each part starts, `tooStrong` floats over the
  floored heroes at the end of part 1, `win` is the last hit's banner. `lines` are the
  narrator's `start`, `start2`, `retreat` and `finish`, voiced for every narrator
  (`<narrator>_fight_<id>_<beat>`); a beat without one uses the brawl's. Props are art
  `prop_fight_<id>`. Nothing shown or said may hold a move word or a reading word
  (`tests/unit/fights.test.ts` checks): the rope pull never says TUG.
- **Whose**: `fight: '<id>'` on the villain's roster entry (absent: `brawl`);
  `fightNudge: { fight, chance }` on a character makes that style likelier when it is
  the ally (chef Dada Jason: a cook-off, 70%). `src/rules/fights.ts` draws it once per
  episode; `?fight=<id>` fixes it.
- **A new kind**: a class extending `BaseStage` in `src/battle/stages/` (registered in
  `index.ts`). The battle calls its hooks at each beat (`setup`, `home`, `steer`,
  `update`, `drawHud`, `onHit`, `superMove`, `combo`, `ultimate1`, `counter2`, `finish`,
  `retreat`; the contract is `stage.ts`). It never changes the beats, their timing or the
  move choice; its meter is the steered health (`host.heroFrac()`, `host.villainFrac()`)
  plus its own beat swings, so the outcome stays fixed.

After adding one: `voice:lines`, `voice:build`, `art:placeholders`, then `art:alts` for
its arena and props. Look at it with `?scene=battle&part=1&fight=<id>` (any villain).

## A word family (`content/phonics/families.ts`, the word machine)

The word machine (item 026, `src/scenes/WordMachine.ts`) teaches onset + rime: a
picture in its window, a rime on its panel (AT), letter tiles on the floor; stepping on
a tile says its sound, green slots it in, and the machine says the sound and the rime
apart, never blended. A wrong tile makes a silly word ("That makes... ZAT! A silly
word!"). A visit is `WORD_MACHINE.rounds` words, up to `perFamily` from one family, then
another family; every word built is a battle item.

- **Families come from the word bank.** Any rime with an entry in `RIMES` and two or
  more bank words whose onset is a single letter (any role: CAT and VAT are things, ZAP
  and NAP actions) is a family. `Family.words` are its pictured words (make mode shows
  a picture, so only those are built); `Family.all` every single-onset word with the
  rime, for the later modes and the silly-word checks. A blend or digraph onset (FROG,
  SHIP) is not one tile, so it is in no family. A new bank word with a rime in `RIMES`
  joins its family by itself; a new rime needs its `RIMES` entry.
- **A rime** is `{ say, silly }`: `say` is the edge-tts spelling of the rime alone (one
  syllable, about 0.7 s; "Ett" came back 1.4 s, read as letters, so -ET is "Eht"); its line
  is `rime_<rime>`, a placeholder for Matt's recording.
- **Silly onsets** make the wrong tiles: each must be nonsense (not a word, not a name,
  not slang, not a homophone of a real word, nothing near a slur: no KAT, NAT, ZAP, YEN,
  JAN, NOX; never J or F before AP, N before IG, W before OP or OG), at least `tiles - 1`
  per family where the language allows (-IN has only HIN). Each is a `silly_<word>` line.
- Then `voice:lines`, `voice:build`. The unit tests check every silly word against the
  game's words and a block list.
- **Later modes** (`flip`, `real_or_silly`): `MachineMode` in `src/rules/wordMachine.ts`;
  each tile already carries what it makes and whether that is a real word. A mode is a
  plan there and a branch at `startRound` in the scene.

## A word (`content/phonics/bank.ts`)

Every word she reads is one entry in the word bank (item 037). An entry is
`T(word, glyph?, extra?)` for a `thing` (a clear picture: a room's object, a key word,
the counter, a warm-up picture, a fetched battle item), `A(...)` for an `action` (a
clear battle effect: a move pad, the gift word) or `B(...)` for `both` (NET, flung or
fetched). `glyph` is the placeholder card's emoji (avoid Emoji 13+); `draw` a canvas
drawing where Windows 10 has none; `say` a respelling where edge-tts misreads it.

Its tags are derived from the spelling, never typed: `units` (SH CH TH CK kept
together), `level` (1 CVC, 2 a consonant blend, 3 a digraph; both is 3), `vowel`,
`onset`, `rime`. A word must have exactly one short vowel between consonants (`tag()`
throws otherwise), and no word with a sound unit lacking a letter sound. The exception
is a **long-vowel** word (item 043: KEY for K, YOYO for Y, where no familiar short-vowel
picture exists), whose `spelled` lists each sound unit's letters and its sound by hand:
KEY is `[['k', 'k'], ['ey', 'long_e']]`. Level 1, no vowel tag, never in a word family;
otherwise like any word (item 048): every hint sounds every unit (K, then long E lighting
EY; Y, long O, Y, long O), and it can be the counter. A long vowel is its own sound
line (`LONG_VOWEL_SOUNDS` in `content/phonics/letters.ts`, `letter_long_e_sound`), a
placeholder until Matt records it; a new one goes there. A hyphen breaks the line and picture ids: YO-YO is `yoyo`, printed YOYO,
with `say: 'yo-yo'`. To add one:

1. The entry, in its level's block of `ENTRIES`.
2. Its picture brief in `PICTURES` (`content/art/prompts.ts`): "a frog: a bright green
   frog ...", one clear thing a 4-year-old knows, no writing; say what it is not where
   it could be mistaken ("a plum, not a fig"). Art is `pic_<word>`.
3. Its battle effect in `content/phonics/effects.ts`: a thing or `both` with
   `use(word, kind, color, extra)` in `THING_EFFECTS` (id `item_<word>`, `...pic(word)`
   to fling or drop its own picture), an action with `act(...)` in `ACTION_EFFECTS` (id
   `word_<word>`); `look` says what it does. A `summon` needs a `MinionSpec`.
4. Look-alikes in `LOOKALIKES` (`content/phonics/sentences.ts`) if a picture could be
   taken for another (FIG and PLUM), and a `RIMES` entry if it opens a family.
5. `voice:lines`, `voice:build` (its `word_<word>` line; an action also gets every
   narrator's `use_move_`, `gift_word_`, `not_move_`, `was_move_`, `find_move_` lines),
   `art:placeholders`, then `art:alts` / `art:gen` for the real picture.

Keep it out of every narrator line, threat, quest line and hub scene (rules.test.ts
says which line says it), and a `both` or action word out of the roster's counter
words. A new word joins her bags' rounds already under way (`topUpBag`, `topUpMoves`).

**Familiar or `odd`** (item 040). A thing must be one a typical four-year-old knows
from its picture alone (everyday objects, animals, food, toys, body parts, a house or a
picture book), because rooms, the counter, the warm-up and the word machine ask her to
find its picture. Otherwise mark it `odd` (`ODD`, or `NEW_ODD` for 037's): an odd
`both` word (RAM, JET) keeps its action role, pads and the gift, where its picture only
comes after she reads it; an odd thing (YAK, VAT) is out of play (`DROPPED`), its
picture, effect and lines kept so Matt can overrule it by deleting the flag. Watch for
a picture she would name otherwise (JET is "a plane", FIN "a shark"). `THINGS` is the
familiar things, `ACTIONS` every action and `both` word, `LIVE` both; coverage and
level firmness count `LIVE` only. A family needs two familiar pictures.

`content/phonics/words.ts` reads the bank: `CVC_WORDS` (the name stayed) is every
familiar thing and `both` word, `MOVE_PICTURES` every other bank word (actions, odd ones); sight words (`decodable: false`) use a character's
name-free face card as the picture; `SPECIAL_WORDS` are non-bank key words kept for the
story (MICE); `FLAVOUR_PICTURES` keep POW and ICE's art for the roster.

## A sentence frame (`content/phonics/sentences.ts`)

One `Frame` in `FRAMES`: `{ id, text, use }`.

- `text` is upper case; slots are `{villain}`, `{helper}`, `{hero}` and `{x}`; at most
  one name slot; `{x}` (the key word) is always last.
- `use: 'fetch'` frames fill the two side rooms (two different ones per episode,
  weighted toward shaky frames); `use: 'counter'` frames fill the attic (one per
  episode, weighted the same way) and name the villain.
- Keep to the little words that should become sight words (IS, THE, A, OF, WE, CAN,
  NO, FOR): repetition is the point, and 3–5 frames of each kind is right. A frame word
  that is also a bank word (CAN) is fine: the draw keeps every word of the episode's
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

## What a word does in battle (`content/phonics/effects.ts`)

One `WordEffect` per bank word, `{ word, look, ability }`, whoever fires it (the unit
test checks one each). A thing's is its fetched item: it pops out of her bag in both
battles with a THE NET! banner; `FETCH_ITEMS` (`content/phonics/sentences.ts`) is every
thing's effect. An action's is its move: reading its pad casts it, her hero fires it
supercharged with a SUPER JUMP! banner. Write a thing's with `use(word, kind, color,
extra)` (id `item_<word>`, `both` words too) and an action's with `act(...)` (id `word_<word>`). Any
ability kind works; a `summon` needs a `MinionSpec` in `MINIONS` (`hen`, `dog` fight on
her side). `...pic(word)` makes a `bolt` or `rain` fling or drop the word's own picture,
the right way up.

## Key words and the word bag (`src/rules/sentences.ts`, ProgressStore `bag`)

Every key word (both side rooms and the attic) comes out of her word bag: every
pictured bank word (`BAG_WORDS`, the bank's things), drawn without replacement and kept
with her progress in localStorage. A word leaves the bag when she reads it right first time
(drawing alone spends nothing, so an abandoned episode or a `?scene=` jump costs her
bag no words); when no word the episode can use is left, the bag refills (a new
round, minus this episode's words). Within the bag every draw weighs a word by the
bank's one weighting (`src/rules/bank.ts`): **shakiness × coverage × level gate**.
Shaky words come more often, and a word she missed (any wrong try) stays in, so it
comes round again soon; coverage favours the vowels, first sounds and levels she has
met least; the gate keeps blends shut until enough CVC words are solid and digraphs
until enough blends are (`BANK_DRAW` in `src/config.ts`: `levels[2]` opens at `start`
of level 1 solid, at weight `min`, full at `full`; `solid` is the shakiness that counts).
The same weighting draws the move pads, the gift word, the warm-up's word and the word
machine's words. A room's other pictures are chosen for reading (`distractorsFor`):
while the key word is new they start with other letters; once it is firm (`BANK_DRAW.firm`)
one shares its first sound or rime (CAT beside HAT), so she reads past the first
letter. No key word repeats within an episode, and none is on that episode's move pads. The grown-ups page (F9) shows the round, words seen and left, the
bank's coverage by level (with each gate's open %), vowel and first sound; green flips
to page 2, every word. Erasing progress (F8 twice) empties the bag too.

A word new to the game joins a round already under way (item 035, `topUpBag`): the
store remembers the bag words it last saw (`bagKnown`), and any word since goes into the
bag, so she meets new words without waiting for the bag to empty; a word the game no
longer has leaves it. Progress saved before item 035 knew `LEGACY_BAG_WORDS`. Adding a
word needs nothing more.

## Move words and the move bag (`src/rules/moves.ts`, ProgressStore `moveBag`)

`MOVE_WORDS` (`content/battle/roster.ts`) is the pool: every bank action word (role
`action` or `both`, item 037). Reading a pad casts its word (word magic): when a
teammate's ability answers to it (its `words`), that teammate fires the styled move;
otherwise her hero fires the word's own effect (`content/phonics/effects.ts`). POW and
ICE are flavour on abilities, never on a pad.

The **gift word** is the word the helper gives her in the hub scene (`drawGift`): an
action word from her move bag by the bank's weighting, never one said before the
battle (the threat, the quest line, the hub scene), the helper's own words weighted
double. A caster's gift is a spell (item 038): for a helper in `CASTERS`
(`content/house/scenes.ts`: Elsa, Bavmorda, Tiamat, Moriarty, warlock Jason, spell-blade
Matt) the bank's `spell` words (ZAP ZIP POP HEX MIX, and SPIN SNAP FLIP TWIST MELT BLAST
once blends open) weigh `CASTER_SPELL_BOOST` (25) times more, about four gifts in five;
only casters' scenes may call the gift a spell (a unit test). Her hero fires it with the helper's move when the helper has one. When the
house is planned, `planMoves` plans all four move choices too (two per battle part):
the first of each part is the gift word, the other right words come out of her **move
bag**, the 015 bag logic over the move words by the same weighting (without replacement
across episodes, a word leaves only when she picks it right first time). Each choice
shows 2 or 3 pads; the wrong ones are other action words from the levels open to her,
chosen for reading (`distractorsFor`), ones not yet shown this episode first, then
ones still in her **pad bag** (ProgressStore `padBag`, item 038: a word leaves it once a
choice has shown it as a wrong pad; one that has had its turn weighs `PAD_SHOWN_WEIGHT`,
0.05), weighed by coverage. Without it, about three back-to-back episodes in five shared
a wrong pad; with it, about one in seven. Planning
up front is what lets the room key words keep clear of every pad, and the attic's
counter word of exactly the words battle 1 shows (`battle1Words`).

A new move word is a new bank word with role `action` ("A word" above): its entry, its
`PICTURES` brief (the super shows a fan of that picture and the recap shows it beside
the word), its effect with `act(...)`; optionally a teammate's ability `words`, to
style it. Then `voice:lines`, `voice:build`, `art:placeholders`.

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
The digraphs SH CH TH CK are one sound unit each (`DIGRAPH_SOUNDS`, item 037:
`letter_sh_sound`); every hint sounds a digraph as one sound and lights both letters.

Letter **names** (item 033, the home warm-up spells with them) are `LETTER_NAMES` in the
same file: `letter_<x>_name`, shown as the bare capital, `say` the name spelled out for
edge-tts ("Vee", "Dubbelyou": "Double you" is timed as two words and fails the build). A
recording replaces one the same way: `npm run voice:clip -- letter_<x>_name <file.mp3>`.

## The home warm-up (`GRAB` in `src/config.ts`, `src/rules/grab.ts`)

Any pictured bank word can be asked for, by her grabs' shakiness times the bank's
coverage and level gate; adding a word adds it. `GRAB.startLevel` is where a word she has never grabbed starts
(1 word + names + sounds, 2 names + sounds, 3 sounds only), `GRAB.helpAfter` how many
misses before the clue adds the word, `GRAB.objects` how many pictures stand in the hall
(`ENTRY_HALL.spots` in `content/house/house.ts` has a place for each).

## Narrator lines (`content/voice/script.ts`)

Templates composed once per narrator (`{hero}`, `{villain}`, `{item}`, `{word}`).
Never put a reading word in one: the unit tests check. A template keyed per hero,
villain or move word (`HERO_LINES`, `VILLAIN_LINES`, `MOVE_LINES`) needs its key added
to the matching kind in `content/voice/ids.ts`, and the game builds the key with that
file's `heroKey` / `villainKey` / `moveKey`, never by hand. A new `right_<n>`,
`wrong_<n>` or `machine_silly_<n>` variant is picked up by count, nothing else to change.

## Art

Every id is in `docs/art.md` with its size and brief. Drop a PNG at
`public/art/<id>.png`; the painter will never overwrite it. When real *character* art
lands, set `FLIP_TO_FACE = true` in `src/config.ts` so she faces the way she walks
(off now because mirroring a placeholder card mirrors its name).
