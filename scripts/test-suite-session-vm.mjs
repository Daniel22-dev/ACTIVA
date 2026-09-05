#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve('.');
const consumer = JSON.parse(fs.readFileSync(path.join(root, 'ghrab-platform.consumer.json'), 'utf8'));
const platformSource = fs.readFileSync(path.join(root, 'vendor/ghrab-platform-1.1.2/ghrab-platform.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(root, 'src/js/30-storage-api.js'), 'utf8');
const suiteSource = fs.readFileSync(path.join(root, 'src/js/32-suite-session-lifecycle.js'), 'utf8');
if (consumer.platform?.version !== '1.1.2') throw new Error('VM suite test vyžaduje Platform 1.1.2.');
if ((suiteSource.split('registerActivaSuiteSession();').length - 1) !== 1) throw new Error('Neočekávaný počet suite handler registrací.');

const qaDir = path.join(root, 'qa-results');
fs.mkdirSync(qaDir, { recursive: true });
const canaryId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const canary = `GARP-STUDENT-CANARY-${canaryId}`;
const syntheticEmail = `garp.student.canary.${canaryId}@example.invalid`;
const syntheticKey = 'SYNTHETIC_PROVIDER_KEY_SUITE_VM_1234567890';

class OriginHost {
  constructor() {
    this.local = new Map();
    this.sessions = new Map();
    this.idbs = new Map();
    this.pages = new Map();
    this.nextPage = 1;
  }
  session(tabId) {
    if (!this.sessions.has(tabId)) this.sessions.set(tabId, new Map());
    return this.sessions.get(tabId);
  }
  mapFor(kind, tabId) { return kind === 'local' ? this.local : this.session(tabId); }
  rawGet(kind, tabId, key) { const map = this.mapFor(kind, tabId); return map.has(String(key)) ? map.get(String(key)) : null; }
  rawKeys(kind, tabId) { return [...this.mapFor(kind, tabId).keys()]; }
  rawSet(kind, tabId, pageId, key, value) {
    const map = this.mapFor(kind, tabId), k = String(key), v = String(value);
    const oldValue = map.has(k) ? map.get(k) : null;
    map.set(k, v);
    if (kind === 'local' && oldValue !== v) this.notifyStorage(pageId, k, oldValue, v);
  }
  rawRemove(kind, tabId, pageId, key) {
    const map = this.mapFor(kind, tabId), k = String(key);
    const oldValue = map.has(k) ? map.get(k) : null;
    map.delete(k);
    if (kind === 'local' && oldValue !== null) this.notifyStorage(pageId, k, oldValue, null);
  }
  notifyStorage(sourcePageId, key, oldValue, newValue) {
    for (const [id, page] of this.pages) {
      if (id === sourcePageId || page.suspended || page.disposed) continue;
      queueMicrotask(() => {
        if (!page.disposed && !page.suspended) page.emitStorage?.({ key, oldValue, newValue, storageArea: page.sandbox.localStorage });
      });
    }
  }
  setIdb(name, payload = canary) { this.idbs.set(name, payload); }
  deleteIdb(name) { this.idbs.delete(name); }
  reset() {
    this.local.clear(); this.sessions.clear(); this.idbs.clear();
    for (const page of this.pages.values()) page.disposed = true;
    this.pages.clear();
  }
}

const host = new OriginHost();

function eventHub() {
  const listeners = new Map();
  return {
    add(type, fn, options) {
      if (typeof fn !== 'function') return;
      const list = listeners.get(type) || [];
      list.push({ fn, once: options?.once === true });
      listeners.set(type, list);
    },
    remove(type, fn) {
      const list = listeners.get(type) || [];
      listeners.set(type, list.filter((x) => x.fn !== fn));
    },
    dispatch(event) {
      const type = String(event?.type || '');
      const list = [...(listeners.get(type) || [])];
      for (const item of list) {
        try { item.fn.call(null, event); } catch (error) { queueMicrotask(() => { throw error; }); }
        if (item.once) this.remove(type, item.fn);
      }
      return true;
    },
  };
}

function blankProject() {
  return {
    schema: 'activa-project-v1', version: consumer.appVersion, id: 'project-blank', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    title: '', subject: '', grade: '', topic: '', goal: '', mode: '', sourceText: '', activities: [], differentiation: {}, print: {},
  };
}

function createPage({ appId = consumer.appId, tabId = `tab-${Date.now()}-${Math.random()}`, loadApp = true, mutateSuite = false, suspended = false } = {}) {
  const pageId = `page-${host.nextPage++}`;
  const windowHub = eventHub();
  const documentHub = eventHub();
  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Promise,
    Map,
    Set,
    WeakMap,
    WeakSet,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    ArrayBuffer,
    Blob,
    crypto: globalThis.crypto,
    performance: { mark() {}, measure() {}, getEntriesByName() { return []; }, now: () => 0 },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    fetch: async () => { throw new Error('Network disabled in synthetic VM suite test'); },
    btoa: (value) => Buffer.from(String(value), 'binary').toString('base64'),
    atob: (value) => Buffer.from(String(value), 'base64').toString('binary'),
    APP_ID: consumer.appId,
    ACTIVA_VERSION: consumer.appVersion,
    createBlankProject: blankProject,
    clone: (value) => structuredClone(value),
    uid: (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 10)}`,
    nowIso: () => new Date().toISOString(),
    clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value))),
    isSchoolProfile: () => false,
    deploymentConfig: () => ({ features: {} }),
    captureError: () => {},
    safeDiagnosticText: (value, max = 500) => String(value ?? '').slice(0, max),
    toast: () => {},
    setSaveState: () => {},
    updateApiUi: () => {},
    closeModal: () => {},
    downloadText: () => {},
    syncProjectFromForms: () => {},
    syncFormsFromProject: () => {},
    renderActivityCards: () => {},
    setStep: () => {},
    updateSourceCounter: () => {},
    scanPrivacy: () => {},
    openModal: () => {},
    normalizeActivity: (x) => x,
    ACTIVITY_REGISTRY: [],
    SUBJECT_PACKS: {},
    $: () => null,
    $$: () => [],
    location: { href: `https://activa.test/${appId}/index.html`, reload() {} },
    navigator: {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    CustomEvent: class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; this.persisted = options.persisted === true; } },
    Event: class Event { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.addEventListener = (type, fn, options) => windowHub.add(type, fn, options);
  sandbox.removeEventListener = (type, fn) => windowHub.remove(type, fn);
  sandbox.dispatchEvent = (event) => windowHub.dispatch(event);

  const docEl = { dataset: { ghrabAppId: appId, ghrabAppVersion: appId === consumer.appId ? consumer.appVersion : '0.21.40' }, hasAttribute: () => false, append() {}, classList: { add() {}, remove() {}, toggle() {} } };
  sandbox.document = {
    readyState: 'loading',
    currentScript: { src: 'https://activa.test/ghrab/ghrab-platform.js' },
    documentElement: docEl,
    body: { hasAttribute: () => false, append() {}, classList: { add() {}, remove() {}, toggle() {} } },
    head: { append() {} },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => ({ tagName: String(tag).toUpperCase(), dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, addEventListener() {}, setAttribute() {}, append() {}, remove() {}, focus() {} }),
    addEventListener: (type, fn, options) => documentHub.add(type, fn, options),
    removeEventListener: (type, fn) => documentHub.remove(type, fn),
    dispatchEvent: (event) => documentHub.dispatch(event),
  };

  class SyntheticStorage {
    constructor(kind) { this.__kind = kind; }
    get length() { return host.mapFor(this.__kind, tabId).size; }
    key(index) { return host.rawKeys(this.__kind, tabId)[Number(index)] ?? null; }
    getItem(key) { return host.rawGet(this.__kind, tabId, key); }
    setItem(key, value) { host.rawSet(this.__kind, tabId, pageId, key, value); }
    removeItem(key) { host.rawRemove(this.__kind, tabId, pageId, key); }
    clear() { for (const key of host.rawKeys(this.__kind, tabId)) host.rawRemove(this.__kind, tabId, pageId, key); }
  }
  sandbox.Storage = SyntheticStorage;
  sandbox.localStorage = new SyntheticStorage('local');
  sandbox.sessionStorage = new SyntheticStorage('session');
  sandbox.__idbMode = 'ok';
  sandbox.indexedDB = {
    deleteDatabase(name) {
      const request = { onsuccess: null, onerror: null, onblocked: null, error: null };
      queueMicrotask(() => {
        if (sandbox.__idbMode === 'blocked') { request.onblocked?.(); return; }
        if (sandbox.__idbMode === 'error') { request.error = new Error('synthetic indexedDB deletion error'); request.onerror?.(); return; }
        host.deleteIdb(String(name)); request.onsuccess?.();
      });
      return request;
    },
    async databases() { return [...host.idbs.keys()].map((name) => ({ name, version: 1 })); },
    open() { throw new Error('indexedDB.open is not used by the lifecycle VM harness'); },
  };

  sandbox.App = {
    project: blankProject(), selectedActivityIndex: 0, activeStep: 'source',
    library: { personal: [], search: '', subject: 'all' },
    api: { key: '', storage: 'none', model: 'gemini-3.6-flash' },
    privacyFindings: [], privacyPreflight: { passed: false, warningAcknowledged: false, checkedAt: '', fields: [] }, lastOperation: '',
  };
  sandbox.GHRAB_PLATFORM_CONFIG = appId === consumer.appId ? {
    appId: consumer.appId,
    appName: consumer.appName,
    appVersion: consumer.appVersion,
    requiredPlatformRange: consumer.platform.requiredRange,
    platformContract: consumer.platform.contract,
    autoFooter: false,
    theme: consumer.theme,
    storageMigration: consumer.storageMigration,
  } : {
    appId,
    appName: 'Synthetic suite coordinator',
    appVersion: '0.21.40',
    requiredPlatformRange: '>=1.1.2 <2.0.0',
    platformContract: 'ghrab-platform-v1',
    autoFooter: false,
    theme: { supported: ['light'], default: 'light' },
  };

  const context = vm.createContext(sandbox, { name: `${appId}:${pageId}` });
  vm.runInContext(platformSource, context, { filename: 'vendor/ghrab-platform-1.1.2/ghrab-platform.js' });
  if (loadApp) {
    vm.runInContext(storageSource, context, { filename: 'src/js/30-storage-api.js' });
    let activeSuiteSource = suiteSource;
    if (mutateSuite) activeSuiteSource = activeSuiteSource.replace('registerActivaSuiteSession();', '/* NEGATIVE CONTROL: suite handler disabled */');
    vm.runInContext(activeSuiteSource, context, { filename: mutateSuite ? 'src/js/32-suite-session-lifecycle.NEGATIVE.js' : 'src/js/32-suite-session-lifecycle.js' });
  }
  const record = {
    pageId, tabId, sandbox, context, suspended, disposed: false,
    emitStorage(data) { sandbox.dispatchEvent({ type: 'storage', ...data }); },
    eval(code) { return vm.runInContext(code, context); },
    async evalAsync(code) { return await vm.runInContext(`(async()=>{${code}})()`, context); },
    dispose() { this.disposed = true; host.pages.delete(pageId); },
  };
  host.pages.set(pageId, record);
  return record;
}

function rawSet(key, value) { host.local.set(String(key), String(value)); }
function rawGet(key) { return host.local.has(String(key)) ? host.local.get(String(key)) : null; }
function rawSession(tabId, key) { const map = host.session(tabId); return map.has(String(key)) ? map.get(String(key)) : null; }
function parseJson(value) { try { return JSON.parse(value || 'null'); } catch { return null; } }

function seedOwnedData(page, { includeLegacyRaw = false } = {}) {
  page.eval(`
    localStorage.setItem('ghrab.activity-builder.project.v1', JSON.stringify({schema:'activa-project-v1',sourceText:${JSON.stringify(canary)},student:${JSON.stringify(syntheticEmail)}}));
    localStorage.setItem('ghrab.activity-builder.library.fallback.v1', JSON.stringify([{text:${JSON.stringify(canary)}}]));
    localStorage.setItem('ghrab.activity-builder.presentation.history.v1', JSON.stringify([{text:${JSON.stringify(canary)}}]));
    localStorage.setItem('ghrab.activity-builder.gemini.key.permanent', ${JSON.stringify(syntheticKey)});
    localStorage.setItem('ghrab.activity-builder.gemini.key.session', ${JSON.stringify(syntheticKey)});
    localStorage.setItem('ghrab.activity-builder.migration.p2-storage-namespace-v1.backup', JSON.stringify({value:${JSON.stringify(canary)}}));
    sessionStorage.setItem('activa.gemini.key.session', ${JSON.stringify(syntheticKey)});
    localStorage.setItem('ghrab.activity-builder.gemini.model','model-sentinel');
    localStorage.setItem('ghrab.activity-builder.theme.v1','light');
    localStorage.setItem('ghrab.activity-builder.migration.p2-storage-namespace-v1.done','marker-sentinel');
    localStorage.setItem('ghrab.other-app.noncontent','OTHER-SENTINEL');
    localStorage.setItem('ghrab.platform.handoff.v2', JSON.stringify({schema:'ghrab-studio-handoff-v2',target:'activity-builder',payload:{text:${JSON.stringify(canary)}}}));
    localStorage.setItem('ghrab.handoff.v1', JSON.stringify({schema:'ghrab-handoff-v1',target:{appId:'activity-builder'},payload:{text:${JSON.stringify(canary)}}}));
    localStorage.setItem('ghrab.pilot.events.v2', JSON.stringify([{appId:'activity-builder',text:${JSON.stringify(canary)}},{appId:'other-app',text:'KEEP'}]));
    App.project.sourceText=${JSON.stringify(canary)}; App.api.key=${JSON.stringify(syntheticKey)}; App.library.personal=[{text:${JSON.stringify(canary)}}];
  `);
  host.setIdb('activa-library-v1', canary);
  if (includeLegacyRaw) host.local.set('activa.synthetic.residual.v1', canary);
}

function seedClosedTabData() {
  rawSet('ghrab.activity-builder.project.v1', JSON.stringify({ schema: 'activa-project-v1', sourceText: canary, student: syntheticEmail }));
  rawSet('ghrab.activity-builder.library.fallback.v1', JSON.stringify([{ text: canary }]));
  rawSet('ghrab.activity-builder.presentation.history.v1', JSON.stringify([{ text: canary }]));
  rawSet('ghrab.activity-builder.gemini.key.permanent', syntheticKey);
  rawSet('ghrab.activity-builder.migration.p2-storage-namespace-v1.backup', JSON.stringify({ value: canary }));
  rawSet('ghrab.activity-builder.gemini.model', 'model-sentinel');
  rawSet('ghrab.activity-builder.theme.v1', 'light');
  rawSet('ghrab.activity-builder.migration.p2-storage-namespace-v1.done', 'marker-sentinel');
  rawSet('ghrab.platform.handoff.v2', JSON.stringify({ schema: 'ghrab-studio-handoff-v2', target: 'activity-builder', payload: { text: canary } }));
  rawSet('ghrab.pilot.events.v2', JSON.stringify([{ appId: 'activity-builder', text: canary }, { appId: 'other-app', text: 'KEEP' }]));
  rawSet('ghrab.other-app.noncontent', 'OTHER-SENTINEL');
  host.setIdb('activa-library-v1', canary);
}

async function triggerSuiteEnd(coordinator) {
  const result = coordinator.eval(`GHRAB_PLATFORM.session.end({reason:'synthetic-vm-suite-end',clearApplicationData:true})`);
  if (!result?.ok || !result?.generation) throw new Error(`Coordinator suite end failed: ${JSON.stringify(result)}`);
  await sleep(10);
  return String(result.generation);
}

async function waitCleanup(page, generation, { expectFailure = false } = {}) {
  const deadline = Date.now() + 3000;
  let last = null;
  while (Date.now() < deadline) {
    try { await page.eval(`window.ACTIVA_WAIT_FOR_SUITE_CLEANUP?.()`); } catch {}
    last = snapshot(page, generation);
    if (expectFailure ? last.state?.stage === 'cleanup-failed' : last.acknowledged) return last;
    await sleep(10);
  }
  return last || snapshot(page, generation);
}

function snapshot(page, generation) {
  const state = parseJson(rawGet('ghrab.activity-builder.suite-session-state.v1'));
  const events = parseJson(rawGet('ghrab.pilot.events.v2'));
  const localCanary = [...host.local.entries()].some(([key, value]) => !key.includes('suite-session') && String(value).includes(canary));
  const sessionCanary = [...host.session(page.tabId).entries()].some(([key, value]) => !key.includes('suite-session') && String(value).includes(canary));
  let memoryCanary = false;
  try { memoryCanary = JSON.stringify(page.sandbox.App).includes(canary); } catch {}
  const contentGone = [
    'ghrab.activity-builder.project.v1',
    'ghrab.activity-builder.library.fallback.v1',
    'ghrab.activity-builder.presentation.history.v1',
    'ghrab.activity-builder.gemini.key.permanent',
    'ghrab.activity-builder.gemini.key.session',
    'ghrab.activity-builder.migration.p2-storage-namespace-v1.backup',
  ].every((key) => rawGet(key) === null)
    && rawSession(page.tabId, 'activa.gemini.key.session') === null
    && !host.idbs.has('activa-library-v1');
  return {
    generation,
    contentGone,
    localCanary,
    sessionCanary,
    memoryCanary,
    handoffGone: rawGet('ghrab.platform.handoff.v2') === null && rawGet('ghrab.handoff.v1') === null,
    ownEventsGone: !Array.isArray(events) || !events.some((e) => e?.appId === consumer.appId || e?.targetAppId === consumer.appId),
    otherEventPreserved: Array.isArray(events) && events.some((e) => e?.appId === 'other-app'),
    settingsPreserved: rawGet('ghrab.activity-builder.gemini.model') === 'model-sentinel'
      && rawGet('ghrab.activity-builder.theme.v1') === 'light'
      && rawGet('ghrab.activity-builder.migration.p2-storage-namespace-v1.done') === 'marker-sentinel',
    otherPreserved: rawGet('ghrab.other-app.noncontent') === 'OTHER-SENTINEL',
    tombstone: rawGet('ghrab.platform.suite-session-generation.v1') === generation,
    platformSeen: rawGet('ghrab.activity-builder.suite-session-seen.v1') === generation,
    tabSeen: rawSession(page.tabId, 'ghrab.activity-builder.suite-session-tab-seen.v1') === generation,
    state,
    blocked: page.eval(`window.ACTIVA_SUITE_DIAGNOSTICS?.().blocked === true`),
    acknowledged: rawGet('ghrab.activity-builder.suite-session-seen.v1') === generation
      && rawSession(page.tabId, 'ghrab.activity-builder.suite-session-tab-seen.v1') === generation
      && state?.generation === generation && state?.stage === 'acknowledged'
      && Boolean(state.cleanupCompletedAt) && Boolean(state.acknowledgedAt)
      && Date.parse(state.acknowledgedAt) >= Date.parse(state.cleanupCompletedAt),
    idbPresent: host.idbs.has('activa-library-v1'),
    legacyResiduals: [...host.local.keys(), ...host.session(page.tabId).keys()].filter((key) => key.startsWith('activa.')),
  };
}

function positiveAssertion(s) {
  return s.contentGone && !s.localCanary && !s.sessionCanary && !s.memoryCanary && s.handoffGone && s.ownEventsGone && s.otherEventPreserved
    && s.settingsPreserved && s.otherPreserved && s.tombstone && s.acknowledged && !s.blocked;
}

const scenarios = [];
function record(name, pass, evidence = {}) {
  scenarios.push({ name, status: pass ? 'PASS' : 'FAIL', evidence });
  if (!pass) throw new Error(`VM suite scenario FAIL: ${name}: ${JSON.stringify(evidence).slice(0, 1800)}`);
}

try {
  // 1) Open child receives a real Platform 1.1.2 storage signal and cleans owned data before acknowledgement.
  host.reset();
  let child = createPage({ tabId: 'open-child' });
  seedOwnedData(child);
  let coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-open', loadApp: false });
  let generation = await triggerSuiteEnd(coordinator);
  let snap = await waitCleanup(child, generation);
  record('open-child-suite-end', positiveAssertion(snap), snap);

  // 2) Child was closed at suite end; later open replays, then same-tab reload does not repeat cleanup.
  host.reset();
  seedClosedTabData();
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-delayed', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  child = createPage({ tabId: 'delayed-tab' });
  snap = await waitCleanup(child, generation);
  const firstAttempt = Number(snap.state?.attempt || 0);
  child.dispose();
  const reloaded = createPage({ tabId: 'delayed-tab' });
  await sleep(30);
  const reloadSnap = snapshot(reloaded, generation);
  record('delayed-open-replay-and-reload-idempotence', positiveAssertion(snap) && reloadSnap.acknowledged && Number(reloadSnap.state?.attempt || 0) === firstAttempt, { first: snap, reload: reloadSnap, firstAttempt });

  // 3) Two tabs: both establish their own per-tab fence; a post-cleanup autosave cannot resurrect the canary.
  host.reset();
  const tabA = createPage({ tabId: 'multi-a' });
  const tabB = createPage({ tabId: 'multi-b' });
  seedOwnedData(tabA);
  tabB.eval(`App.project.sourceText=${JSON.stringify(canary)}; App.api.key=${JSON.stringify(syntheticKey)}; sessionStorage.setItem('activa.gemini.key.session',${JSON.stringify(syntheticKey)});`);
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-multi', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  const snapA = await waitCleanup(tabA, generation);
  const snapB = await waitCleanup(tabB, generation);
  tabA.eval(`saveProject()`); tabB.eval(`saveProject()`);
  await sleep(10);
  const afterAutosaveA = snapshot(tabA, generation), afterAutosaveB = snapshot(tabB, generation);
  record('multi-tab-and-autosave-fence', positiveAssertion(snapA) && positiveAssertion(snapB)
    && afterAutosaveA.tabSeen && afterAutosaveB.tabSeen && !afterAutosaveA.localCanary && !afterAutosaveB.sessionCanary && !afterAutosaveA.memoryCanary && !afterAutosaveB.memoryCanary,
    { tabA: snapA, tabB: snapB, afterAutosaveA, afterAutosaveB });

  // 4) BFCache/history page misses storage event while suspended; pageshow fence catches the newer generation.
  host.reset();
  child = createPage({ tabId: 'history-tab', suspended: true });
  seedOwnedData(child);
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-history', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  const beforeRestore = snapshot(child, generation);
  child.suspended = false;
  child.sandbox.dispatchEvent({ type: 'pageshow', persisted: true });
  snap = await waitCleanup(child, generation);
  record('browser-history-pageshow-fence', !beforeRestore.acknowledged && positiveAssertion(snap), { beforeRestore, afterRestore: snap });

  // 5) Fail closed: synthetic IndexedDB delete is blocked. No acknowledgement is allowed until retry succeeds.
  host.reset();
  child = createPage({ tabId: 'fail-closed-tab' });
  seedOwnedData(child);
  child.sandbox.__idbMode = 'blocked';
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-fail', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  const failed = await waitCleanup(child, generation, { expectFailure: true });
  const correctlyBlocked = failed.state?.stage === 'cleanup-failed' && !failed.platformSeen && !failed.tabSeen && failed.blocked && failed.idbPresent;
  child.sandbox.__idbMode = 'ok';
  await child.eval(`window.ACTIVA_RETRY_SUITE_CLEANUP()`);
  snap = await waitCleanup(child, generation);
  record('fail-closed-storage-error-and-retry', correctlyBlocked && positiveAssertion(snap), { failed, afterRetry: snap });

  // 6) Negative control: disposable source mutation disables the suite registration. The identical positive assertion must FAIL.
  host.reset();
  child = createPage({ tabId: 'negative-tab', mutateSuite: true });
  seedOwnedData(child);
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-negative', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  await sleep(40);
  snap = snapshot(child, generation);
  const observedPositiveAssertion = positiveAssertion(snap);
  record('negative-control-handler-disabled', observedPositiveAssertion === false && snap.contentGone === false && snap.platformSeen === false, {
    mutation: 'Only the final registerActivaSuiteSession() call is disabled in an in-memory disposable copy of src/js/32-suite-session-lifecycle.js.',
    expectedPositiveAssertion: 'FAIL', observedPositiveAssertion: observedPositiveAssertion ? 'PASS' : 'FAIL', snapshot: snap,
  });

  // 7) Legacy residue control: alias layer cannot silently hide a raw legacy key; cleanup must fail closed rather than acknowledge.
  host.reset();
  child = createPage({ tabId: 'legacy-residual-tab' });
  seedOwnedData(child, { includeLegacyRaw: true });
  coordinator = createPage({ appId: 'ai-studio', tabId: 'coord-legacy', loadApp: false });
  generation = await triggerSuiteEnd(coordinator);
  const legacyFailed = await waitCleanup(child, generation, { expectFailure: true });
  record('legacy-residual-fail-closed', legacyFailed.state?.stage === 'cleanup-failed' && !legacyFailed.platformSeen && !legacyFailed.tabSeen && legacyFailed.blocked
    && legacyFailed.legacyResiduals.includes('activa.synthetic.residual.v1'), legacyFailed);
} finally {
  for (const page of host.pages.values()) page.disposed = true;
}

const report = {
  schema: 'activa-suite-session-vm-qa-v1',
  appId: consumer.appId,
  appVersion: consumer.appVersion,
  platformVersion: consumer.platform.version,
  platformContract: 'ghrab-suite-session-v1',
  executionMode: 'node-vm-exact-platform-and-production-cleanup-with-synthetic-storage',
  scopeNote: 'This supplements, but does not replace, native Chromium same-origin/storage/BFCache testing.',
  syntheticOnly: true,
  canary,
  syntheticEmail,
  executedAt: new Date().toISOString(),
  scenarios,
  summary: {
    passed: scenarios.filter((x) => x.status === 'PASS').length,
    failed: scenarios.filter((x) => x.status === 'FAIL').length,
    status: scenarios.every((x) => x.status === 'PASS') ? 'PASS' : 'FAIL',
  },
};
fs.writeFileSync(path.join(qaDir, 'suite-session-vm.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed) process.exitCode = 1;
