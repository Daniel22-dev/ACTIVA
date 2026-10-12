#!/usr/bin/env node
// Bound the wait for a real Chromium "page" CDP target; /json/version can
// become available before /json contains any page targets.
import { setTimeout as sleep } from 'node:timers/promises';

export async function waitForChromiumPage(fetchTargets, url, options = {}) {
  const attempts = options.attempts ?? 80;
  const delayMs = options.delayMs ?? 60;
  const wait = options.sleepFn ?? sleep;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 100 || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 200) {
    throw new Error('Invalid bounded Chromium target wait');
  }
  for (let i = 0; i < attempts; i++) {
    const targets = await fetchTargets(url);
    const page = Array.isArray(targets)
      ? targets.find(x => x && x.type === 'page' && typeof x.webSocketDebuggerUrl === 'string' && x.webSocketDebuggerUrl.startsWith('ws://'))
      : null;
    if (page) return page;
    if (i < attempts - 1) await wait(delayMs);
  }
  throw new Error('Chromium debug page target did not appear within bounded readiness window');
}
