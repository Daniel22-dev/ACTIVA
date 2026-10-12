#!/usr/bin/env node
// ACTIVA P2.1: immutable content fingerprint for cached Playwright Chromium.
// The cache is a transport optimisation only. A mismatched executable is never launched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const BROWSER_DIRS = Object.freeze(['chromium-1228', 'ffmpeg-1011']);
export const EXPECTED_VERSION = '1.61.1';
export const MANIFEST_PATH = 'security/toolchain/playwright-chromium-ubuntu2404-x64.json';
const VALID_OS = process.platform === 'linux' && process.arch === 'x64';

function fail(message) { throw new Error('P2 PLAYWRIGHT CACHE FAIL-CLOSED: ' + message); }
function regular(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) fail('Expected regular file: ' + file);
  return fs.readFileSync(file);
}

export function fingerprintTree(cacheRoot, dirs = BROWSER_DIRS) {
  const canonical = path.resolve(cacheRoot);
  const digest = crypto.createHash('sha256');
  let files = 0, bytes = 0, links = 0;
  const names = [...dirs].sort();
  if (new Set(names).size !== names.length || !names.every(x => /^[a-z0-9_-]+$/.test(x))) fail('Invalid browser directory list');
  for (const name of names) {
    const source = path.join(canonical, name);
    if (!fs.lstatSync(source).isDirectory()) fail('Missing browser directory ' + name);
    function descend(current, relative) {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
        const local = path.join(current, entry.name);
        const rel = relative + '/' + entry.name;
        const stat = fs.lstatSync(local);
        if (stat.isDirectory()) {
          digest.update('D\0' + rel + '\0');
          descend(local, rel);
        } else if (stat.isSymbolicLink()) {
          const target = fs.readlinkSync(local);
          const resolved = path.resolve(path.dirname(local), target);
          if (!resolved.startsWith(source + path.sep)) fail('Symlink leaves browser directory: ' + rel);
          digest.update('L\0' + rel + '\0' + target + '\0');
          links++;
        } else if (stat.isFile()) {
          const data = fs.readFileSync(local);
          digest.update('F\0' + rel + '\0' + data.length + '\0');
          digest.update(data);
          digest.update('\0');
          files++; bytes += data.length;
        } else fail('Unsupported cache entry: ' + rel);
      }
    }
    digest.update('ROOT\0' + name + '\0');
    descend(source, name);
  }
  return { treeSha256: digest.digest('hex'), files, bytes, links, directories: names };
}

export function verifyFingerprint(expected, actual) {
  if (expected?.schema !== 'activa-playwright-browser-v1' ||
      expected?.playwrightVersion !== EXPECTED_VERSION ||
      expected?.os !== 'ubuntu-24.04' ||
      expected?.arch !== 'x64' ||
      !/^[a-f0-9]{64}$/.test(String(expected?.treeSha256 || ''))) fail('Unsupported or missing trusted browser baseline');
  if (expected.treeSha256 !== actual.treeSha256 ||
      expected.files !== actual.files ||
      expected.bytes !== actual.bytes ||
      JSON.stringify(expected.directories) !== JSON.stringify(actual.directories)) fail('Browser cache mismatch with trusted baseline');
}

async function main() {
  const mode = process.argv[2];
  if (!['record', 'verify'].includes(mode)) fail('Expected mode record or verify');
  if (!VALID_OS) fail('This baseline is Ubuntu 24.04 x64 only');
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.ImageOS !== 'ubuntu24') fail('GitHub runner is not pinned Ubuntu 24.04');
  const root = process.cwd();
  const pkg = JSON.parse(regular(path.join(root, 'package.json')).toString('utf8'));
  const lock = JSON.parse(regular(path.join(root, 'package-lock.json')).toString('utf8'));
  if (pkg.devDependencies?.playwright !== EXPECTED_VERSION ||
      lock.packages?.['node_modules/playwright']?.version !== EXPECTED_VERSION ||
      lock.packages?.['node_modules/playwright-core']?.version !== EXPECTED_VERSION) fail('Playwright package/lock version mismatch');
  const { chromium } = await import('playwright');
  const browserPath = chromium.executablePath();
  const cacheRoot = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!browserPath.startsWith(path.join(cacheRoot, 'chromium-1228') + path.sep) ||
      !browserPath.endsWith(path.join('chrome-linux64', 'chrome'))) fail('Unexpected Chromium binary path');
  regular(browserPath);
  const actual = fingerprintTree(cacheRoot);
  const identity = {
    schema: 'activa-playwright-browser-v1',
    playwrightVersion: EXPECTED_VERSION,
    os: 'ubuntu-24.04', arch: 'x64',
    ...actual
  };
  if (mode === 'verify') {
    const expected = JSON.parse(regular(path.join(root, MANIFEST_PATH)).toString('utf8'));
    verifyFingerprint(expected, actual);
  }
  // The Playwright APIs and current QA scripts must launch the full Chromium
  // (not its separately distributed headless shell) before any report is accepted.
  const browser = await chromium.launch({ executablePath: browserPath, headless: true, timeout: 15000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  try {
    const page = await browser.newPage();
    await page.goto('data:text/html,<title>ACTIVA-P2</title><main id="check">ready</main>');
    const result = await page.locator('#check').textContent();
    if (result !== 'ready') fail('Full Chromium smoke check failed');
  } finally {
    await browser.close();
  }
  const output = { ...identity, status: mode === 'verify' ? 'VERIFIED' : 'UNATTESTED_OBSERVATION',
    cacheHit: String(process.env.PLAYWRIGHT_CACHE_HIT || 'unknown'),
    sourceSha: process.env.GHRAB_SOURCE_COMMIT || process.env.GITHUB_SHA || null,
    chromiumExecutable: browserPath };
  fs.mkdirSync(path.join(root, 'qa-results'), { recursive: true });
  fs.writeFileSync(path.join(root, 'qa-results', 'ci-playwright-browser.json'), JSON.stringify(output, null, 2) + '\n');
  console.log('P2 PLAYWRIGHT ' + JSON.stringify(output));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(err => { console.error(err.stack || String(err)); process.exitCode = 1; });
}
