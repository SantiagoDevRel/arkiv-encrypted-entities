# Encrypted notes: wallet sample

Create an encrypted note, then compare what Arkiv returns with and without the encryption key. The payload stays encrypted on the network. Only the keyed query adds a locally decrypted message.

**These packages are intended for testnet use.**

This sample consumes published **arkiv-encrypted-entities@0.1.0**, with SDK **0.8.0** and viem **2.56.3**. See [verification](../docs/verification.md) for executed evidence and deployment status. The [package README](../README.md) is the source of truth for API, envelope, privacy guarantees and limits. Agents must explicitly open [AGENTS.md](AGENTS.md) and the [package consumer guide](../AGENTS.md).

## Run from a clean checkout

Node.js 22.12+ and npm are required. No environment file, API key or server signer is needed. On restricted Windows PowerShell, use `npm.cmd` instead of `npm`; no execution-policy change is necessary.

```sh
git clone https://github.com/SantiagoDevRel/arkiv-encrypted-entities.git
cd arkiv-encrypted-entities/sample
npm ci
npm ls arkiv-encrypted-entities @arkiv-network/sdk viem
npm run dev
```

Open **http://localhost:3078** with MetaMask or Rabby installed for writes. Reads work without a wallet. The server binds to loopback and refuses to replace an existing process on that port.

To verify and preview the production build, stop the dev server first:

```sh
npm test
npm run build
npm run preview
```

The registry-provenance test rejects parent imports, local lockfile links and a symlinked encryption package. No root package build or root dependencies are required.

## Create a note

