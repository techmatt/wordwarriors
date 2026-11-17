# Systems in detail

The inside of the bigger systems in `docs/systems.md`: names to grep, knobs, hooks.
Where the code disagrees, the code wins.

## Art on demand

`artBank.ensure(ids)` / `prefetch(ids)` fetch each `public/art/<id>.png` once (high
priority for a scene about to show), decode it and add it to the textures. A missing file
or lost fetch gets the magenta square, retried by `retryFailed`, swapped in by `applyHeld`.
`artFor(sceneKey, draw)` lists a scene's art. `startScene` starts at once when the art is
in, else behind the Wait scene (`voiceBank.pauseWhile` meanwhile); each scene's CREATE
prefetches the scenes that can follow. Art read before it loaded warns `art: not ready
<id> (<scene>)` (`art-late` in the checker, an error in `collectErrors`). `__ww.art()`:
missing textures, magenta ids, late asks, loads in flight.

## Episode flow

Steps: title → (choice mode's picks) → bedroom → entry hall → house 1 → battle 1 → house
2 → battle 2 → victory. `Episode.ts` holds the flow and re-exports: `state.ts`
(`episode`, `steps()`, `sceneForStep`, `isStepKind`); `draws.ts` (cast draw:
`setCastOptions`, `castEpisode`, `rememberCast`, `resetEpisode`, `chooseAlly`,
`chooseVillain`); `cast.ts` (`waker`, `helper`, `narrator`, `castArt` / `castFace`,
`villainSpec`…); `plans.ts` (`giftWord`, `movePlan`, `housePlan`, `grabPlan`,
`fightStyle`, `journeyStops`, `roomGames`, `debugPlan`, `rememberPlan`). `drawStory`
gives `questSetupLine()` / `hubScene()`; `storyWords()` keeps their words out of every
draw. Default episode `EPISODE_DEFAULTS`; parked kinds only by `jumpTo`. The four never
import `Episode.ts` or Phaser, so draws run in node (`tests/unit/episodeDraws.test.ts`).

## Grown-ups page

Per sound, word and frame: tries, first-try-right rate, tries since opened, `+n` solo
reads; colour is the draws' shakiness. Green / Space steps pages: 1 sounds (first sounds
by `firstSoundTag`, one `vowel` row), warm-up, frames, bag, coverage; 2 every word in
play, grey until met, bridge levels; 3 stored words with reasons, `odd` things. Red / Esc /
F9 returns to the scene it came from with its data.

## Voice data

Groups `core`, `phonics`, `nar_<narrator>`, `fighter_<fighter>`, `end_<person>`. One
queue, `DECODE_SLOTS` (12) at a time; background clips take at most `BACKGROUND_SLOTS`
(4) at `low` priority so art and urgent lines are not stuck behind them; `ensure` jumps
the queue at `high`. Boot awaits only the manifest; a fetch is dropped after 15 s wall
clock. VoiceBus waits `ENSURE_TIMEOUT_MS` (4 s), then shows the caption alone for the
line's estimated length. No manifest: mute, captions from `content/voice/lines.json`.

## Dialogue box

Beside the speaker's framed face, top or bottom, whichever covers less of the scene's
`avoid()` (rooms: `RoomScene.keepOut()`). `track(id, where)`: face on the speaker's side,
glow at their feet. `mode(u)`: `show`, `portrait` (face only: banner and recap light their
own words) or `hide` (`uncaptioned()` ids: `letter_*`, `sent_*`). `compact` in battle.
`narrow(u)` (lines that send her walking): a 320 px box, up to four rows, then wider boxes
(`NARROW_WIDER`). A `phonics` line shows Dada Matt's face only when he is in the episode on
her side (`phonicsFace`). The sentence banner (`src/ui/banner.ts`) stretches its band to
its rows (`bannerPanelWidth`, `inkOf`; checker `text-off-panel`). `__ww.texts()` lists
visible texts with `offscreen`.

## Walking rooms

