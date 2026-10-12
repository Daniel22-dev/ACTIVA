#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const [action,phase]=process.argv.slice(2);
const isPhase=s=>/^[a-z][a-z0-9-]{0,50}$/.test(String(s||''));
const runnerTemp=process.env.RUNNER_TEMP||os.tmpdir();
const runId=String(process.env.GITHUB_RUN_ID||'local');
const job=String(process.env.GITHUB_JOB||'job').replace(/[^a-z0-9-]/gi,'-');
const file=process.env.CI_TIMING_FILE||path.join(runnerTemp,'activa-ci-timing-'+runId+'-'+job+'.json');
const now=()=>Date.now();
function read(){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){if(e.code==='ENOENT')return {schema:'activa-ci-timing-v1',sourceSha:process.env.GHRAB_SOURCE_COMMIT||process.env.GITHUB_SHA||null,runId,job,phases:{}};throw e}}
function write(data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2)+'\n');fs.renameSync(tmp,file)}
function fail(message){console.error('CI TIMING FAIL: '+message);process.exit(1)}
if(action==='start'||action==='stop'){
 if(!isPhase(phase))fail('invalid phase name');const data=read();const entry=data.phases[phase];
 if(action==='start'){if(entry)fail('phase already started: '+phase);data.phases[phase]={startedAt:new Date().toISOString(),startMs:now()}}
 else{if(!entry||entry.finishedAt)fail('phase not open: '+phase);entry.endMs=now();if(entry.endMs<entry.startMs)fail('clock moved backwards');entry.finishedAt=new Date().toISOString();entry.durationMs=entry.endMs-entry.startMs}
 write(data);console.log('CI TIMING '+action+' '+phase);
}else if(action==='report'){
 if(!isPhase(phase))fail('invalid lane');const d=read(),entries=Object.entries(d.phases).map(([name,t])=>({name,seconds:typeof t.durationMs==='number'?Math.round(t.durationMs/10)/100:null,status:t.finishedAt?'COMPLETE':'INCOMPLETE'}));
 const report={schema:'activa-ci-timing-report-v1',lane:phase,sourceSha:d.sourceSha,runId:d.runId,job:d.job,queueSeconds:null,scope:'measured process phases (not total workflow time)',status:entries.length===0?'NO_DATA':entries.every(x=>x.status==='COMPLETE')?'COMPLETE':'INCOMPLETE',phases:entries,reportedAt:new Date().toISOString()};
 const output=path.join(process.cwd(),'qa-results','ci-timing-'+phase+'.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const summary=process.env.GITHUB_STEP_SUMMARY;if(summary){const lines=['### ACTIVA CI timings: '+phase,'','| Phase | Seconds | Status |','|---|---:|---|',...entries.map(x=>'| '+x.name+' | '+(x.seconds??'N/A')+' | '+x.status+' |'),'','*Queue time and total workflow time are provided by GitHub Actions, not this step instrumentation.*',''];fs.appendFileSync(summary,lines.join('\n')+'\n')}
 console.log(JSON.stringify({status:report.status,lane:phase,phases:entries.length,output}));
}else fail('usage: start PHASE | stop PHASE | report LANE');
