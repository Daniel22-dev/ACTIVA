#!/usr/bin/env node
// GARP 2.5.1 - verify explicit AI boundary inventory, source bytes, and inventory drift.
import { createHash } from 'node:crypto';
import { readFile, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';

const [fingerprintArg, inventoryArg, rootArg='.'] = process.argv.slice(2);
if(!fingerprintArg||!inventoryArg){
  console.error('Usage: node verify-ai-assurance-fingerprint.mjs <fingerprint.json> <inventory.json> [project-root]');
  process.exit(2);
}
const root=path.resolve(rootArg), fingerprint=JSON.parse(await readFile(fingerprintArg,'utf8')), inventoryRaw=JSON.parse(await readFile(inventoryArg,'utf8'));
const errors=[]; const norm=p=>String(p||'').replaceAll('\\','/').replace(/^\.\//,''); const sha=b=>createHash('sha256').update(b).digest('hex');
if(!Array.isArray(inventoryRaw)||!inventoryRaw.length||inventoryRaw.some(x=>typeof x!=='string'||!x.trim())) errors.push('inventory-invalid');
const inventory=[...new Set((Array.isArray(inventoryRaw)?inventoryRaw:[]).map(norm))].sort();
if(inventory.length!==(Array.isArray(inventoryRaw)?inventoryRaw.length:0)) errors.push('inventory-duplicates');
if(!['ghrab-ai-assurance-fingerprint-v2'].includes(fingerprint.schema)) errors.push(`schema:${fingerprint.schema||'missing'}`);
const declared=(fingerprint.files||[]).map(x=>norm(x.path));
if(JSON.stringify(declared)!==JSON.stringify(inventory)) errors.push('inventory-fingerprint-file-list-mismatch');
const rows=[];
for(const rel of inventory){
  const abs=path.resolve(root,rel); if(abs!==root&&!abs.startsWith(root+path.sep)){errors.push(`path-escape:${rel}`);continue;}
  try{
    const st=await lstat(abs); if(!st.isFile()){errors.push(`not-file:${rel}`);continue;}
    const bytes=await readFile(abs), digest=sha(bytes), expected=(fingerprint.files||[]).find(x=>norm(x.path)===rel)?.sha256;
    if(digest!==expected) errors.push(`sha256:${rel}`); rows.push({path:rel,sha256:digest});
  }catch{errors.push(`missing:${rel}`)}
}
const aggregate=sha(Buffer.from(rows.map(r=>`${r.sha256}  ${r.path}`).join('\n')+'\n'));
if(aggregate!==fingerprint.aggregate) errors.push('aggregate-mismatch');
try{const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));if(fingerprint.appVersion&&pkg.version!==fingerprint.appVersion)errors.push(`appVersion:${fingerprint.appVersion}:${pkg.version}`)}catch{}

