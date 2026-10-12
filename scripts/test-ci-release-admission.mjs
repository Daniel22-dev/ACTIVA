#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {REPOSITORY,REQUIRED_CHECKS,validateRun,latestRun,validateJobs,validateArtifacts,validateProtection,validateTrigger,validateReceipt} from './ci-release-admission.mjs';
const sha='a'.repeat(40),different='b'.repeat(40);
const mainRun=(id)=>({id,run_attempt:1,head_sha:sha,head_branch:'main',event:'push',
 status:'completed',conclusion:'success',repository:{full_name:REPOSITORY},head_repository:{full_name:REPOSITORY}});
const run=mainRun(11111),axeRun=mainRun(22222);
const goodRules=['deletion','non_fast_forward','pull_request'].map(type=>({type}));
goodRules.push({type:'required_status_checks',parameters:{required_status_checks:REQUIRED_CHECKS.map(context=>({context,integration_id:15368}))}});
const goodJob={jobs:[{id:3001,run_id:run.id,name:'p5-release-gate',status:'completed',conclusion:'success',head_sha:sha}]};
const archive=(name,id,source=run)=>({name,id,expired:false,size_in_bytes:1500,workflow_run:{id:source.id,head_sha:source.head_sha}});
const goodArtifacts={artifacts:[archive('p5-r2-'+sha,401),archive('garp27-foundation-'+sha,402)]};
const receipt={
 schema:'activa-release-admission-v1',status:'ADMITTED',repository:REPOSITORY,sourceSha:sha,
 releaseRunId:'123456',releaseRunAttempt:'1',requiredContexts:[...REQUIRED_CHECKS],
 certifications:[
 {kind:'p5',runId:run.id,attempt:1,jobId:3001,artifacts:[{name:'p5-r2-'+sha,id:401,sizeBytes:1500},{name:'garp27-foundation-'+sha,id:402,sizeBytes:1500}]},
 {kind:'axe',runId:axeRun.id,attempt:1,jobId:3002,artifacts:[{name:'axe-p5-r2-'+sha,id:403,sizeBytes:1500}]}
 ],verifiedAt:'2026-10-12T12:00:00Z'
};
const ctx={sha,runId:'123456',attempt:'1'};
let checks=0;
function yes(fn){fn();checks++}
function no(fn,pattern){assert.throws(fn,pattern);checks++}
yes(()=>assert.equal(validateRun(run,'p5',sha).id,run.id));
yes(()=>assert.equal(latestRun([mainRun(10),mainRun(11)],'p5',sha).id,11));
no(()=>validateRun({...run,head_sha:different},'p5',sha),/successful/);
no(()=>validateRun({...run,event:'workflow_dispatch'},'p5',sha),/successful/);
no(()=>validateRun({...run,head_branch:'candidate'},'p5',sha),/successful/);
no(()=>validateRun({...run,status:'in_progress'},'p5',sha),/successful/);
no(()=>validateRun({...run,conclusion:'failure'},'p5',sha),/successful/);
no(()=>validateRun({...run,head_repository:{full_name:'foreign/repo'}},'p5',sha),/untrusted/);
no(()=>validateRun({...run,run_attempt:0},'p5',sha),/successful/);
no(()=>latestRun([],'axe',sha),/absent/);
no(()=>latestRun([mainRun(11),{...mainRun(12),conclusion:'cancelled'}],'p5',sha),/successful/);
yes(()=>assert.equal(validateJobs(goodJob,run,'p5-release-gate'),3001));
no(()=>validateJobs({jobs:[]},run,'p5-release-gate'),/independently/);
no(()=>validateJobs({jobs:[{...goodJob.jobs[0],conclusion:'skipped'}]},run,'p5-release-gate'),/independently/);
no(()=>validateJobs({jobs:[{...goodJob.jobs[0],head_sha:different}]},run,'p5-release-gate'),/independently/);
yes(()=>assert.equal(validateArtifacts(goodArtifacts,run,['p5-r2-'+sha,'garp27-foundation-'+sha]).length,2));
no(()=>validateArtifacts({artifacts:[goodArtifacts.artifacts[0]]},run,['p5-r2-'+sha,'garp27-foundation-'+sha]),/missing/);
no(()=>validateArtifacts({artifacts:[...goodArtifacts.artifacts,goodArtifacts.artifacts[0]]},run,['p5-r2-'+sha]),/duplicate/);
no(()=>validateArtifacts({artifacts:[{...goodArtifacts.artifacts[0],expired:true}]},run,['p5-r2-'+sha]),/untrusted/);
no(()=>validateArtifacts({artifacts:[{...goodArtifacts.artifacts[0],workflow_run:{id:11111,head_sha:different}}]},run,['p5-r2-'+sha]),/untrusted/);
no(()=>validateArtifacts({artifacts:[{...goodArtifacts.artifacts[0],size_in_bytes:0}]},run,['p5-r2-'+sha]),/untrusted/);
yes(()=>assert.deepEqual(validateProtection(goodRules),REQUIRED_CHECKS));
no(()=>validateProtection(goodRules.filter(x=>x.type!=='non_fast_forward')),/missing mandatory rule/);
no(()=>validateProtection(goodRules.map(x=>x.type==='required_status_checks'?{...x,parameters:{required_status_checks:[]}}:x)),/missing trusted/);
no(()=>validateProtection(goodRules.map(x=>x.type==='required_status_checks'?{...x,parameters:{required_status_checks:x.parameters.required_status_checks.map(z=>({...z,integration_id:1}))}}:x)),/missing trusted/);
const event={action:'completed',repository:{full_name:REPOSITORY},workflow_run:{id:run.id,head_sha:sha,event:'push',head_branch:'main',conclusion:'success'}};
yes(()=>validateTrigger('workflow_run',event,sha,run,'refs/heads/main'));
no(()=>validateTrigger('workflow_run',{...event,workflow_run:{...event.workflow_run,id:999}},sha,run,'refs/heads/main'),/stale/);
no(()=>validateTrigger('workflow_run',{...event,action:'requested'},sha,run,'refs/heads/main'),/stale/);
yes(()=>validateTrigger('workflow_dispatch',{repository:{full_name:REPOSITORY}},sha,run,'refs/heads/main'));
no(()=>validateTrigger('workflow_dispatch',{repository:{full_name:REPOSITORY}},sha,run,'refs/heads/candidate'),/main-only/);
no(()=>validateTrigger('push',event,sha,run,'refs/heads/main'),/untrusted/);
no(()=>validateTrigger('workflow_run',{...event,repository:{full_name:'other/repo'}},sha,run,'refs/heads/main'),/repository/);
yes(()=>assert.equal(validateReceipt(receipt,ctx).status,'ADMITTED'));
no(()=>validateReceipt({...receipt,sourceSha:different},ctx),/binding/);
no(()=>validateReceipt({...receipt,releaseRunId:'123'},ctx),/binding/);
no(()=>validateReceipt({...receipt,requiredContexts:['p5-release-gate']},ctx),/binding/);
no(()=>validateReceipt({...receipt,certifications:receipt.certifications.slice(0,1)},ctx),/binding/);
no(()=>validateReceipt({...receipt,certifications:[{...receipt.certifications[0],jobId:0},receipt.certifications[1]]},ctx),/independent/);
no(()=>validateReceipt({...receipt,verifiedAt:'not-a-date'},ctx),/admission time/);
const deploy=fs.readFileSync(path.join(process.cwd(),'.github/workflows/deploy.yml'),'utf8');
for(const cmd of ['npm run qa:release','npm run qa:p5:ci','npm run qa:garp27:foundation','node scripts/ci-evidence.mjs verify-stage LIVE-PUBLIC-PAGES','node scripts/ci-release-admission.mjs check']) {
 yes(()=>assert(deploy.includes(cmd),'Mandatory release gate missing: '+cmd));
}
const qaStart=deploy.indexOf('npm run qa:release');
const attestation=deploy.indexOf('Refresh P2.3 exact-SHA admission after QA workspace reset');
const admissionAfter=deploy.indexOf('node scripts/ci-release-admission.mjs check',attestation);
const evidenceCapture=deploy.indexOf('node scripts/ci-evidence.mjs capture release');
const browserBackup=deploy.indexOf('Preserve pinned browser provenance outside QA workspace');
const browserRestore=deploy.indexOf('Restore browser provenance after QA workspace reset');
yes(()=>assert(qaStart>0&&attestation>qaStart&&admissionAfter>attestation&&evidenceCapture>admissionAfter,'Admission receipt would be deleted by QA workspace reset'));
yes(()=>assert(browserBackup>0&&browserBackup<qaStart&&browserRestore>qaStart&&browserRestore<attestation,'Chromium provenance must survive QA workspace reset'));
console.log(JSON.stringify({status:'PASS',checks,scope:'P2.3 exact-SHA GitHub admission, independent jobs, artifacts, main policy, manual bypass, receipt and mandatory LIVE gates'}));
