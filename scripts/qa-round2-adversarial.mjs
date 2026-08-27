#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const storage=fs.readFileSync(path.join(ROOT,'src/js/30-storage-api.js'),'utf8');
const library=fs.readFileSync(path.join(ROOT,'src/js/33-library-storage.js'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const failures=[]; let checks=0;
const check=(name,ok,detail='')=>{checks++;if(!ok)failures.push(`${name}${detail?`: ${detail}`:''}`)};
function extractFunction(source,name){
  const start=source.indexOf(`function ${name}(`); if(start<0)throw new Error(`Chybí ${name}`);
  const paren=source.indexOf('(',start); let pdepth=0, quote='', esc=false, open=-1;
  for(let i=paren;i<source.length;i++){
    const ch=source[i];
    if(quote){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote){quote=''}continue}
    if(ch==='\''||ch==='"'||ch==='`'){quote=ch;continue}
    if(ch==='(')pdepth++; else if(ch===')'){pdepth--; if(pdepth===0){open=source.indexOf('{',i);break}}
  }
  if(open<0)throw new Error(`Chybí tělo funkce ${name}`);
  let depth=0; quote=''; esc=false;
  for(let i=open;i<source.length;i++){
    const ch=source[i];
    if(quote){if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote){quote=''}continue}
    if(ch==='\''||ch==='"'||ch==='`'){quote=ch;continue}
    if(ch==='{')depth++; else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`Neuzavřená funkce ${name}`);
}
const context={
  ACTIVA_VERSION:pkg.version,
  App:{project:{schema:'activa-project-v1',version:pkg.version,id:'base',createdAt:'',updatedAt:'',title:'',subject:'',grade:'',topic:'',goal:'',duration:20,difficulty:'standard',mode:'individual',sourceText:'',selectedTypes:[],activities:[],teacherNote:'',variant:'A',activeLevel:'standard',subjectPack:'auto',differentiation:{enabled:true,levels:['support','standard','challenge'],lockedCore:true,balanced:true},print:{logo:true,mono:true,nameLine:true,levelMode:'current',variantMode:'current'}}},
  ACTIVITY_REGISTRY:{matching:{},shortanswer:{}}, SUBJECT_PACKS:{auto:{}}, SOURCE_TEXT_LIMIT:180000,
  clone:v=>JSON.parse(JSON.stringify(v)), boundedText:(v,n)=>String(v??'').slice(0,n), uid:p=>`${p}-fresh`, nowIso:()=> '2026-08-27T00:00:00.000Z',
  clamp:(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a)), normalizeActivity:(a,t,i)=>({id:`a-${i}`,type:t,data:{}})
};
vm.createContext(context);
vm.runInContext(`${extractFunction(storage,'normalizeProjectData')}\n${extractFunction(library,'normalizeLibraryProject')}\n${extractFunction(library,'normalizeLibraryEntry')}`,context);
const {normalizeProjectData,normalizeLibraryEntry}=context;

let threw=false;try{normalizeProjectData({schema:'evil',activities:[]})}catch{threw=true}check('project-schema-rejected',threw);
const malicious=JSON.parse('{"schema":"activa-project-v1","activities":[],"selectedTypes":["matching","evil","__proto__","constructor","toString"],"difficulty":"root","variant":"Z","activeLevel":"admin","subjectPack":"__proto__","__proto__":{"polluted":true}}');
const normalized=normalizeProjectData({...malicious,activities:[{type:'__proto__'},{type:'constructor'},{type:'toString'},...Array.from({length:127},()=>({type:'evil'}))],title:'T'.repeat(400),sourceText:'S'.repeat(180100)});
check('project-no-prototype-pollution',Object.prototype.polluted===undefined && normalized.polluted===undefined);
check('project-activity-cap',normalized.activities.length===100,String(normalized.activities.length));
check('project-type-whitelist',normalized.selectedTypes.length===1&&normalized.selectedTypes[0]==='matching',JSON.stringify(normalized.selectedTypes));
check('project-enum-fallbacks',normalized.difficulty==='standard'&&normalized.variant==='A'&&normalized.activeLevel==='standard'&&normalized.subjectPack==='auto');
check('project-text-bounds',normalized.title.length===180&&normalized.sourceText.length===180000,`${normalized.title.length}/${normalized.sourceText.length}`);
const rawEntry=JSON.parse('{"schema":"activa-library-entry-v1","project":{"schema":"activa-project-v1","activities":[]},"visibility":"school-candidate","favorite":true,"title":"x","__proto__":{"admin":true},"admin":true}');
const entry=normalizeLibraryEntry(rawEntry,{freshId:true,forcePersonal:true});
check('library-force-personal',entry.visibility==='personal'&&entry.favorite===false);
check('library-whitelist-no-admin',!Object.hasOwn(entry,'admin')&&entry.admin===undefined);
check('library-no-prototype-pollution',Object.prototype.admin===undefined);
const tags=normalizeLibraryEntry({...rawEntry,tags:Array.from({length:30},(_,i)=>'x'.repeat(100)+i)},{freshId:true,forcePersonal:true});
check('library-tag-bounds',tags.tags.length===12&&tags.tags.every(t=>t.length<=80),`${tags.tags.length}/${Math.max(...tags.tags.map(t=>t.length))}`);

if(failures.length){console.error('[qa:round2-adversarial] FAIL');for(const f of failures)console.error('- '+f);process.exit(1)}
console.log(`[qa:round2-adversarial] PASS · ${checks} protipříkladů importní normalizace`);
