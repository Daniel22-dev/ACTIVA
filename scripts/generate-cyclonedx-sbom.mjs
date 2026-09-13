#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const args=process.argv.slice(2);
const deployMode=args.includes('--deploy');
const checkMode=args.includes('--check');
const positional=args.filter(a=>!a.startsWith('--'));
const outArg=positional[0] || (deployMode?'security/sbom/ludus-deploy.cdx.json':'security/sbom/ludus.cdx.json');
const deployRoot=path.resolve(positional[1] || 'dist-school-server');
const root=process.cwd();
const norm=s=>String(s||'').replace(/\\/g,'/');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const purl=(name,version)=>`pkg:npm/${name.startsWith('@')?name.split('/').map(encodeURIComponent).join('/'):encodeURIComponent(name)}@${encodeURIComponent(version)}`;

function writeOrCheck(bom){
  const text=JSON.stringify(bom,null,2)+'\n', out=path.resolve(root,outArg);
  if(checkMode){
    if(!fs.existsSync(out)){console.error(`FAIL: SBOM snapshot chybí: ${out}`);process.exit(1);}
    if(fs.readFileSync(out,'utf8')!==text){console.error(`FAIL: SBOM snapshot drift: ${out}`);process.exit(1);}
    console.log(`PASS: SBOM snapshot current: ${out}`);
  } else {
    fs.mkdirSync(path.dirname(out),{recursive:true}); fs.writeFileSync(out,text,'utf8');
    console.log(`PASS: CycloneDX 1.7 SBOM vytvořen: ${out} (${bom.components?.length||0} komponent).`);
  }
}

function inferName(lockPath){
  const n=norm(lockPath), marker='node_modules/', idx=n.lastIndexOf(marker);
  if(idx<0)return'';
  const tail=n.slice(idx+marker.length), seg=tail.split('/').filter(Boolean);
  return seg[0]?.startsWith('@') ? seg.slice(0,2).join('/') : (seg[0]||'');
}
function integrityHash(integrity){
  const m=String(integrity||'').match(/^sha512-([A-Za-z0-9+/=]+)$/); if(!m)return null;
  return Buffer.from(m[1],'base64').toString('hex').toUpperCase();
}
function parentPackageRoot(lockPath){
  const n=norm(lockPath), marker='/node_modules/', idx=n.lastIndexOf(marker);
  if(idx>=0)return n.slice(0,idx); if(n.startsWith('node_modules/'))return''; return'';
}

