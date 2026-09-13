#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [outArg='security/evidence/ai-assurance-fingerprint.json', mode=''] = process.argv.slice(2);
const inventoryPath='security/ai-boundary-files.json';
const inventory=JSON.parse(fs.readFileSync(inventoryPath,'utf8')).map(s=>String(s).replace(/\\/g,'/')).sort();
if(!Array.isArray(inventory)||!inventory.length||new Set(inventory).size!==inventory.length)throw new Error('AI boundary inventory invalid/duplicate');
const sha=data=>createHash('sha256').update(data).digest('hex');
const rows=inventory.map(file=>{const data=fs.readFileSync(file);return{path:file,size:data.length,sha256:sha(data)}});
const aggregate=sha(Buffer.from(rows.map(r=>`${r.sha256}  ${r.path}`).join('\n')+'\n'));
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const ops=JSON.parse(fs.readFileSync('src/ai-operations.json','utf8'));
const out={schema:'ghrab-ai-assurance-fingerprint-v2',appId:'activity-builder',appVersion:pkg.version,coreVersion:ops.coreVersion,algorithm:'SHA-256',aggregate,inventory:inventoryPath,providerBoundary:'deployment-profile-and-egress-controlled',files:rows,invalidationRule:'Any byte change to an inventoried AI/egress/runtime boundary or any newly detected untracked boundary candidate invalidates inherited AIR evidence. Provider/model/system instruction, connect-src, deployment transport, conformance or school-profile changes require review/retest.'};
const text=JSON.stringify(out,null,2)+'\n',target=path.resolve(outArg);
if(mode==='--check'){
  if(!fs.existsSync(target)){console.error(`FAIL: AI assurance fingerprint chybí: ${target}`);process.exit(1)}
  if(fs.readFileSync(target,'utf8')!==text){console.error('FAIL: AI assurance fingerprint je zastaralý; změnila se AI/egress boundary.');process.exit(1)}
  console.log(`PASS: AI assurance fingerprint current: ${aggregate}`);
}else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text,'utf8');console.log(`PASS: AI assurance fingerprint vytvořen: ${aggregate}`)}
