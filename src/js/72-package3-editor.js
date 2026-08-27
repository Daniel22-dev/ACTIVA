const package3OriginalSerializeActivityData=serializeActivityData;
const package3OriginalParseActivityData=parseActivityData;
const package3OriginalRenderPropertyPanel=renderPropertyPanel;
const package3OriginalWireEditor=wireEditor;

function p3Multiline(value){return String(value||'').replace(/\r?\n/g,' ↵ ')}
function p3RestoreMultiline(value){return String(value||'').replace(/ ↵ /g,'\n')}
serializeActivityData=function(activity){const d=activity.data||{};switch(activity.type){
  case'stations':return(d.stations||[]).map(x=>`${x.title} | ${x.instruction||''} | ${x.task} | ${x.answer||''} | ${x.minutes||5}`).join('\n');
  case'jigsaw':return[...(d.groups||[]).map(group=>`SKUPINA | ${group.label} | ${p3Multiline(group.source)} | ${(group.questions||[]).map(q=>`${q.question} :: ${q.answer||''}`).join(' ;; ')}`),`SPOLEČNÝ ÚKOL | ${d.finalTask||''}`].join('\n');
  case'expertgroups':return[...(d.groups||[]).map(x=>`${x.role} | ${x.focus} | ${p3Multiline(x.material)} | ${x.deliverable||''}`),`SYNTÉZA | ${d.synthesis||''}`].join('\n');
  case'escaperoom':return[`ÚVOD | ${p3Multiline(d.intro||'')}`,...(d.locks||[]).map(x=>`ZÁMEK | ${x.title} | ${x.task} | ${x.answer||''} | ${x.code||''} | ${x.clue||''}`),`FINÁLNÍ KÓD | ${d.finalCode||''}`].join('\n');
  case'boardgame':return[`PRAVIDLA | ${p3Multiline(d.rules||'')}`,...(d.cells||[]).map(x=>`${x.number} | ${x.type} | ${x.prompt} | ${x.answer||''}`)].join('\n');
  case'rolecards':return[`SITUACE | ${p3Multiline(d.scenario||'')}`,...(d.roles||[]).map(x=>`${x.role} | ${x.goal} | ${x.information||''} | ${x.prompt||''}`)].join('\n');
  case'casestudy':return[`PŘÍPAD | ${p3Multiline(d.caseText||'')}`,...(d.questions||[]).map(x=>`${x.question} | ${x.answer||''}`),`ROZHODNUTÍ | ${d.decision||''}`].join('\n');
  case'debatecards':return[`TEZE | ${d.motion||''}`,...(d.proArguments||[]).map(x=>`PRO | ${x}`),...(d.conArguments||[]).map(x=>`PROTI | ${x}`),...(d.roles||[]).map(x=>`ROLE | ${x.role} | ${x.task}`),`REFLEXE | ${d.reflection||''}`].join('\n');
  case'imageannotation':return(d.markers||[]).map((x,i)=>`${x.label||i+1} | ${x.prompt||''} | ${x.answer||''} | ${x.x} | ${x.y}`).join('\n');
  case'diagramlabels':return(d.markers||[]).map((x,i)=>`${x.label||i+1} | ${x.prompt||''} | ${x.answer||''} | ${x.function||''} | ${x.x} | ${x.y}`).join('\n');
  case'blankmap':return[...(d.markers||[]).map((x,i)=>`BOD | ${x.label||i+1} | ${x.prompt||''} | ${x.answer||''} | ${x.x} | ${x.y}`),...(d.legend||[]).map(x=>`LEGENDA | ${x.symbol} | ${x.meaning}`)].join('\n');
  case'datagraph':return[`NASTAVENÍ | ${d.title||''} | ${d.xLabel||''} | ${d.yLabel||''} | ${(d.chartType||'bar').toUpperCase()}`,...(d.rows||[]).map(x=>`DATA | ${x.label} | ${x.value}`),...(d.questions||[]).map(x=>`OTÁZKA | ${x.question} | ${x.answer||''}`)].join('\n');
  case'timelinecards':return(d.events||[]).map(x=>`${x.date} | ${x.event} | ${x.description||''}`).join('\n');
  default:return package3OriginalSerializeActivityData(activity);
}};

