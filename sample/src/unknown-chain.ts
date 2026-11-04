/**
 * EIP-3326: 4902 means the wallet does not know the chain. MetaMask Mobile wraps it as -32603 with
 * `data.originalError.code` (or `originalError.code`) 4902, or only says "Unrecognized chain ID".
 * Any other error, including an unrelated -32603, is not an unknown chain.
 */
export function isUnknownChainError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const failure = error as { code?: unknown; message?: unknown; originalError?: { code?: unknown } | null; data?: { originalError?: { code?: unknown } | null } | null };
  if (failure.code === 4902 || failure.originalError?.code === 4902 || failure.data?.originalError?.code === 4902) return true;
  return failure.code === -32603 && typeof failure.message === 'string' && /unrecogni[sz]ed chain id/i.test(failure.message);
}
