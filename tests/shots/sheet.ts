/**
 * Before/after sheet from two `shots.pw.ts` runs (item 024):
 *   npx tsx tests/shots/sheet.ts <beforeTag> <afterTag> <out.png>
 * Each row is one moment (a line id, or a fixed shot name) in both runs, side
 * by side at half size, with a label. Rows missing from either run are skipped
 * and listed.
 */

import { readdirSync } from 'node:fs';

import sharp, { type OverlayOptions } from 'sharp';

const [beforeTag = 'before', afterTag = 'after', out = 'scratch/ui_024_before_after.png'] = process.argv.slice(2);
const dir = (tag: string) => `scratch/ui_shots/${tag}`;

/** [label, file prefix (cast_scene), line id or fixed shot suffix]. */
const ROWS: [string, string, string][] = [
  ['Bedroom: the bad news (Dada Matt wakes her)', 'default_bedroom', 'wake_dada_matt_bad_tiamat'],
  ['Bedroom: the villain heard from afar', 'noally_bedroom', 'taunt_rilla_evil_hungry'],
  ['Bedroom: find the door (no ally, Dada Matt)', 'noally_bedroom', 'wake_dada_matt_door'],
  ['Hub: Ellie teaches the spell', 'default_hub', 'nar_ellie_teach_word_big'],
  ['Hub: Dada Jason sends her to the doors', 'jason_hub', 'nar_dada_jason_house_doors'],
  ['Side room: listening pass (the banner lights, the reader shows)', 'default_room', 'sent_'],
  ['Side room: her turn, a word said on green', 'anna_room', 'word_'],
  ['Side room: find it', 'default_room', 'find'],
  ['Victory: the recap says each word', 'default_victory', 'word_'],
  ['Victory: the villain, good again, in a bubble', 'anna_victory', 'reformed_smaug_marshmallows'],
  ['Victory: Ellie sends her off', 'default_victory', 'nar_ellie_victory_2'],
  ['Battle: the partner in the move choice (compact)', 'default_battle', 'choice'],
  ['Battle: the opening line (compact)', 'default_battle', 'nar_ellie_battle_start'],
];

function find(tag: string, prefix: string, key: string): string | null {
  const files = readdirSync(dir(tag)).filter((f) => f.startsWith(`${prefix}_`));
  const exact = files.find((f) => f === `${prefix}_${key}.png`);
  if (exact) return `${dir(tag)}/${exact}`;
  const hit = files.find((f) => /_\d\d_/.test(f) && f.slice(prefix.length + 4).startsWith(key));
  return hit ? `${dir(tag)}/${hit}` : null;
}

const W = 640;
const H = 360;
const LABEL = 44;
const PAD = 16;

async function main(): Promise<void> {
  const rows: { label: string; a: string; b: string }[] = [];
  const missing: string[] = [];
  for (const [label, prefix, key] of ROWS) {
    const a = find(beforeTag, prefix, key);
    const b = find(afterTag, prefix, key);
    if (a && b) rows.push({ label, a, b });
    else missing.push(`${label} (${a ? '' : 'before '}${b ? '' : 'after'})`);
  }
  const width = PAD * 3 + W * 2;
  const header = 70;
  const height = header + rows.length * (LABEL + H + PAD);
  const parts: OverlayOptions[] = [];
  const svgText = (text: string, w: number, h: number, size: number, weight = 'bold') =>
    Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${h - 12}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#ffffff">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`,
    );
  parts.push({ input: svgText('Item 024: who is talking. Left: before. Right: after.', width - PAD * 2, header, 30), left: PAD, top: 0 });
  for (const [i, r] of rows.entries()) {
    const top = header + i * (LABEL + H + PAD);
    parts.push({ input: svgText(r.label, width - PAD * 2, LABEL, 24, 'normal'), left: PAD, top });
    parts.push({ input: await sharp(r.a).resize(W, H).png().toBuffer(), left: PAD, top: top + LABEL });
    parts.push({ input: await sharp(r.b).resize(W, H).png().toBuffer(), left: PAD * 2 + W, top: top + LABEL });
  }
  await sharp({ create: { width, height, channels: 3, background: '#1a1428' } }).composite(parts).png().toFile(out);
  console.log(`${out}: ${rows.length} rows`);
  if (missing.length) console.log(`missing: ${missing.join('; ')}`);
}

void main();
