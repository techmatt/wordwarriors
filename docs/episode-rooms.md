# The side rooms and the fights

The games behind the hub's side doors and the attic, solo mode, and the battles' fight
styles. The episode's steps, cast, dev keys and URLs: [`docs/episode.md`](episode.md).

## The pool

Each side room plays a minigame drawn by weight from `src/rules/minigames.ts`: a sentence
frame, the word machine, Charge the Spell, the Stretchy Bridge, the Shape-Shifter or the
rhyme room. Beta knobs: `FORCE_PHONICS_ROOM` (on) puts Charge or the Bridge behind door a
every episode; `SHIFTER_ROOM` puts the Shape-Shifter behind door b about 3 episodes in 7,
never twice running; otherwise door b has a fetch sentence frame, the word machine or the
rhyme room. Rotation and URLs: `docs/episode.md`.

## Sentence game

One sentence on a banner, key word last (`WE CAN USE THE NET`). Pass 1 is read to her
karaoke-style and stops at the key word, which pulses in silence (skipped once the frame
is solid, from `DIFFICULTY` 2). Pass 2 is hers: her one green reads the sentence, each word
lit as said, up to the key word, which lights in silence and is sounded out one sound at a
time (SH one sound; never blended, never the word). Then three things wake on pedestals
(yellow sounds the key word out again); she walks to the one it names and presses green.
Right: the whole sentence is read back and the thing flies into her bag. Wrong: a funny
retry. The attic plays a counter frame the same way.

## Word machine

A picture and a rime (AT) on the machine; letter tiles on the floor say their sounds. Green
slots one in and the machine says the two parts apart; the right one makes the picture's
word, said only then, into her bag; a wrong one makes a silly word (ZAT). Several words of
one family, then another (`WORD_MACHINE`: `rounds`, `perFamily`, `tiles`).

## Charge the Spell

`src/scenes/ChargeRoom.ts`, `src/rules/charge.ts`, `CHARGE` in `src/config.ts`. She says
letter SOUNDS after the helper, then reads the word they spell. `CHARGE.words` (2) words a
visit, each its own round, of `CHARGE.units` (3-4) sound units, every unit a rune (so no Q,
X or CK). The word shows at the top from the start, a slot per unit.

1. The helper says all the word's sounds in order, each slot lighting as it plays,
   `SOUND_GAP_MS` (400 ms) apart, never blended, never the word. First word only: "Say each
   sound after me!"
2. Each rune lights on the altar in turn (`rune_<x>`: the letter drawn as a thing starting
   with its sound); the helper shows the sound's gesture (Jolly Phonics style,
   `content/phonics/runes.ts`), says it, then a quiet `CHARGE.sayBackMs` (1 s; dad lock
   holds it) for her to say it back, and the rune fires into its slot. **Nothing is pressed
   per rune** (Matt saw per-rune presses frustrate her).
