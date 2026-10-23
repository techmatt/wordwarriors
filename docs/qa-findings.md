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
| W16 | Dad lock | Under the lock the bedroom's wake-up story, the warm-up's intro (its letter names and sounds) and the victory scene's lines into the recap run on by themselves. | W10's kind: no press moves them, they are the flow; W10 names the places if Matt wants the lock to pause it. |
| W17 | Network | With one fetch in seven failing, two lines in an episode played silent (their clip's fetch failed again when asked). | Every art id and nearly every clip retried in; the game needs no network (README, *Operational facts*). |
| W18 | Reload | The rotations remember an episode's cast and rooms from the bedroom on, so an episode reloaded early still counts as seen for the next draws. | By design (`src/episode/draws.ts`): an episode she has begun has shown its villain and rooms. |

## Language pass (2026-10-21)

Every line changed or added by the pass, old → new, for Matt to skim. `nar_*_<key>` is a
narrator template (the same text in all fifteen narrators' voices); `wake_*_<key>` both
wakers'. A `—` in Old is a new line: mostly variants (`<key>_2`... or `right_5`...) of a
line she hears several times an episode, now said in turn and carried on from one
episode to the next (`src/episode/lineVariants.ts`), so a repeat comes only after all
of them. Battle barks rotate too: a fighter says its least-said taunt, none more than
twice an episode, and a big move's name is called out once a battle. Move
and ultimate names (`move_`, `ult_`) are also banners. Ability and taunt ids did not
change.

| Line | Old | New |
| --- | --- | --- |
| `core_nobody` | No helper? I will help you then! | If nobody helps, I'll help you! |
| `move_julia_bounce_stomp` | Bounce Stomp! | Super Bounce! |
| `taunt_julia_evil_grr` | Grumpy time! | It's grumpy time! |
| `ult_julia_evil` | Tantrum Quake! | Mega Tantrum! |
| `move_julia_evil_no_nap` | No Nap Ever! | No Naps Ever! |
| `reformed_julia_share` | Sorry! I will share all my toys now. | Sorry, I will share all my toys now. |
| `reformed_julia_play` | Sorry! Let's all play together. | Sorry, let's all play together. |
| `move_ellie_bubble_trap` | Bubble Trap! | Bubble Cage! |
| `taunt_ellie_evil_snacks` | More snacks, now! | I want more snacks, right now! |
| `taunt_ellie_evil_scribble` | I scribble everywhere! | I'm scribbling on everything! |
| `taunt_ellie_evil_fast` | Too fast for you! | I'm way too fast for you! |
| `taunt_ellie_evil_raspberry` | A raspberry for you! | Here's a raspberry for you! |
| `move_ellie_evil_raspberry` | Raspberry Blast! | Giant Raspberry! |
| `reformed_ellie_bubbles` | Sorry! I made bubbles for everybody! | Sorry, I made bubbles for everybody! |
| `reformed_ellie_good` | Sorry! Ellie is good now. | Sorry, Ellie is good now. |
| `reformed_ellie_please` | More bubbles, please! | I want more bubbles, please! |
| `taunt_seraphina_fly` | Up we fly! | Let's fly up high! |
| `taunt_seraphina_hot` | Careful, they are hot! | Careful, my dragons breathe fire! |
| `move_seraphina_wing_gust` | Wing Gust! | Dragon Wind! |
| `taunt_seraphina_evil_mine` | All dragons obey me! | All the dragons obey me! |
| `taunt_seraphina_evil_burn` | Toasty time! | Time to get toasty! |
| `taunt_seraphina_evil_shadow` | From the shadows, dragons! | Come out of the shadows, dragons! |
| `taunt_seraphina_evil_scaly` | Scaly and scary! | My dragons are scaly and scary! |
| `reformed_seraphina_nice` | Oops! I am a nice dragon again. | Sorry, I promise I will be nice again. |
| `reformed_seraphina_dragons` | Sorry! My dragons will be good now. | Sorry, my dragons will be good now. |
| `reformed_seraphina_parties` | Dragons love parties! | My dragons love parties! |
| `taunt_dada_matt_strong` | Strong like a castle! | I'm as strong as a castle! |
| `move_dada_matt_hammer_spin` | Hammer Spin! | Hammer Swing! |
| `taunt_dada_matt_evil_smash` | Smash it all! | I'm going to smash it all! |
| `taunt_dada_matt_evil_mess` | What a big mess! | Look at the mess I made! |
| `taunt_dada_matt_evil_crumble` | Watch it crumble! | Watch it all crumble! |
| `taunt_dada_matt_evil_stomp` | Stomp, stomp, stomp! | Look out below! |
| `ult_dada_matt_evil` | Mega Hammer Quake! | Mega Hammer Smash! |
| `move_dada_matt_evil_wreck` | Wrecking Spin! | Wrecking Ball! |
| `move_dada_matt_evil_quake` | Quake! | Earthquake! |
| `reformed_dada_matt_fort` | Sorry, kiddo! Want to build a fort? | Sorry, kiddo, want to build a fort? |
| `reformed_dada_matt_walls` | Sorry, kiddo! I will fix every wall. | Sorry, kiddo, I'll put every wall back up. |
| `reformed_dada_matt_silly` | Sorry! Daddy got a bit silly. | Sorry, Daddy got a bit silly. |
| `taunt_dada_jason_chef` | Chef power, go! | Who's hungry? |
| `taunt_dada_jason_flip` | Flip, flip, hooray! | Look how high they fly! |
| `ult_dada_jason` | Breakfast Storm! | Raining Pancakes! |
| `taunt_dada_jason_evil_broccoli` | Broccoli for breakfast! | You get broccoli for breakfast! |
| `taunt_dada_jason_evil_soup` | Soup of the day is slime! | The soup of the day is slime! |
| `taunt_dada_jason_evil_fight` | Food fight! | Let's have a food fight! |
| `ult_dada_jason_evil` | Food Fight Frenzy! | Mega Food Fight! |
| `move_dada_jason_evil_hot_sauce` | Hot Sauce Blast! | Super Spicy Sauce! |
| `reformed_dada_jason_pancakes` | Sorry! Who wants pancakes? | Sorry, does anybody want pancakes? |
| `reformed_dada_jason_broccoli` | Sorry! No more broccoli for breakfast. | Sorry, no more broccoli for breakfast. |
| `reformed_dada_jason_dessert` | Sorry, kiddo! Today we will have dessert first. | Sorry, kiddo, today we will have dessert first. |
| `ult_elsa` | Blizzard Crown! | Sparkle Blizzard! |
| `move_elsa_crystal_spire` | Crystal Spire! | Crystal Tower! |
| `taunt_elsa_evil_winter` | Winter forever! | It will be winter forever! |
| `taunt_elsa_evil_cold` | So very cold! | It's so very cold in here! |
| `taunt_elsa_evil_icicles` | Icicles everywhere! | I'll hang icicles everywhere! |
| `ult_elsa_evil` | Eternal Winter! | Forever Winter! |
| `reformed_elsa_melt` | Sorry! Let me melt all the ice. | Sorry, I'll make all the ice go away. |
| `taunt_anna_again` | Again! Again! | Again, again! |
| `ult_anna` | Never Give Up! | Brave Heart Whirlwind! |
| `move_anna_leap` | Big Leap! | Giant Leap! |
| `taunt_anna_evil_blizzard` | Out of my blizzard! | Get out of my blizzard! |
| `reformed_anna_friends` | Sorry! Can we be friends again? | Sorry, will you be my friend again? |
| `reformed_anna_team` | Sorry! I am on your team now. | Sorry, I'm on your team now. |
| `reformed_anna_grouphug` | Group hug, everybody! | Everybody, come in for a group hug! |
| `taunt_jasmine_whoosh` | Too fast for you! | You'll never catch my carpet! |
| `taunt_jasmine_jewels` | Sparkle time! | Look at my jewels sparkle! |
| `taunt_jasmine_stars` | Fly to the stars! | Let's fly to the stars! |
| `move_jasmine_wind_fan` | Wind Fan! | Desert Wind! |
| `taunt_jasmine_evil_sand` | Sand in your shoes! | I'll put sand in your shoes! |
| `taunt_jasmine_evil_dust` | Dusty, dusty! | Everything is dusty now! |
| `taunt_jasmine_evil_swirl` | Swirl and twirl! | Watch me swirl and twirl! |
| `taunt_jasmine_evil_gone` | Gone with the wind! | The wind will blow you away! |
| `ult_jasmine_evil` | Great Sandstorm! | Giant Sandstorm! |
| `move_jasmine_evil_sand_blast` | Sand Blast! | Sand Spray! |
| `move_jasmine_evil_quicksand` | Quicksand Traps! | Quicksand! |
| `reformed_jasmine_sweep` | Sorry! I will sweep it all up. | Sorry, I'll sweep it all up. |
| `taunt_ozymandias_look` | Look upon my statues! | Come and see my statues! |
| `taunt_ozymandias_sand` | Rise, sand! | Rise up, sand! |
| `taunt_ozymandias_king` | King of the desert! | I rule the whole desert! |
| `taunt_ozymandias_pyramid` | Bigger than a pyramid! | I'm bigger than a pyramid! |
| `taunt_ozymandias_dust` | Dust to dust! | Sand, sand, everywhere! |
| `move_ozymandias_dune_slam` | Dune Slam! | Desert Smash! |
| `move_ozymandias_sun_disc` | Sun Disc! | Golden Sunbeam! |
| `taunt_ozymandias_evil_despair` | Look at me, and tremble! | Look at me and tremble! |
| `taunt_ozymandias_evil_sand` | Sand forever! | Sand will cover everything! |
| `taunt_ozymandias_evil_mighty` | Behold my mighty works! | Look how mighty I am! |
| `taunt_ozymandias_evil_crush` | I crush like sand! | I'll squash you like a sandcastle! |
| `ult_ozymandias_evil` | March of the Colossi! | Statue Stampede! |
| `move_ozymandias_evil_colossi` | Rise, Colossi! | Rise, Statues! |
| `move_ozymandias_evil_scarab_swarm` | Scarab Swarm! | Beetle Swarm! |
| `reformed_ozymandias_kings` | Sorry! Even kings say sorry. | Sorry, even kings say sorry. |
| `reformed_ozymandias_kind` | Sorry! I am a kind pharaoh now. | Sorry, I'm a kind pharaoh now. |
| `taunt_jormungandr_splash` | Splash time! | Time for a splash! |
| `ult_jormungandr` | World Wave! | Tidal Wave! |
| `move_jormungandr_tail_spin` | Tail Spin! | Tail Swipe! |
| `move_jormungandr_hug_coil` | Big Hug! | Snake Snuggle! |
| `taunt_jormungandr_evil_hungry` | So hungry for the sun! | I'm so hungry for the sun! |
| `taunt_jormungandr_evil_squeeze` | Squeeze, squeeze! | I'll squeeze you tight! |
| `taunt_jormungandr_evil_coil` | Coil, coil, coil! | I'll coil all around you! |
| `move_jormungandr_evil_serpent_spawn` | Serpent Spawn! | Snake Swarm! |
| `reformed_jormungandr_noodle` | Sorry! I was a grumpy noodle. | Sorry, I was a grumpy noodle. |
| `reformed_jormungandr_letgo` | Sorry! I will let go of the house. | Sorry, I'll let go of the house. |
| `taunt_smaug_fire` | Warm and toasty! | I'll keep you warm and toasty! |
| `taunt_smaug_shiny` | So shiny! | Look how shiny my gold is! |
| `move_smaug_wing_slam` | Wing Slam! | Dragon Smash! |
| `taunt_smaug_evil_mine` | My gold! All mine! | The gold is all mine! |
| `taunt_smaug_evil_fire` | I am fire and gold! | I'm made of fire and gold! |
| `taunt_smaug_evil_roar` | My treasure! | Don't touch my treasure! |
| `move_smaug_evil_inferno` | Inferno Breath! | Dragon Fire! |
| `move_smaug_evil_molten_gold` | Molten Gold Beam! | Melted Gold! |
| `move_smaug_evil_hot_coals` | Hot Coals! | Burning Coals! |
| `move_smaug_evil_tail_quake` | Tail Quake! | Tail Smash! |
| `reformed_smaug_treasure` | Sorry! You can share my treasure. | Sorry, let's share my treasure. |
| `reformed_smaug_gold` | Sorry! I don't need all the gold. | Sorry, I don't need all the gold. |
| `taunt_tiamat_sparkle` | Purple sparkles! | Here come purple sparkles! |
| `move_tiamat_wing_gust` | Wing Gust! | Mighty Gust! |
| `taunt_tiamat_evil_rules` | My rules, my house! | My house, my rules! |
| `move_tiamat_evil_dragon_babies` | Dragon Babies! | Baby Dragons! |
| `reformed_tiamat_crowns` | Sorry! You can all be kings and queens. | Sorry, let's all be kings and queens. |
| `taunt_scar_rocket` | Rocket hop! | Rocket boots, go! |
| `taunt_scar_core` | Core charging! | My core is charging up! |
| `taunt_scar_beep` | Beep boop, friend! | Beep boop, hello, friend! |
| `taunt_scar_gold` | Gold power! | Gold robot power! |
| `ult_scar` | Core Blast! | Core Cannon! |
| `move_scar_rocket_hop` | Rocket Hop! | Rocket Boost! |
| `taunt_scar_evil_core` | Core overload! | My core is full of power! |
| `taunt_scar_evil_stomp` | Rocket stomp! | Here come my rockets! |
| `ult_scar_evil` | Core Overload! | Robot Rampage! |
| `move_scar_evil_rocket_stomp` | Rocket Stomp! | Rocket Smash! |
| `reformed_scar_mess` | Beep boop! Sorry about the mess! | Beep boop, sorry about the mess! |
| `reformed_scar_good` | Beep, sorry! Scar is good now. | Beep, sorry, Scar is good now. |
| `reformed_scar_lights` | Sorry! I will switch the lights back on. | Sorry, I'll switch the lights back on. |
| `taunt_moriarty_magic` | Magic trick! | Want to see a magic trick? |
| `taunt_moriarty_cards` | So many cards! | I have so many cards! |
| `move_moriarty_decoys` | Decoys! | Copycats! |
| `move_moriarty_trick_trap` | Trick Trap! | Card Trick! |
| `move_moriarty_ta_da` | Ta-da Blink! | Vanishing Trick! |
| `taunt_moriarty_evil_clever` | I am too clever! | I'm too clever for you! |
| `taunt_moriarty_evil_puzzle` | Solve my puzzle! | Try to solve my puzzle! |
| `taunt_moriarty_evil_smoke` | Now you see me! | Now you see me, now you don't! |
| `ult_moriarty_evil` | Hall of Clones! | Mirror Maze! |
| `reformed_moriarty_sneaky` | Sorry! No more sneaky tricks. | Sorry, no more sneaky tricks. |
| `taunt_bavmorda_brew` | Bubble, bubble! | Bubble, bubble, in my cauldron! |
| `taunt_bavmorda_magic` | A little magic! | Here's a little magic! |
| `taunt_bavmorda_flowers` | Flowers for you! | I have flowers for you! |
| `taunt_bavmorda_evil_kneel` | Bow to the queen! | Bow down to me! |
| `taunt_bavmorda_evil_cauldron` | Into my cauldron! | Into my cauldron you go! |
| `ult_bavmorda_evil` | Everybody Pigs! | Piggy Polymorph! |
| `move_bavmorda_evil_skeleton_wave` | Skeleton Wave! | Skeleton Army! |
| `reformed_bavmorda_piggy` | Sorry! No more piggy spells. Well, maybe one. | Sorry, no more piggy spells, I promise! |
| `reformed_bavmorda_back` | Sorry! I will turn everybody back. | Sorry, I'll turn everybody back. |
| `taunt_rilla_bananas` | Bananas, go! | Here come the bananas! |
| `taunt_rilla_stomp` | Stomp, stomp, hooray! | Watch my giant feet! |
| `move_rilla_chest_drum` | Chest Drum! | Gorilla Thump! |
| `taunt_rilla_evil_peels` | Watch out for peels! | Watch out for banana peels! |
| `taunt_rilla_evil_drum` | Drum, drum, drum! | Hear me thump and roar! |
| `ult_rilla_evil` | Mega Chest Drum! | Gorilla Smash! |
| `move_rilla_evil_chest_shock` | Chest Drum Shockwave! | Thunder Thump! |
| `move_rilla_evil_peel_traps` | Banana Peel Traps! | Banana Peels! |
| `reformed_rilla_banana` | Sorry! Want a banana? | Sorry, do you want a banana? |
| `reformed_rilla_car` | Sorry! Rilla will not eat the car. | Sorry, Rilla will not eat the car. |
| `taunt_dada_matt_lifter_legs` | Lift with your legs! | Use your legs, not your back! |
| `taunt_dada_matt_lifter_muscles` | Muscles, go! | Look at these muscles! |
| `taunt_dada_matt_lifter_mountain` | Strong like a mountain! | I'm as strong as a mountain! |
| `move_dada_matt_lifter_dumbbell_spin` | Dumbbell Spin! | Dumbbell Whirl! |
| `move_dada_matt_lifter_mega_squat` | Mega Squat Slam! | Super Squat Smash! |
| `taunt_dada_matt_lifter_evil_weak` | Too weak, too weak! | You're too weak! |
| `taunt_dada_matt_lifter_evil_sweaty` | Sweaty hugs for all! | Sweaty hugs for everybody! |
| `taunt_dada_matt_lifter_evil_reps` | Ten more reps! | Give me twenty more! |
| `ult_dada_matt_lifter_evil` | Mega Muscle Quake! | Monster Muscles! |
| `move_dada_matt_lifter_evil_shake_splash` | Protein Shake Splash! | Protein Splash! |
| `move_dada_matt_lifter_evil_flex_quake` | Flex Quake! | Mega Flex! |
| `reformed_dada_matt_lifter_teddies` | Sorry! Want to lift teddies with me? | Sorry, want to lift teddies with me? |
| `reformed_dada_matt_lifter_jacks` | Sorry! No more jumping jacks. | Sorry, no more jumping jacks. |
| `reformed_dada_matt_lifter_rest` | Sorry, kiddo! Let's take a rest. | Sorry, kiddo, let's take a rest. |
| `taunt_dada_matt_cyber_hacking` | Hacking in! | I'm hacking in! |
| `taunt_dada_matt_cyber_tools` | Tools, go! | Hologram tools, go! |
| `taunt_dada_matt_cyber_code` | Code mode on! | Coding mode is on! |
| `ult_dada_matt_cyber` | Data Storm! | Pixel Storm! |
| `taunt_dada_matt_cyber_evil_deleting` | Deleting your fun! | I'm deleting all your fun! |
| `taunt_dada_matt_cyber_evil_glitch` | Glitch, glitch, glitch! | Everything is glitching! |
| `ult_dada_matt_cyber_evil` | System Crash! | Mega Glitch! |
| `move_dada_matt_cyber_evil_virus_blast` | Virus Blast! | Computer Virus! |
| `move_dada_matt_cyber_evil_glitch_jump` | Glitch Jump! | Glitch Teleport! |
| `move_dada_matt_cyber_evil_red_grid` | Red Hologram Grid! | Laser Grid! |
| `reformed_dada_matt_cyber_cartoons` | Sorry! I will only hack cartoons now. | Sorry, I'll only hack cartoons now. |
| `reformed_dada_matt_cyber_lights` | Sorry! I fixed all the lights. | Sorry, I fixed all the lights. |
| `reformed_dada_matt_cyber_friendly` | Beep, sorry! My system is friendly now. | Beep, sorry, my system is friendly now. |
| `taunt_dada_matt_blade_sword` | Sword and spell! | Sword and spell, together! |
| `taunt_dada_matt_blade_shine` | Blade, shine! | Shine bright, my sword! |
| `taunt_dada_matt_blade_muscles` | Magic and muscles! | I've got magic and muscles! |
| `move_dada_matt_blade_blade_spin` | Blade Spin! | Spinning Blade! |
| `taunt_dada_matt_blade_evil_hex` | Hex, hex, hex! | Here comes a curse! |
| `taunt_dada_matt_blade_evil_shadow` | Shadow magic! | Feel my shadow magic! |
| `ult_dada_matt_blade_evil` | Doom Rune Blast! | Dark Rune Storm! |
| `move_dada_matt_blade_evil_hex_bolts` | Hex Bolts! | Curse Bolts! |
| `reformed_dada_matt_blade_sparkle` | Sorry! Want to learn a sparkle spell? | Sorry, want to learn a sparkle spell? |
| `reformed_dada_matt_blade_toys` | Sorry! I will un-grump all the toys. | Sorry, I'll make all the toys happy again. |
| `reformed_dada_matt_blade_grumpy` | Sorry, kiddo! No more grumpy spells. | Sorry, kiddo, no more grumpy spells. |
| `taunt_dada_jason_warrior_bold` | Brave and bold! | Be brave and bold! |
| `move_dada_jason_warrior_axe_spin` | Axe Spin! | Spinning Axe! |
| `taunt_dada_jason_warrior_evil_past` | Nobody gets past! | Nobody gets past me! |
| `move_dada_jason_warrior_evil_shield_slam` | Shield Slam! | Shield Smash! |
| `reformed_dada_jason_warrior_knight` | Sorry! Let me be your brave knight! | Sorry, let me be your brave knight! |
| `reformed_dada_jason_warrior_snacks` | Sorry! The snacks are back! | Sorry, the snacks are back! |
| `reformed_dada_jason_warrior_axe` | Sorry, kiddo! I put my axe away. | Sorry, kiddo, I put my axe away. |
| `taunt_dada_jason_warlock_spell` | A spell for you! | I have a spell for you! |
| `move_dada_jason_warlock_piggy_hex` | Piggy Hex! | Oink Spell! |
| `taunt_dada_jason_warlock_evil_hex` | Hex, hex, everybody! | Everybody gets a curse! |
| `taunt_dada_jason_warlock_evil_darkness` | Darkness, come! | Let the darkness come! |
| `ult_dada_jason_warlock_evil` | Big Purple Doom! | Lights Out! |
| `move_dada_jason_warlock_evil_hex_trap` | Hex Trap! | Sneaky Curse! |
| `reformed_dada_jason_warlock_trick` | Sorry! Want to see a sparkly trick? | Sorry, want to see a sparkly trick? |
| `reformed_dada_jason_warlock_toads` | Sorry! No more toads, I promise. | Sorry, no more toads, I promise. |
| `reformed_dada_jason_warlock_curses` | Sorry, kiddo! I will undo my curses. | Sorry, kiddo, I'll undo my curses. |
| `wake_*_up_3` | Good morning, it is time to get up! | Good morning, it's time to get up! |
| `nar_*_right_3` | Yes! That is it! | That's the one! |
| `nar_*_right_5` | — | Wow! You read that all by yourself! |
| `nar_*_right_6` | — | You're a reading star! |
| `nar_*_right_7` | — | That's right! Well done! |
| `nar_*_right_8` | — | You got it! |
| `nar_*_wrong_2` | Not that one, silly! | That's not the one! Try again! |
| `nar_*_wrong_4` | Silly me, wrong way! Try again! | You were so close! Let's try another one! |
| `nar_*_wrong_5` | — | Oops, that's a different one! Try again! |
| `nar_*_wrong_6` | — | That's not it, but I know you'll find it! |
| `nar_*_battle2_start` | It's round two, and we are ready now! | It's round two, and this time we're ready! |
| `nar_*_move_pick_2` | — | It's your move! Pick one! |
| `nar_*_move_pick_3` | — | Which move should we do? |
| `nar_*_move_pick_4` | — | Let's pick a move! |
| `nar_*_move_great_2` | — | Your reading made that move super strong! |
| `nar_*_move_great_3` | — | You read it, and look how strong it is! |
| `nar_*_move_great_4` | — | Your word powered it up! Way to go! |
| `nar_*_move_great_5` | — | Did you see that? Your reading did that! |
| `nar_*_move_great_6` | — | Reading makes us stronger! Keep it up! |
| `nar_*_retreat_1` | They are too strong for us! Let's go back and get ready! | They're too strong for us! Let's go home and get ready! |
| `nar_*_finish` | Now let's all finish it together! | Let's finish this together! |
| `nar_*_victory_1_2` | — | We did it! We won! |
| `nar_*_victory_1_3` | — | Hooray, we won! Let's look at what you read! |
| `nar_*_victory_2_2` | — | You're the best Word Warrior ever! |
| `nar_*_victory_2_3` | — | Look at all that reading! You are a real Word Warrior! |
| `nar_*_house_doors` | There are two doors! Walk to one, and press green. | Pick a door! |
| `nar_*_house_doors_2` | — | Let's pick a door! |
| `nar_*_house_doors_3` | — | Which door do you want? |
| `nar_*_house_doors_4` | — | Where should we go? Pick a door! |
| `nar_*_house_more` | There is one more door to go! | One more door to go! |
| `nar_*_house_more_2` | — | Now let's try the other door! |
| `nar_*_house_more_3` | — | We have one door left! |
| `nar_*_house_more_4` | — | Let's do the last door! |
| `nar_*_house_ready` | We are ready now! Let's go out the front door! | We're ready! Let's go out the front door! |
| `nar_*_room_listen_2` | — | Let's listen! |
| `nar_*_room_listen_3` | — | Here's a new one! Listen! |
| `nar_*_room_listen_4` | — | Listen to this one! |
| `nar_*_room_your_turn_2` | — | Ready to read it? Press green! |
| `nar_*_room_your_turn_3` | — | You read this one! Press green. |
| `nar_*_room_your_turn_4` | — | Your turn to read! Press green. |
| `nar_*_room_find_2` | — | Where is it? Walk to it, and press green! |
| `nar_*_room_find_3` | — | Find the picture, and press green! |
| `nar_*_room_find_4` | — | Walk to the picture, and press green! |
| `nar_*_got_item_2` | — | That will help us in the fight! |
| `nar_*_got_item_3` | — | Yes, that's one more for the fight! |
| `nar_*_got_item_4` | — | Great, let's keep that! |
| `nar_*_use_bag_2` | — | Look what we brought! |
| `nar_*_use_bag_3` | — | Here's what we found in the house! |
| `nar_*_machine_change_2` | — | Let's change the first sound! What new word will it make? |
| `nar_*_machine_change_3` | — | Now swap the first sound for a new one! |
| `nar_*_machine_silly_4` | — | That's not a real word! Try another letter! |
| `nar_*_away_ready` | We are ready now! Let's go to the fight! | We're ready! Let's go to the fight! |
| `nar_*_charge_done` | Our spell is ready for the fight! | Our spell is all charged up! |
| `nar_*_charge_done_2` | — | The spell is ready! Let's take it to the fight! |
| `nar_*_use_runes` | Now let's use our spell power! | Now let's cast our spell! |
| `nar_*_bridge_slide_2` | — | Slide across, and stretch each sound! |
| `nar_*_bridge_again` | Slide across again! | Let's slide across again! |
| `nar_*_bridge_slide_3` | — | Let's slide across the stones! |
| `nar_*_bridge_say_2` | — | What word did the stones make? Say it! |
| `nar_*_bridge_say_3` | — | Put the sounds together! What word is it? |
| `nar_*_bridge_find_2` | — | Now find its picture! |
| `nar_*_bridge_find_3` | — | Where is the picture of that word? Walk to it! |
| `nar_*_bridge_next_2` | — | Look, here's another bridge! |
| `nar_*_bridge_done` | We crossed every bridge! Our things are ready for the fight! | We crossed every bridge! We're ready to fight! |
| `nar_*_bridge_done_2` | — | That was every bridge! Great job! |
| `nar_*_fight_sky_race_retreat` | They are too fast for us! Let's go and practice! | They're too fast for us! Let's go home and practice! |
| `nar_*_fight_sea_tug_start2` | Let's pull again! We are stronger now! | Let's pull again! We're stronger now! |
| `nar_*_fight_sea_tug_retreat` | They are too strong for us! Let's go and get ready! | They're too strong for us! Let's go home and get stronger! |
| `nar_*_fight_spell_clash_start` | It's magic against magic! Push the beam! | It's magic against magic! Let's push the beam! |
| `nar_*_fight_spell_clash_retreat` | That spell is too strong for us! Let's go back and get ready! | That spell is too strong for us! Let's go home and get ready! |
| `nar_*_fight_cook_off_retreat` | Their dish was too yummy! Let's go and practice! | Their dish was too yummy! Let's go home and practice! |
| `nar_*_fight_cook_off_finish` | Now let's add the topping, all together! | Let's add the topping, all together now! |

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
| M32 | Her outfits | Julia's chef and knight pictures count the hat and the raised sword in her height (head to soles 0.85 and 0.87 of the picture against 0.96 in her dress), so beside chef or warrior Dada Jason she stands about 11% shorter than in other episodes: the hat-counts-as-height error item 093 fixed for the grown-ups, on her side. | **(a) a fill for her outfits too, measured as ADULT_FILL was, so she is the same height in every outfit**; (b) keep | (a), item 104: `OUTFIT_FILL` (dress 0.957, chef 0.843, knight 0.868: the mean of hunt 6's figures, 1% grid crops scaled by the glasses' width, and pixel rows), `outfitTall`: chef Julia 143.3 px head to soles beside chef Dada Jason, 143.5 px in her dress (`tests/heights.spec.ts`) |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W27 | Shape-Shifter | `clipped-line` flags "A shape-shifting spell!" in "Oh no! A shape-shifting spell! It keeps changing one letter!". | An exclamation, natural in context (the heuristic's known false alarm). |
| W28 | Shape-Shifter | The fix-it instruction (three rows) at the top covers the top 60 px of the creature. | The creature stays recognisable, the label is clear, and the stones she walks to must stay clear above all (fix 102). |
| W29 | Charge the Spell | Dad's 2 before the last rune is lit still flashes his cue and is dropped (the code read's finding). | M24's ruling: a press from the last rune lit is kept; earlier presses are before the read is asked. |

