# Rabdi / SDK 1.0.0 release verification

`arkiv-encryption@1.0.0` is published on npm. The registry artifact exactly matches the approved tarball, SHA-256 `c52b55c870fa2724eaf7b42490cbf4cb31d21553c7913169f1f9437bcf1a81e1`, npm shasum `7267353971486907708037f3609cdaf7a28f2128`. Integrity: `sha512-oA2EOyeNKwd//rExITO6u4iS7nu8E8xw/Mn58YY80R4YAzgydivpn4+jDCO4B2kwAltrEKSurXVzZwLm4LcJdg==`.

The sample now pins exact registry 1.0.0. Post-publication checks use `node scripts/verify-package.mjs --registry` for a new registry consumer and the full library/sample checks from committed source. Production verification and rollback deployment identifiers are recorded in the [v1.0.0 release](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/releases/tag/v1.0.0) after deployment. The reviewed tarball is immutable; its packaged candidate wording is preserved byte for byte, while current installation instructions live in the versioned source guides.

## Historical first-turn candidate evidence

This is the review candidate for **arkiv-encryption@1.0.0**, not an npm publication or production migration. The sample uses exact registry **arkiv-encryption@0.1.0**, whose AES-GCM envelope is compatible, with SDK **1.0.0**, viem **2.56.3**, TypeScript **5.9.3** and Vite **8.2.2**. After publication is approved, its crypto dependency and lockfile must be pinned to registry 1.0.0 and checked again.

Base: `ae77a30`, which contains the published 0.1.0 source plus newer sample work. Branch: `rabdi/sdk-1.0-20261030`. Existing checkout changes were excluded. [Historical evidence](verification.md) is retained separately and does not certify this candidate.

## Committed-source checks

The application source at `060484d1bf4968e0edffc5c010e046251cf77d57` was verified on DGX ARM64. Its Git tree `3c0848a474e370be794008d7108cef48e744c7d9` exactly matched the remote build snapshot. `git diff --exit-code` passed before and after the checks. Later documentation commits do not change the deployed application code.

| Check | Executed result |
| --- | --- |
| Library build, typecheck, lint | Passed; lint uses TypeScript unused-symbol checks, not a separate style linter. |
| Crypto tests | 8 passed: empty, Unicode, binary, maximum input, native Node interoperability, wrong keys, modified IV/content/tag and malformed input. |
| Sample tests | 25 passed: exact registry provenance, proxy restrictions, wallet/network/gas checks and persistent operation behavior. |
| Sample build, typecheck, lint | Passed. |
| Packed consumer | Installed candidate tarball in an empty consumer, checked version 1.0.0, known bytes, wrong-key/tampering failures, strict TypeScript imports and packaged README/AGENTS/CLAUDE. |
| Restricted deployment upload | Reproduced the initial unwanted build fallback, verified explicit empty build command, prebuilt frontend and resolvable server API dependencies. |

Reproducible commands are `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm pack`, `node scripts/verify-package.mjs`, then the equivalent sample checks and `node scripts/verify-preview.mjs`. The consumer/upload scripts use the managed job's `TMPDIR`.

The five frozen operation cases are covered in `sample/test/transaction.test.mjs`: non-gas revert sends once; a confirmed gas-exhaustion revert sends exactly twice; SDK success followed by a disagreeing receipt sends once; success followed by null receipt and a new click sends once; uncertain error sends once. Re-entry, concurrent clicks and equivalent hexadecimal casing are also covered. Provider simulations do not establish real browser-wallet signing.

The crypto library has no network-write API. The integration's gas preflight is in `sample/src/wallet.ts:62`; persistent send/receipt handling starts at `sample/src/transaction.ts:30`. It uses an unsigned latest estimate, at least twice the estimate and a 1,000,000 floor, explicit gasPrice/latest nonce and a half-block cap. Transaction replacement scans are disabled; replacing a transaction in a wallet requires manual reconciliation.

## Live Rabdi evidence

Only the authorized ENCRYPTION test wallet signed; the funder was not used. The independent test encryption key is privately backed up through the approved secret store and never appears in source, URLs, logs or this report.

