#!/usr/bin/env node
// Bounded diagnostics only. Never changes exit status or GARP evaluation.
import fs from 'node:fs';
import path from 'node:path';
const dir=path.join(process.cwd(),'audit','evidence','garp27-current');
const name='legacy-garp25.log';
const logfile=path.join(dir,name);
if(!fs.existsSync(logfile)){console.log('GARP diagnostic: no legacy GARP25 log available.');process.exit(0)}
const lines=fs.readFileSync(logfile,'utf8').split(/\r?\n/);
let last=-1;
for(let i=0;i<lines.length;i++){if(/^>\s*sestavovac-aktivit@\S+\s+garp25:[\w:-]+/.test(lines[i]))last=i}
const selected=last<0?lines.slice(-70):lines.slice(last,last+120);
function scrub(line){
 return line
  .replace(/(?:ghp_|gho_|github_pat_|sk-ant-|sk-|AIza|xox[baprs]-)[A-Za-z0-9_-]{12,}/g,'[REDACTED]')
  .replace(/(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["']?[^"'\s,}]{10,}/gi,'[REDACTED_ASSIGNMENT]')
  .replace(/\bBearer\s+\S+/gi,'Bearer [REDACTED]')
  .slice(0,330);
}
console.log('GARP DIAGNOSTIC: most recent GARP25 command and its sanitized output');
for(const line of selected){if(line.trim())console.log(scrub(line))}
const summary=path.join(dir,'foundation-summary.json');
if(fs.existsSync(summary)){const x=JSON.parse(fs.readFileSync(summary,'utf8'));console.log('GARP FAILED STEPS:',JSON.stringify(x.steps?.filter(s=>!s.pass).map(s=>({id:s.id,exit:s.actualExit}))||[]))}
