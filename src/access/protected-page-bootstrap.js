const APP_ID = 'activity-builder';
let studioUrl = '/AI-Studio-GHRAB/';

function pageLabel() {
  return document.documentElement.dataset.ghrabProtectedPage === 'tests' ? 'testům' : 'manuálu';
}

function failClosed() {
  document.documentElement.dataset.ghrabAccess = 'denied';
  document.body.className = 'ghrab-access-gate-body';
  document.body.innerHTML = '<main class="ghrab-access-gate" role="alert"><div class="ghrab-access-gate-mark">⬡</div><p class="ghrab-access-gate-eyebrow">AI STUDIO GHRAB</p><h1></h1><p></p><div class="ghrab-access-gate-actions"><a class="ghrab-access-gate-primary" data-ghrab-studio-link>Otevřít AI Studio</a></div></main>';
  const heading = document.querySelector('.ghrab-access-gate h1');
  const message = document.querySelector('.ghrab-access-gate p:not(.ghrab-access-gate-eyebrow)');
  if (heading) heading.textContent = `Přístup k ${pageLabel()} nelze ověřit`;
  if (message) message.textContent = `Tato stránka používá stejné oprávnění jako ACTIVA. Otevřete ji z AI Studia nebo z povolené aplikace.`;
  const link = document.querySelector('[data-ghrab-studio-link]');
  if (link) link.href = studioUrl;
}


function showDenied(){
  document.documentElement.dataset.ghrabAccess='denied';
  const f=document.querySelector('.ghrab-access-bootstrap-fallback');
  if(f){f.querySelector('h1').textContent=`Přístup k ${pageLabel()} zamítnut`;f.querySelector('p').textContent='Otevřete stránku z ACTIVA nebo AI Studia.'}
}

async function activateProtectedScripts() {
  const loads = [];
  for (const source of [...document.querySelectorAll('script[type="application/ghrab-protected"][src]')]) {
    const executable = document.createElement('script');
    for (const attr of source.attributes) {
      if (!['type', 'data-ghrab-protected', 'data-ghrab-original-type'].includes(attr.name)) executable.setAttribute(attr.name, attr.value);
    }
    const originalType = source.getAttribute('data-ghrab-original-type');
    if (originalType) executable.type = originalType;
    loads.push(new Promise((resolve, reject) => {
      executable.addEventListener('load', resolve, { once: true });
      executable.addEventListener('error', () => reject(new Error('Protected script failed to load.')), { once: true });
    }));
    source.replaceWith(executable);
  }
  await Promise.all(loads);
}

async function boot() {
  try {
    const deploymentModule = await import('./deployment-config.js');
    const deployment = await deploymentModule.loadDeploymentConfig({ appId: APP_ID });
    if (!deploymentModule.currentLocationMatchesApp(deployment, APP_ID)) throw new Error('Application location mismatch.');
    const urls = deploymentModule.deploymentUrls(deployment);
    studioUrl = urls.studioUrl;
    const guide = document.querySelector('[data-ghrab-guide-link]');
    if (guide) guide.href = urls.reporterGuideUrl;
    const { protectApp } = await import(urls.guardUrl);
    const allowed = await protectApp(APP_ID, { studioUrl, telemetry: false, errorReporter: false });
    if (!allowed) { showDenied(); return; }
    document.documentElement.dataset.ghrabAccess = 'granted';
    await activateProtectedScripts();
    const readyEvent = document.documentElement.dataset.ghrabReadyEvent;
    if (readyEvent) window.dispatchEvent(new Event(readyEvent));
  } catch (_) {
    failClosed();
  }
}

void boot();
