#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..'),OUT=path.join(ROOT,'audit/evidence/garp27-current');fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const steps=[['build-pages',['npm','run','build:pages']],['build-school',['npm','run','build:school-server']],['contracts',['npm','run','qa:garp27:contracts']],['architecture',['npm','run','qa:garp27:architecture']],['policy-mutations',['npm','run','qa:garp27:policy-mutations']],['mutations',['npm','run','qa:garp27:mutations']],['auto-patch',['npm','run','qa:garp27:auto-patch']],['legacy-garp25',['npm','run','garp25:prep-static']],['platform',['npm','run','verify:platform']]];
let failed=0;const results=[];for(const [id,cmd] of steps){const r=spawnSync(cmd[0],cmd.slice(1),{cwd:ROOT,encoding:'utf8',env:process.env,maxBuffer:64*1024*1024});fs.writeFileSync(path.join(OUT,id+'.log'),`$ ${cmd.join(' ')}\nEXIT=${r.status}\n${r.stdout||''}\n${r.stderr||''}`);const pass=r.status===0;results.push({id,actualExit:r.status,pass});if(!pass){failed++;
  const lines=String((r.stdout||'')+'\n'+(r.stderr||'')).split(/\r?\n/);
  const last=lines.slice(-90).filter(Boolean).map(line=>
    line.replace(/(?:ghp_|github_pat_|gho_|sk-ant-|sk-|xox[baprs]-)[A-Za-z0-9_-]{12,}/g,'[REDACTED_KEY]')
        .replace(/(?:api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["']?[^"'\s,}]{12,}/gi,'[REDACTED_ASSIGNMENT]')
        .slice(0,350)
  );
  const names=lines.filter(x=>/^> sestavovac-aktivit@[^\n]+ (?:garp25:[a-z0-9:-]+)/i.test(x));
  console.error(JSON.stringify({diagnostic:'GARP27_SUBSTEP_FAILED',step:id,exit:r.status,commands:names.slice(-3).map(x=>x.slice(0,150)),sanitizedTail:last},null,2));
}}
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json')));const summary={classification:'GARP27_FOUNDATION_GATE',garpVersion:'2.7',appId:'activity-builder',appVersion:pkg.version,status:failed?'FAIL':'FOUNDATION_PASS_LIVE_NOT_TESTED',serverPhase:'DEFERRED_BY_OWNER_DECISION',liveStatus:'NOT_TESTED',steps:results,summary:{total:results.length,passed:results.filter(x=>x.pass).length,failed}};fs.writeFileSync(path.join(OUT,'foundation-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));process.exit(failed?1:0);
