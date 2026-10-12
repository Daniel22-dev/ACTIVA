#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..'),script=path.join(root,'scripts','ci-evidence.mjs');
const t=fs.mkdtempSync(path.join(os.tmpdir(),'activa-ci-evidence-')),sha='a'.repeat(40);
const env={...process.env,GITHUB_ACTIONS:'false',CI_EVIDENCE_REQUIRED:'1',GHRAB_SOURCE_COMMIT:sha,GITHUB_RUN_ID:'123456',GITHUB_RUN_ATTEMPT:'1',GHRAB_APP_ID:'activity-builder',GHRAB_APP_VERSION:'0.5.30'};
function write(name,value){const p=path.join(t,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n')}
function run(...args){return spawnSync(process.execPath,[script,...args],{cwd:t,env,encoding:'utf8'})}
let checks=0;
function test(name,expected,...args){const r=run(...args);assert.equal(r.status===0,expected,name+': '+r.stdout+'\n'+r.stderr);checks++}
const names=['quality-report.json','qa-p3-browser-report.json','qa-p5-runtime-report.json','qa-p5-xss-sinks-report.json','qa-p5-axe-runtime-report.json','qa-p5-release-report.json','qa-p5-acceptance-report.json'];
function seed(){for(const n of names)write('dist/'+n,n==='quality-report.json'?{appId:'activity-builder',appVersion:'0.5.30',summary:{failed:0}}:{appId:'activity-builder',appVersion:'0.5.30',status:'passed',...(n==='qa-p5-release-report.json'?{axeRequired:true}:{})})}
try{
 write('package.json',{version:'0.5.30'});seed();
 test('capture',true,'capture','p5');fs.rmSync(path.join(t,'dist'),{recursive:true,force:true});
 test('persists after destructive build',true,'verify','p5');test('import',true,'import','p5');
 fs.appendFileSync(path.join(t,'qa-results/p5-snapshot/reports/qa-p5-runtime-report.json'),'tamper');
 test('tamper rejected',false,'verify','p5');seed();test('recapture',true,'capture','p5');
 fs.rmSync(path.join(t,'dist/qa-p5-acceptance-report.json'));test('missing report rejected',false,'capture','p5');
 assert.equal(fs.existsSync(path.join(t,'qa-results/p5-snapshot/manifest.json')),false);checks++;
 seed();write('dist/qa-p5-release-report.json',{appId:'activity-builder',appVersion:'0.5.30',status:'passed',axeRequired:false});
 test('axe not required rejected',false,'capture','p5');seed();test('capture restored',true,'capture','p5');
 write('qa-results/qa-report.json',{appId:'activity-builder',version:'0.5.30',verdict:'AUTOMATED_READY',automaticVerdict:'AUTOMATED_READY',counts:{FAIL:0}});
 write('qa-results/release-verdict.txt','AUTOMATED_READY\n');write('qa-results/.qa-state.json',{gates:{}});
 test('release QA capture',true,'capture','release');test('release QA verify',true,'verify','release');
 write('qa-results/release-snapshot/reports/release-verdict.txt','NOT_READY\n');test('release tamper rejected',false,'verify','release');
 console.log(JSON.stringify({status:'PASS',checks,suite:'ACTIVA P0 evidence snapshot negative tests'}));
}finally{fs.rmSync(t,{recursive:true,force:true})}
