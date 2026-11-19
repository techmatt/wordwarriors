# QA findings

What a bug hunt checks, the known issues it does not re-report, and the open hunt's calls.
Matt's standing calls from every hunt are in `docs/rulings.md` (by id, `M<n>`); how to run
the checker (`tests/qa/`) is `docs/tools.md`, *The bug-hunt checker*.

## Categories to hunt (Matt)

Matt's list (item 059). A hunt checks every category, and anything like them, in every
scene. The checker's issue kind is named where it flags one (`checks.ts`, `wording.ts`);
the rest is a human look (contact sheet, `lines.json`, a played round).

| Category | Item 059's example | Checker |
| --- | --- | --- |
| Spelling that isn't American, on screen or said. | PRACTISE (also colour, favourite, armoury). | `not-american` (bug); `tests/unit/qacategories.test.ts` holds every line |
| UI (banners, dialogue, bubbles, badges) covering a picture or target she needs. | The sentence banner SMAUG CAN NOT BEAT THE GIFT over the tops of the pictures. | `target-covered` (bug: real box overlap of a banner, dialogue box, bubble or face card with a picture or target; `tests/cover.spec.ts`) |
| Giveaways: the answer's letters visible, so she can match letters instead of reading or sounding out. | The entry hall printed VAN under the van picture. | `giveaway` (a `pic_<word>` with its word printed within 140 px), `shows-target` |
| Pictures a four-year-old wouldn't recognize as the word. | SIX was a die (she said DICE); now a decorated numeral 6. | human look: the contact sheet, each picture named aloud as she would |
| Clipped or incomplete lines instead of complete, natural sentences. | TOO STRONG, LET GO (meant: let's go). | `clipped-line` (look; a heuristic, battle shouts excluded) |
| Words or phrases that feel odd in their moment. | SUPER POWER. | human look: read each line where it plays |
| Missing voice lines: a caption shows and nothing is said. | Item 062: clips not decoded in time played silent. | `voice-silent` (bug: a line played with no clip, with why: `queued`, `decoding`, `failed`, `none`, `suspended`); `voice-unbuilt`, `voice-stale`, `voice-no-clip` (bug: a line in `lines.json` with no manifest entry, a clip for old text, or no mp3); `voice-no-line`; `tests/unit/qacategories.test.ts` and `rules.test.ts` hold every line built |
| Pacing: anything slow, repetitive, or asking for presses that don't teach; every minigame snappy for an impatient four-year-old. | Charge the Spell asked a press per rune and more; it frustrated her. Now about 20 s, one press. | `slow-room` (look; per-room budgets in `ROOM_BUDGET_MS`), `locked-long`, `locked-silent` |

## Writing up a hunt

- A hunt reads this file and `docs/rulings.md` first and does not re-report what is there.
- A hunt's round: its new batch swept (again as fixes land), older batches as regression,
  a few scenarios at `WW_SPEED=1`, `qa flags` with new URLs, `perf`, `shots`, a 300-episode
  `variety`; code reads, each claim checked by a second reader; contact-sheet reads, each
  checked on its full shot; a content sweep; a completeness read whose gaps become scenarios.
- Its section is `## Hunt <N> (<dates>)` with a `### Matt's calls` table whose last column
  is `Ruling`, and `### Where the next hunt resumes`. `tests/qa/prune.ts` reads it: a
  hunt's runs are thinned (uncited PNGs deleted) only once its section exists and every
  Ruling cell is filled, keeping each shot cited as `` `<scenario>` <n> `` or by
  `qa/<tag>/…` path. Write the calls rows (Ruling empty) before committing a section
  mid-hunt (W55).
- Fixes go to git and the hunt's report, not here. Once Matt rules, calls in force move to
  `docs/rulings.md`, issues he leaves become *Known issues*, and the section's calls table
  may go; keep its shots line while its runs are within the three-hunt cap.

## The checker's issue kinds

Beyond the README's per-shot checks and the categories above (bug unless marked look):

| Area | Kinds |
| --- | --- |
| Layout | `text-off-panel` (a word's ink over its panel's edge; a panel is tagged `qaPanel` by `tagPanel`, `src/ui/banner.ts`); `target-covered-ruled` (look: W5, W12, W21, W44 in `ruledCover`, `checks.ts`; W30, W33, W35, W57 in `Recorder.capture`, `qa.pw.ts`; a picked picture under its own word line is no cover); `glyph-on-hero`, `decal-by-target` (not bedroom, hub, battle, grown-ups or doors), `fighter-offscreen`, `pad-under-fighter`, `pad-in-reach` (looks) |
| Choices | `spawn-in-reach` (a choice appearing within her reach); a pad that never takes green stops the run naming her position |
| Speech | `letter-name` (a line naming a letter); `sound-gap` (two letter sounds under 200 ms apart, the battle's runes included, the bridge not); `variant-repeat` (look); `taunt-over-cap` (over two an episode); `debug-restart-line` (look) |
| Rotation | `repeat` (the villain or victory scene of the episode before; ally or rooms a look), `repeat-word`, `chain-repeat` (look), `door-b-streak` (look) |
| Probes | `reload-store`; `dadlock-leak`, `dadlock-badge`, `dadlock-flow`; `parent-return`, `parent-store`; `debug-leak`, `debug-return`, `debug-check`, `debug-tag`; `end-leak`, `end-store`; `erase-return`; `solo-lost`; `flag-stuck` (`qa flags`) |
| Free play | `shots-over-cap`, `mash-dead` |

**Left out on purpose:** `spawn-in-reach` skips doors and a lone answer (the bed, the secret
door); `locked-silent` skips Charge (its quiet beats are hers to say the sounds back);
`clipped-line` skips `letter_`, `word_`, `taunt_`, `move_`, `ult_`, `name_` and `story_`
lines; the Shape-Shifter's first creature wearing its word is no giveaway (said and shown,
not read); `variant-repeat` means nothing with debug games in the run (the sandbox puts
the rounds back); `sound-gap` is measured in game time.

**The probing scenarios:** `QA_SET=lenses` holds `reload_points` (`reloadAt`, the store
compared either side), `hidden_tab` (away 2.5 s every 9 s; frames do not stop as in a real
hidden tab, so frame spikes are expected), `resize`, `slow_net` / `flaky_net` (0.3 to 1.5 s
added, or one fetch in seven failed, never the manifest), `lock_all`, `parent_all` and
`parent_none` (same seed, no visits); with `lenses` or `all` come `qa flags` (`FLAGS`:
every URL the code reads and odd values, each watched 9 s) and `qa devkeys skip|auto` (F2
at every step then a played episode; F4 and green to the recap). `QA_SET=recent` holds
`debug_rooms`, `end_mash`, `variants6` and `voiceless` (the manifest 404s); `erase_mid` is
in `hunt9`. A reload or F9 to the title draws the cast again: probe a drawn thing (the
story fight) with its URL flag (`fight=`). Real-speed runs: `WW_SPEED=1 QA_SET=all QA_TAG=<tag> npm run qa --
-g "qa (tug_two_pads|charge_real|rhyme_real)$"`.

## Known issues

Left as they are, each for its reason; a hunt does not re-report them.

| # | Where | What, and why it stays |
| --- | --- | --- |
| W1, W20 | Face cards | Name chips 8 to 12 px: grown-up labels; the face is what she reads. |
| W4 | Battle | A yellow striped diamond at Bavmorda's feet: her broom (`mount: '🧹'`) as Segoe UI Emoji draws it. |
| W19 | Journey map | Back from the grown-ups page its 2-second hop plays without music; the next scene starts its own. |
| W2, W8, W14 | Battle effects | Comic words overlap; a bolt, puff or ring from just before a choice lingers faintly: under a second, or one choice. |
| W5, W12, W33, W35, W64 | Dialogue box | Over the hall's bottom row on the door line, the bedroom door's spot, an answered picture, the hub circle under the story's lines, the secret door's top 19 px: only while the line plays, nothing to pick under it. Ruled in the checker where noted. |
| W6, W7 | Art and layout | Polish seen once (the stove's pot over her, door glyphs, the banner's rod under the bag row, decals on door signs): an art or layout pass. |
| W9 | Word machine | A used tile stands over her so its letter is never hidden. |
| W10, W16 | Dad lock | The bedroom's wake-up, the journey map, the warm-up's intro and the victory lines run on: they are the flow, not presses. |
| W11 | Voice at test speed | Lines silent at speed 5 (`queued`, `decoding`): a look; real speed has none. |
| W13, W30, W57 | Bridge, Shape-Shifter | A wrong pick's letters or the praise box over the next pictures for a moment: the room is locked, the box goes. |
| W15 | Font | Comic Sans' capital Y looks lower-case. |
| W17, W25 | Network | A twice-failed clip plays silent; the manifest fetch has no timeout (one would make a slow first load captions only). |
| W18 | Reload | An episode begun counts as seen for the rotations. |
| W21, W42 | Move choice | The partner's face card grazes a ring (15 px); a lit sign's frame touches its neighbour. |
| W22, W62, W45 | Picks | A picked picture grows into the banner, or she stands on it as it flies to the bag: the answer is made. |
| W23 | Debug mode | A restarted room says its opening line's next variant. |
| W24 | Variety | With four allies and four villains, pairings repeat a few episodes apart. |
| W26 | Taunts | A taunt cut off counts as said (the cap is about what she hears begin). |
| W27 | Shape-Shifter | `clipped-line` flags "A shape-shifting spell!": a known false alarm. |
| W28, W41 | Shape-Shifter | The three-row fix-it instruction over the creature's top; the closing line's box over her. |
| W29, W38 | Charge | Dad's press before the last rune is dropped; the first solo visit runs past budget on its 8 s wait. |
| W31 | Hub lines | A bank word inside a longer one (snowman): the draws keep it out (`withStems`). |
| W32 | Story fight | The narrator (the ally, in the fight) praises each pick. |
| W34 | Contests | A pad can open inside her reach in a rope pull: her side first outranks her reach. |
| W37 | Sentence room | The bag's row sits on the banner's top trim: worth a look only past nine things. |
| W40 | Victory | VICTORY!'s box overshoots the top by 4 px at its pop-in; the ink stays inside. |
| W43 | Victory | The first recap card pops over the face card for a moment. |
| W44, W49, W52 | Sentence and rhyme rooms | Under a two-row banner the find box sits on a picture's foot (22 px at most); the green dot under the second row; a three-line box over the cards' top 25 px. |
| W46 | Charge | "You read that all by yourself!" after Dad's 2 on a helped word: blending is her own read. |
| W47 | Taunts | Elsa's "Ready, little sister?" with no Anna: a fond name. |
| W48, W61 | Grown-ups, dev | The DEBUG tag over the title in a small window; the parked pick screen's box on the cards' top 10 px. |
| W50 | Victory | Two dev-only villains' reformed lines near the closing line. |
| W51 | Rhyme room | Two visits can share a family when nothing else fits (`LAST_RHYMES`). |
| W53 | Battle | A shot can catch `flashWhite`'s 55 ms cut-out. |
| W54 | `?bridge=` | Forced words skip the episode's avoid list: a test flag; it warns on a word it cannot take. |
| W56 | Charge | The rune's YES! fades over the letter just charged as the next lights. |
| W58, W60 | Move choice | A status (Bubble Cage) holds through a choice; a crowded brawl heaps fighters off the pads. |
| W59 | Hub | The gift card stays up empty for a second as the word flies. |
| W63 | Ultimate | The vignette's corners show a faint dotted diagonal, zoomed: a polish item (a gradient texture). |
| W65, W66, W67 | Choice mode's picks | The instruction box on the second row's feet (49 px) while it plays; a card's name bubble over its neighbour, or over the PICK heading, as she walks past: green waits, nothing covered is read. W65 and W66 ruled in `ruledCover`. |

## Hunt 12 (2026-10-25 to 26)

Runs `h12a` to `h12j`. Its calls (M78 to M85) are all ruled and applied; they stand in
`docs/rulings.md`.

Shots kept with the runs (a scenario and its numbers on one line, as `citesShot` reads
them): `jorm_edge` 052, 085, 129; `shifter_lock` 069; `bridge_f_parent` 096;
`elsa_summon_wrong` 090, 092, 098; `jasmine_slow` 091; `bridge_f_d2` 074; `ozy_comet` 116;
`shifter5_h12` 161, 292, 455; `bridge_f_voiceless` 023, 024, 067, 070;
`elsa_summon` 032, 065; `tug_two_pads` 051, 075, 085, 121, 124, 131; `elsa_skyrace_wrong` 085, 100;
`tiamat_cook` 071; `tap_egg_all` 368; `end_mash_h12` 045; `drawn5_h12` 177, 179;
`shifter_wrong_h12` 037; `rhyme3_h12` 059; `bridge_f` 090, 243, 246; `drawn8_h12` 749, 782;
`tap_egg` 033; `rhyme_wrong_h12` 175; `rhyme_d2` 014; `story_h12` 124; `devkeys_skip` 024.

### Where the next hunt resumes

- **Never driven:** keyboard hunt-and-peck (A-Z, digits, Shift) mashed in the Shape-Shifter, the bridge and the
  rhyme room; F2 and F4 in those rooms (`qa devkeys`' fixed seeds seldom draw them: an env query is the cheap
  way); two tabs with a Shape-Shifter visit finishing in the other; a start from the pad alone with a hidden tab
  (the harness unlocks audio by key or click).
- **The sea tug's two pads** keep off the water where they can; with no dry floor between her reach and the
  serpent the lower ring can still stand in it. Watch it live.
- **`fights.spec`'s contest floor** is 40 s of battle time (a boot straight in runs 43.6 to 44.7 s); if it bites,
  measure an episode's parts, not a boot.

## Hunt 13 (2026-11-16)

`QA_SET=hunt13` (runs `h13a`, `h13b`, `h13c`; `h13r` at `WW_SPEED=1`): choice mode, Meryl and item 178's
words. Ended early on Matt's word; its fixes are in git.

### Matt's calls

| # | Call | Ruling |
| --- | --- | --- |
| M86 to M90 | Places as fetch keys; BOW said "bough" in taunts; villain decals picturing bank words; FROST CLASH! before the attic's FROST; blue at the title opens choice mode | Ruled 2026-11-18: `docs/rulings.md` |
| M91 | Meryl's leap in the cook-off carries the rider behind the team's cake tower: only her head shows for GOLDEN LEAP! (`meryl_cook` 133, 134); the judges' cards and the GOLDEN GALLOP! banner cover her letter tiles. (a) riders and letter rows above the cook-off props; (b) keep. Pick (a) | |
| M92 | Meryl's quest captions read KNIGHTS CAMP (no apostrophe; the place is the Knights' Camp). (a) text with the apostrophe and `say` as now, then `voice:build` (the manifest records the caption: a text change alone reads stale); (b) keep. Pick (a), in a content item | |

Shots kept with the runs (a scenario and its numbers on one line, as `citesShot` reads them): `choice_bedroom` 006, 007;
`choice_erase` 011; `choice_reload` 009; `choice_lock` 109; `meryl_cook` 133, 134; `words178_all` 194, 200, 210;
`words178_charge` 064; `words178_machine` 255; `words178_rhyme` 177.

### Where the next hunt resumes

- **Matt's calls M91 and M92** are open.
- **`sound-gap` in battle at speed 5** (160 to 200 ms between rune sounds): at `WW_SPEED=1` a Charge episode's
  runes (`h13r` `words178_charge`) had none under 200 ms. Likely the warped clock, so a look at speed 5
  (docs/testing.md, the M83 flake).
- **Never driven:** two tabs with choice mode (fixed by reading, unit-tested in `storeTabs.test`); F2 and F4
  inside the Pick screens; `QA_SET=hunt12` and `lenses` as regression; `perf`; `variety`.
