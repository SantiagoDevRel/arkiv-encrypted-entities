Edit instructions only in AGENTS.md; CLAUDE.md only imports this file.

# Consumer guide: encrypted notes sample

Open [README.md](README.md), the [package README](../README.md) and [package AGENTS](../AGENTS.md) explicitly. They define the journey, privacy limits, SDK API and release status.

- Preserve the established English UI, typography, create/inspect layout and accessible key eye buttons. No unrelated redesign or new dependency.
- Consume an exact registry crypto release. Install with `npm install --save-exact arkiv-encryption@1.0.0`; keep the manifest and registry lockfile at exactly 1.0.0. Never substitute a parent-source import or local link for delivery.
- Use SDK 1.0.0, Rabdi and the Notes schema. Server reads go through `/api/rpc` with server-only ARKIV_ACCESS_KEY. Never add that key/URL to a wallet; visitors configure their own RPC. Missing configuration fails closed.
- Agree on wallet, non-sensitive data, public columns, bounded Entity Expiration and independent key backup before a write. Never request private keys or encryption keys in chat. Reads do not require a wallet or backup consent.
- Keep session checks and unsigned latest gas preflight. All sends carry explicit gas, gasPrice and latest nonce; gas is at least max(1,000,000, twice estimate), no more than half the head limit.
- Keep one operation state per note/key/account across clicks. Guard before network calls; record SDK success as submitted before receipt lookup; no resend after success, null/disagreeing receipt or uncertain failure. Only one authoritative gas-exhaustion revert permits a re-estimated doubled-gas retry. Test every required outcome.
- Both query buttons fetch the identical public entity; the key only affects local authentication. Fetch before validating an inspection key. Preserve fetched ciphertext on wrong/missing/malformed key and clear stale plaintext. Render text, not HTML.
- Preserve one shared response panel only for equal snapshots, otherwise label the latest successful fetch. Show actual typed public columns and full ciphertext bytes. Wallet/session changes clear keys and late results cannot restore them.
- Keys/plaintext stay in memory, never storage/URLs/logs/analytics. Wallet signatures cannot recover them. Successful decryption does not establish authorship or authenticate public metadata. Check an independently trusted entity/owner when needed.
- Verify a clean consumer install, build/tests, actual Rabdi bytes, wrong-key/tampering failures and 390/768/1440px with empty/loading/error/success. Label simulated wallet behavior separately from actual signing. Do not claim production or npm publication from a preview.
