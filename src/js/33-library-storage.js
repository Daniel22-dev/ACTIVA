const ACTIVA_LIBRARY_STORE = 'materials';
const ACTIVA_LIBRARY_MAX_HISTORY = 40;

App.library = {
  personal: [], school: [], loaded: false, schoolLoaded: false,
  tab: 'personal', search: '', subject: 'all'
};
App.presentation = {
  slides: [], index: 0, revealed: false, startedAt: 0, slideStartedAt: 0,
  timerSeconds: 60, timerRemaining: 60, timerRunning: false, timerId: 0,
  teams: [
    { id: 'A', name: 'Tým A', score: 0 },
    { id: 'B', name: 'Tým B', score: 0 },
    { id: 'C', name: 'Tým C', score: 0 },
    { id: 'D', name: 'Tým D', score: 0 }
  ],
  outcomes: {}, events: [], highlightedTeam: '', visited: new Set()
};

function libraryProjectSnapshot(project, { includeSource = false } = {}) {
  const snapshot = clone(project);
  snapshot.version = ACTIVA_VERSION;
  snapshot.schema = 'activa-project-v1';
  snapshot.id = snapshot.id || uid('project');
  snapshot.updatedAt = nowIso();
  if (!includeSource) snapshot.sourceText = '';
  return snapshot;
}

function normalizeLibraryProject(raw) {
  return normalizeProjectData(raw);
}

function normalizeLibraryEntry(raw, { freshId = false, forcePersonal = false } = {}) {
  if (!raw || raw.schema !== 'activa-library-entry-v1' || !raw.project) throw new Error('Materiál nemá platné schéma ACTIVA.');
  const project = normalizeLibraryProject(raw.project);
  const rawTags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags || '').split(',');
  return {
    schema: 'activa-library-entry-v1',
    id: freshId ? uid('material') : (boundedText(raw.id, 180) || uid('material')),
    title: boundedText(raw.title || project.title || project.topic || 'Materiál', 160).trim(),
    subject: boundedText(raw.subject || project.subject || 'Jiný předmět', 100),
    grade: boundedText(raw.grade || project.grade, 100),
    topic: boundedText(raw.topic || project.topic, 160),
    tags: rawTags.map((tag) => boundedText(tag, 80).trim()).filter(Boolean).slice(0, 12),
    note: boundedText(raw.note, 1200).trim(),
    author: boundedText(raw.author || 'Učitel školy', 120).trim(),
    visibility: forcePersonal ? 'personal' : (raw.visibility === 'school-candidate' ? 'school-candidate' : 'personal'),
    favorite: forcePersonal ? false : !!raw.favorite,
    createdAt: freshId ? nowIso() : (boundedText(raw.createdAt, 40) || nowIso()),
    updatedAt: freshId ? nowIso() : (boundedText(raw.updatedAt, 40) || nowIso()),
    appVersion: ACTIVA_VERSION,
    activityCount: project.activities.length,
    project
  };
}

