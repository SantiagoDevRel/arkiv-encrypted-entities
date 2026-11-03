import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as sdk from '@arkiv-network/sdk';
import {rabdi} from '@arkiv-network/sdk/chains';
import {defineSchema,bytes} from '@arkiv-network/sdk/schema';
import {custom,toHex,encodeErrorResult,parseAbi,ContractFunctionRevertedError} from 'viem';
import {rpcHarness,TEST_ACCOUNT} from './sdk-rpc-harness.mjs';
const version=JSON.parse(fs.readFileSync('node_modules/@arkiv-network/sdk/package.json')).version;
const current=version==='1.0.1';
const chain=rabdi({accessKey:'controlled-test'}),schema=defineSchema('sdk101.check',{data:bytes()});
function wallet(provider){return sdk.createWalletClient({chain,account:TEST_ACCOUNT,transport:custom(provider,{retryCount:0}),pollingInterval:1,cacheTime:0});}
test('SDK compatibility: over-maximum expiry never reaches the signer on the verified SDK',async()=>{
 const rpc=rpcHarness({revertAt:[1]});
 const abi=parseAbi(['error ExpiryBeyondMaxLifetime(uint64 target,uint64 currentBlock,uint64 maxLifetime)']);
 const data=encodeErrorResult({abi,errorName:'ExpiryBeyondMaxLifetime',args:[7884162n,43n,7884000n]});
 const provider={request:args=>{if(args.method==='eth_call')throw new ContractFunctionRevertedError({abi,data,functionName:'execute'});return rpc.request(args);}};
 await assert.rejects(wallet(provider).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(7884120)},{gas:1000000n,gasPrice:1n,nonce:0}),error=>{
  if(current){assert.ok(error instanceof sdk.InvalidExpiryError);assert.equal(error.txHash,undefined);}else{assert.ok(error instanceof sdk.EntityMutationError);assert.equal(error.txHash,rpc.transactions[0].hash);assert.match(error.message,/maximum lifetime|ExpiryBeyondMaxLifetime/);}
  return true;
 });
 assert.equal(rpc.transactions.length,current?0:1);
 console.log(JSON.stringify({sdk:version,expiryPreSend:current,sends:rpc.transactions.length}));
});
test('SDK compatibility: omitted gas padding and explicit gas preservation',async()=>{
 for(const estimate of [200000n,16000000n,20000000n]){
  const rpc=rpcHarness();
  const p={request:args=>args.method==='eth_estimateGas'?Promise.resolve(toHex(estimate)):rpc.request(args)};
  await wallet(p).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(3600)},{gasPrice:1n,nonce:0});
  const padded=estimate>2n**24n?estimate:estimate*125n/100n>2n**24n?2n**24n:estimate*125n/100n;
  if(current)assert.equal(BigInt(rpc.transactions[0].gas),padded);
  else{assert.equal(rpc.transactions[0].gas,undefined);assert.equal(rpc.requests.filter(r=>r.method==='eth_estimateGas').length,0);}
 }
 const rpc=rpcHarness();await wallet(rpc).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(3600)},{gas:1234567n,gasPrice:1n,nonce:0});
 assert.equal(BigInt(rpc.transactions[0].gas),1234567n);
});
test('SDK compatibility: authoritative gas-exhausted receipts retain the hash and typed failure',async()=>{
 const rpc=rpcHarness({revertAt:[1],exhaustGas:true});
 await assert.rejects(wallet(rpc).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(3600)},{gas:1000000n,gasPrice:1n,nonce:0}),error=>{
  assert.ok(error instanceof sdk.EntityMutationError);assert.equal(error.txHash,rpc.transactions[0].hash);
  if(current)assert.match(error.message,/ran out of gas/);return true;
 });assert.equal(rpc.transactions.length,1);
});
test('SDK compatibility: maximum helper uses the landing block without a subtraction',async()=>{
 if(!current){assert.equal(sdk.ExpirationTime.max,undefined);return;}
 assert.equal(sdk.MAX_LIFETIME,7884000n);
 const entity=await import('@arkiv-network/sdk/entity');assert.equal(entity.MAX_LIFETIME,sdk.MAX_LIFETIME);
 const rpc=rpcHarness();const result=await wallet(rpc).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.max()},{gas:1000000n,gasPrice:1n,nonce:0});
 assert.equal(result.expiresAt,43n+7884000n);
});

test('sample retry recognizes SDK gas exhaustion using typed hashes and authoritative receipts',async()=>{
 globalThis.window=new EventTarget();
 const {confirmedRevertHash}=await import('../sample/src/wallet.ts');
 const {submitOperation}=await import('../sample/src/transaction.ts');
 const probe=rpcHarness({revertAt:[1],exhaustGas:true});let failure;
 try{await wallet(probe).createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(3600)},{gas:1000000n,gasPrice:1n,nonce:0});}catch(error){failure=error;}
 assert.ok(failure instanceof sdk.EntityMutationError);
 assert.equal(confirmedRevertHash(failure),probe.transactions[0].hash,'must recognize the typed gas-exhaustion hash');
 const rpc=rpcHarness({revertAt:[1],exhaustGas:true}),client=wallet(rpc),op={phase:'idle',attempts:0};
 let sends=0;const deps={
  send:async minimum=>{op.gas=minimum;const nonce=sends++;try{return await client.createEntity(schema,{data:new Uint8Array([1])},{expiration:sdk.ExpirationTime.fromBlocks(3600)},{gas:minimum,gasPrice:1n,nonce});}catch(error){assert.equal(confirmedRevertHash(error),rpc.transactions[0].hash,'must recognize the typed gas-exhaustion hash');throw error;}},
  receipt:async hash=>{const raw=await rpc.request({method:'eth_getTransactionReceipt',params:[hash]});return raw?{status:raw.status==='0x1'?'success':'reverted',gasUsed:BigInt(raw.gasUsed)}:null;},
  confirmedRevertHash,headGasLimit:async()=>30000000n,
 };
 const result=await submitOperation(op,deps);assert.equal(result.txHash,rpc.transactions[1].hash);assert.equal(sends,2);assert.equal(op.phase,'confirmed');
 await assert.rejects(submitOperation(op,deps),{code:'BLOCKED'});assert.equal(sends,2);
 const hash=rpc.transactions[0].hash;
 assert.equal(confirmedRevertHash(new Error('Transaction '+hash+' ran out of gas')),undefined);
 assert.equal(confirmedRevertHash(new sdk.EntityMutationError('reverted',{txHash:'bad'})),undefined);
 for(const outcome of [null,{status:'success',gasUsed:1000000n},{status:'reverted',gasUsed:999999n}]){
  let count=0;const state={phase:'idle',attempts:0};
  await assert.rejects(submitOperation(state,{send:async()=>{count++;state.gas=1000000n;throw new sdk.EntityMutationError('changed diagnostic',{txHash:hash});},receipt:async()=>outcome,confirmedRevertHash,headGasLimit:async()=>30000000n}));assert.equal(count,1);
 }
 console.log(JSON.stringify({sdk:version,gasExhaustionRetry:2,noResendAfterSuccess:true,nonGasAndUncertainSends:1}));
});
