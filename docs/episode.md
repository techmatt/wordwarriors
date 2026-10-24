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
   (amendment 1549: a phonics task, not a listening one): 1 and 2 the sounds alone, by
   sound unit ("vvv, a, nnn"; a digraph one sound), never a letter's name (item 137:
   names and sounds together confused her); 3 the sounds over blank boxes. A board over the
   hall fills in each letter as it is sounded (levels 1–2) and lights each in
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
   page ("Warm-up levels"). Only short words are asked for (`GRAB.maxUnits`, 4 sound units), never MOM or DAD
   (hunt 10, M45: the grab goes to her bag, and neither is ever a battle item). The word is said, so it never
   becomes a room's key word, the counter, a word machine word or a move pad that
   episode, nor does a bank word heard whole in it as it plus one sound (`grabSays`, hunt 10,
   M57: CLOCK says LOCK, BRUSH RUSH, TENT TEN; by sound, so KITE says no KIT), and the hall's
   other eight pictures are none of the words she will read. A
   grab is exposure, not a read (ProgressStore `grabs`, never `words` or the word bag).
   About 20–30 seconds; no journey stop of its own.
4. **The quest place (the hub).** The door leads to the helper's quest place (the
   forest gym, the bubble castle; every character has one, and the house itself is the
   fallback for a character added without one, or `?place=home`) laid
   out like the house: the helper by the gift's spot, two side doors, later a secret
   door, and a way out (the house's front door, a glowing portal anywhere else).
   The helper (the ally, or the dad who woke her) plays a short story scene that gives
   her a **gift word** (item 037, `content/house/scenes.ts`, one of 2–3 per helper: a
   spell, a dish chef Dada Jason cooks up, a gadget builder Dada Matt builds, a toy).
   Its prop pops up with the word on it, the last line trails off into the word, she
   stands at the scene's spot (item 138: the magic circle for a spell; else a pickup
   that fits the story, the dish on a plate, the gadget on the tool table, Scar's
   charging pad, the toy on a blanket), presses green, and the word flies into her. That word
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
   several words of one family, then another; or Charge the Spell, item 053, the
   Stretchy Bridge, item 054, the Shape-Shifter, item 096, or the rhyme room, item 139, below). The sentence game is one sentence each, on a banner, key word last
   (`WE CAN USE THE NET`, `JULIA NEEDS THE CAT`). Pass 1 is read to her karaoke-style and stops at the key
   word, which pulses in silence (skipped once that frame is solid). Pass 2 is hers:
   her one green reads the whole sentence, each word lit as it is said, and stops at the
   key word, which lights in silence and is sounded out one sound at a time (SH of SHIP
   as one, never blended, and never the word itself; item 085). Then three things wake
   up on pedestals (yellow sounds the key word out again); she
   walks to the one the key word names and presses green. Right: the whole sentence
   is read back and the thing flies into her bag (top left). Wrong: a funny retry.
   Each finished room hangs its prize on its door; with both done the front door appears.
6. **Battle part 1** runs by itself (she can steer her hero with the stick; green
   hops). The fetched things pop out of her bag and are used: a room's earlier words
   fly out together as one volley, each room's last word (and the warm-up's) on its own
   (hunt 6, M28; `src/rules/volleys.ts`). At a move choice the
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
   closes (chef Dada Jason baked the cake). Then the victory replays the words she read,
   on a podium: she has the top block, her ally (or with no ally the dad who woke her) the
   left, the villain the right; with an ally, the dad who woke her cheers on the grass
   left of it (M50, `podiumCheer`), and the other dad, when he came in too, on the grass
   right of it (M70, `podiumCheerRight`).
   Once the recap is said a green dot shows; her green fades it out to **THE END**
   (item 085, `src/scenes/TheEndScene.ts`): this episode's hub (home or the quest place)
   full screen, her heroes (her, and her ally or the dad who woke her) bouncing on it,
   THE END in big letters, a fanfare, no voice. Only **Dad's 2** plays again there
   (item 082's wait, moved from the recap): her buttons, the stick, the keys and Dad's 1
   do nothing, so a new episode never starts without a grown-up; a small
   `PRESS 2 TO PLAY AGAIN` cue lights in the bottom-right corner (dad lock or not; no
   DAD on it, DAD being a bank word: hunt 9 fix 128).

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
in the victory scene); the victory recap pictures her words (nine cards at most: the
gift, the move words, the counter and each room's last word always stay; `recapWords`,
`src/rules/recap.ts`).

A journey map shows before each battle, the trip home after the retreat, and the
victory. The default episode at the suite's speeds (instant voice, teleports, rooms at
clock speed 5, battles at 10) takes about 36 s (item 083, `docs/engineering.md`); a
child's pace has not been timed.

