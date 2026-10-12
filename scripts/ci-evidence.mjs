#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),qa=path.join(root,'qa-results'),stageRoot=path.join(qa,'current'),dist=path.join(root,'dist');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const p5=['quality-report.json','qa-p3-browser-report.json','qa-p5-runtime-report.json','qa-p5-xss-sinks-report.json','qa-p5-axe-runtime-report.json','qa-p5-release-report.json','qa-p5-acceptance-report.json'];
const release=['qa-report.json','release-verdict.txt','.qa-state.json'];
const ids=['build-pages','build-school','contracts','architecture','policy-mutations','mutations','auto-patch','legacy-garp25','platform'];
const strict=process.env.GITHUB_ACTIONS==='true'||process.env.CI_EVIDENCE_REQUIRED==='1';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function error(s){throw Error('CI-EVIDENCE FAIL: '+s)}
function read(p){let st;try{st=fs.lstatSync(p)}catch{error('missing '+p)}if(!st.isFile()||st.isSymbolicLink())error('not regular file '+p);return fs.readFileSync(p)}
function json(p){try{return JSON.parse(read(p).toString('utf8'))}catch(e){error('invalid JSON '+p+': '+e.message)}}
function ctx(){
 const sourceSha=String(process.env.GHRAB_SOURCE_COMMIT||process.env.GITHUB_SHA||'').toLowerCase();
 if(strict&&!/^[a-f0-9]{40}$/.test(sourceSha))error('source SHA missing');
 if(sourceSha&&!/^[a-f0-9]{40}$/.test(sourceSha))error('invalid SHA');
 if(process.env.GITHUB_ACTIONS==='true'){const r=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'});if(r.status!==0||r.stdout.trim().toLowerCase()!==sourceSha)error('checkout differs from source SHA')}
 const runId=String(process.env.GITHUB_RUN_ID||'local'),runAttempt=String(process.env.GITHUB_RUN_ATTEMPT||'1');
 if(strict&&(!/^\d+$/.test(runId)||!/^\d+$/.test(runAttempt)))error('run identity missing');
 return {sourceSha:sourceSha||null,runId,runAttempt};
}
function checkP5(name,obj){
 if(obj.appId&&obj.appId!=='activity-builder')error('wrong app in '+name);
 if(obj.appVersion&&obj.appVersion!==pkg.version)error('wrong version in '+name);
 if(typeof obj.summary?.failed==='number'&&obj.summary.failed!==0)error('failures in '+name);
 if(name==='quality-report.json'){if(!Number.isInteger(obj.summary?.failed)||obj.summary.failed!==0)error('quality failures or no summary')}
 else if(obj.status!=='passed')error('P5 report not passed: '+name);
 if(name==='qa-p5-release-report.json'&&obj.axeRequired!==true)error('axe not blocking');
}
function checkRelease(dir){
 const report=json(path.join(dir,'qa-report.json')),verdict=read(path.join(dir,'release-verdict.txt')).toString('utf8').trim();
 if(!['AUTOMATED_READY','READY','READY_WITH_MINOR_ISSUES'].includes(verdict)||report.verdict!==verdict||report.automaticVerdict!=='AUTOMATED_READY'||report.counts?.FAIL!==0||report.version!==pkg.version||(report.appId&&report.appId!=='activity-builder'))error('release QA not admitted');
 json(path.join(dir,'qa-state.json'));
}
function location(kind){if(!['p5','release'].includes(kind))error('invalid kind');return path.join(qa,kind+'-snapshot')}
function names(kind){return kind==='p5'?p5:release.map(x=>x==='.qa-state.json'?'qa-state.json':x)}
function capture(kind){
 const target=location(kind),tmp=target+'.tmp';fs.rmSync(tmp,{recursive:true,force:true});fs.rmSync(target,{recursive:true,force:true});
 try{
  fs.mkdirSync(path.join(tmp,'reports'),{recursive:true});const files=[];
  for(const name of (kind==='p5'?p5:release)){
   const actual=name==='.qa-state.json'?'qa-state.json':name,bytes=read(path.join(kind==='p5'?dist:qa,name));
   fs.writeFileSync(path.join(tmp,'reports',actual),bytes);files.push({name:actual,size:bytes.length,sha256:hash(bytes)});
   if(kind==='p5')checkP5(name,JSON.parse(bytes.toString('utf8')));
  }
  if(kind==='release')checkRelease(path.join(tmp,'reports'));
  const manifest={schema:'activa-ci-evidence-snapshot-v1',type:kind,appId:'activity-builder',appVersion:pkg.version,...ctx(),files};
  fs.writeFileSync(path.join(tmp,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.renameSync(tmp,target);
 }catch(e){fs.rmSync(tmp,{recursive:true,force:true});throw e}
 verify(kind);console.log('CI-EVIDENCE captured '+kind);
}
function verify(kind){
 const target=location(kind),m=json(path.join(target,'manifest.json'));
 const expected={schema:'activa-ci-evidence-snapshot-v1',type:kind,appId:'activity-builder',appVersion:pkg.version,...ctx()};
 for(const [k,v]of Object.entries(expected))if(m[k]!==v)error('snapshot '+kind+' '+k+' mismatch');
 const required=names(kind).sort(),rows=m.files||[];
 if(JSON.stringify(rows.map(x=>x.name).sort())!==JSON.stringify(required)||rows.length!==required.length)error('missing report in '+kind);
 const dir=path.join(target,'reports');if(JSON.stringify(fs.readdirSync(dir).sort())!==JSON.stringify(required))error('unexpected or missing snapshot report');
 for(const row of rows){const bytes=read(path.join(dir,row.name));if(bytes.length!==row.size||hash(bytes)!==row.sha256)error('SHA256 mismatch '+row.name);if(kind==='p5')checkP5(row.name,JSON.parse(bytes.toString('utf8')))}
 if(kind==='release')checkRelease(dir);
 console.log('CI-EVIDENCE verified '+kind);
}
function importSnap(kind){verify(kind);const target=path.join(stageRoot,kind);fs.rmSync(target,{recursive:true,force:true});fs.cpSync(location(kind),target,{recursive:true,dereference:false})}
const foundation=path.join(root,'audit','evidence','garp27-current');
function checkFoundation(){
 const s=json(path.join(foundation,'foundation-summary.json'));
 if(s.classification!=='GARP27_FOUNDATION_GATE'||s.garpVersion!=='2.7'||s.appId!=='activity-builder'||s.appVersion!==pkg.version||s.status!=='FOUNDATION_PASS_LIVE_NOT_TESTED'||s.summary?.failed!==0||s.steps?.length!==ids.length)error('GARP foundation did not pass');
 for(const id of ids){const step=s.steps.find(x=>x.id===id);if(!step?.pass||step.actualExit!==0)error('foundation step '+id);if(!read(path.join(foundation,id+'.log')).toString('utf8').includes('EXIT=0'))error('GARP log '+id)}
}
function importFoundation(){checkFoundation();const dst=path.join(stageRoot,'garp27');fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(dst,{recursive:true});for(const name of ['foundation-summary.json',...ids.map(x=>x+'.log')])fs.writeFileSync(path.join(dst,name),read(path.join(foundation,name)))}
function verifyStage(stage){
 if(!['PREP-VALIDATION','LIVE-PUBLIC-PAGES'].includes(stage))error('stage');
 verify('p5');checkFoundation();if(stage==='LIVE-PUBLIC-PAGES')verify('release');
 const e=json(path.join(root,'dist-pages','security-evidence-manifest.json')),i=json(path.join(root,'dist-pages','release-integrity.json'));
 if(e.sourceRevision!==ctx().sourceSha||i.sourceCommit!==ctx().sourceSha||i.releaseStage!==stage)error('release identity mismatch');
 const wanted=[...['manifest.json',...p5.map(x=>'reports/'+x)].map(x=>'p5/'+x),...['foundation-summary.json',...ids.map(x=>x+'.log')].map(x=>'garp27/'+x),...(stage==='LIVE-PUBLIC-PAGES'?['manifest.json',...names('release').map(x=>'reports/'+x)].map(x=>'release/'+x):[])];
 const index=new Map((e.files||[]).map(x=>[x.path,x]));
 for(const rel of wanted){const item=index.get(rel),bytes=read(path.join(stageRoot,rel));if(!item||item.sha256!==hash(bytes)||item.size!==bytes.length)error('release manifest missing/tampered '+rel)}
 console.log('CI-EVIDENCE verified stage '+stage+' ('+wanted.length+' files)');
}
try{
 const [action,kind]=process.argv.slice(2);
 if(action==='capture')capture(kind);
 else if(action==='verify')verify(kind);
 else if(action==='import'&&kind==='foundation')importFoundation();
 else if(action==='import')importSnap(kind);
 else if(action==='verify-stage')verifyStage(kind);
 else error('unsupported action');
}catch(e){console.error(e.stack||String(e));process.exit(1)}
