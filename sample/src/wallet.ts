import { createPublicClient, createWalletClient, EntityMutationError } from '@arkiv-network/sdk';
import { rabdi } from '@arkiv-network/sdk/chains';
import { custom, http, type Hex } from 'viem';
import { estimateGas, getGasPrice } from 'viem/actions';
import type { Operation } from './transaction';
export interface Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: () => void): void;
  removeListener?(event: string, handler: () => void): void;
  isRabby?: boolean;
  isMetaMask?: boolean;
}
export class UserError extends Error {}
// SDK metadata only: no request uses this placeholder URL or a bundled access key.
export const chain = rabdi({ accessKey: 'wallet-configured' });
export const EXPLORER_URL = 'https://rabdi.explorer.arkiv.network';
const announced: Provider[] = [];
window.addEventListener('eip6963:announceProvider', event => {
  const p = (event as CustomEvent<{ provider: Provider }>).detail?.provider;
  if (p && typeof p.request === 'function' && !announced.includes(p)) announced.push(p);
});
window.dispatchEvent(new Event('eip6963:requestProvider'));
export function provider(): Provider {
  const injected = (window as unknown as { ethereum?: Provider & { providers?: Provider[] } }).ethereum;
  const choices = [...announced, ...(injected?.providers ?? []), ...(injected ? [injected] : [])];
  const selected = choices.find(p => p.isRabby) ?? choices.find(p => p.isMetaMask) ?? choices[0];
  if (!selected) throw new UserError('No wallet found. Open this page with MetaMask or Rabby installed and unlocked.');
  return selected;
}
export function publicClient() {
  return createPublicClient({ chain, transport: http('/api/rpc', { timeout: 20000, retryCount: 0, fetchOptions: { cache: 'no-store' } }) });
}
export async function connect(p: Provider): Promise<Hex> {
  const accounts = await p.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts[0] || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new UserError('The wallet did not share an account.');
  if (Number(await p.request({ method: 'eth_chainId' })) !== chain.id) {
    // Visitors configure their own authorized RPC in the wallet. Never add a server key to a wallet.
    try { await p.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${chain.id.toString(16)}` }] }); }
    catch (error) {
      if ((error as { code?: number }).code === 4902) throw new UserError('Configure Rabdi (7794095) in your wallet using your own access key from hub.arkiv.network/access-keys, then reconnect.');
      throw error;
    }
  }
  await assertSession(p, accounts[0] as Hex);
  return accounts[0] as Hex;
}
export async function assertSession(p: Provider, account: Hex) {
  const accounts = await p.request({ method: 'eth_accounts' }) as string[];
  if (accounts[0]?.toLowerCase() !== account.toLowerCase() || Number(await p.request({ method: 'eth_chainId' })) !== chain.id) throw new UserError('The account or network changed. Reconnect on Rabdi before signing.');
}
export function confirmedRevertHash(error: unknown): Hex | undefined {
  return error instanceof EntityMutationError && error.txHash && error.message.startsWith(`Transaction ${error.txHash} reverted.`) ? error.txHash : undefined;
}
export function writer(p: Provider, account: Hex, rpc: ReturnType<typeof publicClient>, op: Operation, minimumGas: bigint, onSent: (hash: Hex) => void) {
  return createWalletClient({ account, chain, transport: custom({ request: async args => {
    if (args.method !== 'eth_sendTransaction') return rpc.transport.request(args);
    await assertSession(p, account);
    if (await rpc.getChainId() !== chain.id) throw new UserError('The RPC is not on Rabdi.');
    const tx = (args.params as [{ from?: string; to?: Hex; data?: Hex; value?: Hex }])[0];
    if (tx.from?.toLowerCase() !== account.toLowerCase() || tx.to?.toLowerCase() !== '0x4400000000000000000000000000000000000044' || !tx.data || BigInt(tx.value ?? 0) !== 0n) throw new UserError('Unexpected entity transaction.');
    const estimate = await estimateGas(rpc, { account, to: tx.to, data: tx.data, value: 0n, blockTag: 'latest' });
    const head = await rpc.getBlock({ blockTag: 'latest' });
    const gas = [1_000_000n, minimumGas, 2n * estimate].reduce((a, b) => a > b ? a : b);
    if (estimate <= 0n || gas > head.gasLimit / 2n) throw new UserError('This write exceeds the safe gas budget. Use a smaller note.');
    const gasPrice = await getGasPrice(rpc);
    const nonce = await rpc.getTransactionCount({ address: account, blockTag: 'latest' });
    await assertSession(p, account); op.gas = gas;
    const hash = await p.request({ method: 'eth_sendTransaction', params: [{ ...tx, gas: `0x${gas.toString(16)}`, gasPrice: `0x${gasPrice.toString(16)}`, nonce: `0x${nonce.toString(16)}` }] });
    if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new UserError('No transaction hash. Check before retrying.');
    op.hash = hash as Hex; onSent(hash as Hex); return hash;
  } }, { retryCount: 0 }) });
}
