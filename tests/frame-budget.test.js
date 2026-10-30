import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameBudget } from '../src/three/frame-budget.js';

test('stable frames remain normal, two sustained slow windows degrade in stages', () => {
  const budget = createFrameBudget();
  for (let index = 0; index < 600; index++) assert.equal(budget.addFrame(16), 'normal');
  budget.reset();
  for (let index = 0; index < 59; index++) assert.equal(budget.addFrame(50), 'normal');
  assert.equal(budget.addFrame(50), 'reduced');
  for (let index = 0; index < 59; index++) assert.equal(budget.addFrame(50), 'reduced');
  assert.equal(budget.addFrame(50), 'fallback');
  budget.reset();
  assert.equal(budget.addFrame(16), 'normal');
});
test('exact 24 FPS and isolated slow frames do not cause downgrade', () => {
  const budget = createFrameBudget();
  for (let index = 0; index < 144; index++) assert.equal(budget.addFrame(1000 / 24), 'normal');
  assert.equal(budget.addFrame(80), 'normal');
  for (let index = 0; index < 300; index++) assert.equal(budget.addFrame(16), 'normal');
});
