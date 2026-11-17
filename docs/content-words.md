# Content: words, sentences and the phonics rooms

How to add words, sentence frames, word families, runes and letter sounds, and how the
bags draw them. Characters and the *Matt says X → run Y* table: `docs/content.md`; rooms,
scenes and fights: `docs/content-reference.md`.

## A word (`content/phonics/bank.ts`)

Every word she reads is a `BANK` entry: `T(word, glyph?, extra?)` a `thing` (a clear
picture: room object, key word, counter, warm-up, fetched item), `A(...)` an `action` (a
clear battle effect: move pad, gift word), `B(...)` `both`. `glyph` is the placeholder
emoji (no Emoji 13+; leave out for a generic stand-in); `say` respells for edge-tts.

Tags come from the spelling: `units` (SH CH TH CK NG QU kept together, QU as Q; a doubled
letter one unit), `level` (1 CVC, 2 blend, 3 digraph; both is 3), `vowel`, `onset`,
`rime`. A word needs exactly one short vowel between consonants (`tag()` throws), and
every unit a letter sound. Exceptions spell `spelled` by hand, each unit's letters and
sound (KEY: `[['k', 'k'], ['ey', 'long_e']]`):

- **Long vowel** (KEY, YOYO): level 1 (3 if `late`), no vowel tag, no family; hints sound
  every unit; it may be the counter like any bag word (Matt). Its sound is in
  `LONG_VOWEL_SOUNDS` (`content/phonics/letters.ts`). A hyphen breaks ids: YO-YO is
  `yoyo`, `say: 'yo-yo'`. A silent letter's sound is `''` (KITE's E lights, says nothing).
- **Untaught sound** in a familiar picture (ZOO, ZEBRA, X-RAY, COW; Matt: a familiar
  picture may hold one): a key from `UNTAUGHT_SOUNDS`, marked `late`; no vowel tag,
  family or bridge. A new untaught sound goes in that list, which gives it its
  `letter_<key>_sound` line. A unit may be longer than two letters: BALL is B ALL (`all`,
  item 188), the -ALL chunk as one sound.
- A `spelled` word with one short vowel and nothing long or silent (THUMB) is tagged
  like any word.

**Level 2 blend order**: final s-blends (NEST, DESK) and initial l-blends (FLAG, CLAP,
PLUM) first; final nasal blends (JUMP, HAND, SINK, TENT) last.

A new word keeps the coverage rule (README, *The word bank's coverage rule*;
`npm run bank:audit`). To add one:

1. The entry, in its level's block of `ENTRIES`.
2. Its brief in `PICTURES` (`content/art/prompts.ts`): one clear thing a 4-year-old
   knows, no writing, what it is not where it could be mistaken ("a plum, not a fig").
   Art `pic_<word>`. A picture far from square (DAD, TUG) goes in `SHAPED_PICTURES`
   (`src/art/pictureBox.ts`); `tests/unit/pictureBox.test.ts` fails on one over 2:1 left out.
3. Its effect in `content/phonics/effects.ts` (next section).
4. `LOOKALIKES` (`content/phonics/sentences.ts`) if its picture could be taken for
   another; a `RIMES` entry if it opens a family.
5. `voice:lines`, `voice:build` (`word_<word>`; an action also gets every narrator's
   `use_move_`, `gift_word_`, `not_move_`, `was_move_`, `find_move_`), `art:placeholders`,
   `art:alts` / `art:gen`.

Keep it out of every narrator line, threat, quest line and hub scene (rules.test.ts names
the line), a `both` or action word out of roster counter words, and any word out of
fixed text the game prints (hit shouts, corner cues, badges, banners;
`tests/unit/shouts.test.ts`; the hit words BAM and ZAP show only where `textGivesAway`
allows). A new word joins her bags' rounds under way (`topUpBag`, `topUpMoves`).

**Familiar or `odd`.** A thing must be one a typical four-year-old knows from its picture
alone. Otherwise mark it `odd: true`: an odd `both` word keeps its action role (pads, the
gift); an odd thing is out of play (`DROPPED`), art, effect and lines kept. Watch for a
picture she would name otherwise (JET "a plane", FIN "a shark"). `THINGS` are familiar
things, `ACTIONS` every action and `both` word, `LIVE` both; coverage counts `LIVE`. A
family needs two familiar pictures. No word is `odd` at present.

`content/phonics/words.ts`: `PICTURE_WORDS` (familiar things and `both`), `MOVE_PICTURES`
(the rest), `SIGHT_WORDS` (names: the name-free face card is the picture),
`SPECIAL_WORDS` (non-bank key words kept for the story, MICE), `FLAVOUR_PICTURES` (POW's
art for the roster).

