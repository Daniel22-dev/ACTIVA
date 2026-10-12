#!/usr/bin/env node
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'activa-timing-test-'));const script=fileURLToPath(new URL('./ci-timing.mjs',import.meta.url));const env={...process.env,CI_TIMING_FILE:path.join(root,'marks.json'),RUNNER_TEMP:root,GITHUB_RUN_ID:'123',GITHUB_JOB:'test'};
function run(ok,...args){const r=spawnSync(process.execPath,[script,...args],{cwd:root,env,encoding:'utf8'});assert.equal(r.status===0,ok,r.stdout+'\n'+r.stderr)}
try{
 run(true,'start','npm-ci');run(false,'start','npm-ci');run(true,'stop','npm-ci');run(false,'stop','npm-ci');
 run(true,'start','p5');run(true,'report','test');let report=JSON.parse(fs.readFileSync(path.join(root,'qa-results/ci-timing-test.json')));assert.equal(report.status,'INCOMPLETE');assert.equal(report.phases.length,2);
 run(true,'stop','p5');run(true,'report','test');report=JSON.parse(fs.readFileSync(path.join(root,'qa-results/ci-timing-test.json')));assert.equal(report.status,'COMPLETE');assert(report.phases.every(x=>x.seconds>=0));
 run(false,'start','../escape');console.log(JSON.stringify({status:'PASS',cases:11,scope:'timing completeness and invalid-state tests'}));
}finally{fs.rmSync(root,{recursive:true,force:true})}