function libraryFallbackRead() {
  if (!localStore) return clone(ACTIVA_MEMORY_LIBRARY);
  try {
    const parsed = JSON.parse(safeGet(localStore, ACTIVA_LIBRARY_FALLBACK_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return clone(ACTIVA_MEMORY_LIBRARY);
  }
}
function libraryFallbackWrite(entries) {
  if (!activaPersistenceAllowed()) throw new Error('Persistence je po ukončení společné relace zablokována.');
  ACTIVA_MEMORY_LIBRARY = clone(entries);
  if (!localStore) return;
  if (!safeSet(localStore, ACTIVA_LIBRARY_FALLBACK_KEY, JSON.stringify(entries))) {
    throw new Error('Místní úložiště je plné. Exportujte knihovnu a odstraňte velké obrázky.');
  }
}

function libraryDb() {
  return new Promise((resolve) => {
    try {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const request = window.indexedDB.open(ACTIVA_LIBRARY_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ACTIVA_LIBRARY_STORE)) {
          const store = db.createObjectStore(ACTIVA_LIBRARY_STORE, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
          store.createIndex('subject', 'subject');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('[ACTIVA] IndexedDB není dostupná, používám záložní úložiště.', request.error);
        resolve(null);
      };
      request.onblocked = () => resolve(null);
    } catch (error) {
      console.warn('[ACTIVA] IndexedDB nelze otevřít, používám záložní úložiště.', error);
      resolve(null);
    }
  });
}

async function libraryDbAll() {
  const db = await libraryDb();
  if (!db) return libraryFallbackRead();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVA_LIBRARY_STORE, 'readonly');
    const request = tx.objectStore(ACTIVA_LIBRARY_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function libraryDbPut(entry) {
  if (!activaPersistenceAllowed()) throw new Error('Persistence je po ukončení společné relace zablokována.');
  const db = await libraryDb();
  if (!db) {
    const entries = libraryFallbackRead();
    const index = entries.findIndex((item) => item.id === entry.id);
    if (index >= 0) entries[index] = entry;
    else entries.push(entry);
    libraryFallbackWrite(entries);
    return entry;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVA_LIBRARY_STORE, 'readwrite');
    tx.objectStore(ACTIVA_LIBRARY_STORE).put(entry);
    tx.oncomplete = () => {
      db.close();
      resolve(entry);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function libraryDbDelete(id) {
  if (!activaPersistenceAllowed()) throw new Error('Persistence je po ukončení společné relace zablokována.');
  const db = await libraryDb();
  if (!db) {
    libraryFallbackWrite(libraryFallbackRead().filter((entry) => entry.id !== id));
    return;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTIVA_LIBRARY_STORE, 'readwrite');
    tx.objectStore(ACTIVA_LIBRARY_STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function libraryEntryFromProject(meta = {}) {
  const project = libraryProjectSnapshot(App.project, { includeSource: !!meta.includeSource });
  return {
    schema: 'activa-library-entry-v1',
    id: String(meta.id || uid('material')),
    title: String(meta.title || project.title || project.topic || 'Materiál').trim().slice(0, 160),
    subject: String(meta.subject || project.subject || 'Jiný předmět').slice(0, 100),
    grade: String(meta.grade || project.grade || '').slice(0, 100),
    topic: String(meta.topic || project.topic || '').slice(0, 160),
    tags: String(meta.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 12),
    note: String(meta.note || '').trim().slice(0, 1200),
    author: String(meta.author || 'Učitel školy').trim().slice(0, 120),
    visibility: meta.visibility === 'school-candidate' ? 'school-candidate' : 'personal',
    favorite: !!meta.favorite,
    createdAt: meta.createdAt || nowIso(),
    updatedAt: nowIso(),
    appVersion: ACTIVA_VERSION,
    activityCount: project.activities.length,
    project
  };
}

async function refreshPersonalLibrary() {
  try {
    App.library.personal = (await libraryDbAll()).slice(0, LIBRARY_ENTRY_LIMIT)
      .filter((entry) => entry?.schema === 'activa-library-entry-v1')
      .map((entry) => { try { return normalizeLibraryEntry(entry); } catch (_) { return null; } })
      .filter(Boolean)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    App.library.loaded = true;
    return App.library.personal;
  } catch (error) {
    captureError(error, 'library-load');
    App.library.personal = libraryFallbackRead();
    App.library.loaded = true;
    return App.library.personal;
  }
}

async function refreshSchoolLibrary() {
  try {
    const response = await fetch('./school-library/library.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Katalog odpověděl ${response.status}.`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > LIBRARY_FILE_LIMIT) throw new Error('Školní katalog je příliš velký.');
    const text = await response.text();
    if (text.length > LIBRARY_FILE_LIMIT) throw new Error('Školní katalog je příliš velký.');
    const data = JSON.parse(text);
    App.library.school = Array.isArray(data.materials)
      ? data.materials.slice(0, LIBRARY_ENTRY_LIMIT).map((entry) => { try { return normalizeLibraryEntry(entry); } catch (_) { return null; } }).filter(Boolean)
      : [];
    App.library.schoolLoaded = true;
    return App.library.school;
  } catch (error) {
    console.warn('ACTIVA school library unavailable');
    App.library.school = [];
    App.library.schoolLoaded = true;
    return [];
  }
}

async function saveCurrentProjectToLibrary(meta = {}) {
  syncProjectFromForms();
  const existing = meta.id ? App.library.personal.find((entry) => entry.id === meta.id) : null;
  const entry = libraryEntryFromProject({
    ...existing,
    ...meta,
    id: meta.id || existing?.id,
    createdAt: existing?.createdAt,
    favorite: meta.favorite ?? existing?.favorite
  });
  await libraryDbPut(entry);
  await refreshPersonalLibrary();
  return entry;
}
async function deleteLibraryEntry(id) {
  await libraryDbDelete(id);
  await refreshPersonalLibrary();
}
async function toggleLibraryFavorite(id) {
  const entry = App.library.personal.find((item) => item.id === id);
  if (!entry) return;
  entry.favorite = !entry.favorite;
  entry.updatedAt = nowIso();
  await libraryDbPut(entry);
  await refreshPersonalLibrary();
}

function loadLibraryProject(entry) {
  try {
    App.project = normalizeLibraryProject(entry.project);
    App.project.id = uid('project');
    App.project.createdAt = nowIso();
    App.project.updatedAt = nowIso();
    App.project.title = entry.title || App.project.title;
    App.selectedActivityIndex = 0;
    syncFormsFromProject();
    saveProject();
    renderActivityCards();
    setStep(App.project.activities.length ? 'editor' : 'source');
    toast(`Načten materiál „${entry.title}“.`, 'success');
    return true;
  } catch (error) {
    captureError(error, 'library-open-project');
    toast(error.message || 'Materiál se nepodařilo načíst.', 'error');
    return false;
  }
}

function sessionHistory() {
  try {
    const value = JSON.parse(safeGet(localStore, ACTIVA_SESSION_HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}
function saveSessionHistory(history) {
  if (!activaPersistenceAllowed()) return false;
  return safeSet(localStore, ACTIVA_SESSION_HISTORY_KEY, JSON.stringify(history.slice(0, ACTIVA_LIBRARY_MAX_HISTORY)));
}
function recordPresentationSession(summary) {
  const history = sessionHistory();
  history.unshift({
    ...summary,
    schema: 'activa-presentation-summary-v1',
    id: summary.id || uid('session'),
    createdAt: summary.createdAt || nowIso()
  });
  saveSessionHistory(history);
}

function libraryStats() {
  const sessions = sessionHistory();
  const types = {};
  for (const entry of App.library.personal) {
    for (const activity of entry.project?.activities || []) {
      types[activity.type] = (types[activity.type] || 0) + 1;
    }
  }
  for (const session of sessions) {
    for (const type of session.activityTypes || []) types[type] = (types[type] || 0) + 1;
  }
  const topTypes = Object.entries(types)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, label: formatTypeLabel(type), count }));
  return {
    materials: App.library.personal.length,
    favorites: App.library.personal.filter((entry) => entry.favorite).length,
    school: App.library.school.length,
    sessions: sessions.length,
    presentationMinutes: Math.round(sessions.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0) / 60),
    slidesVisited: sessions.reduce((sum, item) => sum + Number(item.slidesVisited || 0), 0),
    topTypes
  };
}

async function exportLibraryBundle() {
  const data = {
    schema: 'activa-library-bundle-v1', version: ACTIVA_VERSION,
    exportedAt: nowIso(), materials: App.library.personal
  };
  try {
    await downloadGhrabArtifact(`ACTIVA-knihovna-${new Date().toISOString().slice(0, 10)}.json`, data, 'activa-library', 'restricted');
    toast('Osobní knihovna byla exportována.', 'success');
  } catch (error) {
    captureError(error, 'library-export');
    toast('Osobní knihovnu se nepodařilo exportovat.', 'error');
  }
}

async function importLibraryBundle(data) {
  const entries = data?.schema === 'activa-library-bundle-v1'
    ? data.materials
    : data?.schema === 'activa-library-entry-v1'
      ? [data]
      : data?.schema === 'activa-share-v1'
        ? [data.material]
        : [];
  if (!Array.isArray(entries) || !entries.length) throw new Error('Soubor neobsahuje materiály ACTIVA.');
  if (entries.length > LIBRARY_ENTRY_LIMIT) throw new Error(`Balíček obsahuje více než ${LIBRARY_ENTRY_LIMIT} materiálů.`);
  let count = 0;
  for (const raw of entries) {
    if (raw?.schema !== 'activa-library-entry-v1') continue;
    const entry = normalizeLibraryEntry(raw, { freshId: true, forcePersonal: true });
    await libraryDbPut(entry);
    count++;
  }
  if (!count) throw new Error('Balíček neobsahuje žádný platný materiál ACTIVA.');
  await refreshPersonalLibrary();
  return count;
}

function csvCell(value) {
  let text = String(value ?? '');
  // CSV formula injection: tabulkový procesor nesmí vstup vyhodnotit jako vzorec.
  if (/^[=+@-]/.test(text)) text = `'${text}`;
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
function exportUsageStats() {
  const rows = [['Datum', 'Téma', 'Předmět', 'Délka (s)', 'Navštívené snímky', 'Správně', 'Částečně', 'Chybně']];
  for (const item of sessionHistory()) {
    rows.push([
      item.createdAt, item.topic, item.subject, item.durationSeconds,
      item.slidesVisited, item.correct, item.partial, item.incorrect
    ]);
  }
  downloadText(
    `ACTIVA-statistiky-${new Date().toISOString().slice(0, 10)}.csv`,
    rows.map((row) => row.map(csvCell).join(';')).join('\n'),
    'text/csv;charset=utf-8'
  );
  toast('Statistiky byly exportovány do CSV.', 'success');
}

const package4OriginalDiagnosticSnapshot = diagnosticSnapshot;
diagnosticSnapshot = function () {
  const snapshot = package4OriginalDiagnosticSnapshot();
  const stats = libraryStats();
  return {
    ...snapshot,
    library: {
      personalMaterials: stats.materials,
      schoolMaterials: stats.school,
      sessionCount: stats.sessions
    },
    presentation: {
      active: !!App.presentation.startedAt,
      slideCount: App.presentation.slides.length,
      currentIndex: App.presentation.index
    }
  };
};
