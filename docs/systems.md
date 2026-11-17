# Systems: where each thing starts

Each system's entry point and owner. How the bigger ones work inside (names to grep,
knobs, hooks): `docs/systems-detail.md`, under the same name.

## Boot, scenes, flow

| System | Entry point | Notes |
| --- | --- | --- |
| Boot | `src/main.ts` → `src/scenes/BootScene.ts` | Particle textures, the title's art only, the voice manifest, `?scene=`. |
| Frame safety net | `src/main.ts` | `Phaser.Game.prototype.step` wrapped so one throwing frame cannot stop the loop. |
| Scene keys | `src/scenes/keys.ts` | `SceneKey`; each constructor passes its key `satisfies SceneKey`; `keyOf(scene)`. A new scene adds its key here. |
| Art on demand | `src/art/ArtBank.ts`, `needs.ts`, `gate.ts`, `src/scenes/WaitScene.ts` | Art loads per scene; every scene starts through `startScene(from, key, data)`. |
| Title | `src/scenes/TitleScene.ts` | Logo, roster parade; green / Start / Space / Enter unlocks audio and starts. LB+RB held 2 s or F9: grown-ups page. |
| Grown-ups page | `src/scenes/ParentScene.ts` | F9 anywhere. Three pages of tries and shakiness; F8 twice erases progress. |
| Episode flow | `src/episode/Episode.ts` (+ `state.ts`, `draws.ts`, `cast.ts`, `plans.ts`) | `advance(scene)`, `enterRoom`, `backToHub`. Scenes import from `Episode.ts` alone. |
| Journey map | `src/scenes/JourneyScene.ts` | Before battle and victory steps (`JOURNEY_BEFORE`) and house part 2; `?nojourney` skips it. |
| Pick (choice mode) | `src/scenes/PickScene.ts` | The `pick` steps: her ally and villain cards (`startChoice`, `chooseAlly`, `chooseVillain`). `docs/episode.md`, *Choice mode*. |
| Victory scene | `src/scenes/EndingScene.ts`, `src/rules/endings.ts`, `content/house/endings.ts` | The victory step's first scene, then `Victory`. |
| Victory recap | `src/scenes/VictoryScene.ts`, `src/rules/recap.ts` | `recapWords(input, max = 9)`. Test `tests/unit/recap.test.ts`. |
| THE END | `src/scenes/TheEndScene.ts` | Last screen; only Dad's 2 goes on: `advance()` ends the episode and opens the title. |

## Input

| System | Entry point | Notes |
| --- | --- | --- |
| Input | `src/input/Controls.ts` | One per scene in `create()`; `update()` first and `endFrame()` last in `update()`. `virtualPad` is the test input. |
| Browser keys | `src/input/browserKeys.ts` | `installBrowserKeys` (from `main.ts`) prevents F1, F3, F6, F7, F10, the menu key, Firefox's quick find, and Tab's focus move. |
| Spelling keys | `src/input/TextEntry.ts` | `openTextEntry(fn)` while a spelling scene is open; returns the closer. |
| Dad lock | `src/input/dadLock.ts` | Backquote / tilde. `docs/episode.md`, *Dad lock*. |
| Dad buttons | `src/input/dadButtons.ts` | Keys 1 (no) / 2 (yes), only under `openDadButtons(fn)`. |
| Minigame debug mode | `src/episode/debug.ts`, `src/scenes/DebugRoom.ts`, `src/input/debugKey.ts` | Key 0 in a game room. Test: `tests/debug.spec.ts`. |

## Voice and audio

