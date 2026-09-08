import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPublicClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { custom } from 'viem';
globalThis.window = new EventTarget();
const { connect, writer, assertSession } = await import('../src/wallet.ts');
const account = '0x1111111111111111111111111111111111111111';
const target = '0x4400000000000000000000000000000000000044';
const hash = '0x' + 'ab'.repeat(32);
function fixture({ chain=7738577, walletAccount=account, rpcChain=7738577, reject=false }={}) {
  const sent=[], reads=[];
  const provider = { request: async args => {
    if(args.method==='eth_requestAccounts' && reject) throw {code:4001};
    if(args.method==='eth_accounts'||args.method==='eth_requestAccounts') return [walletAccount];
    if(args.method==='eth_chainId') return '0x'+chain.toString(16);
    if(args.method==='eth_sendTransaction') {sent.push(args);return hash;}
    throw new Error('Wallet must not handle SDK read '+args.method);
  }};
  const rpc=createPublicClient({chain:tiramisu,transport:custom({request:async args=>{
    reads.push(args.method);
    if(args.method==='eth_chainId')return '0x'+rpcChain.toString(16);
    if(args.method==='eth_estimateGas')return '0x10000';
    if(args.method==='eth_getTransactionReceipt')return {status:'0x1'};
    throw new Error('Unexpected read '+args.method);
  }},{retryCount:0})});
  const client=writer(provider,account,rpc,()=>{});
  return {provider,client,sent,reads};
}
test('SDK receipt reads use the explicit RPC rather than the injected wallet',async()=>{
  const f=fixture();const result=await f.client.transport.request({method:'eth_getTransactionReceipt',params:[hash]});
  assert.equal(result.status,'0x1');assert.deepEqual(f.reads,['eth_getTransactionReceipt']);assert.equal(f.sent.length,0);
});
test('valid entity request estimates gas and sends once with a buffer',async()=>{
  const f=fixture();await f.client.transport.request({method:'eth_sendTransaction',params:[{from:account,to:target,data:'0x1234',value:'0x0'}]});
  assert.equal(f.sent.length,1);assert.equal(f.sent[0].params[0].gas,'0x13334');assert.deepEqual(f.reads,['eth_chainId','eth_estimateGas']);
});
for(const options of [{chain:1},{walletAccount:target},{rpcChain:1}]) {
  test('wrong wallet account or wallet/RPC network prevents send '+JSON.stringify(options),async()=>{
    const f=fixture(options);
    await assert.rejects(f.client.transport.request({method:'eth_sendTransaction',params:[{from:account,to:target,data:'0x1234'}]}));
    assert.equal(f.sent.length,0);
  });
}
for(const tx of [{from:target,to:target,data:'0x1234'},{from:account,to:account,data:'0x1234'},{from:account,to:target},{from:account,to:target,data:'0x1234',value:'0x1'}]) {
  test('rejects unexpected transaction '+JSON.stringify(tx),async()=>{
    const f=fixture();await assert.rejects(f.client.transport.request({method:'eth_sendTransaction',params:[tx]}));assert.equal(f.sent.length,0);
  });
}
test('wallet rejection propagates, with no send',async()=>{
  const f=fixture({reject:true});await assert.rejects(connect(f.provider),{code:4001});assert.equal(f.sent.length,0);
});
test('connected Tiramisu session validates',async()=>{const f=fixture();assert.equal(await connect(f.provider),account);await assertSession(f.provider,account);});

for (const missing of [false, true]) {
  test(`connection switches to Tiramisu automatically (missing network: ${missing})`, async () => {
    let chain = 1, added = false;
    const calls = [];
    const p = { request: async args => {
      calls.push(args);
      if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') return [account];
      if (args.method === 'eth_chainId') return `0x${chain.toString(16)}`;
      if (args.method === 'wallet_switchEthereumChain') {
        assert.deepEqual(args.params, [{ chainId: '0x7614d1' }]);
        if (missing && !added) throw { code: 4902 };
        chain = 7738577; return null;
      }
      if (args.method === 'wallet_addEthereumChain') {
        assert.equal(args.params[0].chainId, '0x7614d1');
        assert.deepEqual(args.params[0].rpcUrls, tiramisu.rpcUrls.default.http);
        added = true; return null;
      }
      throw Error('Unexpected wallet request');
    } };
    assert.equal(await connect(p), account);
    assert.equal(chain, 7738577);
    assert.equal(added, missing);
    assert.equal(calls.some(c => c.method === 'eth_sendTransaction'), false);
  });
}

test('rejecting the network switch never returns a connected session', async () => {
  const p = { request: async ({ method }) => {
    if (method === 'eth_requestAccounts') return [account];
    if (method === 'eth_chainId') return '0x1';
    if (method === 'wallet_switchEthereumChain') throw { code: 4001 };
    throw Error('Unexpected request after rejected switch');
  } };
  await assert.rejects(connect(p), { code: 4001 });
});
