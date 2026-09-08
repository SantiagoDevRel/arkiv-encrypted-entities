/** Adapted from arkiv-cookbook/src/lib/arkiv/crypto.ts: one WebCrypto format in both runtimes. */
export const VERSION = '0.1.0';
export const CONTENT_TYPE = 'application/vnd.arkiv.encrypted.v1';
export const ENVELOPE = Object.freeze({ algorithm: 'AES-GCM', ivBytes: 12, tagBytes: 16, layout: 'iv || ciphertext || tag' } as const);
/** Conservative policy for a single small entity; not a network maximum. */
export const MAX_PLAINTEXT_BYTES = 100_000;
export type EncryptionErrorCode = 'INVALID_KEY' | 'INVALID_INPUT' | 'INVALID_ENVELOPE' | 'DECRYPTION_FAILED' | 'CRYPTO_UNAVAILABLE';
export class EncryptionError extends Error {
  constructor(public readonly code: EncryptionErrorCode, message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}
function fail(code: EncryptionErrorCode, message: string): never { throw new EncryptionError(code, message); }
function webcrypto(): Crypto {
  if (!globalThis.crypto?.subtle) fail('CRYPTO_UNAVAILABLE', 'WebCrypto requires Node 22+ or a secure browser context (HTTPS or localhost).');
  return globalThis.crypto;
}
function bytes(value: Uint8Array, max: number): Uint8Array<ArrayBuffer> {
  if (!(value instanceof Uint8Array) || value.length > max) fail('INVALID_INPUT', `Expected Uint8Array with at most ${max} bytes.`);
  return new Uint8Array(value);
}
function requireKey(key: CryptoKey, usage: KeyUsage): void {
  if (!key || (typeof CryptoKey !== 'undefined' && !(key instanceof CryptoKey)) || key.type !== 'secret' || key.algorithm?.name !== 'AES-GCM' ||
      (key.algorithm as AesKeyAlgorithm).length !== 256 || !key.usages?.includes(usage)) {
    fail('INVALID_KEY', 'Provide a 256-bit AES-GCM key with the required usage. Generate or import a key first.');
  }
}
/** Returns a 64-character hex secret. Back it up privately; never put it in an entity or URL. */
export function generateKey(): string {
  return Array.from(webcrypto().getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
/** Imports an exact 32-byte key, not a password or a wallet private key. Non-extractable handle. */
export async function importKey(raw: string | Uint8Array): Promise<CryptoKey> {
  let data: Uint8Array<ArrayBuffer>;
  if (typeof raw === 'string') {
    if (!/^[a-fA-F0-9]{64}$/.test(raw)) fail('INVALID_KEY', 'Expected a 64-character hexadecimal encryption key.');
    data = Uint8Array.from(raw.match(/../g)!, b => Number.parseInt(b, 16));
  } else {
    if (!(raw instanceof Uint8Array) || raw.length !== 32) fail('INVALID_KEY', 'Expected a 32-byte encryption key.');
    data = new Uint8Array(raw);
  }
  try { return await webcrypto().subtle.importKey('raw', data, 'AES-GCM', false, ['encrypt', 'decrypt']); }
  finally { data.fill(0); }
}
/** Random 96-bit IV on every call; no compression, key persistence, or network access. */
export async function encryptPayload(key: CryptoKey, plaintext: Uint8Array | string): Promise<Uint8Array<ArrayBuffer>> {
  requireKey(key, 'encrypt');
  const data = bytes(typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext, MAX_PLAINTEXT_BYTES);
  const iv = webcrypto().getRandomValues(new Uint8Array(ENVELOPE.ivBytes));
  try {
    const ciphertext = new Uint8Array(await webcrypto().subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, data));
    const envelope = new Uint8Array(iv.length + ciphertext.length);
    envelope.set(iv); envelope.set(ciphertext, iv.length);
    return envelope;
  } finally { data.fill(0); }
}
/** Authenticates before returning bytes. Wrong keys and tampering have the same safe failure. */
export async function decryptPayload(key: CryptoKey, envelope: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  requireKey(key, 'decrypt');
  if (!(envelope instanceof Uint8Array) || envelope.length < 28 || envelope.length > MAX_PLAINTEXT_BYTES + 28) {
    fail('INVALID_ENVELOPE', 'Expected a v1 envelope of 28 to 100028 bytes.');
  }
  const data = bytes(envelope, MAX_PLAINTEXT_BYTES + 28);
  const subtle = webcrypto().subtle;
  try {
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12), tagLength: 128 }, key, data.slice(12)));
  } catch {
    fail('DECRYPTION_FAILED', 'Decryption failed: the key is wrong or the encrypted payload was modified. No plaintext was returned.');
  }
}