The four v0.1 prep games (Sound to Letter, Blend Path, Word to Picture, Spell the
Spell), the alarm and the retreat camp are **parked**: no episode includes them, but
`?scene=` still opens each one.

**Who is in an episode** (item 025) is drawn fresh each time (`src/rules/cast.ts`):

- **The active cast** (item 028/030): `ACTIVE_CAST` in `src/config.ts` lists who the
  draw picks from, as persons: allies Dada Matt, Dada Jason, Scar, Ellie, Seraphina, Elsa,
  Anna and Jasmine (those four since item 111), Ozymandias, Moriarty and Bluerilla (`rilla`,
  those three since item 114); villains Jörmungandr, Smaug, Bavmorda and Tiamat, and Evil Elsa, Evil Ozymandias and Evil
  Moriarty (since item 115). A dad listed comes in all his forms. Elsa, Ozymandias and
  Moriarty are on both lists, and nobody is ever her own villain: with one as the ally the
  villain is somebody else.
  Everybody else stays defined and playable by `?ally=` / `?villain=`; adding a name to
  the list switches that character on.
- **The villain**: one of the active villains, each equally likely; her last four sit
  out (with seven active since item 115, always three left to choose from), never last
  episode's.
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
item 025); with Seraphina a little dragon keeper hugging an egg (`char_julia_keeper`),
with Elsa or Anna in snow gear (`char_julia_snow`), with Jasmine a desert explorer
(`char_julia_explorer`, item 111); with Ozymandias a little polar astronaut
(`char_julia_astronaut`), with Moriarty a puzzle master in a top hat
(`char_julia_puzzler`), with Bluerilla in a gorilla onesie (`char_julia_gorilla`, item 114). Which outfit goes with which cast is `OUTFITS` in `content/battle/outfits.ts`
(data; see `docs/content.md`, "An outfit"). `?ally=dada_jason` tries the chef episode.

Any cast can be tried from the URL (and stays for every episode that session):

