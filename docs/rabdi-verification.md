# Rabdi / SDK 1.0.0 candidate verification

This is the first-turn release candidate for `arkiv-encryption@1.0.0`. It is not an npm publication or a production migration. The sample keeps the exact published compatible crypto release `0.1.0` while using SDK `1.0.0` and Rabdi `7794095`.

Base: `ae77a30`, newer than the published 0.1.0 source. Work is isolated on `rabdi/sdk-1.0-20261030`; existing checkout changes are excluded. Historical 0.1.0 evidence remains in [verification.md](verification.md) and does not certify this migration.

## Acceptance checks

Release evidence is being collected before the review PR: committed-source DGX ARM64 build, strict typecheck, unused-symbol checks, unit tests, packed clean consumer with TypeScript, actual authorized-wallet Rabdi write/read/decrypt, wrong-key/tampering rejection, zero-write reseed rerun and a hydrated preview.

The sample's operation tests freeze the required five scenarios: non-gas revert (one send), gas exhaustion (two sends), SDK success followed by a disagreeing receipt (one send), success then null receipt and another click (one send), uncertain failure (one send). Wallet tests separately verify latest-state estimation, twofold gas headroom, price/nonce and the head gas cap. Provider simulations are not real browser-wallet signing evidence.

The library exports pure crypto only: it makes no writes. Gas handling belongs to the sample's SDK integration. Runtime crypto does not import the optional SDK peer.

## Scope and remaining release actions

No npm publication, merge, tag, GitHub release, production deploy or production alias change is permitted in this turn. The separate reviewer must approve the candidate before those actions. After publication, update the sample's exact registry crypto pin and lockfile to 1.0.0, then run the registry and full-stack checks again.

Actual browser-wallet signing, mobile wallets and browser engines other than the tested dedicated Chrome are not certified by mocked providers or a locally signed live test.

## Improvements observed

- Nonblocking: local Vite alone does not execute the server read endpoint. The guide explicitly requires a full-stack server environment.
- Nonblocking: unknown wallet networks require the visitor's own Rabdi configuration; adding the server's provider URL would disclose its key.
- Nonblocking: operation protection lasts for the current page session. After reload, users must reconcile wallet/explorer activity before starting another operation; no secret or plaintext is persisted.