parseActivityData=function(type,text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),current=selectedActivity()?.data||{};switch(type){
  case'stations':return{stations:lines.map(line=>parseLineParts(line,3)).filter(Boolean).map(([title,instruction='',task='',answer='',minutes='5'])=>({title,instruction,task,answer,minutes:Number(minutes||5)})),answerSheetTitle:current.answerSheetTitle||'Odpovědní arch'};
  case'jigsaw':{const groups=[];let finalTask='';for(const line of lines){const p=parseLineParts(line);if(!p)continue;if(p[0].toUpperCase()==='SPOLEČNÝ ÚKOL')finalTask=p.slice(1).join(' | ');else if(p[0].toUpperCase()==='SKUPINA'){const questions=String(p[3]||'').split(';;').map(x=>x.trim()).filter(Boolean).map(item=>{const [question,answer='']=item.split('::').map(x=>x.trim());return{question,answer}});groups.push({label:p[1]||String(groups.length+1),source:p3RestoreMultiline(p[2]||''),questions})}}return{groups,finalTask}}
  case'expertgroups':{const groups=[];let synthesis='';for(const line of lines){const p=parseLineParts(line);if(!p)continue;if(p[0].toUpperCase()==='SYNTÉZA')synthesis=p.slice(1).join(' | ');else groups.push({role:p[0],focus:p[1]||'',material:p3RestoreMultiline(p[2]||''),deliverable:p[3]||''})}return{groups,synthesis}}
  case'escaperoom':{let intro='',finalCode='';const locks=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;const key=p[0].toUpperCase();if(key==='ÚVOD')intro=p3RestoreMultiline(p.slice(1).join(' | '));else if(key==='FINÁLNÍ KÓD')finalCode=p[1]||'';else if(key==='ZÁMEK')locks.push({title:p[1]||'',task:p[2]||'',answer:p[3]||'',code:p[4]||'',clue:p[5]||''})}return{intro,locks,finalCode}}
  case'boardgame':{let rules='';const cells=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;if(p[0].toUpperCase()==='PRAVIDLA')rules=p3RestoreMultiline(p.slice(1).join(' | '));else cells.push({number:Number(p[0]),type:p[1]||'OTÁZKA',prompt:p[2]||'',answer:p[3]||''})}return{rules,cells}}
  case'rolecards':{let scenario='';const roles=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;if(p[0].toUpperCase()==='SITUACE')scenario=p3RestoreMultiline(p.slice(1).join(' | '));else roles.push({role:p[0],goal:p[1]||'',information:p[2]||'',prompt:p[3]||''})}return{scenario,roles}}
  case'casestudy':{let caseText='',decision='';const questions=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;const key=p[0].toUpperCase();if(key==='PŘÍPAD')caseText=p3RestoreMultiline(p.slice(1).join(' | '));else if(key==='ROZHODNUTÍ')decision=p.slice(1).join(' | ');else questions.push({question:p[0],answer:p[1]||''})}return{caseText,questions,decision}}
  case'debatecards':{let motion='',reflection='';const proArguments=[],conArguments=[],roles=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;const key=p[0].toUpperCase();if(key==='TEZE')motion=p.slice(1).join(' | ');else if(key==='PRO')proArguments.push(p.slice(1).join(' | '));else if(key==='PROTI')conArguments.push(p.slice(1).join(' | '));else if(key==='ROLE')roles.push({role:p[1]||'',task:p.slice(2).join(' | ')});else if(key==='REFLEXE')reflection=p.slice(1).join(' | ')}return{motion,proArguments,conArguments,roles,reflection}}
  case'imageannotation':return{imageDataUrl:current.imageDataUrl||'',imageName:current.imageName||'',markers:lines.map((line,i)=>{const p=parseLineParts(line,3)||[];return{label:p[0]||String(i+1),prompt:p[1]||'',answer:p[2]||'',x:Number(p[3]??50),y:Number(p[4]??50)}})};
  case'diagramlabels':return{imageDataUrl:current.imageDataUrl||'',imageName:current.imageName||'',markers:lines.map((line,i)=>{const p=parseLineParts(line,3)||[];return{label:p[0]||String(i+1),prompt:p[1]||'',answer:p[2]||'',function:p[3]||'',x:Number(p[4]??50),y:Number(p[5]??50)}})};
  case'blankmap':{const markers=[],legend=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;if(p[0].toUpperCase()==='LEGENDA')legend.push({symbol:p[1]||'',meaning:p.slice(2).join(' | ')});else if(p[0].toUpperCase()==='BOD')markers.push({label:p[1]||String(markers.length+1),prompt:p[2]||'',answer:p[3]||'',x:Number(p[4]??50),y:Number(p[5]??50)})}return{imageDataUrl:current.imageDataUrl||'',imageName:current.imageName||'',markers,legend}}
  case'datagraph':{let title='',xLabel='',yLabel='',chartType='bar';const rows=[],questions=[];for(const line of lines){const p=parseLineParts(line);if(!p)continue;const key=p[0].toUpperCase();if(key==='NASTAVENÍ'){title=p[1]||'';xLabel=p[2]||'';yLabel=p[3]||'';chartType=String(p[4]||'BAR').toLowerCase()}else if(key==='DATA')rows.push({label:p[1]||'',value:Number(String(p[2]||0).replace(',','.'))});else if(key==='OTÁZKA')questions.push({question:p[1]||'',answer:p[2]||''})}return{title,xLabel,yLabel,chartType,rows,questions}}
  case'timelinecards':return{events:lines.map(line=>parseLineParts(line)).filter(Boolean).map(([date,event,description=''])=>({date,event,description}))};
  default:return package3OriginalParseActivityData(type,text);
}};

