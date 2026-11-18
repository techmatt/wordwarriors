# Content reference: the house, scenes, games and fights

Data for everything that is not a character or a word. The *Matt says X → run Y* table
and characters: `docs/content.md`; words and phonics rooms: `docs/content-words.md`.

## A villain's house mood (`CharacterSpec.house`)

How the house looks with this villain (`src/world/houseMood.ts` lays it over the bedroom
after the news, the hub and every side room; no room art is per-villain):

- `threat`: a clause for Dada Matt's wake-up ("Bad news, EvilRilla is coming, and
  `he's going to eat Dada Jason's car`!"). Fun, not scary, no pictured bank word; its
  words stay off that episode's pads and gift. Optional `threatSay` (same word count).
- `tint` over every room at low alpha; `tintAlpha` (default 0.16) lays it stronger (Evil
  Elsa's white, 0.42).
- `decals`: `{ id, glyph, look, count }`, things left lying about; id prefixed with the
  character (`rilla_footprint`), art `decal_<id>`.
- `fx`: `frost | freeze | embers | quake | sparkle | smoke | sand | none`; `freeze` is thicker
  frost creeping in from every edge; `sand` is fine golden grains falling slowly (Evil Kronos). In a reading room (`calm`) frost and sand fall half as thick.

## The counter sentence, and named counter items (`counter.word`)

The attic's sentence is drawn fresh each episode: a counter frame (`use: 'counter'`,
weighted toward shaky frames) and a counter word from her word bag. Any pictured bank
word can beat any villain. The picture she finds flies into her bag, and in battle 2 a
swarm of it scurries at the villain, who leaps up ("NOT THE MOP!") while the ultimate
fizzles; the narrator says `got_counter_any`, which fits every word.

