import assert from 'node:assert/strict';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Reproduce the restricted upload, rather than verifying against a complete source checkout.
const isolated=path.join(process.env.TMPDIR,'encryption-preview-upload');
await mkdir(isolated);
for(const name of ['dist','api','package.json','package-lock.json','vercel.json'])await cp(path.join('sample',name),path.join(isolated,name),{recursive:true});
const installed=spawnSync('npm',['ci','--omit=dev','--no-audit','--no-fund'],{cwd:isolated,encoding:'utf8'});
assert.equal(installed.status,0,'Restricted preview dependencies must install.');
const fallback=spawnSync('npm',['run','build'],{cwd:isolated,encoding:'utf8'});
assert.notEqual(fallback.status,0,'The source build must fail in this intentionally prebuilt upload.');
assert.ok(fallback.stdout.includes('tsc'),'Reproduced the unwanted npm build fallback.');
const config=JSON.parse(await readFile(path.join(isolated,'vercel.json'),'utf8'));
assert.equal(config.buildCommand,'','An explicit empty command prevents Vercel from falling back to npm run build.');
assert.equal(config.outputDirectory,'dist');
assert.ok((await readFile(path.join(isolated,'dist/index.html'))).length>0);
const imported=spawnSync('node',['--input-type=module','-e',"await import('./api/rpc.js')"],{cwd:isolated,encoding:'utf8'});
assert.equal(imported.status,0,'The server read endpoint and its exact SDK dependency must resolve.');
console.log(JSON.stringify({restrictedUpload:true,oldFallbackFailureReproduced:true,explicitEmptyBuildCommand:true,prebuiltFrontend:true,serverModuleResolves:true}));
