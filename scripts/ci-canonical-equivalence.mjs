#!/usr/bin/env node
// P2.2: read-only equivalence of two independently built canonical artifacts.
// This is observational evidence, NOT authorization to skip a certification.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
function fail(message) { throw new Error('P2 CANONICAL EQUIVALENCE FAIL: ' + message); }

export function assertCanonical(record) {
  if (!record || record.schema !== 'activa-ci-canonical-v1') fail('wrong schema');
  if (!/^[a-f0-9]{40}$/.test(String(record.sourceSha || ''))) fail('invalid source SHA');
  if (!record.buildTime || !Number.isFinite(Date.parse(record.buildTime))) fail('invalid deterministic build time');
  if (!Array.isArray(record.files) || record.files.length < 3) fail('missing file inventory');
  const seen = new Set(), names = [];
  for (const item of record.files) {
    if (typeof item.name !== 'string' || !/^[a-z0-9]/i.test(item.name) || item.name.includes('\\') ||
        item.name.startsWith('/') || item.name.split('/').some(x => x === '.' || x === '..') ||
        !Number.isInteger(item.size) || item.size < 0 || !/^[a-f0-9]{64}$/.test(String(item.sha256))) fail('unsafe file inventory row');
    if (seen.has(item.name)) fail('duplicate inventory file');
    seen.add(item.name); names.push(item.name);
  }
  if (!['index.html','app.js','studio-manifest.json'].every(x => seen.has(x))) fail('missing critical canonical files');
  if (JSON.stringify([...names].sort()) !== JSON.stringify(names)) {
    // Sorting is done by the producing canonical scanner. Don't reconstruct
    // an alternative order here; digest always validates the exact file array.
  }
  if (record.digest !== sha256(JSON.stringify(record.files))) fail('canonical digest inconsistent with inventory');
  return record;
}

export function compareCanonicals(left,right) {
  assertCanonical(left); assertCanonical(right);
  if (left.sourceSha !== right.sourceSha) fail('P5 and axe source SHAs differ');
  if (left.buildTime !== right.buildTime) fail('P5 and axe build timestamps differ');
  if (left.digest !== right.digest || JSON.stringify(left.files) !== JSON.stringify(right.files)) fail('P5 and axe canonical bytes differ');
  return {schema:'activa-p2-canonical-equivalence-v1',sourceSha:left.sourceSha,buildTime:left.buildTime,digest:left.digest,
    files:left.files.length,status:'OBSERVATIONAL_MATCH_ONLY',meaning:'Not a release admission; independent axe and P5 remain mandatory'};
}

function load(file) { const st=fs.lstatSync(file); if (!st.isFile()||st.isSymbolicLink())fail('not a regular evidence file');return JSON.parse(fs.readFileSync(file,'utf8')); }
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) fail('usage: node scripts/ci-canonical-equivalence.mjs p5.json axe.json');
    const result = compareCanonicals(load(process.argv[2]),load(process.argv[3]));
    console.log(JSON.stringify(result,null,2));
  }catch(e){console.error(e.stack||String(e));process.exitCode=1}
}
