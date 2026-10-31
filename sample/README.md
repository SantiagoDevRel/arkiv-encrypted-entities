# Encrypted notes sample — Rabdi candidate

Create an encrypted note, then compare the same public ciphertext with and without a locally entered encryption key. The UI uses the existing Arkiv layout and English copy. This is a testnet demonstration, not an independently audited privacy system.

**Candidate status:** SDK **1.0.0**, viem **2.56.3**, TypeScript **5.9.3**, Vite **8.2.2**. The first-turn preview consumes the exact published **arkiv-encryption@0.1.0**; its AES-GCM format matches the 1.0.0 candidate. The new package is tested separately as a packed tarball. No npm 1.0.0 publication or production migration is claimed. See [verification](../docs/rabdi-verification.md).

Read the [package README](../README.md), [sample AGENTS](AGENTS.md) and [package AGENTS](../AGENTS.md) before integration.

## Configure and run

Node.js 22.12+ and npm are required. On restricted Windows PowerShell use `npm.cmd`; do not change execution policy.

```sh
cd sample
npm ci
npm ls arkiv-encryption @arkiv-network/sdk viem
npm test
npm run typecheck
npm run lint
npm run build
```

The application has a server endpoint, `api/rpc.js`, and a prebuilt Vite frontend. Configure **ARKIV_ACCESS_KEY** on the server using a free [Hub access key](https://hub.arkiv.network/access-keys). Hosted sample reads use Key B, server-side only. Never use `VITE_*` or `NEXT_PUBLIC_*` for this key. Missing configuration returns a helpful 503. `rabdi({ accessKey })` requires an explicit string; handle `MissingAccessKeyError` rather than falling back to anonymous access.

For local full-stack preview, use the existing Vercel project with its server environment and `vercel dev`. Standalone `npm run dev` (loopback port 3078) serves the UI only and cannot execute `/api/rpc`; it needs a separately configured compatible server endpoint. In this managed workspace, servers must be started/stopped with the shared local-server tool. Dependencies and heavy checks run on the DGX.

Deploy only the `.vercelignore` allowlist: built `dist`, `api`, package manifests and `vercel.json`. The existing project is **arkiv-encryption**. During candidate review deploy a **preview** only. Server credentials are never written into the upload directory. The CSP permits only same-origin app scripts/network requests and the established Google font origins.

## Create a note

1. Configure **Rabdi, chain 7794095**, in your wallet with your own authorized RPC from the access-key page. The sample never adds the server's URL or key to a wallet. Click **Connect wallet**; the sample switches to an existing Rabdi network and verifies account/network. Rabby is preferred if both Rabby and MetaMask are installed.
2. Obtain test GLM from the [faucet](https://hub.arkiv.network/faucet). Keep the displayed account under the header in view.
3. Use a non-sensitive note. Generate an independent key; reveal it only to save a private backup. A wallet private key, seed phrase, password or signature is not an encryption key. Confirm the backup checkbox.
4. Click **Encrypt & store**. The browser encrypts first, then the SDK constructs a schema-based create. The wallet transport estimates the exact unsigned calldata at `latest`, sets `gas = max(1,000,000, 2 * estimate)` plus explicit `gasPrice` and latest nonce, and rechecks the session. It rejects gas above half the head block limit. No estimate means no send.
5. Approve the intended wallet request. Keep the returned entity identifier and independent key privately. On confirmed success the inspection fields are filled unless the wallet session changed.

Entity Expiration is approximately one day; Rabdi's maximum is 7,884,000 blocks (roughly 182 nominal days). Unlimited lifetime is unsupported. Longer availability needs **Lifetime Extension**. Expiration does not erase history or copies.

The default note has 57 UTF-8 bytes and an 85-byte envelope. Every encryption uses a fresh random IV. Empty notes and up to 100,000 plaintext bytes are supported; the final gas preflight can reject a note that exceeds the current safe transaction budget.

## Compare queries

Both buttons call `getEntity(id, Notes)` through the same `/api/rpc` route without sending an encryption key. The public query never reads/validates the key. The keyed query fetches first, then authenticates/decrypts locally. A missing, malformed or wrong key retains retrieved ciphertext and clears old plaintext. Recovered text is rendered with `textContent`.

The single **Network response** panel shows decoded typed SDK fields. Equal snapshots are labelled shared; otherwise the latest successful query is identified. Changing entity/account/network clears both results; editing the inspection key clears its result. Late responses cannot restore stale plaintext or cleared keys.

| Column | Public visibility / filtering |
| --- | --- |
| `arkiv.schema` | Named schema tag, indexed, public. |
| `app` | Fixed `encrypted-entities-sample`, indexed, public. |
| `seed` | Optional non-sensitive reseed marker, indexed, public. |
| `contentType` | Public stored string identifying the v1 envelope. |
| `ciphertext` | Complete public `bytes()` value; encrypted note content, not filterable. |

Addresses, identifiers, creation/update/expiration blocks and transactions remain public. Envelope length reveals exact plaintext byte length minus 28 bytes of overhead. A successful decryption does not authenticate the owner, network, schema or other columns. Applications requiring trusted authorship must independently check their expected entity/owner.

Public links accept `?entity=0x...` only. Never include keys in URLs. The entity and transaction links open the [Rabdi explorer](https://rabdi.explorer.arkiv.network); network bytes are displayed directly by the app regardless of what the explorer summarizes.

## Failure and confirmation handling

- Missing wallet/rejected connection: explain the problem; reading remains available. Unknown wallet network: configure Rabdi with your own access key, then reconnect.
- State reads use `latest`. Rabdi rejects `safe`, `finalized` and historical state with “arkiv serves state at the chain head only”.
- Each distinct note/key/account combination keeps one operation state in page memory across clicks. `sending` is set before network calls; re-entry is blocked. SDK success stores `submitted(hash)` before an independent receipt lookup. Null/timeout/disagreeing receipts show a typed outcome and hash without resending.
- An uncertain SDK failure blocks that operation. One retry is allowed only when the SDK reports a confirmed revert and an authoritative receipt shows `gasUsed == sent gas`. Retry gas is at least twice the previous gas and twice a fresh estimate, still below half the head limit. Other reverts stop after one send; at most two sends are possible.
- A reload clears operation memory too. Check wallet/explorer activity before starting another operation after a reload. Do not use reload as a retry instruction.
- Wrong/missing key and altered bytes fail authentication; no stale plaintext is shown. Missing/expired entity, server-key configuration failure or RPC failure clear the affected result. Reads may be retried.

Keys and plaintext stay in page memory only, with no browser storage, URLs, analytics or logs. JavaScript cannot guarantee memory erasure. Browser extensions, XSS or a compromised device can read page memory. Keep keys in an approved private backup; the app provides no escrow, recovery, sharing or revocation.

## Idempotent sample data

From the repository root, after `npm ci` and `npm run build`, run:

```sh
node --experimental-strip-types scripts/seed-rabdi.mjs
```

Inject `ARKIV_ACCESS_KEY_A`, `TEST_ENCRYPTION_ADDRESS`, `TEST_ENCRYPTION_PRIVATE_KEY` and the separate `ENCRYPTION_SEED_KEY` through the approved secret runner, never command-line values. The seed queries its indexed marker scoped to its expected owner, verifies actual bytes and authentication failures, and creates only if absent. A second run verifies the existing entity with zero writes. The private local journal blocks ambiguous resends; an expired seed or demonstrable chain reset may be recreated after a previously confirmed write. Never remove an uncertain journal to force a retry.

## Verification scope

Tests distinguish simulated provider/receipt behavior from live Rabdi transactions. Required operation tests cover non-gas revert, one gas-exhaustion retry, SDK success followed by a disagreeing receipt, success then null receipt then a new click, and uncertain errors. Gas tests cover small and 100,000-byte-class estimates, latest-state reads and the head cap. Registry tests reject local aliases/links.

The established design is retained: official white logo and its [provenance](public/brand/provenance.json), Space Grotesk titles, IBM Plex Mono controls/body, existing dark Arkiv colors and two create/inspect sections. Verify 390/768/1440px, empty/loading/error/success, 200% zoom, full labels, key visibility controls, font loading and horizontal overflow. Release evidence lists the checks actually executed and any missing real browser-wallet signing.
