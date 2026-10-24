# QA findings

## Categories to hunt (Matt)

Matt's list from watching Julia play (item 059). A bug hunt checks every category, and
more broadly anything like them, in every scene. Where the checker (`tests/qa/`,
`checks.ts` and `wording.ts`) flags a category automatically its issue kind is named;
the rest is a human look (contact sheet, a read of `content/voice/lines.json`, a played
round).

| Category | Item 059's example | Checker |
| --- | --- | --- |
| Spelling that isn't American, on screen or said. | PRACTISE (also colour, favourite, armoury). | `not-american` (bug); `tests/unit/qacategories.test.ts` holds every line |
| UI (banners, dialogue, bubbles, badges) covering a picture or target she needs. | The sentence banner SMAUG CAN NOT BEAT THE GIFT over the tops of the pictures. | `target-covered` (bug: real box overlap of a banner, dialogue box, bubble or face card with a picture or target; `tests/cover.spec.ts`) |
| Giveaways: the answer's letters visible, so she can match letters instead of reading or sounding out. | The entry hall printed VAN under the van picture. | `giveaway` (a `pic_<word>` with its word printed within 140 px), `shows-target` |
| Pictures a four-year-old wouldn't recognize as the word. | SIX was a die (she said DICE); now a decorated numeral 6. | human look: the contact sheet, each picture named aloud as she would |
| Clipped or incomplete lines instead of complete, natural sentences. | TOO STRONG, LET GO (meant: let's go). | `clipped-line` (look; a heuristic, battle shouts excluded) |
| Words or phrases that feel odd in their moment. | SUPER POWER. | human look: read each line where it plays |
| Missing voice lines: a caption shows and nothing is said. | Item 062: lines in play whose clip had not decoded in time, so they played with no audio. | `voice-silent` (bug: a line played with no clip, with why: `queued`, `decoding`, `failed`, `none`, `suspended`); `voice-unbuilt`, `voice-stale`, `voice-no-clip` (bug: a line in `lines.json` with no manifest entry, a clip for old text, or no mp3); `voice-no-line`; `tests/unit/qacategories.test.ts` and `rules.test.ts` hold every line built |
| Pacing: anything slow, repetitive, or asking for presses that don't teach; every minigame snappy for an impatient four-year-old. | Charge the Spell asked Dad for a press per rune and green and yellow presses besides; it frustrated her. Now about 20 s, one press. | `slow-room` (look; per-room budgets in `ROOM_BUDGET_MS`), `locked-long`, `locked-silent` |

What bug hunts found, and what became of each: **fixed** (with the test that keeps it
fixed), **Matt** (a design call, with the hunt's recommendation), or **won't fix** (with
the reason). A hunt reads this first and does not re-report what is here. The checker
that finds most of these is `tests/qa/` (README, "The bug-hunt checker").

## Hunt 1 (2026-10-19 to 20)

Fifteen scenarios of whole episodes (seeds, every fight style, every dad form as the
ally, no ally, the word machine, wrong answers everywhere, dad lock, seeded progress,
three episodes back to back), plus a static review of the 037/038 surfaces.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 1 | Hub | "Stand in the bubble circle..." put the dialogue box over the circle it named. The box now keeps off the circle for that line and while the circle waits. | checker: `target-covered` |
| 2 | Hub | The gift card was measured mid pop-in (a tenth of its size) when the reveal line laid out, so the box covered the word. It now keeps off the card's full size. | checker: `text-overlap` |
| 3 | Hub | The gift card's emoji (Ellie's 🔵 bubble) lost its top: Phaser measures emoji short. Padded. | contact sheet |
| 4 | Entry hall | The first line ("let's grab the...") dropped the box over the bottom row of pictures because the letter board, still hidden, counted as something to keep clear. | checker: `target-covered` |
| 5 | Word machine, every room | "Walk on a letter..." (and the change / switch lines) covered every letter tile it talked about: the tiles pop in from nothing as the line starts, so they measured empty. Those lines now keep off the tiles, and every room measures its things at full size for the box. | checker: `target-covered` |
| 6 | Input | A key held through a scene change pressed again on its auto-repeat: holding Space on the victory screen skipped the next title; on the grown-ups page it flipped pages. A key held from before a scene is held, never pressed, until let go. | `tests/smoke.spec.ts` "a key held through a scene change" |
| 7 | Dad lock | Holding LB+RB on the title still opened the grown-ups page under dad lock. | static review |
| 8 | Word draws | At the end of a bag round the bag could hold only words of a shut level (digraphs before digraphs open), and the gift, the right moves and the key words were drawn from them. Such a bag now counts as spent. | `tests/unit/wordrules.test.ts` |
| 9 | Sentences | WE NEED A ANT / ELLIE NEEDS A ANT: the "A" frames now take no word starting with a vowel. | `tests/unit/wordrules.test.ts` |
| 10 | Sentence rooms | A new word's other pictures had to start with another letter, not another sound: KIT beside CAT. Hard C and K are now one first sound. | `tests/unit/wordrules.test.ts` |
| 11 | Speech rule | A bank word heard inside another word was not kept out: Smaug's "piggy bank" before PIG as a key word, "cupcakes" before CUP, "Lift with your legs!" before LEG, "pancakes" before PAN. Plurals, pet forms (PIGGY) and compounds now count (not FIND for FIN, FIGHT for FIG, HATES for HAT). | `tests/unit/wordrules.test.ts` |
| 12 | Battle | The ultimate's banner showed a pad word still to come (Jörmungandr's SWALLOW THE SUN! before a SUN pad; DOOM RUNE BLAST, BIG PURPLE DOOM). It is now held to the same give-away check as its voice line. | static review |
| 13 | Battle (cook-off) | The cook-off floated YUM! and FLIP!, both move words, before their pads. Now MMM! and WHEE!. | `tests/unit/wordrules.test.ts` (no fight style floats a bank word) |
| 14 | Battle | The give-away check matched whole words only: SPINNY SWORDS before a SPIN pad, HUGS before HUG. It now counts a pad word inside a longer one (plural, pet form, compound). | static review |
| 15 | Battle (cook-off) | "A cook-off! The yummiest dish wins!" (and "too yummy") came before a YUM pad: the fight style's own banners and lines are now kept off the pads. | static review |
| 16 | Sentence room | F9 to the grown-ups page during the celebration and back replayed the whole room; the second find fetched and recorded the word twice (two items in the bag and in battle). The room now goes straight back to the hub. | static review |
| 17 | Sentence room, word machine | A miss was forgotten across F9 and back, so the right answer counted as first try and spent the word from her bag. Misses are kept on the episode. | static review |
| 18 | Victory | The recap cards hid the grown-ups' heads, a dad stood on the top step with Julia below, and everyone stood in front of the podium's blocks. She now has the top block, everyone stands on one, and the cards run along the bottom. | contact sheet |
| 19 | Victory | With a word machine room (four words) the recap's seven-card cut always dropped the gift word and battle 1's moves. Eight cards now, and the gift word, the counter word and what follows always stay. | static review |
| 20 | Sentence room | A two-row banner wrapped greedily: SMAUG IS NO MATCH FOR THE / BUN, the key word alone and squeezed against the border. Two rows now split evenly, with more room. | contact sheet |
| 21 | Hub | The magic circle glowed on after its word was caught, through part 2, drawing her away from the doors. It fades once used. | contact sheet |
| 22 | Journey map | The villain waited at the battle after the one she was heading for, and was missing before battle 2. | contact sheet |
| 23 | Journey map | The rune dojo's stop was a sword 🗡️, the same as a battle ⚔️ to a four-year-old. Now 🥋. | contact sheet |
| 24 | Bedroom | "Find the door!" played before the door appeared. The door now pops out as the line starts. | contact sheet |
| 25 | Battle | Jörmungandr's coil (timed on the scene clock) went on circling over the pads through the frozen move choice. The fight's effects fade back while a choice is open. | contact sheet |
| 26 | Battle | The villain, good again, was still labelled EVIL in the corner. | contact sheet |
| 27 | Battle | Up to 12 full-screen flashes in one second (a busy fight); three a second is the photosensitivity line (WCAG 2.3.1). Full-screen flashes are now at least 450 ms apart. | checker: `flash-rate` |
| 28 | Rooms | Her hop never showed (green on a thing, green during a line: "buttons always answer"), nor her wobble after a wrong pick made on the move: the walk bob set the sprite every frame over the tweens. | static review |
| 29 | Battle move choice | Her hero could still be hit while walking to a pad: an armed trap or a slowed bolt made her a pig or an ice block for most of the choice. Nothing hits her hero during a choice now. | static review |
| 30 | Battle | F9 mid-battle and back replays the battle: an answered choice was recorded and bagged again, and an open choice forgot its misses. Recorded once, misses kept. | static review |
| 31 | Dialogue box | A top-band box was drawn under the bag's row of items, which covered the face card. The box is above the HUD now. | static review |
| 32 | Progress | An episode counted only when green left the victory screen: closing the tab there, or F9, left it uncounted. It counts as the victory scene opens. | `tests/soak.spec.ts` (2 after the second victory) |
| 33 | Grown-ups page | F8 twice erased the record but not today's column. | static review |
| 34 | Title | Its line was the one instruction with no caption. | static review |
| 35 | Title | Each visit decoded the voice of a cast it then threw away (a narrator is ~500 clips), delaying the bedroom's first lines. | static review |
| 36 | Speech rule | A door's sign is its room's glyph, and a bank word drawn the same way could be that room's key word: the 🛁 door led to GO GET THE TUB (also 🥚 NEST, ⚙️ COG, 🍳 PAN, 🔧 FIX). Those words stay out of that episode's keys. | static check over every room |
| 37 | Victory | The closing lines' box covered the recap cards (cards weigh most for the box now), and with no ally the left block stood empty: the dad who woke her stands there. Nine cards fit. | contact sheet |
| 38 | Entry hall | "Out the door!" came before the door appeared. | contact sheet |
| 39 | Hub | The sword yard's door sign was ⚔️, a battle on the journey map. Now 🎯. | contact sheet |
| 40 | Battle move choice | Pads were placed among the villain's minions (skeletons, dragon babies). They keep clear of every fighter now. | contact sheet |
| 41 | Words | The stem rule for compounds first matched any long ending (KITCHEN kept KIT out, BATTLES BAT, CAPTAIN CAP). Only doubled endings and real second halves count. | `tests/unit/wordrules.test.ts` |
| 42 | Battle move choice | A dash's white afterimage (a 350 ms fade on the frozen clock: about nine seconds) stood over her ally as a white silhouette through the whole choice. Cleared as a choice opens. | contact sheet |
| 43 | Battle move choice | BLAST ran over its sign's edges. Words shrink to their sign. | contact sheet |
| 44 | Battle move choice | Her hero was drawn over the signs, and standing under one her head hid its last letter (TOP read TO). The signs are over her now; her white ring shows where she is. | contact sheet |
| 45 | Hub | The door signs' emoji lost their tops (as the gift card's had). | contact sheet |
| 46 | Rooms | The idle stick hint's arrows were under its nub, so it read as a dark ball. | contact sheet |
| 47 | Word machine | The silly-word lines ("That makes... ZAT! Silly!") covered the tiles she picks from next. | contact sheet |
| 48 | Entry hall | The idle re-prompt and the miss lines ("We need the...") covered the bottom row of pictures, the one she was stuck on among them. While she looks, the pictures weigh more than the board. | contact sheet |
| 49 | Speech rule | The journey map's stops are glyphs too (🛏️ BED, 🏠 HUT, the dojo's 🥋 BELT) and show before the attic: kept out of that episode's keys like the door signs. | static review |
| 50 | Bubbles | A long name (EVIL JORMUNGANDR) wrapped in its 22 px name chip and spilled onto the taunt. Names stay on one row and shrink. | static review |
| 51 | Grown-ups page | The warm-up levels list grew one word an episode and ran over the sentence frames after about 20 episodes. Each level shows its shakiest eight and a count. | static review |
| 52 | Memory | Decoded voice was never freed: each new narrator in a sitting added 110-170 MB (over a gigabyte in 4-6 episodes with varied allies). A new episode drops the last one's groups (core and phonics stay). | static review |

Pacing, measured at real speed (an instant-answering child, seed 101): about 5.9 minutes title to recap; the longest stretch she cannot act is the hub's story scene, 13 s; no silent stretch over 2 s. With wrong answers the entry hall's clue repeats make up to 60 s of talk before she can pick (M3).

### Matt's calls

