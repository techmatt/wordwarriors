# Systems: where each thing starts

| System | Entry point | Notes |
| --- | --- | --- |
| Boot | `src/main.ts` → `src/scenes/BootScene.ts` | Loads every art id in `content/art/assets.ts`, makes particle textures, reads the voice manifest, handles `?scene=`. |
| Episode flow | `src/episode/Episode.ts` | The step list; `advance(scene)` starts the next step's scene. `narrator()` decides who speaks instructions. `PREP_MAKES` maps prep game → made thing. |
| Input | `src/input/Controls.ts` | Create one per scene in `create()`; call `update()` first and `endFrame()` last in `update()`. `virtualPad` is the test input. |
| Spelling keys | `src/input/TextEntry.ts` | `openTextEntry(fn)` while a spelling scene is open; returns the closer. |
| Voice data | `src/voice/VoiceBank.ts` | `voiceBank.loadGroups([...])`; groups are `core`, `phonics`, `nar_<narrator>`, `fighter_<fighter>`. |
| Voice arbiter | `src/audio/VoiceBus.ts` | `voiceBus.say(id, 'instruction' \| 'bark', anchor?)`. The only way to speak. Caption and Bubbles listen to it. |
| SFX | `src/audio/sfx.ts` | Synthesised; one master gain, ducked while a voice line plays. |
| Music | `src/audio/music.ts` | Synthesised step sequencer: `startMusic('title' \| 'room' \| 'battle')`, ducked under speech. |
| Journey map | `src/scenes/JourneyScene.ts` | Shown by `advance()` before prep, battle, spell and victory steps (`JOURNEY_BEFORE`). |
| Frame safety net | `src/main.ts` | `Phaser.Game.prototype.step` wrapped so one throwing frame cannot stop the loop. |
| Captions | `src/ui/Caption.ts` | Instruction lines along the bottom, spoken word highlighted, speaker portrait. |
| Bubbles | `src/ui/Bubbles.ts` | Barks over a moving anchor (`{x, y, bubbleOffset, active}`), e.g. a `Fighter`. |
| Walking rooms | `src/world/RoomScene.ts` | Base for picks, prep games, retreat. Subclass: `background()`, `build()`, `choose(spot)`, optional `hint()`. |
| Minigames | `src/scenes/minigames/Minigame.ts` | Piece meter, `right()` / `wrong()` (no-fail rules), `completePrize()`. |
| Rounds | `src/rules/rounds.ts` | Pure. `soundRound`, `blendRound`, `pictureRound`, weighted by `ProgressStore.shakiness`. |
| Progress | `src/state/ProgressStore.ts`, `src/state/progress.ts` | localStorage key `wordwarriors.progress`, version 1. |
| Battle | `src/battle/BattleScene.ts` | `part1()` / `part2()` are the director scripts; `think()` is the per-fighter AI; `hit()` is the one damage path (health floors live here). |
| Abilities | `src/battle/abilities.ts` | `CASTS[kind]`; `cast(world, fighter, ability, target, mult, banner)`. |
| Movement | `src/battle/movement.ts` | `STEER[style]`. |
| Fighters | `src/battle/Fighter.ts` | Sprite, statuses, shields, afterimages. |
| Juice | `src/fx/juice.ts` | `burst`, `shockwave`, `shake`, `flash`, `hitstop`, `slowmo`, `timeScale(scene)`. |
| Test hooks | `src/testHooks.ts` | `window.__ww`, dev builds or `?hooks=1` only. |
| Voice build | `tools/voice/compose.ts` → `tools/voice/build.ts` | lines.json from data; audio + manifest; clips override. |
| Art | `tools/art/placeholders.ts` | Placeholder PNGs + `docs/art.md`. |
