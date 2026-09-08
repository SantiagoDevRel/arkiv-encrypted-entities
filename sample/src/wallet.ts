// Session validation and exact-calldata gas preflight adapted from arkiv-graph's wallet client.
import { createPublicClient, createWalletClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { custom, http, type Hex } from 'viem';
import { estimateGas } from 'viem/actions';

export interface Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: () => void): void;
  removeListener?(event: string, handler: () => void): void;
  isRabby?: boolean;
  isMetaMask?: boolean;
}
export class UserError extends Error {}
// SDK 0.8.0's Tiramisu export has no explorer; reuse the verified arkiv-graph transaction destination.
export const EXPLORER_URL = 'https://indexer.tiramisu.db-chain.testnet.arkiv.network';
const announced: Provider[] = [];
window.addEventListener('eip6963:announceProvider', event => {
  const provider = (event as CustomEvent<{ provider: Provider }>).detail?.provider;
  if (provider && typeof provider.request === 'function' && !announced.includes(provider)) announced.push(provider);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
export function provider(): Provider {
  const injected = (window as unknown as { ethereum?: Provider & { providers?: Provider[] } }).ethereum;
  const choices = [...announced, ...(injected?.providers ?? []), ...(injected ? [injected] : [])];
  const selected = choices.find(p => p.isRabby) ?? choices.find(p => p.isMetaMask) ?? choices[0];
  if (!selected) throw new UserError('No se encontró una wallet. Abre esta página con MetaMask o Rabby instalado y desbloqueado.');
  return selected;
}
export function publicClient(rpc: string) {
  let url: URL;
  try { url = new URL(rpc); } catch { throw new UserError('Ingresa una URL RPC válida.'); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new UserError('Usa HTTPS; HTTP solo está permitido en localhost.');
  if (url.username || url.password || url.hash) throw new UserError('La URL RPC no debe contener usuario, contraseña ni fragmento.');
  return createPublicClient({ chain: tiramisu, transport: http(rpc, { timeout: 20000, retryCount: 0, fetchOptions: { cache: 'no-store' } }) });
}
export async function connect(p: Provider): Promise<Hex> {
  const accounts = await p.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts[0] || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new UserError('La wallet no compartió una cuenta.');
  const chainId = `0x${tiramisu.id.toString(16)}`;
  if (Number(await p.request({ method: 'eth_chainId' })) !== tiramisu.id) {
    try { await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
    catch (error) {
      if ((error as { code?: number }).code !== 4902) throw error;
      await p.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: tiramisu.name, rpcUrls: tiramisu.rpcUrls.default.http, nativeCurrency: tiramisu.nativeCurrency, blockExplorerUrls: [EXPLORER_URL] }] });
      await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    }
  }
  await assertSession(p, accounts[0] as Hex);
  return accounts[0] as Hex;
}
export async function assertSession(p: Provider, account: Hex) {
  const accounts = await p.request({ method: 'eth_accounts' }) as string[];
  if (accounts[0]?.toLowerCase() !== account.toLowerCase() || Number(await p.request({ method: 'eth_chainId' })) !== tiramisu.id) {
    throw new UserError('La cuenta o la red cambió. Conecta de nuevo en Tiramisu antes de firmar.');
  }
}
export function writer(p: Provider, account: Hex, rpc: ReturnType<typeof publicClient>, onSent: (hash: Hex) => void) {
  return createWalletClient({ account, chain: tiramisu, transport: custom({ request: async args => {
    // Wallets can broadcast successfully but hang on custom-chain receipt reads.
    // Keep all SDK reads on the explicit, timeout-bounded Tiramisu RPC.
    if (args.method !== 'eth_sendTransaction') return rpc.transport.request(args);
    await assertSession(p, account);
    if (await rpc.getChainId() !== tiramisu.id) throw new UserError('El RPC no corresponde a Tiramisu.');
    const tx = (args.params as [{ from?: string; to?: Hex; data?: Hex; value?: Hex }])[0];
    if (tx.from?.toLowerCase() !== account.toLowerCase() || tx.to?.toLowerCase() !== '0x4400000000000000000000000000000000000044' || !tx.data || BigInt(tx.value ?? 0) !== 0n) throw new UserError('La transacción no coincide con una escritura de esta sample.');
    const gas = await estimateGas(rpc, { account, to: tx.to, data: tx.data, value: 0n });
    if (gas <= 0n) throw new UserError('No fue posible estimar el gas de la escritura.');
    await assertSession(p, account);
    const hash = await p.request({ ...args, params: [{ ...tx, gas: `0x${((gas * 120n + 99n) / 100n).toString(16)}` }] });
    if (typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash)) onSent(hash as Hex);
    return hash;
  } }, { retryCount: 0 }) });
}