Most important first; the hunt's pick is in **bold**. Matt ruled (b) on all six (item 043).

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M1 | Battle move choice | The partner's prompt is captioned "USE ZAP!" with ZAP lit, while the pads show ZAP, DOT, WET: she can match letter shapes from the caption instead of reading the pads. | (a) keep; **(b) the caption hides the word ("USE ...!"), so she hears it and finds it written, the brief's design**; (c) no caption during the choice | Done (item 043): the caption prints USE …! (and FIND …!, THAT WASN'T …!); the word is never lit. |
| M2 | Every reading room, victory | Word confirmations, letter sounds and sentence prefixes are the `phonics` voice, Dada Matt's (his recordings will replace it), so his face pops up between the narrator's lines, also in episodes he is not in (Scar narrating, Jason waking): the speaker swaps mid-sentence. | (a) keep, Dada Matt is always the reading voice; **(b) his face only when he is in the episode, otherwise no face (the banner or card is lit anyway)**; (c) no face for phonics lines anywhere; (d) the narrator's own voice for word lines (about 4x the word audio) | Done (item 043): `phonicsFace` in `src/rules/cast.ts`; no face when he is not in the episode on her side. |
| M3 | Hub, entry hall | She cannot act through the hub's story scene (13 s at real speed: three lines, the gift word, the circle line) or the entry hall's ask and clue (10 s); after two misses the hall's repeated clues come to about 60 s of talk. Long for a four-year-old standing still. | (a) keep; **(b) let her walk during story lines and clues (green still waits), so the wait is play**; (c) trim the hub scenes to two lines and give the full clue again only from the second miss | Done (item 043): she could already walk while a room talks (`RoomScene` moves her every frame; only green, yellow and the dot wait); now tested (`tests/rulings.spec.ts`). |
| M4 | Sentence banner | A sentence that does not fit one row at full size shrinks to 40 px before it may wrap ("one row down to 40 px"), so a long counter sentence (SMAUG IS NO MATCH FOR THE BUN) reads at about half size. | (a) keep; **(b) two rows at 56 px before one row at 40 px** | Done (item 043): `TWO_ROWS_PX` in `src/scenes/SentenceRoom.ts`. |
| M5 | Battle move choice | Standing still in a choice brings only "USE HUM!" again every 10 s; the rooms' stick hint is not there, and nothing shows that she may walk. | (a) keep; **(b) the stick hint beside her hero after 4 s, as in the rooms**; (c) also pulse the pads | Done (item 043): `STICK_HINT_MS` in `src/config.ts`, `src/ui/stickHint.ts` shared with the rooms; it goes when she walks. |
| M6 | Battle move choice | The pad signs stand over the fighters behind them: a tall ally (a dad) disappears behind a sign. | (a) keep, the signs are what she reads; **(b) the team steps back off the pad row while a choice is open** | Done (item 043): `teamStepBack` (now `src/battle/moveChoice.ts`): each teammate under a sign or on a ring steps to the nearest clear spot (not in a contest's staging). |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W1 | Battle, victory scene | Speaker name chips under the small face cards are 10–12 px. | Names are for the grown-up; the face is what she reads. |
| W2 | Battle | Comic words (BAM!, a move's name) overlap each other and pop in from tiny. | They are effects, gone in under a second; the checker ignores them in battle. |
| W3 | Hub | While "Stand in the circle..." plays, the box covers the gift card. | The word has been said and caught; the circle is what she needs then (fix 1). |
| W4 | Battle (spell clash) | A yellow striped diamond at Evil Bavmorda's feet all battle. | It is her broom (`mount: '🧹'` in the roster), as Segoe UI Emoji draws it. |
| W5 | Entry hall | On the door line the box can sit over the bottom row of pictures. | Only while the line plays, and she is going to the door, not the pictures. |
| W6 | Art and glyphs | Julia half behind the cook-off stove's pot; the journey map's background dragon bigger than the villain marker; the kitchen door's 🍳 reads as a magnifying glass and the imp nursery's 👿 as "the bad guy's door"; the treehouse hub's doors hang behind the deck railing; the tug's water is a flat blue panel the reformed villain ends up standing in; the HOP card's picture is a faint sketch; SUPER FAN's wind is a hard-edged rectangle; "Look what I built, a little helper robot!" with no robot shown; the workshop art's own charging pad outshines the hub circle. | Art and content polish, each seen once; listed for an art pass, not bugs in the code. |
| W7 | Sentence room, hub | The banner's rod runs under the bag's item row; the villain's decals (flames, coins) land on door signs and the bag row; the first bag item tucks under the backpack button. | The items stay readable; a layout pass. |
| W8 | Victory scene, battle | Bubbles over other characters' heads in the victory scene; the counter shout (NOT THE FOX!) touching the HP bar; a lightning bolt from just before a move choice lingering over a sign (the frozen clock slows its fade); Smaug cut off at the left edge in race 2's choice; the spell clash hides its meter during a choice. | Each lasts a line or a choice; noted for a polish pass. |
| W9 | Word machine | Standing on a used tile, she shows through it. The intro line ("This is the word machine...") puts the box over the tiles, and after the last word about 3 s pass with no line (celebration, bag, fade). | The tile is over her on purpose, so its letter is never hidden; the intro is about the machine, the tiles are not yet hers to pick; the last 3 s are full of effects. |
| W10 | Dad lock | While locked, the bedroom still wakes her by itself after 6 s, the journey map still moves on after 2 s, and the green dot still shows over things in reach. | Item 038 asks only that her presses do nothing and re-prompts wait ("nothing else changes while locked"); if Matt wants the lock to pause the whole flow, those three are the places. |

## Hunt 2 (2026-10-21)

The checker's third batch (`QA_SET=new`: a busy child pressing blue, red and yellow all
episode, `DIFFICULTY` 2 and 3 on seeded progress, Charge and the bridge answered right,
four real draws back to back), the first batch again, one episode at real speed, a
review of every contact sheet, and three rounds of code review over everything since
hunt 1 (each finding checked by a second reader trying to refute it).

At real speed (seed 101, a drawn cast): 7.2 minutes title to recap, no line silent, no
console warning, the longest stretch she cannot act the hub's story scene (17 s), frames
under 170 ms. Four real draws back to back never repeated a villain, ally, victory scene
or side-room pair, nor a word.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 53 | Tests, checker | The voice and art fetch timeouts and a line's wait for its decode ran on the page clock, which the tests run 5x fast: a 15 s fetch timeout was 3 s, a 4 s decode wait 0.8 s, so fetches aborted (`AbortError`, the cook-off test's known red) and lines played silent in every sweep. They run on the wall clock now (`src/realTime.ts`). | `tests/unit/realTime.test.ts` |
| 54 | Battle (Charge's runes) | Each rune's letter sound queued behind "Now let's use our spell power!" and played a rune or two late, under the next rune's letter: the battle taught the wrong sound for a letter. The line is said first, and each stone waits for its own sound. | `tests/charge.spec.ts` "runes fire" (fails on the old code: 2, 3, 3) |
| 55 | Battle move choice | A hit while a choice was open could float that choice's own pad word (ZAP!, BAM!) over a fighter, for the rest of the choice on the frozen clock. The open choice's words count as still to come. | code review |
| 56 | Stretchy Bridge, level 3 | Dad's 2 pressed while the stones replayed was dropped (his cue still flashed green), and after 12 s the wait counted as a no and replayed again. His yes now brings the pictures. | `tests/bridge.spec.ts` (item 069) |
| 57 | Stretchy Bridge | Yellow (or the idle re-prompt) on a held stone cut its sound, and it stayed silent until she stepped off. It sounds again after the line. | `tests/bridge.spec.ts` (item 069) |
| 58 | Stretchy Bridge | F9 and back forgot Dad's hint or replay, so a helped crossing counted as unaided and moved the word's level up. Kept on the episode with the misses. | `tests/bridge.spec.ts` (item 069) |
| 59 | Stretchy Bridge | TENT beside TEN (BELT by BELL, LAMP by LAMB): every stone of the word is in the picked one, so a miss lit a stone they share. No picture is the word plus a sound. | `tests/unit/bridge.test.ts` |
| 60 | Word bag | When the key-word bag ran out mid-plan, the new round left out this episode's words; an episode left before reading them lost them for the whole round. The new round keeps them; they are only not drawn again now. | `tests/unit/sentences.test.ts` |
| 61 | Sentence room | Under a two-row banner she came in 70 px under the middle picture, inside reach: a mashed green after "Now find it" chose it without walking. She comes in between two pictures then, out of reach (not lower: the find line's box would cover her). | `tests/cover.spec.ts` (four banners) |
| 62 | Bedroom | Yellow at the door said door line variant 1, not the variant this episode said. | `tests/smoke.spec.ts` (item 069) |
| 63 | Sentence room, word machine | Two misses kept across F9 came back without the right answer's sparkle (it returned only on a third miss). | code review |
| 64 | Input | Tab in the Boot and Wait scenes (no Controls there) moved the browser's focus off the page, and the keyboard was dead until a click. | `tests/lazyart.spec.ts` |
| 65 | Input | A pad button held through a scene change (A on the victory screen or the journey map) read as a press on a scene's first visit: Phaser's pad starts all up and catches up a frame later. Held buttons are read from the browser's own pads. | `tests/smoke.spec.ts` "a pad button held" |
| 66 | Speech rule | The attic's {villain} RUNS FROM THE showed and said RUNS before a battle-2 RUN pad. Every frame's words stay off the pads. | code review |
| 67 | Entry hall | On every miss line ("WE NEED THE...") the letter board, drawn over the dialogue box, hid most of its words and their highlight. The board sits under a top-band box now. | `tests/entry.spec.ts` (item 069) |
| 68 | Charge the Spell | She stood 20 px inside the altar's footprint, so the altar was drawn over her arm and dress all round. She stands beside it. | `tests/charge.spec.ts` (item 059's round) |
| 69 | Battle move choice | A dash's or slam's afterimage timer runs on the frozen clock, so new white silhouettes kept appearing (and hanging for seconds) after fix 42 cleared the old ones. None are made while a choice is open. | contact sheet |
| 70 | Battle (sky race) | "There's the finish line!" played about 3.5 s before the flag came in. The flag sweeps in as the line starts. | `tests/fights.spec.ts` sky_race |
| 71 | Speech rule | PIGGYBACK CHARGE (Julia and Dada Jason's combo, and his "Who wants a piggyback ride?") did not count as saying PIG, so PIG could be a pad or the attic's word after it (about one Jason episode in ten). A pet form inside a compound counts now. | `tests/unit/wordrules.test.ts` |
| 72 | Speech rule | A compound whose first half is not a bank word hid its second half: lifter Dada Matt's DUMBBELL SPIN (and KETTLEBELL CRASH) before BELL as the attic's word; Bavmorda's BROOMSTICK before STICK. A listed first half (BATH, BROOM, DUMB, KETTLE, EAR, HAND, HAZEL, SNOW, WAR) gives its second half. | `tests/unit/wordrules.test.ts` |
| 73 | Speech rule | With no ally the helper steps into the combo (its banner and name), but the name was not counted as said. | `tests/unit/wordrules.test.ts` |
| 74 | Speech rule | The bedroom's toy drum, rubber duck and night-light show DRUM, DUCK and LAMP every episode (and Chef Jason's hub prop 🍲 is LID's picture), yet those words could be read later that episode. They count as shown, like the door signs. | code review |
| 75 | Charge the Spell | "Let's sound it out together!" played the sounds back to back, which runs toward a blend (worse with Matt's tightly cut recordings). A 400 ms beat between them, as the entry hall's and the sentence room's sound-outs have. | `tests/charge.spec.ts` (item 059's round) |
| 76 | Sentence rooms | SCAR NEEDS A CHEESE: the "A" frames took words with no "A" (CHEESE, MILK, JAM, GRASS, CHIPS). | `tests/unit/wordrules.test.ts` |

The checker itself: a busy child's yellow waits while the driver answers (it stalled the
driver, not the game); the giveaway check skips words already read and the warm-up's
word once grabbed (THE ANT! in battle); a line still queued or decoding at test speed
is a look, not a bug (README, "The bug-hunt checker").

### Matt's calls

Most important first; the hunt's pick is in **bold**. Matt took every pick (items 070 and 071).

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M16 | Charge the Spell, battle | The /l/ rune's gesture "Lick a lollipop, it goes..." says POP (a move word) before the battle; fix 72's compound rule would catch it, so LOLLI is left off its list until the line changes (`COMPOUND_HEADS` in `src/rules/bank.ts`). | **(b) a new /l/ gesture without a bank word (e.g. "Sing la, la, la, it goes...": not LIPS, a bank word too), `voice:lines`, `voice:build`, then add LOLLI to the list**; (a) keep POP off the pads in episodes with Charge | Done (item 071): "Sing la, la, la, it goes..." with 🎤 (not 🎵, HUM's picture); LOLLI is in `COMPOUND_HEADS`. |
| M7 | Battle move choice (sea tug) | With three pads and the knot on her side, the pads do not fit between her and Jormungandr, so one goes past him, under his coils (seen: FLIP). Item 034's rule (her side only) gives way to "anywhere but on him". | (a) keep; **(b) on her side always: try a narrower gap, or the second row for one pad, before going past him**; (c) count the coils as part of him | Done (item 071): `placePads` (`src/battle/padPlace.ts`) tries her side at the full gap, a 240 px gap, nearer the edge, a staggered second row (480 and 590), nearer him, and only then past him. |
| M8 | Battle move choice | A villain mid-leap when a choice opens lands on a pad's ring after the pads are placed (QUEST under Evil Tiamat): fix 40 places pads by where fighters stand at that moment, and the villain is not stepped back like the team (M6). | (a) keep; **(b) the villain's side steps back off the pads too, as the team does**; (c) place pads by where a leaping fighter will land | Done (item 071): once he has not moved for a second of wall-clock time, a villain under a sign or on a ring steps clear like the team (`villainStepBack`, `clearSpot`); not in a contest. |
| M9 | Pictures | Seven bank words are still placeholder pictures: ZOO, ZEBRA, APPLE, IGLOO (an ice cube in a box: she would say ICE), OCTOPUS, UMBRELLA, X-RAY; the rune altar and stone props too. MAT and RUG are drawn alike (a striped mat with tassels), so beside each other they read as two rugs. PAN is mostly a big fried egg (she would say EGG, a word she reads too). ROCK, on the bridge room's far bank, looks like one more of the room's painted boulders. | **(b) `npm run art:gen -- pic_igloo pic_zebra pic_apple pic_octopus pic_umbrella pic_xray pic_zoo prop_rune_altar prop_rune_stone`, and `art:alts` for MAT (a play mat without tassels), PAN (empty) and ROCK (outlined, a pet rock)**; (a) keep IGLOO and MAT out of play (`odd`) until then. Item 070: the seven pictures drawn (the rune props not, the item named only the seven); MAT, PAN and ROCK drawn as candidates from briefs. Item 073: Matt's picks promoted, each brief now the game's prompt (`PICTURES`): MAT 3 (interlocking jigsaw foam tiles, no tassels), PAN 2 (empty, no egg), ROCK 4 (bold outlined orange-brown rock). Item 074: the rune props drawn with `art:gen` from new briefs (`content/art/assets.ts`): a short, wide lavender-grey stone altar with glowing swirls, two candles and crystals at its foot, and a round stone with a thick gold rim and a plain pale face for the letter; checked in the room, she stands clear at the altar's left. | Done (items 070, 073, 074). |
| M10 | Lines that point at nothing | "Look! A fish is waving at us!" (the boat scene, no fish); reformed Jormungandr's "Look, I am a big rainbow noodle!" (he is green); reformed Warlock Jason's "Look, a rainbow spell!" (no spell shows). Same kind as W6's robot. | **(b) reword the three (no "Look" at something not drawn), then `voice:lines`, `voice:build`**; (c) add a fish prop and a rainbow burst on those lines | Done (item 071): "Our boat bobs on the little waves!", "I am a happy green noodle now!" (key `green`), "Sparkles and giggles for everybody!" (key `giggles`). |
| M11 | Wording | The word machine's "Here are some new sounds! Let's make one more." plays when two words are left (a first family of only two words: NET/VET, DOG/LOG, PIN/BIN, FOX/BOX, SUN/BUN). Evil Bavmorda's ultimate shows and says EVERYBODY PIGS!! (two marks). The /e/ rune's gesture "Knock knock, crack it open" never names the egg and shares "knock" with /k/. Three of Bavmorda's six taunts start "Bow...". Scar's and cyber Dada Matt's gift scenes say "your armor" (she wears none in their episodes). | **(b) reword each: "Let's make a new word!", drop the roster's own "!" on Everybody Pigs, "Tap the egg, crack it open, it goes...", a new cackle taunt, "your powers"; then `voice:lines`, `voice:build`** | Done (item 071) as picked. The cackle is "You cannot stop my magic, little hero!" and the piglets "Off you go, little piglets!" (one "Bow" left). The /e/ line says TAP and EGG, bank words, so with no answer to the question Matt's default (a) applies: `GESTURE_WORDS` (`src/rules/charge.ts`) counts them as said in every episode (no pad, gift, warm-up, key or Charge word), and its glyph is 🐣 (🥚 is EGG's and NEST's picture). Item 074 (Matt): narrowed, as EGG was then never read anywhere: a gesture's words count as said only in an episode whose Charge word has that rune, from when it plays (`gestureWords`): the Charge word is never one whose gestures say a word read after it (gift, pads, other rooms, the attic), and the keys drawn after it keep clear of them. |
| M12 | Victory (dessert, reformed Chef Jason) | With Chef Jason as the villain, his reformed line and the scene's close are the same sentence ("This is the best party ever!"), said twice in a row. | **(b) a different party line for him**; (c) the script skips a close the villain just said | Done (item 071): "Let's have a party every day!" |
| M13 | Hub, sentence room | On "There are two doors! Walk to one..." the box goes to the bottom and hides most of Julia, the cursor she is told to walk; on the line before, the top box hides the door signs as they pop in. Under a two-row banner (the attic) "Now find it, and press green!" does the same: the banner holds the top, so the box covers her at the bottom. | (a) keep (one line each); **(b) the hub's door lines use a narrower box on the side away from her** | Done (item 071): `CaptionOptions.narrow` (320 px of text, up to four rows, whichever side and band cover least) for the door lines, the gift scene's last line and the attic's find line. `tests/cover.spec.ts` "keeps off her". |
| M17 | Battle move choice (contests) | In a race, beam clash, tug or cook-off the team holds its stations (M6's step back skips contests), so a dad can stand behind a pad's sign for the whole choice, only his legs showing (Dada Matt behind JIG in the race, cyber Dada Matt behind FOG in the clash). | (a) keep, the signs are what she reads; **(b) pads keep clear of the team's stations in a contest (their bodies weigh in the pad placement, as the villain's do)**; (c) step back in contests too, and back to the station after | Done (item 071): no sign may cover the villain, nor in a contest the team (and the helper) at its stations; where nothing is clean, the least covering placement on her side. `tests/unit/padPlace.test.ts`. |
| M14 | Victory | The last lines' box ("PRESS GREEN TO PLAY AGAIN!") covers the big VICTORY! title. | **(a) keep: she cannot read it, and the recap cards stay clear**; (b) the box keeps off the title | Kept. |
| M15 | Grown-ups (dev) | A `?scene=victory` jump (and a URL-forced `?ending=`) records the victory scene's rotation and counts an episode, where every other rotation skips dev jumps (item 067). Only Matt's jumps; `tests/ending.spec.ts` relies on it. | **(a) keep**; (b) gate it on a real episode like the cast, and move the test to a played episode | Kept. |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W11 | Every scene, at test speed | Lines played with no clip in speed-5 sweeps (`voice-silent`, queued or decoding), up to dozens an episode with a drawn narrator. | The game asks five times faster than the decode queue serves; a whole episode at real speed had none. The checker calls these a look at test speed. |
| W12 | Bedroom, entry hall, hub | The bedroom door's spot box (with its glow) under the face card; the warm-up's confirmation bubble on a corner of a picture after the grab; the magic circle's bottom 27 px under the story's last line. | The door itself is clear; the answer is already made; the circle cannot be used yet (as W3). |
| W13 | Stretchy Bridge | After a wrong pick, its letters (R O CK) sit over the next picture for the feedback line. | The room is locked then, and the plate fades before she slides again. |
| W14 | Battle, free play | Free play's jump puffs and big-shot rings started just before a choice hang faintly through it. | Same as W8: a faint effect for one choice. |
| W15 | Word machine | The capital Y in Comic Sans looks like a lower-case y. | It is the font's capital Y; the game's letters are all capitals. |

## Hunt 3 (2026-10-21)

The lenses the first two hunts never ran, as the checker's fourth batch (`QA_SET=lenses`,
README, "The bug-hunt checker"): reloading at five points, a tab hidden every 9 s, six
window sizes, slow and failing fetches, dad lock and the grown-ups page at thirteen
points of an episode, 48 URL flags and odd values, F2 and F4 through an episode; and a
code read over six lenses (reload and the store, focus and resize, the network, every
flag and dev key, the grown-ups page with dad lock, items 070-079), each finding checked
by a second reader trying to refute it. Cut short at Matt's word (one round).

What held: a reload anywhere leaves the store as it was and the game at the title; F9 and
back at all thirteen points came back to the same scene and changed nothing stored; dad
lock let no press through at any point and no re-prompt played while locked; slowed
fetches (0.3 to 1.5 s each) made no line silent and no art late; with one fetch in seven
failing (243 in an episode) the episode still finished and every art id retried in; six
window sizes kept the picture letterboxed and every check clean; all 48 URLs (every
`?scene=`, unknown ids, `seed=abc`, `difficulty=9`, a bogus place, fight, game, room,
ending or slot) booted with no page error and none stuck in Boot or Wait; F2 at every
step, then an episode played through, and F4 with green to the recap ran clean.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 77 | Dev keys | A held F-key repeated: a long F8 on the grown-ups page armed and erased the whole record, a long F2 raced through steps, a long F9 flipped between the page and the scene. A held F-key is one press. | `tests/lenses.spec.ts` "a held F8" |
| 78 | Grown-ups page | Under dad lock its green, red and Esc did nothing (only F9 got back), though its help line offers them. The page is Dad's: they work under the lock. | `tests/lenses.spec.ts` |
| 79 | Battle move choice | Under dad lock the stick hint still came up beside her hero (the rooms hold it back). It waits with the lock now. | `tests/lenses.spec.ts` |
| 80 | Dad lock, Dad's 1 / 2 | After a resize (F11, maximise, a smaller window) the DAD LOCK badge and Dad's 1 ✗ / 2 ✓ cue were placed by the canvas as it was before Phaser refitted it, so they hung mid-screen or off the canvas. Placed again after the refit. | `tests/lenses.spec.ts` |
| 81 | Every scene | A hidden tab (switching tabs or windows) froze the picture but not the voice: Phaser sleeps its loop, the game's own audio context played on, and lines chained on their audio (the hub's story, the gift word) played out unseen. The context now suspends with the loop (`holdAudio` in `src/audio/context.ts`), a line's backstop waits for a suspended clip, and a line that comes up while hidden, or as the tab comes back, starts once the context has resumed. | `tests/lenses.spec.ts` "a hidden tab holds the voice"; checker `hidden_tab` (no line silent) |
| 82 | Grown-ups page | The sentence frames' counts wrapped, the last number on a row of its own under the frame's name. One row each, shrunk to fit. | contact sheet |
| 83 | Grown-ups page | The third number was labelled "today" but counts since the page opened (a reload starts it again). Labelled so. | static review |

The checker itself: the clipped-line heuristic no longer flags "Quick, pick a move!", "Now's
our chance!", "Ready, set, go!" or "Look, a secret door!", and flags every "X for
everybody!" with no verb (M18); `tests/unit/qacategories.test.ts`.

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M18 | Victory scene | The reformed villains' sorries are clipped by the category list (complete, natural sentences): Ellie "Sorry! Bubbles for everybody!", Smaug "Gold coins for everybody!", Bavmorda "Cauldron soup for everybody, it is yummy!", Rilla "Gorilla hugs for everybody!", blade Dada Matt "Sparkles for everybody!", warlock Dada Jason "Sparkles and giggles for everybody!" and "Happy magic for everybody!" (Chef Jason's "There are seconds for everybody!" is whole). | (a) keep, a cheer; **(b) "Sorry! I made bubbles for everybody!", "I have gold coins for everybody!", "I made cauldron soup for everybody, and it is yummy!", "I have gorilla hugs for everybody!", "I made sparkles for everybody!", "I have sparkles and giggles for everybody!", "I have happy magic for everybody!"; then `voice:lines`, `voice:build`** | (b), 2026-10-21: done in item 082. |
| M19 | Every scene (no voice manifest) | With `public/voice-gen/manifest.json` missing or unreadable (a fresh checkout before `voice:build`, a broken junction), line texts are gone too (they live in the manifest), so every instruction is a blank 0.6 s with no caption: the game runs on with nothing said or shown. | (a) keep: the game is played from a built checkout; **(b) captions from `content/voice/lines.json` when the manifest fails (about the size of the manifest in the bundle), each timed by its words**; (c) a full-screen "voice not built" notice instead of playing on | (b), 2026-10-21: done in item 082 (`captionsOnly` in `src/voice/VoiceBank.ts`, its own chunk; `tests/voiceless.spec.ts`). |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W16 | Dad lock | Under the lock the bedroom's wake-up story, the warm-up's intro (its letter names and sounds; no names since item 137) and the victory scene's lines into the recap run on by themselves. | W10's kind: no press moves them, they are the flow; W10 names the places if Matt wants the lock to pause it. |
| W17 | Network | With one fetch in seven failing, two lines in an episode played silent (their clip's fetch failed again when asked). | Every art id and nearly every clip retried in; the game needs no network (README, *Operational facts*). |
| W18 | Reload | The rotations remember an episode's cast and rooms from the bedroom on, so an episode reloaded early still counts as seen for the next draws. | By design (`src/episode/draws.ts`): an episode she has begun has shown its villain and rooms. |

## Language pass (2026-10-21)

Item 087 (commit 6f9e125) reworded the lines for a four-year-old's ear: contractions,
complete sentences, and variants of the lines she hears several times an episode, said in
turn across episodes (`src/episode/lineVariants.ts`). Its old-to-new table, now historical,
is `docs/language-pass.md`.

## Hunt 4 (2026-10-21)

Cut short at Matt's word (wrap up so items 090 and 091 can run; another hunt follows).
One round: seven scenarios of the main batch at clock speed 5, reviewed shot by shot, and
a code read over items 081-088 (debug mode, line variants and taunts, THE END and Dad's 2,
the test-only shortcuts and captions-only voice, item 088's refactors, scene lifecycle),
each claim checked by two second readers trying to refute it. The checker's new batch
(`QA_SET=recent`) is built but has not had a sweep yet: the next hunt runs it first.

What held in the seven scenarios: no stall, no page error, no new giveaway, cover or
spelling issue beyond those already ruled (W12's door and circle edges, M14's VICTORY!
title, W2's comic words, the "SUPER WET!" banner after she read WET).

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 84 | Sentence room, Stretchy Bridge, warm-up | Yellow (and the idle re-prompt) said the next variant of the instruction (item 087), not the line she had heard: "Ready to read it? Press green!" became "You read this one! Press green." on yellow. A room now says again the variant it last said (`narrateAgain` in `src/world/RoomScene.ts`). | `tests/hunt4.spec.ts` |
| 85 | Minigame debug mode | Key 0 (or F2) out of a debug game while its word was being said saved the narrator's next "got it" / "right" variant to the real store: the line cut by the hush resolved its await, and the old room ran one more step after the sandbox had ended. A scene's await chains now stop as soon as a scene change is queued (`markLeaving` in `src/fx/sceneGen.ts`, from `startScene`), not on Phaser's next step. | `tests/hunt4.spec.ts` |
| 86 | Minigame debug mode | F9 inside the debug room's door fade came back to a debug room with debug off: no DEBUG tag, the hub's background, key 0 dead, and its door skipping the house step. Debug now stays on until the fade ends, and a room ignores F2 and F9 while it fades out to leave (F2 there skipped a second step). | `tests/hunt4.spec.ts` |
| 87 | Victory recap | F9 inside the recap's fade to THE END brought the whole recap back (fanfare, every word said again, the next `victory_1` variant spent). F9 is ignored on the way out, as the victory scene and the journey map already did. | `tests/hunt4.spec.ts` |
| 88 | THE END | Back from the grown-ups page (which stops the music) THE END was silent until Dad's 2. It starts the recap's track again. | `tests/hunt4.spec.ts` |
| 89 | Hub | "Stand in the bubble circle, and press green, to catch it!" kept off the circle (fix 1) by going to the top, over the gift's word card, which hid under the box for the whole line. The circle line takes the narrow box (M13's), which keeps off both. | `tests/cover.spec.ts` "the hub's circle line" |
| 90 | Captions only (M19), any line with no clip | A line with no clip ran out behind a hidden tab, so its caption was gone when she came back (fix 81 held only lines with audio). Such a line now shows its caption again in full once the tab is back. | code read |

The checker itself: `QA_SET=recent` (README, "The bug-hunt checker"): minigame debug mode
at six points of an episode, a game played from a pedestal at each and nothing allowed to
stay (`debug-leak`, `debug-check`, `debug-tag`, `debug-return`); the recap and THE END
mashed (her buttons, Dad's 1, key 0, dad lock, F9 and back) with only Dad's 2 allowed to
leave (`end-leak`, `end-store`); six drawn episodes back to back; an episode with no voice
manifest. Every scenario now also checks line variants said in turn across the run
(`variant-repeat`, a look) and no taunt over twice an episode (`taunt-over-cap`);
`tests/unit/qacategories.test.ts`.

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W19 | Journey map | Back from the grown-ups page its 2-second hop plays without music (the page stops it). | Two seconds, and the next scene starts its own track. |
| W20 | Battle | Face cards' name tags ("EVIL TIAMAT" in a bubble) are 8 to 10 px (`tiny-text`). | Grown-up labels she does not read; the bubble's face is what she sees. |

## Hunt 5 (2026-10-21)

The checker's fifth batch swept for the first time (`QA_SET=recent`: debug mode at six
points, THE END mashed, six drawn episodes back to back, no voice manifest), the main batch
from `lifter_tug` on (eight scenarios, `soak3` twice), one episode at real speed, odd input
on the newer screens (`tests/hunt5.spec.ts`: key 0 mashed, key 0 under dad lock and across
the grown-ups page, THE END through resizes and a hidden tab), the URL flags added since
hunt 3, a content sweep (every line in `lines.json` read once per distinct text, all 188
word pictures on contact sheets, the sentence frames against every thing word), the long
runs (`soak3` at real speed: three episodes in 20 minutes, heap 33 to 47 MB, frames
under 65 ms) and four rounds of code reading over thirteen areas (the move choice, the
phonics rooms, voice, episode flow; the sentence room and word machine, input and the
grown-ups page, the UI layer, the battle director; the word draws, the early scenes; art
loading, audio, Charge the Spell), each claim checked by a second reader trying to refute
it. After the fixes: the main batch's first seven scenarios and `debug_rooms`, the second
batch (`QA_SET=more`, twelve scenarios) and the third (`QA_SET=new`) swept again. That
regression sweep caught two of this hunt's own first fixes (the word machine's, which
stalled the driver, and one about cut taunts, reverted: W26).

At real speed (seed 101, a drawn cast, a bridge and a word machine): 8.2 minutes title to
recap, no line silent, frames under 170 ms (battle under 35), the longest stretch she
cannot act the hub's story scene (17 s, M3); the bridge took 58 s for three words, the
word machine 54 s for four. Six drawn episodes back to back: heap 33 to 63 MB, objects,
tweens, timers and listeners flat. Every scenario on the build server: no voice fetch
failed or came late.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 91 | Pictures (look-alikes) | LEG's picture is a leg in a striped sock and a shoe, and SOCK is a striped sock, but they were not look-alikes: either could stand beside the other as the wrong picture. | `tests/unit/wordrules.test.ts`; golden draws rewritten (only the SOCK and LEG rooms' pictures moved) |
| 92 | Sentence rooms | WE NEED A GUM / ELLIE NEEDS A GUM could be drawn: GUM takes no "A", like item 069's CHEESE, MILK, JAM, GRASS and CHIPS (`NO_ARTICLE`). | `tests/unit/wordrules.test.ts` (the "A" frames) |
| 93 | Battle move choice | The stick hint (M5) swayed on the scene's tween clock, which the frozen fight runs at 0.04x: its nub took 11 s a sway and read as a still grey ball. It sways on the wall clock. | `tests/hunt5.spec.ts` |
| 94 | Battle move choice | The dialogue box stayed up about 10 s after each line ("USE ...!", the re-prompt, the miss lines) and a new face card took 6 s to pop in: the box's 250 ms linger, 160 ms fade and 260 ms pop ran on the frozen clock. They keep their own pace now, read every frame (the choice's first line comes up before the battle slows its clock: a second code read caught it). | `tests/hunt5.spec.ts` |
| 95 | Stretchy Bridge, level 2 | Dad's 2 while "Which picture did you read? Walk to it!" played cut the line for the hint, and it never came back (level 3's replay says its own line after; level 2's said none). It is said again after the hint. | `tests/bridge.spec.ts` (item 092) |
| 96 | Stretchy Bridge, level 2 | Dad's 2 during the intro or a miss's feedback was dropped, though his cue flashed green, which is when he would want to help. It is kept, and the hint plays once she may slide. | `tests/bridge.spec.ts` (item 092) |
| 97 | Minigame debug mode | Key 0 acted on a room already on its way out (its fade, or a scene change queued for Phaser's next step): two scene changes at once, or the wrong room kept as debug mode's origin. It is ignored then, as F2 and F9 are. | code read |
| 98 | Word machine | Within a word family the next round lays its tiles where the last ones were, so one sat under her; a green mashed through "Change the first sound..." slotted it the moment the line ended, unwalked and unheard (a first-try read if the shuffle put the right one there). A new round moves her up out of the tile row's reach (the sentence room's fix 61, here); the first try at that, a tile that ignored green until she stepped off, stalled the checker's driver and would have answered her green with nothing. | `tests/hunt5.spec.ts` |
| 99 | Grown-ups page (F9) | F9 opened the page without marking the room or battle as leaving, so in the frame before Phaser stopped it a line ending, Dad's 1 / 2 or key 0 ran one more step of it; in a battle, F9 as the director's last wait ended started the next step as well. F9 marks it leaving, and F2 and F9 do nothing once it is. | code read |
| 100 | Word draws | The word machine (and a sentence fetch room's key) could take the villain's own named counter word, so the attic could not draw it: Evil Tiamat's machine built HAT and the Magic Hat, the best-staged defeat, never came (four of the golden draws). The bridge, Charge and the warm-up already kept it; now every side room does. | `tests/unit/wordrules.test.ts`; golden draws rewritten |
| 101 | Stretchy Bridge, hidden tab | A stone's held sound started just before the tab was hidden was cut as she came back: its backstop ran on the wall clock while the hidden tab held the audio (fix 81 covered every other line). The backstop waits for the audio to be back. | code read |

The checker itself: it serves a production build made as the sweep starts, as the suite
does (the dev server spent its first minutes scanning the tree, voice and art junctions
included, so every scenario of the first `recent` sweep timed out at boot, and once up
it took 4 to 9 s a voice fetch on an idle machine: much of what README called a busy
machine); `voiceless` installs its manifest 404 before boot (after it, the manifest had
loaded and the scenario played with voice), and a line with no clip is its point, not
`voice-silent`; store changes are named by field (`storeChanges`), so a room started
again after debug mode or the grown-ups page, which says its opening line's next variant,
is a look (`debug-restart-line`) and not `debug-leak`; the overlaps ruled on (W5, W12,
W21) are a look (`target-covered-ruled`); the gift word may wear its picture in the hub
(FIN's fins beside its card); a run with debug games skips `variant-repeat` (the sandbox
puts the variant rounds back on purpose); ten URL flags added since hunt 3 (`scene=theend`,
`grab=`, `battle=`, `cast=`, `games=` and odd values); a pad that never takes green names
her position, the pads and the running scenes (M20).

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M20 | Battle move choice | Twice in the hunt's sweeps her hero was off the right pad when the driver's green came, and every green missed: `soak3` (a sea tug, at her rope station) and `diff2_firm` (a brawl: SPIN's pad at 680,560, her hero at 798,601 with the stick hint showing, only the Battle scene running). The teleport sets where she is held, and in the code only that and her stick move her in a choice, so something walked her off while the choice was closed for a line. An Xbox 360 controller is plugged into this machine, and the GPU test browser can read a real pad once it reports input: a stick drifting past the 0.25 deadzone would do exactly this, at random. Not reproduced in 13 replays. | **(a) sweep once with the controller unplugged: if it never comes back, it was the pad; the driver now puts her back on the pad before each retry, and still stops naming her position if a green never lands**; (b) if it comes back without the pad, a test-only probe of `controls.move` during a choice | Matt, 2026-10-21: (a), his to run (unplugging the controller) |
| M21 | Pictures | Pictures she may name otherwise: HEN (a chicken), JET (an airliner), KIT (a toolbox), BAG (a handbag), POD (peas), VAT (a tub), DESK (a table), BIN (a trash can), TAP (a faucet: "tap" for a faucet is British; Americans say faucet). None stands beside a look-alike, so a pick is never ambiguous; the word just teaches a new name. | **(a) keep, except TAP: redraw it as a finger tapping a drum or table (`art:alts -- pic_tap`), so the word is the American verb**; (b) keep all; (c) take TAP out of the picture words | Matt, 2026-10-21: redraw TAP as a tap (the American word: a faucet with water running), the rest stay. Item 093 drew three candidates from a brief (`scratch/093_tap_running.txt`); his pick is the picker `scratch/art_alts_093_tap.json` |
| M23 | Sentence rooms | The number words SIX, TEN and THREE are things like any other, so a room can read WE NEED A THREE or SCAR NEEDS A TEN, and the attic TIAMAT HIDES FROM THE THREE (seen). They read oddly beside the other key words (a thing she could carry). | **(a) keep them out of the "...A {x}" frames (with `NO_ARTICLE`), where they read worst; THE frames keep them**; (b) keep; (c) no number as a key word at all (the warm-up and the bridge keep them) | Matt, 2026-10-21: (a) and more. Item 093: a number word (`NUMBER_WORDS`) is a key word only in a frame marked `numbers` (WE CAN USE THE, GO GET THE, {hero} NEEDS THE): never after A, never in the attic's counter frames |
| M24 | Charge the Spell | Dad's 1 / 2 while the last rune is still said or flies into its slot (she can read the word on the bar by then) is dropped, though his cue flashes as if it landed; if he waits, the 10 s timeout counts a miss and the word is sounded out. Same kind as fix 96 on the bridge. | **(a) keep a 2 (or 1) pressed after the last rune lit, and act on it as the read is asked**; (b) no flash on a press nothing acts on; (c) keep | Matt, 2026-10-21: (a). Item 093: his 1 / 2 from the last rune lit until the read is kept (his latest) and acted on as the read is asked, without "Now read the whole spell!" |
| M25 | Art | A picture whose fetch fails on a passing network error (a server restart while she plays) is retried three times within milliseconds, then stays a magenta square for the rest of the sitting (only a 404 should). | **(a) wait between tries (0.5 s, 2 s), and let a later scene ask again for an id that failed on the network**; (b) keep: the game is served from this machine (README) | Matt, 2026-10-21: (a). Item 093: tries 0.5 s and 2 s apart; a picture lost to the network (not a 404) is asked again (at most twice, in the background) by a scene starting 3 s or more later, and replaces the magenta square once nothing shows it |
| M22 | Memory | Art outlives every scene by design (`ArtBank`): over six episodes the loaded textures rose 192 to 320, and a long sitting tops out at all 459 pictures, about 526 MB decoded (the renderer held 1.1 GB after six episodes). Heap and objects stay flat. | **(a) keep: bounded, and a reload (or THE END's new episode) is never needed**; (b) free a scene's art once two scenes have passed without it | Matt, 2026-10-21: (a) keep |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W21 | Battle move choice | The partner's face card at the bottom grazes the nearest pad ring's lower edge, 5 to 14 px. | The ring is where she stands, and its sign above is clear; the checker calls it `target-covered-ruled`. |
| W22 | Sentence room | The picture she picked grows for its celebration into a two-row banner's bottom edge (16 px: LEG, UMBRELLA). | She has answered; it lasts the word's line. |
| W23 | Debug mode, grown-ups page | The room key 0 (or F9) brings back starts again and says its opening line's next variant, which moves that line's round in the store. | The room is fresh again, as designed; only which wording she hears changes. |
| W24 | Variety | With `ACTIVE_CAST` at four allies and four villains, six drawn episodes repeated whole pairings three and four apart (Ellie against Evil Jormungandr, sea tug, boat, the same rooms). | Matt's beta cast; no rotation rule broken (none back to back). |
| W25 | Voice | The voice manifest's fetch has no timeout of its own, so a server that answers the game's code but never this one file would hold boot on its loading bar (the code read's finding). | A timeout would switch a slow first load (the manifest is 4 MB) to captions only for the whole sitting, and the game is served from this machine; a hung server shows at once. |
| W26 | Battle | A taunt or a big move's name cut off by an instruction counts as said (the code read's finding). | Counting it unsaid let it start again: the regression sweep heard Evil Bavmorda's cauldron taunt begin three times in an episode, over item 087's cap of two; the cap is about what she hears begin. |

## Hunt 6 (2026-10-22)

Cut short at Matt's word (close out, and say where the next hunt resumes: below). The
Shape-Shifter and the name-to-sound lines (items 096 and 101) first: a sweep of six
scenarios that meet it (`seed101`, `wrong_seed102`, `shifter_wrong_first`, `mash_default`,
`diff3_wrong`, `lock_all`), reviewed shot by shot; every chain the bank can draw (2032)
checked link by link; odd input on the room (`tests/hunt6.spec.ts`: yellow and green
mashed through misses and morphs, the grown-ups page at each point of a link, dad lock,
key 0). Three rounds of code reading, each claim checked by a second reader trying to
refute it: the room, its chain rules over hundreds of drawn plans, the name bridge, the
picture runes, the battle with the new rooms' items; item 093's changes, episode flow with
the forced room, a content sweep of items 096 and 097; the room above base difficulty, the
store's new fields, the grown-ups page. One drawn episode at real speed (8.6 minutes title
to THE END; the six-episode run was stopped in its second episode to close out).

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 102 | Shape-Shifter | "It changed, but the word did not! Find the letter that fixes it!" (three rows) went to the bottom and sat over all three letter stones, and over her: the room kept its creature clear but not its options. The options keep the box off them above all now (the word machine's tiles' weight). | `tests/cover.spec.ts` "the fix-it instruction" |
| 103 | Shape-Shifter | The changed letter, lit on a read-it label, blinked out every half second: its pulse tween took its start scale once the label's pop-in had it at 0, so it pulsed between nothing and full size. It pulses from full size. | `tests/hunt6.spec.ts` |
| 104 | Shape-Shifter | Each new link stood its pictures or stones where the last link's were, so one landed under her: green mashed through "Here comes the spell again!" picked it, unwalked and unread (a first-try read and a level up from a guess). She steps up out of reach (the word machine's fix 98, here); the checker now flags any choice appearing within her reach (`spawn-in-reach`). | `tests/hunt6.spec.ts` |
| 105 | Shape-Shifter | Only the last creature flew into her bag; the three words before it, battle items too, turned up in the bag's row back in the hub with no moment of getting them. A copy of each creature flies in with the praise, as every other room's words do. | review (shots) |
| 106 | Shape-Shifter | After two misses the answer's sparkle kept rising from the empty floor through the morph, the word and the praise once she had picked it. It stops with the pick. | code read |
| 107 | Shape-Shifter | Yellow sounded (and counted as help) a stone up to 120 px away, where no green dot showed. It sounds the stone in green's reach. | code read |
| 108 | Shape-Shifter, level 1 | A stone she reached while a line played (the link opening, a miss playing out, another stone's sound) never sounded until she walked off and back. It sounds once the room is quiet, if she is still there (the word machine's tiles do the same). | `tests/hunt6.spec.ts` |
| 109 | Shape-Shifter, word draws | Fix-it words (three links in four) are recorded under spelling, so they never joined her recent words and the same chains came back episode after episode (PAN PEN PIN in 6 of 30 simulated episodes). A fix-it word right first time is remembered as recent, without touching her reading or her bag. | code read |
| 110 | Shape-Shifter | Chains and read-it pictures ignored look-alikes: BAT beside CAT and RAT (half of the read-it links in 300 drawn episodes), and links like BAT to RAT or PIN to PEN, where the creature turns into a picture she cannot tell from the old one. No link joins look-alikes, and no read-it picture is one of the word read. | `tests/unit/shifter.test.ts`, `shifterDraws.test.ts`; golden draws rewritten |
| 111 | Moves | "Find the letter that FIXES it!" is said and shown before the battles, and FIX could be a move pad (45 of 300 drawn episodes): item 039's case. The side rooms' lines count as said before the battle. | `tests/unit/moves.test.ts` |
| 112 | Charge the Spell | The M rune's cake slice and the E rune's hatching chick showed CAKE and CHICK before she could read them later that episode. A glyph close to a bank word's picture counts as showing it (`GLYPH_LOOKS_LIKE`). | `tests/unit/wordrules.test.ts`; golden draws rewritten |
| 113 | Victory recap | With the Shape-Shifter's four words (and the bridge's three) the nine-card cut dropped battle 1's move words again (fix 19's case) and the creature that went to the fight. The gift, every move word, the counter word and after, and each side room's last word stay (`src/rules/recap.ts`). | `tests/unit/recap.test.ts` |
| 114 | Battle | A bridge and a Shape-Shifter fetch eight things, and the counter-item made a ninth icon over the left end of the villain's health bar for all of part 2. The row packs tighter as it grows, left of the bar. | code read |
| 115 | Shape-Shifter | A chain could start on TEN or SIX ("It starts as a... ten!", M23's case) or JAM (no "A", fix 92's). The first creature is never a number or a word that takes no "A" (`NO_ARTICLE` moves to `content/phonics/sentences.ts` beside `NUMBER_WORDS`). | `tests/unit/shifterDraws.test.ts`; golden draws rewritten |
| 116 | Charge the Spell, the bridge | Dad's 1 / 2 stayed live until Phaser stopped the room, a frame after key 0 or F9: a 2 in that frame acted in full, and out of a debug Charge read it recorded the debug word in the real store and the restored episode. A press once the room is leaving does nothing. | `tests/hunt6.spec.ts` |
| 117 | THE END | Chef Dada Jason, 1.65 of her height since item 093, bobbed his hat and forehead up under the THE END title (warrior Jason a little less). The figures shrink together, never apart, when the tallest would reach it. | `tests/hunt6.spec.ts` |
| 118 | Grown-ups page | The "Spelled (typing...)" box fills only from the Shape-Shifter's fix-it links now (Spell the Spell is parked), and it showed the first three words ever stored, never the newer ones, as typing. It shows the latest three, how many more, and says what they are (letters found for sounds). | code read |

