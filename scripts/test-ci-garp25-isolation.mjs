#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const testScript=path.join(root,'security/garp25/tools/selftest-garp251.mjs');
const cases=[
  ['without-parent-sha',null],
  ['with-parent-sha','a'.repeat(40)],
  ['with-different-parent-sha','b'.repeat(40)]
];
for(const [name,sha] of cases){
 const env={...process.env,
  GHRAB_SOURCE_REPOSITORY:'Daniel22-dev/ACTIVA',
  GHRAB_SOURCE_DELTA:'synthetic-live',
  GHRAB_SOURCE_PACKAGE_SHA256:'c'.repeat(64),
  GHRAB_BUILDER_ID:'github-actions'};
 if(sha)env.GHRAB_SOURCE_COMMIT=sha;else delete env.GHRAB_SOURCE_COMMIT;
 const result=spawnSync(process.execPath,[testScript],{cwd:root,env,encoding:'utf8',timeout:90000,maxBuffer:5*1024*1024});
 assert.equal(result.status,0,name+' should be all PASS: '+result.stderr+'\n'+result.stdout.slice(-3500));
 const json=JSON.parse(result.stdout.trim());
 assert.equal(json.status,'PASS',name);
 assert.equal(json.checks,104,name);
 assert.equal(json.passed,104,name);
 assert.deepEqual(json.failed,[],name);
 console.log('ACTIVA GARP25 isolated negative fixtures PASS: '+name+' (104/104)');
}
console.log(JSON.stringify({status:'PASS',cases:cases.length,checks:312,scope:'GARP 2.5.1 synthetic local builder remains missing source under global LIVE SHA'}));
