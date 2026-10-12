#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { BROWSER_DIRS, fingerprintTree, verifyFingerprint, EXPECTED_VERSION } from './ci-playwright-cache.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'activa-p2-playwright-test-'));
let assertions = 0;
function test(fn) { fn(); assertions++; }
function seed() {
  fs.rmSync(temp, { recursive: true, force: true });
  for (const name of BROWSER_DIRS) fs.mkdirSync(path.join(temp, name), { recursive: true });
  fs.writeFileSync(path.join(temp, BROWSER_DIRS[0], 'chrome'), 'chrome-pinned-binary');
  fs.writeFileSync(path.join(temp, BROWSER_DIRS[1], 'ffmpeg'), 'ffmpeg-pinned-binary');
}
function contract(yml) {
  assert(yml.includes('actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830'));
  assert(yml.includes('~/.cache/ms-playwright'));
  assert(yml.includes("hashFiles('package-lock.json')"));
  assert(yml.includes('ubuntu24-x64-pw1.61.1'));
  assert(yml.includes('npx --no-install playwright install --with-deps --no-shell chromium'));
  assert(yml.includes('node scripts/ci-playwright-cache.mjs verify'));
  assert(!yml.includes('node scripts/ci-playwright-cache.mjs record'));
  assert(!yml.includes('restore-keys:'));
  const install = yml.split('Restore pinned Playwright browser cache (experimental)')[1]?.split('Verify pinned browser cache and Chromium smoke before any QA')[0];
  assert(install && !install.includes('continue-on-error: true'));
}
try {
  seed();
  const first = fingerprintTree(temp);
  const expected = { schema: 'activa-playwright-browser-v1', playwrightVersion: EXPECTED_VERSION, os: 'ubuntu-24.04', arch: 'x64', ...first };
  test(() => assert.match(first.treeSha256, /^[a-f0-9]{64}$/));
  test(() => assert.equal(first.files, 2));
  test(() => assert.equal(first.bytes, 40));
  test(() => assert.deepEqual(first.directories, [...BROWSER_DIRS].sort()));
  test(() => verifyFingerprint(expected, first));
  test(() => assert.deepEqual(fingerprintTree(temp), first));
  fs.appendFileSync(path.join(temp, BROWSER_DIRS[0], 'chrome'), 'tampered');
  test(() => assert.notEqual(fingerprintTree(temp).treeSha256, first.treeSha256));
  test(() => assert.throws(() => verifyFingerprint(expected, fingerprintTree(temp)), /mismatch/));
  seed();
  fs.rmSync(path.join(temp, BROWSER_DIRS[1], 'ffmpeg'));
  test(() => assert.throws(() => verifyFingerprint(expected, fingerprintTree(temp)), /mismatch/));
  seed();
  test(() => assert.throws(() => verifyFingerprint({ ...expected, playwrightVersion: '1.62.0' }, fingerprintTree(temp)), /baseline/));
  test(() => assert.throws(() => verifyFingerprint({ ...expected, os: 'ubuntu-22.04' }, fingerprintTree(temp)), /baseline/));
  test(() => assert.throws(() => verifyFingerprint({ ...expected, treeSha256: 'not-sha' }, fingerprintTree(temp)), /baseline/));
  test(() => assert.throws(() => verifyFingerprint({ ...expected, bytes: 5 }, fingerprintTree(temp)), /mismatch/));
  const link = path.join(temp, BROWSER_DIRS[0], 'external');
  fs.symlinkSync('/etc/passwd', link);
  test(() => assert.throws(() => fingerprintTree(temp), /Symlink leaves/));
  fs.rmSync(link);
  fs.symlinkSync('chrome', link);
  test(() => assert.equal(fingerprintTree(temp).links, 1));
  fs.rmSync(link);
  test(() => assert.throws(() => fingerprintTree(temp, ['../escape']), /directory list/));
  test(() => assert.throws(() => fingerprintTree(temp, ['chromium-1228', 'chromium-1228']), /directory list/));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'security/toolchain/playwright-chromium-ubuntu2404-x64.json'), 'utf8'));
  test(() => assert.match(manifest.treeSha256, /^[a-f0-9]{64}$/));
  test(() => assert.deepEqual(manifest.directories, BROWSER_DIRS));
  test(() => assert.equal(manifest.playwrightVersion, EXPECTED_VERSION));
  const rels = ['.github/workflows/p5-release-gate.yml', '.github/workflows/axe-supplemental.yml', '.github/workflows/deploy.yml'];
  for (const rel of rels) {
    const yml = fs.readFileSync(path.join(root, rel), 'utf8');
    test(() => contract(yml));
    test(() => assert.throws(() => contract(yml.replace('--with-deps --no-shell', '--with-deps')), undefined));
    test(() => assert.throws(() => contract(yml.replace('actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830', 'actions/cache@v4')), undefined));
    test(() => assert.throws(() => contract(yml + '\nrestore-keys: unsafe\n'), undefined));
  }
  const manual = fs.readFileSync(path.join(root, '.github/workflows/manual-browser-qa.yml'), 'utf8');
  test(() => assert(manual.includes('npx playwright install --with-deps chromium') && !manual.includes('--no-shell')));
  console.log(JSON.stringify({ status:'PASS', assertions, scope:'P2 cached Chromium content and workflow fail-closed regression checks' }));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