The checker itself: `spawn-in-reach` (above); the Shape-Shifter's first creature wearing its
word on its label is not a giveaway (it is said and shown, not read).

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M26 | Shape-Shifter, pacing | Each link locks her out 12 to 15 s even when she answers at once: the word, the praise, "Here comes the spell again!", the morph (about 1.6 s), then the full instruction again ("Look, a new word! Read it, then walk to its picture!"), every link. At real speed a four-link visit took 70 s with instant answers; the checker's `slow-room` budget (90 s) was passed under dad lock probes (97 s). | **(a) the full instruction only the first time each beat comes; later links a short cue ("Read it!" / "Fix it!"), and no "here comes the spell again" before a morph that already says it**; (b) three links instead of four (`SHIFTER.links`); (c) keep | (a), item 104: the full instruction the first time each beat comes in a visit, then "Read it!" / "Fix it!"; no "Here comes the spell again!" at all after the first link (with it before a read-it link a link still took 7 s), the next spell striking under the last word's praise: a later link 4.8 to 5.7 s with instant answers, 6.6 to 7 s for fix it after read it (two morphs back to back; `tests/shifter.spec.ts`, pacing); item 108 overlaps them (the read word said as its creature pops back, the next spell's swell under it): 5.4 to 6.2 s |
| M27 | Warm-up, level 1 | With the name bridges the clue got long: LAMP locked her out 21 s (about 12 s before item 096), "L's name is Ell... squeeze off the front: lll, A... a, M's name is Em... squeeze off the front: mmm, P's name is Pee... keep just the start: p", and a miss or yellow says every bridge again. | **(a) the bridges the first time a clue is said; again (a miss, yellow) the plain name then sound**; (b) the bridge for the first letter only; (c) keep | (a), item 104: the bridges the first time the clue is said in the warm-up (kept on the episode across F9); a miss or yellow, the plain name then the sound |
| M28 | Battle, pacing | Every fetched thing fires in turn before the first move choice: with a bridge (3) and a Shape-Shifter (4) and the warm-up, eight items, about 34 s in part 1 and 30 s in part 2 before PICK A MOVE! (about 13 s with three). | **(a) a room's earlier words fly out of the bag as one volley, each room's last word keeps its own beat**; (b) the items share a fixed time budget (about 12 s); (c) keep | (a), item 104: five beats for eight things (`src/rules/volleys.ts`): PICK A MOVE! 24.7 s after the first thing out of the bag, 37.3 s before on the same measure (`tests/opening.spec.ts`) |
| M29 | Shape-Shifter, chains | The room is meant to make her read every letter, but most chains never change the vowel (255 of 300 fresh plans), and every read-it link changes the first letter, since no word has two pictured siblings at the vowel or the last letter: she can pick read-it pictures from the first sound alone. About one visit in twenty with a real episode's word list is all fix-it (no read-it link at all). | **(a) score chains by how many of the three places they change, and let a read-it link at the vowel or last letter stand one sibling and one other pictured word; prefer a shorter chain with a read-it link to an all-fix-it one**; (b) keep: fix-it reads every letter too | (a), item 104: chains scored by the places they change first (all 300 fresh draws change the vowel and all three places), read it at the last letter with one sibling and another picture (its first letter first), a shorter chain with a read-it link before an all-fix-it one. Fresh draws are fewer distinct chains (105 in 300, were 300; words used 28, were 29): her recent words spread them across episodes |
| M30 | Shape-Shifter, praise | After a fix-it link (a letter found for a sound, after the sparkle sometimes) the praise can be "Wow! You read that all by yourself!" or "Great reading!". | **(a) a small praise set for fix-it ("You fixed it!"), and none claiming "by yourself" after help**; (b) keep: the shared praise is fine | (a), item 104: "You fixed it!", "You fixed the spell!", "Nice fixing!" after a fix-it link; a read-it link with help or a miss never takes "by yourself" |
| M31 | Shape-Shifter, wording | "Uh oh, it is changing again!" and "It changed, but the word did not!" are uncontracted, where the wording pass contracted every such line; "it" is first the creature, then the label. | **(a) "Uh oh, it's changing again!" and "It changed, but its word didn't!" (then `voice:lines` and `voice:build`)**; (b) keep | (a), item 104: "It changed, but its word didn't!"; "Uh oh, it's changing again!" contracted, then dropped with "Here comes the spell again!" (M26) |
| M32 | Her outfits | Julia's chef and knight pictures count the hat and the raised sword in her height (head to soles 0.85 and 0.87 of the picture against 0.96 in her dress), so beside chef or warrior Dada Jason she stands about 11% shorter than in other episodes: the hat-counts-as-height error item 093 fixed for the grown-ups, on her side. | **(a) a fill for her outfits too, measured as ADULT_FILL was, so she is the same height in every outfit**; (b) keep | (a), item 104: `OUTFIT_FILL` (each outfit's `fill` and `DRESS_FILL` in `content/battle/outfits.ts` since item 122) (dress 0.957, chef 0.843, knight 0.868: the mean of hunt 6's figures, 1% grid crops scaled by the glasses' width, and pixel rows), `outfitTall`: chef Julia 143.3 px head to soles beside chef Dada Jason, 143.5 px in her dress (`tests/heights.spec.ts`) |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W27 | Shape-Shifter | `clipped-line` flags "A shape-shifting spell!" in "Oh no! A shape-shifting spell! It keeps changing one letter!". | An exclamation, natural in context (the heuristic's known false alarm). |
| W28 | Shape-Shifter | The fix-it instruction (three rows) at the top covers the top 60 px of the creature. | The creature stays recognisable, the label is clear, and the stones she walks to must stay clear above all (fix 102). |
| W29 | Charge the Spell | Dad's 2 before the last rune is lit still flashes his cue and is dropped (the code read's finding). | M24's ruling: a press from the last rune lit is kept; earlier presses are before the read is asked. |

