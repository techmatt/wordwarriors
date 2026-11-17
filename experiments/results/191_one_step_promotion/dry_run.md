# Item 191's dry run: `art:pick` alone, placeholder to live

2026-11-17, 8:34am to 8:41am. Word: GOBLIN (live on main, named by no test, with slack in
every coverage row), standing in for a new word, so no voice synthesis was needed. Everything
was reverted afterwards: the PNG, `prompts.ts`, the Drive archive entries.

| Step | What ran | Result |
| --- | --- | --- |
| 1 | `public/art/pic_goblin.png` deleted, `npm run art:placeholders` (a new word's path) | painted its placeholder; `content/art/waiting.ts` → `['goblin']`; golden, recorder `?missing` and `docs/art.md` followed by themselves |
| 2 | `npm test` | 421/421 unit + smoke green with GOBLIN out of play (stored with `WAITING_WHY`) |
| 3 | candidate `alts/pic_goblin-1.png` (the original drawing) with a brief sidecar (`191_dryrun_goblin`), a one-row round `picks/art_alts_191_dryrun.json` | |
| 4 | `npm run art:pick -- pic_goblin 1` (nothing else) | cut the PNG (byte-identical to the committed one); wrote the brief into `PICTURES.goblin` and the `current` sentence into `PICK_NOTES.pic_goblin`; recorded the decision, archived the decided round (manifest, decisions, brief) in Drive; `waiting.ts` → `[]`, golden and `docs/art.md` back to HEAD; printed `git status` |
| 5 | `npm test` | 421/421 green, GOBLIN live; the only tracked change was `content/art/prompts.ts` (2 lines), no list edited |

The PICTURES line it wrote:

```
goblin: "a goblin: one cheeky little cartoon goblin standing, full body, green skin, big pointy ears, a long nose, a mischievous grin (item 191's dry run)",
```

The note's sentence: `` `current` is candidate 1 of art_alts_191_dryrun (brief 191_dryrun_goblin), promoted by art:pick on 2026-11-17. ``

What went wrong on the way:
- YAK, the first try, made two reds while waiting. Y's first-sound coverage (target 2) failed.
  That is the coverage rule working: taking a word that is already live out of play costs
  coverage, but a new word would not. A seed-luck test (`episodeDraws`, the bedroom toys)
  also failed. It and door b's test, which item 190 had to re-seed, now try more seeds or
  episodes before failing, so a word going live needs no new seed.
- MAT is named in fixed test lists (bridge, families), so it was no fair stand-in either.
