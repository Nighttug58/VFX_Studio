/* Pass 4 timeline authoring controls. All event preview occurrences are transient. */
(function(){
'use strict';
const T=window.VFXTimeline, UI=window.VFXComposerUI;
if(!T||!UI)throw Error('Timeline dependency missing');
const $=id=>document.getElementById(id);
const panel=document.createElement('section');panel.id='timelinePanel';
panel.innerHTML=`
<h2>Timeline avancée · Keyframes et événements</h2>
<div class="timelineLayout">
<div class="timelineCol">
<h3>Séquences du VFX</h3>
<label>Séquence éditée<select id="tlSequence"></select></label>
<div class="row"><label>Durée de séquence (ms)<input id="tlDuration" type="number" min="50" max="10000" step="50" value="600"></label><label>Lecture<select id="tlPlayback"><option value="once">Une fois</option><option value="loop">Boucle</option></select></label></div>
<button id="tlSaveSequence">Appliquer la séquence</button>
<p class="status">La séquence principale suit la timeline. Les autres séquences ne commencent qu'à réception de leur événement nommé.</p>
</div>
<div class="timelineCol">
<h3>Images clés du calque sélectionné</h3>
<label>Propriété<select id="tlProperty"></select></label>
<div class="row"><label>Temps local (ms)<input id="tlTime" type="number" min="0" max="10000" step="10" value="0"></label><label>Valeur<input id="tlValue" type="number" step="any" value="0"></label></div>
<label>Interpolation depuis cette clé<select id="tlEase"></select></label>
<div class="row"><button id="tlAddKey" class="primary">Ajouter / modifier clé</button><button id="tlDelKey">Supprimer clé</button></div>
<div id="tlKeyList" class="tlKeyList"></div>
</div>
<div class="timelineCol">
<h3>Événements gameplay — prévisualisation</h3>
<label>Événement<select id="tlEvent"></select></label>
<div class="row"><button id="tlFire" class="primary">Déclencher maintenant</button><button id="tlClear">Effacer les déclenchements</button></div>
<p id="tlEvents" class="status">Aucun événement déclenché.</p>
<div class="row"><button id="tlExport">Exporter la séquence PNG + JSON</button></div>
<p class="status">L'export de séquence déclenchable crée un clip réutilisable. L'horodatage des collisions reste sous la responsabilité du jeu.</p>
</div></div>`;
document.getElementById('composer').after(panel);
const style=document.createElement('style');style.textContent=`
#timelinePanel{max-width:1500px;margin:0 auto 14px}.timelineLayout{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.timelineCol{padding:12px;border:1px solid #384560;border-radius:9px;background:#151a29;min-width:0}
#tlKeyList{max-height:200px;overflow:auto;margin-top:10px;display:flex;flex-direction:column;gap:5px}
.tlKey{display:flex;justify-content:space-between;align-items:center;text-align:left;padding:7px;background:#242d42;border:1px solid #40516f;border-radius:5px;font-size:12px;width:100%}
#tlValue[type=color]{height:35px;width:100%}
@media(max-width:850px){.timelineLayout{grid-template-columns:1fr}} `;document.head.append(style);
for(const c of T.CLIPS){const opt=document.createElement('option');opt.value=c;opt.textContent=c==='main'?'main · Timeline':c; $('tlSequence').append(opt)}
for(const e of T.EVENTS){for(const id of ['tlEvent']){const opt=document.createElement('option');opt.value=e;opt.textContent=e;$(id).append(opt)}}
for(const p of T.TRACKS){const opt=document.createElement('option');opt.value=p;opt.textContent=p;$('tlProperty').append(opt)}
for(const e of T.EASES){const opt=document.createElement('option');opt.value=e;opt.textContent=e;$('tlEase').append(opt)}
let selected='main',property='x';
function sequenceInfo(){const c=UI.getComposition();const seq=c.sequences?.find(s=>s.name===selected);$('tlDuration').value=selected==='main'?c.durationMs:seq?.durationMs||600;$('tlPlayback').value=seq?.playback||'once';$('tlDuration').disabled=selected==='main';$('tlPlayback').disabled=selected==='main'}
function keyInfo(){const c=UI.getComposition(),layer=c.layers[UI.getSelectedLayer()],keys=layer?.tracks?.[property]||[];const host=$('tlKeyList');host.replaceChildren();if(!layer){host.textContent='Sélectionne un calque VFX.';return}for(const k of keys){const b=document.createElement('button');b.className='tlKey';b.textContent=k.timeMs+' ms  ·  '+String(k.value)+'  ·  '+(k.ease||'linear');b.onclick=()=>{$('tlTime').value=k.timeMs;$('tlValue').value=k.value;$('tlEase').value=k.ease||'linear'};host.append(b)}if(!keys.length)host.textContent='Aucune clé — valeur constante utilisée.'}
function valueInput(){const isColor=property==='color',old=$('tlValue');old.type=isColor?'color':'number';old.value=isColor?'#ffffff':property==='alpha'||property==='scale'?'1':'0';keyInfo()}
function refresh(){sequenceInfo();keyInfo();$('tlEvents').textContent=UI.getEvents().map(e=>e.type+' @ '+Math.round(e.atMs)+' ms').join(' · ')||'Aucun événement déclenché.'}
$('tlSequence').onchange=()=>{selected=$('tlSequence').value;refresh()};
$('tlProperty').onchange=()=>{property=$('tlProperty').value;valueInput()};
$('tlSaveSequence').onclick=()=>{if(selected==='main')return;try{const duration=Number($('tlDuration').value),playback=$('tlPlayback').value;UI.editTimeline(c=>{c.sequences??=[];const seq=c.sequences.find(s=>s.name===selected);if(seq){seq.durationMs=duration;seq.playback=playback}else c.sequences.push({name:selected,durationMs:duration,playback})});refresh()}catch(e){alert(e.message)}};
function changeKey(remove){const timeMs=Number($('tlTime').value),value=property==='color'?$('tlValue').value:Number($('tlValue').value),mode=$('tlEase').value;try{UI.editTimeline((c,index)=>{const layer=c.layers[index];if(!layer)throw Error('Ajouter un calque au compositeur');layer.sequence=selected;if(remove){T.removeKeyframe(layer,property,timeMs)}else T.keyframe(layer,property,timeMs,value,mode)});refresh()}catch(e){alert(e.message)}}
$('tlAddKey').onclick=()=>changeKey(false);$('tlDelKey').onclick=()=>changeKey(true);
$('tlFire').onclick=()=>{try{UI.trigger($('tlEvent').value);refresh()}catch(e){alert(e.message)}};
$('tlClear').onclick=()=>{UI.clearEvents();refresh()};
function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
$('tlExport').onclick=()=>{try{const c=UI.getComposition(),n=T.frameCount(c,selected),cols=Math.min(8,n,Math.floor(8192/c.width)),m=T.manifest(c,selected,cols);const sheet=document.createElement('canvas');sheet.width=m.width;sheet.height=m.height;const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;for(let i=0;i<n;i++){const frame=T.renderClip(c,selected,i);g.drawImage(frame,m.frames[i].x,m.frames[i].y)}sheet.toBlob(blob=>{if(blob)download(m.image,blob);else alert('Échec PNG')},'image/png');download('vfx-'+selected+'.json',new Blob([JSON.stringify(m,null,2)],{type:'application/json'}))}catch(e){alert(e.message)}};
const originalRefresh=UI.refresh;UI.refresh=()=>{originalRefresh();refresh()};
sequenceInfo();valueInput();refresh();
window.VFXTimelineUI={selectClip:s=>{if(!T.CLIPS.includes(s))throw Error('Invalid clip');selected=s;$('tlSequence').value=s;refresh()},refresh};
})();
