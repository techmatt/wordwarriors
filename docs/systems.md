# Systems: where each thing starts

| System | Entry point | Notes |
| --- | --- | --- |
| Boot | `src/main.ts` → `src/scenes/BootScene.ts` | Loads every art id in `content/art/assets.ts`, makes particle textures, reads the voice manifest, handles `?scene=`. |
| Episode flow | `src/episode/Episode.ts` | The step list (bedroom → house 1 → battle 1 → house 2 → battle 2 → victory); `advance(scene)` starts the next step's scene. Inside a house step the hub and its rooms hand over with `enterRoom(scene, slot)` / `backToHub(scene, from)`. `narrator()` decides who speaks instructions, `helper()` who teaches the spell and fills `{helper}`. `housePlan()` makes the episode's three `RoomPlan`s once. `episode.fetched` (key words, in order) and `episode.spell` feed the battle. Cast from `EPISODE_DEFAULTS` (`src/config.ts`). Parked v0.1 kinds (`alarm`, `prep`, `retreat`, `spell`) are reachable only by `jumpTo`. |
| Input | `src/input/Controls.ts` | Create one per scene in `create()`; call `update()` first and `endFrame()` last in `update()`. `virtualPad` is the test input. |
| Spelling keys | `src/input/TextEntry.ts` | `openTextEntry(fn)` while a spelling scene is open; returns the closer. |
| Voice data | `src/voice/VoiceBank.ts` | `voiceBank.loadGroups([...])`; groups are `core`, `phonics`, `nar_<narrator>`, `fighter_<fighter>`. |
| Voice arbiter | `src/audio/VoiceBus.ts` | `voiceBus.say(id, 'instruction' \| 'bark', anchor?)`. The only way to speak. Caption and Bubbles listen to it. |
| SFX | `src/audio/sfx.ts` | Synthesised; one master gain, ducked while a voice line plays. |
| Music | `src/audio/music.ts` | Synthesised step sequencer: `startMusic('title' \| 'room' \| 'battle')`, ducked under speech. |
| Journey map | `src/scenes/JourneyScene.ts` | Shown by `advance()` before battle and victory steps (`JOURNEY_BEFORE`); `?nojourney` skips it. |
| Frame safety net | `src/main.ts` | `Phaser.Game.prototype.step` wrapped so one throwing frame cannot stop the loop. |
| Captions | `src/ui/Caption.ts` | Instruction lines along the bottom, spoken word highlighted, speaker portrait. |
| Bubbles | `src/ui/Bubbles.ts` | Barks over a moving anchor (`{x, y, bubbleOffset, active}`), e.g. a `Fighter`. |
| Walking rooms | `src/world/RoomScene.ts` | Base for picks, the bedroom, the hub, the parked games. Subclass: `background()`, `build()`, `choose(spot)`, optional `hint()`. A spot with `correct: true` is what F4 walks to. |
| Bedroom | `src/scenes/BedroomScene.ts` | The wake-up. Plays `BEDROOMS[0]` (`content/house/house.ts`): the waker (Dada Matt, or Dada Jason when he is the hero) gives the `wake_*` lines, the villain's mood reveals, each `BedroomObject` does its `reaction` + `sound` on green, the door sparkles after `DOOR_SPARKLE_MS`. No text, no reading. |
| Hub | `src/scenes/HubScene.ts` | Phases `intro → circle → doors → secret → front → leaving`. Part 1: the spell lesson (`spellFor`) in the magic circle, then doors `a` and `b`; part 2: the secret `counter` door (the attic). Front door opens when the part's rooms are done. Restarted on each return, so all state is read back from `episode`. |
| Sentence game | `src/scenes/SentenceRoom.ts` | A `Minigame` per side room, from `planFor(slot)`. Passes `listen` (skipped when `frameIsSolid`) → `read` → `find` → `done`. Right: prefix line + `word_<key>`, the picture flies into the `Bag`, `progress.record` for `words` and `frames`. Then `backToHub`. |
| House mood | `src/world/houseMood.ts` | `applyHouseMood(scene, villainId, { seed, floor, reveal })`: the villain's `CharacterSpec.house` tint, `decal_<id>` scatter (deterministic per seed, kept off doors and spots) and ambient `fx`. `reveal` is the bedroom's bad-news animation. |
| Bag | `src/ui/Bag.ts` | The backpack, top left. `Bag.contents()` is `pic_<word>` per fetched word, then the counter-item; `receive(art, x, y)` flies a thing in. Draws only; the caller updates `episode`. |
| Minigames | `src/scenes/minigames/Minigame.ts` | Piece meter, `right()` / `wrong()` (no-fail rules), `completePrize()`. |
| Rounds | `src/rules/rounds.ts` | Pure. `soundRound`, `blendRound`, `pictureRound` (parked games), weighted by `ProgressStore.shakiness`. |
| Sentences | `src/rules/sentences.ts` | Pure, unit-tested. `fetchPlans` (two fetch frames and two `FETCH_ITEMS` words, distinct, shaky-weighted, never the spell, the counter word or a word the frame shows; distractors skip look-alikes), `counterPlan` (the villain's `counter.frame` + `counter.word`), `frameIsSolid` (`SENTENCE_SOLID` in config), three objects per room. |
| Spell | `src/rules/spell.ts` | Pure. `spellFor(hero, helper)`: the helper's first move word the hero lacks, else its first, else `zap`. |
| House data | `content/house/house.ts` | `BEDROOMS` (objects and reactions), `SIDE_ROOMS` (`FETCH_ROOMS` picks two per episode; `COUNTER_ROOM` is `attic`), `HUB` (positions of helper, circle, doors). Art ids derive from it. |
| Sentence data | `content/phonics/sentences.ts` | Pure. `FRAMES` (`fetch` / `counter`, slots `{villain}` `{helper}` `{x}`, `{x}` last), `FETCH_ITEMS` (key word → battle `AbilitySpec`), `sentence()`, and `allPrefixes()` / `allFrameTokens()` that the voice composer reads for `sent_*` and `word_*` lines. |
| Progress | `src/state/ProgressStore.ts`, `src/state/progress.ts` | localStorage key `wordwarriors.progress`, version 1. Kinds `sounds`, `words`, `spelling`, `frames` (`frames` added in v0.2 without a bump; old blobs get an empty one). |
| Battle | `src/battle/BattleScene.ts` | `part1()` / `part2()` are the director scripts; `think()` is the per-fighter AI; `hit()` is the one damage path (health floors live here). `useAllFetched()` fires each fetched item's ability out of her bag. The move choice lays word pads on the floor (`padSpots`, `makePad`); she walks her hero onto one and presses green; the first choice is `spellMove()`. |
| Abilities | `src/battle/abilities.ts` | `CASTS[kind]`; `cast(world, fighter, ability, target, mult, banner)`. |
| Movement | `src/battle/movement.ts` | `STEER[style]`. |
| Fighters | `src/battle/Fighter.ts` | Sprite, statuses, shields, afterimages. |
| Juice | `src/fx/juice.ts` | `burst`, `shockwave`, `shake`, `flash`, `hitstop`, `slowmo`, `timeScale(scene)`. |
| Test hooks | `src/testHooks.ts` | `window.__ww`, dev builds or `?hooks=1` only. |
| Voice build | `tools/voice/compose.ts` → `tools/voice/build.ts` | lines.json from data; audio + manifest; clips override. |
| Art | `tools/art/placeholders.ts` | Placeholder PNGs + `docs/art.md`. |
