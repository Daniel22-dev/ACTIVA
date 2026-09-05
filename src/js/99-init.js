function wireCommon(){
  $$('[data-close]').forEach((button)=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
  $$('.modal-layer').forEach((layer)=>layer.addEventListener('click',(event)=>{if(event.target===layer)closeModal(layer.id)}));
  $('#fullscreenBtn')?.addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(error){captureError(error,'fullscreen');toast('Celou obrazovku se nepodařilo zapnout.','error')}});
  $('#diagnosticsBtn')?.addEventListener('click',()=>{refreshDiagnostics();openModal('diagnosticsModal')});
  $$('.context-help, #manualBtn, #testsBtn').forEach((link)=>link.addEventListener('click',()=>{App.lastOperation='open-help'}));
  $('#copyDiagnosticsBtn')?.addEventListener('click',async()=>{refreshDiagnostics();try{await navigator.clipboard.writeText($('#diagnosticsOutput').textContent);toast('Technický protokol byl zkopírován.','success')}catch(error){captureError(error,'copy-diagnostics');toast('Kopírování se nepodařilo.','error')}});
  $('#downloadDiagnosticsBtn')?.addEventListener('click',()=>downloadText(`ACTIVA-diagnostika-${Date.now()}.json`,JSON.stringify(diagnosticSnapshot(),null,2)));
}
function registerPwa(){if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch((error)=>console.warn('ACTIVA service worker',error)),{once:true})}
function resetUiAfterSuiteCleanup(){syncFormsFromProject();renderActivityCards();setStep('source');try{renderLibrary?.()}catch(_){}}
document.addEventListener('activa:working-data-cleared',()=>{if(document.documentElement.dataset.activaInitialized==='true')resetUiAfterSuiteCleanup()});
async function init(){document.documentElement.dataset.ghrabAccess='granted';const suite=await (window.ACTIVA_WAIT_FOR_SUITE_CLEANUP?.()||Promise.resolve({ok:true}));wireCommon();wireStorageApi();wireWizard();wireEditor();wirePrintExport();wireLibrary();wireProjection();wireShareExport();if(suite?.ok===false){ACTIVA_PERSISTENCE_BLOCKED=true;resetUiAfterSuiteCleanup();toast('ACTIVA je po neúspěšném suite cleanupu v bezpečném režimu. Obnovte stránku po odstranění problému s úložištěm.','error',9000);registerPwa();refreshDiagnostics();document.documentElement.dataset.activaInitialized='true';return}const restored=restoreProject();initApi();syncFormsFromProject();renderActivityCards();if(restored&&App.project.activities.length){setStep('editor');toast('Obnoveno poslední rozpracování.','success')}else setStep('source');registerPwa();refreshDiagnostics();document.documentElement.dataset.activaInitialized='true'}
void init();
