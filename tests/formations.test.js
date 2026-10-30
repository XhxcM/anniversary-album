import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormation, selectEvenly } from '../src/three/formations.js';

for (const name of ['river', 'infinity', 'doubleHeart']) test(`${name}: all counts 0–60 have finite unique coordinates`, () => {
  for (let count = 0; count <= 60; count++) {
    const points = createFormation(name, count, { width: 16, height: 9 });
    assert.equal(points.length, count);
    for (const point of points) for (const field of ['x', 'y', 'z', 'rotationZ', 'scale']) assert.ok(Number.isFinite(point[field]));
    assert.equal(new Set(points.map(({ x, y, z }) => `${x},${y},${z}`)).size, count);
  }
});
test('even selection keeps ordered unique endpoints and handles small limits', () => {
  const values = Array.from({ length: 60 }, (_, index) => index);
  const selected = selectEvenly(values, 24);
  assert.equal(selected.length, 24);
  assert.equal(new Set(selected).size, 24);
  assert.equal(selected[0], 0);
  assert.equal(selected.at(-1), 59);
  assert.deepEqual(selected, [...selected].sort((a, b) => a - b));
  assert.deepEqual(selectEvenly(values, 0), []);
  assert.deepEqual(selectEvenly(values, 1), [0]);
  assert.deepEqual(selectEvenly([1], 24), [1]);
});
