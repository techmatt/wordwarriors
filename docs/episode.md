# Playing an episode

One episode as she plays it, with the knobs and dev URLs for each step. The side rooms'
games, solo mode and the fight styles: [`docs/episode-rooms.md`](episode-rooms.md).

Selection is walking: her hero walks to a thing and green picks it. All on-screen text is
upper case. Yellow (Tab) says the last instruction again, or hints.

## The steps

1. **Title:** green starts; a grown-up's **3 / blue** starts *Choice mode* (below).
2. **Bedroom.** A dad wakes her ("Wake up, wake up!"); green jumps her out of bed (after
   `WAKE_WAIT_MS`, 6 s, she wakes anyway). Half the time the other dad comes too. The news:
   the ally is here, the villain is coming. The room darkens under the villain's mood
   (`house` on the villain); the villain is heard, not seen (one of its first three
   `BEDROOM_TAUNTS`, `src/rules/story.ts`). The helper names the **quest**. No reading:
   toys do silly things on green. The door shows for the waker's entrance and again once
   the news is told ("Find the door!"); it sparkles after `DOOR_SPARKLE_MS` (12 s).
3. **Entry hall warm-up** (`src/scenes/EntryScene.ts`). `GRAB.objects` (9) pictures, no
   words. The helper asks for one ("Before we head out, let's grab the...") with a clue by
   the word's level, never the word nor a letter's name: levels 1-2 the sounds by unit
   (a digraph one sound) as a board fills in each letter; level 3 the sounds over blank
   boxes. Right: the word said, into her bag as her first battle item, the front door
   appears. Wrong: "That's the... CAT! We need the..." and the clue again; from miss
   `GRAB.helpAfter` (3) a slow sound-out, letters shown, never blended. Levels start at
   `GRAB.startLevel` and step with first tries, capped by `DIFFICULTY`. Words up to
   `GRAB.maxUnits` (4) units, never MOM or DAD. The word is said, so that episode no word
   heard in it is read (`grabSays`: CLOCK says LOCK; by sound, so KITE not KIT), and the
   other pictures are none of her reading words. A grab is exposure (store `grabs`).
4. **The hub (quest place).** The helper's place (else the house), laid out like the
   house. The helper (ally, or the waking dad) plays a story scene
   (`content/house/scenes.ts`) giving her a **gift word**: its prop pops up with the word,
   she stands at the scene's spot (a magic circle for a spell, else a fitting pickup) and
   presses green. It is her first battle move. Then the side doors pop out. **A door she
   cannot use yet is not there at all**: every door appears, with a reveal, as it opens.
5. **Side rooms**, each a minigame from the pool: [`docs/episode-rooms.md`](episode-rooms.md).
   A finished room hangs its prize on its door; with both done the front door appears.
