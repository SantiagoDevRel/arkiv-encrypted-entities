import { ExpirationTime } from '@arkiv-network/sdk';
import { hexToBytes } from 'viem';
import { getGasPrice } from 'viem/actions';
import { Notes } from './model';
import { submitOperation, operationIdentity, WriteOutcome, type Operation } from './transaction';

import { type Hex, toHex } from 'viem';
import { VERSION, CONTENT_TYPE, EncryptionError, generateKey, importKey, encryptPayload, decryptPayload } from 'arkiv-encryption';
import { provider, connect, publicClient, writer, chain, confirmedRevertHash, UserError, EXPLORER_URL, type Provider } from './wallet';

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const input = (id: string) => el<HTMLInputElement>(id);
let busy = false, account: Hex | undefined, activeProvider: Provider | undefined;
let original: { entityKey: Hex; bytes: Uint8Array } | undefined;
let sessionEpoch = 0;
const operations = new Map<string, Operation>();
type QueryMode = 'public' | 'read';
const responses: Partial<Record<QueryMode, { json: string; order: number }>> = {};
let responseOrder = 0;
el('version').textContent = `arkiv-encryption ${VERSION} ↗`;

function status(id: string, text: string, state = 'idle') { el(id).textContent = text; el(id).dataset.state = state; }
function compare() {
  const both = responses.public !== undefined && responses.read !== undefined;
  const match = both && responses.public!.json === responses.read!.json;
  status('comparison-status', both ? (match ? `Same public entity and encrypted bytes. ${el('read-result').hidden ? 'A correct key is still needed.' : 'Message decrypted locally.'}` : 'Entity changed between queries. Run both again.') : '');
  const latest = (Object.entries(responses) as [QueryMode, { json: string; order: number }][]).sort((a, b) => b[1].order - a[1].order)[0];
  el('network-result').hidden = !latest;
  el('network-entity').textContent = latest?.[1].json ?? '';
  el('network-caption').textContent = latest ? (match ? 'Same response for both queries · decoded SDK fields.' : `Latest successful fetch: ${latest[0] === 'public' ? 'without' : 'with'} encryption key · decoded SDK fields.`) : '';
}
function clearQuery(mode: QueryMode) {
  delete responses[mode];
  el(mode === 'public' ? 'public-result' : 'read-network-result').hidden = true;
  for (const suffix of ['ciphertext', 'bytes']) el(`${mode}-${suffix}`).textContent = '';
  if (mode === 'read') { el('read-result').hidden = true; el('read-locked').hidden = false; el('plaintext').textContent = ''; }
  if (responses.public === undefined && responses.read === undefined) el('explorer-result').hidden = true;
  compare();
}
function clearRead() {
  clearQuery('public'); clearQuery('read'); el('explorer-result').hidden = true;
  status('public-status', 'No query yet.');
  status('read-status', 'No query yet.');
}
function setVisibility(field: string, button: string, visible: boolean) {
  input(field).type = visible ? 'text' : 'password';
  const name = `${visible ? 'Hide' : 'Show'} encryption key`;
  el(button).setAttribute('aria-label', name); el(button).setAttribute('title', name);
  el(button).setAttribute('aria-pressed', String(visible));
  el(button).querySelector('use')!.setAttribute('href', visible ? '#eye-off' : '#eye');
}
for (const [field, button] of [['secret', 'reveal'], ['read-secret', 'read-reveal']]) {
  el(button).addEventListener('click', () => setVisibility(field, button, input(field).type === 'password'));
}
function errorMessage(error: unknown): string {
  if (error instanceof UserError || error instanceof WriteOutcome) return error.message;
  if (error instanceof EncryptionError) return ({ INVALID_KEY: 'Enter the original 64-character hexadecimal encryption key.', DECRYPTION_FAILED: 'Decryption failed: wrong key or altered ciphertext. Showing encrypted bytes.', INVALID_INPUT: 'The note exceeds 100,000 UTF-8 bytes or has an invalid format.', INVALID_ENVELOPE: 'This ciphertext is not a valid encrypted v1 envelope.', CRYPTO_UNAVAILABLE: 'WebCrypto requires HTTPS or localhost and a modern browser.' })[error.code];
  let cause = error as { code?: number; name?: string; cause?: unknown } | undefined;
  for (let i = 0; cause && i < 8; i++, cause = cause.cause as typeof cause) {
    if (cause.code === 4001 || cause.name === 'UserRejectedRequestError') return 'You rejected the wallet request. No write is confirmed for this attempt.';
    if (cause.name === 'NoEntityFoundError') return 'Entity not found. Check its ID and expiration on Rabdi.';
  }
  return 'Could not complete the request. Check the Rabdi connection and try reading again. If you signed a write, check wallet activity and test GLM before retrying.';
}
async function action(target: string, run: () => Promise<void>) {
  if (busy) return;
  busy = true;
  document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>('input, button, textarea').forEach(e => { e.disabled = true; });
  el(target).setAttribute('aria-busy', 'true');
  try { await run(); } catch (error) { status(target, errorMessage(error), 'error'); }
  finally {
    busy = false;
    document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>('input, button, textarea').forEach(e => { e.disabled = false; });

    el(target).setAttribute('aria-busy', 'false');
  }
}
function changed() {
  sessionEpoch++;
  account = undefined; original = undefined; clearRead();
  input('secret').value = ''; input('read-secret').value = ''; input('backup').checked = false;
  setVisibility('secret', 'reveal', false); setVisibility('read-secret', 'read-reveal', false);
  el('connect').textContent = 'Connect wallet';
  status('wallet-status', 'The account or network changed. Reconnect to write.');
  status('key-status', 'Keys cleared from this tab. Use your private backup to read.');
}
el('connect').addEventListener('click', () => void action('wallet-status', async () => {
  status('wallet-status', 'Confirm the connection and Rabdi in your wallet…', 'loading');
  const selected = provider();
  const connected = await connect(selected);
  if (activeProvider !== selected) {
    for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) { activeProvider?.removeListener?.(event, changed); selected.on?.(event, changed); }
  }
  activeProvider = selected; account = connected;
  el('connect').textContent = 'Wallet connected';
  status('wallet-status', `Connected: ${account}`, 'success');
}));
el('generate').addEventListener('click', () => void action('key-status', async () => {
  input('secret').value = generateKey(); input('backup').checked = false;
  setVisibility('secret', 'reveal', false);
  status('key-status', 'Key ready. Use the eye to save your backup.', 'success');
}));
input('secret').addEventListener('input', () => {
  input('backup').checked = false;
  status('key-status', input('secret').value ? 'Key entered. It will be validated before encryption.' : '');
});
input('read-secret').addEventListener('input', () => {
  sessionEpoch++; clearQuery('read'); status('read-status', 'Key changed. Query again to decrypt.');
});
input('entity').addEventListener('input', () => { sessionEpoch++; clearRead(); });

