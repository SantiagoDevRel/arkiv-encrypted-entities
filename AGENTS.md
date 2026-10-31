Edit instructions only in AGENTS.md; CLAUDE.md only imports this file.

# Consumer guide: arkiv-encryption

Read [README.md](README.md) explicitly: it defines installation, crypto API, wire format, limits, public metadata, key custody, Rabdi integration and release status. Read [sample/AGENTS.md](sample/AGENTS.md) when using the wallet sample.

## Integration decisions

- Local crypto needs no credentials. Implement the README roundtrip immediately.
- Before writes, agree on the funded test wallet, non-sensitive data, Entity Expiration and acceptable public columns. Obtain funds/access keys through the README links. Never request a seed or private key in chat.
- Agree on an independent encryption-key backup and its recipients. Existing-data reads need an entity identifier and locally configured key through an approved secret channel. Do not request the encryption key in chat.
- Agree whether an independently trusted owner/entity must be checked. Successful authentication does not establish authorship, private queries, wallet recovery or access control.

## Invariants

- Use public package imports. Keep the v1 envelope order and compatible crypto API names. Do not copy crypto, derive keys from signatures, invent a password KDF, or redesign this tool.
- SDK integration is exactly 1.0.0 on Rabdi (7794095), with typed schema columns and ciphertext in `bytes()`. Only indexed public columns are filterable. The package itself does not sign or write.
- Encrypt before SDK calls. Never put plaintext, keys or sensitive labels in public columns, URLs, logs, analytics, bundles or errors. Render recovered bytes as untrusted text; clear stale plaintext on failure or input/session changes.
- Use explicit latest-state gas estimates, twofold headroom with a 1,000,000 minimum, explicit gasPrice and latest nonce. Reject gas above half the head limit. Require successful receipts. Follow the sample's persistent operation state machine; never resend an SDK success or an uncertain write. Only one independently verified gas-exhaustion revert permits a retry.
- Rabdi limits Entity Expiration to 7,884,000 blocks. Use bounded lifetimes and Lifetime Extension; no unlimited lifetime. Never use historical/safe/finalized state reads.
- Server access keys remain server-side. Visitors configure their own authorized wallet RPC. Fail closed on missing access-key configuration with a useful message.
- README, AGENTS and CLAUDE must ship in the npm allowlist. This candidate is not a published npm release. The review preview remains pinned to the existing exact registry crypto release until publication is separately authorized.

## Verify

Use a clean consumer directory. Check actual installed versions, TypeScript imports, known bytes, wrong-key and tampering failures. SDK evidence must include actual write/read/decrypt byte equality; distinguish mocks from live evidence. Inspect empty/loading/errors and small/medium/large widths. Report missing checks honestly. Historical release evidence does not certify this candidate.
