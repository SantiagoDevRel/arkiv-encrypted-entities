import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// A keyed Rabdi RPC URL (access key in the path) must never reach a wallet, the bundle, a URL or a QR.
// Behavior is covered by sample/test/wallet.test.mjs; this guard runs in the package CI.
const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('sample wallet code offers only the keyless Rabdi RPC', async () => {
  const wallet = await read('../sample/src/wallet.ts');
  assert.match(wallet, /RABDI_PUBLIC_RPC = 'https:\/\/rpc\.rabdi\.db-chain\.testnet\.arkiv\.network'/);
  assert.match(wallet, /rpcUrls: \[RABDI_PUBLIC_RPC\]/);
  assert.match(wallet, /rpcUrls: \{ default: \{ http: \[RABDI_PUBLIC_RPC\] \} \}/);
  assert.doesNotMatch(wallet, /access key from hub|own access key/i);
});

test('sample treats 4902 and MetaMask Mobile wrapped 4902 as an unknown chain, and nothing else', async () => {
  const { default: ts } = await import('typescript');
  const source = await read('../sample/src/unknown-chain.ts');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const { isUnknownChainError } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const internal = 'Internal JSON-RPC error.';
  for (const error of [
    { code: 4902 },
    { code: -32603, message: internal, data: { originalError: { code: 4902 } } },
    { code: -32603, message: internal, originalError: { code: 4902 } },
    { code: -32603, message: 'Unrecognized chain ID "0x76edaf". Try adding the chain using wallet_addEthereumChain first.' },
  ]) assert.equal(isUnknownChainError(error), true, JSON.stringify(error));
  for (const error of [
    undefined, null, 'Unrecognized chain ID', { code: -32603, message: internal }, { code: -32603 },
    { code: -32603, message: internal, data: { originalError: { code: 4001 } } }, { code: -32603, message: internal, data: null },
    { code: 4001, message: 'Unrecognized chain ID' }, { code: -32002 }, { code: '4902' },
  ]) assert.equal(isUnknownChainError(error), false, JSON.stringify(error));
  const wallet = await read('../sample/src/wallet.ts');
  assert.match(wallet, /if \(!isUnknownChainError\(error\)\) throw error;/);
  assert.doesNotMatch(wallet, /\.code !== 4902\) throw/);
});

test('sample and package copy never tell users to put an access key in their wallet', async () => {
  const [html, readme, agents, rootReadme, rootAgents] = await Promise.all(['../sample/index.html', '../sample/README.md', '../sample/AGENTS.md', '../README.md', '../AGENTS.md'].map(read));
  for (const text of [html, readme, agents, rootReadme, rootAgents]) {
    assert.doesNotMatch(text, /wallet with your own|own access key|own authorized (Rabdi |wallet )?RPC|own provider URL|visitors configure their own/i);
    assert.doesNotMatch(text, /rpc\.rabdi\.db-chain\.testnet\.arkiv\.network\/(?![`'"\s)])/, 'no keyed RPC URL literal');
  }
  for (const doc of [readme, agents, rootReadme, rootAgents]) assert.match(doc, /https:\/\/rpc\.rabdi\.db-chain\.testnet\.arkiv\.network`/);
  assert.match(html, /keyless public RPC/);
});
