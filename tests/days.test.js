import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateElapsedDays, millisecondsUntilNextMidnight } from '../src/lib/days.js';

test('elapsed days use Shanghai calendar boundaries regardless of visitor timezone', () => {
  for (const [instant, days] of [
    ['2025-12-13T16:00:00Z', 0], ['2025-12-31T16:00:00Z', 18],
    ['2026-12-13T15:59:59Z', 364], ['2026-12-13T16:00:00Z', 365],
  ]) assert.equal(calculateElapsedDays('2025-12-14', new Date(instant), 'Asia/Shanghai'), days);
});
test('invalid calendar dates and zones are non-throwing', () => {
  for (const date of ['invalid', '2025-02-30', '2025-13-01'])
    assert.equal(calculateElapsedDays(date, new Date(), 'Asia/Shanghai'), null);
  assert.equal(calculateElapsedDays('2025-12-14', new Date('invalid')), null);
  assert.equal(calculateElapsedDays('2025-12-14', new Date(), 'invalid'), null);
});
test('next Shanghai midnight is scheduled exactly and stays positive', () => {
  assert.equal(millisecondsUntilNextMidnight(new Date('2026-12-13T15:59:59Z'), 'Asia/Shanghai'), 1000);
  assert.equal(millisecondsUntilNextMidnight(new Date('2026-12-13T16:00:00Z'), 'Asia/Shanghai'), 86400000);
});
