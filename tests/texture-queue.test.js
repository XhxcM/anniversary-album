import test from 'node:test';
import assert from 'node:assert/strict';
import { createTextureQueue } from '../src/three/texture-queue.js';

async function until(predicate) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.fail('Texture loading did not settle');
}

test('photo downloads stay bounded, share duplicate URLs, and recover from a transient failure', async () => {
  let active = 0, peak = 0;
  const attempts = new Map(), loaded = [];
  const queue = createTextureQueue(async (url) => {
    active++; peak = Math.max(peak, active);
    attempts.set(url, (attempts.get(url) ?? 0) + 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    if (url === 'first' && attempts.get(url) === 1) throw new Error('Temporary connection failure');
    return { url };
  }, (url) => loaded.push(url), { retryDelayMs: 1 });
  try {
    queue.request(['first', 'second', 'third', 'fourth', 'fifth', 'first']);
    await until(() => loaded.length === 5);
    assert.ok(peak <= 4);
    assert.equal(attempts.get('first'), 2);
    queue.request(['first']);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(attempts.get('first'), 2);
  } finally { queue.dispose(); }
});

test('the next visible batch takes priority over pending background photos', async () => {
  const started = [], finish = [], loaded = [];
  const queue = createTextureQueue((url) => {
    started.push(url);
    return new Promise((resolve) => finish.push(() => resolve({ url })));
  }, (url) => loaded.push(url), { concurrency: 1 });
  try {
    queue.request(['visible', 'background', 'next']);
    await until(() => started.length === 1);
    queue.request(['next']);
    finish.shift()();
    await until(() => started.length === 2);
    assert.deepEqual(started, ['visible', 'next']);
    finish.shift()();
    await until(() => started.length === 3);
    finish.shift()();
    await until(() => loaded.length === 3);
  } finally { queue.dispose(); }
});

test('timeouts release slots, failed photos can recover on a later request, and disposal aborts work', async () => {
  let attempts = 0, recovered = false;
  const loaded = [];
  const queue = createTextureQueue((url, signal) => {
    attempts++;
    if (recovered) return Promise.resolve({ url });
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true }));
  }, (url) => loaded.push(url), { concurrency: 1, attempts: 2, timeoutMs: 5, retryDelayMs: 1 });
  try {
    queue.request(['photo']);
    await until(() => attempts === 2);
    await new Promise((resolve) => setTimeout(resolve, 15));
    recovered = true;
    queue.request(['photo']);
    await until(() => loaded.length === 1);
    assert.equal(attempts, 3);
  } finally { queue.dispose(); }

  let signal, finish, disposed = false;
  const late = createTextureQueue((url, inputSignal) => {
    signal = inputSignal;
    return new Promise((resolve) => { finish = resolve; });
  }, () => assert.fail('A disposed scene must not receive textures'));
  late.request(['photo']);
  await until(() => finish);
  late.dispose();
  assert.equal(signal.aborted, true);
  finish({ dispose() { disposed = true; } });
  await until(() => disposed);
});
