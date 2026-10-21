# Playing an episode

A walk through one episode as she plays it, with the knobs and dev URLs for each step
(moved out of the README in item 072; the README keeps running, testing, storage and
operations).


Selection is walking everywhere: her hero walks to a thing and green picks it. All
on-screen text is upper case. Yellow (Tab) says the last instruction again, or hints.

1. Title: press green. (The hero / friend / bad-guy picks are off; every episode's
   cast is drawn fresh, below, "Who is in an episode".)
2. **Bedroom.** She is asleep in bed; a dad comes in (Dada Matt 60% of the time, Dada
   Jason 40%, each in one of his forms): "Wake up, wake up!" and she
   presses green to jump out of bed (after 6 seconds she wakes anyway). Half the time
   the other dad comes in too. Then: "Good
   news, Julia! Ellie is here to play! Bad news, Evil Tiamat is coming, and she wants to
   be the queen of the whole house!" The room darkens under the villain's mood (purple
   smoke, dragon scales, a royal banner), and the villain is heard from afar, not seen:
   one of its first three taunts (`BEDROOM_TAUNTS`, `src/rules/story.ts`). Then the helper says where they will train,
   the **quest** ("To get ready, we have to play in my bubble castle up in the clouds!").
   No reading: every toy does something silly on green. The door
   is there only for the waker's entrance and again once the news is told ("Find the
   door!"), when it pops out and glows; it sparkles if she has not gone through it 12
   seconds after the news (`DOOR_SPARKLE_MS`).
