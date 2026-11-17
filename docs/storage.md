# Storage

Every file has exactly one home (Matt):

| Home | What |
| --- | --- |
| **git** | Source, data, Matt's voice recordings (`content/voice/clips/`), the game-sized art (`public/art/`) |
| **Drive** (`C:\Code\gdrive-sync\wordwarriors\`, a Google Drive sync folder) | Expensive, irreplaceable or private files. The repo path is a git-ignored directory junction (`mklink /J`) to them |
| **The scratch home** (`C:\Code\wordwarriors-scratch`) | Logs, briefs, review pages, shot runs, a session's working files |
| **Nowhere** | Anything rebuilt cheaply: contact sheets, `refs/crops/`, `dist/`, test output, `node_modules/` |

Never commit 20 MB or more of tree bytes without Matt's prior confirmation (CLAUDE.md).

## The Drive junctions

- `art-originals/` → `…\wordwarriors\art-originals`: full-res art (`<id>.png`, what `art:gen
  --reprocess` cuts), `log.jsonl`, the originals `art:pick -- <id> 0` puts back (`restore/`),
  candidates waiting on Matt (`alts/`), candidate rounds' sheets, picker manifests and
  preview cuts (`picks/`: inside the repo, so a report's `pick:` line can name them), and
  Matt's family photos in `refs/` (private: never copy them into the tracked tree).
- `public/voice-gen/` → `…\wordwarriors\voice-gen`: the edge-tts mp3s, `manifest.json` and
  `.build-cache.json`. `voice:build` copies recordings in from `content/voice/clips/`, where
  they override edge-tts.
- `C:\Code\gdrive-sync\wordwarriors\archive\` holds what is irreplaceable but not needed day
  to day, at its old relative path: Matt's raw phonics-recorder zips and takes
  (`archive\scratch\voice-import\`), already cut into `content/voice/clips/`, and the scratch
  home's kept hand-made scripts.

The main checkout holds the junctions; conductor links each worktree's to the same Drive
folders, so a worktree shares one copy and never needs a full voice rebuild. To link one by
hand (in `cmd`, from the checkout root): `mklink /J public\voice-gen
C:\Code\gdrive-sync\wordwarriors\voice-gen`. A checkout without `public/voice-gen/` runs
mute with captions (their texts come from `content/voice/lines.json`), and the unit test that
checks the manifest fails.

## The shared voice folder

There is one `manifest.json` for every checkout:

- `voice:build` keeps mp3s of lines that left `lines.json` (another branch may still speak
  them) and lists them at its end with their count and size. `npm run voice:build --
  --prune` deletes them (`PRUNED:`). Run it from main, or a branch at main, after the item
  that retired the lines has landed: from a checkout behind main it deletes audio main still
  speaks (the fix is a `voice:build` in main). The manifest and build cache need no pruning.
- A branch that changes a line's text and runs `voice:build` changes what main speaks for
  that id too, before the branch lands.
- A build from a checkout missing some lines (an older branch, a worktree cut before a
  merge) drops them for everyone, and says so in a `DROPPED:` block; if main still speaks
  them, run `voice:build` in main.

## The scratch home

`C:\Code\wordwarriors-scratch`, outside every checkout. `tools/scratch.ts` finds it from
git's common dir, so the main checkout and every worktree land in the one folder;
`WW_SCRATCH=<dir>` moves it. **Never make a `scratch/` folder in a checkout** (Vite's watcher
would walk it; Vite ignores `scratch/` only as a backstop). Conductor still links a
`scratch` junction into each new worktree to a folder that no longer exists: it dangles, is
git-ignored, and nothing should be written through it. A `scratch/…` argument
(`art:alts --brief=scratch/<x>.txt`, `art:gen --sheet-out`, `voice:import`'s zip,
`tests/shots/sheet.ts`'s output) means the scratch home; `art:alts --sheet` is the exception
(its picker output goes to `art-originals/picks/`).

A script there cannot import game code or find `node_modules` (README, *Operational facts*).

## Disk

- **Shot runs fill the disk.** Every shot is a ~1 MB PNG: a bug-hunt sweep is 1.6–4.3 GB in
  `qa/<tag>/`, a battle-shots run ~0.5 GB in `polish_034/<tag>/`. The checker prunes `qa/`
  as each sweep starts (`docs/tools.md`, *Retention*). Shot runs outside `qa/` are not
  pruned: delete them once written up.
- **Nothing old is kept forever.** Once Matt's picks from a candidate round are promoted,
  the rest are disposable: `art:pick` deletes the id's candidates, and the round's sheet,
  manifest and preview folder (`art-originals/picks/`) and its briefs go too. A finished
  item's leftover worktree goes with `git worktree remove --force <path>` from the main
  checkout (junctions unlinked first, `cmd /c rmdir <path>`), then `git worktree prune`; its
  `conductor/*` branch stays.
- **Where it goes:** the scratch home's `qa/` dwarfs the rest; then `art-originals/`
  (~1 GB, keep), `node_modules/` (~280 MB per checkout), `.git` (~140 MB; about 70 MB is
  old `public/voice/` mp3s and superseded `public/art/` PNGs), `voice-gen/` (~140 MB).
  Measure with a walk that never follows a link (`os.scandir`, skipping `is_junction()` /
  `is_symlink()`), so Drive is counted once.
- **Not to clear** (Matt): no git-history rewrite to drop old mp3s or PNGs from `.git`;
  npm's cache and Playwright's browsers (`%LOCALAPPDATA%\ms-playwright`) are machine-wide and
  not this project's to clear; `art-originals/restore/` stays, as the undo for promotions.

## Renaming a character

The id can go in one pass: `content/`, tests and `voices.json`, a `git mv` of its PNGs in
`public/art/`, copies of its originals (and `restore/` files) under the new ids, then the
three commands. `voice:build` re-synthesises every line with the id in it (line ids and
speaker change, not only lines saying the name), and writes the shared manifest without the
old ids, so main speaks none of that character's lines until the item lands; `voice:build --
--prune` from main later clears the old mp3s (the old art originals stay as orphans).
`ProgressStore.parse` carries the old id over in a save (a `replaceAll` of the old id).