**A glyph no screen shows first**: a thing's glyph must not be a sign every episode shows
before she reads (the journey map's 🌅 ⚔️ 🏆 🏠, the bed's 🛏️), or the planner keeps
the word out for good (`planInput`; `tests/unit/castSaid.test.ts`). The bedroom's toys are
no such sign (item 184, Matt): DRUM, LAMP, DUCK, BLOCK and ROBOT are read like any word,
and a new word may be a bedroom prop. A place's glyph, a hub story's emoji prop or a Charge
rune's picture still keeps its word out of that episode alone (ROBOT's 🤖). A word a cast's quest line, hub scene, threat or fight
line says is fine (Matt: hearing it in a character line first is no problem): key draws
only weigh it down that episode (`softSaid`, `SOFT_SAID_WEIGHT`). Those lines still say
no action word.

## What a word does in battle (`content/phonics/effects.ts`)

One `WordEffect` per bank word, `{ word, look, ability }` (a unit test checks). A thing's
is its fetched item, popping out of her bag with a THE NET! banner (`FETCH_ITEMS`); write
it `use(word, kind, color, extra)` (id `item_<word>`, `both` words too). An action's is
its move, fired supercharged with a SUPER JUMP! banner; write it `act(...)` (id
`word_<word>`). Any ability kind works; a `summon` needs a `MinionSpec` (`hen`, `dog`
fight on her side); `...pic(word)` makes a `bolt` or `rain` fling the word's own
picture, right way up.

## A sentence frame (`content/phonics/sentences.ts`)

A `Frame` in `FRAMES`: `{ id, text, use, numbers?, not? }`.

- `text` upper case; slots `{villain}`, `{helper}`, `{hero}`, `{x}`; at most one name
  slot; `{x}` (the key word) last.
- `use: 'fetch'` fills the two side rooms (two different per episode); `use: 'counter'`
  the attic (one, naming the villain). Both drawn weighted toward shaky frames.
- `numbers`: a number word reads right as its key; `not`: key words that read wrong in it
  (`ran_away_from_the` takes no ZOO).
- Keep to future sight words (IS, THE, A, OF, WE, CAN, NO, FOR); 3–5 frames of each kind.
  A frame word that is a bank word is fine: the episode's three sentences' words never
  become its key words.
- `NOT_FETCHED` (MOM, DAD, ZOO, HAND) read wrong as a fetch key; `NO_BAG_COPY` (MOM, DAD)
  never become battle items in any game.
- The composer makes `sent_<id>` per frame, or `sent_<id>_<character>` per character for
  a name slot, plus `word_<token>` for a new token.
- Progress is per frame (`frames` in ProgressStore); `SENTENCE_SOLID` (`src/config.ts`)
  says when a frame skips the listening pass.

## Key words and the word bag (`src/rules/rooms.ts`, `src/rules/bank.ts`, ProgressStore `bag`)

Every key word (side rooms and attic) comes from her bag (`drawKey`): every pictured
bank word (`BAG_WORDS`), drawn without replacement and saved with her progress. A word
leaves only when she reads it right first time (drawing spends nothing); when nothing
usable is left the bag refills, minus this episode's words. Draws weigh
**shakiness × coverage × recency** (`src/rules/bank.ts`): missed words stay and come
back soon; coverage favours the vowels, first sounds and levels met least; recent
right-first-time reads weigh `VARIETY.wordWeight`. No level gate; decoding games limit
length themselves. The same weighting draws move pads, gift, warm-up and word machine
words. Other pictures in a room (`distractorsFor`) start with other letters while the key
is new; once firm (`BANK_DRAW.firm`, only from `DIFFICULTY` 2) one shares its first
sound or rime. No key word repeats in an episode or sits on its pads. New words join the
round under way (`topUpBag`, `bagKnown`; saves older than `bagKnown` use
`LEGACY_BAG_WORDS`, `src/rules/bank.ts`); a removed word leaves it. The grown-ups page
(F9) shows the bag and coverage; F8 twice erases progress and the bag.

## Move words and the move bag (`src/rules/moves.ts`, ProgressStore `moveBag`)

`MOVE_WORDS` (`content/battle/roster/abilities.ts`) is every bank action and `both` word.
Reading a pad casts it: a teammate whose ability `words` answer fires the styled move,
else her hero fires the word's effect. POW and ICE (a thing) as ability flavour never go on a pad. The
partner says move words at the choice by design, so a villain line holding one gives
nothing away; only key words are protected.