el('write-form').addEventListener('submit', event => {
  event.preventDefault();
  void action('write-status', async () => {
    const epoch = sessionEpoch;
    clearRead();

    if (!account || !activeProvider) throw new UserError('Connect your wallet above before storing a note.');
    if (!input('backup').checked) throw new UserError('Save a private backup of your encryption key and confirm the checkbox.');
    const secret = input('secret').value;
    const key = await importKey(secret);
    const bytes = new TextEncoder().encode(el<HTMLTextAreaElement>('note').value);
    status('write-status', 'Encrypting locally and checking Rabdi…', 'loading');
    const ciphertext = await encryptPayload(key, bytes);
    const identity = await operationIdentity(account, secret, bytes);
    const operation: Operation = operations.get(identity) ?? { phase: 'idle', attempts: 0 };
    operations.set(identity, operation);
    const rpc = publicClient();
    status('write-status', 'Note encrypted. Review and sign the write in your wallet…', 'loading');
    const created = await submitOperation(operation, {
      send: async minimumGas => {
        const gasPrice = await getGasPrice(rpc);
        const wallet = writer(activeProvider!, account!, rpc, operation, minimumGas, hash => {
          el<HTMLAnchorElement>('transaction').href = EXPLORER_URL + '/tx/' + hash;
          el('created-entity').hidden = true;
          el('created-key').textContent = 'Waiting for confirmation'; el('write-result').hidden = false;
          status('write-status', 'Transaction sent. Waiting for confirmation…', 'loading');
        });
        return wallet.createEntity(Notes, { app: 'encrypted-entities-sample', contentType: CONTENT_TYPE, ciphertext },
          { expiration: ExpirationTime.fromDays(1) }, { gas: minimumGas, gasPrice });
      },
      receipt: hash => rpc.getTransactionReceipt({ hash }).catch(() => null),
      confirmedRevertHash,
      headGasLimit: async () => (await rpc.getBlock({ blockTag: 'latest' })).gasLimit,
    });
    original = epoch === sessionEpoch ? { entityKey: created.entityKey, bytes } : undefined;
    input('entity').value = created.entityKey;
    // Never restore a key after an account/network change during confirmation.
    if (epoch === sessionEpoch) input('read-secret').value = secret;
    setVisibility('read-secret', 'read-reveal', false);
    el('created-key').textContent = created.entityKey;
    el<HTMLAnchorElement>('created-entity').href = `${EXPLORER_URL}/entity/${created.entityKey}`;
    el('created-entity').hidden = false;
    el<HTMLAnchorElement>('transaction').href = `${EXPLORER_URL}/tx/${created.txHash}`;
    el('write-result').hidden = false;
    status('write-status', 'Stored.', 'success');
    status('read-status', epoch === sessionEpoch ? 'The key from this write is filled in. Query to decrypt.' : 'The wallet session changed. Restore your key privately to decrypt.');
  });
});
const pretty = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item instanceof Uint8Array ? toHex(item) : item, 2);
function query(mode: QueryMode) {
  void action(`${mode}-status`, async () => {
    const epoch = sessionEpoch;
    clearQuery(mode);
    const id = input('entity').value.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(id)) throw new UserError('Enter an entity ID: 0x followed by 64 hexadecimal characters.');
    // The public query never reads or validates a key. Both modes issue the same SDK request.
    const secret = mode === 'read' ? input('read-secret').value : undefined;
    const rpc = publicClient();
    status(`${mode}-status`, 'Fetching the public entity from Rabdi…', 'loading');
    if (await rpc.getChainId() !== chain.id) throw new UserError('The RPC is not on Rabdi.');
    const entity = await rpc.getEntity(id as Hex, Notes);
    if (epoch !== sessionEpoch) throw new UserError('The session or inputs changed. Query again.');
    if (entity.contentType.value !== CONTENT_TYPE || !entity.ciphertext) throw new UserError('This entity does not contain an encrypted v1 envelope from this tool.');
    const ciphertext = hexToBytes(entity.ciphertext.value);
    const ciphertextHex = toHex(ciphertext);
    const fields = { entityId: id, owner: entity.$owner, creator: entity.$creator, attributes: { app: entity.app, seed: entity.seed, contentType: entity.contentType, ciphertext: entity.ciphertext }, createdAtBlock: entity.$createdAt, updatedAtBlock: entity.$updatedAt, expiresAtBlock: entity.$expiresAt };
    el(`${mode}-ciphertext`).textContent = ciphertextHex;
    el(`${mode}-bytes`).textContent = `${ciphertext.length.toLocaleString('en-US')} bytes`;
    el(mode === 'public' ? 'public-result' : 'read-network-result').hidden = false;
    responses[mode] = { json: pretty(fields), order: ++responseOrder }; compare();
    el<HTMLAnchorElement>('entity-explorer').href = `${EXPLORER_URL}/entity/${id}`;
    el('explorer-result').hidden = false;
    if (mode === 'public') { status('public-status', 'Fetched from Arkiv. No key used.', 'success'); return; }
    // Fetching ciphertext does not require a valid key. Validate only for local decryption.
    const key = await importKey(secret!);
    const recovered = await decryptPayload(key, ciphertext);
    if (epoch !== sessionEpoch) throw new UserError('The session or inputs changed. Restore your key privately and query again.');
    const same = original?.entityKey.toLowerCase() === id.toLowerCase();
    if (same && (original!.bytes.length !== recovered.length || recovered.some((byte, index) => byte !== original!.bytes[index]))) throw new UserError('Recovered bytes do not match the note sent from this tab.');
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(recovered); }
    catch { throw new UserError('The ciphertext authenticated, but is not UTF-8 text. Use the package API for binary data.'); }
    el('plaintext').textContent = text || '(Empty note)'; el('read-result').hidden = false; el('read-locked').hidden = true;
    compare();
    status('read-status', same ? 'Decrypted locally. Matches your note exactly.' : 'Decrypted locally. Ciphertext verified.', 'success');
  });
}
el('read-public').addEventListener('click', () => query('public'));
el('read').addEventListener('click', () => query('read'));

// Shared sample links contain only a public entity identifier, never an encryption key.
const linkedEntity = new URLSearchParams(window.location.search).get('entity');
if (linkedEntity !== null) {
  input('entity').value = linkedEntity;
  query('public');
}
