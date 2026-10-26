# Rulings (Matt)

Matt's standing calls that no other doc holds, one line each. The design law is in
`CLAUDE.md` (*Standing design rules*); calls made during a bug hunt are in
`docs/qa-findings.md` (*Matt's calls*); how to apply a tuning request is in
`docs/content.md` (*Matt says X → run Y*). A call already recorded there is not repeated
here.

## Words

- **Phonics first.** Word choices serve her phonics, erring toward phonetic diversity; a
  word may use sounds the game does not teach yet (`UNTAUGHT_SOUNDS`,
  `content/phonics/letters.ts`).
- **The bank has enough variety.** No new words unless Matt asks; a rare or ambiguous
  word is stored (`STORED_WHY`), not deleted.
- **XRAY stays X's first word**, stored now (she has no idea of an x-ray).
- **MAT stays a bridge word**, though it sounds like "Matt".
- **Plural key words** may come later, as a special case.
- **An action word is never a picture she picks** (item 137, amendment 4095). DRIP, BLAST
  and the other move and spell words (`role: 'action'`) are words and powers (pads, the
  gift), never a picture in a choice nor what a picture choice asks for: she cannot get a
  word like DRIP from its picture. Every picture pool is drawn from `THINGS` (no pure
  action word); `tests/unit/bank.test.ts` and the variety simulator check it, and
  `?sentence=` takes only a pictured key.
- **An action word's picture stays where nothing is picked** (Matt, 2026-10-23): the
  cook-off's dish, the battle super's fan (`wordFx`), the recap card. Only picture
  choices exclude action words.
- **No letter names in clues or hints** (item 137): phonics only. Hearing a letter's name
  beside its sound confused her, so no clue, hint or teaching line says one, at any level:
  the warm-up's clue is the sounds alone, the Shape-Shifter's hints and misses the plain
  sound, and the bridge from a name to its sound ("R's name is Ar... squeeze off the
  front") is gone with the name lines (`docs/episode.md`, *No letter names*).

- **A sound played whole stays off the bridge's blends** (hunt 12, M78, item 165): a word
  crosses the Stretchy Bridge only when each sound flagged `whole` (`content/phonics/letters.ts`;
  now F's "fuh") comes straight before a vowel (FAN FOX FISH, not FROG FLAG GIFT ELF). It
  follows the flag: a sound made whole later is kept out the same way.
- **What a room's backdrop paints is never its counter word** (hunt 12, M85, item 165): a
  room's `pictures` (`content/house/house.ts`) are kept out of the attic's counter there,
  as the doors' signs are kept out of words. A new counter room's art lists them.
- **A door sign is no letter shape and no bank word's picture** (hunt 12, M84, item 165):
  the bakery's 🥐 read as a C; it is 🧁.

## Play

- **A beat between the battle's runes** (hunt 12, M83, item 165): 250 ms
  (`RUNE_SOUND_BEAT_MS`) from one rune's sound ending to the next starting, so a word's
  sounds never run together.
- **A standing person never drops the sentence room's row** (hunt 12, M82, item 165): under
  a banner of two rows or more, the pictures stand at the square's height, so the find box
  has a clear place.

- **Games rotate strictly** (item 137). No side room plays a game either side room played
  last episode while another fits (every fetch frame is the one sentence game), and the
  attic never plays last episode's frame (`docs/episode.md`, *Variety across episodes*).
- **No keyboard answers.** Selection stays walking and green; A–Z stays spelling's.
- **No game needs Dad beside her, and no step waits on Dad forever:** with his presses
  missing, "say it with me" solo mode turns on, and solo reads count as modelled.
- **Fight style is the villain's own, with two exceptions** (`fightStyle` in
  `src/episode/plans.ts`, `pickFight` in `src/rules/fights.ts`), never drawn from the pool
  of styles. Each villain's own is `fight` on his roster entry, `brawl` with none (of the
  live villains Evil Tiamat brawls; the others each have one). Exceptions, in this order:
  Evil Smaug, when drawn freely (not fixed by `?villain=` or a pick), plays his story
  fight (`storyFight`) about half his episodes (`STORY_FIGHT`: 0.75 after an episode
  without it, 0.25 after one with it); otherwise, with chef Dada Jason as the ally
  (`fightNudge`; not his warrior or warlock form), a cook-off 70% of the time, whoever the
  villain. `?fight=<id>` fixes it (a story fight forces its villain).
- **The word machine:** blend and digraph families wait until she reads blends. Later
  modes Matt wants: flip it, and real or silly.
- **Charge the Spell's gesture texts stay** (`text` in `RUNES`; the gesture is shown with
  the sound only since item 058) while a teaching mode is still wanted. They are no longer
  composed into `lines.json` (item 133): a teaching mode would compose and voice them again.
  Unvoiced, their words do not count as said (item 156): the /e/ rune's TAP and EGG are
  read like any word, and a teaching mode voicing the texts would have to count them again
  (`gestureWords`, `src/rules/charge.ts`). What a gesture shows still counts.
- **Story-fight staging** is generalised only when a second story fight is written.
- **The read praise before a Shape-Shifter fix-it link stays.**
- **The named-counter boost stays** at 6× (`NAMED_COUNTER_BOOST`).

## Cast

- **Allies are drawn equal per person** (a dad with many forms is one person in the draw).
- **Ellie's sword word stays ZIP.**
- **Seraphina's pink dragon stays a Dragon Call summon** (`dragon_call`), not art on her.
- **The Crushing Coil is a snake under the fighters** (hunt 12, M81, item 165): a drawn,
  tapered body with a head on the floor round the heroes' feet, below every fighter, never
  discs over their faces.
- **"Bough to your queen!" stays** (Evil Tiamat's `say` respelling of "Bow").

## Tunables Matt may want

- `DAD_AWAY_MS` (`src/config.ts`): how long a room waits for Dad before going solo.
- The draw weights item 153 gathered into `src/config.ts`: `SHAKINESS`, `NAMED_COUNTER_BOOST`,
  `CASTER_SPELL_BOOST`, `PAD_SHOWN_WEIGHT`, `RECENT_GRABS`, `FIT_WEIGHT`, `CAST_SCALE_MAX`.
- Solo Charge's "Say it with me!" on every rune (now) or the first rune only (hunt 8,
  M38's option b).

## Disk

- Keep `public/voice/` in git history: no history rewrite (`docs/engineering.md`).
- Keep all of `art-originals/`, `restore/` included.
- Leave the machine-wide npm and Playwright caches and the run logs alone.

## Known leftovers

- The `say` fields identical to their `text` (`content/voice/script.ts`) are redundant; they come out with the next voice build (removing one
  changes the line's text, so re-synthesises it).
- Debug runs still count taunts.

## Code

- **The battle hosts' scene stays `stage`** (`BattleWorld.stage`, item 153): `scene` would
  clash with Phaser.Scene's own `scene` (its ScenePlugin), and BattleScene implements every
  host itself; a host adapter is not worth the risk for a name.
