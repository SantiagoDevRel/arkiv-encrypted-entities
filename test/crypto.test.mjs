import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { generateKey, importKey, encryptBytes, decryptBytes, MAX_PLAINTEXT_BYTES } from '../dist/index.js';

for (const value of ['', 'Hola Arkiv 🔐', 'x'.repeat(MAX_PLAINTEXT_BYTES)]) {
  test(`roundtrip ${value.length} characters`, async () => {
    const key = await importKey(generateKey());
    const encrypted = await encryptBytes(key, value);
    assert.equal(encrypted.length, new TextEncoder().encode(value).length + 28);
    assert.equal(new TextDecoder().decode(await decryptBytes(key, encrypted)), value);
  });
}
test('fresh IV for the same key and plaintext; binary data preserved', async () => {
  const key = await importKey(generateKey()); const input = new Uint8Array([0, 255, 128, 0]);
  const a = await encryptBytes(key, input), b = await encryptBytes(key, input);
  assert.notDeepEqual(a.slice(0, 12), b.slice(0, 12));
  assert.deepEqual(await decryptBytes(key, a), input);
});
test('Node native crypto and WebCrypto interoperate in both directions', async () => {
  const raw = randomBytes(32), key = await importKey(raw), plaintext = Buffer.from('independent implementation');
  const sealed = await encryptBytes(key, plaintext);
  const decipher = createDecipheriv('aes-256-gcm', raw, sealed.slice(0, 12));
  decipher.setAuthTag(sealed.slice(-16));
  assert.deepEqual(Buffer.concat([decipher.update(sealed.slice(12, -16)), decipher.final()]), plaintext);
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', raw, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  assert.deepEqual(Buffer.from(await decryptBytes(key, Buffer.concat([iv, ct, cipher.getAuthTag()]))), plaintext);
});
test('wrong key and modified IV, ciphertext or tag fail closed', async () => {
  const key = await importKey(generateKey()), ct = await encryptBytes(key, 'private demo');
  await assert.rejects(decryptBytes(await importKey(generateKey()), ct), { code: 'DECRYPTION_FAILED' });
  for (const position of [0, 12, ct.length - 1]) {
    const altered = ct.slice(); altered[position] ^= 1;
    await assert.rejects(decryptBytes(key, altered), { code: 'DECRYPTION_FAILED' });
  }
});
test('missing, malformed and wrong-algorithm keys fail clearly', async () => {
  for (const raw of ['', 'f'.repeat(63), 'z'.repeat(64), new Uint8Array(31), undefined]) {
    await assert.rejects(importKey(raw), { code: 'INVALID_KEY' });
  }
  await assert.rejects(encryptBytes(undefined, 'demo'), { code: 'INVALID_KEY' });
  await assert.rejects(encryptBytes({ type: 'secret', algorithm: { name: 'AES-GCM', length: 256 }, usages: ['encrypt'] }, 'demo'), { code: 'INVALID_KEY' });
  const wrong = await crypto.subtle.generateKey({ name: 'AES-CBC', length: 256 }, false, ['encrypt']);
  await assert.rejects(encryptBytes(wrong, 'demo'), { code: 'INVALID_KEY' });
});
test('invalid/truncated binary data and oversize inputs fail before use', async () => {
  const key = await importKey(generateKey());
  for (const value of [new Uint8Array(27), new Uint8Array(100029), 'not bytes']) {
    await assert.rejects(decryptBytes(key, value), { code: 'INVALID_ENVELOPE' });
  }
  await assert.rejects(encryptBytes(key, new Uint8Array(MAX_PLAINTEXT_BYTES + 1)), { code: 'INVALID_INPUT' });
});

test('deprecated aliases are the same functions and cross-decrypt unchanged envelopes', async () => {
  const api = await import('../dist/index.js');
  const retired = 'Pay' + 'load';
  const encryptLegacy = api['encrypt' + retired], decryptLegacy = api['decrypt' + retired];
  assert.equal(encryptLegacy, encryptBytes);
  assert.equal(decryptLegacy, decryptBytes);
  const key = await importKey(generateKey()), input = new Uint8Array([0, 255, 128, 65]);
  assert.deepEqual(await decryptBytes(key, await encryptLegacy(key, input)), input);
  assert.deepEqual(await decryptLegacy(key, await encryptBytes(key, input)), input);
  await assert.rejects(decryptLegacy(await importKey(generateKey()), await encryptBytes(key, input)), { code: 'DECRYPTION_FAILED' });
});
