/* Composer UI: separate from the source pixel editor; does not mutate its frames. */
(function(){
'use strict';
const E=window.VFXComposerEngine, T=window.VFXTimeline, host=document.querySelector('main'), oldExport=document.getElementById('exportSheet');
if(!E||!host)throw Error('Composer engine missing');
let composition=E.makeComposition(), playing=false, timer=null, frame=0, layerId=0, assetCounter=1, playCanvas=document.createElement('canvas'), liveEvents=[];
const $=id=>document.getElementById(id), html=document.createElement('section');html.id='composer';
html.innerHTML=`
<div class="composerTitle"><h2>Compositeur VFX · Passe 4</h2><span id="compStatus">Nouveau VFX</span></div>
<div class="composerGrid"><div class="compLeft">
<label>Nom du VFX<input id="compName" type="text" maxlength="80" value="Nouveau VFX"></label>
<div class="row"><label>Largeur<input id="compWidth" type="number" min="1" max="512" value="128"></label><label>Hauteur<input id="compHeight" type="number" min="1" max="512" value="128"></label></div>
<div class="row"><label>FPS<input id="compFps" type="number" min="1" max="120" value="24"></label><label>Durée (ms)<input id="compDuration" type="number" min="100" max="10000" step="100" value="1000"></label></div>
<label>Graine aléatoire (seed)<input id="compSeed" type="number" min="1" max="4294967295" value="12345"></label>
<div class="row"><button id="compApply">Appliquer réglages</button><button id="compNew">VFX vide</button></div>
<h3>Textures / particules</h3>
<div class="row"><button id="compFromEditor">+ Asset actuel</button><button id="compFromLibrary">+ Depuis bibliothèque</button></div>
<label>Asset actif<select id="compAsset"></select></label>
<h3>Calques VFX</h3>
<div class="row"><button id="compAddSprite">+ Instance</button><button id="compAddEmitter" class="primary">+ Émetteur</button></div>
<div id="compLayers"></div><div class="row"><button id="compRemove">Supprimer</button><button id="compUp">Monter</button><button id="compDown">Descendre</button></div>
</div>
<div class="compCenter">
<div class="compPreview"><canvas id="compCanvas" width="128" height="128"></canvas></div>
<div class="row"><button id="compPlay">▶ Lecture</button><button id="compStop">■ Stop</button><button id="compStep">Frame +1</button></div>
<label>Frame : <span id="compCounter">1/24</span><input id="compScrub" type="range" min="0" max="23" step="1" value="0"></label>
<p class="status">Rendu pixel art déterministe : particules identiques à seed, paramètres et frame identiques. Position arrondie au pixel et échelles entières ; rotations par 90°.</p>
<div class="row"><button id="compExport" class="primary">Exporter VFX PNG + JSON</button><button id="compSave">Sauver composition</button><label class="upload">Importer composition<input id="compLoad" type="file" accept=".json,application/json"></label></div>
</div>
<div class="compRight">
<h3>Propriétés du calque</h3>
<div id="compControls"><p class="status">Ajouter une instance ou un émetteur.</p></div>
</div></div>`;
host.after(html);
const style=document.createElement('style');style.textContent=`
#composer{max-width:1500px;margin:0 auto 14px}.composerTitle{display:flex;align-items:center;justify-content:space-between;gap:12px}.composerTitle span{font-size:12px;color:#9bafd6}
.composerGrid{display:grid;grid-template-columns:245px minmax(250px,1fr) 260px;gap:14px}.composerGrid>div{min-width:0}
.compLeft,.compRight{background:#151a29;border:1px solid #343f59;padding:12px;border-radius:9px}
.compPreview{min-height:360px;display:grid;place-items:center;background:#252b38;background-image:linear-gradient(45deg,#343c4b 25%,transparent 25%),linear-gradient(-45deg,#343c4b 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#343c4b 75%),linear-gradient(-45deg,transparent 75%,#343c4b 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0;overflow:auto;border:1px solid #48546b;border-radius:8px}
#compCanvas{max-width:100%;max-height:480px;object-fit:contain;image-rendering:pixelated}
#compLayers{max-height:280px;overflow:auto;display:flex;flex-direction:column;gap:5px;margin:10px 0}
.compLayer{display:flex;align-items:center;gap:5px;border:1px solid #3e4962;border-radius:6px;padding:4px}.compLayer.selected{border-color:#9cb2ff}.compLayer button{padding:5px}.compLayer .compLayerName{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis}
#compControls{display:grid;grid-template-columns:1fr 1fr;gap:7px}#compControls label{margin:0}#compControls label.full{grid-column:1/-1}
#compControls select,#compControls input{min-width:0}#compScrub{width:100%}
@media(max-width:1050px){.composerGrid{grid-template-columns:220px 1fr}.compRight{grid-column:1/-1}}@media(max-width:680px){.composerGrid{display:flex;flex-direction:column}}
`;document.head.append(style);
function message(s){$('compStatus').textContent=s}
function dl(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=name;a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
function syncHeader(){for(const [key,value] of [['compName',composition.name],['compWidth',composition.width],['compHeight',composition.height],['compFps',composition.fps],['compDuration',composition.durationMs],['compSeed',composition.seed]])$(key).value=value}
function safe(fn){try{fn()}catch(err){message('Erreur : '+err.message);alert(err.message)}}
function assetInput(){const input=$('compAsset'),previous=input.value;input.replaceChildren();for(const a of composition.assets){const option=document.createElement('option');option.value=a.id;option.textContent=a.name;input.append(option)}if(composition.assets.some(a=>a.id===previous))input.value=previous;else if(composition.assets.length)input.value=composition.assets[composition.assets.length-1].id}
function addAsset(name,p){const img=E.imageAsset(p),id='asset-'+assetCounter++;composition.assets.push({id,name:String(name||'Particule').slice(0,80),...img});assetInput();$('compAsset').value=id;return id}
function getSource(){const api=window.VFXStudioBridge;if(!api)throw Error('Éditeur non initialisé');return api}
$('compFromEditor').onclick=()=>safe(()=>{const api=getSource(),p=api.currentProject();addAsset(p.name||'Particule',p);message('Asset actuel ajouté');refresh()});
$('compFromLibrary').onclick=()=>safe(()=>{const available=getSource().library();if(!available.length)throw Error('Bibliothèque vide');const options=available.map((a,i)=>i+' : '+a.name+' v'+(a.version||1)).join('\n');const answer=prompt('Choisir un asset par numéro :\n'+options,'0');if(answer===null)return;const i=Number(answer);if(!Number.isInteger(i)||i<0||i>=available.length)throw Error('Index invalide');addAsset(available[i].name,available[i].project);refresh()});
function defaultLayer(kind,assetId){return{kind,assetId,name:kind==='emitter'?'Émetteur':'Instance',visible:true,x:Math.round(composition.width/2),y:Math.round(composition.height/2),startMs:0,lifeMs:600,mode:'burst',count:36,rate:30,shape:'point',radius:20,speed:55,spread:360,angle:0,gravity:0,drag:0,trajectory:'linear',amplitude:12,frequency:2,scale:{from:1,to:1,ease:'linear'},alpha:{from:1,to:0,ease:'linear'},vx:0,vy:0,quarterTurn:0}}
function addLayer(kind){safe(()=>{const a=$('compAsset').value;if(!composition.assets.some(v=>v.id===a))throw Error('Ajouter une texture avant un calque');composition.layers.push(defaultLayer(kind,a));layerId=composition.layers.length-1;refresh()})}
$('compAddSprite').onclick=()=>addLayer('sprite');$('compAddEmitter').onclick=()=>addLayer('emitter');
function listLayers(){const target=$('compLayers');target.replaceChildren();composition.layers.forEach((l,i)=>{const row=document.createElement('div');row.className='compLayer'+(i===layerId?' selected':'');const check=document.createElement('input');check.type='checkbox';check.checked=l.visible!==false;check.title='Visible';check.onchange=()=>{l.visible=check.checked;render()};const b=document.createElement('button');b.className='compLayerName';b.textContent=(l.kind==='emitter'?'✦ ':'▣ ')+l.name;b.onclick=()=>{layerId=i;refresh()};row.append(check,b);target.append(row)})}
$('compRemove').onclick=()=>{if(!composition.layers.length)return;composition.layers.splice(layerId,1);layerId=Math.max(0,Math.min(layerId,composition.layers.length-1));refresh()};
function move(dir){const j=layerId+dir;if(j<0||j>=composition.layers.length)return;[composition.layers[j],composition.layers[layerId]]=[composition.layers[layerId],composition.layers[j]];layerId=j;refresh()}
$('compUp').onclick=()=>move(1);$('compDown').onclick=()=>move(-1);
function field(label,key,type='number',options){const layer=composition.layers[layerId];const wrapper=document.createElement('label');wrapper.textContent=label;const inp=options?document.createElement('select'):document.createElement('input');if(options){options.forEach(value=>{const opt=document.createElement('option');opt.value=value;opt.textContent=value;inp.append(opt)})}else{inp.type=type;if(type==='number')inp.step='any'}inp.value=String(key.split('.').reduce((o,k)=>o[k],layer));inp.onchange=()=>{let obj=layer;const p=key.split('.');for(const k of p.slice(0,-1))obj=obj[k];let v=type==='number'?Number(inp.value):inp.value;if(type==='number'&&!Number.isFinite(v))return;obj[p[p.length-1]]=v;render()};wrapper.append(inp);return wrapper}
function properties(){const target=$('compControls');target.replaceChildren();const l=composition.layers[layerId];if(!l){const p=document.createElement('p');p.textContent='Aucun calque VFX';target.append(p);return}
const inputs=[['Nom','name','text'],['Asset','assetId','asset'],['Position X','x'],['Position Y','y'],['Début (ms)','startMs'],['Vie (ms)','lifeMs'],['Scale initiale','scale.from'],['Scale finale','scale.to'],['Alpha initiale','alpha.from'],['Alpha finale','alpha.to'],['Courbe','scale.ease','linear','ease-in','ease-out','smooth']];
if(l.kind==='emitter')inputs.push(['Mode','mode','burst','continuous'],['Forme émission','shape','point','circle','line'],['Quantité','count'],['Débit / sec','rate'],['Rayon émission','radius'],['Vitesse','speed'],['Angle (°)','angle'],['Dispersion (°)','spread'],['Gravité','gravity'],['Freinage','drag'],['Trajectoire','trajectory','linear','wave','spiral'],['Amplitude','amplitude'],['Fréquence','frequency']);
else inputs.push(['Vitesse X','vx'],['Vitesse Y','vy'],['Rotation (quarts)','quarterTurn']);
for(const [label,key,type,...values] of inputs){const options=type==='asset'?composition.assets.map(a=>a.id):values.length?[type,...values]:null;const el=field(label,key,options?'text':type,options);target.append(el)}}
function render(){const n=E.framesCount(composition);frame=Math.max(0,Math.min(frame,n-1));$('compScrub').max=String(n-1);$('compScrub').value=String(frame);$('compCounter').textContent=(frame+1)+' / '+n;if(T)T.render(composition,frame*1000/composition.fps,$('compCanvas'),liveEvents);else E.render(composition,frame,$('compCanvas'))}
function refresh(){assetInput();listLayers();properties();render()}
$('compApply').onclick=()=>safe(()=>{const candidate=structuredClone(composition);candidate.name=$('compName').value.slice(0,80);for(const [id,key] of [['compWidth','width'],['compHeight','height'],['compFps','fps'],['compDuration','durationMs'],['compSeed','seed']])candidate[key]=Number($(id).value);E.validate(candidate);if(T)T.validate(candidate);composition=candidate;frame=0;liveEvents=[];refresh();message('Réglages appliqués')});
function stop(){playing=false;clearInterval(timer);timer=null;$('compPlay').disabled=false}
function play(){if(playing)return;playing=true;$('compPlay').disabled=true;timer=setInterval(()=>{frame=(frame+1)%E.framesCount(composition);render()},1000/composition.fps)}
$('compPlay').onclick=play;$('compStop').onclick=stop;$('compStep').onclick=()=>{stop();frame=(frame+1)%E.framesCount(composition);render()};$('compScrub').oninput=()=>{stop();frame=Number($('compScrub').value);render()};
$('compNew').onclick=()=>{if(!confirm('Créer un VFX vide ? Sauvegardez votre composition si nécessaire.'))return;stop();composition=E.makeComposition();frame=0;liveEvents=[];assetCounter=1;layerId=0;syncHeader();refresh();message('Nouveau VFX')};
$('compSave').onclick=()=>safe(()=>{(T||E).validate(composition);dl('vfx-composition.json',new Blob([JSON.stringify(composition)],{type:'application/json'}));message('Composition sauvegardée')});
$('compLoad').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());(T||E).validate(data);stop();composition=data;frame=0;liveEvents=[];layerId=0;assetCounter=data.assets.reduce((max,a)=>{const match=/^asset-(\d+)$/.exec(a.id);return match?Math.max(max,Number(match[1])+1):max},1);syncHeader();refresh();message('Composition importée')}catch(err){alert(err.message)}e.target.value=''};
$('compExport').onclick=()=>safe(()=>{const n=E.framesCount(composition),cols=Math.max(1,Math.min(8,n,Math.floor(8192/composition.width))),manifest=E.atlasManifest(composition,cols);const sheet=document.createElement('canvas');sheet.width=manifest.width;sheet.height=manifest.height;const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;for(let i=0;i<n;i++){const c=T?T.renderClip(composition,'main',i):E.render(composition,i);g.drawImage(c,manifest.frames[i].x,manifest.frames[i].y)}sheet.toBlob(blob=>{if(blob)dl(manifest.image,blob);else alert('Impossible de générer le PNG')},'image/png');dl('vfx-composition-spritesheet.json',new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));message(n+' frames exportées')});
syncHeader();refresh();
window.VFXComposerUI={
getComposition:()=>structuredClone(composition),
loadComposition:c=>{(T||E).validate(c);stop();composition=structuredClone(c);frame=0;layerId=0;liveEvents=[];assetCounter=composition.assets.reduce((max,a)=>{const match=/^asset-(\d+)$/.exec(a.id);return match?Math.max(max,Number(match[1])+1):max},1);syncHeader();refresh()},
getFrame:()=>frame,getSelectedLayer:()=>layerId,getSelectedAssetId:()=>$('compAsset').value,
editTimeline:callback=>{const candidate=structuredClone(composition);callback(candidate,layerId);(T||E).validate(candidate);composition=candidate;refresh()},
setFrame:n=>{stop();frame=Math.max(0,Math.min(E.framesCount(composition)-1,Math.floor(n)));render()},
trigger:(type,x=0,y=0)=>{if(!T||!T.EVENTS.includes(type))throw Error('Événement inconnu');liveEvents.push({type,atMs:frame*1000/composition.fps,x,y,id:String(liveEvents.length+1)});render()},
clearEvents:()=>{liveEvents=[];render()},getEvents:()=>structuredClone(liveEvents),
renderFrame:i=>T?T.render(composition,i*1000/composition.fps,undefined,liveEvents):E.render(composition,i),
previewEntities:i=>T?T.entities(composition,i*1000/composition.fps,liveEvents):E.entities(composition,i),
refresh};
})();