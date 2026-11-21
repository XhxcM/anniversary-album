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
test('all six loop shapes are deterministic with finite transforms through 100 cards', () => {
  for (const name of ['doubleHeart', 'matrix', 'sphere', 'river', 'ring', 'cylinder']) {
    for (const count of [0, 1, 70, 100]) {
      const points = createFormation(name, count);
      assert.equal(points.length, count);
      assert.deepEqual(points, createFormation(name, count));
      for (const point of points) {
        for (const field of ['x', 'y', 'z', 'rotationY', 'rotationZ', 'scale']) assert.ok(Number.isFinite(point[field]), name + '/' + field);
        assert.ok(point.scale > 0);
      }
    }
  }
});

test('100-card matrix is a regular grid with room between portrait cards', () => {
  const points = createFormation('matrix', 100);
  const rows = new Set(points.map((point) => point.y));
  const columns = new Set(points.map((point) => point.x));
  assert.equal(rows.size, 10);
  assert.equal(columns.size, 10);
  assert.ok(Math.abs(points[10].y - points[0].y) > 1.08 * points[0].scale);
  assert.ok(points[1].x - points[0].x > 0.82 * points[0].scale);
});

test('landscape formations give photos more space and expand the double heart on wide screens', () => {
  const viewport = { width: 34, height: 8.5 };
  for (const name of ['doubleHeart', 'matrix', 'sphere', 'river', 'ring', 'cylinder']) {
    assert.ok(createFormation(name, 100, viewport).every(({ scale }) => scale >= 0.62), name);
  }
  const x = createFormation('doubleHeart', 100, viewport).map((point) => point.x);
  assert.ok(Math.max(...x) - Math.min(...x) > 15);
});

test('36 larger portrait cards fit a complete 6 by 6 matrix with a vertical gap', () => {
  const points = createFormation('matrix', 36, { width: 34, height: 8.5 });
  assert.equal(new Set(points.map((point) => point.y)).size, 6);
  assert.equal(new Set(points.map((point) => point.x)).size, 6);
  assert.ok(points[0].scale > 1.19);
  assert.ok(points[0].y - points[6].y > points[0].scale * 1.10 + 0.015);
  assert.ok(createFormation('doubleHeart', 36)[0].scale > 1.16);
});

test('phone formations use larger photos and a wide two-row matrix', () => {
  const viewport = { width: 34, height: 8.5, compact: true };
  const matrix = createFormation('matrix', 12, viewport);
  assert.equal(new Set(matrix.map(({ y }) => y)).size, 2);
  assert.equal(new Set(matrix.map(({ x }) => x)).size, 6);
  assert.ok(matrix[0].scale > createFormation('matrix', 36)[0].scale * 1.8);
  for (const name of ['doubleHeart', 'matrix', 'sphere', 'river', 'ring', 'cylinder']) {
    for (const count of [0, 1, 8, 12]) {
      const points = createFormation(name, count, viewport);
      assert.equal(points.length, count);
      assert.ok(points.every((point) => Object.values(point).every(Number.isFinite)));
    }
  }
});