### Where the next hunt resumes

- **Not yet run this hunt:** many episodes back to back at real speed
  (`WW_SPEED=1 ... -g "qa variants6$" --timeout=6600000`, about 50 minutes; README) and
  `npm run shots` (`shots.pw`, then `polish.pw`), both asked for by the planner.
- **Sweep again with this hunt's fixes:** `parent_all` and `debug_rooms` (cut off by a
  server stop in this hunt's sweep), then `QA_SET=recent` and the `qa flags` URLs with the
  Shape-Shifter in (`room=shifter` combined with `game=` and `games=`). The new
  `spawn-in-reach` check has not swept yet: read its first hits against fixes 61, 98 and 104.
- **Look again at real speed:** the Shape-Shifter's pacing (M26) and the warm-up's name
  bridges (M27) once Matt has ruled, and the battle's opening run of items (M28).

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
| M33 | Story fight, art | The three story props are still placeholder pictures: the stone she hides behind is a flat grey ball (it reads as a moon), the hoard a crown emoji, the ledge a mountain icon. | **(a) a candidate round, `art:alts prop_fight_stone prop_fight_ledge prop_fight_hoard`, then pick**; (b) keep | |
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

- **Matt's calls first:** M33 (the story props' art). M34, M35 and M36 are done (item 119).
- **Real speed:** run `variants6` at `WW_SPEED=1` again now M36 is in (its shots now run
  400 an episode, not 400 in all).

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

