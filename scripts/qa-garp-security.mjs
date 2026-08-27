#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const failures = [];
const checks = [];
const note = (name, ok, detail='') => { checks.push({name,ok,detail}); if(!ok) failures.push(`${name}${detail?`: ${detail}`:''}`); };
const text = (p) => fs.readFileSync(path.join(ROOT,p),'utf8');
const json = (p) => JSON.parse(text(p));
const exists = (p) => fs.existsSync(path.join(ROOT,p));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');

const pkg = json('package.json');
const versionPaths = [
  ['qa/qa-manifest.json','appVersion'],
  ['ghrab-platform.consumer.json','appVersion'],
  ['src/ghrab-platform.consumer.json','appVersion'],
  ['src/ai-operations.json','appVersion'],
  ['src/config/data-manifest.json','appVersion'],
  ['src/config/platform-manifest.json','appVersion'],
  ['src/config/release-acceptance.json','appVersion'],
  ['src/config/security-headers.json','version'],
  ['src/manifest.webmanifest','version'],
  ['reporter-test.config.json','version'],
];
for (const [p,k] of versionPaths) note(`version:${p}`, json(p)?.[k]===pkg.version, `${json(p)?.[k]} != ${pkg.version}`);
note('release-notes-current', exists(`RELEASE-NOTES-${pkg.version}.md`));

for (const p of ['dist/index.html','dist/app.js','dist/access/access-bootstrap.js','dist/access/protected-page-bootstrap.js','dist/manual/manual.js','dist/tests/tests.js']) note(`dist:${p}`, exists(p));

function cspFromHtml(html){ const m=html.match(/http-equiv="Content-Security-Policy"[^>]*content="([^"]+)"/i)||html.match(/content="([^"]+)"[^>]*http-equiv="Content-Security-Policy"/i); return m?.[1] || ''; }
function executableInlineScripts(html){
  const hits=[];
  const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m;
  while((m=re.exec(html))){
    const attrs=m[1]||'', body=(m[2]||'').trim();
    const type=(attrs.match(/\btype=["']([^"']+)["']/i)?.[1]||'').toLowerCase();
    const hasSrc=/\bsrc=["'][^"']+["']/i.test(attrs);
    const inert=type==='application/json'||type==='application/ghrab-protected';
    if(!hasSrc && body && !inert) hits.push({type:type||'classic',sample:body.slice(0,80)});
  }
  return hits;
}
for (const p of ['dist/index.html','dist/manual/index.html','dist/tests/index.html']) {
  const html = text(p); const csp=cspFromHtml(html); const scriptSrc=csp.match(/(?:^|;)\s*script-src\s+([^;]+)/i)?.[1]||'';
  note(`csp-script-no-unsafe:${p}`, !scriptSrc.includes("'unsafe-inline'")&&!scriptSrc.includes("'unsafe-eval'"), scriptSrc);
  note(`csp-script-attr-none:${p}`, /script-src-attr\s+'none'/i.test(csp), csp);
  const inline=executableInlineScripts(html); note(`no-executable-inline:${p}`, inline.length===0, JSON.stringify(inline));
}

const app = text('dist/app.js');
for (const forbidden of ['GHRAB_PLATFORM.isSchoolProfile','createAiRuntimeConfig','enforceLocalKeyPolicy','GHRAB_PLATFORM.authProvider','GHRAB_PLATFORM.recordTelemetry']) note(`no-undefined-platform-api:${forbidden}`, !app.includes(forbidden));
for (const required of ['function isSchoolProfile','actApplyServerKeyPolicy','school-gateway','safeDiagnosticUrl','normalizeProjectData','PROJECT_FILE_LIMIT','LIBRARY_FILE_LIMIT','SHARE_CODE_LIMIT','MAMMOTH_SRI','PDFJS_SRI','PDFJS_WORKER_SRI','verifiedRemoteBlobUrl']) note(`app-hardening:${required}`, app.includes(required));
note('diagnostic-url-strips-query', app.includes("url.search='';url.hash=''"));
note('school-key-provider-fail-closed', /mode==='direct-gemini'&&!actSchoolMode\(\)/.test(app));

const github = json('src/config/deployment.json');
note('github-profile-serverless', github.profile==='github-pages' && github.authMode==='signed-permit' && github.features?.schoolServerConnected===false && github.features?.schoolServerReady===false && github.features?.allowLocalProviderKeys===true);
const school = json('src/config/deployment.school-server.json');
note('school-profile-no-local-key', school.profile==='school-server'&&school.authMode==='server-session'&&school.aiTransport==='school-gateway'&&school.features?.allowLocalProviderKeys===false);
note('school-profile-truthful-not-connected', school.features?.schoolServerConnected===false&&school.features?.schoolServerReady===false&&school.features?.serverSessionReady===false&&school.features?.schoolGatewayReady===false&&school.features?.liveServerValidationRequired===true);
const studio = json('dist/studio-manifest.json');
note('studio-ai-server-ready-false', studio.aiCore?.serverReady===false);
note('studio-no-backend-ready-capability', !studio.capabilities?.includes('backend-ready'));

