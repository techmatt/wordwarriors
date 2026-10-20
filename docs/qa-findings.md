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
| 5 | Word machine | "Walk on a letter..." (and the change / switch lines) covered every letter tile it talked about. Those lines now keep off the tiles. | checker: `target-covered` |
| 6 | Input | A key held through a scene change pressed again on its auto-repeat: holding Space on the victory screen skipped the next title; on the grown-ups page it flipped pages. A key held from before a scene is held, never pressed, until let go. | `tests/smoke.spec.ts` "a key held through a scene change" |
| 7 | Dad lock | Holding LB+RB on the title still opened the grown-ups page under dad lock. | static review |
| 8 | Word draws | At the end of a bag round the bag could hold only words of a shut level (digraphs before digraphs open), and the gift, the right moves and the key words were drawn from them. Such a bag now counts as spent. | `tests/unit/bughunt039.test.ts` |
| 9 | Sentences | WE NEED A ANT / ELLIE NEEDS A ANT: the "A" frames now take no word starting with a vowel. | `tests/unit/bughunt039.test.ts` |
| 10 | Sentence rooms | A new word's other pictures had to start with another letter, not another sound: KIT beside CAT. Hard C and K are now one first sound. | `tests/unit/bughunt039.test.ts` |
| 11 | Speech rule | A bank word heard inside another word was not kept out: Smaug's "piggy bank" before PIG as a key word, "cupcakes" before CUP, "Lift with your legs!" before LEG, "pancakes" before PAN. Plurals, pet forms (PIGGY) and compounds now count (not FIND for FIN, FIGHT for FIG, HATES for HAT). | `tests/unit/bughunt039.test.ts` |
| 12 | Battle | The ultimate's banner showed a pad word still to come (Jörmungandr's SWALLOW THE SUN! before a SUN pad; DOOM RUNE BLAST, BIG PURPLE DOOM). It is now held to the same give-away check as its voice line. | static review |
| 13 | Battle (cook-off) | The cook-off floated YUM! and FLIP!, both move words, before their pads. Now MMM! and WHEE!. | `tests/unit/bughunt039.test.ts` (no fight style floats a bank word) |

### Matt's calls

Most important first; the hunt's pick is in **bold**.

| # | Where | What | Options |
| --- | --- | --- | --- |
| M1 | Battle move choice | The partner's prompt is captioned "USE ZAP!" with ZAP lit, while the pads show ZAP, DOT, WET: she can match letter shapes from the caption instead of reading the pads. | (a) keep; **(b) the caption hides the word ("USE ...!"), so she hears it and finds it written, the brief's design**; (c) no caption during the choice |

### Won't fix

| # | Where | What | Why |
| --- | --- | --- | --- |
| W1 | Battle, victory scene | Speaker name chips under the small face cards are 10–12 px. | Names are for the grown-up; the face is what she reads. |
| W2 | Battle | Comic words (BAM!, a move's name) overlap each other and pop in from tiny. | They are effects, gone in under a second; the checker ignores them in battle. |
| W3 | Hub | While "Stand in the circle..." plays, the box covers the gift card. | The word has been said and caught; the circle is what she needs then (fix 1). |
