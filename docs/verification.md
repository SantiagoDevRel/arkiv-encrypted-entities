# Verification: 0.1.0

## Renamed release — 2026-09-09

The current release is published as [arkiv-encryption@0.1.0](https://www.npmjs.com/package/arkiv-encryption/v/0.1.0). The [public sample](https://arkiv-encryption.vercel.app) consumes that exact registry version. The earlier sections below are historical evidence for **arkiv-encrypted-entities@0.1.0**, the previous package name.

The public API, AES-256-GCM implementation, content type and envelope format are unchanged. Existing encrypted entities remain readable with their original independent encryption key. The sample retains its public `app` attribute value for compatibility. Its imports, npm link and displayed package name now use arkiv-encryption. The repository URL remains unchanged.

Executed release checks: Node 22.22.3, TypeScript 5.9.3, eight crypto tests and typecheck passed. A fresh agent with only the consumer guides installed the package from the public npm registry, compiled the README example with strict TypeScript and recovered `Hello Arkiv` from its 39-byte envelope. Wrong-key and tampered-ciphertext probes returned `DECRYPTION_FAILED` without plaintext. Installed JavaScript, declarations and packaged consumer guides matched the reviewed release files. The agent completed integration without project source or chat context.

| Release evidence | Result |
| --- | --- |
| npm tarball | `https://registry.npmjs.org/arkiv-encryption/-/arkiv-encryption-0.1.0.tgz` |
| npm SHA-1 | `885af2f2b8518c078ff19eac2b44d69901842f55` |
| Runtime implementation SHA-256 | `e762813e6f0b2e765d5e798af076a757cffcbdcc28d6eff1420be7559f320a82` |
| Package contents | Seven files: package metadata, JavaScript, declarations, README, AGENTS, CLAUDE and license; no runtime dependencies |
| Clean sample | Registry installation, all 15 tests and production build passed; SDK 0.8.0, viem 2.56.3, Vite 8.2.2 |
| Independent reviews | Muse, Grok 4.6 and Claude each returned GO with no blocking findings after code inspection and independent probes. Reviewer observations led to pinned source links, explicit tested TypeScript version, native Web Crypto error guidance and per-key invocation guidance. These reviews are not a formal cryptographic audit or a guarantee of absolute security. |
| Public deployment | Vercel deployment `dpl_2xLGMwTVu4fFguh5XEvsnG9EwWtK`, aliased to `arkiv-encryption.vercel.app`; deployed HTML, JavaScript, CSS and logo matched the clean registry build byte for byte |
| HTTP checks | Framing prevention, MIME-sniffing prevention and no-referrer headers verified; tested environment, key, package, source, Git and PEM paths returned 404 |

On the deployed sample, real Tiramisu reads of the previously authorized 85-byte entity below recovered the exact English note. Both query modes sent identical public query parameters; neither the encryption key nor plaintext appeared in outgoing requests. Changing one hexadecimal key character, entering a malformed key or leaving it empty preserved the real ciphertext and cleared plaintext. Controlled RPC failures and differing response snapshots also passed. All disclosures were opened at 390/599/601/768/899/901/1440px with no page overflow; final deployed screenshots were inspected at 390/768/1440px. No new transaction was sent for the rename. The earlier real Rabby transaction is the write evidence; a real MetaMask signature, mobile-wallet flow, other browser engines and native browser-menu zoom remain unverified.

The sample uses the unmodified official white Arkiv SVG, checked against the canonical logo pack SHA-256; provenance is in `sample/public/brand/provenance.json`. The existing five Arkiv palette tokens are retained. The developer waived external brand approval. Vercel publication is explicitly authorized, with no deletion of existing resources; the deployment allowlist includes only the built `dist` and `vercel.json`.

## Historical evidence — previous package name

**arkiv-encrypted-entities 0.1.0 was published. At the time of the following checks, the sample was local and awaiting deployment review.**

Executed on 2026-09-08: Node 22.22.3, TypeScript 5.9.3, eight crypto tests including native Node interoperability in both directions, wrong/missing keys, tampered IV/ciphertext/tag, Unicode, binary, empty and maximum-size plaintext. Build passed.

## English comparison UI revision — 2026-09-08

The developer requested a revised English sample, visible key controls, fixed Tiramisu, clearer explorer/payload explanations and comparison queries. A real [Claude Design reference](https://claude.ai/design/p/e998f7d1-d811-4738-912c-4ae3d5531096) was generated with the selected Arkiv Design System and inspected before adapting its create/inspect layout. The sample retains the existing SDK/wallet transport and published npm `0.1.0`; the package API and ciphertext format did not change.

- **Checks:** production build and 15 sample tests passed, including registry provenance and automatic Tiramisu switch/add/rejection. No new dependencies were introduced.
- **Real reads:** a browser without a wallet queried a real Tiramisu entity both ways. Captured `arkiv_query` parameters were equal. Both panels displayed identical ciphertext and public typed attributes; keyed recovery matched the stored text. Captured POSTs contained neither the encryption key nor plaintext. The public query worked with empty and malformed key fields. A well-formed wrong key fetched public ciphertext, failed authentication and displayed no stale plaintext.
- **UI:** screenshots and geometry at 390/599/601/768/899/901/1440px; empty, loading, error and result states, dark mode, loaded fonts and 200% CSS zoom stress check. No page overflow. Mouse and keyboard toggled both eye controls. An isolated injected-wallet test changed the session during retrieval: both keys were cleared and masked, and late plaintext was not rendered. Wallet behavior in that race test was simulated; reads still used the real RPC. Actual browser-menu zoom and other browser engines were not separately tested.
- **Explorer:** the real entity route showed content type, payload byte count and operation history. The UI therefore describes it as a summary and shows full payload bytes itself, separately from attributes. Entity and transaction links are distinct.

The revised flow also performed one authorized real write through Rabby / Arkiv Wallet, only on Tiramisu:

| Evidence | Value |
| --- | --- |
| Transaction | `0xea5b31b57e13cce0f8f8be0d7addbcbec91c2a439da5bee7ae3c9b649c732290` |
| Entity | `0x600bfc33e352452f375a559ad55afa79ebf863a40c645a65a04fad540f227d61` |
| Result | Success, block 199478, gas used 86,904 |
| Payload | 85 bytes; the default English note is 57 UTF-8 bytes |
| Attributes | Only `app`, containing `encrypted-entities-sample` |
| End-to-end | Read-key autofill, identical public/keyed ciphertext, exact original English message and byte-for-byte UI success |

[Transaction in explorer](https://indexer.tiramisu.db-chain.testnet.arkiv.network/tx/0xea5b31b57e13cce0f8f8be0d7addbcbec91c2a439da5bee7ae3c9b649c732290). The generated encryption key was privately backed up outside source control; it is not a wallet key. No additional network or account was authorized or used. The sample remains local; no deployment occurred.

### Final clarity review and clean consumer

Claude reviewed the revised source and initial rendered screenshots, then rechecked the final source/build and cleared its blockers. Its CSP finding was reproduced: Vite's JavaScript CSS import was blocked during development. Loading the stylesheet through an external HTML link fixed development without weakening the production CSP. Claude did not rerun the browser/test evidence; those checks were executed by the primary agent.

Grok 4.6 via the native Grok Build lane reviewed source copy only. Its feedback led to one consistent **Encryption key** label, removal of repeated query headings, matching **Message** labels, and a clearly public Entity ID receipt. The Cursor Grok attempt failed for exhausted quota and is not counted as a review. Secondary explanation now uses native disclosures; critical custody stays inline. The final English screenshots were regenerated using the 85-byte entity above and inspected at small/medium/large widths.

A new isolated consumer copied only the current tracked sample source, with no parent package or node_modules. Following the README, `npm ci`, `npm ls`, all 15 tests and the production build passed. Registry-installed versions were encryption package 0.1.0, SDK 0.8.0 and viem 2.56.3. The documented dev command ran on an alternate free loopback port for parallel verification; real public/keyed reads recovered the exact English note, CSS applied, no CSP violations occurred, and disclosures worked with keyboard and a mobile-size click. Both real explorer routes were rendered and matched the current entity/transaction; the entity overview displayed 85 B, content type and history, not the full ciphertext bytes.

No additional writes were needed for the final copy changes. A real MetaMask signature, mobile wallet, other browser engines and actual browser-menu zoom remain unverified; the real signer was Rabby and zoom stress used CSS at 200%.

### Message-first comparison follow-up

The follow-up UI highlights Connect wallet in Arkiv Orange and removes the two requested explanatory messages. Its main comparison now puts the full encrypted message opposite the recovered plaintext in aligned 16px result boxes; network metadata lives in keyboard-accessible disclosures. The network request remains identical in both modes and the plaintext remains local.

Claude rechecked the changed source and desktop comparison screenshot with no blocking findings. Its accessibility note was resolved: a short, visually hidden **Stored.** status preserves the success announcement for assistive technology while the visible receipt confirms the write. Actual screen-reader announcement was not tested.

Build and all 15 sample tests passed again. Real reads of the 85-byte Tiramisu entity recovered the original English note. Browser assertions verified aligned desktop result boxes, orange connection control, collapsed/open network details with matching ciphertext, wrong-key placeholder and cleared plaintext, missing/invalid keys, loading, RPC failure, wrong chain and session-change invalidation. Screenshots were inspected at 390/768/1440px and around the existing breakpoints (599/601, 899/901px), plus CSS zoom stress at 200%. No new transaction or deployment was required. The four requested changes also passed an independent source-only coverage check.

### Invalid-key ciphertext and shared network response

After inspecting the developer's screenshot with all disclosures open, the duplicate response panels were replaced by one full-width decoded SDK response. Equal snapshots share it; differing snapshots are labelled and the latest successful fetch is displayed. Clearing that fetch falls back to the remaining result, or clears the shared panel if neither remains.

Key import/validation now happens after the public entity fetch. Exactly one altered hex character, one non-hex character and an empty key were each tested against the real 85-byte Tiramisu entity: the right-hand box kept the original ciphertext, displayed a local-decryption error and never retained earlier plaintext. Captured query parameters matched and outgoing requests contained no key or plaintext. Controlled changed-owner responses verified unequal-snapshot attribution, and controlled RPC failures verified clearing. The wallet-session race probe also passed after the change.

Claude independently reviewed the changed source, race guards and wrong-character screenshot and cleared the revision without blocking findings. Runtime tests above were performed by the primary agent.

Build and all 15 sample tests passed. All disclosures were opened at 390/599/601/768/899/901/1440px, with no horizontal page overflow and equal desktop panel heights. Full-page and comparison screenshots were inspected at small/medium/large widths. The published package and signing flow are unchanged; no new transaction or deployment was performed.

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

## Initial real network evidence

Two small test-note entities were created by the authorized wallet. No wallet key was extracted. The independent encryption key was generated locally and kept outside the repository. No plaintext or encryption key was placed in entity attributes or transaction data.

| Trial | Transaction | Entity | Block / outcome |
| --- | --- | --- | --- |
| Initial integration | `0xb453923723b4f3944f54fbdc1de1b52bd40f51fdcdf33d62800b4a14e7f158ae` | `0x86d0ad8f07f7861ff7e2c3c30d360c7fc9f6489efe8470305b94fdb8db3ad0f4` | 197482; confirmed, but wallet receipt reads stalled in the UI |
| After receipt-routing fix | `0xe2c0a872a1be180072d2a1730875f5f8bc8cf11302a1a866b494855e84e26180` | `0xe85d62326f3e78e3d6b828506f653761daaa0eafc093ad7eb988d9e08b4117b3` | 197750; confirmed and reported in UI |

[Second transaction](https://indexer.tiramisu.db-chain.testnet.arkiv.network/tx/0xe2c0a872a1be180072d2a1730875f5f8bc8cf11302a1a866b494855e84e26180). Both receipts report success and 86,664 gas used. The payload is 70 bytes, content type `application/vnd.arkiv.encrypted.v1`, and the only application attribute is `app`. Direct SDK retrieval and browser DOM recovered the exact UTF-8 bytes of the sample note. Wrong-key decryption rejected. A separate browser context retrieved the first entity without a wallet.

The fix keeps signing/session checks in Rabby and routes SDK reads, including receipts, through the explicit timeout-bounded RPC. Eleven wallet tests cover this separation, gas buffering, wallet rejection, mismatched accounts/networks and unexpected transaction targets/value. Those eleven tests use mocks, not live wallet signatures.

## Initial browser verification

Inspected actual screenshots at **390, 768 and 1440px**, with geometry probes also at **599/601px** around the 600px breakpoint. Dark mode; 200% zoom checked. No global horizontal overflow. Computed family/size/weight/line-height match the sample README, and Space Grotesk/IBM Plex Mono loaded successfully.

Checked disconnected/empty state, absent wallet, disconnected write, malformed entity identifier, missing encryption key, generation and reveal/mask controls, unsafe RPC URL, successful read and long identifiers, wrong key with cleared prior plaintext, loading with disabled controls, RPC failure, wrong RPC network and empty localStorage/sessionStorage. Result, wrong-key and loading screenshots were inspected. Controlled RPC responses were used for repeatable failures/loading after one real ciphertext retrieval. No claim of real network failure simulation is made.

No production demo, mobile wallet interaction, Safari/Firefox, or actual expiration after 24 hours was tested. Expiry behavior is documented as a limitation, not erasure.

## Independent checks

A fresh agent used only consumer README/AGENTS, created a separate TypeScript project, and verified the exact `Hello Arkiv` / 39-byte example, wrong key and tampering. Its initial registry install returned E404; the fallback tarball test was explicitly local. The documentation now includes the TypeScript compile command and typed error example that the agent requested.

The same independent agent then started a new registry-only consumer with no repository imports or tarball fallback. Installation of published `0.1.0`, strict TypeScript 5.9.3 compilation, the exact published README example, wrong-key and tampering assertions all passed. It verified the registry integrity below and the installed AGENTS/CLAUDE files. No blocking documentation gap remained for local encryption. Wallet and network verification were explicitly outside that agent's check.

The final coverage check caught a development `file:..` reference in the sample that an earlier `npm install --prefix` invocation had retained. Passing a build with the parent package present had not proved independent sample consumption. The manifest now pins `0.1.0`; its lockfile was regenerated in an empty directory and resolves only registry packages. A new sample test rejects local lock paths, linked packages, manifest/lock disagreement and a symlinked installed encryption package. Together with the eleven wallet tests, all twelve sample tests and production build pass after `npm ci`. PowerShell with restricted script execution used the equivalent `npm.cmd` launcher.

The published package's installed JavaScript and the crypto code used in the real writes have the same SHA-256: `e762813e6f0b2e765d5e798af076a757cffcbdcc28d6eff1420be7559f320a82`. After correcting sample provenance, its production build repeated real anonymous retrieval and wrong-key checks, and the shared browser recovered the second entity successfully. No additional write was needed to verify identical ciphertext compatibility.

A fresh GitHub clone at `81ac7ae` then followed the sample README directly: `cd sample`, `npm ci`, dependency listing, `npm test` (12/12) and `npm run build` all passed. The parent package had neither `node_modules` nor `dist`; an explicit filesystem assertion confirmed this. This final clone demonstrates that sample setup does not depend on a local library build.

Claude reviewed security, API, packaging and frontend/DX independently (`claude-b3070c`, resumed after its initial 900-second timeout). Its final review found no blocking code vulnerability and independently passed the eight crypto and eleven wallet tests. It verified crypto behavior, session guards, receipt routing, real missing-entity handling, typography and secret-free browser storage. Its initial release findings (unpublished package, empty source repository, development tarball reference) were resolved by publication, source push and registry-only consumer verification. Nonblocking inherited CSS was removed and a CSP added. Claude read the final CSP: configurable HTTPS RPCs require broad connection permission, and clickjacking protection would require deployment headers. It did not independently certify our real transactions or npm publication; those have the separate evidence above. Brand alignment remains a pre-deployment step. The cookbook's optional AAD mode is not supported by this package; sharing its byte order alone does not imply AAD interoperability.

## npm provenance

Registry confirmed `0.1.0` on 2026-09-08:

```text
https://registry.npmjs.org/arkiv-encrypted-entities/-/arkiv-encrypted-entities-0.1.0.tgz
sha512-CB+VFMdN75TfYY6MQjL/k1GW7uIGc/3MDkdRYAuPc3wVuMkHIKKMYH2IeAIeKIwr4OlM9MzvaADcw4UHIckgKw==
```

The tarball contains the compiled ESM, TypeScript declarations, README, AGENTS, CLAUDE pointer, license and manifest. No sample signer, credentials or environment files are included. The sample dependency/lockfile target that exact registry release; no local source aliases.

Claude also reviewed the final registry correction and provenance test: no blocking findings. The coverage reviewer rechecked and closed the npm-consumption discrepancy. Neither review is represented as an independent execution of our final browser or network tests.

## Hub and deployment status

The issue #97 catalog entry is prepared in a separate Hub feature worktree based on `develop`, reusing `ToolCatalog` unchanged. **Its planned public sample URL is not deployed or verified yet; no PR or stage integration is claimed.** Local sample review precedes deployment by explicit developer request. The entry must not be submitted until its real demo URL is verified. Production promotion is a separate action.

The Hub candidate passed lint, typecheck, 206 unit tests, production build and four existing Tools Playwright checks. Rendered screenshots were inspected at 390/768/1440px with no global overflow; copying the installation command returned the exact package/version. Authentication was not configured or tested locally; the build's default-auth-secret warning is unrelated to this public catalog entry. The sample's real transaction explorer link was opened and displayed SUCCESS, block 197750 and the matching entity/content type.

Prior art: `arkiv-cookbook/src/lib/arkiv/crypto.ts` (WebCrypto envelope) and `arkiv-graph/apps/example/src/lib/wallet-client.ts` (wallet session guards and gas preflight). Issue #97 did not link a canonical npm encryption package or Pawel sample; GitHub organization and npm discovery did not locate one. No alternative blind index, compression or wallet-derived encryption was added.