| URL | Does |
| --- | --- |
| `?seed=7` | Seeds the episode's draws (`seedRands`, src/episode/draws.ts): the same seed (and the same progress) repeats the cast, the quest place, the story and line variants and the fight style (`castRand`), and the side rooms, their games, every word (key words, gift, pads, the warm-up and its pictures) and the victory scene (`planRand`, a stream of its own, so a seed's cast is as before). Only the first episode of a load replays exactly: the streams run on through the session. In-scene randomness (the battle's AI and effects, taunt picks, sfx) stays unseeded. Without `seed=` every draw is `Math.random`; the variety simulator seeds them all by replacing it |
| `?cast=default` | The fixed default episode (`cast=random` draws even with `randomCast: false`) |
| `?ally=dada_matt_lifter`, `?villain=dada_jason_warlock` | A role by roster id; a dad's id alone (`dada_jason`) is his own form (chef); `ally=none` |
| `?form=cyber,warrior` | The dads' forms by name: `builder` `lifter` `cyber` `blade`; `chef` `warrior` `warlock` |
| `?primary=dada_jason` / `none`, `?secondary=1` / `0` | Who wakes her; whether the other dad comes in |
| `?place=forest_gym` / `home` | The quest place, whoever the helper is (to look at one) |
| `?words=new`, `?words=tree,ham` | Item 121: every word draw (key words, pads, the gift, the warm-up, the phonics rooms) leans to item 121's new words, or to those named, this session (`favourWords`, `src/rules/bank.ts`); each still leaves the bag once read. The grown-ups page's word list (page 2) marks the new words NEW |
| `?fight=sky_race` | The showdown's fight style, whoever the villain is: `brawl` `sky_race` `space_race` `sea_tug` `spell_clash` `frost_clash` `magic_show` `cook_off` |
| `?fight=smaug_story` | The **story fight** against Evil Smaug (item 107): forces him as the villain, whatever the cast. `?scene=battle&part=1&fight=smaug_story` (or `part=2`) goes straight to a half |

Not every showdown is a brawl (item 031). Each villain has a **fight style**
(`fight` in the roster; `content/battle/fights.ts`): Evil Smaug races the heroes
through his treasure cave (`sky_race`), Evil Jörmungandr pulls a rope against them
over the sea (`sea_tug`), Evil Bavmorda meets their magic beam for beam
(`spell_clash`, warlock Dada Jason's too), Evil Elsa's frost beam meets their warm magic
in her ice palace (`frost_clash`, item 115), Evil Ozymandias races them through the stars
from his iceberg launch pad (`space_race`: the sky race with `scenery: 'space'`), Evil
Moriarty puts on a magic show (`magic_show`: the free-for-all's staging, where his clones,
card traps and vanishing tricks show off best, with its own banners and lines), and Evil
Tiamat keeps her giant free-for-all (`brawl`, also every villain without a style). Evil chef Dada Jason's own style is the
**cook-off**, and with chef Dada Jason as the ally a cook-off is likely (70%,
`fightNudge`), whoever the villain is. The episode draws it once, at the first
battle (`episode.fight`, `src/rules/fights.ts`), so both battles are the same contest.
Every style keeps the episode's shape (part 1's ultimate wins the round, part 2's
counter turns it), the same beats, timing and move choices; only the staging changes
(`src/battle/stages/`), and its bars are the steered health shown as a race lead, a
rope's knot, a clash point or the judges' scores.

**The story fight** (item 107; since item 126 about half the episodes Evil Smaug is drawn as
the villain, `storyFight` on him and `STORY_FIGHT` in `src/config.ts`; `?fight=smaug_story`
forces it, `?villain=smaug` keeps his sky race) is a turn-based showdown told like a short story, its beats Evil Smaug's script in
`content/battle/stories/smaug.ts`, staged by `src/battle/story/StoryDirector.ts`. Heroes
on the left (her, the ally, and the dad who woke her, unless the ally is a dad), Smaug on
the right, no health bars. The characters talk, not a narrator: Smaug all bluster ("This
is MY giant pile of gold!"), Dad and the ally in the fight. Part 1: the boast; her
fetched things; her gift move from pads; his fire breath, telegraphed by a glowing
floor, while she walks behind the stone (if she stays put it roars over her head: no
fail); her answer to the fire from pads (WET, DRIP, MUD or FAN, by her phonics; the
other pads are any move words, never a second sensible one); his gold guards charging,
a dodge with pads (HOP, JUMP, SKIP, FLIP), each hero hopping as the guards reach her and
the guards toppling just past them; Dad's spinning attack while she sneaks to the
hoard and presses green; his tail smash while she climbs the ledge; her answer to the
stuck tail (TUG, GRAB, TWIST, TRAP); then he flies up until he is a dot, dives, floors
them, and they retreat ("TO BE CONTINUED!"). Part 2 is shorter: fire from the sky
(behind the stone), her answer, and the dive again, stopped by the episode's
counter-item; everyone's finisher and he turns good. A big move gets the stage: a splash
picture behind it, the camera punching in, a held frame, too many particles. A dodge's
window is 7 s and a grab goes on by itself after 30 s; dad lock holds both, and F4
answers them. Hooks: `battle.story` (`beat`, and `walk` with its spot while one is open;
`__ww.place` lands her on it).

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
anywhere. While it is on, a 🔒 badge (dad lock; no words on it since item 126, DAD and LOCK being bank words) sits in the bottom-left corner: Julia
can still walk, but no button or key does anything (no green, yellow, red or Start, no
letters), and the rooms' and the battle's timed re-prompts hold off. Lines already
playing finish; the battle's move choice keeps waiting. Press it again and play
carries on exactly where it was. The F-keys still work (F9 opens and closes the
grown-ups page; red and Esc do not while locked). `src/input/dadLock.ts`.

**Minigame debug mode** (item 086, Matt): key **0** (or numpad 0) toggles it in a game
room: the hub (parts 1 and 2), the entry hall's warm-up and the side rooms (the attic
too). It works in real play, not only dev builds, and dad lock does not block it. Turning
it on swaps the room for the **Debug** scene (`src/scenes/DebugRoom.ts`): the same
background with the room's own things gone, a DEBUG tag in the top-left corner, the
room's door out open as if every minigame were done, and one pedestal per game in the
pool (`src/rules/minigames.ts`: the sentence game, the word machine, Charge the Spell, the
Stretchy Bridge, the Shape-Shifter, the rhyme room; every sentence frame is one sentence pedestal, which draws a frame each
time, a counter frame in the attic and house part 2). Green at a pedestal plays that game
on a plan drawn just for it; finishing it brings her back with a ✔ on its pedestal (0 or
F2 in the game comes back too, without one). The open door leaves debug: from a side
room back to the hub, from the hub or the hall on to the next step, as F2 would (F2 in
the debug room goes on too, debug off). Key 0
in the debug room turns it off and the room comes back from its start data, as the
grown-ups page brings it back (its opening lines play again).

Nothing played from debug counts (`src/episode/debug.ts`). The store is held while a game
runs (`ProgressStore.hold`): it records for the game's own sake but saves nothing, and is
put back afterwards. The episode (read, fetched, charged, the house plan and which rooms
are done) and the draws' memory are copied as the game starts and restored as it ends.
So no progress, word-bag, rotation-memory or recent-words change, no recap card, and
nothing on the grown-ups page. Leaving by the open door is not sandboxed: like F2 it
moves the episode on.

**Dad buttons** (item 053): keyboard **1** = no, **2** = yes. They are always live, dad
lock included, and do nothing where no game is asking; a game that asks shows a small
`1 ✗ 2 ✓` cue in the bottom-right corner (lit while a question is waiting; no DAD on
it, DAD being a bank word: item 126, hunt 9 fix 128).
`src/input/dadButtons.ts` (`openDadButtons`), for 054 and later games too. THE END
after the victory recap opens them as well (items 082, 085), with its own cue (`PRESS 2 TO PLAY AGAIN`): 2 is the
only way on to the next episode, and 1 does nothing there.

**Free play** (item 060, moved here from the README in item 132): wherever she is free to
move and no answer is open (the rooms, the bedroom once she is awake, the hub, the battle's
fight outside a move choice), her character has toys. Green jumps: a tap hops, a hold goes
higher and floats down. Blue (the **3** key), red (Esc) and yellow (Tab) cast: blue bolts,
red sparkle stars, yellow fun things (stars, hearts, snowballs; the chef throws donuts and
cookies, the knight sword flashes and gold stars). A tap is one shot; a hold charges a big
one. A button that means something there keeps its meaning (green on a door, sign or thing
in reach; yellow says it again where there is something to say). It is pure play: it never
changes an answer, a battle or what a scene does. Dad lock silences it. At most
`FREE_PLAY.maxShots` shots fly at once (one more and the oldest just goes); the knobs are
`FREE_PLAY` in `src/config.ts`. Blue is a number key, not Shift, because five Shift presses
in a row open Windows' Sticky Keys dialog (amendment 1579); the game binds nothing to
Shift. `src/fx/freePlay.ts` (`docs/systems.md`, *Free play*).

**Charge the Spell** (item 053, `src/scenes/ChargeRoom.ts`; two short words a visit since
item 140, one in items 058-139; no presses per rune since item 059): a side room where she
says letter SOUNDS aloud after the helper, then reads the word they spell. Each word is its
own round. The round's word (3-4 sound units, every one a rune, so no Q, X or CK) shows at
the top from its start, a slot per unit. She walks in and it starts by itself: first the
helper says all the word's sounds straight away, in order, each slot lighting as its sound
plays, a beat (400 ms) between them, never blended and never the word (item 140); then, on
the first word only, "Say each sound after me!". Each rune lights on the
altar in turn (its picture letter, `rune_<x>`: the letter drawn as a thing starting with
its sound; its slot pulses), the helper shows the sound's
gesture (Jolly Phonics style: a hissing snake 🐍 for S, a tummy rub for M;
`content/phonics/runes.ts`) and says the sound, then a quiet beat (`CHARGE.sayBackMs`,
1 s; the dad lock holds it) for her to say it back, and the rune fires up into its slot.
Nothing is pressed per rune: Matt watched the per-rune presses frustrate her (item 059).
With every rune charged the word lights up and she reads it aloud ("Now read the whole
spell!" on the first word only since item 144; the second's was a repeat, and yellow still
says it), the round's one press, Dad's: **2** says it; **1** is "Let's sound it out
together!", the word sounded out once and then said; either way its picture shows and goes
into her bag as a battle item. Dad may press as soon as the word lights. The read records
the word and its sounds (right with his 2). Then the second word takes the bar and its
sounds start at once (item 144 cut "Here comes another spell!"), its own round the same way;
the last word's picture flies into the bag to "Our spells are all charged up!" (in place of
its praise since item 144: two cheers back to back) and back to the hub. A visit with Dad
answering at once is 33-39 s of game time in an episode, 38-42 s straight off a cold
`?scene=room` boot, whose voice decodes hold the first sounds about 3 s (item 144, hunt 11
M61, Matt's ruling: at most 40 s; item 140's was 46-55 s): about 15 s to the first read (her
arrival, the sounds up front, the explanation, the runes), 10.5-11.5 s to a 3-rune second,
15.5 s to a 4-rune one, then about 3-4 s a word for the word, its picture and the bag. Solo, with the 8 s wait for Dad
and "Say it with me!" a rune, 53-61 s. The quiet around each rune is `RUNE_BEATS`
(`src/scenes/ChargeRoom.ts`); the letter sounds and the say-back beat (`CHARGE.sayBackMs`,
1 s) are not trimmed. One word a visit (items 058-139) was 20-25 s. `room.charge.readAtMs` (from the round's
start) and `elapsedMs` (the visit's) are in the hooks; `tests/charge.spec.ts` holds each
round under 25 s to its read and the visit under 52 s with his 1 on the first word (43 s
measured); the bug-hunt checker flags a visit with his yes over 42 s.
The words are drawn like any room's (`drawWords`, from the familiar pictured words),
leaning to shaky sounds, every sound in play from the start (item 067: the old sound
tiers are gone), 3-4 sound units (`CHARGE.units`), `CHARGE.words` of them (`src/rules/charge.ts`,
`CHARGE` in `src/config.ts`): the second never the first, nor a word the first's gestures
say, and sharing none of its sounds where the bank allows (it always does today). Every
charged rune, both words', each sound once, is still a move her hero fires in the next
battle, at 1.3× power (`episode.charged`, `useCharged` in `src/battle/volleys.ts`): six to eight runes now,
where one word gave three or four. For the beta, `FORCE_PHONICS_ROOM` (on)
puts it or the Stretchy Bridge behind door a of every episode.

**Solo mode: Dad isn't here** (item 106). Dad is often beside her, not always. If a game
that asks him (Charge's read, the Stretchy Bridge's level 3) gets no 1 / 2 for
`DAD_AWAY_MS` (8 s in `src/config.ts`, from her turn; paused under dad lock and while a line
plays), the game goes solo (`episode.solo`) for the rest of the session, Bluey-style (hunt 7,
M34: the episodes after it too, so the next Charge reads together at once with no 8 s wait;
not kept in the store, so a reload asks him again): the
helper simply joins in, and no line mentions Dad. In Charge the read is done together
("Let's read the whole spell together!", sounded out, then said); on later runes the helper
says "Say it with me!" (or "With me!", "Together!") before each sound, with a shorter beat
(`CHARGE.soloBeatMs`), and the read needs no one. Those runes and that word are recorded as
**modelled** (ProgressStore `model`, a `modelled` count on the stat, `+n` on the grown-ups
page), never as her reads: seen, recent, shakiness and the word bag do not move. On the
bridge, the pictures come at once with no help counted, and level 3 skips its say-to-Dad
step while solo. Any Dad 1 / 2 in a room that has his buttons open switches back at once
(in Charge from the next rune; during the solo read before it is recorded, his yes records
a **helped** read, right but never her first try, M34; his no a miss). `?solo` starts the
session solo. THE END still waits for his 2: the episode is over, and starting the next is
his call; that press does not end solo (only a game that asks him does).

**The Shape-Shifter** (item 096, `src/scenes/ShifterRoom.ts`): a side room where she
reads every letter of a word, not just the first, alone: walking and green only, nothing
for Dad's 1 / 2. For the beta `SHIFTER_ROOM` puts it behind door b of 3 episodes in 7,
never twice running (items 126, 137; door a holds the forced
phonics game); the others have a fetch sentence frame or the word machine there. The villain's shape-shifting spell walks a
creature down a chain of pictured CVC words, one letter changed a link (CAT, BAT, BAG,
BUG, MUG): chains changing all three places first (hunt 6, M29: the vowel too), then the
first letter first, then the last, the vowel last, going back once at most
(`src/rules/shifter.ts`; four links, `SHIFTER` in `src/config.ts`; a link with no familiar
pictured word is left out, so a chain can be shorter, and a shorter chain with a read-it
link is taken before an all-fix-it one; of chains that long changing the most places, those
holding at most one word she read lately first, hunt 7). The first creature is said ("It
starts as a... CAT"); every later word is read, in one of two beats, mixed through the chain:
**read it**, the new word appears on the creature's label, not voiced, and three pictures
stand in the room differing only at the changed letter (BAT, HAT, RAT; at the vowel or the
last letter, where the bank rarely has two such pictures, one of them may be another picture,
one with the word's first letter first: CAP beside CAN and CUP): she walks to the one
she read and presses green, the creature morphs into it (it swells, squashes, shrinks, a
poof of smoke and sparks, and pops back) and the word is said; **fix it**, the creature
morphs into a picture but its label keeps the old word (a bat labelled CAT), and three
letter stones with different sounds stand in the room: she walks to the one that fixes
the label, it flies in and the word is said. The first link of each beat in a visit says
the whole instruction ("Look, a new word! Read it, then walk to its picture!"); later ones
a short cue ("Read it!", "Fix it!"), the next spell striking under the last word's praise
(hunt 6, M26: 5 to 7 s a link with instant answers, was 12 to 15). Fix it after read it
plays both morphs, so they overlap (item 108): the read word is said as its creature pops
back, and the next spell's swirl and swell start under it, the poof waiting for the word;
that link is 5.4 to 6.2 s at the tests' clock (was 6.6 to 7), 5 to 5.4 s at real speed. Fix it has its own
praise ("You fixed it!", M30), and no "by yourself" after help. Help fades per word (`shifterLevels`, listed by level on page 1 of the
grown-ups page; at base difficulty every word gets level 1): level 1 the changed letter is lit on the label and
each stone sounds as she comes near it; level 2 lit, silent stones; level 3 nothing lit.
Yellow sounds the new letter (read it) or the stone she stands at (fix it): its sound
alone, never its name (item 137). A wrong picture is
sounded out over itself, then "But the spell says..." and the new letter; a wrong stone's
letter flies at the label, bounces off, and its sound is said ("This letter says...").
No word is ever made of it: a random letter could spell a word she reads later, or a rude
one. No penalty; after two misses the answer sparkles. Read it is recorded as reading;
fix it (a letter for a sound) under spelling, apart from reading, and leaves her word bag alone. Every word read is a battle item, a copy of each
creature flying into her bag; the last creature itself flies in and goes to the fight. Not MOM or DAD
(`NO_BAG_COPY` in `content/phonics/sentences.ts`; hunt 10, M45): read as any word, but no copy, and as the
last creature it waves (three squash hops) and stays, with no "comes to the fight" line; neither is ever fired. `?scene=room&slot=a&room=shifter` opens it.

**The rhyme room** (item 139, designed with Matt; `src/scenes/RhymeRoom.ts`, `src/rules/rhyme.ts`):
a side room where a rhyme helps her read, alone: walking and green only, nothing for Dad's
1 / 2. Drawn, it is one of door b's games in the episodes without the Shape-Shifter, beside
the fetch sentence frames and the word machine (`RHYME.weight`; in a 150-episode `variety`
run, 24 visits). A visit is three rounds (`RHYME.rounds`; two at least, `minRounds`, else a
sentence frame plays), each from a different word family. A round: two rhyming words stand
at the back as cards, each its picture and its printed word, each lit as it is said (BUG,
TUG); a third place waits with a question mark, and the family's third word is printed on
a plate under it, where the other two cards print theirs, never said (RUG; at the top of
the room the caption box covered it, hunt 11). Three unlabeled pictures stand in the room: the
printed word's, one sharing its first sound (RING), one its vowel and not its first sound
(THUMB), neither rhyming with it, so only the end of the word, or the rhyme, gets it. The
printed word and the pictures are things (`THINGS`: an action word is never a picture she
picks, item 137); the two cards are the family's things first, then pictured action words
(HUG, TUG, RUN, HOP: shown and said, never picked; Matt's default, item 139). The bank
makes ten families: -AT -AN -OCK -ING with things only; -UG -UN -OP -IG -OT -AP with an
action card. -OG (DOG LOG) and -ED (BED stored) have too few words; `RHYME_FAMILIES`
follows the bank, so a new word or a word brought back adds its family by itself. Help
fades per word (`rhymeLevels`, on the grown-ups page once met; at base difficulty every word
gets level 1): level 1 the helper sounds the printed word out unasked, each unit lit on the
plate (a digraph one sound, never blended), then asks "Which thing is it?"; levels 2 and 3
it is sounded out only on yellow. A round's cards, slot, plate and pictures arrive together;
only the first round has the long instruction ("Which thing is it?" after the sound-out;
"Rhyme time!..." went in item 146); later rounds say the two cards and sound the
plate out (level 1) or say "Another rhyme! Read it!" (2 and 3), and she picks. She can walk
from the moment the pictures are up; only green waits for the round's last line (item 144,
hunt 11 M64, real voice, right first time: a visit about 40 s from the room's open to the
hub, the first card said 1.2 s in; green opens about 9.8 s into the first round (item 146), 7 s into
a later one, counting the last word's praise). Yellow sounds it out at any level, and is help (the
word's ramp steps down). A miss: the fizzle-and-giggle, then the rhyme with her pick in it
and again with the right word, "Bug, tug... thumb? Listen: bug, tug, rug!" (Matt's design:
the miss line says the printed word, a deliberate exception to the speech rule); after two
misses the answer sparkles; no penalty. Right: its picture flies up into the row's third
place, the plate lights, the word is said, and a copy flies into her bag (every printed word
is a battle item; not MOM or DAD). Recorded as a read (`words`, her word bag) and its family
under `rimes` (the word machine's record, and the room's lean in the pool). The printed
words are drawn by the bank's weight, one still in her bag twice as likely, first from those
the episode before did not have her read (`LAST_READ`); its cards and pictures keep out of
the other rooms' words (planned after the Shape-Shifter, before Charge). `?scene=room&slot=a&room=rhyme` opens it.

**No letter names** (item 137, Matt): no clue or hint says a letter's name. The warm-up's
clue is the sounds at every level, and the Shape-Shifter's hints and misses say the plain
sound (`soundLines` in `src/rules/soundOut.ts`). Item 096's bridge from a name to its sound
("R's name is Ar... squeeze off the front:", `letter_<x>_hides`) and item 033's letter names
(`letter_<x>_name`) are retired: Matt heard THREE's first clue as "TH, R's name is Ar,
squeeze off the front, EE". A long vowel's own sound ("ee", `letter_long_e_sound`) and
X-RAY's `x_name` ("ecks") are sounds, not names, and stay.

**The Stretchy Bridge** (item 054, `src/scenes/BridgeRoom.ts`): a side room where she
blends a whole word. A gap crosses the room (lava in the house, a river or a chasm at a
quest place: `gap` on each place in `PLACES`, `content/house/house.ts`, read by `gapFor`; a chasm's colours lift toward
the room's floor, read off the backdrop, and its top edge fades in from the floor, M52), and the word's letters are
stepping stones over it (SH is one stone). She pushes the stick to slide across, slower
than she walks; while she is on a stone its sound is **held**, so a slow slide is
"mmm-aaa-t". A vowel or a sound you can stretch (M S F L N R V Z NG SH TH) gets one short
natural stretch, 0.6 s with its fade (`BRIDGE.stretchMs`, item 085; it was 1.3 s), then stays
quiet while she stands there: no looped repeat. It sounds again when she steps on again, or on
yellow. A stop sound (P T K B D G, and H W Y X CH) plays its burst once each landing, never
with an "uh". Matt will revisit the length once the phonics clips are final.
The room fetches its stones' sounds and words as it opens, so the first slide is not silent. On the far bank are 2–3
pictures that share the word's start and differ later (MAP, MAT, MAN; else MAP, MOP, MUG;
only where the bank has nothing better, the same rime). She walks to the one she read and
presses green; only then is the word said, and its picture goes into her bag (every word
read there is a battle item; not MOM or DAD, whose picture stays put: `NO_BAG_COPY`, hunt 10, M45). Its words are any short pictured word (`BRIDGE.maxUnits`,
4 sound units; item 067), the easier first in a visit. Help can fade per word
(`bridgeLevels` in the progress, the level reached is the number in a word's dot on page 2
of the grown-ups page; at base difficulty every word gets level 1): level 1 the stones sound
themselves and the pictures show from the start; level 2 silent stones, and Dad's **2** is
a hint (the stones sound in turn, then as she slides); level 3 silent stones, on the far
bank she says the whole word aloud, Dad presses **2** and the pictures appear, his **1**
replays the slide with sounds, and after two replays the pictures come anyway; nothing
from him for 8 s goes solo (*Solo mode* above: the pictures come, no help counted). Right first time with no help is one level less help next time; a hint, a
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
is stretched by overlap-add into one smooth sound `BRIDGE.stretchMs` long (0.6 s; `holdSound.ts` imports it from
`src/config.ts` as its default, for the voice tools too), then
quiet (item 058: looping the 70-300 ms steady part every clip has was a fast stutter of "m"s;
item 085 dropped the re-sound after 2 s of standing). A recording put in place with `voice:import` or `voice:clip` is cut by its own
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
| `?scene=room&slot=a&room=charge&solo=1` | Charge the Spell in solo mode (item 106: Dad isn't here; `solo` in any URL starts the episode solo) |
| `?scene=room&slot=a&room=bridge` | The Stretchy Bridge (`room=bridge`, the same way) |
| `?scene=room&slot=a&room=shifter` | The Shape-Shifter (`room=shifter` forces it behind door a; otherwise `SHIFTER_ROOM` has it behind door b in 3 episodes of 7, never twice running) |
| `?scene=room&slot=a&room=rhyme` | The rhyme room (`room=rhyme` forces it behind door a, as `room=charge` does; drawn, it is one of door b's games) |
| `?scene=battle&part=1&charged=m,s,a` | A battle that fires those charged runes (default: the plan's charge room's, in part 1) |
| `?scene=battle&part=1` (or `2`) | A battle |
| `?scene=victory&read=cat,sun,julia` | The victory scene, then the victory recapping those words |
| `?scene=victory&ending=boat` | That victory scene (`content/house/endings.ts` ids); F2 skips to the recap |
| `?scene=theend` | THE END, the victory step's last screen (the recap's green opens it); only Dad's 2 starts a new episode |
| `?scene=pick`, `?scene=parent` | A pick screen; the grown-ups page |
| `?scene=sound` / `blend` / `picture` / `spell` / `alarm` / `retreat` | Parked v0.1 steps |

Extras: the cast (above: `seed=`, `cast=default`, `hero=`, `ally=`, `villain=`,
`form=`, `primary=`, `secondary=`, `place=`, `fight=`), `fetched=net,fan` (the
battle items; that is the default), `warmup=1` (the warm-up's word fetched first too, as in
an episode; hunt 6, M28), `nojourney` (skip the map), `difficulty=2` (the
difficulty knob for this session; below), `grab=king` (the warm-up's word, if it is one
the hall can ask for; item 085), `sentence=no_match_for_the:octopus` (that frame and key
word on its banner: the attic's for a counter frame, door a's for a fetch frame, with
`game=sentence:<frame>`; item 128), `prep=sound,blend` (the parked prep games: `sound`
`blend` `picture`). The test-only ones (`voice=instant`, `battle=short`, `hooks=1`,
`qa=1`) are in the README: *Speed, GPU and workers*, *The bug-hunt checker* and, for
`hooks=1`, *Operational facts*.

## Difficulty and variety

Matt's ruling: **no automatic difficulty**. Every help ramp still records her level
(the warm-up's `grabLevels`, the bridge's `bridgeLevels`, the Shape-Shifter's
`shifterLevels`, the rhyme room's `rhymeLevels`, and frames' and words' first
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
`shifter`, `rhyme`, `sentences`, `bank`, each with `withDifficulty` from `tests/unit/difficulty.ts`);
in the browser `?difficulty=` in `bridge.spec.ts`, `entry.spec.ts`, `sentenceread.spec.ts`,
`soundout.spec.ts` and `smoke.spec.ts`.

**Words by length, not level.** Every familiar bank word is in play from the first
episode (no level gate; OCTOPUS and UMBRELLA included). The recognition roles (key
words, the counter, move pads, the gift, fetches, the recap) take any word. The games
where she sounds a word out unit by unit keep to short words, in sound units (SH is one):
`GRAB.maxUnits` (the warm-up), `BRIDGE.maxUnits` (the bridge's words; its far-bank
pictures may be longer), `WORD_MACHINE.maxUnits`, `CHARGE.units`, and the Shape-Shifter's
CVC words (`SHIFT_WORDS`, one letter a sound), and the rhyme room's family words (three sound units).

**Variety across episodes.** Each rotation keeps its recent picks in the progress store
(`recent`, `src/rules/recent.ts`; how many: `VARIETY` in `src/config.ts`) and avoids
them while two choices are left: the ally and each dad's form (`src/rules/cast.ts`; item 121:
a dad's last two forms sit out while one is left, so Dada Jason's three go round), the
villain (`recent.villain`, the last 4 kept; the draw avoids as many
as still leave two, so the last 4 with seven active), the quest line, hub scene and each line variant
(`src/rules/story.ts`; item 121: these avoid their last two while one is left, so a line of three
goes round all three before one comes back), the victory scene, the side rooms (the one left out last episode
comes back), the games, and the warm-up's last 3 words. The games rotate strictly (item 137):
no side room plays a game either side room played last episode while another fits (every
fetch frame counts as the one sentence game), and the attic never plays last episode's frame
(`repeatsLast` in `src/rules/minigames.ts`, `recent.last_games`); so door a's phonics game
alternates Charge and the Bridge, the Shape-Shifter is never behind door b twice running
(`SHIFTER_ROOM.afterOne` 0), and door b's sentence game, word machine or rhyme room changes with it.
Beyond that a game of her last two episodes weighs `VARIETY.gameWeight`. Her latest right-first-time reads
(`VARIETY.words`) weigh `VARIETY.wordWeight` in every word draw, so last episode's words
rarely come straight back; a missed word keeps its full weight. The bags (key words,
moves, pads) still draw without replacement. Coverage weighting (vowels, first sounds)
is unchanged. The cast and its variants are remembered as she walks into the bedroom
(from the title, or the last parked pick screen), the rooms and games once the house plan
is made after that; a fixed cast (`?cast=default`), an override, a dev `?scene=` jump or
games the URL forces (`?room=`, `?game=`, `?games=`) are not remembered. The fight style follows the villain
(and chef Dada Jason's nudge), so it rotates with the villain. Which dad wakes her has no
memory: it is the 60/40 draw (`CAST_ODDS`) every episode.
