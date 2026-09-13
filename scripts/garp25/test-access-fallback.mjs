#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const [index,manual,sw,mainBootstrap,protectedBootstrap]=await Promise.all([readFile('dist/index.html','utf8'),readFile('dist/manual/index.html','utf8'),readFile('dist/sw.js','utf8'),readFile('dist/access/access-bootstrap.js','utf8'),readFile('dist/access/protected-page-bootstrap.js','utf8')]);
function fallbackBlock(text){
  const m=text.match(/<main\b([^>]*\bclass=["'][^"']*\bghrab-access-bootstrap-fallback\b[^"']*["'][^>]*)>([\s\S]*?)<\/main>/i);
  return m?{attrs:m[1],html:m[2],full:m[0]}:null;
}
function stripTags(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function hiddenByOwnMarkupOrCss(text,block){
  if(!block)return true;
  if(/\bhidden\b/i.test(block.attrs)||/\bstyle\s*=\s*["'][^"']*display\s*:\s*none/i.test(block.attrs))return true;
  const css=[...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return css.some(([,selector,body])=>{const positive=selector.replace(/:not\([^)]*ghrab-access-bootstrap-fallback[^)]*\)/gi,'');return /ghrab-access-bootstrap-fallback/.test(positive)&&!/data-ghrab-access\s*=\s*["']?granted/i.test(positive)&&/display\s*:\s*none\s*!?/i.test(body)});
}
function visibleFallback(text,kind){
  const b=fallbackBlock(text); if(!b||hiddenByOwnMarkupOrCss(text,b))return false;
  const plain=stripTags(b.html);
  const titleOk=kind==='manual'?/Ověřuji přístup k manuálu/i.test(plain):/Ověřuji přístup k ACTIVA/i.test(plain);
  return titleOk&&/přístupovou službu/i.test(plain);
}
function arrayBody(name,text){const m=new RegExp(`\\b${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`).exec(text);return m?m[1]:''}
function criticalNotPrecached(text){const bodies=[arrayBody('REQUIRED',text),arrayBody('OPTIONAL',text),arrayBody('PRECACHE',text)].join('\n');return !/access\/(?:access|protected-page)-bootstrap\.js/i.test(bodies)}
function deniedCssOk(text){return /data-ghrab-access\s*=\s*[\"']?denied/i.test(text)&&/data-ghrab-access\s*=\s*[\"']?granted/i.test(text)&&!/html\s*:\s*not\s*\(\s*\[data-ghrab-access\s*=\s*[\"']?checking/i.test(text)}
function mainDenialScriptOk(text){return /if\s*\(\s*!allowed\s*\)\s*\{\s*showAccessDenied\(\)/.test(text)&&/Přístup(?: k ACTIVA)?(?: byl)? zamítnut/.test(text)&&/dataset\.ghrabAccess\s*=\s*['"]denied['"]/.test(text)}
function protectedDenialScriptOk(text){return /if\s*\(\s*!allowed\s*\)\s*\{\s*showDenied\(\)/.test(text)&&/(?:byl )?zamítnut/.test(text)&&/dataset\.ghrabAccess\s*=\s*['"]denied['"]/.test(text)}
function evaluate(i=index,m=manual,s=sw,mb=mainBootstrap,pb=protectedBootstrap){return {mainOk:visibleFallback(i,'main'),manualOk:visibleFallback(m,'manual'),criticalNotPrecached:criticalNotPrecached(s),mainDeniedCss:deniedCssOk(i),manualDeniedCss:deniedCssOk(m),mainDenialScript:mainDenialScriptOk(mb),manualDenialScript:protectedDenialScriptOk(pb)}}
const base=evaluate();
const mutations={
  mainRemoved:evaluate(index.replace(/<main\b[^>]*\bghrab-access-bootstrap-fallback\b[\s\S]*?<\/main>/i,''),manual,sw),
  manualRemoved:evaluate(index,manual.replace(/<main\b[^>]*\bghrab-access-bootstrap-fallback\b[\s\S]*?<\/main>/i,''),sw),
  mainHidden:evaluate(index.replace(/class="ghrab-access-bootstrap-fallback"/,'class="ghrab-access-bootstrap-fallback" hidden'),manual,sw),
  manualHidden:evaluate(index,manual.replace(/class="ghrab-access-bootstrap-fallback"/,'class="ghrab-access-bootstrap-fallback" style="display:none"'),sw),
  p3Critical:evaluate(index,manual,sw.replace(/const OPTIONAL\s*=\s*\[/,'const OPTIONAL = ["./access/protected-page-bootstrap.js",')),
  mainDeniedCssRemoved:evaluate(index.replace(/data-ghrab-access=\"denied\"/,'data-ghrab-access=\"blocked\"'),manual,sw,mainBootstrap,protectedBootstrap),
  mainDenialRemoved:evaluate(index,manual,sw,mainBootstrap.replace(/if\s*\(\s*!allowed\s*\)\s*\{\s*showAccessDenied\(\)\s*;?\s*return\s*;?\s*\}/,'if(!allowed){return}'),protectedBootstrap),
  manualDenialRemoved:evaluate(index,manual,sw,mainBootstrap,protectedBootstrap.replace(/if\s*\(\s*!allowed\s*\)\s*\{\s*showDenied\(\)\s*;?\s*return\s*;?\s*\}/,'if(!allowed){return}'))
};
const negativeControl= !mutations.mainRemoved.mainOk && !mutations.manualRemoved.manualOk && !mutations.mainHidden.mainOk && !mutations.manualHidden.manualOk && !mutations.p3Critical.criticalNotPrecached && !mutations.mainDeniedCssRemoved.mainDeniedCss && !mutations.mainDenialRemoved.mainDenialScript && !mutations.manualDenialRemoved.manualDenialScript;
const status=base.mainOk&&base.manualOk&&base.criticalNotPrecached&&base.mainDeniedCss&&base.manualDeniedCss&&base.mainDenialScript&&base.manualDenialScript&&negativeControl?'PASS':'FAIL';
console.log(JSON.stringify({status,...base,negativeControl,mutations},null,2));
process.exit(status==='PASS'?0:1);
