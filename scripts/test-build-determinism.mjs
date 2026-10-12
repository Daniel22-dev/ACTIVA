#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const buildTime=process.env.GHRAB_BUILD_TIME||'2026-01-01T00:00:00.000Z';
if(!Number.isFinite(Date.parse(buildTime))) throw new Error('Invalid GHRAB_BUILD_TIME');
const env={...process.env,GHRAB_BUILD_TIME:buildTime};
function build(){
 const r=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,env,encoding:'utf8',maxBuffer:4*1024*1024});
 if(r.status!==0)throw new Error('Build failed: '+(r.stderr||r.stdout));
}
function tree(dir,base=''){
 const out=[];
 for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const name=path.posix.join(base,ent.name),full=path.join(dir,ent.name),stat=fs.lstatSync(full);
  if(stat.isSymbolicLink())throw new Error('Symlink in build: '+name);
  if(stat.isDirectory())out.push(...tree(full,name));
  else if(stat.isFile())out.push([name,crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')]);
 }
 return out;
}
build();const first=tree(dist);build();const second=tree(dist);
if(JSON.stringify(first)!==JSON.stringify(second)){
 const a=new Map(first),b=new Map(second);
 const changed=[...new Set([...a.keys(),...b.keys()])].filter(k=>a.get(k)!==b.get(k));
 throw new Error('Non-deterministic build artifacts: '+changed.join(', '));
}
if(!first.some(([n])=>n==='index.html')||!first.some(([n])=>n==='studio-manifest.json'))throw new Error('Critical build output missing');
console.log(JSON.stringify({status:'PASS',scope:'dist-byte-reproducibility',buildTime,files:first.length,checkedBuilds:2}));