6. **Battle part 1** runs itself (she can steer; green hops). Her bag's things fly out: a
   room's earlier words as one volley, each room's last word (and the warm-up's) alone
   (`src/rules/volleys.ts`). At a move choice the fight freezes, 2-3 word pads glow, the
   partner says which word; she walks onto it and presses green. A wrong pad fires nothing
   ("That wasn't ICE, that was HUG! Find ICE!") until she is right. The first choice is the
   gift word. A pad casts a teammate's move that answers to the word, else the word's own
   effect. The villain's ultimate ends it: "Too strong! Retreat!"
7. **Hub, part 2.** A secret door (the attic, or the place's secret room) holds the
   villain's counter sentence (`TIAMAT RUNS FROM THE BUS`, drawn each episode).
8. **Battle part 2:** the counter beats the ultimate (a swarm of its picture: "NOT THE
   BUS!"), everyone finishes it, and the villain turns good.
9. **Victory scene** (`content/house/endings.ts`; random, never last episode's): the
   reformed villain and everyone who took part do something nice; four voiced lines, about
   20 s. Then the recap on a podium: she on top, her ally (or the waking dad) left, the
   villain right; with an ally the waking dad cheers on the grass left (`podiumCheer`), the
   other dad, if he came, right (`podiumCheerRight`). At most nine cards (gift, move
   words, counter and each room's last word always stay; `recapWords`). Then a green dot;
   her green fades to **THE END** (`src/scenes/TheEndScene.ts`): the hub, her heroes
   bouncing, a fanfare, no voice. Only **Dad's 2** plays again (cue `PRESS 2 TO PLAY
   AGAIN`), so a new episode never starts without a grown-up.

A journey map shows before each battle, the trip home and the victory.

**Bags.** Key words (side rooms and attic) come from her **word bag**: the bank's pictured
words without replacement, kept with her progress, leaning to missed words and to vowels
and first sounds met least; a word leaves only when read right first time, and a dev
`?scene=` jump spends nothing. Frames repeat on purpose (sight words). The **move bag**
does the same for the pads' action words (`docs/content.md`).

**Parked:** Sound to Letter, Blend Path, Word to Picture, Spell the Spell, the alarm and the
camp retreat are in no episode; `?scene=` opens each.

## Who is in an episode

Drawn fresh each time (`src/rules/cast.ts`):

- **Active cast:** `ACTIVE_CAST` in `src/config.ts`, as persons. Allies: Dada Matt, Dada
  Jason, Scar, Ellie, Seraphina, Elsa, Anna, Jasmine, Ozymandias, Moriarty, Bluerilla
  (`rilla`), Meryl. Villains: Jörmungandr, Smaug, Bavmorda, Tiamat, Elsa, Ozymandias,
  Moriarty. A dad comes in all his forms; nobody is her own villain. Anyone else plays by
  `?ally=` / `?villain=`; adding a name switches them on.
- **Villain:** equally likely, her last four sitting out, never last episode's.
- **Ally:** an active ally who is not the villain.
- **Dads:** the waker (narrator with no ally) is Dada Matt 60%, Dada Jason 40%
  (`CAST_ODDS`, no memory); half the time the other comes too. A dad already ally or
  villain takes no other role; if both are busy the ally dad wakes her.
- **Forms**, one per dad per episode: Dada Matt builder / weightlifter / cyberdecker /
  spell-blade; Dada Jason chef / warrior / warlock. Each a whole character in the dad's own
  voice (`person` in the roster).
- **Quest:** the helper's place (`content/house/quests.ts`), else home.
- **Outfit:** some allies dress her to match: `OUTFITS`, `content/battle/outfits.ts`.

**`EPISODE_DEFAULTS`** (`src/config.ts`): `randomCast: true` draws as above; `false` plays
the fixed default (Julia, Ellie, Tiamat, Dada Matt the builder waking), which
`?cast=default` also plays and the tests use. `pickScreens: true` brings back the parked
pick screens. Matt dictates the values; a prompt applies them.

### Choice mode

A Julia-centred episode a grown-up turns on (also how Matt tries a character); the game
never offers it and it is never a reward. **3 / blue on the title** (`3: CHOOSE!` top
right), or in the bedroom, where blue is hers, **Dad's 2** until she leaves (`PRESS 2 TO
CHOOSE`, live under dad lock): that episode is dropped and its draws leave her rotations
(`forgetCast`, `src/episode/draws.ts`). Two pick steps (`episode.choice`,
`src/scenes/PickScene.ts`): cards of every active ally, then every active villain but her
ally (`choiceAllies`, `choiceVillains`). The card in reach says its name in that
character's voice; green chooses, red goes back, yellow repeats. A dad's card is the
person; his form is drawn as usual. Then a normal episode. Her play counts; her picks stay out of
`recent.ally` / `recent.villain`; what the episode drew itself is remembered.

### Cast URLs

These hold for every episode that session.

| URL | Does |
| --- | --- |
| `?seed=7` | Seeds the draws (`seedRands`, `src/episode/draws.ts`): `castRand` (cast, quest, variants, fight style), `planRand` (rooms, games, words, victory scene). Only a load's first episode replays exactly; in-scene randomness is unseeded; without it every draw is `Math.random` |
| `?cast=default` | The fixed default episode (`cast=random` draws even with `randomCast: false`) |
| `?hero=`, `?ally=dada_matt_lifter`, `?villain=dada_jason_warlock` | A role by roster id; a dad's bare id is his own form; `ally=none` |
| `?form=cyber,warrior` | Dads' forms: `builder` `lifter` `cyber` `blade`; `chef` `warrior` `warlock` |
| `?primary=dada_jason` / `none`, `?secondary=1` / `0` | Who wakes her; whether the other dad comes |
| `?place=forest_gym` / `home` | The quest place |
| `?words=new`, `?words=tree,ham` | Every word draw leans to `NEW_WORDS` or those named (`favourWords`, `src/rules/bank.ts`) |
| `?fight=sky_race` | The fight style (`content/battle/fights.ts` ids); `smaug_story` forces Evil Smaug's story fight |

## Grown-up controls

**Grown-ups page:** F9, or hold LB + RB 2 s on the title. There, F8 twice erases all
progress.

### Dad lock

Backquote / tilde toggles it anywhere (`src/input/dadLock.ts`); a 🔒 badge, no words,
bottom-left. She can walk, but no button or key does anything (F-keys still work) and
timed re-prompts hold; off again, play carries on.

### Dad buttons

Keyboard **1** = no, **2** = yes (`openDadButtons`, `src/input/dadButtons.ts`). Always
live, dad lock included; nothing where no game asks. A game that asks shows `1 ✗ 2 ✓`
bottom-right (no DAD on it: a bank word). At THE END 2 is the only way on; 1 does nothing.

### Minigame debug mode

Key **0** (or numpad 0) toggles it in a game room (hub, warm-up, side rooms, attic), in real play, dad
lock or not. The Debug scene (`src/scenes/DebugRoom.ts`): the room's background, the door
out open, one pedestal per pool game (each sentence frame one). Green plays it on a fresh plan; finishing returns with
a ✔ (0 or F2 in the game returns without). The open door, or F2, leaves debug and moves on.
0 in the debug room turns it off and restarts the room. Nothing played counts
(`src/episode/debug.ts`): the store is held (`ProgressStore.hold`) and the episode and draws'
memory restored. Leaving by the door is not sandboxed.

### Free play

Wherever she can move and no answer is open, green jumps and blue (3), red (Esc) and
yellow (Tab) cast; a button that means something there keeps its meaning. Pure play; dad
lock silences it; knobs `FREE_PLAY`. Blue is a number key because five Shift presses open
Sticky Keys. `src/fx/freePlay.ts` (`docs/systems.md`, *Free play*).

## No letter names

No clue or hint says a letter's name (Matt: names beside sounds confused her). The
warm-up's clues and the Shape-Shifter's hints and misses say the plain sound (`soundLines`,
`src/rules/soundOut.ts`). A long vowel's sound (`letter_long_e_sound`) is a sound, not a
name. X-RAY's `x_name` ("ecks") is the letter's name: the one exception, live because X-RAY
is the only X word (Matt, item 182; `docs/rulings.md`).

## Dev keys and URLs

**F2** skips the step; **F4** answers right (Dad's yes where he is asked; the Bridge: across
in one go, then his yes or the right picture). A `?scene=` step
gets the episode it would have had by then (gift given, rooms done, bag filled).

| URL | Opens |
| --- | --- |
| `?scene=bedroom` | The wake-up |
| `?scene=house` / `&part=2` | The hub; part 2 has the attic door |
| `?scene=room&slot=a` (`b`, `counter`) | A side room; `counter` is the attic |
| `...&game=word_machine` | `game=` puts that game behind door a, in any URL |
| `...&room=charge` | `room=charge` / `bridge` / `shifter` / `rhyme` forces that room behind door a (b when `game=` holds a), in any URL |
| `...&solo=1` | Solo mode for the session |
| `?scene=battle&part=1` (or `2`) | A battle; `&charged=m,s,a` fires those runes (default: the plan's Charge room's) |
| `?scene=victory&read=cat,sun,julia` | Victory scene, then the recap of those words |
| `?scene=victory&ending=boat` | That victory scene; F2 skips to the recap |
| `?scene=theend` | THE END |
| `?scene=pick`, `?scene=parent` | The parked hero pick; the grown-ups page |
| `?scene=sound` / `blend` / `picture` / `spell` / `alarm` / `retreat` | Parked steps |

Extras: `fetched=net,fan` (battle items; the default); `warmup=1` (the warm-up's word
fetched too); `nojourney`; `difficulty=2`; `grab=king` (the warm-up's word);
`sentence=no_match_for_the:octopus` (frame and key word: the attic's for a counter frame,
door a's with `game=sentence:<frame>`); `bridge=mom,dad` (door a's bridge words, with
`room=bridge`); `prep=sound,blend`; `games=sentence` / `all` (the pool; tests default to
`sentence`). Test-only (`voice=instant`, `battle=short`, `hooks=1`, `qa=1`): README,
*Speed, GPU and workers*, *The bug-hunt checker*, *Operational facts*.

## Difficulty and variety

Matt's ruling: **no automatic difficulty**. Every help ramp records her level (`grabLevels`,
`bridgeLevels`, `shifterLevels`, `rhymeLevels`, frames' and words' first tries; Charge has
none) for the grown-ups page, but the game gives at most **`DIFFICULTY`** (`src/config.ts`):

- **1, base (default):** every ramp at its most helpful start; solid frames still play the
  listening pass; firm words' distractors start with other letters.
- **2:** recorded levels up to 2; solid frames skip listening; firm words get a
  sound-alike distractor (CAT beside HAT).
- **3:** the ramps go all the way.

Changing it changes nothing saved; `?difficulty=` sets it per session. A new ramp goes
through `helpLevel` or `rampsAdvance` (`src/rules/difficulty.ts`) and is listed here; its
unit test uses `withDifficulty` (`tests/unit/difficulty.ts`); browser specs pass
`?difficulty=` (`bridge`, `entry`, `sentenceread`, `soundout`, `smoke`).

**Words by length, not level.** Every familiar bank word plays from the first episode.
Recognition roles (key words, counter, pads, gift, fetches, recap) take any word; sound-out
games keep to short words in sound units: `GRAB.maxUnits`, `BRIDGE.maxUnits`,
`WORD_MACHINE.maxUnits`, `CHARGE.units`, `SHIFT_WORDS` (CVC), the rhyme room's three-unit
family words.

### Variety across episodes

Each rotation keeps recent picks in the store (`recent`, `src/rules/recent.ts`; counts in
`VARIETY`) and avoids them while two choices are left: the ally, each dad's form, the
villain (last 4), quest line, hub scene and line variants (so a line of three goes round),
the victory scene, the side rooms, the games, the warm-up's last 3 words. Games rotate
strictly: no side room plays a game either played last episode while another fits (fetch
frames count as one), and the attic never repeats last episode's frame (`repeatsLast`,
`recent.last_games`). So door a alternates Charge and the Bridge, and the Shape-Shifter is
never behind door b twice running. A game of her last two episodes weighs
`VARIETY.gameWeight`; her latest right-first-time reads (`VARIETY.words`) weigh
`VARIETY.wordWeight` in every word draw (a missed word keeps full weight). The cast is
remembered as she walks into the bedroom, rooms and games once the plan is made; a fixed
cast, an override, a `?scene=` jump or URL-forced games are not.
