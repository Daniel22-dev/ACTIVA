#!/usr/bin/env node
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {evaluateArchitecture} from './architecture-integrity.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..'); const COPY=['src','scripts/garp27','security/garp27','vendor/garp-2.7-consolidated-r2','dist-pages','package.json','package-lock.json'];
function fixture(){const d=fs.mkdtempSync(path.join(os.tmpdir(),'activa-g27-'));for(const r of COPY){const s=path.join(ROOT,r),t=path.join(d,r);if(!fs.existsSync(s))continue;fs.mkdirSync(path.dirname(t),{recursive:true});fs.cpSync(s,t,{recursive:true})}return d}
function mj(root,rel,fn){const p=path.join(root,rel),x=JSON.parse(fs.readFileSync(p));fn(x);fs.writeFileSync(p,JSON.stringify(x,null,2))}
const cases=[
['positive','PASS',()=>{}],
['unregistered-op','FAIL',r=>mj(r,'src/ai-operations.json',x=>x.operations.push({...x.operations[0],operation:'synthetic-op'}))],
['provider-tool','FAIL',r=>mj(r,'src/ai-operations.json',x=>x.operations[0].providerTools=['synthetic_tool'])],
['school-key','FAIL',r=>mj(r,'src/config/deployment.school-server.json',x=>x.features.allowLocalProviderKeys=true)],
['live-bypass','FAIL',r=>mj(r,'src/config/deployment.school-server.json',x=>x.features.liveServerValidationRequired=false)],
['policy-drift','FAIL',r=>mj(r,'security/garp27/garp-policy.json',x=>x.incident.current+=' drift')],
['inventory-drift','FAIL',r=>mj(r,'security/garp27/capability-inventory.json',x=>x.agentic=true)],
['vendor-drift','FAIL',r=>fs.appendFileSync(path.join(r,'vendor/garp-2.7-consolidated-r2/MASTER/README.md'),'\ndrift')],
['tool-drift','FAIL',r=>fs.appendFileSync(path.join(r,'scripts/garp27/contract-gate.mjs'),'\n//drift')],
['authority-conflict','FAIL',r=>fs.writeFileSync(path.join(r,'security/garp27/conflict.json'),JSON.stringify({garpVersion:'2.6'}))],
['artifact-test-payload','FAIL',r=>{fs.mkdirSync(path.join(r,'dist-pages','tests'),{recursive:true});fs.writeFileSync(path.join(r,'dist-pages','tests','bypass.js'),'x')}],
['artifact-secret-marker','FAIL',r=>fs.appendFileSync(path.join(r,'dist-pages','index.html'),'\nGARP27_EXTERNAL_TRUST_SHA256')]
];
let failed=0;const results=[];for(const [id,expected,mut] of cases){const d=fixture();try{mut(d);const observed=evaluateArchitecture(d).status;const pass=observed===expected;results.push({id,expected,observed,pass});if(!pass)failed++;}catch(e){results.push({id,expected,observed:'HARNESS_ERROR',pass:false,error:String(e)});failed++;}finally{fs.rmSync(d,{recursive:true,force:true})}}console.log(JSON.stringify({classification:'GARP27_MUTATION_TEST',status:failed?'FAIL':'PASS',syntheticOnly:true,total:results.length,passed:results.length-failed,failed,results},null,2));process.exit(failed?1:0);
