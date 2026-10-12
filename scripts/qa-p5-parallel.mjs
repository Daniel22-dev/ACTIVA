#!/usr/bin/env node
// P1: two independent, isolated browser QA lanes; release/certification gates stay serial.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

export const LANES = Object.freeze([
  Object.freeze(['qa:runtime', 'qa:xss']),
  Object.freeze(['qa:browser', 'qa:axe']),
]);

const TASKS = Object.freeze({
  'qa:browser': Object.freeze({ script: 'node scripts/qa-p3-browser.mjs', report: 'qa-p3-browser-report.json', schema: 'ghrab-p3-browser-result-v1' }),
  'qa:runtime': Object.freeze({ script: 'node scripts/qa-p5-runtime.mjs', report: 'qa-p5-runtime-report.json', schema: 'ghrab-p5-runtime-audit-v2' }),
  'qa:xss': Object.freeze({ script: 'node scripts/qa-p5-xss-sinks.mjs', report: 'qa-p5-xss-sinks-report.json', schema: 'ghrab-p5-xss-sink-audit-v1' }),
  'qa:axe': Object.freeze({ script: 'node scripts/qa-p5-axe-runtime.mjs', report: 'qa-p5-axe-runtime-report.json', schema: 'ghrab-p5-axe-runtime-v1' }),
});

export function assertSafePlan(scripts, lanes = LANES) {
  if (!Array.isArray(lanes) || lanes.length !== 2) throw new Error('P1 expected two independent lanes');
  const all = lanes.flat();
  const required = Object.keys(TASKS);
  if (all.length !== required.length || new Set(all).size !== all.length || required.some(x => !all.includes(x))) {
    throw new Error('P1 gate coverage mismatch: all four independent audits must run exactly once');
  }
  for (const task of all) {
    if (scripts[task] !== TASKS[task].script) throw new Error(`P1 npm script drift: ${task}`);
    if (scripts[`pre${task}`] || scripts[`post${task}`]) throw new Error(`P1 unexpected npm lifecycle hook: ${task}`);
  }
}

export async function executeLanes(run, lanes = LANES) {
  const results = [];
  const start = performance.now();
  await Promise.all(lanes.map(async (lane, laneIndex) => {
    for (const task of lane) {
      const before = performance.now();
      let code;
      try { code = await run(task); }
      catch (error) { code = 1; console.error(`P1 ${task} runner error: ${String(error)}`); }
      const durationMs = Math.max(0, Math.round(performance.now() - before));
      results.push({ task, lane: laneIndex + 1, exitCode: Number.isInteger(code) ? code : 1, durationMs });
    }
  }));
  return { results, wallMs: Math.max(0, Math.round(performance.now() - start)) };
}

function secureFile(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`P1 report is not a regular file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

export function verifyReports(root, appId, appVersion) {
  const digests = [];
  for (const [task, definition] of Object.entries(TASKS)) {
    const name = definition.report;
    const report = JSON.parse(secureFile(path.join(root, 'dist', name)));
    if (report.schema !== definition.schema || report.appId !== appId || (report.appVersion && report.appVersion !== appVersion) || report.status !== 'passed') {
      throw new Error(`P1 failed or mismatched ${task} report: ${name}`);
    }
    if (task === 'qa:browser' && (!Array.isArray(report.result?.failed) || report.result.failed.length !== 0)) {
      throw new Error('P1 browser result missing or contains failed checks');
    }
    if (task === 'qa:runtime' && (report.scriptsExecuted !== true || report.transport !== 'local-http' || report.summary?.blockers !== 0)) {
      throw new Error('P1 runtime execution evidence missing or blocked');
    }
    if (task === 'qa:axe' && (report.scriptsExecuted !== true || report.installedVersion !== '4.12.1' || report.summary?.blockers !== 0)) {
      throw new Error('P1 axe required-audit evidence missing or blocked');
    }
    if (task === 'qa:xss' && (!Array.isArray(report.failures) || report.failures.length !== 0)) {
      throw new Error('P1 XSS sink regression evidence missing or blocked');
    }
    digests.push(name);
  }
  return digests;
}

function runNpm(task, root) {
  return new Promise(resolve => {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const env = { ...process.env, ...(task === 'qa:axe' ? { AXE_REQUIRED: '1' } : {}) };
    const child = spawn(cmd, ['run', task], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
    child.once('error', err => { console.error(`P1 ${task}: ${err.message}`); resolve(1); });
    child.once('exit', (code, signal) => resolve(signal ? 1 : code ?? 1));
  });
}

async function main() {
  const root = process.cwd();
  const pkg = JSON.parse(secureFile(path.join(root, 'package.json')));
  const consumer = JSON.parse(secureFile(path.join(root, 'ghrab-platform.consumer.json')));
  assertSafePlan(pkg.scripts || {});
  if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) throw new Error('P1 requires a completed dist build');

  // A previous GREEN must never mask missing work in a new run.
  for (const { report } of Object.values(TASKS)) {
    fs.rmSync(path.join(root, 'dist', report), { force: true });
  }
  const { results, wallMs } = await executeLanes(task => runNpm(task, root));
  const failed = results.filter(x => x.exitCode !== 0);
  if (results.length !== Object.keys(TASKS).length) throw new Error('P1 missing QA execution');
  let reports = [];
  try { reports = verifyReports(root, consumer.appId, pkg.version); }
  catch (error) { failed.push({ task: 'report-verification', reason: String(error) }); }
  const telemetry = {
    schema: 'activa-p5-p1-orchestration-v1',
    sourceSha: process.env.GHRAB_SOURCE_COMMIT || process.env.GITHUB_SHA || null,
    appId: consumer.appId,
    appVersion: pkg.version,
    lanes: LANES,
    results,
    reports,
    status: failed.length ? 'FAIL' : 'PASS',
    wallMs,
    sequentialTaskMs: results.reduce((s, x) => s + x.durationMs, 0),
    // Only time spent inside these four audits, not complete P5 or full CI.
    scope: 'parallel browser/runtime/XSS/axe audits only',
  };
  fs.mkdirSync(path.join(root, 'qa-results'), { recursive: true });
  fs.writeFileSync(path.join(root, 'qa-results', 'p5-p1-orchestration.json'), JSON.stringify(telemetry, null, 2) + '\n');
  console.log(JSON.stringify({ status: telemetry.status, lanes: telemetry.lanes, wallMs, sequentialTaskMs: telemetry.sequentialTaskMs, reports, failures: failed }));
  if (failed.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(e => { console.error('P1 FAIL-CLOSED: ' + (e.stack || String(e))); process.exitCode = 1; });
}
