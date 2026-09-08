import { ExpirationTime } from '@arkiv-network/sdk';
import { str } from '@arkiv-network/sdk/attr';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { type Hex, toHex } from 'viem';
import { VERSION, CONTENT_TYPE, EncryptionError, generateKey, importKey, encryptPayload, decryptPayload } from 'arkiv-encrypted-entities';
import { provider, connect, publicClient, writer, UserError, EXPLORER_URL, type Provider } from './wallet';
import './style.css';

function el<T extends HTMLElement = HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const input = (id: string) => el<HTMLInputElement>(id);
let busy = false, account: Hex | undefined, activeProvider: Provider | undefined;
let original: { entityKey: Hex; bytes: Uint8Array } | undefined;
let uncertainWrite = false;
let sessionEpoch = 0;
el('version').textContent = `arkiv-encrypted-entities ${VERSION}`;
input('rpc').value = tiramisu.rpcUrls.default.http[0];

function status(id: string, text: string, state = 'idle') { el(id).textContent = text; el(id).dataset.state = state; }
function clearRead() { el('read-result').hidden = true; el('plaintext').textContent = ''; el('cipher-result').hidden = true; el('ciphertext').textContent = ''; }
function errorMessage(error: unknown): string {
  if (error instanceof UserError) return error.message;
  if (error instanceof EncryptionError) return ({ INVALID_KEY: 'Falta una clave válida: usa los 64 caracteres hexadecimales del respaldo original.', DECRYPTION_FAILED: 'No se pudo descifrar: la clave es incorrecta o el payload fue alterado. No se devuelve texto.', INVALID_INPUT: 'El texto supera 100.000 bytes UTF-8 o tiene un formato inválido.', INVALID_ENVELOPE: 'El payload no tiene un formato cifrado v1 válido.', CRYPTO_UNAVAILABLE: 'WebCrypto necesita HTTPS o localhost y un navegador moderno.' })[error.code];
  let cause = error as { code?: number; name?: string; cause?: unknown } | undefined;
  for (let i = 0; cause && i < 8; i++, cause = cause.cause as typeof cause) {
    if (cause.code === 4001 || cause.name === 'UserRejectedRequestError') return 'Rechazaste la solicitud de la wallet. No hay una escritura confirmada en este intento.';
    if (cause.name === 'NoEntityFoundError') return 'No se encontró la entity. Revisa su identificador, red y expiración.';
  }
  return 'No fue posible completar la operación. Revisa el RPC, sus límites, la red y los test GLM. Si firmaste, revisa la actividad de tu wallet antes de intentar otra escritura.';
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
    input('write').disabled = uncertainWrite;
    el(target).setAttribute('aria-busy', 'false');
  }
}
function changed() {
  sessionEpoch++;
  account = undefined; original = undefined; clearRead();
  input('secret').value = ''; input('backup').checked = false;
  status('wallet-status', 'La cuenta o la red cambió. Conecta de nuevo para escribir.');
  status('key-status', 'Se limpió la clave de esta pestaña. Usa tu respaldo para leer.');
}
el('connect').addEventListener('click', () => void action('wallet-status', async () => {
  status('wallet-status', 'Confirma la conexión y Tiramisu en tu wallet…', 'loading');
  const selected = provider();
  const connected = await connect(selected);
  if (activeProvider !== selected) {
    for (const event of ['accountsChanged', 'chainChanged', 'disconnect']) { activeProvider?.removeListener?.(event, changed); selected.on?.(event, changed); }
  }
  activeProvider = selected; account = connected;
  status('wallet-status', `Conectada: ${account} · Tiramisu`, 'success');
}));
el('generate').addEventListener('click', () => void action('key-status', async () => {
  input('secret').value = generateKey(); input('backup').checked = false; clearRead();
  status('key-status', 'Clave nueva generada. Muéstrala y guarda un respaldo privado antes de escribir. Una clave nueva no abre notas anteriores.', 'success');
}));
el('reveal').addEventListener('click', () => {
  const visible = input('secret').type === 'password';
  input('secret').type = visible ? 'text' : 'password';
  el('reveal').textContent = visible ? 'Ocultar clave' : 'Mostrar clave';
  el('reveal').setAttribute('aria-pressed', String(visible));
});
input('secret').addEventListener('input', () => { input('backup').checked = false; clearRead(); });
input('entity').addEventListener('input', clearRead);
input('rpc').addEventListener('input', clearRead);

