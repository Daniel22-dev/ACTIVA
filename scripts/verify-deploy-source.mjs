#!/usr/bin/env node
// Compare the certified release SHA against the live main ref, fail closed.
const [expected='',current='']=process.argv.slice(2).map(x=>String(x||'').trim().toLowerCase());
if(!/^[a-f0-9]{40}$/.test(expected)||!/^[a-f0-9]{40}$/.test(current)){
 console.error('DEPLOY SOURCE FAIL: missing or invalid 40-character SHA');process.exit(1);
}
if(expected!==current){console.error(`DEPLOY SOURCE FAIL: stale run (${expected} != main ${current})`);process.exit(1)}
console.log(`DEPLOY SOURCE PASS: main head equals certified SHA ${expected}`);
