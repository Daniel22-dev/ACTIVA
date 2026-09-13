#!/usr/bin/env node
// GARP 2.5.1 GHRAB - canonical secret/deployment leak scanner.
// Modes:
//   deployment (default): fail closed on development/source artifacts and secrets.
//   --source: scan the source tree for secrets while allowing legitimate source-only directories.
// LU-N4 hardening: exact synthetic-token exceptions only, all occurrences, JWK/PGP/PEM/GitHub/AWS,
// CSS/SVG/all file types, binary byte scanning, OOXML and general ZIP member inspection.
// LU-N18: bounded recursive archive inspection (depth, entry count, per-entry and cumulative size).
import { readdir, readFile, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

const argv = process.argv.slice(2);
const sourceMode = argv.includes('--source');
const positional = argv.filter(a => !a.startsWith('--'));
const root = path.resolve(positional[0] || (sourceMode ? '.' : 'dist'));

const deploymentForbiddenDirs = new Set([
  '.git', '.github', '.svn', '.hg', '.vscode', '.idea', 'test', 'tests', '__tests__',
  'test-results', 'coverage', 'audit-evidence', 'PROMPTY', 'node_modules', '.claude'
]);
const sourceSkipDirs = new Set(['.git', 'node_modules', 'dist', 'dist-school-server', 'qa-results', 'test-results', 'coverage']);
const forbiddenNames = new Set([
  'SHA256SUMS.private', 'private-key.pem', 'id_rsa', 'id_ed25519', '.npmrc', '.netrc', '.DS_Store'
]);
const forbiddenExt = new Set(['.map', '.pem', '.key', '.p12', '.pfx', '.p8', '.jks', '.keystore', '.kdb', '.ppk', '.asc', '.gpg', '.bak', '.orig']);

const EXACT_SYNTHETIC_VALUES = new Set([
  'TEST_SYNTHETIC_KEY_NOT_A_SECRET',
  'TEST_ANONYMIZED_PERMIT',
  'conformance-key',
  'conformance-token'
]);

const secretPatterns = [
  { id:'private-key-block', re:/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g },
  { id:'pgp-private-key-block', re:/-----BEGIN PGP PRIVATE KEY BLOC[K]-----/g },
  { id:'jwk-private-key', re:/["']kty["']\s*:\s*["'](?:EC|OKP|RSA)["'][\s\S]{0,4096}?["']d["']\s*:\s*["']([A-Za-z0-9_-]{20,})["']|["']d["']\s*:\s*["']([A-Za-z0-9_-]{20,})["'][\s\S]{0,4096}?["']kty["']\s*:\s*["'](?:EC|OKP|RSA)["']/g },
  { id:'google-api-key', re:/AIza[A-Za-z0-9_-]{20,}/g },
  { id:'github-token', re:/ghp_[A-Za-z0-9]{20,}/g },
  { id:'github-fine-grained-pat', re:/github_pat_[A-Za-z0-9_]{20,}/g },
  { id:'github-oauth-token', re:/gho_[A-Za-z0-9]{20,}/g },
  { id:'aws-access-key-id', re:/AKIA[0-9A-Z]{16}/g },
  { id:'openai-style-key', re:/sk-[A-Za-z0-9_-]{20,}/g },
  { id:'anthropic-key', re:/sk-ant-[A-Za-z0-9_-]{20,}/g },
  { id:'slack-token', re:/xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { id:'jwt', re:/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id:'assigned-secret-literal', re:/(?:api[_-]?key|secret|passwd|password|token)\s*[:=]\s*["']([^"'\s]{12,})["']/gi },
  { id:'garp-canary', re:/GHRAB_CANARY_[A-Z0-9_]+/g }
];

const CHUNK = 1 << 20, OVERLAP = 8192;
const ZIP_EXTENSIONS = new Set(['.zip','.docx','.xlsx','.pptx']);
const ZIP_MAX_DEPTH = 3, ZIP_MAX_ENTRIES = 10000, ZIP_MAX_ENTRY_BYTES = 64*1024*1024, ZIP_MAX_TOTAL_BYTES = 256*1024*1024, ZIP_MAX_FILE_BYTES = 128*1024*1024;
const errors = [];
const info = [];
const seenFinding = new Set();

function addError(value){ if(!seenFinding.has(value)){seenFinding.add(value);errors.push(value);} }
function exactTokenFor(pattern, match){
  if(pattern.id==='jwk-private-key') return match[1] || match[2] || '';
  if(pattern.id==='assigned-secret-literal') return match[1] || '';
  return match[0];
}
function scanText(text, rel, suffix=''){
  for(const pattern of secretPatterns){
    pattern.re.lastIndex=0;
    for(const m of text.matchAll(pattern.re)){
      const token=exactTokenFor(pattern,m);
      if(EXACT_SYNTHETIC_VALUES.has(token) || EXACT_SYNTHETIC_VALUES.has(m[0])) continue;
      addError(`secret-pattern:${rel}${suffix}:${pattern.id}`);
    }
  }
}

function readUInt32LE(buf,off){ return off>=0 && off+4<=buf.length ? buf.readUInt32LE(off) : -1; }
function looksLikeZip(buf){return buf.length>=4 && (readUInt32LE(buf,0)===0x04034b50 || readUInt32LE(buf,0)===0x06054b50);}
function parseZipEntries(buf,budget){
  // Find EOCD in the final 64KiB + header; OOXML and ordinary ZIP use the same container.
  const min=Math.max(0,buf.length-0x10000-22); let eocd=-1;
  for(let i=buf.length-22;i>=min;i--){ if(readUInt32LE(buf,i)===0x06054b50){eocd=i;break;} }
  if(eocd<0) throw new Error('zip-eocd-missing');
  const count=buf.readUInt16LE(eocd+10), cdOffset=buf.readUInt32LE(eocd+16);
  if(count>ZIP_MAX_ENTRIES) throw new Error(`zip-too-many-entries:${count}`);
  const out=[]; let pos=cdOffset;
  for(let i=0;i<count;i++){
    if(readUInt32LE(buf,pos)!==0x02014b50) throw new Error('zip-central-header-invalid');
    const method=buf.readUInt16LE(pos+10), compSize=buf.readUInt32LE(pos+20), uncompSize=buf.readUInt32LE(pos+24);
    const nameLen=buf.readUInt16LE(pos+28), extraLen=buf.readUInt16LE(pos+30), commentLen=buf.readUInt16LE(pos+32), localOff=buf.readUInt32LE(pos+42);
    const name=buf.subarray(pos+46,pos+46+nameLen).toString('utf8');
    if(uncompSize>ZIP_MAX_ENTRY_BYTES) throw new Error(`zip-entry-too-large:${name}`);
    budget.entries+=1; budget.inflated+=uncompSize;
    if(budget.entries>ZIP_MAX_ENTRIES) throw new Error('zip-too-many-entries-recursive');
    if(budget.inflated>ZIP_MAX_TOTAL_BYTES) throw new Error('zip-total-too-large-recursive');
    if(readUInt32LE(buf,localOff)!==0x04034b50) throw new Error(`zip-local-header-invalid:${name}`);
    const localNameLen=buf.readUInt16LE(localOff+26), localExtraLen=buf.readUInt16LE(localOff+28);
    const dataStart=localOff+30+localNameLen+localExtraLen, comp=buf.subarray(dataStart,dataStart+compSize);
    let data;
    if(method===0) data=comp;
    else if(method===8) data=inflateRawSync(comp,{maxOutputLength:64*1024*1024});
    else throw new Error(`zip-compression-unsupported:${method}:${name}`);
    out.push({name,data});
    pos+=46+nameLen+extraLen+commentLen;
  }
  return out;
}

async function scanArchiveBuffer(buf,rel,depth,budget,suffix=''){
  if(depth>ZIP_MAX_DEPTH) throw new Error(`zip-max-depth:${depth}`);
  const entries=parseZipEntries(buf,budget);
  for(const e of entries){
    const memberSuffix=`${suffix}!${e.name}`;
    scanText(e.data.toString('latin1'),rel,memberSuffix);
    const memberExt=path.extname(e.name).toLowerCase();
    if(ZIP_EXTENSIONS.has(memberExt)||looksLikeZip(e.data)){
      if(depth>=ZIP_MAX_DEPTH) throw new Error(`zip-max-depth:${memberSuffix}`);
      await scanArchiveBuffer(e.data,rel,depth+1,budget,memberSuffix);
    }
  }
}

async function scanArchive(abs,rel,size){
  if(size>ZIP_MAX_FILE_BYTES){addError(`archive-too-large:${rel}:${size}`);return;}
  try{const buf=await readFile(abs);await scanArchiveBuffer(buf,rel,0,{entries:0,inflated:0});}
  catch(e){addError(`archive-unscannable:${rel}:${String(e.message||e)}`);}
}

async function scanFile(abs, rel, size) {
  const ext=path.extname(rel).toLowerCase();
  if(ZIP_EXTENSIONS.has(ext)) await scanArchive(abs,rel,size);
  const fh = await open(abs, 'r');
  try {
    let pos = 0, tail = '';
    const buf = Buffer.alloc(CHUNK);
    while (pos < size) {
      const { bytesRead } = await fh.read(buf, 0, CHUNK, pos);
      if (!bytesRead) break;
      // latin1 preserves ASCII secret bytes in arbitrary binary files (e.g. appended to PNG).
      const text = tail + buf.subarray(0, bytesRead).toString('latin1');
      scanText(text, rel);
      tail = text.slice(-OVERLAP);
      pos += bytesRead;
    }
  } finally { await fh.close(); }
}

async function walk(dir, base = '') {
  for (const name of (await readdir(dir)).sort()) {
    const abs = path.join(dir, name), rel = path.posix.join(base, name);
    const st = await lstat(abs);
    if (st.isSymbolicLink()) { addError(`symlink:${rel}`); continue; }
    if (st.isDirectory()) {
      if(sourceMode && sourceSkipDirs.has(name)) continue;
      if(!sourceMode && deploymentForbiddenDirs.has(name)){addError(`forbidden-dir:${rel}`);continue;}
      await walk(abs, rel); continue;
    }
    if (!st.isFile()) { addError(`irregular-file:${rel}`); continue; }
    if (forbiddenNames.has(name)) addError(`forbidden-name:${rel}`);
    if ((name === '.env' || name.startsWith('.env.')) && name !== '.env.example') addError(`forbidden-env-file:${rel}`);
    if (!sourceMode && forbiddenExt.has(path.extname(name).toLowerCase())) addError(`forbidden-ext:${rel}`);
    await scanFile(abs, rel, st.size);
  }
}

try{await walk(root);}catch(e){addError(`scan-error:${String(e.message||e)}`);}
const result={status:errors.length?'FAIL':'PASS',mode:sourceMode?'source':'deployment',root,errors,info,scannerRevision:'garp-2.5.1-lu-n18-recursive-archive-secret-scan'};
if(errors.length){console.error(JSON.stringify(result,null,2));process.exit(1);}
console.log(JSON.stringify(result,null,2));