`RoomScene` is the base for the bedroom, entry hall, hub, Debug, Pick, retreat and every
side room. A room's await chain stops when its scene ends (`guard()`, SceneGen); a room
whose yellow or green can interrupt its own chain keeps a `flow` token, bumped per chain
and checked after awaits (Shifter, Bridge, Rhyme). Shared: `giggle()`, `doorGlow()` /
`sparkleSpot()`, `nearestSpot()` (use it, not a copied reach loop). A spot with `correct:
true` is what F4 walks to. Stick hint: before she first moves, and after `STICK_HINT_MS`
still in a move choice. Player moves one axis at a time against the floor rectangle.

- **Bedroom:** `BEDROOMS[0]`; the waker's `wake_*` lines, the other dad
  (`wake_<dad>_hi` half the time), the helper's `questSetupLine()`, the mood reveal, each
  `BedroomObject`'s `reaction` + `sound` on green, the door after `DOOR_SPARKLE_MS`.
- **Hub:** phases `intro → circle → doors → secret → front → leaving`. Part 1: story scene,
  its `prop` with the gift word, the `circle` spot (`src/world/giftSpot.ts`), doors `a` and `b`. Part 2: the attic's `counter` door. Backdrop
  `hubArt(episode.place)`; away from home the way out is `prop_portal`, lines `away_*`.
- **Entry hall:** `grabPlan()` draws the word (`pickGrab`, clear of `saidBeforeBattle`),
  then the house plan (the word in `saidBefore`), then the pictures (`hallObjects`).
  `clue(word, level, help)`: the sounds by unit (`show` writes letters on the board), never
  `word_<w>` nor a letter name; after `GRAB.helpAfter` misses, the sounds alone
  (`HELP_GAP_MS`). Right: `record('grabs')`, `setRampLevel('grab', …)` (`stepLevel`), onto `episode.fetched`.
- **House mood:** `applyHouseMood(scene, villainId, { seed, floor, reveal, calm, avoid,
  floorOnly })`: tint, `decal_<id>` scatter (`scatterDecals`, deterministic per seed, off
  doors and spots, none drawn without a clear place), ambient `fx`. `calm` (live side rooms,
  entry hall) keeps it still while she reads; `floorOnly` for outdoor places. Returns
  `{ revealed }`.

## Minigame pool and rooms

`MINIGAMES`: id, `kind`, scene, pedestal `glyph` / `name`, weight, slots. Only sentence
games take the counter slot. `drawGames`: two fetch games and a counter game, no repeat;
recent games (`recent.games`) weigh `VARIETY.gameWeight`, each kind leans by `LEAN`.
`episodePlans` runs each planner (`PLANNERS`, `PLAN_ORDER`: machine, bridge, shifter,
rhyme, charge) into a `RoomPlan`. Key words: three by `drawKey` from her word bag
(`BAG_WORDS`), never the gift word, a pad word (`moveWords`), a word a sentence shows, or
one said before (`saidBefore`, `saidEarly`); the counter word never a fetched word.
`Episode.counterWord` / `namedCounter` / `counterArt` read the attic's plan.
`tests/unit/plansGolden.*` pins the seeded draws. Overrides: `?game=`, `?games=sentence`,
`?room=<kind>`, `FORCE_PHONICS_ROOM` (`roomGames`).

## Side rooms

`SideRoom`: `wrongTries`, no-fail `wrong()`, `sparkleAnswer`, `ARRIVE_MS`, `INK` / `LIT`,
`sidePlan(scene, slot, kind)`. `HouseSideRoom`: `enter`, `backToHubSoon` / `fadeToHub`,
`recordRead` / `recordModelled`, `bagCopy`, `wordArt`, misses and help kept across F9
(`keepMisses`, `keepAided`), `openDad` / `closeDad`, the wait for Dad (`askDad`,
`dadAway`). Solo mode (`episode.solo`, `?solo`) when Dad does not press.

- **Sentence:** `listen` skipped when `skipsListening` (`frameIsSolid`, `DIFFICULTY` 2+).
  Right: prefix line + `word_<key>`, picture into the Bag, record `words`, `frames`.
- **Word machine:** `planMachine`: words from the bag, one family then another, leaning to
  shaky `rimes` and `onsets`. Tiles say their sound near her (`onNear`); green →
  `letter_<x>_sound`, `rime_<r>`. Wrong: `machine_makes` + `silly_<w>`. Hook `room.machine`.
