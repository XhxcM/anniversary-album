import test from 'node:test';
import assert from 'node:assert/strict';
import { albumPhase } from '../src/lib/navigation.js';

test('album waits for entry and landscape, then restores the active phase', () => {
  assert.equal(albumPhase(false, true, 0), 'waiting');
  assert.equal(albumPhase(true, true, 0), 'landscape');
  assert.equal(albumPhase(true, false, 2999), 'opening');
  assert.equal(albumPhase(true, false, 3000), 'loop');
  assert.equal(albumPhase(true, true, 9000), 'landscape');
  assert.equal(albumPhase(true, false, 9000), 'loop');
});
