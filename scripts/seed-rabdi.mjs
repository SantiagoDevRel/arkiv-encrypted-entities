import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createPublicClient, ExpirationTime } from '@arkiv-network/sdk';
import { rabdi } from '@arkiv-network/sdk/chains';
import { eq } from '@arkiv-network/sdk/query';
import { createWalletClient, http, hexToBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getGasPrice } from 'viem/actions';
import { CONTENT_TYPE, importKey, encryptBytes, decryptBytes } from '../dist/index.js';
import { Notes } from '../sample/src/model.ts';
import { submitOperation } from '../sample/src/transaction.ts';

// Only the authorized test wallet and independently backed-up test encryption key are accepted.
const required = ['ARKIV_ACCESS_KEY_A','TEST_ENCRYPTION_ADDRESS','TEST_ENCRYPTION_PRIVATE_KEY','ENCRYPTION_SEED_KEY'];
if (required.some(name => !process.env[name])) { console.error('Configure the ENCRYPTION test wallet, Key A and ENCRYPTION_SEED_KEY through the approved secret runner.'); process.exit(1); }
const rpcChain = rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY_A });
const account = privateKeyToAccount(process.env.TEST_ENCRYPTION_PRIVATE_KEY);
assert.equal(account.address.toLowerCase(), process.env.TEST_ENCRYPTION_ADDRESS.toLowerCase());
const rpc = createPublicClient({ chain: rpcChain, transport: http(undefined, { retryCount: 0, timeout: 20000, fetchOptions: { cache: 'no-store' } }) });
const signer = createWalletClient({ account, chain: rpcChain, transport: http(undefined, { retryCount: 0, timeout: 20000 }) });
const marker = 'rabdi-encryption-20261031-v1';
const journal = process.env.ENCRYPTION_SEED_JOURNAL ?? '.seed-rabdi.json';
const original = new TextEncoder().encode('Hello Arkiv. Only my encryption key can unlock this note.');
let queries = 0, writes = 0;
async function verify(entityKey) {
  const row = await rpc.getEntity(entityKey, Notes);
  assert.equal(row.$owner.toLowerCase(), account.address.toLowerCase());
  assert.equal(row.contentType.value, CONTENT_TYPE);
  const encrypted = hexToBytes(row.ciphertext.value);
  assert.deepEqual(await decryptBytes(await importKey(process.env.ENCRYPTION_SEED_KEY), encrypted), original);
  const wrong = crypto.getRandomValues(new Uint8Array(32));
  await assert.rejects(decryptBytes(await importKey(wrong), encrypted), { code: 'DECRYPTION_FAILED' });
  wrong.fill(0);
  const altered=encrypted.slice(); altered[altered.length-1]^=1;
  await assert.rejects(decryptBytes(await importKey(process.env.ENCRYPTION_SEED_KEY), altered), {code:'DECRYPTION_FAILED'});
  return row;
}
async function main() {
  assert.equal(await rpc.getChainId(), 7794095);
  queries++;
  const found = await rpc.select({ $key:true, $expiresAt:true }).from(Notes).where(eq('seed',marker)).ownedBy(account.address).limit(2).fetch();
  assert.ok(found.entities.length <= 1, 'Seed identity is not unique; inspect before writing.');
  if (found.entities[0]) {
    const row=await verify(found.entities[0].$key);
    console.log(JSON.stringify({status:'verified-existing',entityKey:row.$key,expiresAt:row.$expiresAt.toString(),writes,queries,wrongKeyRejected:true,tamperingRejected:true,bytesMatch:true})); return;
  }
  let previous;
  try { previous=JSON.parse(await readFile(journal,'utf8')); } catch(error) { if(error.code!=='ENOENT')throw Error('Seed journal cannot be read safely.'); }
  if(previous) {
    const head=await rpc.getBlockNumber({cacheTime:0});
    if(previous.phase!=='confirmed' || !(head >= BigInt(previous.expiresAt) || head < BigInt(previous.blockNumber))) throw Error('Previous operation needs reconciliation. No automatic resend.');
  }
  const ciphertext=await encryptBytes(await importKey(process.env.ENCRYPTION_SEED_KEY),original);
  const operation={phase:'idle',attempts:0};
  globalThis.window=new EventTarget();
  const { writer, confirmedRevertHash }=await import('../sample/src/wallet.ts');
  const p={request:async ({method,params})=>{
    if(method==='eth_accounts')return [account.address];
    if(method==='eth_chainId')return '0x76edaf';
    if(method==='eth_sendTransaction') {
      const tx=params[0]; writes++;
      return signer.sendTransaction({ account, chain:rpcChain, to:tx.to, data:tx.data, value:0n, gas:BigInt(tx.gas),gasPrice:BigInt(tx.gasPrice),nonce:Number(BigInt(tx.nonce)) });
    }
    throw Error('Unexpected signer request.');
  }};
  await writeFile(journal,JSON.stringify({phase:'sending',marker}),{mode:0o600});
  const created=await submitOperation(operation,{
    send:async minimum=>writer(p,account.address,rpc,operation,minimum,()=>{}).createEntity(Notes,{app:'encrypted-entities-sample',seed:marker,contentType:CONTENT_TYPE,ciphertext},{expiration:ExpirationTime.fromBlocks(7_883_970)},{gas:minimum,gasPrice:await getGasPrice(rpc)}),
    receipt:hash=>rpc.getTransactionReceipt({hash}).catch(()=>null),
    confirmedRevertHash,
    headGasLimit:async()=>(await rpc.getBlock({blockTag:'latest'})).gasLimit,
  });
  const receipt=await rpc.getTransactionReceipt({hash:created.txHash});
  assert.equal(receipt.status,'success');
  assert.ok(created.expiresAt-receipt.blockNumber <= 7_884_000n);
  await writeFile(journal,JSON.stringify({phase:'confirmed',entityKey:created.entityKey,txHash:created.txHash,blockNumber:receipt.blockNumber.toString(),expiresAt:created.expiresAt.toString()}),{mode:0o600});
  await verify(created.entityKey);
  queries++;
  const again=await rpc.select({$key:true}).from(Notes).where(eq('seed',marker)).ownedBy(account.address).limit(2).fetch();
  assert.equal(again.entities.length,1);assert.equal(again.entities[0].$key,created.entityKey);
  console.log(JSON.stringify({status:'created-and-verified',entityKey:created.entityKey,txHash:created.txHash,blockNumber:receipt.blockNumber.toString(),expiresAt:created.expiresAt.toString(),gasUsed:receipt.gasUsed.toString(),gasLimit:operation.gas.toString(),writes,queries,wrongKeyRejected:true,tamperingRejected:true,bytesMatch:true}));
}
main().catch(()=>{ console.error(JSON.stringify({status:'failed',writes,queries,error:'Seed verification failed. Inspect the operation journal and receipts before any retry; raw provider errors are deliberately omitted.'}));process.exitCode=1; });