- [Transaction](https://rabdi.explorer.arkiv.network/tx/0xb06cd893c313371f58ae53b293b075da8404a4a2f3d8b8c004c62c015e7e82e2): SUCCESS, block **16095**, gas used **373273**, explicit gas limit **1000000**.
- [Entity](https://rabdi.explorer.arkiv.network/entity/0xf6882ce5a5f915ac370a8f41848a7ba588f7be19833166b3b8e6f81f30d33451): schema `arkiv-encryption-v1`, **85 ciphertext bytes**, public `app`, optional indexed `seed`, content type and metadata. Both explorer destinations were opened and their actual content verified.
- Actual write, query, ciphertext retrieval and local decryption recovered the original 57 UTF-8 bytes exactly. Wrong-key and locally altered retrieved ciphertext both returned `DECRYPTION_FAILED`.
- Entity Expiration **7900065** gives a **7,883,970-block** lifetime from the creation block, within Rabdi's 7,884,000-block maximum. This is bounded availability, not erasure or an unlimited lifetime.
- First seed: **one write**, two `arkiv_query` calls. Immediate repeat: **zero writes**, one query, the same entity and successful verification. Rough query totals: Key A **3**, Key B **0**; browser `arkiv_getEntity` reads are not `arkiv_query` calls. The rejected proxy query probe is not forwarded.

`scripts/seed-rabdi.mjs` scopes the indexed marker query to the expected owner and keeps a local operation journal to block ambiguous resends. Run `node --experimental-strip-types scripts/seed-rabdi.mjs` from the root with approved secret injection. The private handoff provides the exact managed-environment command.

## Hydrated preview

[Open the verified candidate with its public entity ID](https://arkiv-encryption-m6vnnwtr6-santiago-hobby.vercel.app/?entity=0xf6882ce5a5f915ac370a8f41848a7ba588f7be19833166b3b8e6f81f30d33451). Deployment: `dpl_B3bnEXMyTujKqvmnfsw6YZ27YYEi`; existing project `arkiv-encryption`. Vercel Authentication protection is preserved. No production alias was changed.

Verified in dedicated **Chrome 156.0.8078.76**, through the actual server endpoint and Rabdi:

- 390/768/1440px, screenshots visually inspected, no global horizontal overflow; established font families and role sizes verified with computed styles and loaded-font checks.
- Empty/loading/result states; real public ciphertext and correct-key local decryption; identical public entity request parameters for both query modes.
- Wrong/malformed/missing keys retain fetched ciphertext and clear plaintext. Real missing entity and simulated transport failure clear affected results.
- Key eye control by keyboard and mouse, disclosures and 200% CSS zoom. Native browser-menu zoom, other browser engines and mobile wallets remain unverified.
- Captured application RPC requests contained neither the encryption key nor plaintext and made no write calls. No uncaught browser exceptions.
- Actual deployed RPC reports chain `0x76edaf`, confirms the successful receipt, rejects raw-transaction and arbitrary-query probes with 400, and returns `Cache-Control: no-store, max-age=0`.
- Environment, wallet/key files, Git, source and package paths returned 404. `/api/rpc.js` executes the endpoint and returns JSON 405 for GET; it does not disclose source.

The server has Key B only in preview `ARKIV_ACCESS_KEY`. The browser receives no server provider credential. Visitors configure their own authorized Rabdi RPC in the wallet. A failed first preview and an intermediate preview created in this task were retired after the final preview passed; their URLs returned 404.

## Failed checks preserved and corrected

Initial DGX failures caught an unsupported TypeScript parameter property in Node's strip-only mode and calls to viem actions absent from the SDK client's method surface. Explicit fields and public `viem/actions` calls corrected these. The required acceptance scenarios were preserved.

The first Vercel upload failed because `buildCommand: null` allowed fallback to `npm run build` in a deliberately prebuilt upload without TypeScript source/config. `scripts/verify-preview.mjs` reproduces that failure; an explicit empty build command fixes it. No source allowlist, secret rule or acceptance gate was relaxed. The narrow change-guard exception documents the existing Vite HTML sample; no framework conversion or additional dependency was introduced.

## Release boundary and improvements

A separate review must approve npm publication, merge, tag/release and production promotion. None occurred in this turn. A real locally signed Rabdi transaction is verified; actual browser-extension signing on this candidate remains unverified and is not inferred from simulated providers.

- **Nonblocking:** local Vite alone does not execute the server endpoint; use a full-stack environment as documented.
- **Nonblocking:** an unknown wallet network requires the visitor's own Rabdi RPC configuration to keep the server key private.
- **Nonblocking:** operation guards last for the page session; after reload, reconcile wallet/explorer activity before a new operation. No secret or plaintext is persisted.
