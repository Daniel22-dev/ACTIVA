const APP_ID = 'activity-builder';
let studioUrl = '/AI-Studio-GHRAB/';

function showAccessBootstrapFailure(title = 'Přístup nelze ověřit', message = 'Centrální přístupová služba není dostupná. Zkontrolujte připojení a otevřete aplikaci znovu přes AI Studio.') {
  document.documentElement.dataset.ghrabAccess = 'denied';
  document.body.style.visibility = 'visible';
  document.body.innerHTML = '<main class="ghrab-access-gate"><div class="ghrab-access-gate-mark">⬡</div><p class="ghrab-access-gate-eyebrow">AI STUDIO GHRAB</p><h1></h1><p class="ghrab-access-gate-message"></p><div class="ghrab-access-gate-actions"><a class="ghrab-access-gate-primary" data-ghrab-studio-link>Otevřít AI Studio</a></div></main>';
  document.querySelector('.ghrab-access-gate h1').textContent = title;
  document.querySelector('.ghrab-access-gate-message').textContent = message;
  const link = document.querySelector('[data-ghrab-studio-link]');
  if (link) link.href = studioUrl;
}

function startLocalReporter(context) {
  return import('./reporter-bootstrap.js')
    .then((module) => module.startReporterBestEffort('./error-reporter-adapter.js', { context }))
    .catch(() => null);
}

function unlockProtectedScripts() {
  const helper = window.GHRAB_PLATFORM?.unlockProtectedScripts;
  if (typeof helper !== 'function') throw new Error('GHRAB platform unlock helper is unavailable.');
  return helper();
}

async function boot() {
  try {
    const deploymentModule = await import('./deployment-config.js');
    const deployment = await deploymentModule.loadDeploymentConfig({ appId: APP_ID });
    if (!deploymentModule.currentLocationMatchesApp(deployment, APP_ID)) {
      throw new Error('Current application URL does not match the deployment configuration.');
    }
    const urls = deploymentModule.deploymentUrls(deployment);
    studioUrl = urls.studioUrl;
    const { protectApp } = await import(urls.guardUrl);
    let grantedPermit = null;
    document.addEventListener('ghrab:app-access-granted', (event) => {
      grantedPermit = event.detail?.permit || null;
    }, { once: true });
    const allowed = await protectApp(APP_ID, { studioUrl, errorReporter: false });
    if (!allowed) return;
    window.__GHRAB_STUDIO_ACCESS__ = Object.freeze({ appId: APP_ID, permit: grantedPermit });
    void startLocalReporter('activity-builder:granted');
    unlockProtectedScripts();
  } catch (_) {
    showAccessBootstrapFailure();
    void startLocalReporter('activity-builder:bootstrap-failure');
  }
}

void boot();
