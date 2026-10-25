/**
 * The scratch home (item 149): every run's working files, shots and logs, outside
 * the repo so no checkout's dev server walks them. It sits beside the main checkout,
 * `C:\Code\wordwarriors-scratch` for `C:\Code\wordwarriors`, found through git's
 * common dir, so a worktree (`C:\Code\wordwarriors-worktrees\…`) lands in the same
 * one. `WW_SCRATCH=<dir>` puts it elsewhere. README, "Storage".
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

function home(): string {
  if (process.env.WW_SCRATCH) return path.resolve(process.env.WW_SCRATCH);
  try {
    // Relative to the working directory in the main checkout (`.git`), absolute in a worktree.
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return `${path.dirname(path.resolve(common))}-scratch`;
  } catch {
    // Not in a checkout (git missing, or a `git archive` tree unpacked outside any repo):
    // a folder inside the scratch home finds it by name.
    for (let d = path.resolve(); d !== path.dirname(d); d = path.dirname(d)) {
      if (path.basename(d).endsWith('-scratch')) return d;
    }
    throw new Error('no scratch home: not in a git checkout; set WW_SCRATCH');
  }
}

/** The scratch home's absolute path. */
export const SCRATCH = home();

/** A path in the scratch home. */
export const scratchPath = (...parts: string[]): string => path.join(SCRATCH, ...parts);

/**
 * A command-line path: `scratch/<rest>` (either slash) means `<rest>` in the scratch
 * home, as it did when scratch was a folder in the repo; anything else is left as given.
 */
export function scratchArg(p: string): string {
  const m = /^scratch[\\/](.*)$/.exec(p);
  return m ? scratchPath(m[1]!) : p;
}
