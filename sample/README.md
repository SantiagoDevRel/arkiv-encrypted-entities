# Encrypted entities: wallet sample

Connect MetaMask or Rabby, generate and privately back up an independent encryption key, encrypt a test note locally, sign one creation on Tiramisu, retrieve the ciphertext and decrypt it. The recovered result is compared byte for byte with the original while this tab is open. You can also read an existing entity without connecting a wallet.

**These packages are intended for testnet use.**

The sample consumes **arkiv-encrypted-entities@0.1.0** through the package name and npm dependency. See [verification](../docs/verification.md) for release status; a temporary local tarball used during development is not a published package. See the [package README](../README.md) for the API, privacy model, wire format and troubleshooting. Agents: explicitly read [AGENTS.md](AGENTS.md) and the [package consumer guide](../AGENTS.md).

## Run from a clean checkout

Node.js 22.12+ and npm are required. No environment file, API key or server signer is required.

```sh
git clone https://github.com/SantiagoDevRel/arkiv-encrypted-entities.git
cd arkiv-encrypted-entities/sample
npm ci
npm ls arkiv-encrypted-entities @arkiv-network/sdk viem
npm run dev
```

Open **http://localhost:3078** in the browser containing your wallet. The server binds to loopback and refuses to replace another process on that port.

Expected dependencies: package 0.1.0, SDK 0.8.0, viem 2.56.3. The UI displays the package's exported version. To verify a production build:

```sh
npm test
npm run build
npm run preview
```

Stop the dev server before starting preview on the same port. `npm ci` uses the sample lockfile; there are no source aliases or parent workspace imports.

## Complete the flow

1. Open the sample with MetaMask or Rabby installed and unlocked. Click **Conectar MetaMask o Rabby**. When both are installed this sample prefers Rabby; otherwise it uses MetaMask or the available EIP-1193 provider. Confirm the account displayed is your intended test wallet. The application requests switching/adding **Tiramisu, chain 7738577**, and verifies it before signing.
2. Obtain test GLM from the [Hub faucet](https://hub.arkiv.network/faucet) if necessary. The default RPC comes from SDK `tiramisu`. The expandable connection field accepts a different Tiramisu endpoint; only use browser-appropriate access credentials. Reads and SDK receipt confirmation use the explicit RPC, not the injected wallet. No persistent read cache or background entity polling is used.
3. Click **Generar clave nueva**. **Mostrar clave** reveals the independent 64-character encryption key for a private backup, such as a password manager. Confirm the backup checkbox. Do not paste a wallet key or seed here. Generating another key does not recover previous notes.
4. Use the default non-sensitive text or your own test text. Click **Cifrar y guardar en Tiramisu**. Approve the single entity transaction. The app encrypts first, estimates gas against the actual calldata, and checks the signing account/network again. Expiration is approximately 24 hours, via SDK `ExpirationTime.fromSeconds(86400)`.
5. On confirmation, save the entity identifier and inspect the transaction link. Click **Recuperar ciphertext y descifrar**. The app fetches the entity from the RPC, checks its content type, authenticates the payload and displays the original text. For the default note expect **Hola Arkiv. Esta es una prueba de cifrado.** and the byte-for-byte success message.
6. To recover after reload, paste the entity identifier and original encryption key, then read. Wallet connection and the backup checkbox are not required for reading. An incorrect key shows a clear failure with no plaintext. Account/network changes clear the encryption key and recovered text from the tab; use your backup.

Keys, notes and recovered text are never saved to localStorage, sessionStorage, URL parameters or analytics. Page reload discards them. Do not leave a revealed key on a shared screen. Wallet extensions and scripts running in the page can access browser state: use test data only. Public metadata and the lack of key recovery are described in the package README.

## Failure states

- No wallet: reading still works; writing tells you to install/unlock a compatible wallet.
- Rejected wallet request: a clear error is displayed. After a failed write, the send button remains blocked until reload to prevent an ambiguous duplicate. Inspect wallet activity first; a lost response can follow a successful broadcast.
- Wrong RPC/network: writing and reading fail closed. Account/network changes during signing invalidate the session.
- Missing key or malformed entity identifier: validation fails before retrieving data. Wrong key or modified ciphertext: authentication fails and clears the previous plaintext.
- Unavailable/expired entity, RPC failure or limits: read shows an error and no stale result. Retry the read later after checking the identifier/network. No automatic write retries.
- A confirmed write followed by a failed read is still a confirmed write. Keep the entity key and original encryption key; retry only the read.
- Empty note: valid encryption of zero bytes; the result says `(Texto vacío)`.

## UI verification contract

Reuses the single-column sample layout and treatments from `arkiv-chunking`, based on canonical `Arkiv-Network/arkiv-ui` tokens and primitives. No redesigned shell or new icon/logo system. Open, approved font fallback: Space Grotesk (headings) and IBM Plex Mono (body/controls/code); fonts load from Google Fonts, with system fallbacks if unavailable.

| Role | Family | Size / weight / line-height |
| --- | --- | --- |
| Page title | Space Grotesk | 32px / 500 / 1.1 |
| Section/result title | Space Grotesk | 24px / 500 / 1.1 |
| Body, labels, controls, recovered text | IBM Plex Mono | 16px / 400 / 1.5 |
| Help, footer, identifiers | IBM Plex Mono | 14px / 400 / 1.5 |
| Eyebrow | IBM Plex Mono | 14px / 500 / 1.5 |

Check 390, 768 and 1440px, plus 599/601px around the existing 600px breakpoint, dark mode and 200% zoom. There are no card grids; the one column wraps actions on narrow screens. Inspect overflow, long identifiers/text, loaded fonts and empty/loading/error/result states. The source uses textContent for recovered content and never executes payload text. Actual executed evidence belongs in the package verification report.