| System | Entry point | Notes |
| --- | --- | --- |
| Voice data | `src/voice/VoiceBank.ts` | `voiceBank.loadGroups([...])`, `ensure`; reads `public/voice-gen/manifest.json`. |
| Voice arbiter | `src/voice/VoiceBus.ts` | `voiceBus.say(id, 'instruction' \| 'bark', anchor?)`: the only way to speak. Caption and Bubbles listen to it. |
| Wall-clock timeouts | `src/realTime.ts` | `realTimeout(fn, ms)`: waits on real work that the tests' fast clocks (`warpClocks`) do not stretch. Plain `setTimeout` in the game. |
| Audio context | `src/audio/context.ts` | The one `AudioContext` (`getAudioContext`, `unlockAudio`, `holdAudio` / `releaseAudio`, `whenAudible()`); its `currentTime` drives the word highlight. |
| SFX | `src/audio/sfx.ts` | Synthesised; one master gain, ducked under voice. |
| Music | `src/audio/music.ts` | Step sequencer: `startMusic('title' \| 'room' \| 'battle')`, ducked under speech. |
| Held sounds | `src/audio/holdSound.ts` | Pure: cuts a letter-sound clip to its steady part so a bridge stone's sound goes on while she stands on it. Unit test `tests/unit/holdSound.test.ts`. |
| Line ids | `content/voice/ids.ts` | Every id built by a builder (`wordLine`, `narratorLine`, `moveKey`, `villainKey`, `coreLine`, `fightKey`…): grep a builder, not an id. |
| Line variants | `src/episode/lineVariants.ts` | `variant(key)`, taunt rotation (`pickTaunt`). |

## Screen

| System | Entry point | Notes |
| --- | --- | --- |
| Dialogue box | `src/ui/Caption.ts` | Instruction lines with the spoken word highlighted, beside the speaker's face. |
| Speaker portraits | `src/ui/Portrait.ts` | `speakerOf(u)`, `makePortrait(scene, speaker, size)`: name-free face card, name plate. |
| Bubbles | `src/ui/Bubbles.ts` | Barks over a moving anchor (`{x, y, bubbleOffset, active}`) with a face chip. |
| Text fitting | `src/ui/fitText.ts` | `fitText(text, w, h?)`: wrap between words, then shrink. Banner: `src/ui/banner.ts`. |
| Emoji text metrics | `src/ui/glyphMetrics.ts` | `installGlyphMetrics` (from `main.ts`): a Text with an emoji is measured with that emoji (`testStringFor`) so its glyph is not cut. |
| Stick hint, button dot | `src/ui/stickHint.ts`, `src/ui/ButtonDot.ts` | The pulsing stick that says she may walk; `makeButtonDot`, the only way the game asks for a press. |
| Corner tags | `src/ui/cornerTag.ts` | `CornerTag`: the DOM badges for debug mode, dad lock and Dad's buttons. |
| Bag | `src/ui/Bag.ts` | The backpack, top left: `contents()`, `receive(art, x, y)`. Draws only; the caller updates `episode`. |
| Juice | `src/fx/juice.ts` | `burst`, `shockwave`, `shake`, `flash`, `hitstop`, `slowmo`, `fitImage`, `FpsMeter`. Colours: `src/fx/colour.ts`. |
| Word pictures' fit | `src/art/pictureBox.ts` | `fitPicture` / `pictureSize`, Phaser-free. |
| Free play | `src/fx/freePlay.ts`, `src/rules/freePlay.ts` | Green jumps, blue / red / yellow cast, in every walking room and in battle outside a move choice. |

## Rooms