if(!deployMode){
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const entries=[];
  for(const [lockPath,row] of Object.entries(lock.packages||{})){
    if(!lockPath||!row?.version||!norm(lockPath).includes('node_modules/'))continue;
    const name=inferName(lockPath); if(!name)throw new Error(`Nelze odvodit jméno z ${lockPath}`);
    const expectedTail=`node_modules/${name}`;
    if(!norm(lockPath).endsWith(expectedTail))throw new Error(`Jméno neodpovídá klíči lockfile: ${lockPath} -> ${name}`);
    const installedPkg=path.join(root,norm(lockPath),'package.json');
    if(fs.existsSync(installedPkg)){
      const installed=JSON.parse(fs.readFileSync(installedPkg,'utf8'));
      if(installed.name!==name||String(installed.version)!==String(row.version))throw new Error(`node_modules cross-check FAIL: ${lockPath}`);
    }
    const hash=integrityHash(row.integrity); if(!hash)throw new Error(`Chybí SHA-512 integrity: ${lockPath}`);
    const ref=`${purl(name,row.version)}?path=${encodeURIComponent(norm(lockPath))}`;
    const component={type:'library',name,version:String(row.version),purl:purl(name,row.version),'bom-ref':ref,scope:row.dev===true?'excluded':'required',hashes:[{alg:'SHA-512',content:hash}],properties:[{name:'ghrab:lockfilePath',value:norm(lockPath)}]};
    if(row.license)component.licenses=[{license:{id:String(row.license)}}];
    entries.push({lockPath:norm(lockPath),row,name,ref,component});
  }
  entries.sort((a,b)=>Buffer.compare(Buffer.from(a.lockPath),Buffer.from(b.lockPath)));
  const byPath=new Map(entries.map(e=>[e.lockPath,e]));
  const resolveDep=(fromPath,dep)=>{let parent=parentPackageRoot(fromPath);while(true){const c=parent?`${parent}/node_modules/${dep}`:`node_modules/${dep}`;if(byPath.has(c))return byPath.get(c);if(!parent)break;parent=parentPackageRoot(parent)}return null};
  const rootRef=`${purl(pkg.name,pkg.version)}?root=true`;
  const rootDeps=[]; for(const dep of Object.keys({...pkg.dependencies,...pkg.devDependencies,...pkg.optionalDependencies})){const e=byPath.get(`node_modules/${dep}`);if(e)rootDeps.push(e.ref)}
  const dependencies=[{ref:rootRef,dependsOn:[...new Set(rootDeps)].sort()}];
  for(const e of entries){const deps=[];for(const dep of Object.keys({...e.row.dependencies,...e.row.optionalDependencies})){const r=resolveDep(e.lockPath,dep);if(r)deps.push(r.ref)}dependencies.push({ref:e.ref,dependsOn:[...new Set(deps)].sort()})}
  writeOrCheck({'$schema':'https://cyclonedx.org/schema/bom-1.7.schema.json',bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component:{type:'application',name:pkg.name,version:pkg.version,purl:purl(pkg.name,pkg.version),'bom-ref':rootRef}},components:entries.map(e=>e.component),dependencies});
}else{
  if(!fs.existsSync(deployRoot))throw new Error(`Deployment root chybí: ${deployRoot}`);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  function collect(prefixes){
    const files=[];
    function walk(dir,base=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const abs=path.join(dir,e.name),rel=norm(path.posix.join(base,e.name));if(e.isDirectory())walk(abs,rel);else if(e.isFile()&&prefixes.some(p=>rel===p||rel.startsWith(p)))files.push({path:rel,sha256:sha256(fs.readFileSync(abs))})}}
    walk(deployRoot); return files.sort((a,b)=>a.path.localeCompare(b.path));
  }
  const groups=[
    {name:'ghrab-platform',version:'1.1.2',files:collect(['ghrab/ghrab-platform.js','ghrab/ghrab-platform.css','ghrab/ghrab-platform-manifest-1.1.2.json','ghrab/ghrab-artifact-envelope-v1.schema.json','ghrab/ghrab-app-registry-v2.schema.json'])},
    {name:'ghrab-error-reporter',version:'1',files:collect(['access/error-reporter.js','access/error-reporter.css','access/error-reporter-adapter.js','access/reporter-bootstrap.js'])},
    {name:'ghrab-ai-core',version:'1.0.0',files:collect(['vendor/ghrab-ai-core-1.0.0/','ghrab-ai-core-1.0.0/','ai-core/'])}
  ];
  // Some builds inline AI Core into the protected application shell. Record the exact source-vendor hashes too,
  // but mark sourceVendor when the files are not copied into deployment.
  if(!groups[2].files.length){
    const v=path.join(root,'vendor','ghrab-ai-core-1.0.0');
    if(fs.existsSync(v))groups[2].files=fs.readdirSync(v).filter(n=>fs.statSync(path.join(v,n)).isFile()).sort().map(n=>({path:`source-vendor/ghrab-ai-core-1.0.0/${n}`,sha256:sha256(fs.readFileSync(path.join(v,n))),sourceVendor:true}));
  }
  for(const g of groups)if(!g.files.length)throw new Error(`Deploy SBOM group empty: ${g.name}`);
  const components=groups.map(g=>{
    const agg=sha256(Buffer.from(g.files.map(f=>`${f.sha256}  ${f.path}\n`).join(''),'utf8')).toUpperCase();
    const c={type:'library',name:g.name,version:g.version,'bom-ref':`pkg:generic/${encodeURIComponent(g.name)}@${encodeURIComponent(g.version)}`,hashes:[{alg:'SHA-256',content:agg}],properties:[]};
    for(const f of g.files){c.properties.push({name:`ghrab:fileSha256:${f.path}`,value:f.sha256}); if(f.sourceVendor)c.properties.push({name:`ghrab:sourceVendorOnly:${f.path}`,value:'true'});}
    return c;
  });
  writeOrCheck({'$schema':'https://cyclonedx.org/schema/bom-1.7.schema.json',bomFormat:'CycloneDX',specVersion:'1.7',version:1,metadata:{component:{type:'application',name:pkg.name,version:pkg.version}},components});
}