1. Click **Connect wallet**. The sample requests adding/switching to **Tiramisu, chain 7738577**, and verifies the account/network before signing. It prefers Rabby if both Rabby and MetaMask are installed. Check the full account shown below the top bar.
2. Obtain test GLM from the [Hub faucet](https://hub.arkiv.network/faucet) if needed. The app uses the SDK's public Tiramisu RPC automatically, with bounded requests and no persistent cache. There is no RPC field or network selector. SDK reads and receipt confirmation use this RPC; signing uses your wallet.
3. Keep the default non-sensitive note or enter your own. Click **Generate key**. Use the eye inside **Encryption key** to reveal/mask it and save a private backup, such as in a password manager. This is a 64-character hexadecimal encryption key, not a wallet private key or password. Confirm the backup checkbox.
4. Click **Encrypt & store** and approve one entity transaction. The app encrypts before building calldata, estimates gas against that calldata and rechecks the wallet session before sending. Entity Expiration is approximately 24 hours. Size/expiration details are expandable.
5. Keep the returned **Entity ID**. **View entity** opens the entity summary/history; **View transaction** opens the specific write. **Inspect its payload below** stays in the sample. On confirmation the ID and original key are filled into the inspection form, unless the wallet session changed.

Expected note: **Hello Arkiv. Only my encryption key can unlock this note.** Its 57 UTF-8 bytes produce an **85-byte encrypted envelope**, displayed as `0x` plus 170 hexadecimal characters. Each encryption generates a new random IV, so ciphertext differs between writes.

## Compare queries

Use the same Entity ID for both buttons. To inspect after reload, paste the ID and restore the original encryption key privately into **Encryption key** in the inspection section. Its eye control also works with keyboard focus and Space/Enter.

| Action | What is fetched from Arkiv | What this browser additionally does |
| --- | --- | --- |
| **Query without encryption key** | Public attributes, encrypted payload and metadata | Nothing: no key is read or sent; no decryption attempted |
| **Query with encryption key** | The same public entity request | Authenticates/decrypts the payload with the local key and displays the original note |

The public query works even if the decryption-key field is empty or invalid. The keyed query validates key format before requesting data; an incorrect well-formed key can still retrieve ciphertext, but authentication fails and no plaintext is shown. A successful same-tab roundtrip reports a byte-for-byte match. If the entity changed between queries, the comparison tells you to run both again instead of claiming the responses match.

Both result panels show:

- **Public attributes:** actual SDK typed attributes. This sample writes only `app = encrypted-entities-sample`; it never writes the note or encryption key into an attribute.
- **Encrypted payload:** the complete envelope as hexadecimal, with its actual byte count. This is where the encrypted message is stored. Long payloads scroll; they are not shortened or replaced by invented text.
- **Full public entity · SDK fields:** expandable ID, owner, content type, attributes, payload and block metadata. This is a JSON presentation of decoded SDK fields; it is not claimed to be the raw JSON-RPC wire response. Big integers are displayed as decimal strings.
- **Message:** only in the keyed panel, after successful local authentication. This value is not part of the network response and is not sent back to Arkiv.

The current Tiramisu entity explorer shows a summary, payload size and history; it does not display the complete payload in its entity overview. The sample therefore fetches and displays those bytes directly. The explorer never receives your encryption key.

## Failure states and custody

- Missing wallet or rejected connection: writing reports the problem; public reading remains available.
- Wrong network: checks fail closed. No mainnet fallback. Account/network changes clear both keys and recovered results; reconnect and restore your private backup.
- Failed/ambiguous write: the write button stays blocked until reload. Inspect wallet activity first; a provider can broadcast successfully then lose its response. No automatic write retry.
- Malformed entity ID or missing/malformed decryption key: validation stops the affected query. Wrong key/tampering: ciphertext may remain visible but previous plaintext is cleared.
- Missing/expired entity or network failure: the affected result is cleared and an error shown. You may retry a read. A read error never rolls back an already confirmed write.
- Changing the entity ID clears both results; editing the decryption key clears its keyed result. The creation key and decryption key are separate inputs; editing one does not silently replace the other.
- An empty note is valid; local recovery says **(Empty note)**.

Keys and plaintext are never saved to localStorage, sessionStorage, URL parameters, logs or analytics. Reload discards them. Do not reveal keys on a shared screen. Browser extensions and scripts with page access can inspect memory; use test data only. Metadata remains public, successful decryption does not authenticate the owner/attributes, and expiration does not guarantee erasure. Full guarantees live in the package README.

## Design and UI verification contract

Keep the primary action and key-backup warning visible. Secondary privacy, limits and explorer explanations use native disclosures that work with keyboard and touch. Both inputs use the same name, **Encryption key**: inspection uses the original key, not a second secret.

Reference created with **Claude Design**, using the selected **Arkiv Design System**: [Arkiv Encrypted Notes](https://claude.ai/design/p/e998f7d1-d811-4738-912c-4ae3d5531096). The reference's create/inspect structure, rounded panels, paired results and key visibility controls were adapted to the existing Vite sample. Its placeholder interactions were replaced with the existing npm encryption and real SDK calls. Brand treatments come from `Arkiv-Network/arkiv-ui`; the app uses dark Ink surfaces and Orange actions with the designated open Space Grotesk fallback and IBM Plex Mono. Fonts load from Google Fonts; no licensed font binaries are bundled.

| Role | Family | Size / weight / line-height |
| --- | --- | --- |
| Page title | Space Grotesk | 32px / 500 / 1.1 |
| Section title | Space Grotesk | 24px / 500 / 1.1 |
| Body, input labels, inputs/buttons, decrypted text | IBM Plex Mono | 16px / 400 / 1.5 |
| Data labels | IBM Plex Mono | 16px / 500 / 1.5 |
| Help, statuses, footer, payload/code | IBM Plex Mono | 14px / 400 / 1.5 |
| Eyebrow | IBM Plex Mono | 14px / 500 / 1.5 |

Compare 390, 768 and 1440px, plus 599/601 and 899/901px around the 600/900px breakpoints, dark mode and 200% zoom. Two comparison panels sit side by side above 900px and stack below. Check fonts, full labels, eye mouse/keyboard controls, empty/loading/error/success states, long payloads/IDs and no horizontal page overflow. Render all returned data as text. Executed evidence belongs in the package verification report.