function p3IsVisualType(type){return['imageannotation','diagramlabels','blankmap'].includes(type)}
function p3FormatBytes(chars){const bytes=Math.round(Number(chars||0)*.75);return bytes<1024?'—':bytes<1024*1024?`${Math.round(bytes/1024)} kB`:`${(bytes/1024/1024).toFixed(1)} MB`}
function renderVisualAssetEditor(){const panel=$('#visualAssetPanel'),activity=selectedActivity();if(!panel||!activity)return;const visible=p3IsVisualType(activity.type);panel.hidden=!visible;if(!visible)return;const d=activity.data||{},preview=$('#visualEditorPreview'),size=$('#visualAssetSize'),title=$('#visualAssetTitle');if(title)title.textContent=activity.type==='blankmap'?'Mapový podklad':activity.type==='diagramlabels'?'Diagram nebo schéma':'Obrázek nebo fotografie';if(size)size.textContent=d.imageDataUrl?`${d.imageName||'Obrázek'} · ${p3FormatBytes(d.imageDataUrl.length)}`:'Nenahráno';if(!preview)return;if(!d.imageDataUrl){preview.innerHTML='<div class="visual-empty-state"><span>▧</span><b>Nahrajte vlastní podklad</b><small>Po nahrání kliknutím do náhledu přidáte očíslovaný bod.</small></div>';return}preview.innerHTML=`<img src="${d.imageDataUrl}" alt="${esc(d.imageName||'Podklad')}">${(d.markers||[]).map((marker,i)=>`<button type="button" class="editor-marker" data-marker-index="${i}" style="left:${p3Percent(marker.x)}%;top:${p3Percent(marker.y)}%" title="Kliknutím odebrat bod">${esc(marker.label||String(i+1))}</button>`).join('')}`;$$('.editor-marker',preview).forEach(btn=>btn.addEventListener('click',event=>{event.stopPropagation();const index=Number(btn.dataset.markerIndex);activity.data.markers.splice(index,1);activity.data.markers.forEach((marker,i)=>marker.label=String(i+1));renderPropertyPanel();renderPagePreview('student');scheduleSave()}))}

renderPropertyPanel=function(){package3OriginalRenderPropertyPanel();renderVisualAssetEditor()};

