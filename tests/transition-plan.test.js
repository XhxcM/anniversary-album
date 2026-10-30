import test from 'node:test';
import assert from 'node:assert/strict';
import { createTransitionPlan } from '../src/three/transition-plan.js';

test('transition keys reuse matching meshes and reconcile unequal sizes without duplicates', () => {
  for (const [oldCount, newCount] of [[0, 0], [0, 60], [1, 1], [8, 40], [40, 8], [60, 60], [60, 0]]) {
    const old = Array.from({ length: oldCount }, (_, index) => ({ key: `a/${index}`, mesh: { index } }));
    const next = Array.from({ length: newCount }, (_, index) => ({ key: `a/${index}` }));
    const targets = next.map((_, index) => ({ x: index }));
    const plan = createTransitionPlan(old, next, targets);
    assert.equal(plan.updates.length, Math.min(oldCount, newCount));
    assert.equal(plan.creates.length, Math.max(0, newCount - oldCount));
    assert.equal(plan.removes.length, Math.max(0, oldCount - newCount));
    const keys = [...plan.updates, ...plan.creates, ...plan.removes].map((item) => item.key);
    assert.equal(keys.length, new Set(keys).size);
    for (const update of plan.updates) assert.equal(update.item, old.find((item) => item.key === update.key));
  }
});
test('chapter-qualified keys do not reuse other chapter photos', () => {
  const plan = createTransitionPlan([{ key: 'old/01' }], [{ key: 'new/01' }], [{ x: 0 }]);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.creates.length, 1);
  assert.equal(plan.removes.length, 1);
});
