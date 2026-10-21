import { DIFFICULTY } from '../../src/config';
import { type Difficulty, setDifficulty } from '../../src/rules/difficulty';

/** Run `fn` at difficulty `n`, then put the knob back to config's DIFFICULTY whatever happens. */
export function withDifficulty<T>(n: Difficulty, fn: () => T): T {
  setDifficulty(n);
  try {
    return fn();
  } finally {
    setDifficulty(DIFFICULTY);
  }
}
