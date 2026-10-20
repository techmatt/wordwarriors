# QA findings

What bug hunts found, and what became of each: **fixed** (with the test that keeps it
fixed), **Matt** (a design call, with the hunt's recommendation), or **won't fix** (with
the reason). A hunt reads this first and does not re-report what is here. The checker
that finds most of these is `tests/qa/` (README, "The bug-hunt checker").

## Hunt 1 (item 039, 2026-10-19 to 20)

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

Most important first; the hunt's pick is in **bold**.

| # | Where | What | Options |
| --- | --- | --- | --- |
| M1 | Battle move choice | The partner's prompt is captioned "USE ZAP!" with ZAP lit, while the pads show ZAP, DOT, WET: she can match letter shapes from the caption instead of reading the pads. | (a) keep; **(b) the caption hides the word ("USE ...!"), so she hears it and finds it written, the brief's design**; (c) no caption during the choice |
| M2 | Every reading room, victory | Word confirmations, letter sounds and sentence prefixes are the `phonics` voice, Dada Matt's (his recordings will replace it), so his face pops up between the narrator's lines, also in episodes he is not in (Scar narrating, Jason waking): the speaker swaps mid-sentence. | (a) keep, Dada Matt is always the reading voice; **(b) his face only when he is in the episode, otherwise no face (the banner or card is lit anyway)**; (c) no face for phonics lines anywhere; (d) the narrator's own voice for word lines (about 4x the word audio) |
| M3 | Hub, entry hall | She cannot act through the hub's story scene (13 s at real speed: three lines, the gift word, the circle line) or the entry hall's ask and clue (10 s); after two misses the hall's repeated clues come to about 60 s of talk. Long for a four-year-old standing still. | (a) keep; **(b) let her walk during story lines and clues (green still waits), so the wait is play**; (c) trim the hub scenes to two lines and give the full clue again only from the second miss |
| M4 | Sentence banner | A sentence that does not fit one row at full size shrinks to 40 px before it may wrap ("one row down to 40 px"), so a long counter sentence (SMAUG IS NO MATCH FOR THE BUN) reads at about half size. | (a) keep; **(b) two rows at 56 px before one row at 40 px** |
| M5 | Battle move choice | Standing still in a choice brings only "USE HUM!" again every 10 s; the rooms' stick hint is not there, and nothing shows that she may walk. | (a) keep; **(b) the stick hint beside her hero after 4 s, as in the rooms**; (c) also pulse the pads |
| M6 | Battle move choice | The pad signs stand over the fighters behind them: a tall ally (a dad) disappears behind a sign. | (a) keep, the signs are what she reads; **(b) the team steps back off the pad row while a choice is open** |

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
