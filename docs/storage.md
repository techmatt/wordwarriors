# Storage

Every file has exactly one home (Matt):

| Home | What |
| --- | --- |
| **git** | Source, data, Matt's voice recordings (`content/voice/clips/`), the game-sized art (`public/art/`) |
| **Drive** (`C:\Code\gdrive-sync\wordwarriors\`, a Google Drive sync folder) | Expensive, irreplaceable or private files: the art originals and voice (behind git-ignored directory junctions, `mklink /J`), and Julia's save file (`progress\`) |
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
  (`archive\scratch\voice-import\`), already cut into `content/voice/clips/`, the scratch
  home's kept hand-made scripts and briefs (`archive\wordwarriors-scratch\`), and promoted
  candidate rounds' sheets, manifests and preview cuts (`archive\art-originals\picks\`:
  `art_alts_178*` and `art_alts_183*`, item 187; `art_alts_188*`, item 189; `art_alts_189*`
  with its `189_briefs`, item 191). An archived
  manifest's `current` tiles point at `public/art/` by a relative path, so they no longer
  resolve there. A round's passed-on candidates that `art:pick` would not delete (Matt took
  none for that id) go to `archive\art-originals\alts_<round>_passed\` (item 189: BALL's
  three from 188), so the id's next round numbers from 1. Since item 191 `art:pick` does all
  of this itself once every row of a round is decided (`<id> <n>` or `<id> keep`; the
  decisions in `picks/<round>.decided.json`, archived with it): `docs/voice-art-pipeline.md`.
- `C:\Code\gdrive-sync\wordwarriors\progress\` (no junction; item 186): **Julia's save file**,
  below.

## Her save file (`progress\`, item 186)

Her progress (`ProgressStore`, key `wordwarriors.progress`) lives in the browser's
localStorage, per origin, so a port move (5174 → 5240 on Nov 14) left her 67 episodes behind.
The main checkout's **dev server** (`npm run dev`, conductor's `game` target) now mirrors it:
`src/state/saveFileServer.ts` (server), `src/state/mirror.ts` (page), `src/state/saveFile.ts`
(rules).

- `progress.json`: the store's JSON as the page last wrote it (`savedAt` = its write time, ms).
  The planner reads her progress here. Written on every write the store makes (not during a
  debug game), atomically.
- `progress-YYYY-MM-DD.json`: the file as each day found it, copied before the day's first
  write. All kept (about 35 KB each).
- `aside-<origin>-<date>-<time>.json`: a browser's own copy that the file replaced at boot (also
  kept in that browser as `wordwarriors.progress.replaced.<ms>`, only the latest: item 196).
  Nothing is dropped unseen.
- `merged-from-*.json`: item 186's one-time merge inputs (:5174's 67 episodes, :5240's 3,
  read from Chrome on Nov 16), merged by `tests/progress/merge.ts`.

**At boot** the page asks for the file before the game starts and keeps the newer copy: an
empty browser restores the file (a new port, a new browser, cleared site data); two stamped
copies, the later write wins (so the grown-ups page's erase sticks); a copy from before item 186
(no stamp) loses to one with more episodes. A newer browser copy goes to the file. A save older
than the file's is refused (409), and so (item 194) is one whose page missed a later save: each
save names the file's stamp its page's copy builds on (`X-WW-Base`: the file at boot, then each
save taken, or another tab's on the same origin), so a stale tab on an old port cannot write over
newer play however new its own stamp. The refused tab switches to the file at once and plays on
from it, its own copy kept aside like a boot's (Matt, 2026-11-17, `docs/rulings.md`).

**Where it is on:** only the main checkout's dev server (`.git` a folder). A worktree's dev server,
`vite build` / `preview` and every server a test or tool starts (`tests/servers.ts` sets
`WW_PROGRESS_MIRROR=0`) never read or write it, and their page never asks.
`WW_PROGRESS_MIRROR=1` forces it on, `=0` off; `WW_DATA_DIR` moves the folder (a test against a
copy: both set, a spare port). The folder is the `art-originals` junction's Drive folder +
`progress`, so it syncs off the machine with the rest of Drive.

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

- **Shot runs fill the disk.** A sweep is ~30 scenarios of up to 400 shots an episode, so
  ~5,000 frames at 1280×720. As PNG (~1 MB each, till item 185) a sweep was 1–5 GB and hunt
  13's four runs 8.2 GB; the checker now shoots JPEG at quality 75 (~150 KB, `SHOT_QUALITY`
  in `tests/qa/qa.pw.ts`) and writes JPEG contact sheets, about 6x smaller, and item 185
  re-encoded hunts 11 to 13's PNGs the same way. A battle-shots run is still PNG, ~0.5 GB in
  `polish_034/<tag>/`. The checker prunes `qa/` as each sweep starts (`docs/tools.md`,
  *Retention*): an unruled hunt stays whole, so ruling a hunt is what frees its shots. Shot
  runs outside `qa/` are not pruned: delete them once written up.
- **Nothing old is kept forever.** Once Matt's picks from a candidate round are promoted,
  the rest are disposable: `art:pick` deletes the id's candidates, and once the round's last
  row is decided it moves the round's sheet, manifest and preview folder
  (`art-originals/picks/<round>*`) to `archive\art-originals\picks\`, its briefs to
  `archive\wordwarriors-scratch\` (items 185, 187; by itself since item 191; a move inside
  Drive frees nothing locally, it only tidies `picks/`). A finished
  item's leftover worktree goes with `git worktree remove --force <path>` from the main
  checkout (junctions unlinked first, `cmd /c rmdir <path>`), then `git worktree prune`; its
  `conductor/*` branch stays.
- **Where it goes** (item 185, decimal MB): the scratch home's `qa/` (1.6 GB as JPEG, hunt 13
  most of it; it was 10.3 GB as PNG); `art-originals/` (2.4 GB; 1 GB of it was `figments/`,
  `art:freeform`'s from items 168 to 170, deleted by item 187 at Matt's word), `node_modules/` (~270 MB per checkout), `.git` (~140 MB; ~77 MB of it
  blobs main no longer has: old `public/voice/` mp3s 45 MB, superseded `public/art/` PNGs
  29 MB), `voice-gen/` (~160 MB).
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
