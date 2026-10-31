# Changelog

## 1.1.0

- Add encryptBytes/decryptBytes with identical deprecated aliases and unchanged v1 format. Guard every source-map string and preserve dated evidence.

> Historical version entries below are preserved as recorded; use README.md for the current release.

﻿# Changelog

## 1.0.0

- Breaking integration migration to SDK 1.0.0 and Rabdi (7794095). Entity content is now a `ciphertext: bytes()` column alongside public typed columns; only indexed public columns can be filtered.
- Optional SDK peer `^1.0.0`; development SDK pinned to 1.0.0. Pure local crypto still has no SDK runtime dependency.
- Preserve the AES-256-GCM v1 wire format and existing crypto API. Old envelopes can be decrypted with their original independent key, but old network entities need an explicit application migration to the new schema.
- Sample reads through its own server endpoint with a server-only access key; visitors configure their wallet's authorized Rabdi RPC.
- Explicit latest-state gas estimation, twofold headroom, gas price, nonce and safe head budget. Persistent per-operation confirmation handling prevents uncertain or successful writes from being resubmitted.
- Bounded Entity Expiration, idempotent reseeding and live wrong-key/tampering checks.
- Published the exact reviewed 1.0.0 tarball; the sample now consumes exact registry 1.0.0. Deployment verification is recorded in the release evidence.

## 0.1.0

Initial published crypto API. Historical evidence is retained in `docs/verification.md`.
