import test from 'node:test';
import assert from 'node:assert/strict';
import { nextChapterIndex, horizontalSwipeDirection } from '../src/lib/navigation.js';

test('chapter navigation is bounded, locked, and one step per action', () => {
  assert.equal(nextChapterIndex(1, 1, 4, true), 1);
  assert.equal(nextChapterIndex(0, -1, 4, false), 0);
  assert.equal(nextChapterIndex(3, 1, 4, false), 3);
  assert.equal(nextChapterIndex(1, 20, 4, false), 2);
  assert.equal(nextChapterIndex(2, -20, 4, false), 1);
  assert.equal(nextChapterIndex(0, 1, 0, false), -1);
});
test('swipes require 50px and horizontal dominance, right is previous', () => {
  const start = { x: 100, y: 100 };
  assert.equal(horizontalSwipeDirection(start, { x: 149, y: 100 }), 0);
  assert.equal(horizontalSwipeDirection(start, { x: 160, y: 220 }), 0);
  assert.equal(horizontalSwipeDirection(start, { x: 160, y: 100 }), -1);
  assert.equal(horizontalSwipeDirection(start, { x: 40, y: 100 }), 1);
  assert.equal(horizontalSwipeDirection(null, start), 0);
});