// N15 hardening: the release verifier must detect newly introduced AI-boundary candidates,
// not merely re-hash the already-declared inventory. This detector mirrors the GHRAB app
// generator but lives in canonical tooling, so release-gate coverage is ecosystem-wide.
const legacyBoundaryTokens=/GHRAB_AI|dplData\s*\(|callGemini|school-gateway|direct-gemini|systemInstruction|system_instruction|prompt|aiTransport|wrapUntrusted|AIR-/i;
// LU-N17: strong provider/transport signatures are searched across wider execution roots.
// Keep the broad `prompt` token in the legacy focused roots to avoid turning ordinary UI/help text
// into false AI-boundary candidates while still detecting direct provider/API paths everywhere code can execute.
const strongBoundaryTokens=/GHRAB_AI|dplData\s*\(|callGemini|school-gateway|direct-gemini|systemInstruction|system_instruction|aiTransport|wrapUntrusted|AIR-|generativelanguage(?:\.googleapis\.com)?|generateContent|api\.openai\.com|openai\.com\/v1|api\.anthropic\.com|anthropic\.com\/v1|\/v1\/responses\b|\/v1\/chat\/completions\b/i;
async function walk(absDir){
  const out=[]; let entries=[];
  try{entries=await readdir(absDir,{withFileTypes:true});}catch{return out;}
  for(const e of entries){
    const abs=path.join(absDir,e.name);
    if(e.isSymbolicLink?.()) continue;
    if(e.isDirectory()) out.push(...await walk(abs));
    else if(e.isFile()) out.push(abs);
  }
  return out;
}
const candidateTextExt=/\.(?:m?js|cjs|ts|tsx|jsx|json|ya?ml|html?|md|txt|css|sh|ps1|py|toml)$/i;
const excludedCandidateDirs=new Set(['node_modules','.git','dist','dist-pages','dist-school-server','test-results','qa-results','audit-evidence']);
function shouldSkipCandidateDir(rel){
  const clean=norm(rel).replace(/\/$/,'');
  if(!clean) return false;
  const top=clean.split('/')[0];
  if(excludedCandidateDirs.has(top)) return true;
  if(clean==='security/evidence'||clean.startsWith('security/evidence/')) return true;
  if(clean==='security/sbom'||clean.startsWith('security/sbom/')) return true;
  if(clean==='security/release-integrity'||clean.startsWith('security/release-integrity/')) return true;
  return false;
}
function shouldScanCandidateFile(rel){
  const clean=norm(rel), base=path.posix.basename(clean);
  if(candidateTextExt.test(base)) return true;
  // ACT-N14: extensionless files are executable/configuration-capable release inputs too.
  return !base.includes('.') || base.startsWith('.') && !base.slice(1).includes('.');
}
async function walkProjectCandidates(absDir, relBase=''){
  const out=[]; let entries=[];
  try{entries=await readdir(absDir,{withFileTypes:true});}catch{return out;}
  for(const e of entries){
    const rel=norm(path.posix.join(relBase,e.name)), abs=path.join(absDir,e.name);
    if(e.isSymbolicLink?.()) continue;
    if(e.isDirectory()) { if(!shouldSkipCandidateDir(rel)) out.push(...await walkProjectCandidates(abs,rel)); }
    else if(e.isFile()&&shouldScanCandidateFile(rel)) out.push(abs);
  }
  return out;
}
async function candidatePool(){
  // ACT-N14: scan the whole project input surface, not a fixed directory allowlist.
  // Generated deployments/evidence are excluded because they are outputs, not source/build inputs.
  return [...new Set(await walkProjectCandidates(root,''))].sort();
}
const detected=[];
for(const abs of await candidatePool()){
  let text=''; try{text=await readFile(abs,'utf8')}catch{continue}
  const rel=norm(path.relative(root,abs));
  const legacyScope=rel.startsWith('src/')||rel.startsWith('public/config/')||rel.startsWith('public/access/')||/vendor\/[^/]*ai-core/i.test(rel);
  if(!strongBoundaryTokens.test(text)&&!(legacyScope&&legacyBoundaryTokens.test(text))) continue;
  if(rel.startsWith('../')||path.isAbsolute(rel)){errors.push(`candidate-path-escape:${rel}`);continue;}
  detected.push(rel);
}
const detectedUnique=[...new Set(detected)].sort();
const untracked=detectedUnique.filter(rel=>!inventory.includes(rel));
const inventoryMissingCandidates=inventory.filter(rel=>!detectedUnique.includes(rel));
for(const rel of untracked) errors.push(`inventory-drift-untracked:${rel}`);

const result={status:errors.length?'FAIL':'PASS',errors,files:rows.length,aggregate,expected:fingerprint.aggregate,inventory:path.resolve(inventoryArg),detectedCandidates:detectedUnique.length,untracked,inventoryEntriesNotDetectorMatched:inventoryMissingCandidates,verifierRevision:'garp-2.5.1-act-n14-project-surface-hotfix'};
console[errors.length?'error':'log'](JSON.stringify(result,null,2));
process.exit(errors.length?1:0);