The counter word is never on battle 1's pads, never fetched this episode, never shown by
any of the episode's three sentences, never the gift or on either battle's pads, and
never said or shown first by the episode's cast (`saidEarly`, `src/rules/sentences.ts`:
names, abilities, ultimates, taunts, minions, threat, combo) or its quest line and hub
scene (unit test "the counter is random: any pictured, decodable word, under the 009
exclusions"). KEY and YOYO may be the counter (Matt's ruling: she sounds them out fine).

**Named counter items are flavour.** When the draw lands on the villain's own
`counter.word`, battle 2 shows the named item (`item_<id>` art, banner, `how`) and the
narrator says `got_counter_<villain>`. That word is drawn `NAMED_COUNTER_BOOST` (6) times
as often while in the bag. It is a whole word of the item's `name` and in no roster name,
ability, ultimate, taunt or threat (unit test "named counter words are pictured, and
never in any name, ability, taunt or threat"). `how`: `block | reflect | swallow |
reveal | restore | shutdown | calm | scare` (`swallow`: the item sucks the ultimate in;
with `scare` the swarm is the item's `glyph`). A new item `id` needs `item_<id>` art
(`npm run art:gen -- item_<id>`). `tests/unit/namedCounters.test.ts` lists the items
that can never come up and why: MICE is not decodable (Wind-up Mice), and BED shows on
her bed before any room, so it is never a key word or the counter (`notKeys`). A bank
word's `glyph` must not be a journey-map stop's (🌅 ⚔️ 🏆, 🏠 at home).

| Villain | Word | Battle-2 item | `how` |
| --- | --- | --- | --- |
| Evil Julia | BED | Cozy Bed | calm |
| Evil Ellie | TUB | Bubble Tub | calm |
| Evil Seraphina | NUT | Golden Nut | calm |
| Evil Dada Matt | LOG | Giant Log | block |
| Evil Dada Jason | VAN | Clean-Up Van | restore |
| `dada_matt_lifter` | BOX | Juice Box | calm |
| `dada_matt_cyber` | PEN | Magic Pen | shutdown |
| `dada_matt_blade` | POT | Shiny Pot | reflect |
| `dada_jason_warrior` | MOP | Slippy Mop | block |
| `dada_jason_warlock` | BUS | Sunshine Bus | reveal |
| Evil Elsa | CUP | Cocoa Cup | restore |
| Evil Anna | CAT | Cuddly Cat | calm |
| Evil Jasmine | BAT | Flappy Bat | reflect |
| Evil Ozymandias | FISH | Fish Bucket | calm |
| Evil Jormungandr | FOX | Tickle Fox | restore |
| Evil Smaug | BAG | Gold Bag | block |
| Evil Tiamat | HAT | Magic Hat | swallow |
| Evil Scar | BUG | Glitch Bug | shutdown |
| Evil Moriarty | MAP | Truth Map | reveal |
| Evil Bavmorda | CAP | Bounce Cap | reflect |
| EvilRilla | MICE | Wind-up Mice | scare |
| Evil Meryl | BELL | Calm Bell | calm |
| Evil Kronos | KEY | Clockwork Key | restore |

## A quest and a quest place (`content/house/quests.ts`, `PLACES` in `content/house/house.ts`)

`QUESTS[<roster id>] = { place, lines }`: where the helper takes her, and setup lines
(`{ text, say? }`, three each), one said in the bedroom after the bad news in the
helper's voice (`quest_<id>_<n>`). Drawn with the cast (`src/rules/story.ts`;
`?cast=default` says the first). No bank word at all (rules.test.ts), no interjection,
commas rather than a mid-line "!" or "."; its words never become keys, pads or the gift
(`storyWords`). No entry: `HOME_QUEST` (train at home, `nar_<narrator>_quest_home_<n>`).

A place is `{ id, name, glyph, look, palette, rooms: [two side rooms], secret }`, plus
optional `outdoor: true` (open sky: decals all lie on the floor; hub only, an open-air
side room goes in `OUTDOOR_ROOMS`) and `moodFloor: [x, y, w, h]` (where floor decals lie
when the floor is not the house hub's). Art `room_place_<id>` (laid out like the house
hub; the game draws helper, magic circle, doors and a `prop_portal` on top) and
`room_side_<room id>`. Places may be shared; tier-two places share `secret_hideout`. The
glyph is the journey map's stop and the secret door's plaque. View: `?place=<id>`.

## A hub scene (`HUB_SCENES`, `content/house/scenes.ts`)

How the helper gives her the gift word: a caster's spell (`CASTERS`; only theirs may say
"spell"), a dish, a gadget, a toy. `HUB_SCENES[<roster id>]` lists 2–3 scenes (each dad
form its own); one is drawn per episode (`src/rules/story.ts`). A scene is
`S(prop, lines, circle, done)`:

- `prop`: what pops up with the word on it, an art id (`prop_scroll`) or an emoji on a
  card; wide props fit 210×120, square ones (`prop_bubble`) 150 px. A new prop is a
  `PROPS` row (`content/art/assets.ts`), `art:placeholders`, `art:gen -- <id>`. Prefer a
  drawn prop to an emoji that is a bank word's glyph.
- `lines`: two to four in the helper's person's voice; the word is any action word, so
  no line names or hints at it; the last trails off into `gift_word_<word>`.
- `circle`: where she goes; a string or `CIRCLE(...)` is the magic circle (every
  `CASTERS` scene); `PLATE`, `TOOLS`, `CHARGER` / `UPLOAD` / `LAUNCH`, `TRAINING`,
  `BLANKET`, `NEST`, `TREASURE` are pickups drawn in `src/world/giftSpot.ts`; the line
  names it ("Stand by the plate, and press green, ..."). A new kind is a `GiftSpot`
  member (`content/house/scenes.ts`) and its `case` in `giftSpot.ts`. Yellow repeats.
- `done`: after the word flies into her, a complete natural sentence ("let's", not "let us").

Same rules as a quest line (rules.test.ts). Voiced `hub_<owner>_<n>_<key>`; a helper
without scenes plays `ANY_SCENES` (`nar_<narrator>_hub_any_<n>_<key>`). View:
`?scene=house&ally=<id>&seed=<n>`.

## A minigame (`MINIGAMES`, `src/rules/minigames.ts`)

Each episode draws three games, one per room (two fetch, then the counter), weighted,
never the same entry twice, apart from the quest; a recent game (`recent.games`) weighs
`VARIETY.gameWeight`. An entry is `{ id, kind, scene, weight, slots, frame? }`, `kind`
one of `sentence machine charge bridge shifter rhyme`. Each sentence frame is an entry
(`sentence:<frame>`, weight × the frame's shakiness); `word_machine` weighs
`WORD_MACHINE.weight` × family shakiness; `charge`, `bridge`, `shifter`, `rhyme`
(`RHYME.weight` × rime shakiness) are one each; all but sentence frames are fetch-only.
Rhyme families (`RHYME_FAMILIES`, `src/rules/rhyme.ts`: three-unit words, one-letter
onset, three or more words, a thing among them) follow the bank by themselves.

A new game of an existing kind is an entry and its scene. A new kind also needs a
`MinigameKind`, its `LEAN`, a `RoomPlan` variant and a planner in `PLANNERS`
(`src/rules/rooms.ts`): a `KeyPlanner` (a key from the bag) or an `OwnWordsPlanner` (its
own words, planned before any key, in `PLAN_ORDER`, which `episodePlans` checks). It must
end in a word she read: `plan.key` and `plan.fetches` (each a battle item). A game with
its own words is fetch-only. `tests/unit/plansGolden.*` pins the seeded draws. Debug
mode's pedestals come from `MINIGAMES` by themselves (`src/episode/debug.ts`). A new
kind's scene extends `HouseSideRoom` (`src/world/SideRoom.ts`), is listed in `src/main.ts`,
and publishes `room.<kind>` in `src/hookState.ts`. View: `?game=word_machine` (behind
door a); `?games=sentence` (the tests' default).

## A victory scene (`ENDINGS`, `content/house/endings.ts`)

One plays after battle 2 (`src/scenes/EndingScene.ts`; draw and script in
`src/rules/endings.ts`): `{ id, glyph, palette, look, props, stand, open, cheer, close,
fit?, villains }`.

- `look`: background brief (`room_end_<id>`), middle and floor clear. `props`:
  `{ id, look, glyph, x, y, w, h, front?, cut? }`, art `prop_end_<id>`, feet at `x, y`; a
  `front` prop draws over the cast, with `cut` only below that fraction of its height.
  A tall prop that must not hide faces stands behind (feet higher than theirs).
- `stand`: feet line `y`, span `left`–`right`, height `h`, optional `gap`.
- `open` (narrator), `cheer` (hero), `close` (someone else): `{ text, say? }`, no names,
  voiced per person (`end_<person>_<scene>_<key>`). The villain's `reformed.ending`
  comes between `open` and `cheer`, so replies must follow any of them.
- `fit`: `{ form, text }`, a dad form that says `text` in place of `close` when present
  (not as villain). `villains`: whose reformed lines suit it. A fitting scene is
  `FIT_WEIGHT` (3) times likelier; the last `VARIETY.rotations` scenes sit out while two
  are left.

Four lines plus `ENDING_PAUSE` come to ~18–24 s; the unit test keeps every cast shape
under 30 s. Then the three commands and `art:alts`. View: `?scene=victory&ending=<id>`.

## A fight style (`FIGHTS`, `content/battle/fights.ts`)

- **Data** (`FightSpec`): `{ id, kind, name, arena?, banner, tooStrong, win, lines,
  props? }`. `kind` picks the staging (`brawl race tug clash cookoff story`,
  `src/battle/stages/`), so another race or clash is data only (a race's `scenery`:
  absent the treasure cave, or `space`). `arena` is an `ARENAS` key, else the villain's.
  `banner` opens each part, `tooStrong` floats over the floored heroes, `win` is the last
  hit's banner. `lines` (`start`, `start2`, `retreat`, `finish`) are voiced per narrator
  (`nar_<narrator>_fight_<id>_<beat>`), else the brawl's. Props are `prop_fight_<id>`.
  Nothing shown or said holds a move or reading word (`tests/unit/fights.test.ts`).
- **Whose**: `fight` on the villain (default `brawl`); `fightNudge: { fight, chance }`
  makes a style likelier with that ally (chef Dada Jason: cook-off, 70%). Drawn once per
  episode (`src/rules/fights.ts`); `?fight=<id>` fixes it.
- **A new kind**: a `BaseStage` subclass in `src/battle/stages/`, registered in
  `index.ts`, with hooks per beat (contract: `stage.ts`). It never changes the beats,
  their timing or the move choice; its meter is the steered health
  (`host.heroFrac()`, `host.villainFrac()`) plus its swings, so the outcome stays fixed.

Then the three commands and `art:alts`. View: `?scene=battle&part=1&fight=<id>`.

## A story fight (`STORIES`, `content/battle/stories/`)

A turn-based showdown told as a story: a `FightSpec` with `kind: 'story'`, `story`,
`villain`, plus a `StoryScript` file listed in `stories/index.ts`; staging
(`src/battle/story/`) is shared. `storyFight` on the villain plays it at the rate set by
`STORY_FIGHT`; `?fight=<id>` forces it and its villain.

- **Spots**: `{ id, x, y, lift?, prop, propDx?, propDy? }`, `prop` one of the style's
  props. **Splashes**: a big move's burst (`fx_story_<id>`).
- **Beats** (`part1`, `part2`): `talk`, `fetched` (`all`, else the charged runes),
  `counter` (a pad; right word from `answers`, `'gift'` the gift word), `attack` (`fire
  rain tail guards`; a `dodge` to a spot or `dodgePads`), `support`, `ultimate` (part 1's
  end), `finale`. `big` gives a beat's move the stage.
- **Lines**: `{ who: 'villain' | 'dad' | 'ally', key, text, say? }`, `lines` before and
  `after`. Villain's are `story_<story>_<key>`; Dad's and the ally's per person
  (`story_<story>_<key>_<person>`), in voice groups `story_<story>` and
  `story_<story>_<person>` (`group.story`), loaded only for the people in it. Dad is the ally if
  the ally is a dad, else the waker joins; with one, he says both. No bank word, stems
  included (`tests/unit/storyFight.test.ts`): "stone", not ROCK.

Then the three commands and `art:alts`. View: `?fight=<id>` or
`?scene=battle&part=1&fight=<id>`.

## Bedrooms and side rooms (`content/house/house.ts`)

`BEDROOMS`: `{ id, look, palette, bed, door, waker, objects }`, design pixels
(1280×720) at the thing's feet, art `room_bedroom_<id>`. Only `BEDROOMS[0]` plays; a
second needs a choice in `BedroomScene`. A `BedroomObject` is `{ id, glyph, look, x, y,
w, h, reaction, sound }` (`wiggle pop alive bounce glow squeak`; `ReactionSound`), no
words; art `obj_<id>`, ids unique.

`SIDE_ROOMS`: `{ id, name, look, glyph, palette, spots, entry }` (three pedestals, the
entry), art `room_side_<id>`. All but `attic` (`COUNTER_ROOM`) are `FETCH_ROOMS`, two
drawn per episode for doors a and b (`HUB.doors`).

## Narrator lines (`content/voice/script.ts`)

Templates composed per narrator (`{hero}`, `{villain}`, `{item}`, `{word}`); no reading
word (unit tests). `{villain}` is the bare name; "Evil" only where the villain is
announced. A template keyed per hero, villain or move word (`HERO_LINES`,
`VILLAIN_LINES`, `MOVE_LINES`) needs its key in `content/voice/ids.ts`, built with
`heroKey` / `villainKey` / `moveKey`, never by hand.

**Variants**: a line heard often has several, said in turn across episodes via `recent`
(`src/episode/lineVariants.ts`, `lineVariantKeys`). Add `<key>_<n>` beside the key;
scenes say it through `narrate`, `say` or `variant(key)`; one compared by id uses
`isVariant`. A fighter says its least-said taunt, none more than twice an episode; a
big move is called out once a part.

## Art

Every id is in `docs/art.md`. A PNG at `public/art/<id>.png` is never overwritten by the
painter. `FLIP_TO_FACE` (`src/config.ts`) mirrors her to face her walk (keep it off with
placeholder cards: a mirrored card mirrors its name).