### Where the next hunt resumes

- Superseded by the later hunts: hunt 7 ran six drawn episodes back to back at real speed,
  `parent_all`, `debug_rooms` and the `qa flags` URLs, hunt 9 `npm run shots`, and every later
  sweep carries `spawn-in-reach` (each hunt's opening paragraph says what it ran).

## Hunt 7 (2026-10-22)

The day's cast growth and the story fight: the seven new allies (items 111, 114), the three
new villains and their fights (item 115: frost clash, space race, magic show), Evil Smaug's
story fight (item 107) and Charge going solo (item 106). The checker's new `QA_SET=cast`
(each new ally once, against the new villains and older ones, the story fight twice, three
drawn episodes) swept twice; the item-080 lenses, `parent_all`, `debug_rooms` and eighteen
new `qa flags` URLs with the new cast drawn; six drawn episodes back to back at real speed;
the new allies' outfits measured in battle; two code reads (the story fight with item 115's
staging; Charge solo with the new allies' content), each claim checked before it counted.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 119 | Battle move choice | In a crowded fight (the story fight: her, Dad, the ally, the villain and minions, props) a pad could open inside her reach, the green dot already over it: a green mashed through "Use HOP!" picked it unread (a quarter of 400 crowded layouts). Placement keeps every pad past her reach (and 25 px) where that costs no older rule: a contest's pads stay on her side and no sign covers anyone more than before (a review of the first try found it breaking both in narrow rope pulls). | `tests/unit/padPlace.test.ts` |
| 120 | Story fight, the gold grab | Yellow pressed again and again queued a copy of Dad's long "I'll keep him busy! Julia, sneak over to his gold..." for every press (six for six): green waited them all out and they spilled over the next beats. Yellow says it again once its line has begun and ended. | `tests/hunt7.spec.ts` |
| 121 | Story fight | Dad's spinning attack never spun: a whole turn added is already at rest (a fighter settles to the nearest whole turn), so only the sparks showed. He flips round now. | review (shot) |
| 122 | Story fight | Helpers her move summoned (Teddy Army for TUG, Penguin Crew for HOP) had nobody to fight and stood by the stone through the next dodges to the end. They go with a poof as the team walks back to its marks. | code read |
| 123 | Story fight | Off the ledge she dropped 130 px in one frame, then slid home. She comes down with the walk. | code read |
| 124 | Charge the Spell | Back from the grown-ups page with every rune charged, the room asked for M's rune art for a word with no M ("art: not ready rune_m", the checker's page error). Its first rune stands in. | `tests/hunt7.spec.ts` |
| 125 | Shape-Shifter, word draws | A chain's words came back episode after episode: a drawn run read MAT, MAN and PAN in three episodes of four, and 45 of 100 simulated episodes shared a chain word with the one before. Her recent words weighed a quarter, but the best-scored pool (M29) is a handful of chains, so the weight hardly moved it. A chain holds at most one word she read lately where a chain that long allows (25 of 100; still four links, a read-it link and all three places changed, as M29 has it); the final drawn run read one repeat an episode at most, where MAT MAN PAN had come back whole; asked of Matt mid-hunt, "your take, correct it now". | `tests/unit/shifterDraws.test.ts`; golden draws rewritten |
| 126 | Title | The welcome is always Dada Matt's line, but the title waited only for the drawn cast's art: a draw without him (`?seed=abc`, `?cast=bogus`; back at the title after an episode, the same) showed his face card before it loaded ("art: not ready face_dada_matt"). His face is waited for too. | checker `qa flags` |

Checked and clean: Julia's seven new outfits stand her own height head to soles (143.2 to
144.0 px against 143.5 in her dress; `tests/hunt7.spec.ts`); the story fight is never drawn
at random and always forces Evil Smaug; every `story_smaug_*` and new fight line exists for
every narrator; the space race's scenery stays in its race; Evil Elsa's frost edges sit
under every prompt and the reading targets stay clear of them.

