# Consumer guide: encrypted-entities sample

Read [README.md](README.md) for exact setup and the intended user journey, and the [package README](../README.md) for encryption guarantees. Those are the canonical sources; this guide adds integration decisions only. Open the [package AGENTS.md](../AGENTS.md) explicitly too.

## Ask the developer

- Which test wallet and non-sensitive test note should be used? Have them connect their browser wallet; never request its private key or seed.
- Where will the independent encryption key be backed up privately? Ask them to configure existing keys locally, never in chat.
- For existing content, which entity identifier and independently trusted author, if any, should be used? Authentication of ciphertext is not authentication of its public attributes or author.
- The sample fixes the SDK public Tiramisu RPC automatically; do not ask visitors for an endpoint or provider credentials. Faucet instructions live in the README.

Local build and crypto validation need no credentials; proceed with those while legitimate wallet/data decisions remain unanswered.

## Preserve

- Consume the exact published npm version; do not copy library crypto or switch to a local workspace alias for delivery.
- Wallet signs only an explicit Tiramisu entity write. Keep account/network checks and gas preflight. No private signing key, server signer, auto-resubmit or mainnet fallback.
- Keys are separate from wallet identity, never derived from a login/transaction signature. Keep backup acknowledgment before write; reads do not need wallet/backup consent.
- Never publish plaintext or encryption keys. Public attributes are deliberately fixed and non-sensitive. Render returned content as text; clear old plaintext before reads and on key/account/network changes.
- Keep custody warnings inline; use keyboard/touch-accessible disclosures for secondary detail and avoid repeated explanations. Both key inputs represent the same encryption-key format; inspection needs the original key.
- Keep all UI copy in English, the documented Arkiv typography and the two create/inspect sections. Keep an accessible eye button in every encryption-key field.
- Both query buttons must fetch public ciphertext with the same SDK request. The key is used only in the browser; never imply the network authorizes reads based on an encryption key. The public query must work without reading or validating a key.
- Fetch before validating the inspection key; missing/malformed/wrong keys must preserve the retrieved ciphertext while clearing stale plaintext. Keep one network-response panel, labelling it shared only for equal snapshots; otherwise identify the latest successful fetch.
- Show actual public attributes separately from complete payload bytes. Explorer entity and transaction links have different purposes; do not claim its overview displays bytes it only summarizes. Keep failure messages clear and previous plaintext cleared on a failed keyed query.
- No unrelated features, skills, MCPs or scaffolding. The requested UI revision changes presentation; it does not change the published package API or encryption format.

## Verify

Execute the README in a clean consumer checkout. Check npm resolution, build, known note creation and separate ciphertext retrieval/decryption. Exercise wrong/missing key, absent/rejecting wallet, invalid network, not-found entity, read failure and cleared stale result. Inspect the documented viewport/state matrix. Record simulated wallet tests separately from transactions on Tiramisu and report any unverified steps honestly.
