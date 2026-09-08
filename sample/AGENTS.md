# Consumer guide: encrypted-entities sample

Read [README.md](README.md) for exact setup and the intended user journey, and the [package README](../README.md) for encryption guarantees. Those are the canonical sources; this guide adds integration decisions only. Open the [package AGENTS.md](../AGENTS.md) explicitly too.

## Ask the developer

- Which test wallet and non-sensitive test note should be used? Have them connect their browser wallet; never request its private key or seed.
- Where will the independent encryption key be backed up privately? Ask them to configure existing keys locally, never in chat.
- For existing content, which entity identifier and independently trusted author, if any, should be used? Authentication of ciphertext is not authentication of its public attributes or author.
- Is the default Tiramisu RPC sufficient? Provider keys must be browser-appropriate and kept out of source control and logs. Credential and faucet instructions live in the README.

Local build and crypto validation need no credentials; proceed with those while legitimate wallet/data decisions remain unanswered.

## Preserve

- Consume the exact published npm version; do not copy library crypto or switch to a local workspace alias for delivery.
- Wallet signs only an explicit Tiramisu entity write. Keep account/network checks and gas preflight. No private signing key, server signer, auto-resubmit or mainnet fallback.
- Keys are separate from wallet identity, never derived from a login/transaction signature. Keep backup acknowledgment before write; reads do not need wallet/backup consent.
- Never publish plaintext or encryption keys. Public attributes are deliberately fixed and non-sensitive. Render returned content as text; clear old plaintext before reads and on key/account/network changes.
- Preserve the canonical typography/layout and Spanish UI in tú. No extra features, skills, MCPs, scaffolding or redesigns.

## Verify

Execute the README in a clean consumer checkout. Check npm resolution, build, known note creation and separate ciphertext retrieval/decryption. Exercise wrong/missing key, absent/rejecting wallet, invalid network, not-found entity, read failure and cleared stale result. Inspect the documented viewport/state matrix. Record simulated wallet tests separately from transactions on Tiramisu and report any unverified steps honestly.
