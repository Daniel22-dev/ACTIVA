#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const argv=process.argv.slice(2);
const opt=k=>{const i=argv.indexOf(`--${k}`);return i>=0?argv[i+1]:null};
const manifestPath=opt('manifest');
if(!manifestPath){console.error(JSON.stringify({status:'FAIL',errors:['manifest-required']},null,2));process.exit(2)}
const sha=async f=>createHash('sha256').update(await readFile(f)).digest('hex');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const checks=[]; const add=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail});
for(const [arg,field] of [['provenance','buildProvenanceSha256'],['evidence-manifest','evidenceManifestSha256'],['sbom','sbomSha256']]){
  const f=opt(arg); if(!f) continue;
  const actual=await sha(path.resolve(f)); const expected=manifest[field];
  add(`${field}.present`,typeof expected==='string'&&/^[a-f0-9]{64}$/.test(expected),expected||'missing');
  add(`${field}.match`,expected===actual,`${expected||'missing'} / ${actual}`);
}
const provenancePath=opt('provenance');
if(provenancePath){
  const p=JSON.parse(await readFile(provenancePath,'utf8'));
  if(manifest.sourcePackageSha256||p?.source?.sourcePackageSha256) add('sourcePackageSha256.crosslink',manifest.sourcePackageSha256===p?.source?.sourcePackageSha256,`${manifest.sourcePackageSha256||'missing'} / ${p?.source?.sourcePackageSha256||'missing'}`);
  if(manifest.sourceCommit||p?.source?.revision) add('sourceRevision.crosslink',manifest.sourceCommit===p?.source?.revision,`${manifest.sourceCommit||'missing'} / ${p?.source?.revision||'missing'}`);
}
const failed=checks.filter(x=>!x.ok);
const out={status:failed.length?'FAIL':'PASS',checks:checks.length,failed};
console[failed.length?'error':'log'](JSON.stringify(out,null,2));
process.exit(failed.length?1:0);
