const APP_ID='activity-builder';
let studioUrl='/AI-Studio-GHRAB/';
function showAccessBootstrapFailure(title='Přístup nelze ověřit',message='Centrální přístupová služba není dostupná. Otevřete ACTIVA z AI Studia.'){
  document.documentElement.dataset.ghrabAccess='denied';
  document.body.innerHTML='<main class="ghrab-access-gate"><div class="ghrab-access-gate-mark">⬡</div><p class="ghrab-access-gate-eyebrow">AI STUDIO GHRAB</p><h1></h1><p class="ghrab-access-gate-message"></p><div class="ghrab-access-gate-actions"><a class="ghrab-access-gate-primary" data-ghrab-studio-link>Otevřít AI Studio</a></div></main>';
  document.querySelector('.ghrab-access-gate h1').textContent=title;
  document.querySelector('.ghrab-access-gate-message').textContent=message;
  const link=document.querySelector('[data-ghrab-studio-link]');if(link)link.href=studioUrl;
}
function showAccessDenied(){document.documentElement.dataset.ghrabAccess='denied';const f=document.querySelector('.ghrab-access-bootstrap-fallback');if(f){f.querySelector('h1').textContent='Přístup zamítnut';f.querySelector('p').textContent='Otevřete ACTIVA z AI Studia.'}}
function startLocalReporter(context){return import('./reporter-bootstrap.js').then(m=>m.startReporterBestEffort('./error-reporter-adapter.js',{context})).catch(()=>null)}
function unlockProtectedScripts(){const h=window.GHRAB_PLATFORM?.unlockProtectedScripts;if(typeof h!=='function')throw new Error('GHRAB platform unlock helper is unavailable.');return h()}

async function boot(){
  try{
    const deploymentModule=await import('./deployment-config.js');
    const deployment=await deploymentModule.loadDeploymentConfig({appId:APP_ID});
    if(!deploymentModule.currentLocationMatchesApp(deployment,APP_ID))throw new Error('Current application URL does not match the deployment configuration.');
    const urls=deploymentModule.deploymentUrls(deployment);
    studioUrl=urls.studioUrl;
    const {protectApp}=await import(urls.guardUrl);
    let grantedPermit=null;
    document.addEventListener('ghrab:app-access-granted',event=>{
      grantedPermit=event.detail?.permit||null;
    },{once:true});
    const allowed=await protectApp(APP_ID,{studioUrl,errorReporter:false});
    if(!allowed){showAccessDenied();return}
    document.documentElement.dataset.ghrabAccess='granted';
    window.__GHRAB_STUDIO_ACCESS__=Object.freeze({appId:APP_ID,permit:grantedPermit});
    void startLocalReporter('activity-builder:granted');
    unlockProtectedScripts();
  }catch(_){
    showAccessBootstrapFailure();
    void startLocalReporter('activity-builder:bootstrap-failure');
  }
}

void boot();