- **Charge the Spell:** `planCharge`: `CHARGE.words` rounds from `CHARGE_WORDS`, runes the
  word's sounds, clear of what the gestures show (`gestureWords`). `sayAllSounds`, then per
  rune the gesture and the sound (`RUNE_BEATS`), then Dad's yes / no on her read.
  `episode.charged` keeps the sounds; `useCharged` fires them in battle. Hooks
  `room.charge`, `battle.runesFired`. No help ramp.
- **Stretchy Bridge:** `planBridge`: `BRIDGE.words` from `CROSS_WORDS` by `bridgeEase`.
  `bridgeLevel`. Stones per sound unit (`gapFor`), each sound held by `voiceBus.hold` while
  she stands on it; Dad's buttons at levels 2–3, solo after `DAD_AWAY_MS`; a wrong picture
  explained by `whereDiffers`. Hook `room.bridge`.
- **Shape-Shifter:** `SHIFTER_ROOM` puts it behind door b in 3 episodes in 7. Row,
  entry (`entryOf`) and `rowKeepClear` from `optionRow.ts`, shared with the rhyme room.
  `planShifter`: `SHIFTER.links` links through `SHIFT_WORDS`, one letter a link, fresh by
  `recent.chains`; `beatFor` makes each link read it (`wrongPictures`) or fix it
  (`stonesFor`). Misses through `soundLines`; right: `morph`. Hook `room.shifter`.
- **Rhyme room:** weight `RHYME.weight`. `RHYME_FAMILIES` (`things` printable, `actions`
  only shown). `planRhyme`: printed word, `shownFor` the cards, `wrongPictures`;
  `rhymeShown` / `rhymeSays` kept out of later keys. Yellow `rhyme_listen` and the
  sound-out. Hook `room.rhyme`.

## Debug mode, dad lock, Dad's buttons

Key 0 (`toggleDebug`) in `DEBUG_ROOMS` (hub, entry hall, every `MINIGAMES` scene) starts
`Debug` from `debugOrigin()`: a pedestal per `DEBUG_GAMES` entry and the door out. A run is
sandboxed: `beginRun` holds the store (`ProgressStore.hold` / `release`), copies `episode`,
plans with `debugPlan`; `backToHub` / `advance` go to `debugBack`, which restores and
checks it off. DOM `#debug-tag`; hook `room.debug`.

Dad lock (`installDadLock`): `Controls` drops every button edge but directions (not on the
grown-ups page), `TextEntry` drops letters, idle help and move-choice prompts wait. DOM
`#dad-lock`; hook `__ww.dadLock(on?)`. `openDadButtons(fn)` returns the closer (close on
SHUTDOWN); DOM `#dad-buttons`, lit by `setDadAsking(true)`; tests `__ww.dad('yes')`.

## Cast, story, variety

- **Cast:** `drawCast({ hero, recent, recentAllies, recentForms, overrides }, rand)`: dads'
  forms, villain, ally, primary and secondary dads, each avoiding recent picks. Odds
  `CAST_ODDS`. Heights: `adultHeight`, `outfitTall` / `outfitFill` (`DRESS_FILL`). Outfits
  (`outfitFor`, first match wins) feed `castArt` / `castFace`.
- **Story:** `drawStory`: quest line and hub scene variants (always 1 for
  `?cast=default`; the last sits out). Ids `hub_<owner>_<n>_<key>`, `quest_<owner>_<n>`; a
  helper without its own uses `ANY_SCENES` / `HOME_QUEST` in the narrator's voice.
- **Variety:** `fresh(pool, recent)` (recent picks sit out while two are left),
  `leastRecent`, `lastRead`, `unreadFirst`. `rememberCast` and `rememberPlan` write
  `recent`: only free draws, never URL-forced ones. Endings: `pickEnding`, the last
  `VARIETY.rotations` sit out; `?ending=<id>`; `endingScript` four barks.
- **Line variants:** `variant(key)` in turn across episodes (variants by `lineVariantKeys`).
  `pickTaunt` says the least-said taunt, at most `TAUNT_MAX` (2); `unsayTaunt` takes one
  back. Big moves are called out once a part (`calledOut`).

## Words and moves

- **Word bank:** `tag()` gives `units`, `level`, `vowel`, `onset`, `rime`. `wordWeight` =
  shakiness × coverage (least-met vowels, onsets, levels) × recency; every word is in play.
  `distractorsFor`: other first letters while new, a shared onset or rime once `isFirm`.
  `COVERAGE` measured by `coverageRows`; `tests/unit/coverage.test.ts` fails on a gap.
