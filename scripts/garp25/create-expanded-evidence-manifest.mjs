#!/usr/bin/env node
import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const argv=process.argv.slice(2); let projectRoot=process.cwd();
for(let i=0;i<argv.length;i++){if(argv[i]==='--project-root') projectRoot=path.resolve(argv[++i]||'.'); else {console.error(`Unknown option: ${argv[i]}`);process.exit(2)}}
const scriptRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const tool=path.join(scriptRoot,'security/garp25/tools/create-evidence-manifest.mjs');
const evidenceDir=path.join(projectRoot,'security/evidence');
const output=path.join(projectRoot,'security/security-evidence-manifest.json');
async function walk(dir, base){
  const out=[]; let entries=[]; try{entries=await readdir(dir,{withFileTypes:true});}catch{return out}
  for(const e of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const abs=path.join(dir,e.name), rel=path.posix.join(base,e.name), st=await lstat(abs);
    if(st.isSymbolicLink()) throw new Error(`Symlink forbidden: ${rel}`);
    if(st.isDirectory()) out.push(...await walk(abs,rel)); else if(st.isFile()) out.push(rel);
  }
  return out;
}
async function walkSecurityExternal(dir,base){
  const out=[]; let entries=[]; try{entries=await readdir(dir,{withFileTypes:true});}catch{return out}
  for(const e of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))){
    const abs=path.join(dir,e.name), rel=path.posix.join(base,e.name);
    if(rel==='security/evidence'||rel.startsWith('security/evidence/')) continue;
    if(rel==='security/security-evidence-manifest.json') continue;
    const st=await lstat(abs);
    if(st.isSymbolicLink()) throw new Error(`Symlink forbidden: ${rel}`);
    if(st.isDirectory()) out.push(...await walkSecurityExternal(abs,rel)); else if(st.isFile()) out.push(rel);
  }
  return out;
}
const extras=[];
extras.push(...await walk(path.join(projectRoot,'audit-evidence'),'audit-evidence'));
extras.push(...await walkSecurityExternal(path.join(projectRoot,'security'),'security'));
const unique=[...new Set(extras)].sort();
const args=[tool,evidenceDir,output,'--project-root',projectRoot];
for(const rel of unique) args.push('--extra',rel);
const r=spawnSync(process.execPath,args,{encoding:'utf8'});
process.stdout.write(r.stdout||''); process.stderr.write(r.stderr||'');
if(r.status!==0) process.exit(r.status??1);
const manifest=JSON.parse(await readFile(output,'utf8'));
manifest.externalScopes=[
  {path:'audit-evidence',recursive:true},
  {path:'security',recursive:true,exclude:['security/evidence','security/security-evidence-manifest.json']}
];
await writeFile(output,JSON.stringify(manifest,null,2)+'\n','utf8');
console.log(JSON.stringify({status:'PASS',expandedExternalFiles:unique.length,externalScopes:manifest.externalScopes,scope:['security/evidence/**','audit-evidence/**','security/** except security/evidence/** and security/security-evidence-manifest.json']},null,2));