The **gift word** (`drawGift`) is an action word from the move bag, never one said
before the battle, the helper's own words double; for a helper in `CASTERS` the bank's
`spell` words weigh `CASTER_SPELL_BOOST` (25), and only casters' scenes may call it a
spell. `planMoves` plans all four choices when the house is planned: each part's first
is the gift word, the rest from the move bag (left only on a right first pick). Each
choice shows 2 or 3 pads; wrong pads are other move words chosen by `distractorsFor`,
unshown ones first, then those still in her **pad bag** (`padBag`; a shown one weighs
`PAD_SHOWN_WEIGHT` 0.05). Planning up front keeps room keys off every pad and the counter
off `battle1Words`. A new move word is a bank word with role `action` (its `PICTURES`
brief feeds the super's fan and the recap), its `act(...)` effect, optionally a
teammate's ability `words` to style it; then the three commands.

## A word family (`content/phonics/families.ts`, the word machine)

The word machine (`src/scenes/WordMachine.ts`) teaches onset + rime: a picture, a rime on
its panel, letter tiles on the floor; a tile says its sound, green slots it, and the
machine says sound and rime apart, never blended. A wrong tile makes a silly word. A
visit is `WORD_MACHINE.rounds` words, up to `perFamily` from one family.

- **Families come from the bank**: a rime with a `RIMES` entry and two or more bank words
  with a single-letter onset. `Family.words` are its pictured words (the ones built);
  `Family.all` every such word, for silly-word checks. Blend or digraph onsets are in no
  family. A new word joins its family by itself; a new rime needs its `RIMES` entry.
- **A rime** is `{ say, silly }`: `say` the edge-tts spelling of the rime alone (one
  syllable, ~0.7 s; -ET is "Eht", "Ett" is read as letters); line `rime_<rime>`.
- **Silly onsets** must be nonsense: no word, name, slang, homophone or anything near a
  slur (no KAT, NAT, ZAP, YEN, JAN, NOX; never J or F before AP, N before IG, W before OP
  or OG); at least `tiles - 1` per family where possible. Each is a `silly_<word>` line;
  unit tests check them against the game's words and a block list.
- **Later modes** (`flip`, `real_or_silly`): `MachineMode` in `src/rules/wordMachine.ts`,
  a plan there and a branch at `startRound`.

## Letter sounds (`content/phonics/letters.ts`)

`say` is the edge-tts placeholder; Matt's recordings replace them line by line
(`npm run voice:clip -- letter_<x>_sound <file>`, `docs/recording.md`). SH CH TH CK are
one sound unit each (`DIGRAPH_SOUNDS`, `letter_sh_sound`): hints say one sound and light
both letters. No line says a letter's name (`docs/rulings.md`).

## A rune (Charge the Spell, `content/phonics/runes.ts`)

A `RUNES` entry is one sound unit she can charge: `rune(sound, tier, glyph, motion, text,
kind, color, extra)`. `tier` (1 continuous, 2 quick, 3 digraph) is a label only. The
narrator's sprite bobs while `glyph` (an emoji, never a bank word's picture) does
`motion`, saying only `letter_<sound>_sound`, which she says back. `text` is the gesture
in words, unvoiced, kept for a teaching mode (`docs/rulings.md`): it never names the
letter or spells the sound, and says no bank word but the /e/ rune's TAP and EGG
(`tests/unit/charge.test.ts`). The rest is the move her hero fires (no `pic_` art). It
adds no voice line (its sound's line is the letter's). A
new rune widens `CHARGE_WORDS` (`src/rules/charge.ts`: familiar pictured words of 3–4
units, all runes). Tuning: `CHARGE`.

Its picture letter: a `PICTURES` entry in `runes.ts` (`word`, a thing starting with the
sound; `look`, how it makes the letter's shape), art `rune_<sound>` on the stone, a done
Charge door and the battle's charged-move stone: `art:placeholders`, then `art:alts`
(README, *Picture letters*). Every sound in `CHARGE_WORDS` needs one
(`tests/unit/wordrules.test.ts`); its word is kept out of the reading where it is charged.

## The Stretchy Bridge's pictures (`src/rules/bridge.ts`)

Nothing per word: any familiar short-vowel thing up to `BRIDGE.maxUnits` can be crossed,
its far bank drawn from the same words. It needs pictures that **share a start and differ
later**: two sounds (MAP, MAT, MAN), else one (MAP, MOP, MUG), else the rime (CAT, HAT),
which the first letter can win. So a familiar picture beside a CVC word starting with a
held sound (M S F L N R V Z) is worth most. `LOOKALIKES` never stand together. A visit
plays hold-sound CVC first, then stop-sound CVC, then blends and digraphs. Lines are the
narrator's `bridge_*` (none says a letter or a word).

## The home warm-up (`GRAB` in `src/config.ts`, `src/rules/grab.ts`)

Any short pictured bank word (`GRAB.maxUnits`) can be asked for, by shakiness times
coverage, never one of her last 3 grabs. `GRAB.startLevel` is where a new word starts
and, at base `DIFFICULTY`, stays (1 and 2: sounds with the letters shown; 3: sounds
only; no level says a letter's name or the word). `GRAB.helpAfter` is misses before the
slow sound-out with letters; `GRAB.objects` how many pictures stand in the hall
(`ENTRY_HALL.spots`, `content/house/house.ts`, has a place for each).
