import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/rpc.js';
function response() { return { code: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(c) {this.code=c;return this;}, json(v) {this.body=v;return this;} }; }
test('proxy fails closed without a key and does not log errors', async () => {
  const prior=process.env.ARKIV_ACCESS_KEY; delete process.env.ARKIV_ACCESS_KEY;
  try { const r=response(); await handler({method:'POST',headers:{host:'sample.example','content-type':'application/json'},body:{}},r); assert.equal(r.code,503); assert.equal(r.headers['Cache-Control'],'no-store, max-age=0'); }
  finally { if(prior!==undefined)process.env.ARKIV_ACCESS_KEY=prior; }
});
test('proxy rejects transactions, arbitrary queries, batches, and historical state before fetching', async () => {
  const prior=process.env.ARKIV_ACCESS_KEY; process.env.ARKIV_ACCESS_KEY='fixture-only';
  try {
    for(const body of [{method:'eth_sendRawTransaction',params:['0xab']},{method:'arkiv_query',params:['anything']},[],{method:'eth_getBalance',params:['0x'+'11'.repeat(20),'finalized']}]) {
      const r=response();await handler({method:'POST',headers:{host:'sample.example','content-type':'application/json'},body},r);assert.equal(r.code,400);
    }
  } finally { if(prior===undefined)delete process.env.ARKIV_ACCESS_KEY; else process.env.ARKIV_ACCESS_KEY=prior; }
});
