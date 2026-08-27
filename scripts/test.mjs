import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const required = [
  'src/index.template.html', 'src/body.html', 'src/styles.css',
  'src/manifest.webmanifest', 'src/sw.js', 'src/studio-manifest.template.json',
  'src/assets/brand/school-logo.png', 'src/manual/index.html'
];
const errors = [];
for (const file of required) if (!existsSync(join(ROOT, file))) errors.push(`Chybí ${file}`);
const jsDir = join(ROOT, 'src/js');
const jsFiles = readdirSync(jsDir).filter((name) => name.endsWith('.js')).sort();
if (jsFiles.length < 8) errors.push('Modularizace musí mít alespoň 8 JS modulů.');
const joined = jsFiles.map((name) => readFileSync(join(jsDir, name), 'utf8')).join('\n');
for (const type of ['matching','sorting','ordering','gapfill','truefalse','multiplechoice','shortanswer','crossword','wordsearch','secretcode','sentenceorder','wordformation','errorcorrection','infogap','calculationchain','unitconversion','conceptmap','labprotocol','sourceanalysis','causeeffect','factopinion','climatedata','coordinates','algorithm','debugcode','safetycase','stations','jigsaw','expertgroups','escaperoom','boardgame','rolecards','casestudy','debatecards','imageannotation','diagramlabels','blankmap','datagraph','timelinecards']) {
  if (!joined.includes(type)) errors.push(`Chybí modul aktivity ${type}`);
}
if (!joined.includes('GHRABTelemetry')) errors.push('Chybí telemetrie AI Studia.');
const telemetryCalls = [];
const telemetryContext = { console, location: { search: '' }, window: { addEventListener() {}, GHRABTelemetry: { recordOutput(payload) { telemetryCalls.push(payload); return true; } } } };
vm.createContext(telemetryContext);
vm.runInContext(readFileSync(join(jsDir, '90-studio-bridge.js'), 'utf8'), telemetryContext);
vm.runInContext("recordActivityPack('success',{source:'qa'});recordActivityPack('error',{source:'qa'});", telemetryContext);
if (telemetryCalls.length !== 2 || telemetryCalls[0]?.outputKind !== 'activity-pack' || telemetryCalls[0]?.successfulQuantity !== 1 || telemetryCalls[1]?.failedQuantity !== 1) errors.push('ACTIVA telemetrie neposílá správný activity-pack pro úspěch a chybu.');
if (!joined.includes("outputKind:'activity-pack'")) errors.push('ACTIVA neposílá povolený typ activity-pack.');
for (const invalidKind of ['worksheet-package','share-package','interactive-html','pdf-export','library-save','presentation-session']) if (joined.includes(`outputKind:'${invalidKind}'`)) errors.push(`ACTIVA používá nepovolený typ výstupu ${invalidKind}.`);
if (!joined.includes('window.print')) errors.push('Chybí tiskový/PDF workflow.');
if (!joined.includes('SUBJECT_PACKS')) errors.push('Chybí předmětové balíčky.');
if (!joined.includes('differentiateActivity')) errors.push('Chybí diferenciační modul.');
if (!joined.includes("['A','B','C']")) errors.push('Chybí varianty A/B/C.');
if (!joined.includes('gemini-3.6-flash')) errors.push('Chybí doporučený model.');
if (!joined.includes('expandPackage3Activity')) errors.push('Chybí automatické dělení skupinových sad na stránky.');
if (!joined.includes('visualAssetPanel') && !readFileSync(join(ROOT, 'src/body.html'), 'utf8').includes('visualAssetPanel')) errors.push('Chybí mediální panel pro obrazové aktivity.');
const tpl = readFileSync(join(ROOT, 'src/index.template.html'), 'utf8');
const accessBootstrap = readFileSync(join(ROOT, 'src/access/access-bootstrap.js'), 'utf8');
if (!/const APP_ID\s*=\s*['\"]activity-builder['\"]/.test(accessBootstrap)) errors.push('Access Guard nemá správné ID.');
if (!accessBootstrap.includes('deployment-config.js') || !accessBootstrap.includes('urls.guardUrl') || !accessBootstrap.includes('currentLocationMatchesApp')) errors.push('Chybí konfigurovatelný fail-closed centrální Access Guard.');
if (!tpl.includes('application/ghrab-protected') || !tpl.includes('./access/access-bootstrap.js')) errors.push('Hlavní aplikace není chráněna externím bootstrapem.');
const manifest = JSON.parse(readFileSync(join(ROOT, 'src/studio-manifest.template.json'), 'utf8').replaceAll('__APP_VERSION__', pkg.version).replaceAll('__BUILD_TIME__', new Date().toISOString()));
if (manifest.id !== 'activity-builder') errors.push('Manifest má chybné ID.');
if (manifest.version !== pkg.version) errors.push('Verze manifestu nesedí.');
if (!JSON.stringify(manifest.capabilities).includes('group-work-kits')) errors.push('Manifest neobsahuje schopnost skupinových sad.');
const sensitivePattern = /(AIza[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY|PRIVATE_KEY\s*=)/;
for (const file of jsFiles) if (sensitivePattern.test(readFileSync(join(jsDir, file), 'utf8'))) errors.push(`Možný tajný údaj v ${file}`);
if (errors.length) {
  console.error(errors.map((x) => `- ${x}`).join('\n'));
  process.exit(1);
}
console.log(`[test] ACTIVA ${pkg.version}: statické kontroly prošly.`);
