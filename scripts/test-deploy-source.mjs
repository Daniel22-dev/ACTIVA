#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./verify-deploy-source.mjs',import.meta.url));
const a='a'.repeat(40),b='b'.repeat(40);
const cases=[['exact SHA accepted',true,a,a],['stale SHA rejected',false,a,b],['missing SHA rejected',false,a,''],['short SHA rejected',false,'abcd',a],['malformed SHA rejected',false,'z'.repeat(40),a],['uppercase exact accepted',true,a.toUpperCase(),a]];
for(const [name,ok,...args]of cases){const r=spawnSync(process.execPath,[script,...args],{encoding:'utf8'});assert.equal(r.status===0,ok,name+': '+r.stdout+r.stderr)}
console.log(JSON.stringify({status:'PASS',tests:cases.length,scope:'production main freshness gate'}));