| System | Entry point | Notes |
| --- | --- | --- |
| Walking rooms | `src/world/RoomScene.ts` | Base of every walking room. Subclass `background()`, `build()`, `choose(spot)`, optional `hint()`. |
| Player | `src/world/Player.ts` | Her character, the cursor; bob and squash only; `PLAYER_HEIGHT` (130) scales everyone in a room. |
| House mood | `src/world/houseMood.ts` | `applyHouseMood(scene, villainId, opts)`: the villain's tint, decals, ambient fx. |
| Bedroom | `src/scenes/BedroomScene.ts` | The wake-up, from `BEDROOMS[0]`. No text, no reading. |
| Entry hall (warm-up) | `src/scenes/EntryScene.ts`, `src/rules/grab.ts` | Step `grab`: a spoken clue, she walks to the picture. Layout `ENTRY_HALL`. |
| Hub | `src/scenes/HubScene.ts` | Story scene, gift word, doors; part 2's attic door. Restarted on each return; state read from `episode`. |
| Side rooms | `src/world/SideRoom.ts` | `SideRoom` (every side room's base) and `HouseSideRoom` (the six live rooms' base). |
| Sentence game | `src/scenes/SentenceRoom.ts` | Passes `listen` → `read` → `find` → `done`. |
| Word machine | `src/scenes/WordMachine.ts`, `src/rules/wordMachine.ts`, `content/phonics/families.ts` | Build words from onset tiles and a rime. |
| Charge the Spell | `src/scenes/ChargeRoom.ts`, `src/rules/charge.ts`, `content/phonics/runes.ts` | Runes per sound, then Dad's yes / no on her read; charged sounds fire in battle. |
| Stretchy Bridge | `src/scenes/BridgeRoom.ts`, `src/rules/bridge.ts` | A stone per sound unit, its sound held while she stands on it. |
| Shape-Shifter | `src/scenes/ShifterRoom.ts`, `src/rules/shifter.ts`, `src/world/optionRow.ts` | A word chain, one letter changed a link. |
| Rhyme room | `src/scenes/RhymeRoom.ts`, `src/rules/rhyme.ts`, `src/world/optionRow.ts` | Find the picture that rhymes with the printed word. |
| Parked games | `src/scenes/minigames/` (`SoundToLetter`, `BlendPath`, `WordToPicture`, `Spelling`, base `ParkedGame`), `src/scenes/AlarmScene.ts`, `RetreatScene.ts` | Out of the episode, code kept: `?scene=sound`, `blend`, `picture`, `spell`, `alarm`, `retreat`. Rounds: `src/rules/rounds.ts`. |

## Rules (pure, unit-tested) and content

| System | Entry point | Notes |
| --- | --- | --- |
| Minigame pool | `src/rules/minigames.ts` | `MINIGAMES`, `drawGames(store, rand)`: two fetch games and a counter game an episode. |
| Rooms | `src/rules/rooms.ts` | `episodePlans`: the draw into `RoomPlan`s, key words included. |
| Sentences | `src/rules/sentences.ts`, `content/phonics/sentences.ts` | Word rules (`distractors`, `saidEarly`, `frameIsSolid`); frames and prefixes. |
| Moves | `src/rules/moves.ts` | `drawGift`, `planMoves`: the gift word and the four move choices. |
| Word bank | `content/phonics/bank.ts`, `src/rules/bank.ts` | `BANK`, `THINGS`, `ACTIONS`; `wordWeight`, `drawWords`, `distractorsFor`. |
| Sound-out | `src/rules/soundOut.ts` | `soundOut(word)` per sound unit; `soundLines(sound)`, never a letter's name. |
| Cast | `src/rules/cast.ts`, `src/rules/heights.ts` | `drawCast`, `wakerOf`, `helperOf`, `DADS`, `phonicsFace`; sizes beside her. |
| Difficulty | `src/rules/difficulty.ts`, `DIFFICULTY` in `src/config.ts` | `helpLevel`; `?difficulty=` per session. `docs/episode.md`, *Difficulty and variety*. |
| Variety | `src/rules/recent.ts`, ProgressStore `recent` | `fresh`, `leastRecent`, `lastRead`, `unreadFirst`. |
| Random | `src/rules/random.ts` | `Rand`, `seededRand`, `shuffle`, `pick`, `pickWeighted`. |
| Story | `src/rules/story.ts`, `content/house/scenes.ts`, `content/house/quests.ts` | `drawStory`, `hubStory`, `questSetup`. |
| House data | `content/house/house.ts` | `BEDROOMS`, `SIDE_ROOMS`, `PLACES`, `HUB`, `ENTRY_HALL`. Art ids derive from it. |
| Quests | `content/house/quests.ts` | `QUESTS`, `questFor(id)` (else `HOME_QUEST`). |
| Word effects | `content/phonics/effects.ts` | One `WordEffect` per bank word; `EFFECT_BY_WORD`. |
| Progress | `src/state/ProgressStore.ts`, `src/state/progress.ts` | localStorage `wordwarriors.progress`, version 1; the one instance. Mirrored to the save file by the main checkout's dev server (`src/state/saveFileServer.ts`, `mirror.ts`, `saveFile.ts`; `docs/storage.md`, *Her save file*). |

## Battle

