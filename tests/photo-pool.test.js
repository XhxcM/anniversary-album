import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhotoPool } from '../src/lib/photo-pool.js';

test('fixed pool includes every photo and samples repeats evenly without replacement', () => {
  for (const count of [70, 80, 90]) {
    const photos = Array.from({ length: count }, (_, index) => ({ key: String(index) }));
    const pool = createPhotoPool(photos, 100, 42);
    assert.deepEqual(pool, createPhotoPool(photos, 100, 42));
    assert.equal(pool.length, 100);
    assert.equal(new Set(pool.map((photo) => photo.key)).size, 100);
    assert.deepEqual(pool.slice(0, count).map((photo) => photo.sourceKey), photos.map((photo) => photo.key));
    assert.equal(new Set(pool.slice(count).map((photo) => photo.sourceKey)).size, 100 - count);
    const repeats = new Map(photos.map(({ key }) => [key, 0]));
    for (let seed = 0; seed < 500; seed++) {
      for (const { sourceKey } of createPhotoPool(photos, 100, seed).slice(count)) {
        repeats.set(sourceKey, repeats.get(sourceKey) + 1);
      }
    }
    const expected = 500 * (100 - count) / count;
    assert.ok([...repeats.values()].every((actual) => Math.abs(actual - expected) < 35));
  }
  assert.deepEqual(createPhotoPool([], 100, 42), []);
  assert.equal(createPhotoPool([{ key: 'one' }], 100, 42).length, 2);
});