- **Not yet run:** `variants6` at `WW_SPEED=1` (hunt 7's ask, twice stopped here), the lenses
  (`QA_SET=lenses`) and `parent_all` / `debug_rooms` with item 121's words in, and the new
  `words=` flags.
- **Look again:** the action pictures for recognition (SWISH is a farmer with a scythe, DASH a
  running boy: she may say CUT and RUN), and the grown-ups page's word grid now that NEW
  widens each name.

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
| M43 | Quest place rotation | Elsa and Anna both train at the ice castle, so with Elsa then Anna as allies (`drawn10`, episodes 4 and 5) she plays the same place, hub and side rooms (skating pond, snow garden) twice running; the ally rotation knows nothing of places. `npm run variety`: the quest place is back within two episodes in 5% of episodes. | (a) the ally draw leans away from an ally whose place was last episode's (a draw change: golden draws rewritten); **(b) keep: rare, and the hub story, cast and words differ** | |
| M44 | The checker, a reload at hub part 2 | Hunt 7's one-off came back: `story_reload` (the story fight forced, seed 976) reloaded at hub part 2 at 3:16:54am and the page never came back; the stall's own `page.evaluate` then waited on it for the rest of the 30-minute timeout (Playwright's trace: the reload path threw, then `Recorder.capture('stall')` hung in `state()`). The renderer sat idle (0.9 s of CPU in 5 s), not spinning; eight reloads at hub part 2 in isolation each came back in under a second. Both times it was a reload at hub part 2, about three minutes into a sweep with a second worker running. The checker now bounds the stall's shot, its recorder and its last probe read (20 s each), so a hang is a stall with its JSON. | **(a) keep watching: with the bounds a recurrence costs a minute, not 30, and names the point; chase it only if it comes back outside the checker (a real reload by Dad)**; (b) a trace-on run of `story_reload` and `reload_points` (Playwright `--trace on`) until it recurs, to see whether the navigation's request or the page stalled; (c) a timeout on every `page.evaluate` in the harness | |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W36 | Hub part 2, after F2 | With every step skipped to the secret door (`qa devkeys skip`), "Look, a secret door! Let's go through it!" sits at the top and covers the top 18 px of the door's sign. | The door itself is clear and the box moves off where she stands; only the dev keys bring it there. |
| W37 | Sentence room | Item 128's banner hangs from the top, so the bag's row (eight or nine fetched things by the attic) sits on its top trim, a few pixels above the first row's words. | It never reached a word in any sweep (the cream band starts below the row); worth a look only if the bag grows past nine. |
| W38 | Charge the Spell, Dad away | The session's first Charge with Dad away runs 32.9 s against the room's 30 s (`charge_solo3`, `slow-room`): it waits its 8 s for Dad's press, then goes solo. | M34's design: solo starts once he has not answered, and every later visit that session is solo from its start (M38's 35 s budget). |
| W39 | `tests/banner.spec.ts`, Word → Picture (parked) | Run beside a second browser run, its check flagged a picture 5 to 6 px under the banner (KING, ELSA) twice; alone it passed three times in three and in `test:browser`. | A parked game; the second run starves the GPU (README). Worth a look only if it fails alone. |
| W40 | Victory | `text-offscreen` (bug) once at real speed: VICTORY!'s box reached 4 px above the screen at its elastic pop-in's overshoot (`drawn_cast3`, shot 327). | The box carries the font's line height and stroke; the letters' ink stayed 50 px inside the top. |

### Where the next hunt resumes

- **Matt's calls first:** M39 (the Shape-Shifter's pool after item 127) and M41 (MOM and DAD
  in frames) change what she reads most; M40, M42, M43 and M44 after.
- **Not run this hunt:** `npm run perf`; `QA_SET=lenses` again with M44's bounds in (a hung
  reload now shows as a stall naming its point: if one recurs, run it with `--trace on`).
- **Look again once M39 lands:** `npm run variety`'s Shifter rows against this hunt's (MAN in
  77 of about 150 visits, 56 distinct chains, 39 short visits).
