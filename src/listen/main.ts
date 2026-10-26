/**
 * The listen-through page (item 161, `listen.html`; README, *Listening through
 * the sounds*): a plain page, no Phaser, for Matt to check every phonic sound by
 * ear. It plays the built clips (`public/voice-gen/manifest.json`), the same
 * files the game plays, with SOUND_GAP_MS between sounds as the game sounds a
 * word out, and marks each sound with who recorded it (the clip index).
 */

import { SOUND_BY_UNIT } from '../../content/phonics/letters';
import clipIndex from '../../content/voice/clips/index.json';
import { letterSoundLine, wordLine } from '../../content/voice/ids';
import { SOUND_GAP_MS } from '../config';
import type { VoiceManifest } from '../voice/manifest';
import { listenWords, loneSoundKeys, type ListenWord } from './words';

const clips = (clipIndex as { clips: Record<string, { provider: string; ingested: string }> }).clips;
const newest = Object.values(clips).reduce((d, c) => (c.ingested > d ? c.ingested : d), '');

let audioFor = new Map<string, string>();
/** Bumped by every new play and by Stop: a sequence whose run has passed stops. */
let run = 0;
let playing: HTMLAudioElement | null = null;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function playOne(id: string): Promise<void> {
  const src = audioFor.get(id);
  if (!src) return Promise.resolve();
  return new Promise((done) => {
    const a = new Audio(`${import.meta.env.BASE_URL}${src}`);
    playing = a;
    a.onended = a.onerror = () => done();
    a.onpause = () => done();
    void a.play().catch(() => done());
  });
}

function stop(): void {
  run++;
  playing?.pause();
  for (const el of document.querySelectorAll('.lit, tr.on')) el.classList.remove('lit', 'on');
}

/** A word: each sound with its letters lit, then the whole word. */
async function playWord(w: ListenWord, row: HTMLElement, mine: number): Promise<void> {
  row.classList.add('on');
  row.scrollIntoView({ block: 'nearest' });
  const letters = [...row.querySelectorAll<HTMLElement>('.word span')];
  const chips = [...row.querySelectorAll<HTMLElement>('.sound')];
  for (const [n, s] of w.steps.entries()) {
    if (run !== mine) return;
    letters.slice(s.index, s.index + s.span).forEach((l) => l.classList.add('lit'));
    chips[n]?.classList.add('lit');
    if (s.id) await playOne(s.id);
    if (run !== mine) return;
    await wait(SOUND_GAP_MS);
    letters.forEach((l) => l.classList.remove('lit'));
    chips[n]?.classList.remove('lit');
  }
  if (run !== mine) return;
  letters.forEach((l) => l.classList.add('lit'));
  await playOne(wordLine(w.word));
  letters.forEach((l) => l.classList.remove('lit'));
  row.classList.remove('on');
}

function chip(sound: string, unit: string): HTMLElement {
  const id = letterSoundLine(sound);
  const c = clips[id];
  const el = document.createElement('button');
  el.className = `sound ${c ? 'matt' : 'tts'}`;
  el.title = `${id}: ${SOUND_BY_UNIT[sound]?.note ?? `as in ${SOUND_BY_UNIT[sound]?.example.toUpperCase()}`}`;
  el.innerHTML = `${unit.toUpperCase()} <span class="who">${sound}${c ? ` · ${c.provider}` : ' · tts'}</span>${c?.ingested === newest ? '<span class="new">NEW</span>' : ''}`;
  el.onclick = (e) => {
    e.stopPropagation();
    stop();
    void playOne(id);
  };
  return el;
}

function wordRow(w: ListenWord): HTMLTableRowElement {
  const row = document.createElement('tr');
  const play = document.createElement('button');
  play.textContent = '▶';
  play.onclick = () => {
    stop();
    void playWord(w, row, run);
  };
  const word = document.createElement('td');
  word.className = 'word';
  for (const ch of w.word.toUpperCase()) word.append(Object.assign(document.createElement('span'), { textContent: ch }));
  const sounds = document.createElement('td');
  for (const s of w.steps) {
    if (s.sound) sounds.append(chip(s.sound, s.unit));
    else sounds.append(Object.assign(document.createElement('span'), { className: 'sound', textContent: `${s.unit.toUpperCase()} (silent)` }));
  }
  const cell = (child: HTMLElement | string, className = '') => {
    const td = Object.assign(document.createElement('td'), { className });
    td.append(child);
    return td;
  };
  row.append(cell(play), cell(w.glyph ?? '', 'glyph'), word, sounds);
  return row;
}

async function main(): Promise<void> {
  // No manifest (a fresh checkout, the junction missing, before voice:build): say so, and still list the words
  // and sounds (hunt 12: the page stayed blank, its buttons dead, the error only in the console).
  const manifest = await fetch(`${import.meta.env.BASE_URL}voice-gen/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<VoiceManifest>) : null))
    .catch(() => null);
  audioFor = new Map((manifest?.lines ?? []).filter((l) => l.audio).map((l) => [l.id, l.audio]));
  if (!manifest) {
    const note = document.createElement('p');
    note.textContent = 'No voice manifest (public/voice-gen/manifest.json): nothing can play. Is the voice-gen junction there? Run npm run voice:build (README, Storage).';
    note.style.cssText = 'color:#b00;font-weight:bold';
    document.body.prepend(note);
  }

  const words = listenWords();
  const table = document.getElementById('words')!;
  const rows = words.map((w) => {
    const r = wordRow(w);
    table.append(r);
    return r;
  });
  const lone = document.getElementById('lone')!;
  for (const s of loneSoundKeys()) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.append(chip(s, s.replace(/^long_/, '').replace(/_.*/, '')), ` as in ${SOUND_BY_UNIT[s]!.example.toUpperCase()}`);
    tr.append(td);
    lone.append(tr);
  }

  document.getElementById('all')!.onclick = async () => {
    stop();
    const mine = run;
    for (const [n, w] of words.entries()) {
      if (run !== mine) return;
      await playWord(w, rows[n]!, mine);
      await wait(800);
    }
  };
  document.getElementById('stop')!.onclick = stop;
  addEventListener('keydown', (e) => e.key === 'Escape' && stop());
}

void main();
