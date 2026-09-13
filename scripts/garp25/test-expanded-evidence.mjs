#!/usr/bin/env node
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const generator=path.join(repo,'scripts/garp25/create-expanded-evidence-manifest.mjs');
const verifier=path.join(repo,'security/garp25/tools/verify-evidence-manifest.mjs');
const t=await mkdtemp(path.join(os.tmpdir(),'activa-evidence-'));
try{
  for(const d of ['security/evidence','security/release-integrity','security/sbom','audit-evidence/run']) await mkdir(path.join(t,d),{recursive:true});
  await writeFile(path.join(t,'security/evidence/base.txt'),'base\n');
  await writeFile(path.join(t,'security/STATUS.txt'),'status\n');
  await writeFile(path.join(t,'security/release-integrity/trust.json'),'{}\n');
  await writeFile(path.join(t,'security/sbom/source.json'),'{}\n');
  await writeFile(path.join(t,'audit-evidence/run/log.txt'),'audit\n');
  let r=spawnSync(process.execPath,[generator,'--project-root',t],{encoding:'utf8'}); if(r.status!==0) throw new Error(`generator failed: ${r.stderr}`);
  const manifest=JSON.parse(await readFile(path.join(t,'security/security-evidence-manifest.json'),'utf8'));
  const covered=new Set((manifest.externalFiles||[]).map(x=>x.path));
  const scopeOk=['audit-evidence/run/log.txt','security/STATUS.txt','security/release-integrity/trust.json','security/sbom/source.json'].every(x=>covered.has(x));
  r=spawnSync(process.execPath,[verifier,path.join(t,'security/evidence'),path.join(t,'security/security-evidence-manifest.json'),'--project-root',t],{encoding:'utf8'}); const cleanPass=r.status===0;
  await writeFile(path.join(t,'audit-evidence/run/log.txt'),'tampered\n');
  r=spawnSync(process.execPath,[verifier,path.join(t,'security/evidence'),path.join(t,'security/security-evidence-manifest.json'),'--project-root',t],{encoding:'utf8'}); const tamperFails=r.status!==0;
  await writeFile(path.join(t,'audit-evidence/run/log.txt'),'audit\n');
  await writeFile(path.join(t,'audit-evidence/run/PODVRZENY.log'),'forged\n');
  r=spawnSync(process.execPath,[verifier,path.join(t,'security/evidence'),path.join(t,'security/security-evidence-manifest.json'),'--project-root',t],{encoding:'utf8'}); const unexpectedExternalFails=r.status!==0 && /external-unexpected/.test((r.stdout||'')+(r.stderr||''));
  await rm(path.join(t,'audit-evidence/run/PODVRZENY.log'),{force:true});
  await writeFile(path.join(t,'security','NOEXTENSION'),'forged\n');
  r=spawnSync(process.execPath,[verifier,path.join(t,'security/evidence'),path.join(t,'security/security-evidence-manifest.json'),'--project-root',t],{encoding:'utf8'}); const unexpectedExtensionlessFails=r.status!==0 && /external-unexpected:security\/NOEXTENSION/.test((r.stdout||'')+(r.stderr||''));
  await rm(path.join(t,'security','NOEXTENSION'),{force:true});
  await mkdir(path.join(t,'security','new-scope'),{recursive:true}); await writeFile(path.join(t,'security','new-scope','forged.bin'),'forged\n');
  r=spawnSync(process.execPath,[verifier,path.join(t,'security/evidence'),path.join(t,'security/security-evidence-manifest.json'),'--project-root',t],{encoding:'utf8'}); const unexpectedSecuritySubdirFails=r.status!==0 && /external-unexpected:security\/new-scope\/forged\.bin/.test((r.stdout||'')+(r.stderr||''));
  const status=scopeOk&&cleanPass&&tamperFails&&unexpectedExternalFails&&unexpectedExtensionlessFails&&unexpectedSecuritySubdirFails?'PASS':'FAIL';
  console.log(JSON.stringify({status,scopeOk,cleanPass,tamperFails,unexpectedExternalFails,unexpectedExtensionlessFails,unexpectedSecuritySubdirFails,externalFiles:(manifest.externalFiles||[]).length,externalScopes:manifest.externalScopes||[]},null,2));
  process.exitCode=status==='PASS'?0:1;
}finally{await rm(t,{recursive:true,force:true})}