async function p3ReadAndCompressImage(file){if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type))throw new Error('Použijte obrázek PNG, JPEG nebo WebP.');if(file.size>12*1024*1024)throw new Error('Původní obrázek je větší než 12 MB.');const url=URL.createObjectURL(file);try{const img=await new Promise((resolve,reject)=>{const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('Obrázek nelze načíst.'));el.src=url});const max=1500,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);let dataUrl=canvas.toDataURL('image/jpeg',.78);if(dataUrl.length>1500000){const smaller=document.createElement('canvas'),ratio=Math.sqrt(1400000/dataUrl.length);smaller.width=Math.max(1,Math.round(canvas.width*ratio));smaller.height=Math.max(1,Math.round(canvas.height*ratio));const sctx=smaller.getContext('2d',{alpha:false});sctx.fillStyle='#ffffff';sctx.fillRect(0,0,smaller.width,smaller.height);sctx.drawImage(canvas,0,0,smaller.width,smaller.height);dataUrl=smaller.toDataURL('image/jpeg',.72)}if(dataUrl.length>1800000)throw new Error('Obrázek se nepodařilo dostatečně zmenšit.');return dataUrl}finally{URL.revokeObjectURL(url)}}

async function handleVisualAssetFile(file){const activity=selectedActivity();if(!activity||!p3IsVisualType(activity.type)||!file)return;try{setSaveState('saving','Zpracovávám obrázek…');const dataUrl=await p3ReadAndCompressImage(file);activity.data.imageDataUrl=dataUrl;activity.data.imageName=file.name.slice(0,160);renderPropertyPanel();renderPagePreview('student');saveProject();toast('Obrazový podklad byl připraven pro tisk. Kliknutím do náhledu přidáte body.','success')}catch(error){captureError(error,'visual-asset');toast(error.message||'Obrázek se nepodařilo načíst.','error')}}
function addMarkerFromPreview(event){const activity=selectedActivity(),preview=$('#visualEditorPreview');if(!activity||!preview||!p3IsVisualType(activity.type)||!activity.data.imageDataUrl||event.target.closest('.editor-marker'))return;const rect=preview.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/rect.width*100,0,100),y=clamp((event.clientY-rect.top)/rect.height*100,0,100),i=(activity.data.markers||[]).length+1,marker={x:Math.round(x*10)/10,y:Math.round(y*10)/10,label:String(i),prompt:activity.type==='blankmap'?`Určete bod ${i}.`:activity.type==='diagramlabels'?`Doplňte název části ${i}.`:`Pojmenujte část ${i}.`,answer:`Odpověď ${i}`};if(activity.type==='diagramlabels')marker.function='Doplňte funkci nebo vysvětlení.';(activity.data.markers||(activity.data.markers=[])).push(marker);renderPropertyPanel();renderPagePreview('student');scheduleSave();toast(`Přidán bod ${i}. Popisek upravte v textovém editoru.`, 'success')}

wireEditor=function(){package3OriginalWireEditor();$('#visualAssetInput')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(file)handleVisualAssetFile(file);event.target.value=''});$('#removeVisualAssetBtn')?.addEventListener('click',()=>{const activity=selectedActivity();if(!activity||!p3IsVisualType(activity.type))return;activity.data.imageDataUrl='';activity.data.imageName='';renderPropertyPanel();renderPagePreview('student');scheduleSave();toast('Obrazový podklad byl odebrán.','info')});$('#clearVisualMarkersBtn')?.addEventListener('click',()=>{const activity=selectedActivity();if(!activity||!p3IsVisualType(activity.type))return;activity.data.markers=[];renderPropertyPanel();renderPagePreview('student');scheduleSave();toast('Všechny body byly odebrány.','info')});$('#visualEditorPreview')?.addEventListener('click',addMarkerFromPreview)};


saveProject=function(){
  try{
    App.project.updatedAt=nowIso();
    const ok=safeSet(localStore,PROJECT_KEY,JSON.stringify(App.project));
    if(!ok){
      setSaveState('error','Místní úložiště je plné');
      toast('Projekt je kvůli obrazovým podkladům příliš velký pro místní úložiště. Uložte jej tlačítkem Export projektu.','error');
      return false;
    }
    setSaveState('','Uloženo');
    return true;
  }catch(error){
    captureError(error,'save-project');
    setSaveState('error','Uložení selhalo');
    return false;
  }
};
