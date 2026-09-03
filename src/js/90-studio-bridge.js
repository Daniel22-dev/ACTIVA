function recordActivityPack(outcome='success',detail={}){
  const success=outcome==='success',failure=outcome==='error',cancelled=outcome==='cancelled';
  try{return window.GHRABTelemetry?.recordOutput({outputKind:'activity-pack',attemptedQuantity:1,successfulQuantity:success?1:0,failedQuantity:failure?1:0,cancelledQuantity:cancelled?1:0,outcome,metadata:detail})??false}catch(error){console.warn('ACTIVA telemetry failed',error);return false}
}
(function(){
  const HANDOFF_KEY='ghrab.handoff.v1',V2_HANDOFF_KEY='ghrab.platform.handoff.v2';
  function readKey(key){try{return JSON.parse(storageOf('localStorage')?.getItem(key)||'null')}catch(_){return null}}
  function read(){return readKey(HANDOFF_KEY)}
  function remove(){try{storageOf('localStorage')?.removeItem(HANDOFF_KEY)}catch(_){}}
  function v2TargetsThisApp(){const packet=readKey(V2_HANDOFF_KEY);return handoffTargetAppId(packet)===APP_ID}
  function validMaterial(material){return material&&material.schema==='ghrab-material-v1'&&material.content&&typeof material.content==='object'}
  function takeHandoff(){if(v2TargetsThisApp()){const v2=window.GHRAB_PLATFORM?.bridge?.take?.({target:APP_ID,maxBytes:500000});if(v2)return v2}const packet=read(),expires=Date.parse(packet?.expiresAt||'');if(new URLSearchParams(location.search).get('studioHandoff')!=='1'){if(packet&&packet.target===APP_ID&&(!Number.isFinite(expires)||expires<=Date.now()))remove();return null}if(!packet||packet.schema!=='ghrab-handoff-v1'||packet.target!==APP_ID||!validMaterial(packet.material)||!Number.isFinite(expires)||expires<=Date.now()){if(packet?.target===APP_ID)remove();return null}remove();return packet}
  function applyHandoff(packet){const material=packet.material;App.project.sourceText=boundedText(material.content?.sourceText,SOURCE_TEXT_LIMIT);App.project.title=boundedText(material.title||'Pracovní list',180);App.project.topic=boundedText(material.title,220);App.project.subject=boundedText(material.subject||App.project.subject,120);App.project.grade=boundedText([material.yearGroup,material.level].filter(Boolean).join(' · '),120);App.project.goal=boundedText((material.objectives||[]).join('; '),1600);syncFormsFromProject();saveProject();toast('Podklad byl převzat z AI Studia.','success')}
  window.addEventListener('load',()=>{const packet=takeHandoff();if(packet)setTimeout(()=>applyHandoff(packet),150)},{once:true});
})();
