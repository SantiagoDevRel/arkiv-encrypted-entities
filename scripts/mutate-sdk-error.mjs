import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'sdk-error-mutation-'));
try{
 for(const dir of ['dist','test','sample/src'])fs.cpSync(dir,path.join(stage,dir),{recursive:true});
 fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({private:true,type:'module',dependencies:{'@arkiv-network/sdk':'1.0.1',viem:'2.56.3'}}));
 const install=spawnSync('npm',['install','--ignore-scripts','--no-audit','--no-fund'],{cwd:stage,encoding:'utf8'});assert.equal(install.status,0,install.stdout+install.stderr);
 const file=path.join(stage,'sample/src/wallet.ts'),original=fs.readFileSync(file,'utf8');
 const changed=original.replace('error.txHash && /^0x[0-9a-fA-F]{64}$/.test(error.txHash)','error.txHash && error.message.startsWith(`Transaction ${error.txHash} reverted.`)');assert.notEqual(changed,original);fs.writeFileSync(file,changed);
 const env={...process.env};delete env.NODE_TEST_CONTEXT;
 const result=spawnSync(process.execPath,['--test','--test-name-pattern=sample retry','test/sdk-compatibility.test.mjs'],{cwd:stage,encoding:'utf8',env});
 assert.equal(result.status,1,result.stdout+result.stderr);assert.match(result.stdout,/must recognize the typed gas-exhaustion hash/);assert.match(result.stdout,/(?:#|ℹ) fail 1/);assert.doesNotMatch(result.stdout+result.stderr,/ERR_MODULE_NOT_FOUND|SyntaxError/);
 fs.mkdirSync('.sdk101',{recursive:true});fs.writeFileSync('.sdk101/old-error-mutation.log',result.stdout+result.stderr);
 console.log(JSON.stringify({sdkErrorMutation:true,oldMessageMatcherRejected:true,sdk:'1.0.1',expectedFailures:1}));
}finally{fs.rmSync(stage,{recursive:true});}
