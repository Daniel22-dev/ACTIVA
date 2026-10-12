#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const dist=path.join(root,'dist');
const file=path.join(root,'qa-results','ci-canonical.json');
const strict=process.env.GITHUB_ACTIONS==='true'||process.env.CI_EVIDENCE_REQUIRED==='1';
const sourceSha=String(process.env.GHRAB_SOURCE_COMMIT||process.env.GITHUB_SHA||'').toLowerCase();
const buildTime=process.env.GHRAB_BUILD_TIME||null;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function fail(s){throw Error('CANONICAL BUILD FAIL: '+s)}
function scan(dir=dist,base=''){
 const out=[];
 for(const ent of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
  const name=path.posix.join(base,ent.name),f=path.join(dir,ent.name),st=fs.lstatSync(f);
  if(st.isSymbolicLink())fail('symlink '+name);
  if(st.isDirectory())out.push(...scan(f,name));
  else if(st.isFile()&&!/^(?:qa-|quality-report)|-report\.json$/.test(name)){
   const bytes=fs.readFileSync(f);out.push({name,size:bytes.length,sha256:hash(bytes)});
  }
 }
 return out;
}
function context(){
 if(strict&&!/^[a-f0-9]{40}$/.test(sourceSha))fail('exact source SHA required');
 if(strict&&(!buildTime||!Number.isFinite(Date.parse(buildTime))))fail('deterministic build time required');
 return {sourceSha:sourceSha||null,buildTime};
}
function load(){if(!fs.existsSync(file))fail('missing canonical baseline');try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{fail('invalid baseline JSON')}}
function verify(){
 const expected=load(),now=scan();
 if(expected.schema!=='activa-ci-canonical-v1')fail('schema');
 if(expected.sourceSha!==context().sourceSha||expected.buildTime!==context().buildTime)fail('SHA or build time mismatch');
 if(JSON.stringify(expected.files)!==JSON.stringify(now)||expected.digest!==hash(Buffer.from(JSON.stringify(now))))fail('build bytes changed between certification and packaging');
 if(!now.some(x=>x.name==='app.js')||!now.some(x=>x.name==='index.html')||!now.some(x=>x.name==='studio-manifest.json'))fail('missing critical files');
 console.log('CANONICAL BUILD PASS '+expected.digest);return expected;
}
const action=process.argv[2];
try{
 if(action==='capture'){
  const files=scan(),ctx=context();if(!files.length)fail('empty dist');
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify({schema:'activa-ci-canonical-v1',...ctx,digest:hash(Buffer.from(JSON.stringify(files))),files},null,2)+'\n');verify();
 }else if(action==='verify')verify();
 else if(action==='emit'){
  verify();const to=path.join(root,'qa-results','current','ci-canonical.json');fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to);
 }else fail('usage: capture | verify | emit');
}catch(e){console.error(String(e));process.exit(1)}
