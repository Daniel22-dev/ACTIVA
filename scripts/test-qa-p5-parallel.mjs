#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assertSafePlan, executeLanes, verifyReports, LANES } from './qa-p5-parallel.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'activa-p1-parallel-'));
let assertions = 0;
function check(f) { f(); assertions++; }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function reports() {
  const dir = path.join(temp, 'dist');
  fs.mkdirSync(dir, { recursive: true });
  const data = [
    ['qa-p3-browser-report.json', {schema:'ghrab-p3-browser-result-v1',status:'passed',result:{failed:[]}}],
    ['qa-p5-runtime-report.json', {schema:'ghrab-p5-runtime-audit-v2',status:'passed',transport:'local-http',scriptsExecuted:true,summary:{blockers:0}}],
    ['qa-p5-xss-sinks-report.json', {schema:'ghrab-p5-xss-sink-audit-v1',status:'passed',failures:[]}],
    ['qa-p5-axe-runtime-report.json', {schema:'ghrab-p5-axe-runtime-v1',status:'passed',installedVersion:'4.12.1',scriptsExecuted:true,summary:{blockers:0}}],
  ];
  for (const [name, value] of data) fs.writeFileSync(path.join(dir, name), JSON.stringify({...value,appId:'activity-builder',appVersion:pkg.version}));
}
try {
  check(() => assert.doesNotThrow(() => assertSafePlan(pkg.scripts)));
  check(() => assert.throws(() => assertSafePlan({...pkg.scripts,'qa:axe':'true'}), /drift/));
  check(() => assert.throws(() => assertSafePlan({...pkg.scripts,'preqa:axe':'true'}), /hook/));
  check(() => assert.throws(() => assertSafePlan(pkg.scripts, [['qa:axe'], ['qa:xss','qa:runtime']]), /coverage/));
  check(() => assert.throws(() => assertSafePlan(pkg.scripts, [['qa:axe','qa:axe'],['qa:runtime','qa:xss']]), /coverage/));
  check(() => assert.deepEqual(LANES.map(x => x.length), [2,2]));

  let active = 0, peak = 0;
  const completed=[];
  const result = await executeLanes(async task => {
    active++;peak=Math.max(peak,active);
    await delay(20);
    completed.push(task);
    active--;
    return 0;
  });
  check(() => assert.equal(peak, 2));
  check(() => assert.equal(result.results.length, 4));
  check(() => assert.equal(result.results.every(x => x.exitCode === 0), true));
  check(() => assert.deepEqual(completed.slice().sort(), ['qa:axe','qa:browser','qa:runtime','qa:xss']));
  check(() => assert.equal(result.results.every(x => x.durationMs >= 0), true));
  let called = [];
  const failing = await executeLanes(async task => {called.push(task);if(task==='qa:browser') return 2;if(task==='qa:xss') throw new Error('fixture');return 0;});
  check(() => assert.deepEqual(called.sort(), ['qa:axe','qa:browser','qa:runtime','qa:xss']));
  check(() => assert.equal(failing.results.filter(x => x.exitCode !== 0).length, 2));

  reports();
  check(() => assert.equal(verifyReports(temp,'activity-builder',pkg.version).length,4));
  const axe=path.join(temp,'dist','qa-p5-axe-runtime-report.json');
  let m=JSON.parse(fs.readFileSync(axe,'utf8'));m.summary.blockers=1;fs.writeFileSync(axe,JSON.stringify(m));
  check(() => assert.throws(() => verifyReports(temp,'activity-builder',pkg.version), /axe/));
  reports();fs.rmSync(path.join(temp,'dist','qa-p5-xss-sinks-report.json'));
  check(() => assert.throws(() => verifyReports(temp,'activity-builder',pkg.version), /ENOENT/));
  reports();m=JSON.parse(fs.readFileSync(axe,'utf8'));m.status='not-ready-environment';fs.writeFileSync(axe,JSON.stringify(m));
  check(() => assert.throws(() => verifyReports(temp,'activity-builder',pkg.version), /failed or mismatched/));
  reports();m=JSON.parse(fs.readFileSync(axe,'utf8'));m.appVersion='0.0.0';fs.writeFileSync(axe,JSON.stringify(m));
  check(() => assert.throws(() => verifyReports(temp,'activity-builder',pkg.version), /mismatched/));
  reports();const browser=path.join(temp,'dist','qa-p3-browser-report.json');fs.rmSync(browser);fs.symlinkSync(axe,browser);
  check(() => assert.throws(() => verifyReports(temp,'activity-builder',pkg.version), /not a regular file/));
  console.log(JSON.stringify({ status:'PASS', assertions, scope:'ACTIVA P1 parallel scheduling, coverage, fail-closed reports, symlinks' }));
} finally { fs.rmSync(temp, {recursive:true, force:true}); }