3. **The entry hall: the home warm-up** (item 033, `src/scenes/EntryScene.ts`). The
   bedroom door opens on the front hall, where nine pictures stand on the floor, with no
   words on them (item 059: with CAT and VAN printed she matched letters instead of
   sounding the word out). The helper asks "Before we head out, let's grab the..."
   and gives a phonics clue by the word's **level** on a ramp, never saying the word
   (amendment 1549: a phonics task, not a listening one): 1 each letter's name, then
   its sound ("Vee, vvv; Ay, a; En, nnn"; a digraph's two names, then its one sound);
   2 the sounds alone, by sound unit; 3 the sounds over blank boxes. A board over the
   hall fills in each letter as it is named or sounded (levels 1–2) and lights each in
   turn. She walks to the thing and presses green: right, a burst, the word (its first
   saying, the confirmation), and into her bag as a battle item (her first), then the
   front door appears. Wrong: "That's the... CAT! We need the..." and the clue again at
   the same level; from the third miss (`GRAB.helpAfter`) the clue is the word sounded
   out slowly by its units with the letters on the board, one sound at a time, never
   blended. Yellow repeats the clue.
   A new word starts at level 1 (**`GRAB.startLevel` in `src/config.ts`**); right first
   time moves that word up a level, a miss on its first try moves it down. The levels
   are recorded, but at base difficulty the hall gives every word level 1 (item 067,
   *Difficulty and variety* below). The levels reached and grabs are on the grown-ups
   page ("Warm-up levels"). Only short words are asked for (`GRAB.maxUnits`, 4 sound units). The word is said, so it never
   becomes a room's key word, the counter, a word machine word or a move pad that
   episode, and the hall's other eight pictures are none of the words she will read. A
   grab is exposure, not a read (ProgressStore `grabs`, never `words` or the word bag).
   About 20–30 seconds; no journey stop of its own.
4. **The quest place (the hub).** The door leads to the helper's quest place (the
   forest gym, the bubble castle; every character has one, and the house itself is the
   fallback for a character added without one, or `?place=home`) laid
   out like the house: the helper by a magic circle, two side doors, later a secret
   door, and a way out (the house's front door, a glowing portal anywhere else).
   The helper (the ally, or the dad who woke her) plays a short story scene that gives
   her a **gift word** (item 037, `content/house/scenes.ts`, one of 2–3 per helper: a
   spell, a dish chef Dada Jason cooks up, a gadget builder Dada Matt builds, a toy).
   Its prop pops up with the word on it, the last line trails off into the word, she
   stands on the glowing spot, presses green, and the word flies into her. That word
   is her first battle move. Then two side doors pop out of the wall. **A door she
   cannot use yet is not there at all** (her first play: told to find the two doors,
   she walked to the shut front door), so every door and exit appears, with a little
   reveal, at the moment it opens.
5. **Side rooms** (the place's own: the boulder yard and the climbing rocks of the
   forest gym), each with a minigame drawn from a weighted pool (`src/rules/minigames.ts`:
   the sentence game in its frames, or the word machine, item 026: a picture and a rime
   like AT on the machine, letter tiles on the floor that say their sounds, green slots
   one in and the machine says the two parts apart; the right one makes the picture's
   word, said only then, and into her bag it goes; a wrong one makes a silly word like ZAT;
   several words of one family, then another; or Charge the Spell, item 053, or the
   Stretchy Bridge, item 054, below). The sentence game is one sentence each, on a banner, key word last
   (`WE CAN USE THE NET`, `JULIA NEEDS THE CAT`). Pass 1 is read to her karaoke-style and stops at the key
   word, which pulses in silence (skipped once that frame is solid). Pass 2 is hers:
   each green lights the next word and says it, and yellow says the lit word. At the key
   word three things wake up on pedestals (yellow now sounds the key word one sound at a
   time, SH of SHIP as one, never blended, and never says the word itself); she
   walks to the one the key word names and presses green. Right: the whole sentence
   is read back and the thing flies into her bag (top left). Wrong: a funny retry.
   Each finished room hangs its prize on its door; with both done the front door appears.
6. **Battle part 1** runs by itself (she can steer her hero with the stick; green
   hops). The fetched things pop out of her bag and are used. At a move choice the
   fight freezes, 2–3 word pads glow on the arena floor, the partner says which word;
   she walks her hero onto that pad and presses green. A wrong pad fires nothing: the
   fight stays frozen and the partner says "That wasn't ICE, that was HUG! Find ICE!"
   until she picks the right one, which fires the supercharged move. The first choice
   is the gift word. Reading a pad casts its word: a teammate's own move when one
   answers to it, else the word's own effect, fired by her hero. It ends with the villain's ultimate: "Too strong! Retreat!", and the
   heroes pick themselves up and run for home.
7. **The quest place, part 2.** Back in the hub a secret door pops out: the attic (or the
   place's secret room: the cave behind the waterfall), with the
   villain's counter sentence (`TIAMAT RUNS FROM THE BUS`: the frame and the word
   are drawn each episode). Then the front door again.
8. **Battle part 2**: the counter beats the ultimate (a swarm of its picture: "NOT THE
   BUS!"; the villain's named item, Evil Tiamat's Magic Hat, when its own word comes
   up), everyone finishes it, and the villain turns good.
9. **The victory scene** (item 027): the villain, good again, and everyone who took part
   (Julia, the ally, the dads there) do something nice together: dessert round the table,
   a picnic, the top of a mountain, a pillow fort, a boat ride, stargazing, a campfire or
   a snow day, drawn at random and never last episode's. Four voiced lines in bubbles,
   about 20 seconds: the host opens, the villain says its own line, Julia cheers, a dad
   closes (chef Dada Jason baked the cake). Then the victory replays the words she read.
   Only **Dad's 2** plays again (item 082): her buttons, the stick and the keys do nothing
   there, so a new episode never starts without a grown-up; once the recap is said a small
   `DAD: PRESS 2 TO PLAY AGAIN` cue lights in the bottom-right corner (dad lock or not).

Key words never repeat until her **word bag** has gone round: every key word (both side
rooms and the attic) is drawn without replacement from the word bank's pictured words
(item 037; every level in play since item 067 removed the level gate), kept
with her progress, leaning toward the words she has missed and the vowels and first
sounds she has met least (a word leaves the bag only
when she reads it right first time, so a missed word comes round again soon, and a dev
`?scene=` jump spends nothing). Frames repeat on purpose so their little words become sight words. Details in
`docs/content.md`, "Key words and the word bag"; the grown-ups page (F9) shows the bag.

The battle's move words come round the same way (item 018): every action word in the bank
(item 037), and a **move bag** that decides which ones she is asked to find,
so fight after fight she meets new ones (`docs/content.md`, "Move words and the move
bag"). A super shows a fan of its word's picture; the beaten villain, good again, says
two lines of its own (`reformed` in the roster: the first as the battle ends, the second
in the victory scene); the victory recap pictures every word.

A journey map shows before each battle, the trip home after the retreat, and the
victory. With the test harness answering instantly a v0.2 episode takes about 4.6
minutes (measured 2026-10-18); a child's pace has not been timed.

The four v0.1 prep games (Sound to Letter, Blend Path, Word to Picture, Spell the
Spell), the alarm and the retreat camp are **parked**: no episode includes them, but
`?scene=` still opens each one.

**Who is in an episode** (item 025) is drawn fresh each time (`src/rules/cast.ts`):

- **The active cast** (item 028/030): `ACTIVE_CAST` in `src/config.ts` lists who the
  draw picks from, as persons: allies Dada Matt, Dada Jason, Scar and Ellie; villains
  Jörmungandr, Smaug, Bavmorda and Tiamat. A dad listed comes in all his forms.
  Everybody else stays defined and playable by `?ally=` / `?villain=`; adding a name to
  the list switches that character on.
- **The villain**: one of the active villains, each equally likely; her last two sit
  out (with four active, always two left to choose from), never last episode's.
- **The ally**: one of the active allies who is not the villain; a dad in one of his
  forms.
- **The dads**: the one who wakes her (and narrates when there is no ally) is Dada Matt
  60% of the time and Dada Jason 40% (`CAST_ODDS` in `src/config.ts`); half the time the
  other dad comes in too. A dad already playing the ally or the villain takes no other
  role; if both are busy the ally dad wakes her.
- **The dads' forms**, one each per episode: Dada Matt the builder, the weightlifter,
  the cyberdecker or the spell-blade; Dada Jason the chef, the warrior or the warlock.
  Each form is a whole character (its own moves, villain version, counter and house
  mood) speaking in the dad's own voice: `person` in `content/battle/roster.ts`.
- **The quest**: the helper's place to train (`content/house/quests.ts`); anybody
  without one trains at home, in the house.

**`EPISODE_DEFAULTS`** in `src/config.ts`: `randomCast: true` draws as above;
`randomCast: false` plays the fixed default episode (`hero: 'julia'`, `ally: 'ellie'`,
`villain: 'tiamat'`, Dada Matt the builder wakes her), which `?cast=default` also plays
and the tests use. `pickScreens: true` brings the parked pick screens back: they choose
the hero, ally and villain (as persons: a dad picked there is in his own form), and the
dads' roles, forms and the quest are drawn around them. Matt dictates the values; a
prompt applies them.

The cast also picks a **scenario** (item 016): with Dada Jason the chef as ally, Julia
is chef Julia (`char_julia_chef`, her face card `face_julia_chef`) from the moment she
gets out of bed; with warrior Dada Jason she is a little knight (`char_julia_knight`,
item 025). Which outfit goes with which cast is `FORMS` in `content/battle/forms.ts`
(data; see `docs/content.md`, "A form"). `?ally=dada_jason` tries the chef episode.

Any cast can be tried from the URL (and stays for every episode that session):

| URL | Does |
| --- | --- |
| `?seed=7` | The draw is repeatable: the same seed (and the same progress) plays the same episodes |
| `?cast=default` | The fixed default episode (`cast=random` draws even with `randomCast: false`) |
| `?ally=dada_matt_lifter`, `?villain=dada_jason_warlock` | A role by roster id; a dad's id alone (`dada_jason`) is his own form (chef); `ally=none` |
| `?form=cyber,warrior` | The dads' forms by name: `builder` `lifter` `cyber` `blade`; `chef` `warrior` `warlock` |
| `?primary=dada_jason` / `none`, `?secondary=1` / `0` | Who wakes her; whether the other dad comes in |
| `?place=forest_gym` / `home` | The quest place, whoever the helper is (to look at one) |
| `?fight=sky_race` | The showdown's fight style, whoever the villain is: `brawl` `sky_race` `sea_tug` `spell_clash` `cook_off` |

Not every showdown is a brawl (item 031). Each villain has a **fight style**
(`fight` in the roster; `content/battle/fights.ts`): Evil Smaug races the heroes
through his treasure cave (`sky_race`), Evil Jörmungandr pulls a rope against them
over the sea (`sea_tug`), Evil Bavmorda meets their magic beam for beam
(`spell_clash`, warlock Dada Jason's too), and Evil Tiamat keeps her giant free-for-all
(`brawl`, also every villain without a style). Evil chef Dada Jason's own style is the
**cook-off**, and with chef Dada Jason as the ally a cook-off is likely (70%,
`fightNudge`), whoever the villain is. The episode draws it once, at the first
battle (`episode.fight`, `src/rules/fights.ts`), so both battles are the same contest.
Every style keeps the episode's shape (part 1's ultimate wins the round, part 2's
counter turns it), the same beats, timing and move choices; only the staging changes
(`src/battle/stages/`), and its bars are the steered health shown as a race lead, a
rope's knot, a clash point or the judges' scores.

A giant villain (roster `size` 2 or more: Evil Tiamat) is staged as one: she holds her
own half of the arena instead of walking over the heroes (`stomp` in
`src/battle/movement.ts`), steps to the front for her ultimate so growing fills the
screen floor to top, and her ultimate also sweeps the whole arena (`giantSweep`).
Ellie fights with bubbles (item 016): giant bubbles (BIG), a
Bubble Trap that floats an enemy away (POP), a bubble shield and the Mega Bubble Storm,
all drawn with the generated `fx_bubble` texture, plus one sword move, Spinny Swords
(ZIP), whose `prop_silver_sword` the `orbit` kind draws round her, so they show with
whatever Ellie image is in the game.

Grown-ups page (progress per sound and word): **F9**, or hold **LB + RB** for two
seconds on the title screen. On that page, **F8** twice erases all progress.

**Dad lock** (item 038): the **backquote / tilde** key (top-left, below Esc) toggles it,
anywhere. While it is on, a 🔒 DAD LOCK badge sits in the bottom-left corner: Julia
can still walk, but no button or key does anything (no green, yellow, red or Start, no
letters), and the rooms' and the battle's timed re-prompts hold off. Lines already
playing finish; the battle's move choice keeps waiting. Press it again and play
carries on exactly where it was. The F-keys still work (F9 opens and closes the
grown-ups page; red and Esc do not while locked). `src/input/dadLock.ts`.

**Dad buttons** (item 053): keyboard **1** = no, **2** = yes. They are always live, dad
lock included, and do nothing where no game is asking; a game that asks shows a small
`DAD 1 ✗ 2 ✓` cue in the bottom-right corner (lit while a question is waiting).
`src/input/dadButtons.ts` (`openDadButtons`), for 054 and later games too. The victory
recap opens them as well (item 082), with its own cue (`DAD: PRESS 2 TO PLAY AGAIN`): 2 is the
only way on to the next episode, and 1 does nothing there.

**Charge the Spell** (item 053, `src/scenes/ChargeRoom.ts`; one short word a visit since
item 058; no presses per rune since item 059): a side room where she says letter SOUNDS
aloud after the helper, then reads the word they spell. The visit's word (3-4 sound units,
every one a rune, so no Q, X or CK) shows at the top from the start, a slot per unit. She
walks in and it starts by itself ("Say each sound after me!"): each rune lights on the
altar in turn (an upper-case letter; its slot pulses), the helper shows the sound's
gesture (Jolly Phonics style: a hissing snake 🐍 for S, a tummy rub for M;
`content/phonics/runes.ts`) and says the sound, then a quiet beat (`CHARGE.sayBackMs`,
1.2 s; the dad lock holds it) for her to say it back, and the rune fires up into its slot.
Nothing is pressed per rune: Matt watched the per-rune presses frustrate her (item 059).
With every rune charged the word lights up and she reads it aloud ("Now read the whole
spell!"), the room's one press, Dad's: **2** says it; **1**, or 10 s with nothing
(`readTimeoutMs`), is "Let's sound it out together!", the word sounded out once and then
said; either way its picture shows and goes into her bag as a battle item. Dad may press
as soon as the word lights. The read records the word and its sounds (right with his 2). A round with Dad answering at once is 20-25 s of
game time: about 3.2 s a rune, 17 s to the read for three runes, 21 s for four, then about
5 s for the word, its picture and the bag (measured on the scene clock, item 059;
`room.charge.readAtMs` and `elapsedMs` in the hooks; `tests/charge.spec.ts` holds it
under 22 s to the read, 32 s in all with his 1). The word is drawn like any room's (`drawWords`, from the familiar pictured words),
leaning to shaky sounds, every sound in play from the start (item 067: the old sound
tiers are gone), 3-4 sound units (`CHARGE.units`; `src/rules/charge.ts`, `CHARGE` in
`src/config.ts`). Each charged rune is still a move her hero fires in the next battle, at 1.3× power
(`episode.charged`, BattleScene `useCharged`). For the beta, `FORCE_PHONICS_ROOM` (on)
puts it or the Stretchy Bridge behind door a of every episode.

**The Stretchy Bridge** (item 054, `src/scenes/BridgeRoom.ts`): a side room where she
blends a whole word. A gap crosses the room (lava in the house, a river or a chasm at a
quest place: `GAP_BY_PLACE` in `content/house/house.ts`), and the word's letters are
stepping stones over it (SH is one stone). She pushes the stick to slide across, slower
than she walks; while she is on a stone its sound is **held**, so a slow slide is
"mmm-aaa-t". A vowel or a sound you can stretch (M S F L N R V Z SH TH) is held for
1.3 s, then goes quiet and sounds again after 2 s if she stays (`BRIDGE.resoundMs`), or at
once when she steps on again; a stop sound plays once each landing, never with an "uh".
The room fetches its stones' sounds and words as it opens, so the first slide is not silent. On the far bank are 2–3
pictures that share the word's start and differ later (MAP, MAT, MAN; else MAP, MOP, MUG;
only where the bank has nothing better, the same rime). She walks to the one she read and
presses green; only then is the word said, and its picture goes into her bag (every word
read there is a battle item). Its words are any short pictured word (`BRIDGE.maxUnits`,
4 sound units; item 067), the easier first in a visit. Help can fade per word
(`bridgeLevels` in the progress, the level reached is the number in a word's dot on page 2
of the grown-ups page; at base difficulty every word gets level 1): level 1 the stones sound
themselves and the pictures show from the start; level 2 silent stones, and Dad's **2** is
a hint (the stones sound in turn, then as she slides); level 3 silent stones, on the far
bank she says the whole word aloud, Dad presses **2** and the pictures appear, his **1**
(or nothing for 12 s) replays the slide with sounds, and after two replays the pictures
come anyway. Right first time with no help is one level less help next time; a hint, a
replay or a wrong picture one more. A wrong picture is never punished but costs time: the
game sounds out what she picked, its letters over its picture ("You picked... M, A, P"),
then where the bridge differs ("But the bridge ends with... T", that stone flashing), and
she slides again. Three words a visit: CVC words starting with a sound you can hold
first, stop-sound CVC words once those come along, then the bank's blends and digraphs
(`src/rules/bridge.ts`, `BRIDGE` in `src/config.ts`).

**Held sounds and Matt's recordings:** the bridge cuts whatever clip is in place
(`src/audio/holdSound.ts`, by 10 ms frames of loudness and zero crossings): a hiss up to
the vowel after it (the S of the "Suh" placeholder), a hum up to where the schwa comes in
(the M of "Mmm-uh", the V of "Vuh"), a vowel's steady part, a stop's burst (T, K) or a
voiced stop's first instant (B, D), and X's K and final S around its vowel. The held part
is stretched by overlap-add into one smooth sound 1.3 s long (`HELD_MS`), then quiet;
standing on, it sounds again after `BRIDGE.resoundMs` (item 058: looping the 70-300 ms
steady part every clip has was a fast stutter of "m"s). A recording put in place with `voice:import` or `voice:clip` is cut by its own
shape the same way, so no code changes: record a sound you can hold as a steady sound of
half a second or more (a clean "mmmm", "ssss", "aaa") and a stop as a crisp sound with no
vowel after it ("t", not "tuh"). A recording with no schwa plays as it is, held whole or once.
The cut counts zero crossings per second, not per sample (item 057): the browser decodes
at its AudioContext's rate, usually 48 kHz, and per sample a hiss there counts half what
it does at 24 kHz, so a recorded CH played 0.06 s of its 0.29 s. At 24 kHz every cut is
as 054 made it.

## Dev keys and URLs

Dev keys: **F2** skip the current step, **F4** answer correctly (in Charge the Spell, Dad's yes; on the Stretchy Bridge, across in one go, then Dad's yes or the right picture). Jump straight into a
step with a URL, e.g. `http://localhost:5174/?scene=battle&part=2&hero=elsa&ally=anna&villain=smaug`.
Later steps get the episode they would have had by then (gift word given, earlier rooms
done, items in the bag):

| URL | Opens |
| --- | --- |
| `?scene=bedroom` | The wake-up |
| `?scene=house` / `?scene=house&part=2` | The hub; part 2 has the attic door |
| `?scene=room&slot=a` (or `b`, `counter`) | A side room; `counter` is the attic |
| `?scene=room&slot=a&game=word_machine` | The word machine (`game=` puts that game behind door a, in any URL) |
| `?scene=room&slot=a&room=charge` | Charge the Spell (`room=charge` forces it behind door a, or door b when `game=` holds door a, in any URL) |
| `?scene=room&slot=a&room=bridge` | The Stretchy Bridge (`room=bridge`, the same way) |
| `?scene=battle&part=1&charged=m,s,a` | A battle that fires those charged runes (default: the plan's charge room's, in part 1) |
| `?scene=battle&part=1` (or `2`) | A battle |
| `?scene=victory&read=cat,sun,julia` | The victory scene, then the victory recapping those words |
| `?scene=victory&ending=boat` | That victory scene (`content/house/endings.ts` ids); F2 skips to the recap |
| `?scene=pick`, `?scene=parent` | A pick screen; the grown-ups page |
| `?scene=sound` / `blend` / `picture` / `spell` / `alarm` / `retreat` | Parked v0.1 steps |

Extras: the cast (above: `seed=`, `cast=default`, `hero=`, `ally=`, `villain=`,
`form=`, `primary=`, `secondary=`, `place=`, `fight=`), `fetched=net,fan` (the
battle items; that is the default), `nojourney` (skip the map), `difficulty=2` (the
difficulty knob for this session; below).

## Difficulty and variety (item 067)

Matt's ruling: **no automatic difficulty**. Every help ramp still records her level
(the warm-up's `grabLevels`, the bridge's `bridgeLevels`, and frames' and words' first
tries; Charge the Spell has no ramp since item 078), and the grown-ups page shows the
level reached, but the game gives at most **`DIFFICULTY`** (`src/config.ts`, shown in the
grown-ups page's title line):

- **1, base (the default):** every ramp gives its start level (`startLevel`, the most
  help); a solid sentence frame still plays its listening pass; a firm word's
  distractors (the warm-up's pictures, the move pads, the key word's choices) still
  start with other letters.
- **2:** her recorded levels apply up to 2; solid frames skip the listening pass; firm
  words get a sound-alike distractor (CAT beside HAT).
- **3:** the ramps go all the way, as before item 067.

Raising it changes nothing saved: her recorded levels take effect at once, and lowering
it holds them again. `?difficulty=` sets it for one session (the browser tests use it to
reach levels 2 and 3).

This is the list: a new ramp that steps up with success goes through `helpLevel` or
`rampsAdvance` (`src/rules/difficulty.ts`) and is added here. Tests: the knob in
`tests/unit/variety.test.ts`; each ramp in its game's unit test (`grab`, `bridge`,
`charge`, `sentences`, `bank`, each with `withDifficulty` from `tests/unit/difficulty.ts`);
in the browser `?difficulty=` in `bridge.spec.ts`, `entry.spec.ts` and `smoke.spec.ts`.

**Words by length, not level.** Every familiar bank word is in play from the first
episode (no level gate; OCTOPUS and UMBRELLA included). The recognition roles (key
words, the counter, move pads, the gift, fetches, the recap) take any word. The games
where she sounds a word out unit by unit keep to short words, in sound units (SH is one):
`GRAB.maxUnits` (the warm-up), `BRIDGE.maxUnits` (the bridge's words; its far-bank
pictures may be longer), `WORD_MACHINE.maxUnits`, `CHARGE.units`.

**Variety across episodes.** Each rotation keeps its recent picks in the progress store
(`recent`, `src/rules/recent.ts`; how many: `VARIETY` in `src/config.ts`) and avoids
them while two choices are left: the ally and each dad's form (`src/rules/cast.ts`), the
villain (`recent.villain`, the last 4 kept; the draw avoids as many
as still leave two, so the last 2 with four active), the quest line, hub scene and each line variant
(`src/rules/story.ts`), the victory scene, the side rooms (the one left out last episode
comes back), the games (last episodes' weigh `VARIETY.gameWeight`) and the phonics door
(Charge vs Bridge), and the warm-up's last 3 words. Her latest right-first-time reads
(`VARIETY.words`) weigh `VARIETY.wordWeight` in every word draw, so last episode's words
rarely come straight back; a missed word keeps its full weight. The bags (key words,
moves, pads) still draw without replacement. Coverage weighting (vowels, first sounds)
is unchanged. The cast and its variants are remembered as she walks into the bedroom
(from the title, or the last parked pick screen), the rooms and games once the house plan
is made after that; a fixed cast (`?cast=default`), an override, a dev `?scene=` jump or
games the URL forces (`?room=`, `?game=`, `?games=`) are not remembered. The fight style follows the villain
(and chef Dada Jason's nudge), so it rotates with the villain. Which dad wakes her has no
memory: it is the 60/40 draw (`CAST_ODDS`) every episode.
