#!/usr/bin/env node
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'activa-canonical-test-'));
const script=fileURLToPath(new URL('./ci-canonical.mjs',import.meta.url));
const env={...process.env,CI_EVIDENCE_REQUIRED:'1',GITHUB_ACTIONS:'false',GHRAB_SOURCE_COMMIT:'a'.repeat(40),GHRAB_BUILD_TIME:'2026-01-01T00:00:00.000Z'};
function run(ok,arg){const r=spawnSync(process.execPath,[script,arg],{cwd:root,env,encoding:'utf8'});assert.equal(r.status===0,ok,arg+': '+r.stdout+r.stderr)}
try{
 fs.mkdirSync(path.join(root,'dist'));for(const name of ['index.html','app.js','studio-manifest.json'])fs.writeFileSync(path.join(root,'dist',name),name);
 run(true,'capture');run(true,'verify');run(true,'emit');
 assert(fs.existsSync(path.join(root,'qa-results/current/ci-canonical.json')));
 fs.appendFileSync(path.join(root,'dist','app.js'),'tampered');run(false,'verify');
 fs.writeFileSync(path.join(root,'dist','app.js'),'app.js');run(true,'verify');
 const bad=JSON.parse(fs.readFileSync(path.join(root,'qa-results','ci-canonical.json'),'utf8'));bad.sourceSha='b'.repeat(40);fs.writeFileSync(path.join(root,'qa-results/ci-canonical.json'),JSON.stringify(bad));run(false,'verify');
 console.log(JSON.stringify({status:'PASS',cases:7,scope:'canonical SHA and byte identity fail-closed'}));
}finally{fs.rmSync(root,{recursive:true,force:true})}
