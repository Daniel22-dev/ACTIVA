#!/usr/bin/env node
// ACTIVA P2.3. Read-only, fail-closed GitHub release admission.
// Independent P5/axe checks and their artifacts MUST be green for the exact
// live main SHA. This DOES NOT reuse/skip any deploy P5 or GARP tests.
import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

export const REPOSITORY='Daniel22-dev/ACTIVA';
export const REQUIRED_CHECKS=Object.freeze(['candidate-to-main','p5-release-gate','axe']);
export const RECEIPT='qa-results/ci-release-admission.json';
const SHA=/^[0-9a-f]{40}$/;
const safeId=x=>Number.isSafeInteger(x)&&x>0;
function fail(message){throw Error('ACTIVA RELEASE ADMISSION FAIL: '+message)}
function positive(x){return Number.isInteger(Number(x))&&Number(x)>0}
export function validateRun(run,kind,sha) {
 if(!['p5','axe'].includes(kind)||!SHA.test(String(sha)))fail('invalid source identity');
 if(!run||!safeId(run.id)||!positive(run.run_attempt)||run.head_sha!==sha||run.head_branch!=='main'||run.event!=='push'||run.status!=='completed'||run.conclusion!=='success')fail(kind+' is not an exact-SHA successful main push run');
 if(run.repository?.full_name!==REPOSITORY||run.head_repository?.full_name!==REPOSITORY)fail(kind+' untrusted repository origin');
 return run;
}
export function latestRun(runs,kind,sha) {
 if(!Array.isArray(runs))fail(kind+' missing workflow runs');
 const match=runs.filter(x=>x.head_sha===sha&&x.head_branch==='main'&&x.event==='push')
  .sort((a,b)=>Number(b.id)-Number(a.id));
 if(!match.length)fail(kind+' main-push certification absent for source SHA');
 // Do not use an older GREEN to override the newest failed/running attempt.
 return validateRun(match[0],kind,sha);
}
export function validateJobs(data,run,jobName) {
 if(!Array.isArray(data?.jobs)||!safeId(run.id))fail('missing job provenance');
 const match=data.jobs.filter(j=>j.name===jobName);
 if(match.length!==1||match[0].status!=='completed'||match[0].conclusion!=='success'||
   (match[0].run_id!=null&&match[0].run_id!==run.id)||
   (match[0].head_sha!=null&&match[0].head_sha!==run.head_sha))fail(jobName+' job did not independently pass');
 return match[0].id;
}
export function validateArtifacts(data,run,names) {
 if(!Array.isArray(data?.artifacts)||!Array.isArray(names))fail('missing artifact metadata');
 return names.map(name=>{
  const list=data.artifacts.filter(a=>a.name===name);
  if(list.length!==1)fail('missing or duplicate immutable artifact '+name);
  const a=list[0];
  if(!safeId(a.id)||a.expired!==false||!(Number(a.size_in_bytes)>0)||
    a.workflow_run?.id!==run.id||a.workflow_run?.head_sha!==run.head_sha)fail('untrusted artifact '+name);
  return {name,id:a.id,sizeBytes:a.size_in_bytes};
 });
}
export function validateProtection(rules) {
 if(!Array.isArray(rules))fail('active main policy unreadable');
 for(const type of ['pull_request','required_status_checks','deletion','non_fast_forward']) {
  if(!rules.some(x=>x.type===type))fail('main missing mandatory rule '+type);
 }
 const entries=rules.filter(x=>x.type==='required_status_checks').flatMap(x=>x.parameters?.required_status_checks||[]);
 for(const context of REQUIRED_CHECKS) {
  if(!entries.some(x=>x.context===context&&x.integration_id===15368))fail('main missing trusted required status '+context);
 }
 return REQUIRED_CHECKS;
}
export function validateTrigger(eventName,event,sha,p5run,ref) {
 if(event?.repository?.full_name!==REPOSITORY)fail('wrong event repository');
 if(eventName==='workflow_run') {
  const trigger=event.workflow_run;
  if(event.action!=='completed'||!trigger||trigger.id!==p5run.id||trigger.head_sha!==sha||
    trigger.event!=='push'||trigger.head_branch!=='main'||trigger.conclusion!=='success')fail('stale or non-P5 workflow_run trigger');
 } else if(eventName==='workflow_dispatch') {
  if(ref!=='refs/heads/main')fail('manual admission is main-only');
 } else fail('untrusted GitHub event: '+eventName);
}
export function validateReceipt(receipt,ctx) {
 if(receipt?.schema!=='activa-release-admission-v1'||receipt.status!=='ADMITTED'||
  receipt.repository!==REPOSITORY||receipt.sourceSha!==ctx.sha||
  receipt.releaseRunId!==ctx.runId||receipt.releaseRunAttempt!==ctx.attempt||
  receipt.requiredContexts?.join(',')!==REQUIRED_CHECKS.join(',')||
  !Array.isArray(receipt.certifications)||receipt.certifications.length!==2)fail('release-admission receipt binding invalid');
 const cert=Object.fromEntries(receipt.certifications.map(x=>[x.kind,x]));
 for(const kind of ['p5','axe']){
  const item=cert[kind];
  if(!item||!safeId(item.runId)||!positive(item.attempt)||!safeId(item.jobId)||
    !Array.isArray(item.artifacts)||(kind==='p5'?item.artifacts.length!==2:item.artifacts.length!==1)||
    item.artifacts.some(x=>!safeId(x.id)||x.sizeBytes<=0))fail('receipt missing independent '+kind+' certification');
 }
 if(!Number.isFinite(Date.parse(receipt.verifiedAt||'')))fail('unparseable admission time');
 return receipt;
}
function environment() {
 const sha=String(process.env.GHRAB_SOURCE_COMMIT||'').toLowerCase();
 const runId=String(process.env.GITHUB_RUN_ID||'');
 const attempt=String(process.env.GITHUB_RUN_ATTEMPT||'');
 if(!SHA.test(sha)||!positive(runId)||!positive(attempt))fail('missing exact checkout/release run context');
 return {sha,runId,attempt};
}
const outFile=()=>path.join(process.cwd(),RECEIPT);
function save(receipt){const file=outFile();fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(receipt,null,2)+'\n');fs.renameSync(tmp,file)}
function load(){const file=outFile(),st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())fail('receipt not regular');return JSON.parse(fs.readFileSync(file,'utf8'))}
function url(route){return 'https://api.github.com/repos/'+REPOSITORY+route}
async function gh(route,token){
 const r=await fetch(url(route),{headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'ACTIVA-trusted-read-only-admission'},signal:AbortSignal.timeout(12000)});
 if(!r.ok)fail('GitHub read '+r.status+' '+route.split('?')[0]);
 return r.json();
}
async function main(){
 const [action]=process.argv.slice(2);
 const ctx=environment();
 if(action==='verify'){
  validateReceipt(load(),ctx);
  console.log('ACTIVA RELEASE ADMISSION receipt exact-SHA PASS');return;
 }
 if(action==='import'){
  const receipt=validateReceipt(load(),ctx),dir=path.join(process.cwd(),'qa-results/current');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'ci-release-admission.json'),JSON.stringify(receipt,null,2)+'\n');
  console.log('ACTIVA RELEASE ADMISSION imported immutable receipt');return;
 }
 if(action!=='check')fail('usage: check | verify | import');
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_REPOSITORY!==REPOSITORY)fail('GitHub-hosted ACTIVA only');
 const token=process.env.GH_TOKEN||'';
 if(!token)fail('GitHub read token missing');
 const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const eventName=process.env.GITHUB_EVENT_NAME;
 const branch=await gh('/branches/main',token);
 if(branch.commit?.sha!==ctx.sha||branch.protected!==true)fail('source is not latest protected main');
 const rules=await gh('/rules/branches/main',token);
 validateProtection(rules);
 const findRun=async(kind,workflow)=>{
  let last;
  for(let attempt=0;attempt<9;attempt++){
   const data=await gh('/actions/workflows/'+workflow+'/runs?branch=main&event=push&head_sha='+ctx.sha+'&per_page=100',token);
   try {return latestRun(data.workflow_runs,kind,ctx.sha)}
   catch(e){last=e;if(attempt===8||String(e.message).includes('untrusted repository origin'))throw e;await sleep(6000)}
  }
  throw last;
 };
 const p5=await findRun('p5','p5-release-gate.yml');
 validateTrigger(eventName,event,ctx.sha,p5,process.env.GITHUB_REF);
 const axe=await findRun('axe','axe-supplemental.yml');
 const certifications=[];
 for(const [kind,run,job,names] of [
  ['p5',p5,'p5-release-gate',['p5-r2-'+ctx.sha,'garp27-foundation-'+ctx.sha]],
  ['axe',axe,'axe',['axe-p5-r2-'+ctx.sha]]
 ]) {
  const [jobs,artifacts]=await Promise.all([
   gh('/actions/runs/'+run.id+'/jobs?per_page=100',token),
   gh('/actions/runs/'+run.id+'/artifacts?per_page=100',token)
  ]);
  certifications.push({kind,runId:run.id,attempt:run.run_attempt,
   jobId:validateJobs(jobs,run,job),artifacts:validateArtifacts(artifacts,run,names)});
 }
 const current=await gh('/branches/main',token);
 if(current.commit?.sha!==ctx.sha)fail('main moved during admission; obsolete release rejected');
 const receipt={schema:'activa-release-admission-v1',status:'ADMITTED',
   repository:REPOSITORY,sourceSha:ctx.sha,releaseRunId:ctx.runId,
   releaseRunAttempt:ctx.attempt,requiredContexts:[...REQUIRED_CHECKS],
   certifications,verifiedAt:new Date().toISOString()};
 validateReceipt(receipt,ctx);
 save(receipt);
 console.log('ACTIVA RELEASE ADMISSION PASS SHA '+ctx.sha+' P5 '+p5.id+' AXE '+axe.id);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 main().catch(e=>{console.error(e.stack||String(e));process.exitCode=1});
}
