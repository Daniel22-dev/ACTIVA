'use strict';
const TYPES=['matching','sorting','ordering','gapfill','truefalse','multiplechoice','shortanswer','crossword','wordsearch','secretcode','sentenceorder','wordformation','errorcorrection','infogap','calculationchain','unitconversion','conceptmap','labprotocol','sourceanalysis','causeeffect','factopinion','climatedata','coordinates','algorithm','debugcode','safetycase','stations','jigsaw','expertgroups','escaperoom','boardgame','rolecards','casestudy','debatecards','imageannotation','diagramlabels','blankmap','datagraph','timelinecards'];
const groups=[
 {id:'release',title:'Vydání a manifest',tests:[
  ['manifest',async()=>{const j=await json('../studio-manifest.json');return check(j.id==='activity-builder'&&j.version==='0.5.20','Manifest ACTIVA 0.5.20','ID nebo verze nesouhlasí.')}],
  ['capabilities',async()=>{const j=await json('../studio-manifest.json');return check(['internal-self-tests','complete-in-app-manual','artifact-envelope-v1'].every(x=>j.capabilities?.includes(x)),'Produkční schopnosti jsou deklarované','Chybí produkční capability.')}],
  ['pwa-manifest',async()=>{const j=await json('../manifest.webmanifest');return check(j.theme_color==='#3157FF'&&j.icons?.length>=4,'PWA manifest je úplný','PWA manifest má nečekaná data.')}],
  ['app-shell',async()=>{const t=await text('../index.html');return check(t.includes('ACTIVA')&&t.includes('EDITORIAL WORKSHOP'),'Hlavní aplikace je sestavená','Chybí nový redakční shell.')}]
 ]},
 {id:'modules',title:'39 aktivit a výstupy',tests:[
  ['all-types',async()=>{const t=await text('../app.js');const missing=TYPES.filter(x=>!t.includes(x));return check(!missing.length,'Všech 39 typů je přítomno',missing.length?'Chybí: '+missing.join(', '):'')}],
  ['print',async()=>check(typeof window.print==='function','Tiskové API je dostupné','Prohlížeč neposkytuje window.print.')],
  ['pdf-workflow',async()=>{const t=await text('../app.js');return check(t.includes('window.print')&&t.includes('printStage'),'Tiskový/PDF workflow je přítomen','Chybí tiskové vykreslení.')}],
  ['projection',async()=>{const t=(await text('../index.html'))+(await text('../app.js'));return check(t.includes('presentationModal')&&t.includes('presentationTimer'),'Projekční režim je přítomen','Chybí projekční režim.')}],
  ['sharing',async()=>{const t=await text('../app.js');return check(t.includes('standalone')&&t.includes('ACTIVA4'),'Přenosné sdílení je přítomno','Chybí sdílecí výstup.')}]
 ]},
 {id:'privacy',title:'Soukromí a bezpečnost',tests:[
  ['guard',async()=>{const t=await text('../access/access-bootstrap.js');return check(t.includes('protectApp')&&t.includes("APP_ID = 'activity-builder'")&&t.includes('currentLocationMatchesApp'),'Centrální Access Guard je zapojen','Guard není správně uveden.')}],
  ['no-key',async()=>{const t=(await text('../index.html'))+(await text('../app.js'));return check(!/AIza[0-9A-Za-z_-]{20,}/.test(t),'Ve buildu není API klíč','Byl nalezen řetězec podobný API klíči.')}],
  ['privacy-scan',async()=>{const t=await text('../app.js');return check(t.includes('scanPrivacy')&&t.includes('hasBlockingPrivacy'),'Kontrola citlivých údajů je přítomna','Chybí privacy gate.')}],
  ['diagnostics-minimal',async()=>{const t=await text('../app.js');return check(t.includes('diagnosticSnapshot')&&t.includes('safeDiagnosticUrl')&&!t.includes('sourceText:App.project.sourceText'),'Diagnostika neexportuje zdrojový text','Diagnostika může obsahovat zdrojový text.')}]
 ]},
 {id:'storage',title:'Ukládání a budoucí server',tests:[
  ['localstorage',async()=>{try{const k='activa.selftest.'+Date.now();localStorage.setItem(k,'ok');const ok=localStorage.getItem(k)==='ok';localStorage.removeItem(k);return check(ok,'LocalStorage funguje','Zápis nebo čtení selhalo.')}catch(e){return warn('LocalStorage není dostupné',String(e.message||e))}}],
  ['indexeddb',async()=>{if(!('indexedDB'in window))return warn('IndexedDB není dostupné','Aplikace použije místní záložní režim.');return check(true,'IndexedDB je dostupné','')}],
  ['adapter',async()=>{const t=await text('../app.js');return check(t.includes('activa-persistence-adapter-v1')&&t.includes('serverEnabled:false'),'Úložný adaptér je připraven a server vypnut','Chybí oddělený persistence adapter.')}],
  ['server-no-network',async()=>{const j=await json('../config/deployment.json');return check(j.profile==='github-pages'&&j.features?.schoolServerConnected===false&&j.features?.schoolServerReady===false,'Bezserverové vydání se nepřipojuje k backendu','Serverový režim může být aktivní.')}]
 ]},
 {id:'manual',title:'Manuál a podpora',tests:[
  ['manual',async()=>{const t=await text('../manual/');return check(t.includes('Všech 39 typů aktivit')&&t.includes('Řešení nejčastějších problémů'),'Úplný manuál je dostupný','Manuál není úplný.')}],
  ['context-help',async()=>{const t=(await text('../index.html'))+(await text('../app.js'));return check(t.includes('context-help')&&t.includes('./manual/#editor-a-pdf'),'Kontextová nápověda je propojena','Chybí odkazy z pracovního postupu.')}],
  ['tests-link',async()=>{const t=await text('../index.html');return check(t.includes('./tests/'),'Aplikace odkazuje na interní testy','Chybí odkaz na testovací centrum.')}]
 ]},
 {id:'pwa',title:'PWA a offline režim',tests:[
  ['sw-prefix',async()=>{const t=await text('../sw.js');return check(t.includes('CACHE_PREFIXES')&&t.includes('key.startsWith(prefix)'),'Service worker maže jen vlastní cache','Izolace cache není potvrzena.')}],
  ['atomic-precache',async()=>{const t=await text('../sw.js');return check(t.includes('cache.addAll(REQUIRED)'),'Povinný precache selže atomicky','Chybějící asset může být ignorován.')}],
  ['offline-routes',async()=>{const t=await text('../sw.js');return check(t.includes("'./manual/'")&&t.includes("'./tests/'")&&t.includes('./manual/manual.js')&&t.includes('./tests/tests.js'),'Manuál i testy jsou v precache','Offline precache není úplný.')}]
 ]}
];
const result={schema:'activa-runtime-selftest-v1',version:'0.5.20',createdAt:'',tests:[]};
async function text(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.text()}
async function json(url){return JSON.parse(await text(url))}
function check(ok,pass,fail){return{status:ok?'pass':'fail',message:ok?pass:fail||'Kontrola selhala.'}}
function warn(message,detail=''){return{status:'warn',message,detail}}
async function run(){const root=document.querySelector('#groups');root.replaceChildren();result.createdAt=new Date().toISOString();result.tests=[];for(const group of groups){const section=document.createElement('section');section.className='group';section.innerHTML=`<h2>${group.title}<span class="badge">${group.tests.length} kontrol</span></h2><div class="tests"></div>`;const list=section.querySelector('.tests');root.append(section);for(const [id,fn] of group.tests){const row=document.createElement('div');row.className='test';row.innerHTML=`<span class="state">…</span><div><b>${id}</b><small>Probíhá kontrola…</small></div><code>${group.id}</code>`;list.append(row);let out;try{out=await fn()}catch(e){out={status:'fail',message:String(e.message||e)}}row.classList.add(out.status);row.querySelector('.state').textContent=out.status==='pass'?'✓':out.status==='warn'?'!':'×';row.querySelector('small').textContent=[out.message,out.detail].filter(Boolean).join(' · ');result.tests.push({group:group.id,id,...out})}}renderSummary()}
function renderSummary(){const p=result.tests.filter(x=>x.status==='pass').length,w=result.tests.filter(x=>x.status==='warn').length,f=result.tests.filter(x=>x.status==='fail').length;document.querySelector('#total').textContent=result.tests.length;document.querySelector('#passed').textContent=p;document.querySelector('#warnings').textContent=w;document.querySelector('#failed').textContent=f}
async function copy(){const text=JSON.stringify(result,null,2);try{await navigator.clipboard.writeText(text);document.querySelector('#copyBtn').textContent='Zkopírováno'}catch{const a=document.createElement('textarea');a.value=text;document.body.append(a);a.select();document.execCommand('copy');a.remove()}}
document.querySelector('#runBtn').addEventListener('click',run);document.querySelector('#copyBtn').addEventListener('click',copy);window.addEventListener('activa:tests-ready',run,{once:true});
