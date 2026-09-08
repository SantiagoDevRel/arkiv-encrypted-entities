# Verification: 0.1.0

**npm 0.1.0 is published. The sample is intentionally local, awaiting the developer's review before deployment.**

Executed on 2026-09-08: Node 22.22.3, TypeScript 5.9.3, eight crypto tests including native Node interoperability in both directions, wrong/missing keys, tampered IV/ciphertext/tag, Unicode, binary, empty and maximum-size plaintext. Build passed.

## Actually tested compatibility

| Component | Version / network |
| --- | --- |
| Package | `arkiv-encrypted-entities@0.1.0`, ESM + declarations |
| Node.js | 22.22.3 on Windows |
| TypeScript | 5.9.3, strict consumer compilation |
| Arkiv SDK | 0.8.0 (sample integration; the package itself has no SDK dependency) |
| viem | 2.56.3 in the sample |
| Vite | 8.2.2 |
| Browser | Chrome 152.0.7977.77; Playwright 1.62.1 |
| Network | Tiramisu testnet, chain ID 7738577 |
| Actual signer | Rabby, the authorized Arkiv Wallet |

Do not infer mainnet, legacy SDK, other browser engines, hardware-wallet or mobile-wallet compatibility. The MetaMask-compatible EIP-1193 path is implemented; a real MetaMask transaction was not performed.

## Real network evidence

Two small test-note entities were created by the authorized wallet. No wallet key was extracted. The independent encryption key was generated locally and kept outside the repository. No plaintext or encryption key was placed in entity attributes or transaction data.

| Trial | Transaction | Entity | Block / outcome |
| --- | --- | --- | --- |
| Initial integration | `0xb453923723b4f3944f54fbdc1de1b52bd40f51fdcdf33d62800b4a14e7f158ae` | `0x86d0ad8f07f7861ff7e2c3c30d360c7fc9f6489efe8470305b94fdb8db3ad0f4` | 197482; confirmed, but wallet receipt reads stalled in the UI |
| After receipt-routing fix | `0xe2c0a872a1be180072d2a1730875f5f8bc8cf11302a1a866b494855e84e26180` | `0xe85d62326f3e78e3d6b828506f653761daaa0eafc093ad7eb988d9e08b4117b3` | 197750; confirmed and reported in UI |

[Second transaction](https://indexer.tiramisu.db-chain.testnet.arkiv.network/tx/0xe2c0a872a1be180072d2a1730875f5f8bc8cf11302a1a866b494855e84e26180). Both receipts report success and 86,664 gas used. The payload is 70 bytes, content type `application/vnd.arkiv.encrypted.v1`, and the only application attribute is `app`. Direct SDK retrieval and browser DOM recovered the exact UTF-8 bytes of the sample note. Wrong-key decryption rejected. A separate browser context retrieved the first entity without a wallet.

The fix keeps signing/session checks in Rabby and routes SDK reads, including receipts, through the explicit timeout-bounded RPC. Eleven wallet tests cover this separation, gas buffering, wallet rejection, mismatched accounts/networks and unexpected transaction targets/value. Those eleven tests use mocks, not live wallet signatures.

## Browser verification

Inspected actual screenshots at **390, 768 and 1440px**, with geometry probes also at **599/601px** around the 600px breakpoint. Dark mode; 200% zoom checked. No global horizontal overflow. Computed family/size/weight/line-height match the sample README, and Space Grotesk/IBM Plex Mono loaded successfully.

Checked disconnected/empty state, absent wallet, disconnected write, malformed entity identifier, missing encryption key, generation and reveal/mask controls, unsafe RPC URL, successful read and long identifiers, wrong key with cleared prior plaintext, loading with disabled controls, RPC failure, wrong RPC network and empty localStorage/sessionStorage. Result, wrong-key and loading screenshots were inspected. Controlled RPC responses were used for repeatable failures/loading after one real ciphertext retrieval. No claim of real network failure simulation is made.

No production demo, mobile wallet interaction, Safari/Firefox, or actual expiration after 24 hours was tested. Expiry behavior is documented as a limitation, not erasure.

## Independent checks

A fresh agent used only consumer README/AGENTS, created a separate TypeScript project, and verified the exact `Hello Arkiv` / 39-byte example, wrong key and tampering. Its initial registry install returned E404; the fallback tarball test was explicitly local. The documentation now includes the TypeScript compile command and typed error example that the agent requested. A second registry-only pass is recorded below once completed.

Claude reviewed security, API, packaging and frontend/DX independently (`claude-b3070c`, resumed after its initial 900-second timeout). It found no blocking code vulnerability. It verified crypto behavior, real missing-entity handling, typography and secret-free browser storage. Its release findings were the then-unpublished package, empty source repository and a development tarball reference; these were treated as release blockers. Nonblocking inherited CSS was removed and a CSP added. The cookbook's optional AAD mode is not supported by this package; sharing its byte order alone does not imply AAD interoperability.

## npm provenance

Registry confirmed `0.1.0` on 2026-09-08:

```text
https://registry.npmjs.org/arkiv-encrypted-entities/-/arkiv-encrypted-entities-0.1.0.tgz
sha512-CB+VFMdN75TfYY6MQjL/k1GW7uIGc/3MDkdRYAuPc3wVuMkHIKKMYH2IeAIeKIwr4OlM9MzvaADcw4UHIckgKw==
```

The tarball contains the compiled ESM, TypeScript declarations, README, AGENTS, CLAUDE pointer, license and manifest. No sample signer, credentials or environment files are included. The sample dependency/lockfile target that exact registry release; no local source aliases.

## Hub and deployment status

The issue #97 catalog entry is prepared in a separate Hub feature worktree based on `develop`, reusing `ToolCatalog` unchanged. **Its planned public sample URL is not deployed or verified yet; no PR or stage integration is claimed.** Local sample review precedes deployment by explicit developer request. The entry must not be submitted until its real demo URL is verified. Production promotion is a separate action.

Prior art: `arkiv-cookbook/src/lib/arkiv/crypto.ts` (WebCrypto envelope) and `arkiv-graph/apps/example/src/lib/wallet-client.ts` (wallet session guards and gas preflight). Issue #97 did not link a canonical npm encryption package or Pawel sample; GitHub organization and npm discovery did not locate one. No alternative blind index, compression or wallet-derived encryption was added.
