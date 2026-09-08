# arkiv-encrypted-entities

Encrypt an Arkiv entity's payload before storing it, then authenticate and decrypt the retrieved bytes locally. Public attributes can still be queried. This small ESM package extracts the AES-GCM envelope already used by the Arkiv cookbook; it does not replace the Arkiv SDK.

**These packages are intended for testnet use.**

Version: **0.1.0**. Release status and actually executed checks are recorded in [verification](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/docs/verification.md). A local build or tarball is not an npm release.

- [npm](https://www.npmjs.com/package/arkiv-encrypted-entities)
- [Source](https://github.com/SantiagoDevRel/arkiv-encrypted-entities)
- [Runnable wallet sample](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/README.md)
- [Consumer agent guide](AGENTS.md) and [sample agent guide](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/AGENTS.md)

Agents integrating the installed package should explicitly open `node_modules/arkiv-encrypted-entities/AGENTS.md` and this README. Package managers do not automatically load them.

## Install and run a minimal example

Requires Node.js 22+ with WebCrypto. The library itself needs no wallet, funds, RPC, access key or SDK.

```sh
mkdir encrypted-demo
cd encrypted-demo
npm init -y
npm install --save-exact arkiv-encrypted-entities@0.1.0
```

Create `demo.mjs`:

```js
import { generateKey, importKey, encryptPayload, decryptPayload } from 'arkiv-encrypted-entities';

const secret = generateKey(); // Keep a private backup; never log this or put it on-chain.
const key = await importKey(secret);
const ciphertext = await encryptPayload(key, 'Hello Arkiv');
const recovered = await decryptPayload(key, ciphertext);
console.log(new TextDecoder().decode(recovered));
console.log('Envelope bytes:', ciphertext.length);
```

```sh
node demo.mjs
```

Expected output:

```text
Hello Arkiv
Envelope bytes: 39
```

Each encryption produces different ciphertext. Empty plaintext and binary `Uint8Array` input are supported.


### TypeScript and typed failures

To check the minimal example with TypeScript, save the same code as `demo.mts` (instead of `demo.mjs`) and run:

```sh
npm install --save-dev --save-exact typescript@5.9.3
npx tsc demo.mts --module nodenext --target es2022 --lib es2022,dom --strict --outDir build
node build/demo.mjs
```

Handle authentication failures without logging key or payload data:

```ts
import { EncryptionError } from 'arkiv-encrypted-entities';
try {
  await decryptPayload(key, ciphertext);
} catch (error) {
  if (error instanceof EncryptionError) console.error(error.code); // e.g. DECRYPTION_FAILED
  else throw error;
}
```
## Public API

| Export | Contract |
| --- | --- |
| `generateKey(): string` | Cryptographically random 32-byte secret encoded as 64 hex characters. |
| `importKey(raw: string \| Uint8Array): Promise<CryptoKey>` | Exactly 64 hex characters without `0x`, or 32 bytes. Returns a non-extractable AES-256-GCM handle. This is **not** password derivation. |
| `encryptPayload(key, plaintext: string \| Uint8Array): Promise<Uint8Array>` | UTF-8 for strings. At most `MAX_PLAINTEXT_BYTES` (100,000 bytes). Fresh random IV per call. |
| `decryptPayload(key, envelope: Uint8Array): Promise<Uint8Array>` | Returns bytes only after successful authentication; rejects wrong keys and tampering. |
| `CONTENT_TYPE` | `application/vnd.arkiv.encrypted.v1`; store with the envelope to identify its format. |
| `ENVELOPE` | Frozen algorithm, IV length, tag length and wire layout. |
| `VERSION`, `MAX_PLAINTEXT_BYTES` | Package version and conservative single-entity input policy. |
| `EncryptionError`, `EncryptionErrorCode` | Safe, stable error codes listed below; messages contain no secret data. |

TypeScript declarations ship with the ESM export. CommonJS `require()` is not an advertised entry point; use `await import('arkiv-encrypted-entities')` from CommonJS. Browser use requires HTTPS or localhost and WebCrypto. No Node built-ins or runtime dependencies are bundled.

## Store and retrieve on Arkiv

The [sample](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/sample/README.md) is the complete implementation: wallet connection, network validation, local encryption, one signed entity creation, ciphertext retrieval and local decryption. It imports this npm package rather than duplicating encryption.

For an existing SDK integration, install the tested dependencies:

```sh
npm install --save-exact @arkiv-network/sdk@0.8.0 viem@2.56.3
```

Given your SDK `walletClient` and `publicClient`, both configured for Tiramisu, and the key from the minimal example:

```ts
import { CONTENT_TYPE, encryptPayload, decryptPayload } from 'arkiv-encrypted-entities';
import { ExpirationTime } from '@arkiv-network/sdk';
import { str } from '@arkiv-network/sdk/attr';

const payload = await encryptPayload(key, 'Non-sensitive integration test');
const created = await walletClient.createEntity({
  payload,
  contentType: CONTENT_TYPE,
  attributes: { app: str('encrypted-entities-sample') }, // Public and queryable.
  expires: ExpirationTime.fromSeconds(86400),
});
const entity = await publicClient.getEntity(created.entityKey);
if (entity.contentType !== CONTENT_TYPE || !entity.payload) throw new Error('Unexpected entity format');
const result = await decryptPayload(key, entity.payload);
console.log(new TextDecoder().decode(result));
```

Expected recovered text: `Non-sensitive integration test`. Entity and transaction keys vary. Check your RPC's chain ID before writing, recheck the wallet's account/network before signing, and wait for the SDK's confirmed result. Do not automatically retry an uncertain write: it may already be on-chain. See the sample for these guards and gas estimation.

Tiramisu chain ID is **7738577**. The SDK's `tiramisu` export supplies the network configuration. Writes need a wallet with test GLM from the [Hub faucet](https://hub.arkiv.network/faucet). Reads and local crypto do not need a wallet. The public RPC can be used without an access key; provider limits can apply. If your integration requires a higher allowance, obtain an [access key](https://hub.arkiv.network/access-keys) and follow the provider's restrictions. Never embed a server-only key in browser code. No credentials are shipped.

## Privacy and key custody

- **Only the payload is encrypted.** Attributes, owner/creator addresses, entity key, content type, expiration, transactions and payload length remain public. In this unpadded format the exact plaintext byte length is envelope length minus 28. Query public attributes, not encrypted plaintext.
- Format: **12-byte random IV || ciphertext || 16-byte authentication tag**, AES-256-GCM with a 128-bit tag. There is no compression and no extra authenticated data. Format version is identified by `CONTENT_TYPE`, not an embedded header. Existing cookbook envelopes use the same byte order; compressed cookbook content still needs its separate decompression step.
- Authentication detects modified encrypted bytes or a wrong key. It **does not bind the payload to an entity key, wallet, network or public attributes**, and does not establish authorship. A valid envelope can be copied to another entity. If the application needs trusted authorship, verify an independently trusted entity/owner in its read policy.
- Connecting or signing with MetaMask/Rabby does **not** derive or recover the encryption key. Generate an independent key and keep it in a password manager or another approved secret store. Do not use a wallet private key, seed phrase, password, transaction signature or login signature as this key.
- The sample holds keys and plaintext in page memory only; a reload loses them unless you made a private backup. The non-extractable CryptoKey does not erase the original hex string from application memory. JavaScript cannot guarantee memory erasure.
- Anyone with the encryption key and ciphertext can decrypt. There is no key escrow, account recovery, sharing protocol, access revocation or automatic rotation. Losing the key loses access. A compromised key exposes previously published ciphertext.
- Entity Expiration removes active availability; it is **not erasure** of transaction history or other copies. Do not test with personal or production secrets. This package is not an independently audited privacy system, and does not protect against an XSS-compromised application, malicious extensions, devices or recipients.

## Errors and recovery

| Code / condition | Resolution |
| --- | --- |
| `INVALID_KEY` | Supply the original 64-character hex encryption key, without `0x`, whitespace or password text; or generate a key for new data. A new key cannot open old data. |
| `DECRYPTION_FAILED` | Verify the original key and ciphertext source. Wrong key and modified ciphertext intentionally have the same failure; no plaintext is returned. |
| `INVALID_ENVELOPE` | Retrieve the complete v1 binary payload, not its JSON/hex representation. Verify the content type. |
| `INVALID_INPUT` | Use text or Uint8Array, within 100,000 UTF-8 bytes. Large-file chunking is outside this package. |
| `CRYPTO_UNAVAILABLE` | Use Node 22+ or a modern browser on HTTPS/localhost. |
| Wallet absent/rejected | Install/unlock MetaMask or Rabby and approve the intended testnet request, or read without a wallet. |
| Wrong network / insufficient funds | Use Tiramisu in both wallet and RPC; obtain test GLM from the faucet. |
| Missing/expired entity | Check entity key and network. An expired entity may no longer be retrievable through the active API. |
| RPC failure/rate limit | Retry a **read** later or use an authorized provider endpoint. Never infer write failure from a timeout or automatically resubmit. |

## Source development

```sh
git clone https://github.com/SantiagoDevRel/arkiv-encrypted-entities.git
cd arkiv-encrypted-entities
npm ci
npm test
npm run typecheck
npm pack --dry-run
```

The sample has its own install and lockfile; see its README. Crypto interoperability tests use Node's independent `createCipheriv`/`createDecipheriv` implementation against the package's WebCrypto output in both directions. Exact release evidence, browser widths and network outcomes belong in [docs/verification.md](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/feat/encrypted-entities/docs/verification.md), not in implied support claims.
