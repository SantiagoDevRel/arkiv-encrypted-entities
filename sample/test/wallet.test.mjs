import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = new EventTarget();
const { connect, writer, assertSession, chain } = await import('../src/wallet.ts');
test('SDK receipt polling does not request transaction replacement scans through the restricted proxy',()=>assert.equal(chain.supportsTransactionReplacementDetection,false));
const account = '0x1111111111111111111111111111111111111111';
const target = '0x4400000000000000000000000000000000000044';
const hash = '0x' + 'ab'.repeat(32);
function fixture({ chain=7794095, walletAccount=account, rpcChain=7794095, reject=false, estimate=100000n, headGas=30000000n }={}) {
  const sent=[], reads=[];
  const provider = { request: async args => {
    if(args.method==='eth_requestAccounts' && reject) throw {code:4001};
    if(args.method==='eth_accounts'||args.method==='eth_requestAccounts') return [walletAccount];
    if(args.method==='eth_chainId') return '0x'+chain.toString(16);
    if(args.method==='eth_sendTransaction') {sent.push(args);return hash;}
    throw new Error('Unexpected wallet request');
  }};
  const rpc={
    request:async args=>{if(args.method==='eth_estimateGas'){assert.equal(args.params[1],'latest');reads.push('estimate');return '0x'+estimate.toString(16);}if(args.method==='eth_gasPrice')return '0x3';throw Error('unexpected');},
    transport:{request:async args=>{reads.push(args.method);return {status:'0x1'};}},
    getChainId:async()=>rpcChain,
    estimateGas:async args=>{assert.equal(args.blockTag,'latest');reads.push('estimate');return estimate;},
    getBlock:async args=>{assert.equal(args.blockTag,'latest');return {gasLimit:headGas};},
    getGasPrice:async()=>3n,
    getTransactionCount:async args=>{assert.equal(args.blockTag,'latest');return 4;},
  };
  const op={phase:'sending',attempts:1};
  const client=writer(provider,account,rpc,op,1000000n,()=>{});
  return {provider,client,sent,reads,op};
}
test('SDK receipt reads use the server read proxy rather than the injected wallet',async()=>{
  const f=fixture();const result=await f.client.transport.request({method:'eth_getTransactionReceipt',params:[hash]});
  assert.equal(result.status,'0x1');assert.deepEqual(f.reads,['eth_getTransactionReceipt']);assert.equal(f.sent.length,0);
});
for(const [estimate,gas] of [[100000n,1000000n],[4904531n,9809062n]]) {
  test(`unsigned latest estimate ${estimate} uses twofold headroom, explicit price and latest nonce`,async()=>{
    const f=fixture({estimate});await f.client.transport.request({method:'eth_sendTransaction',params:[{from:account,to:target,data:'0x1234',value:'0x0'}]});
    assert.equal(f.sent.length,1);assert.equal(f.sent[0].params[0].gas,'0x'+gas.toString(16));assert.equal(f.sent[0].params[0].gasPrice,'0x3');assert.equal(f.sent[0].params[0].nonce,'0x4');assert.equal(f.op.gas,gas);
  });
}
for(const options of [{chain:1},{walletAccount:target},{rpcChain:1},{estimate:8000000n}]) {
  test('wrong wallet session/network or excessive gas prevents send '+String(options.estimate??options.chain??options.rpcChain??'account'),async()=>{
    const f=fixture(options);await assert.rejects(f.client.transport.request({method:'eth_sendTransaction',params:[{from:account,to:target,data:'0x1234'}]}));assert.equal(f.sent.length,0);
  });
}
for(const tx of [{from:target,to:target,data:'0x1234'},{from:account,to:account,data:'0x1234'},{from:account,to:target},{from:account,to:target,data:'0x1234',value:'0x1'}]) {
  test('rejects unexpected transaction '+JSON.stringify(tx),async()=>{
    const f=fixture();await assert.rejects(f.client.transport.request({method:'eth_sendTransaction',params:[tx]}));assert.equal(f.sent.length,0);
  });
}
test('wallet rejection propagates without sending',async()=>{const f=fixture({reject:true});await assert.rejects(connect(f.provider),{code:4001});assert.equal(f.sent.length,0);});
test('connected Rabdi session validates',async()=>{const f=fixture();assert.equal(await connect(f.provider),account);await assertSession(f.provider,account);});
test('unknown Rabdi network asks user to configure own wallet RPC, without exposing a server key',async()=>{
  const calls=[];
  const p={request:async args=>{calls.push(args);if(args.method==='eth_requestAccounts')return [account];if(args.method==='eth_chainId')return '0x1';if(args.method==='wallet_switchEthereumChain')throw {code:4902};throw Error('unexpected');}};
  await assert.rejects(connect(p),/Configure Rabdi/);assert.equal(calls.some(c=>c.method==='wallet_addEthereumChain'),false);
});
