import test from 'node:test';
import assert from 'node:assert/strict';
import { submitOperation, operationIdentity } from '../src/transaction.ts';
test('equivalent account/key casing retains an operation; distinct bytes, key or owner start a new one',async()=>{
  const account='0x'+'ab'.repeat(20),key='cd'.repeat(32),bytes=new Uint8Array([0,255]);
  const identity=await operationIdentity(account,key,bytes);
  assert.equal(await operationIdentity(account.toUpperCase(),key.toUpperCase(),bytes),identity);
  for(const args of [[account,key,new Uint8Array([0,254])],[account,'ef'.repeat(32),bytes],['0x'+'ef'.repeat(20),key,bytes]])assert.notEqual(await operationIdentity(...args),identity);
});
const hash = '0x' + 'ab'.repeat(32);
function fixture(kind) {
  const op = { phase: 'idle', attempts: 0 };
  let sends = 0;
  const deps = {
    send: async minimum => {
      sends++; op.gas = minimum; op.hash = hash;
      if (kind === 'uncertain') throw Error('timeout');
      if ((kind === 'gas' && sends === 1) || kind === 'nongas') throw { confirmedRevert: true, txHash: hash };
      return { txHash: hash };
    },
    receipt: async () => kind === 'null' ? null : { status: kind === 'disagree' || kind === 'nongas' || (kind === 'gas' && sends === 1) ? 'reverted' : 'success', gasUsed: kind === 'nongas' ? 900_000n : op.gas },
    confirmedRevertHash: e => e?.confirmedRevert ? e.txHash : undefined,
    headGasLimit: async () => 30_000_000n,
  };
  return { op, deps, sends: () => sends };
}
for (const [kind, count, code] of [['nongas', 1, 'REVERTED'], ['gas', 2, undefined], ['disagree', 1, 'DISAGREES'], ['null', 1, 'PENDING'], ['uncertain', 1, 'UNCERTAIN']]) {
  test(`persistent operation: ${kind}, exactly ${count} sends`, async () => {
    const f = fixture(kind);
    if (code) await assert.rejects(submitOperation(f.op, f.deps), { code });
    else assert.equal((await submitOperation(f.op, f.deps)).txHash, hash);
    await assert.rejects(submitOperation(f.op, f.deps), { code: 'BLOCKED' });
    assert.equal(f.sends(), count);
  });
}
test('simultaneous click is blocked before the first send completes', async () => {
  const f = fixture('null');
  const first = submitOperation(f.op, f.deps);
  await assert.rejects(submitOperation(f.op, f.deps), { code: 'BLOCKED' });
  await assert.rejects(first, { code: 'PENDING' }); assert.equal(f.sends(), 1);
});
