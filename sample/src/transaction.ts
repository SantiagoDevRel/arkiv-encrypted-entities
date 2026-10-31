import type { Hex } from 'viem';

export interface Operation {
  phase: 'idle' | 'sending' | 'submitted' | 'confirmed' | 'uncertain' | 'failed';
  attempts: number;
  hash?: Hex;
  gas?: bigint;
}
/** Private, page-memory identity: equivalent hex casing cannot bypass the operation guard. Never persist or publish it. */
export async function operationIdentity(account: string, secret: string, note: Uint8Array): Promise<string> {
  const input = new TextEncoder().encode(JSON.stringify([account.toLowerCase(), secret.toLowerCase(), Array.from(note)]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', input)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export class WriteOutcome extends Error {
  readonly code: 'PENDING' | 'DISAGREES' | 'UNCERTAIN' | 'REVERTED' | 'BLOCKED';
  readonly hash?: Hex;
  constructor(code: WriteOutcome['code'], hash?: Hex) {
    super(`${code === 'PENDING' ? 'Confirmation pending' : code === 'DISAGREES' ? 'Receipt disagrees' : code === 'REVERTED' ? 'Transaction reverted' : 'Check before retrying'}.${hash ? ` Transaction: ${hash}.` : ''} Check wallet activity and the explorer. This operation cannot be sent again.`);
    this.code = code; this.hash = hash;
  }
}
type Receipt = { status: 'success' | 'reverted'; gasUsed: bigint };
interface Dependencies<T extends { txHash: Hex }> {
  send: (minimumGas: bigint) => Promise<T>;
  receipt: (hash: Hex) => Promise<Receipt | null>;
  confirmedRevertHash: (error: unknown) => Hex | undefined;
  headGasLimit: () => Promise<bigint>;
}
/** Keep one instance per user operation, across clicks. Never reset a submitted or uncertain operation. */
export async function submitOperation<T extends { txHash: Hex }>(op: Operation, deps: Dependencies<T>): Promise<T> {
  if (op.phase !== 'idle') throw new WriteOutcome('BLOCKED', op.hash);
  op.phase = 'sending'; // Guard BEFORE the first network call.
  let minimumGas = 1_000_000n;
  while (op.attempts < 2) {
    op.attempts++;
    let result: T;
    try { result = await deps.send(minimumGas); }
    catch (error) {
      const hash = deps.confirmedRevertHash(error);
      if (!hash) { op.phase = 'uncertain'; throw new WriteOutcome('UNCERTAIN', op.hash); }
      op.hash = hash;
      const receipt = await deps.receipt(hash).catch(() => null);
      if (!receipt || receipt.status !== 'reverted') { op.phase = 'uncertain'; throw new WriteOutcome('UNCERTAIN', hash); }
      if (op.attempts === 1 && op.gas && receipt.gasUsed === op.gas) {
        minimumGas = op.gas * 2n;
        const cap = await deps.headGasLimit().catch(() => 0n);
        if (minimumGas <= cap / 2n) continue; // send must also re-estimate at latest and enforce this cap.
      }
      op.phase = 'failed'; throw new WriteOutcome('REVERTED', hash);
    }
    op.hash = result.txHash;
    op.phase = 'submitted'; // SDK success is irrevocable, even when an independent receipt disagrees.
    const receipt = await deps.receipt(result.txHash).catch(() => null);
    if (!receipt) throw new WriteOutcome('PENDING', op.hash);
    if (receipt.status !== 'success') throw new WriteOutcome('DISAGREES', op.hash);
    op.phase = 'confirmed';
    return result;
  }
  op.phase = 'failed'; throw new WriteOutcome('BLOCKED', op.hash);
}
