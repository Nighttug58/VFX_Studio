(function(){
'use strict';
/* Pass 2: a layered, pixel-exact editing surface on top of the stable Pass 1 exporter. */
const baseRender=render, baseSync=syncDimensions;
const size=()=>width*height*4;
const blank=()=>new Uint8ClampedArray(size());
const clone=a=>new Uint8ClampedArray(a);
let layerDefs=[{id:1,name:'Calque 1',visible:true,opacity:100}], layerFrames=[[clone(frames[0])]], activeLayer=0, nextLayerId=2;
let selection=null, dragStart=null, beforeStroke=null, lastPoint=null;
let tags=[], palette=['#8b7cff','#fff2db','#dc6571','#d98247','#d7ad55','#58a8d8','#433071','#000000'];
let storedAssets=[];
let db=null;
const oldLibrary=libraryView;
const oldCheckpoint=checkpoint;
const note=notify;
function rgba(hex,alpha=255){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),alpha]}
function same(a,b){return a.every((v,i)=>v===b[i])}
function idx(x,y){return(y*width+x)*4}
function read(a,x,y){return Array.from(a.slice(idx(x,y),idx(x,y)+4))}
function write(a,x,y,v){if(x<0||y<0||x>=width||y>=height)return;const i=idx(x,y);for(let k=0;k<4;k++)a[i+k]=v[k]}
function blend(dst,src,opacity){const sa=src[3]/255*opacity,da=dst[3]/255,out=sa+da*(1-sa);if(!out)return[0,0,0,0];return [0,1,2].map(i=>Math.round((src[i]*sa+dst[i]*da*(1-sa))/out)).concat(Math.round(out*255))}
function composite(n){const output=blank();for(let j=0;j<layerDefs.length;j++){const d=layerDefs[j];if(!d.visible||d.opacity===0)continue;const a=layerFrames[n][j],o=d.opacity/100;for(let i=0;i<a.length;i+=4){if(!a[i+3])continue;const p=blend([output[i],output[i+1],output[i+2],output[i+3]],[a[i],a[i+1],a[i+2],a[i+3]],o);output.set(p,i)}}return output}
function allComposites(){frames=layerFrames.map((_,i)=>composite(i))}
function show(){frames[selected]=composite(selected);baseRender();if(selection){ctx.save();ctx.strokeStyle='#f8f1a5';ctx.lineWidth=1;ctx.setLineDash([2,2]);ctx.strokeRect(selection.x+0.5,selection.y+0.5,selection.w,selection.h);ctx.restore()}renderLayers()}
render=show;
function capture(){return{width,height,frames:frames.map(clone),selected,layerDefs:layerDefs.map(d=>({...d})),layerFrames:layerFrames.map(f=>f.map(clone)),activeLayer}}
checkpoint=function(){undo.push(capture());if(undo.length>35)undo.shift();redo=[]};
restore=function(st){width=st.width;height=st.height;frames=st.frames.map(clone);selected=st.selected;if(st.layerDefs){layerDefs=st.layerDefs.map(d=>({...d}));layerFrames=st.layerFrames.map(f=>f.map(clone));activeLayer=Math.min(st.activeLayer,layerDefs.length-1)}else{layerDefs=[{id:1,name:'Calque 1',visible:true,opacity:100}];layerFrames=frames.map(f=>[clone(f)]);activeLayer=0}baseSync();show()};
$('undo').onclick=()=>{if(!undo.length)return;redo.push(capture());restore(undo.pop())};$('redo').onclick=()=>{if(!redo.length)return;undo.push(capture());restore(redo.pop())};
const controls=document.createElement('div');controls.id='advancedControls';controls.innerHTML=`
<h3>Formes et sélection</h3>
<div class="tools" id="advancedTools">
<button data-adv="line">Ligne</button><button data-adv="rect">Rectangle</button>
<button data-adv="ellipse">Ellipse</button><button data-adv="select">Sélection</button>
<button data-adv="move">Déplacer zone</button><button data-adv="dither">Dithering</button>
</div>
<div class="row"><label><input type="checkbox" id="mirrorX"> Miroir X</label><label><input type="checkbox" id="mirrorY"> Miroir Y</label></div>
<div class="row"><button id="selectAll">Tout sélectionner</button><button id="clearSelection">Désélectionner</button></div>
<div class="row"><button id="outline">Contour 1 px</button><button id="pixelGlow">Glow pixel</button></div>
<h3>Palette projet</h3><div id="paletteSwatches"></div>
<div class="row"><button id="addColor">+ Couleur</button><button id="replaceColor">Remplacer couleur</button></div>
<label>Couleur à remplacer<input type="color" id="oldColor" value="#8b7cff"></label>
<h3>Calques raster</h3><div id="layers"></div>
<div class="row"><button id="addLayer">+ Calque</button><button id="dupLayer">Dupliquer</button></div>
<div class="row"><button id="upLayer">Monter</button><button id="downLayer">Descendre</button><button id="delLayer">Supprimer</button></div>
<label>Opacité du calque <input type="range" id="layerOpacity" min="0" max="100" value="100"></label>
<h3>Bibliothèque avancée</h3>
<label>Tags (séparés par virgules)<input id="assetTags" type="text" placeholder="feu, impact, runes"></label>
<p class="status">IndexedDB avec versions d'assets et sauvegarde JSON. Le projet conserve les calques et la palette.</p>`;
document.querySelector('main section:first-child').append(controls);
const css=document.createElement('style');css.textContent=`
#advancedControls{border-top:1px solid #39445b;margin-top:16px}
#layers{display:flex;flex-direction:column;gap:6px;max-height:250px;overflow:auto}
.layerItem{display:flex;gap:5px;align-items:center;padding:5px;border:1px solid #3d4965;border-radius:6px;background:#121829}
.layerItem.selected{border-color:#8ca4ff}.layerItem .layerName{flex:1;min-width:35px;text-align:left;overflow:hidden;text-overflow:ellipsis}
.layerItem button{padding:4px 6px}#paletteSwatches{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.swatch{width:27px;height:27px;border:2px solid #55637f;border-radius:5px;padding:0}
#advancedControls .row label{display:flex;align-items:center;gap:5px}
#advancedControls input[type=checkbox]{accent-color:#7d97ed}`;document.head.append(css);
function renderLayers(){const host=$('layers');if(!host)return;host.replaceChildren();for(let j=layerDefs.length-1;j>=0;j--){const d=layerDefs[j],row=document.createElement('div');row.className='layerItem'+(j===activeLayer?' selected':'');const eye=document.createElement('button');eye.textContent=d.visible?'◉':'○';eye.title='Afficher / masquer';eye.onclick=()=>{checkpoint();d.visible=!d.visible;show()};const name=document.createElement('button');name.className='layerName';name.textContent=d.name;name.title='Sélectionner ce calque · Double clic pour renommer';name.onclick=()=>{activeLayer=j;renderLayers()};name.ondblclick=()=>{const value=prompt('Nom du calque',d.name);if(value&&value.trim()){checkpoint();d.name=value.trim().slice(0,60);renderLayers()}};row.append(eye,name);host.append(row)}$('layerOpacity').value=layerDefs[activeLayer].opacity}
function drawPalette(){const host=$('paletteSwatches');host.replaceChildren();for(const hex of palette){const b=document.createElement('button');b.className='swatch';b.style.background=hex;b.title=hex;b.onclick=()=>{$('color').value=hex};host.append(b)}}
drawPalette();
$('addColor').onclick=()=>{const v=$('color').value;if(!palette.includes(v))palette.push(v);drawPalette()};
$('replaceColor').onclick=()=>{const a=rgba($('oldColor').value),b=rgba($('color').value);checkpoint();for(const frame of layerFrames)for(const img of frame){for(let i=0;i<img.length;i+=4){if(img[i+3]!==0&&img[i]===a[0]&&img[i+1]===a[1]&&img[i+2]===a[2])img.set([b[0],b[1],b[2],img[i+3]],i)}}show()};
$('addLayer').onclick=()=>{checkpoint();const i=activeLayer+1;layerDefs.splice(i,0,{id:nextLayerId++,name:'Calque '+nextLayerId,visible:true,opacity:100});layerFrames.forEach(f=>f.splice(i,0,blank()));activeLayer=i;show()};
$('dupLayer').onclick=()=>{checkpoint();const i=activeLayer+1;layerDefs.splice(i,0,{...layerDefs[activeLayer],id:nextLayerId++,name:layerDefs[activeLayer].name+' copie'});layerFrames.forEach(f=>f.splice(i,0,clone(f[activeLayer])));activeLayer=i;show()};
$('delLayer').onclick=()=>{if(layerDefs.length===1)return alert('Au moins un calque est nécessaire');checkpoint();layerDefs.splice(activeLayer,1);layerFrames.forEach(f=>f.splice(activeLayer,1));activeLayer=Math.min(activeLayer,layerDefs.length-1);show()};
function changeOrder(dir){const n=activeLayer+dir;if(n<0||n>=layerDefs.length)return;checkpoint();[layerDefs[n],layerDefs[activeLayer]]=[layerDefs[activeLayer],layerDefs[n]];layerFrames.forEach(f=>{[f[n],f[activeLayer]]=[f[activeLayer],f[n]]});activeLayer=n;show()}
$('upLayer').onclick=()=>changeOrder(1);$('downLayer').onclick=()=>changeOrder(-1);
$('layerOpacity').onchange=e=>{checkpoint();layerDefs[activeLayer].opacity=+e.target.value;show()};
function toolSelect(value){tool=value;document.querySelectorAll('[data-tool],[data-adv]').forEach(b=>b.classList.toggle('active',(b.dataset.tool||b.dataset.adv)===tool))}
document.querySelectorAll('[data-adv]').forEach(b=>b.onclick=()=>toolSelect(b.dataset.adv));
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>document.querySelectorAll('[data-adv]').forEach(v=>v.classList.remove('active'))));
function bounded(s){return s&&{x:Math.max(0,Math.min(width-1,s.x)),y:Math.max(0,Math.min(height-1,s.y)),w:Math.max(1,Math.min(width,s.w)),h:Math.max(1,Math.min(height,s.h))}}
function inSelection(x,y){return !selection||(x>=selection.x&&y>=selection.y&&x<selection.x+selection.w&&y<selection.y+selection.h)}
function dot(img,x,y,c){if(!inSelection(x,y))return;write(img,x,y,c);if($('mirrorX').checked)write(img,width-1-x,y,c);if($('mirrorY').checked)write(img,x,height-1-y,c);if($('mirrorX').checked&&$('mirrorY').checked)write(img,width-1-x,height-1-y,c)}
function line(img,a,b,c){let x=a.x,y=a.y,dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=x<b.x?1:-1,sy=y<b.y?1:-1,err=dx-dy;for(;;){dot(img,x,y,c);if(x===b.x&&y===b.y)break;const e=2*err;if(e>-dy){err-=dy;x+=sx}if(e<dx){err+=dx;y+=sy}}}
function rectangle(img,a,b,c){const lo={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y)},hi={x:Math.max(a.x,b.x),y:Math.max(a.y,b.y)};line(img,lo,{x:hi.x,y:lo.y},c);line(img,{x:hi.x,y:lo.y},hi,c);line(img,hi,{x:lo.x,y:hi.y},c);line(img,{x:lo.x,y:hi.y},lo,c)}
function ellipse(img,a,b,c){const cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,rx=Math.abs(b.x-a.x)/2,ry=Math.abs(b.y-a.y)/2;if(!rx&&!ry)return dot(img,Math.round(cx),Math.round(cy),c);const steps=Math.max(12,Math.ceil(8*Math.max(rx,ry)));let prev=null;for(let i=0;i<=steps;i++){const t=i*2*Math.PI/steps,p={x:Math.round(cx+rx*Math.cos(t)),y:Math.round(cy+ry*Math.sin(t))};if(prev)line(img,prev,p,c);prev=p}}
function fillLayer(img,x,y,c){const old=read(img,x,y);if(same(old,c))return;const seen=new Uint8Array(width*height),stack=[y*width+x];while(stack.length){const pos=stack.pop();if(seen[pos])continue;seen[pos]=1;const px=pos%width,py=Math.floor(pos/width),at=pos*4;if(!inSelection(px,py)||!same(Array.from(img.slice(at,at+4)),old))continue;write(img,px,py,c);if(px>0)stack.push(pos-1);if(px<width-1)stack.push(pos+1);if(py>0)stack.push(pos-width);if(py<height-1)stack.push(pos+width)}}
function moveRegion(img,dx,dy){if(!selection)return;const source=clone(img);for(let y=selection.y;y<selection.y+selection.h;y++)for(let x=selection.x;x<selection.x+selection.w;x++)write(img,x,y,[0,0,0,0]);for(let y=selection.y;y<selection.y+selection.h;y++)for(let x=selection.x;x<selection.x+selection.w;x++)write(img,x+dx,y+dy,read(source,x,y))}
function effect(kind){checkpoint();const img=layerFrames[selected][activeLayer],source=clone(img),color=rgba($('color').value);for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(!inSelection(x,y)||read(source,x,y)[3]!==0)continue;let nearest=false;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){let nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height&&read(source,nx,ny)[3]>0)nearest=true}if(nearest){if(kind==='outline')write(img,x,y,color);else write(img,x,y,[color[0],color[1],color[2],90])}}show()}
$('outline').onclick=()=>effect('outline');$('pixelGlow').onclick=()=>effect('glow');
$('selectAll').onclick=()=>{selection={x:0,y:0,w:width,h:height};note('Toute la frame sélectionnée')};
$('clearSelection').onclick=()=>{selection=null;note('Sélection effacée')};
function updateSelection(a,b){selection={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x)+1,h:Math.abs(a.y-b.y)+1}}
function paintAdvanced(e,phase){const point=location(e),img=layerFrames[selected][activeLayer],color=tool==='eraser'?[0,0,0,0]:rgba($('color').value);
if(phase==='down'){dragStart=point;lastPoint=point;beforeStroke=clone(img);if(tool==='picker'){let p=read(img,point.x,point.y);$('color').value='#'+p.slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');return}if(tool==='fill'){fillLayer(img,point.x,point.y,color);show();return}}
if(tool==='select'){updateSelection(dragStart,point);show();if(phase==='up')note('Sélection : '+selection.w+' × '+selection.h);return}
if(tool==='picker'||tool==='fill')return;
if(tool==='line'||tool==='rect'||tool==='ellipse'||tool==='move'){img.set(beforeStroke);if(tool==='line')line(img,dragStart,point,color);if(tool==='rect')rectangle(img,dragStart,point,color);if(tool==='ellipse')ellipse(img,dragStart,point,color);if(tool==='move')moveRegion(img,point.x-dragStart.x,point.y-dragStart.y)}
else if(tool==='dither'){line(img,lastPoint,point,color);for(let y=Math.min(lastPoint.y,point.y)-1;y<=Math.max(lastPoint.y,point.y)+1;y++)for(let x=Math.min(lastPoint.x,point.x)-1;x<=Math.max(lastPoint.x,point.x)+1;x++)if((x+y)%2===0&&inSelection(x,y))dot(img,x,y,color)}
else line(img,lastPoint,point,color);
lastPoint=point;show()}
canvas.addEventListener('pointerdown',e=>{if(playing){e.stopImmediatePropagation();return}e.stopImmediatePropagation();drawing=true;checkpoint();canvas.setPointerCapture(e.pointerId);paintAdvanced(e,'down')},true);
canvas.addEventListener('pointermove',e=>{if(!drawing)return;e.stopImmediatePropagation();paintAdvanced(e,'move')},true);
canvas.addEventListener('pointerup',e=>{if(!drawing)return;e.stopImmediatePropagation();paintAdvanced(e,'up');if(tool==='move'&&selection){selection={...selection,x:Math.max(0,Math.min(width-1,selection.x+location(e).x-dragStart.x)),y:Math.max(0,Math.min(height-1,selection.y+location(e).y-dragStart.y))};show()}drawing=false},true);
canvas.addEventListener('pointercancel',e=>{if(drawing){e.stopImmediatePropagation();drawing=false;show()}},true);
function addFrame(duplicate){if(frames.length>=MAX_FRAMES)return alert('Maximum 240 frames');checkpoint();const source=layerFrames[selected],next=source.map(img=>duplicate?clone(img):blank());layerFrames.splice(++selected,0,next);frames.splice(selected,0,composite(selected));show()}
$('addFrame').onclick=()=>addFrame(false);$('duplicateFrame').onclick=()=>addFrame(true);
$('deleteFrame').onclick=()=>{if(frames.length===1)return alert('Conserver au moins une frame');checkpoint();layerFrames.splice(selected,1);frames.splice(selected,1);selected=Math.min(selected,frames.length-1);show()};
$('resize').onclick=()=>{const w=+$('w').value,h=+$('h').value;if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>256||h>256){alert('Dimensions : 1 à 256 pixels');return}checkpoint();const oldW=width,oldH=height;layerFrames=layerFrames.map(f=>f.map(img=>{const dst=new Uint8ClampedArray(w*h*4);for(let y=0;y<Math.min(oldH,h);y++)for(let x=0;x<Math.min(oldW,w);x++)dst.set(img.slice((y*oldW+x)*4,(y*oldW+x)*4+4),(y*w+x)*4);return dst}));width=w;height=h;selection=null;frames=layerFrames.map(()=>blank());baseSync();show()};
$('newProject').onclick=()=>{if(!confirm('Créer un nouveau projet ? Les changements non exportés seront perdus.'))return;stop();checkpoint();layerDefs=[{id:1,name:'Calque 1',visible:true,opacity:100}];layerFrames=[[blank()]];frames=[blank()];activeLayer=0;selected=0;selection=null;show()};
$('importPng').onchange=e=>{const f=e.target.files[0];if(!f)return;const url=URL.createObjectURL(f),im=new Image();im.onload=()=>{stop();checkpoint();const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(im,0,0,width,height);layerFrames[selected][activeLayer]=g.getImageData(0,0,width,height).data;show();URL.revokeObjectURL(url);note('PNG importé dans le calque actif')};im.onerror=()=>{URL.revokeObjectURL(url);alert('PNG invalide')};im.src=url;e.target.value=''};
project=function(){allComposites();return{schema:'vfx-studio-project',version:2,name:$('assetName').value||'VFX',width,height,fps,pivot:{x:0.5,y:0.5},palette:[...palette],frames:frames.map(a=>Array.from(a)),layers:layerDefs.map(d=>({...d})),layerFrames:layerFrames.map(f=>f.map(a=>Array.from(a)))}};
loadProject=function(obj){if(!obj||obj.schema!=='vfx-studio-project'||![1,2].includes(obj.version)||!Number.isInteger(obj.width)||!Number.isInteger(obj.height)||obj.width<1||obj.width>256||obj.height<1||obj.height>256||!Array.isArray(obj.frames)||!obj.frames.length||obj.frames.length>MAX_FRAMES)throw Error('Format de projet invalide');const sz=obj.width*obj.height*4;const valid=a=>Array.isArray(a)&&a.length===sz&&a.every(n=>Number.isInteger(n)&&n>=0&&n<=255);if(!obj.frames.every(valid))throw Error('Pixels invalides');if(obj.version===2&&(!Array.isArray(obj.layers)||!obj.layers.length||obj.layers.length>64||!Array.isArray(obj.layerFrames)||obj.layerFrames.length!==obj.frames.length||!obj.layerFrames.every(f=>Array.isArray(f)&&f.length===obj.layers.length&&f.every(valid))))throw Error('Calques invalides');stop();checkpoint();width=obj.width;height=obj.height;fps=Math.max(1,Math.min(120,Math.round(Number(obj.fps)||12)));$('fps').value=fps;$('assetName').value=String(obj.name||'VFX').slice(0,80);frames=obj.frames.map(a=>new Uint8ClampedArray(a));layerDefs=obj.version===2?obj.layers.map((d,i)=>({id:i+1,name:String(d.name||'Calque').slice(0,60),visible:d.visible!==false,opacity:Math.max(0,Math.min(100,Number(d.opacity)||0))})):[{id:1,name:'Calque 1',visible:true,opacity:100}];layerFrames=obj.version===2?obj.layerFrames.map(f=>f.map(a=>new Uint8ClampedArray(a))):frames.map(f=>[clone(f)]);palette=Array.isArray(obj.palette)?obj.palette.filter(s=>/^#[0-9a-fA-F]{6}$/.test(s)).slice(0,64):palette;activeLayer=0;selected=0;selection=null;nextLayerId=layerDefs.length+1;baseSync();drawPalette();show()};
const oldExport=$('exportSheet').onclick;
$('exportSheet').onclick=()=>{allComposites();oldExport()};
function assetRecord(name,p,tagList){const old=assets.filter(a=>a.name===name).reduce((n,a)=>Math.max(n,a.version||1),0);return{id:(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random()),name,version:old+1,tags:tagList,updatedAt:new Date().toISOString(),project:p}};
function persistAdvanced(){if(db){const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets');store.clear();assets.forEach(a=>store.put(a));tx.onerror=()=>note('Erreur IndexedDB : exporter votre bibliothèque');return true}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(assets));return true}catch{note('Stockage saturé : exporter votre bibliothèque');return false}}
persist=persistAdvanced;
libraryView=function(){const host=$('library');host.replaceChildren();assets.slice().reverse().forEach(a=>{if(!a.project||!a.project.frames||!a.project.frames.length)return;const button=document.createElement('button');button.className='asset';button.append(frameImage(new Uint8ClampedArray(a.project.frames[0]),a.project.width,a.project.height));const title=document.createElement('span');title.textContent=a.name+' · v'+(a.version||1);button.append(title);const meta=document.createElement('span');meta.textContent=(a.tags||[]).join(', ');meta.style.display='block';meta.style.color='#9ab2d5';button.append(meta);button.onclick=()=>{try{loadProject(a.project);$('assetTags').value=(a.tags||[]).join(', ');note('Asset chargé : '+a.name)}catch(err){alert(err.message)}};host.append(button)})};
$('saveAsset').onclick=()=>{const name=$('assetName').value.trim()||'Particule',tagList=$('assetTags').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).slice(0,20);const r=assetRecord(name,project(),tagList);assets.push(r);if(!persistAdvanced())assets.pop();libraryView();note(name+' v'+r.version+' enregistré')};
$('importLibrary').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text());if(obj.schema!=='vfx-studio-library'||obj.version!==1||!Array.isArray(obj.assets))throw Error('Bibliothèque invalide');for(const a of obj.assets){if(!a||typeof a.name!=='string'||!a.project||a.project.schema!=='vfx-studio-project'||![1,2].includes(a.project.version))throw Error('Asset invalide')}assets=assets.concat(obj.assets.map(a=>({...a,id:a.id||Math.random().toString(36).slice(2)})));persistAdvanced();libraryView();note('Bibliothèque importée')}catch(err){alert(err.message)}e.target.value=''};
function initDB(){if(!window.indexedDB)return;const req=indexedDB.open('vfx-studio-library',1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('assets'))db.createObjectStore('assets',{keyPath:'id'})};req.onsuccess=()=>{db=req.result;const tx=db.transaction('assets','readonly');const get=tx.objectStore('assets').getAll();get.onsuccess=()=>{if(get.result.length){assets=get.result;libraryView()}else if(assets.length){assets=assets.map(a=>({...a,id:a.id||Math.random().toString(36).slice(2)}));persistAdvanced()}}};req.onerror=()=>note('IndexedDB indisponible : bibliothèque locale limitée')};
window.VFXStudioBridge={currentProject:()=>project(),loadProject:source=>loadProject(source),library:()=>assets.map(a=>({name:a.name,version:a.version||1,tags:[...(a.tags||[])],project:a.project}))};
initDB();show();
})();