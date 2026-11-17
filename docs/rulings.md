# Rulings (Matt)

Matt's standing calls that no other doc holds. The design law is in `CLAUDE.md`
(*Standing design rules*); how to apply a tuning request is in `docs/content.md` (*Matt
says X → run Y*). A call made on a bug hunt keeps its id (`M<n>`), which code comments
cite; the open hunt's table is in `docs/qa-findings.md`. A call kept as it was ("keep")
is a ruling too: do not "fix" it.

## Words

- **Phonics first.** Word choices serve her phonics, erring toward phonetic diversity; a
  word may use sounds the game does not teach yet (`UNTAUGHT_SOUNDS`, `content/phonics/letters.ts`).
- **The bank has enough variety.** No new words unless Matt asks; a rare or ambiguous word
  is stored (`STORED_WHY`), not deleted. XRAY stays X's first word, stored. MAT stays a
  bridge word, though it sounds like "Matt". Plural key words may come later.
- **An action word is never a picture she picks** (`role: 'action'`: DRIP, BLAST, the move
  and spell words). Every picture pool draws from `THINGS`; `?sentence=` takes only a
  pictured key. Its picture stays where nothing is picked: the cook-off's dish, the
  super's fan (`wordFx`), the recap card. `tests/unit/bank.test.ts` holds the pools to it.