The checker itself: `QA_SET=cast` and the new `qa flags` (README); `pad-in-reach` (look: a move pad
opening within her reach, measured from where she stood as the pads went down); a picked picture
popping up as its word is said is no `target-covered` (W33); `spawn-in-reach` leaves
out a lone answer (the bed she wakes in, the hub's secret door: hunt 6's first hits, read
against fixes 61, 98 and 104, were these two only); `locked-silent` leaves out Charge (its
quiet is hers, saying the sounds back); `clipped-line` leaves out the story fight's
back-and-forth and passes "Ready, set, launch!", "Nice fixing!" and a "doesn't";
`variant-repeat` allows a busy child's yellow; a battle's fetched things are no
`giveaway` (a `fetched=` boot flagged "THE BUN!"); `QA_DIST` lets a second sweep run beside
the real-speed one; its output folder is per `QA_TAG` (a second sweep's start emptied a
running one's); a reload is bounded at 60 s, so a hang is a `stall` with its shot (one
`reload_points` sat silent for its whole timeout after reloading at hub part 2, not seen in a
rerun or in direct reloads). The harness walks her to a pad again when she never set off: with
fix 119 a sea tug's JAB opened 126 px away and the checker pressed green from her station, which
pads inside her reach had hidden. `qa devkeys skip` reads the scene again before the recap: its last F2 could land a frame late on the victory screen and skip to THE END, and the checker then waited for a recap that never came.

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M33 | Story fight, art | The three story props are still placeholder pictures: the stone she hides behind is a flat grey ball (it reads as a moon), the hoard a crown emoji, the ledge a mountain icon. | **(a) a candidate round, `art:alts prop_fight_stone prop_fight_ledge prop_fight_hoard`, then pick**; (b) keep | (a), promoted in item 122 (`prop_fight_stone` 1, `prop_fight_ledge` 2, `prop_fight_hoard` 1; commit 97de8c7) |
| M34 | Charge the Spell, solo | Solo lasts one episode and only Charge's own read (after every rune) or the bridge's level 3 starts it, and an episode has one phonics room: the solo runes ("Say it with me!") are never reached in play, and every visit with Dad away waits the 8 s at the read again. Also, Dad's 2 while the helper is sounding the word out records it as her unaided first-try read (the docs call it his answer). | **(a) solo lasts the session until Dad presses, and a press during the solo read records a helped read (not first try)**; (b) solo for the session only; (c) keep | (a), item 119: `episode.solo` survives `resetEpisode` (the page session, not the store), so the next Charge says "Say it with me!" and reads together at once; Dad's yes during the solo read records `helped` (right, not first try). Dad's 2 at THE END does not end it. |
| M35 | Allies' heights | Elsa, Anna, Jasmine, Seraphina and Moriarty stand at Julia's own height (`size: 1`), Moriarty a grown-up magician beside her in his library and on the picnic blanket; Ozymandias (1.3) and Bluerilla (1.4) stand taller. | **(a) Moriarty 1.3, as Ozymandias (he reads as a grown-up beside Dad); the others keep her height, friends her size**; (b) the grown-ups (Elsa, Moriarty) 1.3, the teens 1.15; (c) keep | (a), item 119: Moriarty `size: 1.3`; Evil Moriarty keeps 1. |
| M36 | Shape-Shifter, variety | Fix 125 spreads chains from one episode to the next, but they come back whole three episodes later: the final real-speed run read MUG BUG BUN BIN in episodes 1 and 4, VAN MAN MAP MOP in 2 and 5, CAT CAP CUP in 3 and 6. Her recent words (`VARIETY.words`, 24) hold about two and a half episodes, and the chains changing all three places are few. | **(a) the Shape-Shifter remembers its last six chains as a rotation of its own (`recent`), and a chain sharing a link with one of them waits**; (b) `VARIETY.words` up to 40 (every game's words rotate slower too); (c) keep | (a), item 119: `recent.chains` keeps twelve; a chain sharing a link with the last six (`SHIFTER.recentChains`) waits, then one the same as any kept, where the pool allows. 50 drawn chains in five runs of ten: no repeat, no shared link. |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W30 | Shape-Shifter | The next fix-it link's stones pop in under the praise box for a moment (item 108's overlap; `target-covered` in `debug_rooms`). | Green waits while the line plays; the instruction that follows moves the box to the top. |
| W31 | Hub scenes | Three new lines hold a bank word inside a longer one (snowman, humming, locks), as older ones do (shells, cupcakes, yummy, biggest). | The draws already keep every such word out (`withStems`); the line test matches whole words on purpose. |
| W32 | Story fight | The narrator's praise ("Great reading!") after each pick, where the story's characters do the talking. | The narrator is the ally, who is in the fight. |
| W33 | Sentence room, entry hall | A picked picture pops up into the banner's bottom 15 px (`ozy_tiamat`), and after the warm-up's grab "You got it! Now let's go out the door!" sits over the bottom row (real speed). | The answer is made (W12's kind). |
| W34 | Battle move choice, contests | In a rope pull a pad can still open inside her reach (`pad-in-reach`, 69 to 76 px in three of the final sweep's sea tugs): her side of the serpent is narrow, and keeping every pad on her side and off him outranks her reach (fix 119, after review). | A wrong pad there is a gentle retry; a right one is the word the partner just said. Widening her side would move the rope's staging. |


### Where the next hunt resumes

- Superseded: M33 was done in item 122 and M34 to M36 in item 119; hunt 9 ran `variants6`
  at `WW_SPEED=1`.

## Hunt 8 (2026-10-22)

Cut short: the hunt ran 6:12 to 6:25pm and 6:41pm to midnight's close-out, with a play
pause at Matt's word between (its resume reached the session only at 11:59pm). What landed
since hunt 7 first: item 121's words, pictures, lines and variety changes, item 122's outfit
rename, rune-loading split and story props, item 123's roster split, Charge solo for the
session and the Shape-Shifter's chain rotation (item 119). The new `QA_SET=hunt8` swept
once (five scenarios, eleven episodes, every shot's contact sheet read); the roster's
eighteen exports compared before and after the split (identical); the outfit fills before
and after the rename (identical); a code read of items 119 and 122 (the rune split against
debug mode, F9, reloads and the `scene=` / `charged=` URLs; solo across `resetEpisode`,
the debug sandbox and Dad's presses; `recent.chains` in an older store), each claim checked
before it counted: clean; the sixteen new pictures looked at as she would name them; item
121's new lines read against the speech rule; `npm run variety` read. Not run: `variants6`
at real speed and the lenses (both stopped by the pause, then by the close-out).

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 127 | Battle | A shielded hit floated BLOCK! (three hits in ten on a main fighter), and item 121 made BLOCK a bank word, a thing, so the attic's counter word after battle 1 could be a word battle 1 had just printed (item 121 had turned SPLASH! into SPLOOSH! for the same reason). It floats CLANG!; the counter item's shield SHIELDED!. | `tests/unit/shouts.test.ts` (no floating shout is a bank word, the filtered hit words aside) |

Checked and clean: Charge stays solo from one episode to the next with no press from Dad
(three in a row, "Say it with me!" from the first rune of the second); five drawn
Shape-Shifter chains in a row share no link; the story fight's new stone, ledge and hoard
and its splashes; the counter word already keeps clear of every cast word, ability names
inside longer words too (HAMMER, PANCAKE, DUMBBELL).

The checker itself: `QA_SET=hunt8`, `chain-repeat`, `solo-lost`, the `words=` flags (README);
a word confirmation's shot label counts as said for W33 (the nut popping into the banner
was flagged while the bus was between queue and start).

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M37 | Shape-Shifter, word variety | The chain rotation (M36) holds, but its words skew: in `npm run variety` (300 episodes) MAT is read in 115 and BUG in 103, while 16 of its 47 words (DOG FOX BED BOX CAN NUT TUB LOG...) never come up; `shifter5` read MAT three episodes running. The all-three-places chains (M29) are few and share their words. | **(a) a chain holds no word read in the episode before, where the pool allows (fix 125 allows one)**; (b) let a chain changing two places in when its words are all fresh; (c) keep | (a), done in item 126 (`LAST_READ`; under M36's no shared link) |
| M38 | Charge the Spell, solo pacing | Solo from the start of a visit (the session's second Charge on) runs 32 to 33 s against the room's 30 s budget (`slow-room`), locked the whole time: four runes each with "Say it with me!", then the read together. | (a) a shorter `CHARGE.soloBeatMs`; (b) "Say it with me!" on the first rune only, the rest the sound alone; **(c) keep, and the budget 35 s for a solo visit: she is saying the sounds along with the helper, not waiting** | (c), done in item 126 (`SOLO_CHARGE_BUDGET_MS`, tests/qa/wording.ts) |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W35 | Hub | Item 121's longer story lines run to three rows, and the box covers most of the glowing circle (79 of 95 px) on the story's last line. | W12's kind: green waits while the story plays, and the line sending her to the circle keeps off it (`tests/cover.spec.ts`). A box at the top would cover the gift's card, which that line is about. The checker rules it under story lines only. |

### Where the next hunt resumes

- Superseded: hunt 9 ran these asks (`variants6` at real speed, the lenses and URL flags,
  `parent_all` / `debug_rooms`, the grown-ups page's word grid with NEW), and item 127 stored
  SWISH and DASH (README, *Stored words*).

## Hunt 9 (2026-10-23)

Overnight, 1:27 to 6:26am. What landed since hunt 8 first: item 126 (door b's Shape-Shifter
about half the time, Evil Smaug's story fight drawn, COW MOM DAD, the GRAB and FIX lines,
`LAST_READ`), item 127 (stored words) and item 128 (the banner's cream band). Then hunt 8's
leftovers: `variants6` at `WW_SPEED=1` (six drawn episodes in 42 minutes, 958 shots, every
contact sheet read: no silent line, no stall, nothing new beyond fix 129), the lenses
(`QA_SET=lenses`, the URL flags and dev keys with item 126's words and `sentence=`), and
`parent_all` / `debug_rooms` / `end_mash` / `voiceless`. The new `QA_SET=hunt9` swept, then
grew: ten drawn episodes back to back (`drawn10`), the story fight under F9, dad lock, reloads,
a hidden tab and resizes, and Dad erasing all progress mid-episode (`erase_mid`). Every other
batch (the first, second and third, `cast`, `hunt8`) swept again on the last build with the new
checks; one more drawn episode at real speed with the fixes in; `npm run shots`. A second
reader went through items 126 to 128 (the story fight remembered and drawn for every cast
shape, stored words on every path to the screen, the banner's strips across a texture swap,
the debug sandbox and F9 with the new rotations): nothing a player would see. `npm run
variety` read against a run of item 126's tree (before item 127). The grown-ups page's word
grid with NEW and its new page 3 (hunt 8's look): clean.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 128 | THE END | Dad's cue read DAD: PRESS 2 TO PLAY AGAIN after every episode, and item 126 made DAD a bank word (it took DAD off the yes / no cue and the dad-lock badge for that reason). It reads PRESS 2 TO PLAY AGAIN. | `tests/unit/shouts.test.ts`: no fixed upper-case text the game prints holds a bank word (the grown-ups page and the probe aside) |
| 129 | Shape-Shifter | Stepped up out of the next link's reach (fix 104) from the middle option, she stood in front of the label, her head over its bottom row: the letter that had just changed (the B of BUG, the F of FAN, twice in `variants6`). Under the label she steps to its side too. | `tests/hunt6.spec.ts` (the lit-letter test); checker `text-under-hero` |
| 130 | `npm run variety`, `?words=new` | `NEW_WORDS` held item 127's stored words, so the variety table listed SACK DASH SWISH GATE as new words that never came up. It leaves them out. | `tests/unit/variety.test.ts` |
| 131 | Word machine | The same as fix 129 at the machine (its step-up is fix 98's): from the middle tile she stood in front of the plate, over the word's rime ("Change the first sound to make a new word!" with her over AM, `machine_solid`, found by `text-under-hero`). In front of the machine she steps to its side too. | `tests/machine.spec.ts` (round 2) |
| 132 | Sentence room, read pass | The green dot under the word she reads was placed under the whole banner, and item 128's taller banner (pole, trim, tassels) hung it 115 px below the word, over the top of the left picture: a green dot there means "take this" (`npm run shots`, `default_room_read`). It sits on the banner's bottom trim, just under the cream band. | `tests/banner.spec.ts` (the read pass's green dot) |

The checker itself: `QA_SET=hunt9` (README); `text-under-hero` (look: a reading-size word under
her figure, drawn above it; the probe lists her figure, `qaHero`); `door-b-streak` (look: the
Shape-Shifter in or missing from three episodes running; a word on a stone or pad she stands at
is left out, M42); `eraseAt` (Dad erases all progress mid-episode, `erase-return`); the story
fight under F9, dad lock, reloads and a hidden tab (forced: a seed's draw does not survive F9 at
the title or a reload); `spawn-in-reach` measures from where she stood as the spot first showed
(`SpotInfo.from`: a driver walk between sparse polls was flagged in `drawn10`); W30's stones under
the praise box and W33's hall pictures under its last line are coded as rulings, no longer bugs;
a wedged page is a bounded stall (M44); `shows-target` leaves out the grown-ups page's own words (its "none = ANT" over a bridge on ANT); a scenario outside the first batch needs its `QA_SET`
even with `-g` (README).

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M39 | Shape-Shifter, word variety after item 127 | Item 127 stored eight of the room's CVC words (MAT RAT BAG MUG NUT TUB BIN HEN), and the chains narrowed onto MAN: in `npm run variety` (300 episodes, about 150 visits) MAN is read in 77 visits and MAP in 67 (MAT, the top word before item 127, was 50 of 144); distinct chains fell from 94 to 56, words used from 31 to 23, and a two- or three-link chain (a short visit) from 10 visits to 39. Every hunt-9 sweep read MAN two episodes in three of the Shifter's (PEN PAN VAN MAN MAP; PAN MAN MAP MOP MOM). `SHIFTER.wordChains` 3 or 4 changed nothing in the simulator: the pool itself is the limit. | **(a) a content item: about eight new pictured CVC things that link to each other away from MAN, MAP and PAN (a `bank:audit` of `SHIFT_WORDS` first), then `npm run variety`**; (b) let a chain changing two places in when every all-three-places chain shares a word with the last two chains (M37's option b); (c) keep | (b), no words added, done in item 130: two places changed count as three (the vowel a lean in the draw, `THREE_PLACES_WEIGHT`), and the link rotation applies within the read-it chains (rotated first, a visit fell to two links). CAN came back too (M40). `npm run variety` (seed 1, against item 129's tree): MAN read in 70 visits of 153 (77 of 150), 101 distinct chains (56), 17 short visits (39); seeds 2 and 3 the same way. About half the chains change the vowel. MAN stays the most read: most four-link chains through the pool's one linked group (CAN MAN PAN MAP CAP...) pass through it, and the draw's weights barely move that |
| M40 | Word bank | Six bank words can never be read: BED, DRUM, LAMP and DUCK are the bedroom's own props, shown every episode (fix 74); CAN is in the counter frames' CAN NOT; RUN is in RUNS FROM THE, and every frame's words stay off the pads (fix 66), so RUN, an action only, is never a pad or a gift. `npm run variety` lists them under "never" in every run (RUN is never even shown). | (a) store the six with the reason "shown or said every episode", so the bank audit and the grown-ups page say so; **(b) for RUN and CAN: keep a frame's words off the pads only for the frames this episode draws (frames are drawn after the pads, so a frame holding a pad word waits), and store BED DRUM LAMP DUCK as (a)**; (c) keep | (b), done in item 130 (`framesClear`, `STORED_WHY`). CAN's real block was Julia's own taunt "You can't catch me!" (`saidEarly`, every episode): it, Jasmine's and the robot's "You can't..." are reworded. RUN and CAN are read in `npm run variety` |
| M41 | MOM and DAD in sentences | Item 126's MOM and DAD are things, so any frame can hold them: SCAR NEEDS A MOM (`variants6`, its pictures a mom and a dad side by side), and the draws allow DADA MATT NEEDS A DAD, GO GET THE DAD, EVIL TIAMAT IS SCARED OF THE MOM. Fetched, each flies into the bag as an item. Julia's family is two dads. | (a) keep; **(b) MOM and DAD out of the fetch frames only (NEEDS A MOM reads as the character lacking one); the counter frames read as a joke (TIAMAT IS SCARED OF THE DAD, `qa flags`) and stay**; (c) out of every frame (read in the warm-up, the bridge, the machine and the Shape-Shifter); (d) store MOM | (b), done in item 130 (`NOT_FETCHED`) |
| M42 | Shape-Shifter, level 1 stones | At level 1 a stone sounds itself when she reaches it ("This letter says..."), and standing at it to choose, her figure covers its letter (the B under her in `wrong_seed102`, 60% of it): she hears the sound while the letter is hidden (the word machine's tiles were never flagged). | **(a) a stone sounding itself lifts a copy of its letter over her head (a bubble) while it speaks**; (b) she stands just below a stone, not on it (her head still reaches its letter); (c) keep: she read it walking up | (a), done in item 130: the bubble stands beside her head (over it, it met the label and her green dot) (`liftLetter`; `tests/hunt6.spec.ts`, the level-1 stone test) |
| M43 | Quest place rotation | Elsa and Anna both train at the ice castle, so with Elsa then Anna as allies (`drawn10`, episodes 4 and 5) she plays the same place, hub and side rooms (skating pond, snow garden) twice running; the ally rotation knows nothing of places. `npm run variety`: the quest place is back within two episodes in 5% of episodes. | (a) the ally draw leans away from an ally whose place was last episode's (a draw change: golden draws rewritten); **(b) keep: rare, and the hub story, cast and words differ** | (b), kept (item 131) |
| M44 | The checker, a reload at hub part 2 | Hunt 7's one-off came back: `story_reload` (the story fight forced, seed 976) reloaded at hub part 2 at 3:16:54am and the page never came back; the stall's own `page.evaluate` then waited on it for the rest of the 30-minute timeout (Playwright's trace: the reload path threw, then `Recorder.capture('stall')` hung in `state()`). The renderer sat idle (0.9 s of CPU in 5 s), not spinning; eight reloads at hub part 2 in isolation each came back in under a second. Both times it was a reload at hub part 2, about three minutes into a sweep with a second worker running. The checker now bounds the stall's shot, its recorder and its last probe read (20 s each), so a hang is a stall with its JSON. | **(a) keep watching: with the bounds a recurrence costs a minute, not 30, and names the point; chase it only if it comes back outside the checker (a real reload by Dad)**; (b) a trace-on run of `story_reload` and `reload_points` (Playwright `--trace on`) until it recurs, to see whether the navigation's request or the page stalled; (c) a timeout on every `page.evaluate` in the harness | (a), keep watching (item 131) |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W36 | Hub part 2, after F2 | With every step skipped to the secret door (`qa devkeys skip`), "Look, a secret door! Let's go through it!" sits at the top and covers the top 18 px of the door's sign. | The door itself is clear and the box moves off where she stands; only the dev keys bring it there. |
| W37 | Sentence room | Item 128's banner hangs from the top, so the bag's row (eight or nine fetched things by the attic) sits on its top trim, a few pixels above the first row's words. | It never reached a word in any sweep (the cream band starts below the row); worth a look only if the bag grows past nine. |
| W38 | Charge the Spell, Dad away | The session's first Charge with Dad away runs 32.9 s against the room's 30 s (`charge_solo3`, `slow-room`): it waits its 8 s for Dad's press, then goes solo. | M34's design: solo starts once he has not answered, and every later visit that session is solo from its start (M38's 35 s budget). |
| W39 | `tests/banner.spec.ts`, Word → Picture (parked) | Run beside a second browser run, its check flagged a picture 5 to 6 px under the banner (KING, ELSA) twice; alone it passed three times in three and in `test:browser`. Item 132 (10-23, 11:45am) saw it fail alone, `--workers=1 --repeat-each=6`, four times in six on both 66a53f4 and item 132's code (BIB, EGG, THREE, KING, LOCK, SHIP, ELSA, TIAMAT): only the middle picture can sit under the banner, its bob's top at 265 px against a banner bottom that varies run to run from 261 to 275 px for the same kind of word, and still after the pop-ins settle. | **Fixed, item 133** (10-23, 3:35pm). Not the font: Comic Sans is a system font, `document.fonts` reports it loaded at the first frame, and the banner of one word measured the same every run. The banner's height follows its word's ink: 76 px letters end it at 273 to 275 px (G and J reach lower), a word over six letters drops to 64 px and ends it near 262; the word is drawn afresh each run, hence "run to run". What failed was the middle picture under it: its top settled at 265 to 270 px (the 5 px bob), so 3 to 10 px under the banner's foot, and its `popIn` (Back.easeOut, about 1.1 at the peak, grown from the pedestal's feet) reached 247 px (`kite`, `vet`, `jasmine`: 17 to 26 px under). The pictures stand 40 px lower (`PICTURE_FEET` 560, `src/scenes/minigames/WordToPicture.ts`): the pop-in's peak stops at about 285. The test then passed alone 10 runs in 10 (`--workers=1 --repeat-each=10`). |
| W40 | Victory | `text-offscreen` (bug) once at real speed: VICTORY!'s box reached 4 px above the screen at its elastic pop-in's overshoot (`drawn_cast3`, shot 327). | The box carries the font's line height and stroke; the letters' ink stayed 50 px inside the top. |

### Where the next hunt resumes

- **Done since:** Matt's calls M39 to M44 are ruled and done (items 130 and 131; M44 is
  keep watching), and M39's `npm run variety` look against this hunt's Shifter rows is in
  its ruling.
- Superseded: hunt 10 ran `npm run perf` (title 0.96 s, quiet hub 2.02 s: item 133's 1.07 and
  2.12) and `QA_SET=lenses` with M44's bounds in (no reload hung).

## Hunt 10 (2026-10-23)

4:14 to 7:10pm. What landed since hunt 9 first: items 130 to 134 (M39 to M42 done, the rulings
moved to `docs/rulings.md`, item 132's cleanup across 151 files, item 133's placeholder and
perf changes and seeded house draws, item 134's arena ambience candidates). The new
`QA_SET=hunt10` swept (nine scenarios), and again with the fixes in; five code reads, of items 130 to 134's
diffs and then by lens (timers and state across scenes, the grown-ups page, content; input in
transitions, the second episode, audio, the fight stages; the speech rule end to end, yellow and
green, the recap, the hub; Charge, the bridge, the word machine, the story fight), every claim
checked by a second reader trying to refute it; hunt 9's leftovers (`QA_SET=lenses` with the new
`ambience=` flags, `npm run perf`); the first batch, `cast`, `hunt8`, `drawn10` and `recent`'s
`debug_rooms`, `end_mash` and `voiceless` with the fixes in; one episode at `WW_SPEED=1` (6.6
minutes: no silent line, no stall, no lock over 13 s); `npm run shots`; every contact sheet of
every sweep read by readers as she and Matt would, each claim checked against its full-size shot;
every word picture in play (155) looked at as she would name it; `npm run variety` (seed 1: the
same as item 130's, MAN 70 of 153 visits).

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 133 | Attic, Evil Bavmorda | M40 made CAN readable, but her cackle "You cannot stop my magic, little hero!" (battle 1) said and showed CAN-NOT, and the attic could then ask for CAN: CANNOT was one token, not CAN. | `tests/unit/wordrules.test.ts` (CANNOT says CAN: NOT among `COMPOUND_HALVES`) |
| 134 | Shape-Shifter, level 1 | Item 130's lifted letter rides beside her head; come at the middle stone from above (where the step-up leaves her) and it sat on the label, over its middle or last letter, the one she was fixing. It stays under the label's plate, and clear of the stone's green dot. | `tests/hunt6.spec.ts` (from above the middle stone) |
| 135 | Sentence room | HAY (item 121) took an A: WE NEED A HAY, ELLIE NEEDS A HAY. It joins `NO_ARTICLE`. | `tests/unit/wordrules.test.ts` (no A before a `NO_ARTICLE` word), `plansGolden.json` regenerated |
| 136 | Attic → battle 2 | A named counter item's name holds other words: "We found the Sunshine Bus!" (warlock Dada Jason's) said SUN in the attic before a battle-2 SUN pad, and the battle's banner showed it (Fish Bucket: FISH; Juice Box: BOX...). The villain's counter item's words are kept off the pads, the gift and the warm-up's word. | `tests/unit/episodeDraws.test.ts` (40 warlock episodes, no SUN or BUS pad) |
| 137 | Charge the Spell | The helper's gesture glyph popped in on her side, on her face and body as the sound played (M's cake slice; the dove, car and train fly 160 px each way). It plays on the helper's far side. | `tests/charge.spec.ts` (the snappy round: no glyph on her); checker `glyph-on-hero` |
| 138 | `?ambience=` (item 134) | A candidate in a battle whose villain fights elsewhere ("whoever the villain is", `docs/episode.md`) drew its arena unloaded: `art: not ready arena_nursery`. The battle's art needs hold the trial's arena. | `tests/hunt10.spec.ts` |
| 139 | Grown-ups page 3 | F8's "Press F8 again to erase all progress." printed over the "Out of play since item 040" line: item 130's four stored words pushed that line down to y 682. The line ends above the warning, which has a band of its own. | `tests/hunt10.spec.ts` |
| 140 | Shape-Shifter | On a wrong stone or a hint ("This letter says..."), the stone she stands at sounded with her figure over its letter and no lifted copy: M42's case at any level. Its letter is lifted beside her while it sounds. | `tests/hunt6.spec.ts` (a wrong stone) |
| 141 | Battle, rooms, title | A camera shake (up to 3% of the screen) uncovered the edge of the world: black bands down the left and along the top on big hits (a supercharged move, the ultimate). Each backdrop that shakes has a larger copy behind it (`backdrop`, `src/fx/juice.ts`). | `tests/hunt10.spec.ts` (the arena and the hub past every edge) |
| 142 | Shape-Shifter | "The spell is all used up! This one comes to the fight with us!" played after the last creature had flown into the bag, pointing at nothing. The line plays with it still there; then it flies. | `tests/hunt6.spec.ts` (the closing line) |
| 143 | Moriarty's lines | "Tick, tock, my clockwork gadgets!", his COPYCATS move and "mind the trapdoors" said CLOCK, CAT and TRAP, and none counted as said: a key word or pad could be one of them after he said it. WORK and DOOR are compound halves, COPY a compound head (fix 133's kind). | `tests/unit/wordrules.test.ts` |
| 144 | Grown-ups page 1 | Fix 82 again: item 121's CANNOT_GET_PAST_THE row wrapped its last count onto a second line at `fitText`'s 10 px floor (a 22 px row held two 10 px lines), on a fresh store. A row is at most 20 px tall and shrinks to 8 px. | `tests/hunt10.spec.ts` |
| 145 | Battle, F9 | F9 in the closing fade (after the retreat, or the villain turned good) opened the grown-ups page, and coming back played the whole finished fight again: the rooms, the ending and the victory scene already wait their fade out (item 089). The battle does too, the story fight's ends included. | `tests/hunt10.spec.ts` (the hooks' `battle.fading`) |
| 146 | Spell and frost clash | While a move choice was open, the clash point still made a full-strength ring every 7.5 s, over the fighters and the pads she walks to, following her hand (fix 25's kind): the emitters stop then, the rings did not. | `tests/hunt10.spec.ts` |
| 147 | Grown-ups page, debug mode | The DEBUG corner tag (a DOM tag, top left) covered the start of the page's title. The title starts clear of it while debug mode is on. | `tests/hunt10.spec.ts` |
| 148 | Stretchy Bridge | `bridgePictures` puts first-sound pictures first "so the first letter is never enough", but a word with none in the pool still crossed: THUMB beside a thumbs-up, a dad and a pen, ANT beside PLANT and CRAB (TH or A alone picked it). A visit draws only words with a far-bank picture sharing their first sound, checked against its other words; and a later crossing keeps off the wrong pictures an earlier one showed (SIX stood on all three of `firm_blends`' STICK, SINK, SOCK) unless that leaves none sharing its first sound. | `tests/unit/bridge.test.ts`, `plansGolden.json` regenerated |
| 149 | Bedroom → BLOCK | The bedroom's tower of toy blocks shows every episode (M40's case), but its glyph (🧱) is not BLOCK's (🟦), so BLOCK counted as unseen and was read after it. Stored, as M40 stored BED, DRUM, LAMP and DUCK (its picture also read as a die). | `tests/unit/stored.test.ts` (every bedroom prop that is a bank word is stored) |
| 150 | Entry hall | The villain's floor decals kept off each warm-up picture but not the gaps between: a bone pile between HAND and TRUCK on the bottom row read as a fourth thing to pick (`seed104`). They keep out of the pictures' whole grid. | `tests/hunt10.spec.ts` (three seeds) |
| 151 | Hub, the gift card | The gift word was a fixed 54 px with no fitting, pulsing to 1.12: SPLASH (276 px with its stroke at the pulse's peak) ran past the 220 px card, CHOMP, SMASH, CRASH and STOMP past its white. It is fitted to 180 px, as the move pads' words are (fix 43). | `tests/hunt10.spec.ts` (`words=splash`) |
| 152 | Battle, a villain's ultimate | Its vignette was one rectangle with an 80 px stroke: a hard-edged flat band 40 px in from every edge, in the ultimate's colour, that slid with the shake (three readers, `soak3` 986, `drawn10` 1384). It is ten bands fading inward from past the screen's edge. | A look (`npm run shots`, the battle shots): the probe does not see shapes |
| 153 | Bedroom | The toy robot stood where the ally pops in, every episode: it poked up behind Ellie's head like a hat, and chef Dada Jason hid it (`npm run shots`). It stands on clear rug. | `tests/unit/stored.test.ts` (no toy on a grown-up's spot) |
| 154 | Sentence room, a fetch room | M13 gave the attic's find line a narrow box because its banner takes two rows; a fetch sentence that wraps (DADA MATT NEEDS A PLANT, no ally) took the wide box, which hid her from the waist down (48% of her) on "Now find it, and press green!". The find line goes narrow under any banner tall enough to push the pictures down. | `tests/cover.spec.ts` (a fetch room's find line) |
| 155 | Stretchy Bridge, word machine | M30's rule (no "Wow! You read that all by yourself!" after help or a miss) reached only the Shape-Shifter: the bridge after Dad's hint or a miss, and the machine after two silly tiles and the sparkle, could say it over a YES!. One helper (`readPraise`, `src/episode/lineVariants.ts`) for all three. | `tests/unit/taunts.test.ts` (the praise) |
| 156 | Word machine | After two silly tiles the right tile sparkles; once she put it in, the stars kept rising over it through the payoff, the bag and the praise (the bridge and the Shifter stop theirs). | A look: `stopSparkle` in `built`, as the bridge's |
| 157 | Story fight | Dad's "Julia, show him what we found in the house!" was followed by the narrator's "Look what we found!", and the counter item's beat by "use_item" the same way: two lines saying one thing. The narrator keeps quiet in the story fight there. | `tests/hunt10.spec.ts` |
| 158 | Story fight, the grab | The grab's 30 s ran on while its idle re-prompt played: standing still, the third "sneak" line was cut off mid-word as the beat ended (14 of 16 of its clips are long enough). The timeout waits for a line in flight. | A look: `walk.ts`, a guard on the timeout |
| 159 | Charge the Spell, solo | F9 and back mid-visit emptied the room's record of the runes already modelled, so the solo read modelled them again: the grown-ups page's +N went up by 2 for one visit. The episode keeps which were modelled. | `tests/hunt10.spec.ts` |
| 160 | Entry hall, level 1 | The clue names each single letter before its sound, silent ones too: KITE's (and BIKE's, CAKE's, GATE's, VASE's) silent E was named "Ee", the long E's own sound, so the clue sounded out K-I-T-EE, every miss and yellow again. A silent letter is not named; it only lights. | `tests/unit/grab.test.ts` |

The checker itself: `QA_SET=hunt10` and the `ambience=` flags (README); `glyph-on-hero` (look);
`spawn-in-reach` no longer flags a spot back in its slot the same round (the word machine's wrong
tile, back under her after "That's a silly word!", `story_mash_wrong`); `lock_all` reads a move
choice opening under the lock, nothing picked, as the fight's flow (it was a `dadlock-leak` bug).

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M45 | MOM and DAD as battle items | M41 (b) kept MOM and DAD out of the fetch frames only, so they are still read in the Shape-Shifter, the word machine and the bridge, and every word read there is a battle item: the Shifter's last creature MOM flew into the bag and was hurled at Evil Tiamat as THE MOM! (`race_wrong`, a mom hugging a girl), beside MAN. | (a) keep: M41's reason was the phrase NEEDS A MOM, and the throw reads as a joke; **(b) MOM and DAD read there as now, but no copy goes to the bag (the Shifter's last creature, if one, waves and stays), so neither is ever fired**; (c) out of those games' words too (M41's (c)) | (b), done in item 136: `NO_BAG_COPY` (`content/phonics/sentences.ts`): the Shifter, the word machine and the bridge read MOM and DAD and record them, but `recordDone` puts no copy on `fetched`; the Shifter's last creature, if one, waves and stays (no "comes to the fight" line). The hall's `GRAB_WORDS` leave them out, as the warm-up word always goes to the bag |
| M46 | Shape-Shifter praise | Since FIX became a bank word (item 126), the fix-it praise says "You mended the spell!" and "Nice matching!" (`shifter_fixed`): MENDED is a word she is unlikely to know, and "Nice matching!" is an odd compliment. And "You made it match!" (its first variant) is followed at once by the next link's cue "Make it match!". The British-spelling check cannot catch a word choice. | **(a) "You made it match!" and "You got the right letter!" (voice:lines and voice:build)**; (b) keep | (a), done in item 136: `shifter_fixed` "You made it match!" and `shifter_fixed_2` "You got the right letter!" (`_3` gone); a fix-it link followed by another (whose cue is "Make it match!") takes the second |
| M47 | Battle, camera | A supercharged move's punch (a zoom) and a big hit's shake move the HUD and the caption with the arena: for a fraction of a second the caption's second row runs off the bottom and a name off the edge (`shifter_wrong3` 240, `tug_mash` 131). Fix 141 filled the black edge; the HUD still moves. | **(a) keep: under half a second, and the punch is the juice**; (b) a second camera for the HUD and the caption that neither shakes nor zooms (a change across the battle's drawing); (c) a gentler punch | (a), kept (item 136) |
| M48 | Pictures | Looked at as she would name them (BLOCK, which read as a die, is stored by fix 149): DAD and VET, standing people, come out about half as wide as the other pictures (fitted to a square, `pic_dad` is 159 x 400), so in the hall DAD reads as a tiny extra person beside the real Dada Matt; the action pictures DRIP (a faucet with one drop: TAP's reason for storing it) and CRASH (plates shattering) are battle effects only, never a pick; TUG's recap card is a thin band (a wide picture fitted to a square); PIN is a red push pin (a tack to her); GRASS is a cube of turf, a game-style grass block (she may say BLOCK or DIRT). | **(a) fit standing people (DAD, VET, MOM, MAN) and wide pictures (TUG) to a taller or wider box than a square, the rest kept (M21: nothing beside them looks alike)**; (b) an `art:alts` round for DAD as a bust and PIN as a sewing pin; (c) keep all | (a), done in item 136: `src/art/pictureBox.ts` (`SHAPED`: DAD, VET, MOM, MAN, TUG) fits those to their own aspect with the square's area, never smaller than the square; every drawn word picture uses it but the bag's chips and the machine's window |
| M49 | Hub story lines | Many hub scenes run two sentences together with a comma and keep "it is" whole, where item 087 and M31 contracted lines like them: "This speckled one in the straw has been wiggling all morning, I think it is hatching!", "Keep it warm, and keep it secret, nobody else knows it is here." (`content/house/scenes.ts`, most closing lines "..., let's look around!"). Some read oddly where they play: Anna's "I tripped over a snowman this morning, and it still stayed on." (IT is the ribbon, two lines back), Ozymandias reformed on the mountain says "Even my penguins love a party!" (no party, no penguins), and SMAUG RAN AWAY FROM THE ZOO reads as an escaped animal. The victory scenes' reformed lines the same way (M10's kind): Evil Elsa offers "Can I make you a snowman?" in the snow scene between two lines about the snowman already there, Bavmorda says "Let's dance around the cauldron!" where no scene has one, Moriarty "This is the best mystery ever!". And: Seraphina's quest line and her hub story's first line say nearly the same sentence back to back (baby dragons, hungry, feed them); Ellie's wake-up says "After school, we always play..." as she is woken in the morning; Jasmine's "The sand is my friend!" plays in Moriarty's night-time plaza; six quest lines end "..., so that is where we train!" where two do not follow. | **(a) a wording pass on those three lines only ("...and my lucky ribbon stayed on.", a mountain line for him), the rest kept**; (b) a pass on all of `scenes.ts`; (c) keep | (a), done in item 136: Anna's "...and my lucky ribbon stayed on.", reformed Ozymandias's "Explorers love the view from way up high!", and RAN AWAY FROM THE never draws ZOO (a frame's `not` list) |
| M50 | Victory podium | With an ally, the dad who woke her is left off the podium (fix 37 seats him only with no ally), though he stood in the ending scene a moment before and his face card says the recap's phonics words (`all_solid`: Dada Matt says LIP over a podium of Jason, Julia and Ozymandias). | (a) a fourth place on the podium; **(b) he stands beside it, cheering (a sprite, no block)**; (c) keep | (b), done in item 136: `podiumCheer` (`src/episode/cast.ts`): with an ally, the dad who woke her hops and cheers on the grass left of the podium, no block (nobody when he is the ally's or the villain's person) |
| M51 | Battle 1, pictures of bank things | Warlock Dada Jason's ultimate puts a 170 px smiling sun (`prop_sun`) on screen, and SUN can be the attic's counter word after it; MIX's super rains twelve 🥚, a fetched NEST lays 🥚 traps, TRAP lays 🧀, WAG summons dogs, and EGG, CHEESE or DOG can be the attic's word next (`content/phonics/effects.ts`: the glyphs are those bank words' own). Pictures, not the word, but the hall's rule is that it shows none of the words she reads, and fix 112 counts a rune's look-alike glyph as shown. Charge's picture letters do the same (T's table holds a teacup, CUP; M's mountains a smiling sun, SUN; F is burning logs, LOG). | (a) the eclipse shows SUN as said (`saidEarly`), so SUN waits; **(b) keep: a picture of the sun in an eclipse is not the printed word, and the attic's SUN picture is the answer anyway** | (b), kept (item 136) |
| M52 | Stretchy Bridge, the chasm | Before the stones are drawn the chasm is a near-black rectangle about 600 px wide with a straight top edge across the workshop floor: it can read as a black box or missing art (`firm_blends` 028). | **(a) soften its top edge and lift its colour toward the room's (a gradient)**; (b) keep: the stones fill it within a second | (a), done in item 136: the chasm's colours lean toward the room's floor (sampled beside the gap) and its top edge fades in over 150 px (`BridgeRoom.drawGap`) |
| M53 | Fetch frames | Two more fetch keys read oddly (M41's kind): ELSA NEEDS A ZOO (a place: it then flies into the bag as an item) and SERAPHINA NEEDS A HAND (the idiom, needing help). | **(a) ZOO and HAND join `NOT_FETCHED` (they stay in the counter frames and the other games)**; (b) keep | (a), done in item 136 (`NOT_FETCHED`) |
| M54 | Story fight, move choice | Every choice of `drawn10`'s story fight opened a pad within her reach (DRIP, RED, WEB, BUMP at 90 px against `REACH` 95) and packed the three into one cluster round her, one ring on the faded stone among the gold guards: `padPlace` gives up the reach rule when the stage is crowded (fix 119, W34's trade-off), and the story stage always is. A green mashed after "Use RED!" can take one unwalked. | **(a) the story fight's pads keep her reach first and the stone second (a ring may sit on the faded stone)**; (b) keep, as W34 | (a), done in item 136: in a story fight no pad opens within her reach whatever it costs (`padPlace`'s `me.first`), and the rings then keep off the story's props (`storyProps`) where they can |
| M55 | Hub gift scenes | The gift word is drawn with no thought for the story it ends: chef Dada Jason's snack, "Take one bite, and it goes..." NAP, then "now you are full of power!" (`npm run shots`); and Ellie's "biggest, shiniest bubble" is a flat blue dot (🔵, the DOT move's own glyph; 🫧 does not draw on Windows 10). | (a) each hub scene lists gift words that do not fit it (NAP for a snack); **(b) keep the draw, and Ellie's bubble a drawn prop (a translucent sphere) with `art:gen`** | (b), done in item 136: `prop_bubble` (`art:gen`), drawn as a 150 px square round the gift word; DOT is no longer kept out of the draws by it |
| M56 | Story fight, the fire dodge and the ledge | "He missed us! Good hiding, Julia!" plays after Smaug's fire whether she reached the hiding stone or not (`fire_after`, `content/battle/stories/smaug.ts`); and at the ledge she jumps 130 px up in one frame as she comes within reach of it, and drops back as she leaves (`walk.ts`, the ledge's lift is set, not eased). | **(a) "He missed us! Phew!" for the line (voice:lines and voice:build), and the lift eased over a few frames**; (b) a second line for a missed hide; (c) keep | (a), done in item 136: `fire_after` "He missed us! Phew!"; the ledge's lift eases (`LIFT_EASE`, `walk.ts`) |
| M57 | Entry hall → the bridge | The warm-up's word is spoken and "never read later that episode", but a word inside it can be: CLOCK in the hall, then LOCK on the bridge (`new`, `charge_yes`). CLOCK holds LOCK whole (the bridge's own fix 59 kind, a word plus a sound). | **(a) the grab word's "word plus a sound" bank words count as said (CLOCK: LOCK; BLOCK: LOCK; a list like `COMPOUND_HEADS`)**; (b) keep: she hears CLOCK, not LOCK | (a), done in item 136, by a rule: `grabSays` (`src/rules/grab.ts`) counts as said every bank word that is the grab word less its first or last sound (CLOCK: LOCK, LEG: EGG, TENT: TEN, BELT: BELL, BRUSH: RUSH; BLOCK: LOCK once BLOCK is a bank word) |
| M58 | Entry hall, decals | A villain's floor decal can land on her start spot and draw over her head as the hall opens (`new`, `drawn4` 296: Moriarty's playing card). Keeping her start clear as well (tried) leaves Moriarty's decals no clear floor, so one falls back onto the pictures' grid (fix 150's case). | **(a) a decal with no clear spot is not drawn (`houseMood`, every room)**; (b) fewer floor decals in the hall | (a), done in item 136: `scatterDecals` (`src/rules/decals.ts`) skips a decal with no clear spot in every room; the hall keeps her start spot clear too |
| M59 | Attic, the narrow find box | M13's narrow box for the attic's find line can sit over the answer's whole pedestal (JAM, `new` 237: x 750-1075 with the face card), the spot she is told to walk to. | **(a) the narrow box picks the side away from the pictures as well as from her**; (b) keep: it moves off as she walks | (a), done in item 136: a narrow find box that still covers something tries wider, shorter boxes and keeps the one covering least, the pictures counted with her (`Caption.ts`) |
| M60 | Battle flashes | A camera flash starts fully opaque (Phaser's flash): its first frame is one flat colour edge to edge, caption and HUD gone (`new` `diff3_solid` 064, pale yellow). Fix 27 caps the rate at one per 450 ms. | **(a) start flashes at about half strength (`juice.ts` `flash`)**; (b) keep (M47's kind) | (a), done in item 136: `flash` starts at half strength (`FLASH_ALPHA`, `juice.ts`) |


### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W41 | Shape-Shifter, its closing line | The three-row box of "The spell is all used up! This one comes to the fight with us!" covers her figure for that one line (`shifter_wrong3`, `soak3`). | She has nothing left to walk to or press; the room fades to the hub as it ends. |
| W42 | Battle move choice, a brawl | Three pads can stand edge to edge, and the lit pad's grown sign runs over its neighbour's border (MUD KICK in `soak3`), W34's kind outside a contest. | Each pad keeps its own border, post and ring, and the lit one is the one she stands on; only the sign's frame touches. |
| W43 | Victory, its first moment | As the scene opens the first recap card (SIX) pops up over the narrator's face card in the bottom-left corner (`drawn10` 1000). | The face card moves to the top as the first word is said (1001): a moment, with nothing to read under it. |

### Where the next hunt resumes

- **Done since:** Matt's calls M45 to M60 are ruled and done (item 136; M47 and M51 kept).
- Not run this hunt: `recent`'s `variants6` (six drawn episodes; `drawn10` stood in for the long run: ten
  episodes, no growth, heap 37 to 77 MB and back to 40), and the rest of `hunt9` (`new` and `more` swept
  last, clean). The compound check (fixes 133 and 143) is dry: every word in `lines.json` that holds a bank word
  inside it was read, and none of the 39 left (PENGUIN, VANISH, POTION...) says it.

## Hunt 11 (2026-10-24)

1:13am to 7:40am. What landed since hunt 10 first: items 137 (strict game rotation, sounds-only clues
and hints), 138 (per-story gift spots, the word machine's slot, Bluerilla's name), 139 (the rhyme room),
140 (Charge with all sounds up front, two words) and 141 (the BattleScene and rules split): the new
`QA_SET=hunt11` (17 scenarios) swept five times as the fixes went in, and every other batch once
(`lenses`, `cast`, `hunt8`, `hunt9`, `hunt10`, the first, `more`, `new`, `recent`, `qa flags` with this
hunt's URLs); six drawn episodes and two hunt-11 scenarios at real speed; `npm run shots` and `perf`
(title 0.95 s, quiet hub 2.05 s: no change from item 133's); nine code reads by lens, each claim checked
by a second reader trying to refute it (items 137-141's diffs; the speech rule; state across F9, debug mode,
reloads and episodes; the grown-ups page; draws; art and voice loading; flags; audio; fight stages; timers;
the recap; voiceless play; the bag; free play; difficulty 2 and 3; the bedroom and THE END; old stores; the
pad and keyboard; the sentence game; Wait; the bridge and the Shifter after item 137; the endings; the story
fight), each finding a little less; five contact-sheet reads of the sweeps (the fourth stopped part way, at
Matt's 4:56am memory call, its checked findings fixed as 225 to 228; the fifth of `h11g`, `QA_SET=cast` on
the last build, found 229 and 232 to 235), two reviews of the hunt's own diff (fixes 229 to 231 and fix
227's depth reset), and two content sweeps (every rhyme and Charge picture, every new line, the gift
pickups). The last `QA_SET=hunt11` sweep (`h11f`, one worker) ran all 17 scenarios without a stall.

### Fixed

| # | Where | What | Kept fixed by |
| --- | --- | --- | --- |
| 161 | Rhyme room | The printed word's plate stood at the top of the room, and the caption box sat on it through every instruction ("Which thing is it? Walk to it!", "Read it, then walk to its picture!"), its units lighting unseen as the helper sounded them out. The plate is on the row's third card, under its question mark, where the other two cards print theirs; a right pick's picture lands above it, so the finished row reads SUN RUN BUN. | `tests/cover.spec.ts` (the plate is a `qaTarget`) |
| 162 | Rhyme room | Stepping up out of a round's pictures put her at y 490 under the middle card, and she could walk up behind all three (the cards draw over her): her head and shoulders vanished. She stands between the pictures, and the floor keeps her head under the cards. | `tests/cover.spec.ts` (her head below the cards) |
| 163 | Rhyme room | Each card's "said" bounce started over its pop-in's overshoot and came back to it: the two rhyme cards stood about 9% bigger than the third all round. The bounce ends at the card's own size. | A look (code: `sayCard`) |
| 164 | Open-air side rooms | A place's `outdoor` reached only its hub: in the boulder yard, the sword yard, the dunes, the ice castle's snow garden and skating pond, the observatory's open dome and ten more, the villain's wall decals hung in mid-air (Bavmorda's potion in the forest sky, behind Charge's rune bar; Smaug's coins over the snow garden). Those rooms lay their mess on the floor (`OUTDOOR_ROOMS`). | `tests/unit/decals.test.ts` |
| 165 | Charge the Spell | Since item 140 the first word flies into the bag before the second round: with the warm-up's thing and the word machine's four already there, it landed under the second word's bar and her face card (and a four-unit word's bar covered the row's fifth thing from the start). The bar sits below the bag's row. | `tests/charge.spec.ts` |
| 166 | Hub, the gift plate | Every plate steamed: a cupcake, strawberries, chocolate, a banana. Only the soup and the stews do (`hot`). | `tests/unit/cast.test.ts` |
| 167 | Hub, the gift plate | The rising steam is inside the spot, and the green dot sits over the spot's bounds: it crept up and dropped back about 20 px every half second while she stood in reach. The dot keeps to the pickup's halo (`Spot.dotAbove`). | A look (code: `RoomScene` dot) |
| 168 | Hub, Ozymandias | His penguins' word from the ice and his ice crown's crystal were handed out from a heap of gold coins ("Stand by the treasure..."). Both take the glowing circle, as before item 138 (voice:lines and voice:build). | `tests/unit/cast.test.ts` (the line names its spot) |
| 169 | Hub, Bluerilla | The shoulder-ride story sent her to a training mat "to climb up", and a little gorilla (Bluerilla himself) flew into her. The pickup is the ride's star and the line "to do the happy thump" (voice:lines and voice:build). | A look |
| 170 | Hub, Ellie | "Stand on the blanket, and press green, to take the paper!": the pickup was a pencil. It is a paper (📝). | `tests/unit/cast.test.ts` |
| 171 | Battle, F9 | Fix 145's guard (no F9 in the closing fade) read the camera's fade state, and the battle's opening fade-in leaves it "complete": from 300 ms in, F9 did nothing in every battle, so Dad could not reach the grown-ups page from a fight (`rhyme_parent` stalled at battle 1). The closing fade sets a flag of its own (`closeFade`). | `tests/hunt11.spec.ts` |
| 172 | Charge the Spell | Its praise was the plain rotation, not `readPraise` (fix 155, M30): after a read the helper sounded out with her (solo, Dad's 2 midway: `helped`) it could say "Wow! You read that all by yourself!", twice as often since item 140's two reads. | A look (code: `readWord`) |
| 173 | Charge the Spell | "Here comes another spell!" took the top band over the second word's bar: the bar pops in from scale 0 as the line starts, and the caption kept off its bounds then, nothing. The keep-out is the bar's full size. | A look (code: `keepOut`) |
| 174 | Charge the Spell | Indoors, a wall decal (Smaug's flame in the clockwork workshop) showed through the bar's see-through cells, behind the letter she was sounding; and floor decals lay in the boulder yard's stream. The mess keeps off the bar, its picture, the altar, the helper and her, on the upper floor. | A look |
| 175 | Rhyme room | "Rhyme time! These words sound the same at the end!" played to an empty wall, the two cards coming after it. It plays once they are up and said. | `tests/rhyme.spec.ts` |
| 176 | Rhyme room | The level-1 sound-out left 160 ms between sounds (the hall's and Charge's 400): R-I-NG ran nearly together, close to the blending the speech rule rules out. 400 ms. | A look (code: `SOUND_GAP_MS`) |
| 177 | Entry hall | M57's rule (a word plus a sound counts as said) reached only the grab word: a wrong pick says its picture's word, so a CLOCK beside the warm-up said "CLOCK" before LOCK was read on the bridge (TENT before TEN, BELT before BELL). The hall's other pictures keep off the episode's reading words plus a sound too. | `tests/unit/grab.test.ts` |
| 178 | Battle, the rune row | Since item 140 the row under the bars lists both Charge words' runes at one spacing: C R I B T E N, one nonsense word. A gap parts the words (32 px a chip then, so eight still end left of x 300). | `tests/charge.spec.ts` |
| 179 | Grown-ups page 1 | Item 139's rhyme room levels row joined the bag's box at the bottom right: with a full store it pushed the box to y 752, off the page. The row has its own line under the first-sound grid. | `tests/hunt5.spec.ts` (the maxed store holds rhyme levels) |
| 180 | Stretchy Bridge, the chasm | M52's soft top edge was 14 slices each overlapping the next by a pixel: every seam took both alphas, and the fade read as stripes. 30 slices, edge to edge. | A look (code: `drawGap`) |
| 181 | Battle, a contest's move choice | The team holds its stations in a contest (M17), and nothing kept a ring off them: in the sea tug the leftmost ring stood on Elsa at her rope, the place she walks to read as the ally's. A ring keeps off a held teammate where her side has room, as off a story prop (M54), and a tier's later ways (closer, staggered) are tried before one with a ring on either; the sea tug's side mostly has no room for three (M65). | `tests/unit/padPlace.test.ts` |
| 182 | Rhyme room, the wrong pictures | They kept off look-alikes of the printed word but not of the two cards: DAD (a man in a blue shirt) stood beside the MAN card, CAP beside HAT, a leg in a striped sock beside the SOCK card, and NAP's card is CAT's own orange tabby asleep: she names the picture with a rhyming word and is told it is wrong. They keep off the cards' look-alikes too, NAP and CAT are look-alikes, and neither picture nearly rhymes (`nearRhyme`: VAN, CAN... HAM or ANT; SUN, RUN... THUMB; KING, RING... PIN). | `tests/unit/rhyme.test.ts`, `plansGolden.json` regenerated |
| 183 | Rhyme room, praise | Fix 155's `readPraise` counted yellow and misses, not the level-1 sound-out the room gives unasked: at base every word, so "Wow! You read that all by yourself!" (and WOW!) could follow the helper sounding the word out for her. | A look (code: `gotIt`) |
| 184 | Charge the Spell | Its closing line still spoke of one spell after item 140's two ("Our spell is all charged up!", after "Here comes another spell!"): both variants are plural (voice:lines and voice:build). | A look |
| 185 | Hub, Jasmine | The humming jar found by the oasis pool was handed out from a heap of gold, as fix 168's ice gifts were: it takes the glowing circle (voice:lines and voice:build). | `tests/unit/cast.test.ts` (the line names its spot) |
| 186 | Rhyme room, across episodes | Only the printed word kept off the episode before's reads: the families and cards came back the next visit (VAN CAN [FAN], then CAN FAN [VAN], last time's answer now a card beside this time's). A visit draws first from the families the last visit did not show (`LAST_RHYMES`, the store's `recent`). | `tests/unit/rhyme.test.ts` |
| 187 | Rhyme room, decals | Moriarty's ❓ floor decal lay in line with the three pictures, under the third card's question mark: a fourth thing to walk to (fix 150's kind). The pictures' row keeps 250 px clear each side. | A look |
| 188 | Stretchy Bridge, decals | M58 kept her start clear only in the entry hall: Bavmorda's bones lay at her feet and shoulder on the near bank. Her start is kept clear here too. | A look |
| 189 | Battle, the story fight's choice | MASK's "three of her pop up" clones have no end: five pink-snowsuit Julias stood through the move choice, one on the TRAP pad's ring under its sign, beside the real one. Her team's clones poof as a choice opens. | `tests/hunt11.spec.ts` (the hooks' `heroClones`) |
| 190 | Battle, a staggered choice | The green dot sat 90 px over the lit pad's sign, and a staggered pair's lower pad has the upper sign there: the dot for MUD sat at SWIM's edge, beside the other word. A lower pad's dot is beside its own sign. | A look (code: `moveChoice` dot) |
| 191 | Pictures | M48's shaped fit reached five pictures: STICK (400 x 134) was a 110 x 25 px twig on the bridge's far bank, and BUS, KEY, KICK and SLED are as far from square. Every picture more than twice as wide as tall is shaped (MOP, tall, stays square: shaped, it stood under the parked Word to Picture's banner). | `tests/unit/pictureBox.test.ts` (reads every `pic_` png) |
| 192 | Battle, wave moves | Every `wave` cast (each giant's part-1 ultimate through `giantSweep`, the P, G and W runes, CARPET STAR SWEEP, SUPER FAN) drew a flat see-through rectangle with hard edges over the fighters (`drawn5_h11` 695, 662, 217; W6 listed SUPER FAN's alone, seen once): three times in five episodes this sweep. It is a soft glow stretched tall, fix 152's kind. | A look (code: `wave`) |
| 193 | Hall, sentence rooms, the machine, the move choice | The miss line started in the same tick as the fizzle-and-giggle, and a line ducks the sfx to under half: the giggle's notes, what tells her a miss is a joke, were lost under "That's the..." / "That wasn't ICE...". A 350 ms beat first, as the bridge, the Shape-Shifter and the rhyme room have (`GIGGLE_BEAT_MS`). | A look (code: the four `wrong`/`miss` paths) |
| 194 | Battle, a move choice | A villain's trap she walked over on her way to a pad still sprang (fix 29 kept only the hit off her): a BOOM under her feet and a burst and ring that hung on the frozen clock for 10 to 20 s, on her path or on a pad's ring. No trap springs while a choice is open. | A look (code: `updateTraps`) |
| 195 | Battle, a move choice | A trap card's alpha pulse (a tween) undid its veil: 🔥 🔮 🍌 cards stayed at full strength and pulsing on the floor, one on a pad's ring, fix 25's kind. The veiled things' tweens pause while the choice is open. | A look (code: `moveChoice` veil) |
| 196 | Battle, the sea tug's choice | The rope, its red knot and the knot's glow were not faded back with the rest of the fight: fully lit across the pads' upper row, the knot on a ring she walks to (M65's choices). Faded to 35% while a choice is open. | A look (code: `drawRope`) |
| 197 | Battle, contests | A shot in flight landing during a choice played the stage's hit flourish (the clash's flick, the cook-off's splat, the race's coins) at full strength over the faded fight, hanging on the frozen clock. The stages skip it while she picks. | A look (code: each stage's `onHit`) |
| 198 | Journey map | Mashed green replayed the select chime on every press through the fade out (the first press had already gone). Once. | A look (code: `JourneyScene.update`) |
| 199 | Rooms, idle re-prompts | Idle time counted before an instruction carried over it: the bedroom's "Find the door!" was said again about 3 s after it ended (the 15 s re-prompt and the 4 s stick hint ran from the story before it). Idle time counts from the last instruction's end. | A look (code: `RoomScene.idleHelp`) |
| 200 | Entry hall | The hall's villain mood was not `calm`: a quake villain's stomp and shake landed between the clue's sounds every few seconds and jolted the board she matches. Calm, as the side rooms. | A look |
| 201 | Grown-ups page 1 | The rhyme room's own families (-IG, -OP, -OT) never showed in the word families row (the rhyme room and the machine share `rimes`); and Q, X and CK, which no rune drills, sat grey as "never tried" for good. The row lists both games' families; the grid, the drilled sounds. | `tests/hunt5.spec.ts` (page 1 fits) |
| 202 | Grown-ups page | F8's warning (fix 139's band at the bottom) printed over fix 179's rhyme levels row on page 1, and under the dad-lock badge in that corner. It stands in for the help line under the title while armed. | `tests/hunt10.spec.ts` (pages 1 and 3) |
| 203 | Debug mode, out of the attic | The debug room's door out of the attic (not read yet) started the hub as if she were back from the retreat: her at the front door, "That was close! We need a plan!", the villain's line and the secret door popping in again. She is back at the secret door, standing open, nothing said. | `tests/hunt11.spec.ts` |
| 204 | Debug mode, Dad there or away | A debug game's end put the whole episode back as it was, `solo` with it: Dad's 2 in a debug Charge did not count, and the real Charge after went solo with him sitting there ("Let's say each sound together!", the cue never lit, her reads modelled). Whether Dad is there stays as the game left it. | A look (code: `endRun`) |
| 205 | Loading, and the keyboard | Before any scene's controls exist (Boot, Wait) a child's mashing reached the browser: F1 opened its help, F3 its find bar, F7 the caret-browsing prompt, F10 and the menu key its menus, and Firefox's / and ' quick find, over the game or taking its focus. The page keeps those keys from the first frame (not the game's own dev keys F2, F4, F8 and F9: Phaser drops a key event whose default is already prevented, which Controls prevents itself). | `tests/hunt11.spec.ts` |
| 206 | Parked games (`?scene=blend`, `?scene=picture`) | Their "CVC words only" drew every pictured thing: Blend Path laid UMBRELLA's eight tiles off the screen's edge and split SH into two tiles, and Word to Picture's letter-by-letter hint sounded SHIP's S then H. Three letters, a sound each. | `tests/unit/rules.test.ts` |
| 207 | Rhyme room, free play | Fix 162 kept her feet under the cards, but in the closing line (free play open) a held jump lifted her 150 px, behind the finished row. A jump there stops with her head at the cards' bottom edge (`liftCap`). | A look (code: `RoomScene.liftCap`) |
| 208 | Entry hall | Fix 177 kept the hall's pictures off the episode's other words plus a sound, not off the grab word's own: TENT beside TEN, CLOCK beside LOCK, LEG beside EGG (a third of TEN's halls at difficulty 2). A miss on it said the word she was finding, and the clue's sounds fit both. Never beside it, at any tier. | `tests/unit/grab.test.ts`, `plansGolden.json` regenerated |
| 209 | Rhyme room, the wrong pictures | Fix 182's `nearRhyme` compared spellings: SOCK, ROCK... BOX (CK against X) passed as not rhyming. Endings compare by sound (CK, C and K one sound, X a K and an S). | `tests/unit/rhyme.test.ts` |
| 210 | Bedroom | The villain's far-off taunt was the one line that left presses open: the drum's shout or the lamp's flash went off over it. Locked, as the other lines (the wake-up is now one locked stretch of about 21 s, the checker's `locked-long` look). | A look |
| 211 | Grown-ups page | Page 1's Shape-Shifter row listed an old store's stored words, at levels that can never change, pushing live ones into "+n more"; page 2's grid showed a dropped word read before item 040 (YAK) as a word that comes up again. Live words only. | A look (code: `shifterLines`, page 2's filter) |
| 212 | Battle, a move choice's end | Fix 194 kept a trap from springing while the choice was open, not after: she walked onto a card to reach the right pad, and the frame the choice closed it went off on her, a BOOM and a stun as SUPER WORD! fired. An enemy's traps under her go with a puff as it closes. | A look (code: `defuseNear`) |
| 213 | Battle, a move choice | A cast in the last moments before a choice ran its later steps on the frozen clock, seconds into the choice: Moriarty copies and card soldiers popped up on a pad's ring, and Evil Moriarty's Vanish put him beside her as she walked. Spawns and teleports wait the choice out. | A look (code: `clones`, `summon`, `teleport`) |
| 214 | Space and sky race, part 2 | TURBO! at the counter set the heroes' lead to 0.3, lower than they had: they slid back and the villain caught up after the counter item, the contest turning the wrong way. The lead never drops there. | A look (code: `counter2`) |
| 215 | Boot, blocked site storage | With the browser blocking site storage, the `localStorage` getter throws: the progress store threw as it was made, and the game never booted (a blank page). It plays on without saving. | `tests/unit/rules.test.ts` |
| 216 | Sentence rooms, the word machine | The checker's new `decal-by-target` found the villain's floor mess beside what she picks in the two rooms that keep nothing clear: Elsa's icicles between the machine's tiles, Bavmorda's bones by the MOM pedestal (fix 150's kind, a fourth thing to pick). Both keep the row clear, 150 px either side. | A look (the checker's `decal-by-target`) |
| 217 | Keyboard, Tab | Tab is the keyboard's yellow, but item 069's guard (Tab's focus move in Boot and Wait) prevented its default in the capture phase, and Phaser drops a key event whose default is already prevented: since then Tab did nothing anywhere (no hint, no instruction again, no yellow cast). It is prevented after Phaser has seen it. | `tests/hunt11.spec.ts` |
| 218 | Pad, the D-pad | The D-pad and the arrows steered only while the stick read exactly 0: a stick resting past its deadzone (the drift this machine's pad is suspected of, M20) turned them off. They win over the stick. | A look (code: `Controls.update`) |
| 219 | Pad, unplugged | Phaser keeps the pad snapshot it was made from, connected for good: a pad unplugged (or its battery flat) mid-walk kept its last stick and buttons, and she walked on into a wall with the arrows unable to stop her. A pad is alive as the browser sees it now. | A look (code: `Controls.pad`) |
| 220 | Rhyme room, Shape-Shifter, decals | Neither kept her way in clear (M58's rule, fix 188's bridge): Bavmorda's bones lay at her feet as the rhyme room opened (`h11real2`), and the Shifter's stones kept only 90 px clear either side. Both keep her start clear, and the Shifter's row 250 px, as the rhyme room's (fix 187). | A look |
| 221 | Stretchy Bridge, level 3 | Dad's 2 as she slid over the silent stones blending the word out loud flashed his cue and did nothing: on the far bank the helper said "Now say the whole word out loud!" and waited for him again (fix 96 holds level 2's early press, M24 Charge's). It is kept for the far bank. | A look (code: `earlyYes`) |
| 222 | Shape-Shifter, level 1 | Since item 137 took the name-to-sound bridge away, yellow at a fix-it stone only says the sound she heard as she reached it, yet it still counted as help (YES! not WOW!, the ramp a step down). It does not, there; and a stone reached while a sound played no longer sounds again straight after the hint. | A look (code: `hint`) |
| 223 | Story fight, the ledge | The ledge's ring was drawn 130 px up on the ledge's top, but the spot that counts (and lifts her) is at its foot: she stood on the ring she saw, unlifted, until the wave came. The ring is at the foot, where she steps up. | A look (code: `walk.ts`) |
| 224 | Story fight, the gold guards | They lined up behind the hiding stone: two of three hidden as "Gold guards! Get them!" played. They line up in front of its foot. | A look |
| 225 | Rhyme room, a right pick | The picture flew onto the third place, which stayed the faint question frame (fill 0.45): HAT and CAP floated over the jungle and the ship's windows beside CAT / BAT and MAP / NAP on solid cards, through the row's praise. The place turns a card like the others as the picture lands. | `tests/rhyme.spec.ts` (`thirdCard`) |
| 226 | Battle, a staggered choice | Fix 190 looked only for an upper pad straight above: a lower pad between two upper ones (GRAB under RED / DRIP, CHOP under HOP / NET, RUN, POP) still had its dot in the gap between their signs, at their height, reading as the upper row's. Any higher sign in that band puts the dot beside its own (`dotBeside`). | `tests/unit/padPlace.test.ts` |
| 227 | Space and sky race, a move choice | The race holds nearly still in a choice, and an ally level with the villain flies the lane behind his: Elsa was hidden behind frozen Evil Ozymandias's ice through the whole choice and its payoff (`drawn5_h11` 225 to 229), her face card speaking with her nowhere. In a choice she draws in front of him while they overlap, and back at her lane's depth as the choice closes (a review caught the first cut keeping it through the payoff while she was busy casting). | A look (code: `race.ts` `depthOver`) |
| 228 | Battle, a contest's move choice | The pads are placed off the team and the villain where they stand (M17, fix 181), but on the slowed clock they moved on: the sea tug's serpent slid 60 to 90 px onto PIG's ring and under its sign (`drawn5_h11` 133, 134), the stage still easing him to his place and a late bolt's knockback shoving him 30 px a time (measured: 58 px in 3 s, up to 260 in a race). A contest holds them where the pads went down, and no knockback lands while she picks. | `tests/hunt11.spec.ts` (each contest) |
| 229 | Battle, a staggered choice | Fix 226's beside dot always went right: with two lower pads 240 apart its dot sat on the next sign's first letter (YUM's on CRASH's C, reading RASH: `h11g` `drawn_cast3` 073; found by both the branch review and the sheet read), or under a higher sign, reading as that word's (TUG's under DOT, 099). It takes the side clear of every other sign, and not under a higher one where the other is free (`dotSide`). | `tests/unit/padPlace.test.ts` |
| 230 | Space and sky race, a move choice | Fix 227 drew the ally over the villain but left his cloud, jet and flame at his lane's depth, under the villain: he floated in front with his ride tucked behind (branch review). They take his depth. | A look (code: `race.ts`) |
| 231 | Charge the Spell | Fix 165 brought the word bar down to y 160, into each rune's YES! rise: the YES! (at sparkle depth, under the HUD) showed dimly through the bar's plate over the letter just landing (branch review). It is drawn over the bar. | A look |
| 232 | Battle, a move choice | An ally's leap the choice caught hung in the air: Anna's Giant Leap held her over Evil Moriarty's head for the whole WEB / NAP choice, her face card saying USE ...! (`drawn_cast3` 390, 391; the slowed clock stretches the 0.5 s leap to about 13 s). Only her own hero's move was cut short. A leap a choice catches goes on along the floor, on the slowed clock, and lands by its target (two reviews caught the first cuts: held still, it landed short back in mid-air, then jumped along its path as the choice closed). | A look (code: `abilities.ts` `slam`) |
| 233 | Entry hall, decals | Fix 150 kept the grid's own box clear, not past its ends: Evil Ozymandias's penguin troopers stood at both ends of the bottom row, the right one where a fourth picture would go (`elsa_space` 012 to 016; the hall's seed is fixed, so every villain's decals land there). 250 px past the rows' right end is clear (past both ends, a review found, left no floor spot at all). | `tests/hunt10.spec.ts` (and some floor mess drawn) |
| 234 | Sentence rooms, decals | Fix 216 kept 150 px clear past the pictures' row, about 75 past the outer picture's edge: in the attic Moriarty's question mark and Elsa's penguins stood just past its end, at the pictures' height (`anna_magic` 102, `elsa_space`). 250 px at the pictures' height, as the rhyme room and the Shifter (down to the floor's foot it left no floor spot, a review found: outdoors, no mess at all). | A look |
| 235 | Battle, a move choice's step-back | M6's step-back tested a teammate's feet against a ring, not the body: Ozymandias stood 120 px under SMASH's ring, his torso and cape over its left third, and stayed (`ozy_tiamat` 109, 110). A body over a quarter of a ring steps clear too. | `tests/unit/padPlace.test.ts` |
| 236 | Charge the Spell, Dad away at the read | A read the helper sounded with her (Dad quiet) modelled its sounds but kept them only in the room, not with the episode as a charged rune's are (fix 159): F9 and back in the second word, before a sound the two words share charged, modelled it a second time, the grown-ups page's count up 2 for one rune (a code read of the paths no scenario drove; the other three reads, the rhyme room at levels 2 and 3, debug mode's writes and item 137's word rules, came back clean). | A look (code: `readWord`) |

The checker itself: `QA_SET=hunt11` (README); `letter-name` (bug), a line naming a letter (item 137);
the rhyme room's pacing budget (60 s); Charge's raised to item 140's own limits (66 s, solo 75 s; at 30 s
every visit was flagged); the probing scenarios (`lock_all`, `parent_all`, `debug_rooms`...) waited for a
side room among five scenes and never the rhyme room, so `rhyme_lock` and `rhyme_parent` stalled at its
door; the rhyme cards' words count as shown while the last round's stay up under its praise (`onCards`:
the hooks already named the next round's, and every visit flagged `giveaway` bugs, HOP POP CAT BAT).
`tests/hunt10.spec.ts`'s clash-ring test (fix 146) counted every ring on screen, and failed about one run in
three on a move's ring at a fighter's feet (the fight runs on at its slow clock through a choice); it counts
the clash point's.

### Matt's calls

| # | Where | What | Options | Ruling |
| --- | --- | --- | --- | --- |
| M61 | Charge the Spell, pacing | Item 140's two words take a visit 41 to 55 s with Dad answering at once (`charge2_yes`, `charge2_solo`, game time), where item 059's goal was about 20 s; with Dad's 1 or solo the helper says each sound three times a round (all up front, rune by rune with her, then "Let's sound it out together!"). The checker's budget is now item 140's own limit (66 s), so it flags only past that. | **(a) keep: Matt designed item 140 the night before, and it is one press a word**; (b) one word when the visit goes solo; (c) drop the rune-by-rune pass after the up-front sounds | |
| M62 | Battle 1, its opening | With Charge and the Shape-Shifter in the episode, the first PICK A MOVE! comes 27 to 37 s after the first thing out of the bag (three seeds, `?scene=battle&room=charge&games=all&warmup=1`): seven things in five beats, then six or seven runes one by one at 1.1 s or more each. M28 cut this measure from 37.3 s to under 26 s; `tests/opening.spec.ts` never has Charge in it. | **(a) the runes fire back to back (a 0.5 s floor, each still waiting for its own sound) and Charge's words join one volley**; (b) at most four runes in battle 1; (c) keep | |
| M63 | Battle 1, the villain's health | In those three openings the villain's bar is at its part-1 floor (45%) by the first PICK A MOVE!, and still 45% three seconds after her supercharged move lands: her best moves and the combo take no visible bite, until the ultimate. Since item 140's extra runes this is every Charge episode. | **(a) part 1's floor starts high (about 75%) and steps down 12 points with each super and the combo, ending at 45% for the ultimate**; (b) the opening volleys do less damage; (c) keep | |
| M64 | Rhyme room, pacing | A visit's three rounds take about 66 s at base level right first time (`rhyme_idle`, `rhyme_mash`; 81 s under dad lock probes): each round sets out and says two cards, the instruction, the sound-out (400 ms apart, fix 176), the question, then the plate and the praise, and she can first move to a picture about 16 s into a round (`locked-silent`, `rhyme_idle`). The checker's budget is 60 s. | (a) keep, and a 75 s budget as the bridge's; **(b) two rounds a visit (`RHYME.rounds` 2; `minRounds` stays 2)**; (c) a shorter level-1 instruction | |
| M65 | Battle, the sea tug's move choice | Fix 181 keeps a ring off the ally held at her rope where her side has room, but between her reach and the serpent there is room for three rings 240 px apart only with one on the ally (her side wins over everything, M7, W34): half the choices still stand a ring on Elsa. | (a) keep (W34's trade-off); **(b) two pads in a contest when three cannot keep off the held team**; (c) the ally steps back off a ring in a contest too (M6's step, which M17 kept out of contests) | |
| M66 | Word bank, BUSH | BUSH is a short-U word in the bank (vowel `u`, rime `ush`), but its vowel is the U of PUT, not of SUN: it is the rhyme room's "shares the vowel" picture for RUG and SUN, and a short-U word in every sound-out. | **(a) store it (`STORED_WHY`: its U is not SUN's), then `npm run bank:audit` for the B and SH and short-U counts**; (b) keep: the rhyme room only uses it as a wrong picture | |
| M67 | Charge the Spell, picture letters | Looked at as she would: K's kangaroo has no straight upright and barely makes a K; U's upside-down umbrella reads as a red bowl or a horseshoe; N's noodles on a fork are SPAGHETTI or PASTA to her (S, P); A's alligator is often a CROCODILE (K). | **(a) an `art:alts` round for `rune_k` and `rune_u` (their briefs are right; a candidate with a clear K and a clear umbrella), N and A kept (Dad says the word with the sound)**; (b) all four; (c) keep | |
| M68 | Hub gift pickups | The pickup is the story's prop, and three are odd things to take: builder Dada Matt's sneaky gadget is a castle (🏰, his orc-castle story) on the tool table "to switch it on"; lifter Dada Matt's workout move is a weightlifter (🏋️), a person flying into her; Seraphina's own pet dragon ("My little pink dragon goes everywhere with me", and her sprite and face card keep a pink dragon on her shoulder) is a green 🐉 in the straw that flies into her "to learn the trick" (fix 169's kind). | (a) a thing for each (a gadget glyph that is no bank word's, a medal, an egg or a scale for the dragon); **(b) only the two that are people or pets (🏋️, 🐉), the castle kept as the story's emblem**; (c) keep: the prop is the story's emblem on the gift card since item 121 | |
| M69 | Grown-ups page 2 and the bank's coverage | Page 2's every-word grid lists the bank's things and whatever she has read, so about 34 move and spell words she has not met are missing, not grey: the grid grows across the week. And page 1's first-sound table keys words by onset with no vowel onset (`none = ANT`), so short-vowel first words split between `–` (ANT, EGG, ELF) and A, I, O, U (APPLE, IGLOO...): Dad reads A 1·1·0 as one short-A first word. | **(a) both: the action words in the grid (grey until met), and one 'starts with a vowel' row**; (b) the vowel row only; (c) keep | |
| M70 | Victory podium, the other dad | With a second dad in the episode (half of them: he walks into the bedroom) the ending scene stands him with everyone, and then the podium leaves him out: M50 seats the waker as a cheering figure, never the secondary; and when the secondary is Dada Matt his face card says every recap word (`phonicsFace`) with him nowhere on screen. | **(a) he cheers too, on the grass right of the podium, as M50's waker on the left**; (b) only his face card goes (the recap's words in the narrator's face); (c) keep | |
| M71 | Rhyme room, near rhymes | Fix 182 keeps a wrong picture off near rhymes (VAN... HAM, SUN... THUMB, SOCK... BOX), but not a nasal before the ending: CAT, HAT... ANT (or PLANT). Ruling that out too (tried) left fewer families plannable: in a 300-episode `variety` run the rhyme room fell from 38 visits to 26, the rest a sentence frame instead. | (a) keep: ANT is the A-sound picture, and the cards say the rhyme; (b) rule it out, with the room less often; **(c) rule it out only for the vowel picture when another is free (a lean, not a rule)** | |
| M72 | Two tabs open | The store is read once, as the page opens, and each change writes the whole of it: with the game open in two tabs, the stale one writes back over every episode played in the other (her bag, the rotations, the grown-ups page's counts). | **(a) a `storage` listener re-reads the store when another tab writes it**; (b) keep: one tab is how it is played | |
| M73 | Victory scene and podium, giant villains | `castScale` caps a non-grown-up at 1.3 of her height, under chef Dada Jason's 1.65: the dragon queen who filled the arena stands a head shorter than the dads at the table and on the podium. | **(a) raise the cap to 1.7 (Tiamat 1.7, Smaug 1.5, Jormungandr and Bluerilla 1.4; every scene already makes room for 1.65)**; (b) keep: the victory is hers | |
| M74 | Story fight, over the gold guards | Everyone hops at once as the guards start their charge from far off; the guards then slide through them and off the edge, and Smaug says "My guards! They all fell over!" though nobody went over them. | **(a) time each hop to its guard's arrival (the charge's easing known), and topple the guards past her**; (b) keep: a beat of under two seconds | |
| M75 | Battle, a brawl's move choice | When the choice opens with her behind the villain at the arena's end (`ozy_tiamat` 116: her at x 1170, Evil Tiamat 900 to 1140), both pads open on the far side and she walks 500 to 950 px across the dragon to reach one. Item 034's her-side rule runs only in contests; between the villain and the wall there is no room for a ring. | **(a) her hero steps out from behind him (as the team's step-back) before the pads go down**; (b) the her-side rule in brawls too, the pads past him only when her side has no room; (c) keep: she walks through fighters | |
| M76 | Frost and spell clash, a move choice | The clash point's flare stays at 0.35 alpha through a choice (fix 197 stopped its flourishes), and with ADD blending on ice it is still near white: it lands on a ring on the beam's line (KICK's in both `seraphina_frost` choices), the brightest thing on the floor on one of the words. | **(a) the pads keep off the clash point (a `keepOff` box, as a held teammate's)**; (b) fade the flare to 0.1 in a choice; (c) keep | |
| M77 | Words across games and episodes | DOG read in episode 1's word machine (the -OG family) was episode 2's Charge word (`drawn_cast3` 056, 205; the checker's `repeat-word`). M37 keeps the Shape-Shifter's chain, and the rhyme room's printed words, off the episode before's reads; Charge, the machine and the bridge draw by the bank alone. | **(a) the same lean (`LAST_READ`) in Charge, the machine and the bridge, where the pool allows**; (b) keep: a word read again a day later is practice | |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W44 | Sentence room, the find line | Under a two-row banner (OZYMANDIAS RUNS FROM THE FOX) M59's box sits on the right-hand pedestal and 17 to 21 px of the right-hand picture's foot (`slow_net` 107: the VET, M48's standing people being taller; `hunt9` LEG): the checker's `target-covered`. | The picture stays in sight; with the banner over the top and her on the left there is no clear place, and the box goes as she walks (M59's trade-off). The checker rules it (`ruledCover`, 22 px at most), and `tests/cover.spec.ts`, which flaked on it, fails only on an unruled cover. |
| W45 | Rhyme room, a miss | "Van, can... cat?": the picture she picked swells as its word is said, but she stands on it, so her figure hides most of it (`rhyme_wrong3` 037). | Every walk-to-pick room is the same (the pick is where she stands); the cards and the plate, what the rhyme is about, stay clear. |
| W46 | Charge the Spell, praise | "Wow! You read that all by yourself!" can follow Dad's 2 on a word the helper sounded rune by rune with her (`drawn5_h11` 605). | The sounds are the room's lesson, said back by her; blending them into the word is her own read, which Dad's 2 judges (fix 172 keeps it off a read the helper did with her). |
| W47 | Battle, Elsa's taunts | "Ready, little sister?" (`taunt_elsa_sister`) can be said to Julia with no Anna in the fight. | Said to the girl she fights beside, it reads as a fond name; the taunts are a pool per character, and no other line is wrong for its moment. |
| W48 | Grown-ups page, debug mode | In a small window the DEBUG corner tag (a DOM tag, its size fixed in screen pixels) can again cover the title's first letters (fix 147 moved the title to x 110 in game pixels), and in the debug room and its games it sits over the bag. | Debug mode is Dad's; at the window sizes the game is played at the title is clear, and the page is read sitting at the keyboard. |
| W49 | Sentence room, a two-row banner | The read pass's green dot (under the word her green reads first) sits under the banner, so with two rows it is under the second row's word below the first (JORMUNGANDR DOES / NOT LIKE THE PAN: the dot under LIKE). | Tried under the first row's own word: the gap between the rows is too small, and the dot sat on the second row's letters. The dot marks green, and the read lights each word as it goes. |
| W50 | Victory, reformed lines | Blade Dada Matt's "Let's make a wish together!" and Evil Julia's "This is the best day ever!" are nearly the scene's own closing line in two endings (M12's kind). | Only reachable by a dev URL or the parked pick screens: neither villain is in the draw. |
| W51 | Rhyme room, families across visits | Two visits running can share a family (`rhyme_reload`: AN OCK ING, then AP OT AN, CAN as the answer after VAN). | LAST_RHYMES keeps the last visit's families out while others fit; with ten families and the episode's own words kept out, the third round sometimes has no other (checked: with nothing else kept out, 0 repeats in 199 draws). |
| W52 | Rhyme room, three-line lines | "This word rhymes with them too! Let's sound it out!" and the done line wrap to three lines; the top box then reaches y 215, over the top 25 px of the cards (a bunny's ears, a cuff). | The pictures and the printed word stay in sight, and the box goes with the line; moving the row down would put the plate on the pictures' floor. |
| W53 | Battle, a big hit | A shot can catch every fighter hit by an area move as a flat white cut-out (`drawn5_h11` 123: Julia, Ozymandias, the penguins and the serpent at once). | `flashWhite` lasts 55 ms of wall clock, at most once per 280 ms: the shot landed in it. |

### Where the next hunt resumes

- **The hub-door stall:** five times in about 50 scenario runs the checker pressed green at a hub side
  door it had walked to and the door was not taken; the next shot had her 110 to 170 px off it, and the
  narrator's re-prompt played again and again (`blade_machine`, `shifter5` twice, `rhyme_mash`; README,
  *A game controller plugged in can play along*). Twenty runs of the same steps alone never did it. The
  driver now walks her back on and presses again: the 25 scenario runs since (`h11f`, `h11g`) had no
  stall. If it recurs, log her position every frame from the press, and sweep with no pad plugged in.
- **Not finished this hunt:** the fourth contact-sheet read (stopped at the memory call; it had read
  `drawn5_h11` and part of `h11d`'s rhyme scenarios), and a second real-speed run of the hunt-11
  scenarios. Every batch did run once at least.
- **Never driven this hunt** (a completeness read at the end; the code reads of the rest came back clean
  but for fix 236): the rhyme room and two-word Charge under `voiceless`, `slow_net`, `flaky_net`,
  `hidden_tab` and `resize` (those `lenses` scenarios never force `room=rhyme` or `room=charge`; both
  rooms time sound-outs off line ends); Charge in debug mode (`charge_debug`); the rhyme room at levels
  2 and 3 in a browser (read only); Bluerilla as villain in each contest style. The first four are now
  `hunt11` scenarios, run once at the end (`h11j`): no bug but the flaky net's own failed fetches (three
  silent lines, `pic_king` missing once and drawn when it came), and the rooms over budget on a slow net.
- **That read's one claim not taken up:** the Shape-Shifter's MAN creature thrown as THE MAN!
  (`drawn5_h11` 072) is M45's: its finding named MAN beside MOM, and the ruling held back MOM and DAD.
- **Matt's calls M61 to M77** wait for rulings; M61, M62 and M64 are pacing, measured here.
