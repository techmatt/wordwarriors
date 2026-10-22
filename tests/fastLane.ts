/**
 * `npm test`, the fast lane (item 105): the unit tests and the `@smoke` browser tests at
 * once instead of one after the other. The browser side streams as it runs; the unit
 * tests' output is held and printed whole when they end, so the two never interleave.
 * Fails if either fails. Node runs both directly (an `npx` or a nested `npm run` costs
 * about 1-2 s on this machine). Arguments go to Playwright.
 */

import { spawn } from 'node:child_process';

const node = process.execPath;

function run(args: string[], quiet: boolean): Promise<{ code: number; out: string }> {
  return new Promise((done) => {
    const child = spawn(node, args, { stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let out = '';
    child.stdout?.on('data', (d: Buffer) => (out += d));
    child.stderr?.on('data', (d: Buffer) => (out += d));
    child.on('close', (code) => done({ code: code ?? 1, out }));
  });
}

const unit = run(['--import', 'tsx', '--test', 'tests/unit/*.test.ts'], true).then((r) => {
  process.stdout.write(`\n--- unit tests ---\n${r.out}`);
  return r.code;
});
const browser = run(['node_modules/@playwright/test/cli.js', 'test', '--grep', '@smoke', '--global-timeout=120000', ...process.argv.slice(2)], false).then((r) => r.code);

const [u, b] = await Promise.all([unit, browser]);
if (u || b) console.error(`fast lane: ${u ? 'unit tests failed' : ''}${u && b ? ', ' : ''}${b ? 'browser tests failed' : ''}`);
process.exit(u || b ? 1 : 0);