| System | Entry point | Notes |
| --- | --- | --- |
| Battle | `src/battle/BattleScene.ts`, `sim.ts`, `volleys.ts`, `beats.ts`, `moveChoice.ts`, `hud.ts`, `padPlace.ts` | `BattleScene` orchestrates (`part1()` / `part2()`); the rest is simulation, volleys, beats, the move choice. |
| Fight styles | `src/battle/stages/`, `content/battle/fights.ts`, `src/rules/fights.ts` | `Episode.fightStyle()`; each villain's style below. |
| Story fight | `src/battle/story/`, `src/battle/stages/story.ts`, `content/battle/stories/`, `src/rules/storyFight.ts` | `StoryDirector.run()` replaces `part1()` / `part2()`; pads planned by `planStoryMoves`. Test: `tests/storyFight.spec.ts`. |
| Abilities | `src/battle/abilities.ts` | `CASTS[kind]`; `cast(world, fighter, ability, target, mult, banner)`. |
| Movement | `src/battle/movement.ts` | `STEER[style]`. |
| Fighters | `src/battle/Fighter.ts` | Sprite, statuses, shields, afterimages; `muzzle`, `overhead`. |

## Tests and tools

| System | Entry point | Notes |
| --- | --- | --- |
| Test hooks | `src/testHooks.ts`, `src/hookState.ts`, `src/displayList.ts` | `window.__ww`, dev builds or `?hooks=1`. Scenes write `hookState`; `WWHooks` is its type. |
| Voice build | `tools/voice/compose.ts` → `tools/voice/build.ts` | `lines.json` from data, then audio and manifest; clips override. |
| Voice import | `tools/voice/import.ts`, `split.ts`, `tools/recorder/phonics-recorder.html` | `voice:import -- <zip>` (flags, the split, install: `docs/voice-art-pipeline.md`). |
| Listen-through page | `listen.html` → `src/listen/main.ts`, `words.ts` | Its own Vite entry (`rollupOptions.input`, `vite.config.ts`). README, *Listening through the sounds*. |
| Art | `tools/art/placeholders.ts`, `generate.ts`, `alts.ts`, `chroma.ts` | `art:placeholders`, `art:gen`, `art:alts` / `art:pick`. README, *Real art*. |
| Bank audit | `tools/phonics/audit.ts`, `src/rules/bankAudit.ts` | `npm run bank:audit`. README, *The word bank's coverage rule*. |
| Variety simulator | `tests/variety/simulate.ts` | `npm run variety -- --episodes=300 --seed=1`. README, *Not tests*. |

## Fight styles: each villain's

The villain's own style (`fight` on its roster entry, `brawl` without one) is the
episode's style, unless the ally has a `fightNudge`: chef Dada Jason as ally makes it a
cook-off 70% of the time, whoever the villain is (`pickFight`, drawn once an episode;
`?fight=` forces one). A villain with a story fight (Evil Smaug), drawn freely or chosen
in choice mode, plays it instead by `STORY_FIGHT`, ahead of any nudge. The dads' forms
are villains too.

| Villain | Fight style |
| --- | --- |
| Evil Dada Jason (`dada_jason`) | Cook-off (`cook_off`) |
| Evil Elsa (`elsa`) | Frost-beam clash in the ice palace (`frost_clash`) |
| Evil Ozymandias (`ozymandias`) | Space race from the iceberg launch pad (`space_race`) |
| Evil Jormungandr (`jormungandr`) | Rope pull against the coils (`sea_tug`) |
| Evil Smaug (`smaug`) | Sky race through the treasure cave (`sky_race`), or his story fight (`smaug_story`) in about half the episodes that can draw it |
| Evil Moriarty (`moriarty`) | Magic show at the foggy fairground (`magic_show`, the brawl's staging) |
| Evil Bavmorda (`bavmorda`) | Spell-beam clash (`spell_clash`) |
| Evil Dada Jason, warlock (`dada_jason_warlock`) | Spell-beam clash (`spell_clash`) |
| Everyone else: Julia, Ellie, Seraphina, Dada Matt, Anna, Jasmine, Tiamat, Scar, EvilRilla (`rilla`), Meryl, Dada Matt's lifter, cyber and blade forms, Dada Jason's warrior form | Free-for-all (`brawl`) |
