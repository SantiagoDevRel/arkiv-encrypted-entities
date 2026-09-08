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
  if (!selected) throw new UserError('No wallet found. Open this page with MetaMask or Rabby installed and unlocked.');
  return selected;
}
export function publicClient(rpc: string = tiramisu.rpcUrls.default.http[0]) {
  let url: URL;
  try { url = new URL(rpc); } catch { throw new UserError('Enter a valid RPC URL.'); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new UserError('Use HTTPS. HTTP is only allowed on localhost.');
  if (url.username || url.password || url.hash) throw new UserError('The RPC URL must not contain a username, password or fragment.');
  return createPublicClient({ chain: tiramisu, transport: http(rpc, { timeout: 20000, retryCount: 0, fetchOptions: { cache: 'no-store' } }) });
}
export async function connect(p: Provider): Promise<Hex> {
  const accounts = await p.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts[0] || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new UserError('The wallet did not share an account.');
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
    throw new UserError('The account or network changed. Reconnect on Tiramisu before signing.');
  }
}
export function writer(p: Provider, account: Hex, rpc: ReturnType<typeof publicClient>, onSent: (hash: Hex) => void) {
  return createWalletClient({ account, chain: tiramisu, transport: custom({ request: async args => {
    // Wallets can broadcast successfully but hang on custom-chain receipt reads.
    // Keep all SDK reads on the explicit, timeout-bounded Tiramisu RPC.
    if (args.method !== 'eth_sendTransaction') return rpc.transport.request(args);
    await assertSession(p, account);
    if (await rpc.getChainId() !== tiramisu.id) throw new UserError('The RPC is not on Tiramisu.');
    const tx = (args.params as [{ from?: string; to?: Hex; data?: Hex; value?: Hex }])[0];
    if (tx.from?.toLowerCase() !== account.toLowerCase() || tx.to?.toLowerCase() !== '0x4400000000000000000000000000000000000044' || !tx.data || BigInt(tx.value ?? 0) !== 0n) throw new UserError('The transaction does not match an entity write from this sample.');
    const gas = await estimateGas(rpc, { account, to: tx.to, data: tx.data, value: 0n });
    if (gas <= 0n) throw new UserError('Could not estimate gas for this write.');
    await assertSession(p, account);
    const hash = await p.request({ ...args, params: [{ ...tx, gas: `0x${((gas * 120n + 99n) / 100n).toString(16)}` }] });
    if (typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash)) onSent(hash as Hex);
    return hash;
  } }, { retryCount: 0 }) });
}
