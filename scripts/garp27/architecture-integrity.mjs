#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT0=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const V='vendor/garp-2.7-consolidated-r2';
const APP='activity-builder';
const read=(r,root)=>fs.readFileSync(path.join(root,r),'utf8');
const json=(r,root)=>JSON.parse(read(r,root));
const sha=(r,root)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,r))).digest('hex');
function walk(root,rel){const p=path.join(root,rel);if(!fs.existsSync(p))return[];const out=[];for(const e of fs.readdirSync(p,{withFileTypes:true})){const r=path.posix.join(rel,e.name);e.isDirectory()?out.push(...walk(root,r)):out.push(r)}return out.sort()}
function treeDigest(root,rel){const h=crypto.createHash('sha256'),files=walk(root,rel);for(const f of files){h.update(f.slice(rel.length+1));h.update('\0');h.update(sha(f,root));h.update('\n')}return{digest:h.digest('hex'),files:files.length}}
export function evaluateArchitecture(root=ROOT0,options={}){
  const checks=[],findings=[];const ck=(id,ok,detail='',sev='HIGH')=>{checks.push({id,pass:!!ok,detail});if(!ok)findings.push({id,severity:sev,detail})};
  let a,i,g,t,p;try{a=json('security/garp27/architecture-policy.json',root);i=json('security/garp27/capability-inventory.json',root);g=json('security/garp27/garp-policy.json',root);t=json('security/garp27/trust-anchor.json',root);p=json('package.json',root)}catch(e){return{status:'FAIL',checks,findings:[{id:'json',severity:'CRITICAL',detail:String(e)}]}};
  ck('authority',a.singleAuthority==='GARP-2.7'&&g.garpVersion==='2.7'&&g.appId===APP,'GARP-2.7','CRITICAL');
  ck('version',p.version===a.appVersion&&p.version===i.appVersion&&p.version===g.appVersion&&p.version===t.appVersion,p.version,'CRITICAL');
  for(const r of a.requiredFiles||[]) ck('required:'+r,fs.existsSync(path.join(root,r)),r,'CRITICAL');
  const vd=treeDigest(root,V); ck('vendor',vd.digest===t.garp27VendorTreeSha256&&vd.files===t.garp27VendorFileCount,`${vd.files}:${vd.digest}`,'CRITICAL');
  ck('policy-digest',sha('security/garp27/garp-policy.json',root)===t.garpPolicySha256,'','CRITICAL');
  ck('inventory-digest',sha('security/garp27/capability-inventory.json',root)===t.capabilityInventorySha256,'','CRITICAL');
  ck('architecture-digest',sha('security/garp27/architecture-policy.json',root)===t.architecturePolicySha256,'','CRITICAL');
  for(const [r,h] of Object.entries(t.adapterToolSha256s||{})) ck('tool:'+r,fs.existsSync(path.join(root,r))&&sha(r,root)===h,r,'CRITICAL');
  const ops=json('src/ai-operations.json',root), observed=(ops.operations||[]).map(x=>x.operation), tools=[...new Set((ops.operations||[]).flatMap(x=>x.providerTools||[]))].sort();
  ck('ai-ops',JSON.stringify(observed)===JSON.stringify(i.aiOperations),observed.join(','),'CRITICAL');
  ck('provider-tools',tools.length===0&&(i.providerTools||[]).length===0,'none','CRITICAL');
  ck('agentic',i.agentic===false&&i.agenticProfile==='NO'&&(i.autonomousToolCapabilities||[]).length===0,'NO','CRITICAL');
  const school=json('src/config/deployment.school-server.json',root), stand=json('src/config/deployment.json',root);
  ck('egress',stand.aiTransport==='direct-gemini'&&stand.features?.allowLocalProviderKeys===true&&school.aiTransport==='school-gateway'&&school.features?.allowLocalProviderKeys===false,'profiles','CRITICAL');
  ck('live-deferred',school.features?.schoolServerConnected===false&&school.features?.liveServerValidationRequired===true,'fail closed','CRITICAL');
  let conflicts=0;for(const f of walk(root,'security/garp27').filter(x=>x.endsWith('.json')))if(/"garpVersion"\s*:\s*"(?:2\.5|2\.6)"/.test(read(f,root)))conflicts++;
  ck('single-authority',conflicts===0,String(conflicts),'CRITICAL');
  const requireExternal=process.env.GITHUB_ACTIONS==='true'||options.requireExternalTrust;
  if(requireExternal) ck('external-trust',String(process.env.GARP27_EXTERNAL_TRUST_SHA256||options.externalTrustSha256||'').toLowerCase()===sha('security/garp27/trust-anchor.json',root),'pin','CRITICAL');
  const src=(a.sourceScopes||[]).flatMap(s=>walk(root,s)).filter(x=>/\.(?:js|mjs|json)$/.test(x)); ck('source-scope',src.length>=a.minimumCheckedSourceFiles,String(src.length),'CRITICAL');
  const artifact=a.artifactDirectory||'dist-pages', dist=walk(root,artifact); ck('artifact-present',dist.length>=a.minimumArtifactFiles,String(dist.length),'CRITICAL');
  let bad=0;for(const f of dist){const inside=f.startsWith(artifact+'/')?f.slice(artifact.length+1):f;if((a.forbiddenArtifactPathPrefixes||[]).some(x=>inside.startsWith(x)))bad++;if(/\.(?:html|js|mjs|json|txt)$/i.test(f)){const x=read(f,root);for(const z of [...(a.forbiddenArtifactFragments||[]),'-----BEGIN '+'PRIVATE KEY-----','-----BEGIN '+'ENCRYPTED PRIVATE KEY-----'])if(x.includes(z))bad++;}}
  ck('artifact-clean',bad===0,String(bad),'CRITICAL');
  const critical=findings.filter(x=>x.severity==='CRITICAL').length, high=findings.filter(x=>x.severity==='HIGH').length;
  return{classification:'FOUNDATION_ARCHITECTURE_INTEGRITY',status:critical||high?'FAIL':'PASS',garpVersion:'2.7',appId:APP,appVersion:p.version,checks,findings,summary:{total:checks.length,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,critical,high}};
}
if(import.meta.url===pathToFileURL(process.argv[1]).href){const r=evaluateArchitecture(ROOT0,{requireExternalTrust:process.argv.includes('--require-external-trust')});console.log(JSON.stringify(r,null,2));process.exit(r.status==='PASS'?0:1)}
