/* Production export controls — previous exports preserved. */
(function(){
'use strict';
const P=window.VFXProductionExport,Z=window.VFXZip,U=window.VFXComposerUI;
if(!P||!Z||!U)throw Error('Production export dependencies unavailable');
const $=id=>document.getElementById(id),panel=document.createElement('section');panel.id='productionPanel';
panel.innerHTML=`
<h2>Export production · Passe 5</h2>
<div class="productionGrid">
<div><h3>Atlas pixel art</h3>
<label>Profil<select id="prodProfile"><option value="strict">Strict (nearest-neighbor)</option><option value="hybrid">Hybride (mise à l'échelle lissée)</option></select></label>
<div class="row"><label>Échelle<input id="prodScale" type="number" min="1" max="4" step="1" value="1"></label><label>Texture maximale<select id="prodMax"><option>256</option><option>512</option><option>1024</option><option selected>2048</option><option>4096</option><option>8192</option></select></label></div>
<div class="row"><label>Padding (px)<input id="prodPad" type="number" min="0" max="16" step="1" value="2"></label><label>Extrusion (px)<input id="prodExtrude" type="number" min="0" max="16" step="1" value="1"></label></div>
</div>
<div><h3>Pivot et dimensions de jeu</h3>
<div class="row"><label>Pivot X normalisé<input id="prodPivotX" type="number" min="0" max="1" step=".05" value=".5"></label><label>Pivot Y normalisé<input id="prodPivotY" type="number" min="0" max="1" step=".05" value=".5"></label></div>
<div class="row"><label>Largeur logique (u)<input id="prodLogicalW" type="number" min=".001" step="any" placeholder="Auto"></label><label>Hauteur logique (u)<input id="prodLogicalH" type="number" min=".001" step="any" placeholder="Auto"></label></div>
<p class="status">Les unités logiques décrivent la taille de jeu indépendamment de la résolution exportée. Les pivots sont inclus dans les métadonnées de chaque frame.</p>
</div>
<div><h3>Validation et sortie</h3>
<div class="row"><button id="prodCheck">Vérifier l'atlas</button><button id="prodDownload" class="primary">Exporter le ZIP</button></div>
<p id="prodReport" class="status" aria-live="polite">Vérifier pour afficher le nombre de frames et de pages.</p>
<p class="status">ZIP : pages PNG transparentes + atlas.json version 3. Les séquences sont exportées indépendamment des collisions réelles.</p>
</div></div>`;
document.getElementById('timelinePanel').after(panel);
const style=document.createElement('style');style.textContent=`
#productionPanel{max-width:1500px;margin:0 auto 14px}.productionGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}
.productionGrid>div{background:#151a29;border:1px solid #37445e;padding:12px;border-radius:9px}
@media(max-width:850px){.productionGrid{grid-template-columns:1fr}}`;document.head.append(style);
const inputs=['prodProfile','prodScale','prodMax','prodPad','prodExtrude','prodPivotX','prodPivotY','prodLogicalW','prodLogicalH'];
function opts(){const optional=id=>$(id).value.trim()===''?null:Number($(id).value);return{profile:$('prodProfile').value,scale:Number($('prodScale').value),maxTexture:Number($('prodMax').value),padding:Number($('prodPad').value),extrusion:Number($('prodExtrude').value),pivotX:Number($('prodPivotX').value),pivotY:Number($('prodPivotY').value),logicalWidth:optional('prodLogicalW'),logicalHeight:optional('prodLogicalH')}}
function report(m){$('prodReport').textContent=m.frames.length+' frames · '+Object.keys(m.animations).length+' séquences · '+m.pages.length+' atlas PNG · '+(m.render.pixelBudget/1048576).toFixed(2)+' Mpx (budget max 64 Mpx)'}
function check(){const m=P.plan(U.getComposition(),opts());report(m);return m}
$('prodProfile').onchange=()=>{const hybrid=$('prodProfile').value==='hybrid';$('prodScale').min=hybrid?'.5':'1';$('prodScale').step=hybrid?'.25':'1';if(!hybrid)$('prodScale').value=Math.max(1,Math.round(Number($('prodScale').value)||1))};
for(const id of inputs)$(id).addEventListener('change',()=>{$('prodReport').textContent='Configuration modifiée : relance la vérification.'});
$('prodCheck').onclick=()=>{try{check()}catch(e){$('prodReport').textContent='Erreur : '+e.message}};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function toBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Erreur encodage PNG')),'image/png'))}
$('prodDownload').onclick=async()=>{const button=$('prodDownload');if(button.disabled)return;button.disabled=true;try{const c=U.getComposition(),config=opts(),manifest=check(),files=[{name:'atlas.json',data:JSON.stringify(manifest,null,2)}];const result=P.render(c,config);
for(let i=0;i<result.canvases.length;i++){const blob=await toBlob(result.canvases[i]);files.push({name:manifest.pages[i].image,data:new Uint8Array(await blob.arrayBuffer())})}
const zip=Z.pack(files);download(new Blob([zip],{type:'application/zip'}),'vfx-atlas-production.zip');report(manifest);$('prodReport').textContent+=' · ZIP créé'}catch(e){$('prodReport').textContent='Erreur : '+e.message}finally{button.disabled=false}};
window.VFXProductionUI={getOptions:opts,plan:check};
})();