- **No letter names in clues, hints or teaching lines**, at any level (`docs/episode.md`).
- **A sound played whole stays off the bridge's blends** (M78): a word crosses the
  Stretchy Bridge only when each `whole` sound (now F's "fuh") comes straight before a
  vowel (`wholeFits`): FAN FOX FISH cross, FROG FLAG GIFT ELF do not. It follows the
  flag, so a sound made `whole` later is kept out the same way.
- **A backdrop never paints its room's counter word** (M85): a room's `pictures`
  (`content/house/house.ts`) stay out of the attic's counter there (`notCounter`); a new
  counter room's art lists the bank words it paints. A door
  sign is no letter shape and no bank word's picture (M84: the bakery is 🧁).
- **Sentence frames** (M23, M41, M53, M49): a number word is a key only in a frame marked
  `numbers`, never after A nor in a counter frame. MOM, DAD, ZOO and HAND are never fetch
  keys (`NOT_FETCHED`); counter frames keep MOM and DAD as a joke. RAN AWAY FROM THE never
  draws ZOO. RUN and CAN are readable (`framesClear`, M40).
- **MOM and DAD never go in her bag** (M45, `NO_BAG_COPY`): read and recorded, never
  fired; the warm-up never draws them.
- **Said counts as said** (M57, M11): the warm-up word less its first or last sound counts
  as said (`grabSays`: CLOCK says LOCK); a compound head in a line (`COMPOUND_HEADS`:
  LOLLI, M16) too.
- **Lines are complete sentences, contracted as speech is** (M10, M12, M18, M31: "it's",
  "didn't"): no "Look!" at something not drawn; a
  reformed villain's line is a whole sentence ("I have gold coins for everybody!") and
  never the ending's own closing line.
- **Last episode's reads wait** (M37, M77): the Shape-Shifter, Charge, the word machine
  and the bridge prefer words not read the episode before (`LAST_READ`, `unreadFirst`).
- **Shape-Shifter chains** (M29, M36, M39): scored by the places they change (two count as
  three; all three, the vowel too, twice as likely in the draw, `THREE_PLACES_WEIGHT`); a read-it link at the vowel or last letter where it can; a
  chain sharing a link with the last six waits (`SHIFTER.recentChains`, `CHAINS_KEPT`).
- **Rhyme room** (M71, M66): a nasal near rhyme (CAT... ANT) is a lean against
  (`nasalNear`), not a rule; BUSH is stored (its U is PUT's).
- **Pictures in battle may show a later word** (M51, kept): a picture is not the printed word.

## Play and pacing

- **Games rotate strictly.** No side room plays a game either side room played last
  episode while another fits; the attic never plays last episode's frame. Quest places
  may repeat (M43, kept).
- **No keyboard answers.** Selection stays walking and green; A–Z stays spelling's.
- **No game needs Dad beside her, no step waits on him forever:** with his presses missing,
  "say it with me" solo turns on and solo reads count as modelled. Solo lasts the page
  session until he presses (his 2 at THE END does not end it); his yes during a solo read
  records `helped` (M34).
- **She can walk while a room talks** (M3); green waits. After 4 s still in a move choice,
  the stick hint (M5, `STICK_HINT_MS`).
- **Charge the Spell** (M24, M61, M62, M83): two words a visit, every letter sound and her
  say-back kept, dead time cut; Dad's press from the last rune lit is kept for the read.
  In battle the runes fire as one volley, `RUNE_GAP` apart, with a 250 ms beat between one
  rune's sound and the next (`RUNE_SOUND_BEAT_MS`), so the sounds never run together.
  Checker budgets: 42 s, solo 68 s (M38).
- **Rhyme room keeps three rounds** (M64), dead time cut; long instructions on round 1 only.
- **Shape-Shifter** (M26, M30, M42, M46): the full instruction the first time each beat
  comes, then "Read it!" / "Fix it!". Fix-it praise "You made it match!" / "You got the
  right letter!", never "by yourself" after help. A stone sounding itself lifts its letter
  beside her head. The read praise before a fix-it link stays.
- **Battle opening** (M28, M63): a room's earlier words fly as one volley; part 1's villain
  floor starts at 75% and steps down 12 points per super and the combo, to 45%.
- **Fight style is the villain's own** (`fight` on his roster entry, `brawl` with none),
  with two exceptions, in order: Evil Smaug drawn freely plays his story fight about half
  his episodes (`STORY_FIGHT`); otherwise chef Dada Jason as ally brings a cook-off 70% of
  the time (`fightNudge`). `?fight=<id>` fixes it.
- **The word machine:** blend and digraph families wait until she reads blends. Later
  modes Matt wants: flip it, and real or silly.
- **Charge's gesture texts stay** (`text` in `RUNES`) while a teaching mode is wanted;
  they are not composed into `lines.json`, and unvoiced their words do not count as said
  (`gestureWords`). What a gesture shows still counts.
- **Story-fight staging** is generalised only when a second story fight is written.
- **The named-counter boost stays** at 6× (`NAMED_COUNTER_BOOST`).

## Battle layout

- **Move choice** (M1, M6, M7, M8, M17, M65, M75, M76, M54): the caption hides the word
  (USE …!). The team, and a villain still for a second, step off the pads; in a contest
  no sign covers the villain or the held team, and two pads when three cannot keep off
  it (`placeContestPads`; a word with no pad stays in the bag). Her side first (`placePads`); behind the villain in a brawl she
  steps out (`stepOutX`). Pads keep off a clash point (`choiceKeepOff`); in a story fight
  no pad opens within her reach (`storyProps` second).
- **Kept as they are:** the camera punch and shake moving the HUD (M47).
- **Flashes start at half strength** (M60, `FLASH_ALPHA`).
- **The Crushing Coil is a snake under the fighters** (M81, `COIL_DEPTH`): a tapered body
  and head round the heroes' feet, never discs over faces.
- **Story fight** (M56, M74): "He missed us! Phew!"; the gold guards topple past her.

## Screens

- **Sentence banner** (M4, M82): two rows at 56 px before one row shrinks (`TWO_ROWS_PX`);
  under two rows or more the pictures stand at the square's height (`bannerRows`).
- **Dialogue box** (M13, M59): the lines that send her walking take a narrow box where it
  covers least, the pictures counted with her. The victory box may cover VICTORY! (M14).
- **Pictures** (M48): standing people and wide pictures fit their own aspect with the
  square's area (`src/art/pictureBox.ts`). TAP is a running faucet (M21); the other
  M21 pictures stay. Art outlives scenes (M22, kept: bounded, no reload needed). A
  network-lost picture is asked again later (M25).
- **Decals** (M58): a decal with no clear spot is not drawn; the hall keeps her start clear.
- **Bridge chasm** (M52): its colour leans to the floor, its top edge fades.
- **Voice manifest missing** (M19): captions from `lines.json` (`captionsOnly`).

## Cast

- **Allies are drawn equal per person** (a dad with many forms is one person).
- **Heights** (M32, M35, M73): each outfit's `fill` keeps her one height; Moriarty 1.3;
  `CAST_SCALE_MAX` 1.7 for giants on the victory podium and table.
- **Podium** (M50, M70): the waker cheers left of it, a second dad right (`podiumCheer`,
  `podiumCheerRight`); `phonicsFace` shows Dada Matt only when he is in the episode (M2).
- **Props and art** (M55, M68, M67, M80): Ellie's bubble is `prop_bubble`; the lifter's
  is a medal, Seraphina's a dragon scale, the builder's castle stays; rune K kept; Evil
  Elsa's snowmen are `minion_snow_grump`; MAT, PAN and ROCK (M9), the story props (M33),
  COT and DOT (M79) are Matt's picks. Ellie's sword word stays ZIP; Seraphina's pink
  dragon stays a Dragon Call summon (`dragon_call`). "Bough to your queen!" stays.

## Grown-ups and dev

- A `?scene=victory` jump records the victory rotation and counts an episode (M15, kept).
- Page 2's grid lists the action words grey until met; page 1's first-sound table has one
  VOWEL row (M69). Two tabs: a `storage` listener re-reads the store (M72).
- An unplugged controller is Matt's check for a drifting stick (M20); a stalled page is
  watched, not chased unless it recurs outside the checker (M44): `docs/tools.md`, *The
  bug-hunt checker*.

## Tunables Matt may want

- `DAD_AWAY_MS` (how long a room waits for Dad before going solo); the draw weights in `src/config.ts`: `SHAKINESS`, `NAMED_COUNTER_BOOST`,
  `CASTER_SPELL_BOOST`, `PAD_SHOWN_WEIGHT`, `RECENT_GRABS`, `FIT_WEIGHT`, `CAST_SCALE_MAX`.
- Solo Charge's "Say it with me!" on every rune (now) or the first only (M38's option b).

## Disk

- Keep `public/voice/` in git history: no history rewrite (`docs/engineering.md`).
- Keep all of `art-originals/`, `restore/` included.
- Leave the machine-wide npm and Playwright caches and the run logs alone.

## Known leftovers

- The `say` fields identical to their `text` (`content/voice/script.ts`) are redundant;
  they go with the next voice build (removing one re-synthesises its line).
- Debug runs still count taunts.

## Code

- **The battle hosts' scene stays `stage`** (`BattleWorld.stage`): `scene` would clash
  with Phaser.Scene's own; a host adapter is not worth the risk for a name.
