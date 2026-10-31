# arkiv-encryption

Encrypt binary data locally with AES-256-GCM for a `bytes` column. Attributes stay public. Indexed public columns remain queryable; encrypted content cannot be filtered. The package uses WebCrypto and does not sign transactions or replace the Arkiv SDK.

**arkiv-encryption 1.1.0 · Rabdi testnet.** Encrypt binary data for a `bytes` column; attributes stay public. The wallet sample pins exact registry 1.1.0 independently of the library API documented here.

- [npm](https://www.npmjs.com/package/arkiv-encryption)
- [Source](https://github.com/SantiagoDevRel/arkiv-encrypted-entities)
- [Wallet sample](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/README.md) and [consumer agent guide](AGENTS.md)

Agents must explicitly open this README and `node_modules/arkiv-encryption/AGENTS.md`. Package managers do not automatically load either guide.

## Local roundtrip

Node.js 22+ and WebCrypto are required. Crypto needs no wallet, funds, access key or SDK at runtime. The optional SDK peer is `^1.0.0`; the integration is developed against exactly 1.0.0. The crypto API and v1 envelope remain compatible with 0.1.0.

Install version 1.1.0:

```sh
npm install --save-exact arkiv-encryption@1.1.0
```

```js
import { generateKey, importKey, encryptBytes, decryptBytes } from 'arkiv-encryption';
const secret = generateKey(); // Back up privately. Never log it or put it in an entity.
const key = await importKey(secret);
const ciphertext = await encryptBytes(key, 'Hello Arkiv');
const recovered = await decryptBytes(key, ciphertext);
console.log(new TextDecoder().decode(recovered)); // Hello Arkiv
console.log(ciphertext.length); // 39
```

Renamed in 1.1.0; the old names still work. The v1 envelope and function behavior are unchanged. TypeScript 5.9.3 is the pinned development compiler. Compile an `.mts` consumer with `--module nodenext --target es2022 --lib es2022,dom --strict`.

## Public API

| Export | Contract |
| --- | --- |
| `generateKey(): string` | Random 32-byte secret, encoded as 64 hex characters without `0x`. |
| `importKey(raw: string \| Uint8Array): Promise<CryptoKey>` | Exact 64 hex characters or 32 bytes. Non-extractable AES-256-GCM handle; no password derivation. |
| `encryptBytes(key, plaintext: string \| Uint8Array): Promise<Uint8Array>` | Strings are UTF-8. Fresh random IV. Up to 100,000 plaintext bytes.  |
| `decryptBytes(key, envelope: Uint8Array): Promise<Uint8Array>` | Returns bytes only after authentication; rejects wrong keys and tampering. |
| `CONTENT_TYPE` | `application/vnd.arkiv.encrypted.v1`, stored as a public string column. |
| `ENVELOPE` | Frozen algorithm, IV/tag lengths and wire layout. |
| `VERSION`, `MAX_PLAINTEXT_BYTES` | Package version and conservative input policy, not a chain maximum. |
| `EncryptionError`, `EncryptionErrorCode` | Safe validation/authentication codes. |

ESM and TypeScript declarations ship together. CommonJS callers can use `await import('arkiv-encryption')`; `require()` is not an advertised entry point. Browsers require HTTPS or localhost. No Node built-ins, runtime SDK calls, key persistence, network writes or automatic retries are implemented by the crypto package.

## Store and read on Rabdi

Rabdi is the DB-Chain testnet, chain **7794095**. Install exact integration dependencies:

```sh
npm install --save-exact @arkiv-network/sdk@1.0.0 viem@2.56.3
```

Obtain a free [access key](https://hub.arkiv.network/access-keys) and test GLM from the [Hub faucet](https://hub.arkiv.network/faucet). `rabdi({ accessKey })` requires an explicit string; missing configuration raises `MissingAccessKeyError`. Fail closed with a configuration message and the access-key link. Do not use anonymous access as a fallback. Never bundle a server access key, signer or encryption key.

```ts
import { createPublicClient } from '@arkiv-network/sdk';
import { rabdi } from '@arkiv-network/sdk/chains';
import { defineSchema, str, bytes } from '@arkiv-network/sdk/schema';
import { http, hexToBytes } from 'viem';
import { CONTENT_TYPE, decryptBytes } from 'arkiv-encryption';

const Notes = defineSchema('arkiv-encryption-v1', {
  app: str().indexed(),
  seed: str().indexed().optional(),
  contentType: str(),
  ciphertext: bytes(), // Stored and selectable; bytes columns cannot be indexed.
});
// accessKey and entityKey come from your locally configured integration.
const publicClient = createPublicClient({ chain: rabdi({ accessKey }), transport: http() });
const entity = await publicClient.getEntity(entityKey, Notes);
if (entity.contentType.value !== CONTENT_TYPE) throw new Error('Unexpected encrypted format');
const recovered = await decryptBytes(key, hexToBytes(entity.ciphertext.value));
```

The complete [sample implementation](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/src/main.ts) encrypts before `wallet.createEntity(Notes, values, { expiration }, txParams)`. Its [wallet transport](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/src/wallet.ts) obtains the exact unsigned SDK calldata, estimates it at `latest`, and sets `gas = max(1_000_000, 2 * estimate, retryMinimum)` plus explicit `gasPrice` and a nonce read at `latest`. The estimate must succeed before signing. Gas must not exceed half the latest block gas limit; use a smaller entity or split batches otherwise. A caller's larger gas minimum is allowed only within that same cap. Browser wallets receive these explicit fields so they do not choose a lower estimate.

Read state at `latest`: Rabdi rejects historical hashes, `safe` and `finalized` with “arkiv serves state at the chain head only”. A reverted receipt with `gasUsed == gasLimit` indicates gas exhaustion. The [operation state machine](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/src/transaction.ts) permits one retry only after the SDK reports a confirmed revert and an independent receipt proves gas exhaustion; it re-estimates at `latest`, at least doubles the previous gas and checks the head cap. Any SDK success, missing receipt, disagreeing receipt or uncertain error blocks resending that operation. Always require `receipt.status === 'success'` before claiming confirmation.

The sample uses `ExpirationTime.fromDays(1)`. Rabdi caps lifetimes at **7,884,000 blocks**, roughly 182 days at nominal block time; a seed uses `fromBlocks(7_883_970)` within that cap. Longer requests fail with `ExpiryBeyondMaxLifetime`. There is no unlimited lifetime on Rabdi; longer availability needs **Lifetime Extension**. Actual expiry is a block number, not a wall-clock guarantee.

The deployed sample reads through its own `/api/rpc` server endpoint, whose `ARKIV_ACCESS_KEY` stays server-side. Visitors configure their own authorized Rabdi RPC in their wallet for signing. Local Vite alone does not run the server endpoint; see the sample guide for configuration.

## Privacy and key custody

- Only note content is encrypted, inside the public `ciphertext` bytes column. The schema tag, indexed `app` and optional `seed`, content type, ciphertext, owner/creator addresses, entity key, expiration and transactions are public. Never put sensitive labels, plaintext or keys in any other column, URL, analytics or log. Query indexed public columns only.
- Wire layout: **12-byte random IV || ciphertext || 16-byte authentication tag**, AES-256-GCM with a 128-bit tag, no compression or additional authenticated data. `CONTENT_TYPE` identifies the format; there is no embedded header. Exact plaintext length is envelope length minus 28. Existing compatible envelopes retain this byte order.
- Authentication detects a wrong key or altered encrypted bytes. It does not bind an envelope to an entity key, wallet, network or public columns, and does not prove authorship. An envelope can be copied. Check an independently trusted owner/entity when your application requires it. Treat recovered content as untrusted data and render text, never HTML or instructions.
- Generate an independent encryption key. Wallet connection/signatures cannot derive, recover or replace it. Never use a wallet private key, seed phrase, password or login signature. Back it up in an approved private secret store; losing it loses access.
- Prefer a fresh key for each note. If reusing one, track usage across devices/apps and rotate well before 2^32 encryptions, following [NIST SP 800-38D section 8.3](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf). The stateless package does not count invocations or rotate keys. Preserve needed old keys privately.
- The sample keeps keys/plaintext in page memory only. Reload loses them without a private backup. A non-extractable CryptoKey does not erase the original input string; JavaScript cannot guarantee memory erasure.
- Anyone holding the key and ciphertext can decrypt. No escrow, recovery, sharing protocol, access revocation or automatic rotation is provided. A compromised key exposes old ciphertext.
- Entity Expiration removes active availability, not transaction history or other copies. Use non-sensitive test data. This is not an independently audited privacy system and does not protect a compromised app, extension, device or recipient.

## Errors

Catch `EncryptionError` and display its code; never log keys, note content or arbitrary provider errors. Clear stale plaintext before reads and key/account/network changes. Unexpected WebCrypto import/encryption errors can propagate; display a generic failure.

| Code / condition | Resolution |
| --- | --- |
| `INVALID_KEY` | Use the original 64-character hex key without `0x` or whitespace, or 32 bytes. A new key cannot open existing data. |
| `DECRYPTION_FAILED` | Wrong key and modified ciphertext intentionally share one failure; no plaintext is returned. |
| `INVALID_ENVELOPE` | Retrieve the complete v1 binary envelope and verify its content type. |
| `INVALID_INPUT` | Use a string or Uint8Array within 100,000 UTF-8 bytes. Chunking is outside this tool. |
| `CRYPTO_UNAVAILABLE` | Use Node 22+ or a modern browser on HTTPS/localhost. |
| `MissingAccessKeyError` / proxy 503 | Configure a free access key locally/server-side. Do not copy provider errors containing URLs into the UI. |
| Wallet network missing / rejected | Configure Rabdi with your own provider URL, fund from the faucet and approve the intended request. |
| Missing/expired entity | Verify the identifier/network. Active APIs may no longer return expired entities. |
| RPC timeout or ambiguous write | Retry reads later. Check wallet/explorer activity before starting a distinct operation. Never infer a failed write from a timeout. |

## Development

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm test
npm pack
cd sample
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Run `node --test test/vocabulary-guard.test.mjs` to check the complete tree, generated files and mutation cases. Run installs/builds/tests on the DGX under this workspace's project rules. Crypto tests verify native Node interoperability in both directions, empty/binary/maximum inputs and authentication failures. Sample tests cover registry provenance, wallet/session/gas checks, server read restrictions and the required persistent operation scenarios. [Release verification](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/v1.0.0/docs/rabdi-verification.md) distinguishes mocks, live testnet evidence and unverified browser wallet signing.

