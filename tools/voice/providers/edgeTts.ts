/**
 * edge-tts provider: Microsoft Edge's online neural voices, free, with
 * word-boundary timings (the only reason it is here: no timings, no highlight).
 *
 * The synthesis itself runs in `edge_tts_worker.py` under `uvx`, not in Node.
 * On 2026-10-18 the endpoint answered the npm `edge-tts-universal` 1.4.0
 * handshake with HTTP 403: upstream Python edge-tts had moved to a v2 token the
 * npm port lacks. See the worker's header. The pin below is the one knob.
 *
 * A pool of workers, because each request is a websocket round trip of about a
 * second and the build has hundreds of lines. Kept modest (4) so the free
 * endpoint is not hammered.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import type { Synthesis, TimedWord, VoiceConfig, VoiceProvider } from '../types.js';

/** The Python package version known to pass Microsoft's handshake. */
const EDGE_TTS_PIN = 'edge-tts==7.3.1';

const WORKERS = 4;
const ATTEMPTS = 3;
const TIMEOUT_MS = 30_000;

const WORKER_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'edge_tts_worker.py');

interface Reply {
  id: number;
  audio?: string;
  words?: TimedWord[];
  error?: string;
}

class Worker {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly waiting = new Map<number, (r: Reply) => void>();
  busy = false;

  constructor() {
    this.proc = spawn('uvx', ['--from', EDGE_TTS_PIN, 'python', WORKER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    createInterface({ input: this.proc.stdout }).on('line', (line) => {
      let reply: Reply;
      try {
        reply = JSON.parse(line) as Reply;
      } catch {
        return;
      }
      this.waiting.get(reply.id)?.(reply);
      this.waiting.delete(reply.id);
    });
    this.proc.stderr.on('data', (d: Buffer) => {
      const text = d.toString().trim();
      if (text && !/Installed|Resolved|Prepared|Audited/.test(text)) console.error(`  [edge-tts] ${text}`);
    });
  }

  request(id: number, text: string, voice: VoiceConfig): Promise<Reply> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        resolve({ id, error: 'timeout' });
      }, TIMEOUT_MS);
      this.waiting.set(id, (r) => {
        clearTimeout(timer);
        resolve(r);
      });
      this.proc.stdin.write(`${JSON.stringify({ id, text, ...voice })}\n`);
    });
  }

  close(): void {
    this.proc.stdin.end();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class EdgeTtsProvider implements VoiceProvider {
  readonly id = 'edge-tts';
  private readonly pool: Worker[] = [];
  private readonly queue: (() => void)[] = [];
  private nextId = 1;

  private async acquire(): Promise<Worker> {
    for (;;) {
      const free = this.pool.find((w) => !w.busy);
      if (free) {
        free.busy = true;
        return free;
      }
      if (this.pool.length < WORKERS) {
        const w = new Worker();
        this.pool.push(w);
        w.busy = true;
        return w;
      }
      await new Promise<void>((r) => this.queue.push(r));
    }
  }

  private release(w: Worker): void {
    w.busy = false;
    this.queue.shift()?.();
  }

  async synthesize(text: string, voice: VoiceConfig): Promise<Synthesis> {
    let lastError = '';
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      const worker = await this.acquire();
      const reply = await worker.request(this.nextId++, text, voice).finally(() => this.release(worker));
      if (reply.audio && reply.words) {
        return { audio: Buffer.from(reply.audio, 'base64'), extension: 'mp3', words: reply.words };
      }
      lastError = reply.error ?? 'empty reply';
      if (attempt < ATTEMPTS) await sleep(attempt * 750);
    }
    throw new Error(`edge-tts failed after ${ATTEMPTS} attempts for ${JSON.stringify(text)}: ${lastError}`);
  }

  close(): void {
    for (const w of this.pool) w.close();
  }
}
