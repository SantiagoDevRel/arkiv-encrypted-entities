import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { generateKey, importKey, encryptPayload, decryptPayload, MAX_PLAINTEXT_BYTES } from '../dist/index.js';

for (const value of ['', 'Hola Arkiv 🔐', 'x'.repeat(MAX_PLAINTEXT_BYTES)]) {
  test(`roundtrip ${value.length} characters`, async () => {
    const key = await importKey(generateKey());
    const encrypted = await encryptPayload(key, value);
    assert.equal(encrypted.length, new TextEncoder().encode(value).length + 28);
    assert.equal(new TextDecoder().decode(await decryptPayload(key, encrypted)), value);
  });
}
test('fresh IV for the same key and plaintext; binary data preserved', async () => {
  const key = await importKey(generateKey()); const input = new Uint8Array([0, 255, 128, 0]);
  const a = await encryptPayload(key, input), b = await encryptPayload(key, input);
  assert.notDeepEqual(a.slice(0, 12), b.slice(0, 12));
  assert.deepEqual(await decryptPayload(key, a), input);
});
test('Node native crypto and WebCrypto interoperate in both directions', async () => {
  const raw = randomBytes(32), key = await importKey(raw), plaintext = Buffer.from('independent implementation');
  const sealed = await encryptPayload(key, plaintext);
  const decipher = createDecipheriv('aes-256-gcm', raw, sealed.slice(0, 12));
  decipher.setAuthTag(sealed.slice(-16));
  assert.deepEqual(Buffer.concat([decipher.update(sealed.slice(12, -16)), decipher.final()]), plaintext);
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', raw, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  assert.deepEqual(Buffer.from(await decryptPayload(key, Buffer.concat([iv, ct, cipher.getAuthTag()]))), plaintext);
});
test('wrong key and modified IV, ciphertext or tag fail closed', async () => {
  const key = await importKey(generateKey()), ct = await encryptPayload(key, 'private demo');
  await assert.rejects(decryptPayload(await importKey(generateKey()), ct), { code: 'DECRYPTION_FAILED' });
  for (const position of [0, 12, ct.length - 1]) {
    const altered = ct.slice(); altered[position] ^= 1;
    await assert.rejects(decryptPayload(key, altered), { code: 'DECRYPTION_FAILED' });
  }
});
test('missing, malformed and wrong-algorithm keys fail clearly', async () => {
  for (const raw of ['', 'f'.repeat(63), 'z'.repeat(64), new Uint8Array(31), undefined]) {
    await assert.rejects(importKey(raw), { code: 'INVALID_KEY' });
  }
  await assert.rejects(encryptPayload(undefined, 'demo'), { code: 'INVALID_KEY' });
  await assert.rejects(encryptPayload({ type: 'secret', algorithm: { name: 'AES-GCM', length: 256 }, usages: ['encrypt'] }, 'demo'), { code: 'INVALID_KEY' });
  const wrong = await crypto.subtle.generateKey({ name: 'AES-CBC', length: 256 }, false, ['encrypt']);
  await assert.rejects(encryptPayload(wrong, 'demo'), { code: 'INVALID_KEY' });
});
test('invalid/truncated payload and oversize inputs fail before use', async () => {
  const key = await importKey(generateKey());
  for (const value of [new Uint8Array(27), new Uint8Array(100029), 'not bytes']) {
    await assert.rejects(decryptPayload(key, value), { code: 'INVALID_ENVELOPE' });
  }
  await assert.rejects(encryptPayload(key, new Uint8Array(MAX_PLAINTEXT_BYTES + 1)), { code: 'INVALID_INPUT' });
});
