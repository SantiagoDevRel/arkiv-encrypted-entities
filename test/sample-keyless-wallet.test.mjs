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

test('sample and package copy never tell users to put an access key in their wallet', async () => {
  const [html, readme, agents, rootReadme, rootAgents] = await Promise.all(['../sample/index.html', '../sample/README.md', '../sample/AGENTS.md', '../README.md', '../AGENTS.md'].map(read));
  for (const text of [html, readme, agents, rootReadme, rootAgents]) {
    assert.doesNotMatch(text, /wallet with your own|own access key|own authorized (Rabdi |wallet )?RPC|own provider URL|visitors configure their own/i);
    assert.doesNotMatch(text, /rpc\.rabdi\.db-chain\.testnet\.arkiv\.network\/(?![`'"\s)])/, 'no keyed RPC URL literal');
  }
  for (const doc of [readme, agents, rootReadme, rootAgents]) assert.match(doc, /https:\/\/rpc\.rabdi\.db-chain\.testnet\.arkiv\.network`/);
  assert.match(html, /keyless public RPC/);
});
