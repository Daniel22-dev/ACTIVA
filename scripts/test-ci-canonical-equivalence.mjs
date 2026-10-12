#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { assertCanonical, compareCanonicals } from './ci-canonical-equivalence.mjs';
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const files = ['app.js','index.html','studio-manifest.json'].map((name,i)=>({name,size:i+1,sha256:sha256(name)}));
const base = {schema:'activa-ci-canonical-v1',sourceSha:'a'.repeat(40),buildTime:'2026-10-12T11:00:00Z',files,digest:sha256(JSON.stringify(files))};
let tests=0;
function check(f){f();tests++}
check(()=>assert.equal(assertCanonical(base).digest,base.digest));
check(()=>assert.equal(compareCanonicals(base,structuredClone(base)).status,'OBSERVATIONAL_MATCH_ONLY'));
check(()=>assert.throws(()=>compareCanonicals(base,{...base,sourceSha:'b'.repeat(40)}),/SHAs differ/));
check(()=>assert.throws(()=>compareCanonicals(base,{...base,buildTime:'2026-10-12T11:01:00Z'}),/timestamps differ/));
check(()=>assert.throws(()=>assertCanonical({...base,digest:'0'.repeat(64)}),/digest inconsistent/));
check(()=>assert.throws(()=>assertCanonical({...base,sourceSha:'short'}),/source SHA/));
check(()=>assert.throws(()=>assertCanonical({...base,files:[...files,files[0]]}),/duplicate/));
check(()=>assert.throws(()=>assertCanonical({...base,files:[{...files[0],name:'../evil'},...files.slice(1)]}),/unsafe/));
check(()=>assert.throws(()=>assertCanonical({...base,files:files.slice(0,2)}),/inventory/));
check(()=>assert.throws(()=>assertCanonical({...base,files:files.map(x=>({...x,sha256:'broken'}))}),/unsafe/));
const diff=[...files.map(x=>({...x}))];diff[0].sha256=sha256('changed');
const other={...base,files:diff,digest:sha256(JSON.stringify(diff))};
check(()=>assert.throws(()=>compareCanonicals(base,other),/canonical bytes differ/));
console.log(JSON.stringify({status:'PASS',cases:tests,scope:'P2.2 independent build byte-equivalence negative tests'}));