3. With every rune charged the word lights and she reads it aloud ("Now read the whole
   spell!" on the first word only; yellow still says it). The round's one press is Dad's:
   **2** = she said it; **1** = "Let's sound it out together!", sounded out once then said.
   Either way its picture shows and goes to her bag. Dad may press as soon as the word
   lights; his 2 records the word and its sounds right.
4. The second word starts its sounds at once; the last word's picture flies to "Our spells
   are all charged up!" and back to the hub.

**Length (Matt's ruling: at most 40 s a visit with Dad answering at once;** measured 33-39
s, solo 53-61 s). The quiet around each rune is `RUNE_BEATS` (in the scene); the letter
sounds and say-back beat are not trimmed. Hooks: `room.charge.readAtMs`, `elapsedMs`;
`tests/charge.spec.ts` and the checker's `ROOM_BUDGET_MS` (`tests/qa/wording.ts`) hold it.

Words are drawn like any room's (`drawWords`, familiar pictured words), leaning to shaky
sounds, every sound in play: the second word is never the first, nor a word the first's
gestures show, and shares none of its sounds where the bank allows. Every charged rune,
each sound once, is a move her hero fires in the next battle at 1.3× power
(`episode.charged`, `useCharged` in `src/battle/volleys.ts`).

## Solo mode: Dad isn't here

If a game that asks Dad (Charge's read, the Bridge's level 3) gets no 1 / 2 for
`DAD_AWAY_MS` (8 s from her turn; paused under dad lock and while a line plays), the
session goes solo (`episode.solo`): every later episode too, but not kept in the store, so
a reload asks him again. The helper simply joins in and no line mentions Dad. In Charge the
read is done together ("Let's read the whole spell together!", sounded out, then said);
later runes get "Say it with me!" (or "With me!", "Together!") and a shorter beat
(`CHARGE.soloBeatMs`). Those runes and words are recorded as **modelled** (store `model`,
`+n` on the grown-ups page), never as her reads: seen, recent, shakiness and the word bag do
not move. On the Bridge the pictures come at once with no help counted, and level 3 skips
its say-to-Dad step. Any Dad 1 / 2 in a room that has his buttons open ends solo (during a
solo read before it is recorded, his yes records a **helped** read, right but not
first-try; his no a miss). THE END's 2 does not end solo.

## The Stretchy Bridge

`src/scenes/BridgeRoom.ts`, `src/rules/bridge.ts`, `BRIDGE` in `src/config.ts`. She blends
a whole word. A gap crosses the room (lava in the house, a river or chasm at a quest place:
`gap` on each place in `PLACES`, `content/house/house.ts`, read by `gapFor`; a chasm's
colours lift toward the room's floor and its top edge fades in from it). The word's letters
are stepping stones (SH one stone). She pushes the stick to slide across, slower than she
walks; on a stone its sound is **held**, so a slow slide is "mmm-aaa-t". A stretchable sound
(vowels, M S F L N R V Z NG SH TH) gets one natural stretch of `BRIDGE.stretchMs` (0.6 s with
its fade), then quiet while she stands: no loop. It sounds again when she steps on again or
on yellow. A stop (P T K B D G, and H W Y X CH) bursts once per landing, never with an "uh".
Matt will revisit the length once the phonics clips are final. The room fetches its sounds
as it opens, so the first slide is not silent.

On the far bank are `BRIDGE.pictures` (3) pictures sharing the word's start and differing
later (MAP, MAT, MAN; else MAP, MOP, MUG; only as a last resort the same rime). She walks to
the one she read and presses green; only then is the word said, and its picture goes to her
bag (not MOM or DAD: `NO_BAG_COPY`). Words: any short pictured word (`BRIDGE.maxUnits`, 4),
three a visit, easier first: CVC words starting with a holdable sound, then stop-sound CVC
words, then the bank's blends and digraphs. `?bridge=mom,dad` names door a's words.

Help per word (`bridgeLevels`; shown in the word's dot on page 2 of the grown-ups page;
base difficulty: always 1): **1** stones sound and pictures show from the start; **2**
silent stones, Dad's 2 is a hint (the stones sound in turn, then as she slides); **3**
silent stones, she says the word aloud, Dad's 2 shows the pictures, his 1 replays the slide
with sounds (after `BRIDGE.replays` replays the pictures come anyway); 8 s without him goes
solo. Right first time with no help is one level less help next time; a hint, replay or
wrong picture one more. A wrong picture costs time, never a penalty: "You picked... M, A,
P" over its picture, then "But the bridge ends with... T" with that stone flashing, and she
slides again.

**Held sounds and Matt's recordings.** The bridge cuts whatever clip is in place
(`src/audio/holdSound.ts`, by 10 ms frames of loudness and zero crossings): a hiss up to
the vowel after it, a hum up to where the schwa comes in, a vowel's steady part, a stop's
burst (T, K) or a voiced stop's first instant (B, D), and X's K and final S around its
vowel. The held part is stretched by overlap-add to `BRIDGE.stretchMs` (`holdSound.ts`'s
default, for the voice tools too). A recording put in place with `voice:import` or `voice:clip` is cut by its own shape,
so no code changes: record a holdable sound as a steady half second or more ("mmmm",
"ssss", "aaa") and a stop crisp with no vowel after it ("t", not "tuh"). The cut counts
zero crossings per second, not per sample (the browser decodes at 48 kHz, usually).

## The Shape-Shifter

`src/scenes/ShifterRoom.ts`, `src/rules/shifter.ts`, `SHIFTER` in `src/config.ts`. She reads
every letter of a word, not just the first, alone: walking and green only, no Dad buttons.
The villain's spell walks a creature down a chain of pictured CVC words, one letter changed
a link (CAT BAT BAG BUG MUG), `SHIFTER.links` (4) links. Chains changing all three places
come first (then the first letter, then the last, the vowel last), going back once at most.
A link with no familiar pictured word is left out (at least `minLinks`). No word of the
last `wordsOut` (3) chains appears where any chain fits (Matt's call), a shorter chain
first.

The first creature is said ("It starts as a... CAT"); every later word is read, in one of
two beats mixed through the chain:

- **Read it:** the new word appears on the creature's label, not voiced; three pictures
  differing only at the changed letter stand in the room (BAT HAT RAT; where the bank has
  too few, a near one: CAP beside CAN and CUP). She walks to the one she read;
  the creature morphs (swell, squash, shrink, a poof, pop back) and the word is said.
- **Fix it:** the creature morphs into a picture but its label keeps the old word (a bat
  labelled CAT); three letter stones with different sounds stand in the room; she walks to
  the one that fixes the label, it flies in and the word is said ("You fixed it!").

The first link of each beat says the whole instruction; later ones a short cue ("Read
it!", "Fix it!"), the next spell striking under the last word's praise. Help per word
(`shifterLevels`, page 1 of the grown-ups page; base: 1): **1** the changed letter lit and
each stone sounds as she nears it; **2** lit, silent stones; **3** nothing lit. Yellow
sounds the new letter (read it) or the stone in reach (fix it): its sound, never its name.
A wrong picture is sounded out over itself, then "But the spell says..." and the new
letter; a wrong stone bounces off the label and its sound is said ("This letter says...").
No wrong letter ever makes a word (it could spell a word she reads later, or a rude one).
After two misses the answer sparkles. Read it is recorded as reading; fix it under
spelling, leaving the word bag alone. Every word read is a battle item (a copy of each
creature flies into her bag; the last creature itself goes to the fight). MOM and DAD
(`NO_BAG_COPY`, `content/phonics/sentences.ts`) are read as any word but give no copy, and
as the last creature it waves and stays; neither is ever fired.

## The rhyme room

`src/scenes/RhymeRoom.ts`, `src/rules/rhyme.ts`, `RHYME` in `src/config.ts` (Matt's design).
A rhyme helps her read, alone: walking and green only. A visit is `RHYME.rounds` (3) rounds
from different word families (at least `minRounds`, else a sentence frame plays).

A round: two rhyming cards at the back, each picture and printed word lit as said (BUG,
TUG); a third place with a question mark, and the family's third word printed on a plate
under it, never said (RUG). Three unlabelled pictures stand in the room: the printed
word's, one sharing its first sound (RING), one its vowel but not its first sound (THUMB),
neither rhyming, so only the rhyme gets it. The printed word and the pictures are things
(`THINGS`: an action word is never a picture she picks); the cards are the family's things
first, then pictured action words (shown and said, never picked). `RHYME_FAMILIES` follows
the bank: a family needs enough words, and a new word adds its family by itself.

Help per word (`rhymeLevels`; base: 1): **1** the helper sounds the printed word out
unasked, each unit lit on the plate (never blended), then "Which thing is it?"; **2-3**
only on yellow. She can walk once the pictures are up; green waits for the round's last
line. Yellow sounds it out at any level and counts as help. A miss: the fizzle-and-giggle,
then the rhyme with her pick and again with the right word ("Bug, tug... thumb? Listen:
bug, tug, rug!": a deliberate exception to the speech rule). After two misses the answer
sparkles. Right: the picture flies into the third place, the plate lights, the word is
said, a copy flies to her bag (not MOM or DAD). Recorded as a read (`words`, word bag) and
its family under `rimes`. Printed words are drawn by bank weight (a word still in her bag
twice as likely), first from those the last episode did not have her read (`LAST_READ`);
cards and pictures keep out of the other rooms' words.

## Fight styles

Each villain has a `fight` style (`content/battle/fights.ts`; staging in
`src/battle/stages/`): Smaug `sky_race` through his treasure cave, Jörmungandr `sea_tug`,
Bavmorda (and warlock Dada Jason) `spell_clash`, Evil Elsa `frost_clash`, Ozymandias
`space_race`, Moriarty `magic_show`, Tiamat and anyone without one `brawl`; evil chef Dada
Jason `cook_off`, and with chef Dada Jason as ally a cook-off is 70% likely (`fightNudge`).
Drawn once per episode (`episode.fight`, `src/rules/fights.ts`), so both battles match.
Every style keeps the shape, beats, timing and move choices; the bars are the steered
health shown as a race lead, a rope's knot, a clash point or judges' scores.

**Story fight:** about half of Smaug's episodes (`storyFight` on him, `STORY_FIGHT`);
`?fight=smaug_story` forces it, `?villain=smaug` keeps his sky race. Turn-based and told
like a story (`content/battle/stories/smaug.ts`, `src/battle/story/StoryDirector.ts`):
heroes left (her, the ally, the waking dad unless the ally is a dad), Smaug right, no
health bars, the characters talking; the beats are the script's. Walk beats (hide behind
the stone from his fire, sneak to the hoard, climb the ledge) have no fail: the fire roars
over her if she stays put. Answer pads offer one sensible word (WET DRIP MUD FAN against
fire; the rest any move words). Part 1 ends with his dive flooring them ("TO BE
CONTINUED!"); in part 2 the counter-item stops the dive. A dodge's window is 7 s; a grab goes
on by itself after 30 s; dad lock holds both, F4 answers them. Hooks: `battle.story`
(`beat`, `walk`); `__ww.place` lands her on the spot.

A giant villain (roster `size` 2+: Tiamat) holds her own half of the arena (`stomp`,
`src/battle/movement.ts`), steps forward for her ultimate to fill the screen, and the
ultimate sweeps the arena (`giantSweep`).