const sw = text('dist/sw.js');
note('sw-runtime-config-network-bypass', sw.includes("relative === 'config/deployment.json'") && sw.includes("request.cache === 'no-store' || isRuntimeRequest"));
const swOptional=sw.match(/const OPTIONAL\s*=\s*\[([\s\S]*?)\];/)?.[1]||'';
note('sw-no-runtime-deployment-precache', !/deployment(?:\.school-server[^"']*)?\.json/.test(swOptional));
note('sw-protected-app-assets', ['./app.js','./access/access-bootstrap.js','./access/protected-page-bootstrap.js','./manual/manual.js','./tests/tests.js'].every(x=>sw.includes(x)));
note('protected-page-awaits-script-load', text('src/access/protected-page-bootstrap.js').includes('await activateProtectedScripts()') && text('src/access/protected-page-bootstrap.js').includes("executable.addEventListener('load'"));
note('privacy-all-findings-block-ai', text('src/js/30-storage-api.js').includes('function hasBlockingPrivacy(){return App.privacyFindings.length>0}') && text('src/js/40-ai-generation.js').includes('celé jméno nebo adresu'));
const storageSource=text('src/js/30-storage-api.js');
const labeledNameMatch=storageSource.match(/label:'pravděpodobné celé jméno po označení',re:\/([^/]+)\/([a-z]+)/i);
let labeledNameRegex=null;
try{if(labeledNameMatch)labeledNameRegex=new RegExp(labeledNameMatch[1],labeledNameMatch[2])}catch{}
const labeledNameCases=['Žák: Petr Svoboda','Jméno: Petr Svoboda','Student: Petr Svoboda','Matka: Jana Nováková','žák: Petr Svoboda'];
note('privacy-labeled-name-rule-parses', !!labeledNameRegex, labeledNameMatch?.[0]||'nenalezeno');
for(const sample of labeledNameCases){if(labeledNameRegex)labeledNameRegex.lastIndex=0;note(`privacy-labeled-name:${sample.split(':')[0]}`, !!labeledNameRegex?.test(sample), sample)}
if(labeledNameRegex)labeledNameRegex.lastIndex=0;
note('privacy-unlabeled-name-not-overclaimed', !labeledNameRegex?.test('Petr Svoboda odevzdal práci pozdě.'), 'neoznačená jména zůstávají mimo tuto heuristiku a vyžadují lidské potvrzení');

const headers = json('src/config/security-headers.json');
for (const [name,csp] of [['static',headers.staticProfile?.contentSecurityPolicy||''],['school',headers.schoolServerProfile?.headers?.['Content-Security-Policy']||'']]) {
  const part=csp.match(/(?:^|;)\s*script-src\s+([^;]+)/i)?.[1]||'';
  note(`header-csp-script:${name}`, !part.includes("'unsafe-inline'")&&!part.includes("'unsafe-eval'"), part);
}
note('header-style-inline-documented', /style-src[^;]*'unsafe-inline'/.test(headers.staticProfile?.contentSecurityPolicy||'') && /documented non-script compatibility exception/i.test(headers.staticProfile?.note||''));

const workflowsDir=path.join(ROOT,'.github','workflows');
for(const name of fs.readdirSync(workflowsDir).filter(x=>/\.ya?ml$/i.test(x))){
  const content=fs.readFileSync(path.join(workflowsDir,name),'utf8');
  for(const match of content.matchAll(/uses:\s*([^\s#]+)/g)){
    const value=match[1]; if(value.startsWith('actions/')) note(`action-pin:${name}:${value.split('@')[0]}`, /@[0-9a-f]{40}$/i.test(value), value);
  }
}
const deploy=text('.github/workflows/deploy.yml');
note('deploy-top-permissions-readonly', /^permissions:\s*\n\s+contents:\s*read\s*$/m.test(deploy));
note('deploy-job-scoped-pages-permission', /deploy:\s*\n\s+permissions:\s*\n\s+pages:\s*write\s*\n\s+id-token:\s*write/m.test(deploy));

const secretFiles=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['dist','dist-school-server','node_modules','.git','qa-results'].includes(ent.name))continue;const full=path.join(dir,ent.name);if(ent.isDirectory())walk(full);else if(ent.isFile())secretFiles.push(full);}}
walk(ROOT);
const secretPatterns=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['google-api-key',/AIza[0-9A-Za-z_-]{20,}/],
  ['private-jwk-d',/["']d["']\s*:\s*["'][A-Za-z0-9_-]{20,}["']/],
];
for(const file of secretFiles){let value;try{value=fs.readFileSync(file,'utf8')}catch{continue}for(const [kind,re] of secretPatterns){if(re.test(value))failures.push(`secret-scan:${kind}:${path.relative(ROOT,file)}`)}}
note('secret-scan', !failures.some(x=>x.startsWith('secret-scan:')));

const report={schema:'ghrab-garp-security-regression-v1',appId:'activity-builder',version:pkg.version,generatedAt:new Date().toISOString(),checks,failures,status:failures.length?'failed':'passed'};
fs.mkdirSync(path.join(ROOT,'qa-results'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'qa-results','garp-security.json'),JSON.stringify(report,null,2)+'\n');
if(failures.length){console.error('[qa:garp] FAIL');for(const f of failures)console.error('- '+f);process.exit(1)}
console.log(`[qa:garp] PASS · ACTIVA ${pkg.version} · ${checks.length} kontrol · dist app.js sha256 ${sha256('dist/app.js').slice(0,16)}…`);