- **Moves:** `drawGift`: an action word, the helper's own moves weighted double, not spent.
  `planMoves`: four choices, 2–3 pads, the gift first in each part, others from `moveBag`;
  `ownerFor`: the gift is her hero with the helper's move, a teammate's ability word that
  teammate's move, else her hero with the word's effect. `battle1Words` feeds the counter.
- **Difficulty:** `helpLevel(recorded, start)` for `grabLevel`, `bridgeLevel`,
  `shifterLevel`, `rhymeLevel`; `rampsAdvance()` gates `skipsListening` and `isFirm`.
- **Recap:** nine cards; past nine, the gift, move words, counter and after, and each side
  room's last word stay; the earliest of the rest fill the rest.

## Progress

Kinds `sounds` (letters, SH CH TH CK), `words`, `spelling`, `frames`, `rimes`, `onsets`,
`grabs`; bags `bag`, `moveBag`, `padBag`; levels `grabLevels`, `bridgeLevels`,
`shifterLevels`, `rhymeLevels`; `recent`. A missing kind loads empty; a stale
`chargeLevels` is dropped. `topUpBag` adds new words mid-round, drops retired ones. A
`storage` event (another tab) calls `reload()`; a newer build's blob stops this tab
writing; under `hold` it replaces what `release` restores.

## Battle

`BattleScene` owns the clock (`now`), phase, banner, move choice and give-away checks
(`textGivesAway`), and implements every host (`BattleWorld`, `StageHost`, `ChoiceHost`,
`StoryHost`). `BattleSim`: `think()`, `hit()` the one damage path (`HEALTH_FLOORS`,
`PART1_VILLAIN_FLOOR`), projectiles, taunts, `separate()`. `BattleVolleys`:
`useAllFetched()`, `useCharged()`. `BattleBeats`: combo, `wordFx`, ultimate, `finish`.
`MoveChoice`: pads (`padPlace.ts`: `placeContestPads`, `choiceKeepOff`). `ownerOf(owner,
word)`; `ambience()` (`ARENAS`).

- **Fight styles:** `makeStage(kind)`; `BaseStage` (brawl) does nothing; `RaceStage`,
  `TugStage`, `ClashStage`, `CookoffStage` place fighters (`steer`), dress the arena, draw
  their meter (`drawHud`), stage `ultimate1`, `counter2`, `finish`. Hooks `battle.fight` /
  `.stage`.
- **Story fight:** the script's beats in order (`storyLine` ids); `StoryStage` holds
  everyone on `STORY_MARKS`, no bars; pads off the props (`storyProps()`); walks are
  `StoryWalk` (real time). `?fight=<id>` forces the style's villain.
- **Free play:** `FreePlay.update(controls, dt, body, open, { green, cast })`; shots capped
  (`FREE_PLAY.maxShots`); never reaches `hit()`. Tests read `__ww.state().play`.
- **Juice:** `flash` at most once per 450 ms, from `FLASH_ALPHA` (half). `fitPicture`:
  `SHAPED_PICTURES` keep their aspect (long side ≤ `PICTURE_STRETCH`), others the square
  slot. The battle's `FpsMeter` measures every 500 ms and moves `fxQuality`.

## Tools

- **Voice build:** `lines.json` one object per line. edge-tts via a `uvx` worker pool
  (`EDGE_TTS_PIN`); `align.ts` puts word timings on the shown text, strictly (a misalignment
  fails the build); `carrier.ts` cuts a sound out of a carrier word. `voice:lines` refuses
  duplicate ids; `tests/unit/rules.test.ts` checks the game's ids exist.
- **Voice import:** README, *Matt's recordings*. The recorder page ports `SPLIT` /
  `countTake` / `countReason` between `detector:begin` and `detector:end`;
  `tests/unit/voiceImport.test.ts` runs both. Clips install through `installClip`.
- **Listen-through:** its own Vite entry; `listenWords()` covers every live sound (`HARD`
  ones twice), each word sounded out and said whole.
- **Variety simulator:** the episode's own draws on one store; `Math.random` seeded, so a
  seed replays.