el('write-form').addEventListener('submit', event => {
  event.preventDefault();
  void action('write-status', async () => {
    const epoch = sessionEpoch;
    clearRead();
    if (uncertainWrite) throw new UserError('Revisa la transacción pendiente antes de enviar otra escritura.');
    if (!account || !activeProvider) throw new UserError('Conecta tu wallet en el paso 1.');
    if (!input('backup').checked) throw new UserError('Guarda un respaldo privado de la clave y confirma el paso 2.');
    const key = await importKey(input('secret').value);
    const bytes = new TextEncoder().encode(el<HTMLTextAreaElement>('note').value);
    status('write-status', 'Cifrando localmente y verificando la red…', 'loading');
    const payload = await encryptPayload(key, bytes);
    const rpc = publicClient(input('rpc').value.trim());
    if (await rpc.getChainId() !== tiramisu.id) throw new UserError('El RPC no corresponde a Tiramisu.');
    let sent: Hex | undefined;
    const wallet = writer(activeProvider, account, rpc, hash => {
      sent = hash;
      el<HTMLAnchorElement>('transaction').href = `${EXPLORER_URL}/tx/${hash}`;
      el('created-key').textContent = 'Confirmación pendiente'; el('write-result').hidden = false;
      status('write-status', 'Transacción enviada. Esperando confirmación…', 'loading');
    });
    status('write-status', 'El texto ya está cifrado. Revisa y firma la escritura en tu wallet…', 'loading');
    let created;
    try {
      created = await wallet.createEntity({ payload, contentType: CONTENT_TYPE, attributes: { app: str('encrypted-entities-sample') }, expires: ExpirationTime.fromSeconds(86400) });
    } catch (error) {
      // A provider can broadcast and then lose its response. Do not offer an automatic resend.
      uncertainWrite = true;
      throw new UserError(sent ? 'La transacción fue enviada, pero no se verificó su confirmación. Revisa el enlace y tu wallet antes de recargar para escribir otra vez.' : `${errorMessage(error)} La escritura queda bloqueada hasta recargar; primero revisa la actividad de tu wallet.`);
    }
    original = epoch === sessionEpoch ? { entityKey: created.entityKey, bytes } : undefined;
    input('entity').value = created.entityKey;
    el('created-key').textContent = created.entityKey;
    el<HTMLAnchorElement>('transaction').href = `${EXPLORER_URL}/tx/${created.txHash}`;
    el('write-result').hidden = false;
    status('write-status', 'Escritura confirmada. Guarda el identificador y recupera el ciphertext en el paso 4.', 'success');
    status('read-status', 'La entity está lista para recuperar y descifrar.');
  });
});
el('read-form').addEventListener('submit', event => {
  event.preventDefault();
  void action('read-status', async () => {
    const epoch = sessionEpoch;
    clearRead();
    const id = input('entity').value.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(id)) throw new UserError('El identificador debe ser 0x seguido de 64 caracteres hexadecimales.');
    const key = await importKey(input('secret').value);
    const rpc = publicClient(input('rpc').value.trim());
    status('read-status', 'Recuperando el ciphertext desde Tiramisu…', 'loading');
    if (await rpc.getChainId() !== tiramisu.id) throw new UserError('El RPC no corresponde a Tiramisu.');
    const entity = await rpc.getEntity(id as Hex);
    if (entity.contentType !== CONTENT_TYPE || !entity.payload) throw new UserError('Esta entity no contiene un payload cifrado v1 de esta herramienta.');
    el('ciphertext').textContent = toHex(entity.payload); el('cipher-result').hidden = false;
    const recovered = await decryptPayload(key, entity.payload);
    if (epoch !== sessionEpoch) throw new UserError('La cuenta o la red cambió durante la lectura. Usa tu respaldo y vuelve a recuperar la nota.');
    const same = original?.entityKey.toLowerCase() === id.toLowerCase();
    if (same && (original!.bytes.length !== recovered.length || recovered.some((byte, index) => byte !== original!.bytes[index]))) throw new UserError('Los bytes recuperados no coinciden con el texto enviado.');
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(recovered); }
    catch { throw new UserError('Payload autenticado, pero no contiene texto UTF-8. Usa la API del paquete para bytes binarios.'); }
    el('plaintext').textContent = text || '(Texto vacío)'; el('read-result').hidden = false;
    status('read-status', same ? 'Descifrado autenticado. Coincide byte a byte con el texto enviado.' : 'Descifrado autenticado con tu clave. El autor y los atributos no se autentican con este cifrado.', 'success');
  });
});
