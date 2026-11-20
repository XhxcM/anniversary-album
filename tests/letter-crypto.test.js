import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptLetter, decryptLetter } from '../src/lib/letter-crypto.js';

test('letter encryption round-trips Unicode and rejects wrong passwords and modified payloads', async () => {
  const text = 'TEST-ONLY-LETTER\n虚构信件正文';
  const password = 'fixture-test-only';
  const encrypted = await encryptLetter(text, password);
  const second = await encryptLetter(text, password);
  assert.notEqual(encrypted.salt, second.salt);
  assert.notEqual(encrypted.iv, second.iv);
  assert.ok(!JSON.stringify(encrypted).includes(text));
  assert.ok(!JSON.stringify(encrypted).includes(password));
  assert.equal(await decryptLetter(encrypted, password), text);
  await assert.rejects(decryptLetter(encrypted, 'incorrect'));
  const flipped = (encrypted.ciphertext[0] === 'A' ? 'B' : 'A') + encrypted.ciphertext.slice(1);
  await assert.rejects(decryptLetter({ ...encrypted, ciphertext: flipped }, password));
  await assert.rejects(decryptLetter({ ...encrypted, iterations: 1 }, password));
  await assert.rejects(decryptLetter({ ...encrypted, iv: 'AAAA' }, password));
  await assert.rejects(decryptLetter(null, password));
});
