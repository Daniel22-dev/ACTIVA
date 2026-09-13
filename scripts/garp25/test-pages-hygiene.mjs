#!/usr/bin/env node
import { cp, mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const scanner=path.join(repo,'security/garp25/tools/scan-deployment-leaks.mjs');
const pages=path.join(repo,'dist-pages');
let r=spawnSync(process.execPath,[scanner,pages],{encoding:'utf8'}); const cleanPass=r.status===0;
const manifest=JSON.parse(await readFile(path.join(pages,'studio-manifest.json'),'utf8'));
const capabilityRemoved=!(manifest.capabilities||[]).includes('internal-self-tests');
const t=await mkdtemp(path.join(os.tmpdir(),'activa-pages-'));
try{await cp(pages,t,{recursive:true});await mkdir(path.join(t,'tests'),{recursive:true});await writeFile(path.join(t,'tests','canary.txt'),'synthetic\n');r=spawnSync(process.execPath,[scanner,t],{encoding:'utf8'});const negativeControl=r.status!==0&&/forbidden-dir:tests/.test((r.stdout||'')+(r.stderr||''));const status=cleanPass&&capabilityRemoved&&negativeControl?'PASS':'FAIL';console.log(JSON.stringify({status,cleanPass,capabilityRemoved,negativeControl},null,2));process.exitCode=status==='PASS'?0:1;}finally{await rm(t,{recursive:true,force:true})}
