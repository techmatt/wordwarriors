import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { pickTaunt, tauntsSaid, unsayTaunt } from '../../src/episode/lineVariants.js';

beforeEach(() => tauntsSaid.clear());

test('a taunt is the least said, and is recorded (item 087)', () => {
  tauntsSaid.set('smaug', ['a', 'b']);
  assert.equal(pickTaunt('smaug', ['a', 'b', 'c'], 2, () => 0.99), 'c');
  assert.deepEqual(tauntsSaid.get('smaug'), ['a', 'b', 'c']);
});

test('no taunt is said more than max times: then the fighter goes quiet', () => {
  const said: string[] = [];
  for (let i = 0; i < 4; i++) said.push(pickTaunt('scar', ['a', 'b'], 2)!);
  assert.deepEqual([...said].sort(), ['a', 'a', 'b', 'b']);
  assert.equal(pickTaunt('scar', ['a', 'b'], 2), undefined);
  assert.equal(pickTaunt('scar', [], 2), undefined);
  assert.equal(tauntsSaid.get('scar')!.length, 4);
});

test('an unsaid taunt drops only its last record', () => {
  tauntsSaid.set('elsa', ['a', 'b', 'a']);
  unsayTaunt('elsa', 'a');
  assert.deepEqual(tauntsSaid.get('elsa'), ['a', 'b']);
  unsayTaunt('elsa', 'c');
  unsayTaunt('nobody', 'a');
  assert.deepEqual(tauntsSaid.get('elsa'), ['a', 'b']);
  assert.equal(tauntsSaid.has('nobody'), false);
});
