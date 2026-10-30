import test from 'node:test';
import assert from 'node:assert/strict';
import { createFormation, selectEvenly } from '../src/three/formations.js';

for (const name of ['river', 'infinity', 'doubleHeart']) test(`${name}: all counts 0–60 have finite unique coordinates`, () => {
  for (let count = 0; count <= 60; count++) {
    const points = createFormation(name, count, { width: 16, height: 9 });
    assert.equal(points.length, count);
    assert.ok(points.every((point) => point.scale >= 0.1), `${name}/${count}: cards must stay visible`);
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
test('60 framed photos leave space around heart cusps and formation crossings', () => {
  for (const name of ['river', 'infinity', 'doubleHeart']) {
    const points = createFormation(name, 60, { width: 16, height: 9 });
    points.forEach((a, index) => points.slice(index + 1).forEach((b) => {
      const totalScale = a.scale + b.scale;
      assert.ok(Math.abs(a.x - b.x) > 0.72 * totalScale || Math.abs(a.y - b.y) > 0.58 * totalScale, `${name}: frames overlap`);
    }));
  }
});
