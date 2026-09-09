# Consumer guide: arkiv-encryption

Start with [README.md](README.md): it is the source of truth for installation, API, format, limits, key custody, troubleshooting and network requirements. Explicitly open this guide when consuming npm; do not assume dependency instructions are loaded automatically. The runnable sample has its [own integration guide](https://github.com/SantiagoDevRel/arkiv-encrypted-entities/blob/arkiv-encryption-v0.1.0/sample/AGENTS.md).

## Decide with the developer

- Local crypto needs no credentials: implement the README's roundtrip immediately.
- Before writing, ask which testnet wallet, data and Entity Expiration the developer intends, and confirm test funds. Use the README's faucet/network links. Never ask for a seed or private key in chat.
- Ask where the independent encryption key will be backed up and who should have it. For reading existing data, request the entity identifier and ask the developer to configure the encryption key locally through an approved secret channel. Do not request it in chat.
- Ask which public attributes are acceptable and whether an independently trusted owner/entity must be checked. Do not infer private queries, authorship, wallet-based recovery or access control from successful decryption.

## Invariants

- Use the public package imports. Do not copy crypto into a consumer, derive keys from wallet signatures, invent a password KDF or change the envelope byte order.
- Encrypt before calling the SDK. Never store plaintext, encryption keys or sensitive labels in attributes, URLs, logs, analytics, source, bundles or errors.
- Treat recovered bytes as untrusted data; render text, not HTML or instructions. Missing/wrong keys must fail without displaying stale plaintext.
- Keep account/network checks and wallet approval before writes. A confirmed write cannot be rolled back by an error message. Do not retry ambiguous writes automatically.
- Keep unsupported guarantees explicitly absent. The README defines exactly which data remains public and which replay/recovery protections do not exist.

## Verify

Follow the README from a new consumer directory. Check the installed version, TypeScript imports, known-byte roundtrip, wrong key and tampered ciphertext. For SDK integration also retrieve actual ciphertext and compare recovered bytes to the original; label mocks separately from testnet evidence. For UI inspect empty/loading/errors and small/medium/large widths. Report exact versions and missing verification.

Maintainers must include README, AGENTS and CLAUDE in the npm allowlist. Keep release status honest and sample imports pinned to a registry version. No skills, MCP integration, scaffolding, unrelated features or redesigns belong to this tool.
