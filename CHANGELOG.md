# Changelog

## 1.0.0 — release candidate

- Breaking integration migration to SDK 1.0.0 and Rabdi (7794095). Entity content is now a `ciphertext: bytes()` column alongside public typed columns; only indexed public columns can be filtered.
- Optional SDK peer `^1.0.0`; development SDK pinned to 1.0.0. Pure local crypto still has no SDK runtime dependency.
- Preserve the AES-256-GCM v1 wire format and existing crypto API. Old envelopes can be decrypted with their original independent key, but old network entities need an explicit application migration to the new schema.
- Sample reads through its own server endpoint with a server-only access key; visitors configure their wallet's authorized Rabdi RPC.
- Explicit latest-state gas estimation, twofold headroom, gas price, nonce and safe head budget. Persistent per-operation confirmation handling prevents uncertain or successful writes from being resubmitted.
- Bounded Entity Expiration, idempotent reseeding and live wrong-key/tampering checks.
- No npm publication or production promotion is claimed by this candidate.

## 0.1.0

Initial published crypto API. Historical evidence is retained in `docs/verification.md`.
