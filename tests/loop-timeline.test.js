import test from 'node:test';
import assert from 'node:assert/strict';
import { elapsedParts } from '../src/lib/days.js';
import { FORMATIONS, loopState, createPlaybackClock, photoBatch } from '../src/three/loop-timeline.js';

test('elapsed time follows the Shanghai start across dates and clamps future starts', () => {
  const start = '2025-12-14T00:00:00+08:00';
  assert.deepEqual(elapsedParts(start, Date.parse('2026-01-01T17:02:03Z')), {
    days: 19, hours: 1, minutes: 2, seconds: 3,
  });
  assert.deepEqual(elapsedParts(start, 0), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.equal(elapsedParts('2025-02-30T00:00:00+08:00', 0), null);
  assert.equal(elapsedParts('bad', 0), null);
});
test('six formations hold for six seconds, transition for 2.5 and wrap seamlessly', () => {
  assert.deepEqual(FORMATIONS.map(({ name }) => name), ['doubleHeart', 'matrix', 'sphere', 'river', 'ring', 'cylinder']);
  for (const [index, { name }] of FORMATIONS.entries()) {
    const start = index * 8500;
    const nextFormation = FORMATIONS[(index + 1) % FORMATIONS.length].name;
    for (const [offset, progress] of [[0, 0], [5999, 0], [6000, 0], [7250, 0.5], [8499, 0.9996]]) {
      assert.deepEqual(loopState(start + offset), { formation: name, nextFormation, progress });
    }
  }
  assert.deepEqual(loopState(51000), loopState(0));
  assert.deepEqual(loopState(-1), loopState(0));
});
test('active clock excludes pauses without losing elapsed progress', () => {
  const clock = createPlaybackClock();
  clock.setRunning(true, 100);
  assert.equal(clock.elapsed(700), 600);
  clock.setRunning(false, 800);
  assert.equal(clock.elapsed(5000), 700);
  clock.setRunning(true, 5100);
  assert.equal(clock.elapsed(5300), 900);
});

test('large photo pools show 36 at a time and cover all 74 originals in three formations', () => {
  const shown = new Set();
  for (let step = 0; step < 3; step++) {
    const { start, count } = photoBatch(step * 8500, 100, 36);
    assert.equal(count, 36);
    for (let i = 0; i < count; i++) shown.add((start + i) % 100);
  }
  assert.ok(Array.from({ length: 74 }, (_, index) => index).every((index) => shown.has(index)));
  assert.deepEqual(photoBatch(8499, 100, 36), { start: 0, count: 36 });
  assert.deepEqual(photoBatch(42500, 100, 36), { start: 80, count: 36 });
  assert.deepEqual(photoBatch(51000, 100, 36), { start: 16, count: 36 });
});

test('adjacent batches are disjoint even when a small pool wraps', () => {
  for (const limit of [12, 36]) for (const size of [limit + 1, Math.max(31, limit + 2), 74, 100]) {
    const shown = new Set();
    for (let step = 0; step < Math.ceil(size / photoBatch(0, size, limit).count); step++) {
      const { start, count } = photoBatch(step * 8500, size, limit);
      const current = Array.from({ length: count }, (_, index) => (start + index) % size);
      const nextStart = photoBatch((step + 1) * 8500, size, limit).start;
      const next = new Set(Array.from({ length: count }, (_, index) => (nextStart + index) % size));
      assert.ok(current.every((index) => !next.has(index)));
      for (const index of current) shown.add(index);
    }
    assert.equal(shown.size, size);
  }
  assert.deepEqual(photoBatch(8500, 12, 36), { start: 0, count: 12 });
  assert.deepEqual(photoBatch(8500, 0, 36), { start: 0, count: 0 });
});
