/* NightVenture catalogue UI — visual guide never changes combat geometry. */
(function(){
'use strict';
const C=window.NightVentureCatalog,U=window.VFXComposerUI,T=window.VFXTimeline,Bridge=window.VFXStudioBridge;
if(!C||!U||!T||!Bridge)throw Error('NightVenture catalogue dependencies missing');
const $=id=>document.getElementById(id),root=document.createElement('section');root.id='nvCatalog';
root.innerHTML=`
<h2>Catalogue NightVenture · 37 compétences</h2>
<div class="nvToolbar">
<label>Archétype / race<select id="nvGroup"><option value="Toutes">Toutes · 37</option></select></label>
<label>Rechercher<input id="nvSearch" type="search" placeholder="Nom, géométrie ou identifiant"></label>
<label>Compétence<select id="nvAbility"></select></label>
<label><input id="nvFeatured" type="checkbox"> Cinq signatures prioritaires</label>
</div>
<div class="nvLayout">
<div class="nvSpecs"><h3 id="nvTitle">Sélectionner une compétence</h3>
<p class="status" id="nvMeta"></p>
<div><strong>Géométrie réelle (unité monde)</strong><p id="nvGeometry" class="status"></p></div>
<div><strong>Forme artistique</strong><p id="nvForm" class="status"></p></div>
<div><strong>Calques proposés</strong><div id="nvLayers" class="status"></div></div>
<details><summary>Orientation, dégradé et animation du cahier</summary><p id="nvFraming" class="status"></p><p id="nvGradient" class="status"></p><p id="nvTiming" class="status"></p></details>
</div>
<div class="nvVisual"><div class="nvCanvas"><canvas id="nvGuide" width="420" height="270"></canvas></div>
<p class="status">Contour de référence des unités de gameplay. En jaune : géométrie de zone ; en pointillés : mouvement ou projectile. Les auras personnelles n'ont aucune hitbox offensive. Les textures PNG créées sont des **bases de travail en pixel art**, pas des illustrations finales.</p>
<div class="row"><button id="nvLoad" class="primary">Créer VFX éditable</button><button id="nvDemo">Prévisualiser la signature</button></div>
<label>Temps de la démonstration (ms)<input id="nvTime" type="range" min="0" max="4000" value="0" step="20"></label>
<span class="status" id="nvTimeText">0 ms</span>
<div class="nvCanvas"><canvas id="nvAnim" width="128" height="128"></canvas></div>
</div>
<div class="nvActions">
<h3>Édition directe des particules</h3>
<p class="status">Une fois le modèle chargé, sélectionne sa texture dans le compositeur. Tu peux l'ouvrir dans le véritable éditeur de pixel art, la retoucher, puis réinjecter les pixels dans le VFX.</p>
<button id="nvEdit">Modifier l'asset sélectionné</button>
<button id="nvUpdate">Réinjecter l'asset édité</button>
<p class="status" id="nvEditStatus">Aucun asset en cours d'édition.</p>
<h3>Contrat d'intégration</h3>
<p class="status">Ce catalogue ne crée ni zone de dégâts, ni collision, ni nouveau comportement de compétence. Les métadonnées restent distinctes des images et exportables dans le ZIP de production. Aucun fichier n'est écrit dans NightVenture_Legacy.</p>
</div></div>`;
const composer=$('composer'),timeline=$('timelinePanel'),production=$('productionPanel');(production||timeline||composer).after(root);
const style=document.createElement('style');style.textContent=`
#nvCatalog{max-width:1500px;margin:0 auto 14px}.nvToolbar{display:grid;grid-template-columns:190px 1fr 1fr 185px;gap:10px;align-items:end}
.nvToolbar label{margin-bottom:5px}.nvLayout{display:grid;grid-template-columns:minmax(220px,1.1fr) minmax(260px,1fr) minmax(200px,.65fr);gap:12px}
.nvSpecs,.nvVisual,.nvActions{min-width:0;background:#151a29;border:1px solid #37445e;padding:12px;border-radius:9px}
.nvSpecs strong{font-size:12px}.nvSpecs details{margin-top:12px}.nvSpecs summary{cursor:pointer;color:#bbc8ee;font-size:12px}
.nvCanvas{display:grid;place-items:center;overflow:auto;border:1px solid #37445e;border-radius:8px;background:#202536;background-image:linear-gradient(45deg,#2d3446 25%,transparent 25%),linear-gradient(-45deg,#2d3446 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#2d3446 75%),linear-gradient(-45deg,transparent 75%,#2d3446 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}
#nvGuide{max-width:100%;width:420px;height:auto}#nvAnim{width:256px;height:256px;max-width:100%;image-rendering:pixelated}
#nvLayers{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.nvToken{font-size:11px;background:#29314b;padding:4px 7px;border-radius:6px}
.nvActions button{width:100%;margin:6px 0}.nvSpecs p{line-height:1.55}
@media(max-width:1100px){.nvLayout{grid-template-columns:1fr 1fr}.nvActions{grid-column:1/-1}.nvToolbar{grid-template-columns:1fr 1fr}}
@media(max-width:680px){.nvLayout,.nvToolbar{display:flex;flex-direction:column}.nvLayout>*,.nvToolbar>*{width:100%}}
`;document.head.append(style);
for(const name of C.CATEGORIES){const opt=document.createElement('option');opt.value=name;opt.textContent=name; $('nvGroup').append(opt)}
let activeId=C.PRIORITY[0],demoComposition=null,editedAssetId=null;
function syncChoices(){const category=$('nvGroup').value,query=$('nvSearch').value.toLowerCase().trim(),featured=$('nvFeatured').checked;
const list=C.list(category).filter(e=>(!featured||e.priority)&&(!query||[e.name,e.id,e.geometrySource].some(v=>v.toLowerCase().includes(query))));
const select=$('nvAbility');select.replaceChildren();for(const e of list){const opt=document.createElement('option');opt.value=e.id;opt.textContent=e.name;select.append(opt)}if(list.some(e=>e.id===activeId))select.value=activeId;else activeId=list[0]?.id||'';if(activeId)select.value=activeId;renderInfo()}
function renderInfo(){const e=C.find(activeId);$('nvTitle').textContent=e?.name||'Aucune compétence';if(!e)return;
$('nvMeta').textContent=e.category+' · '+e.svg+(e.priority?' · Signature prioritaire':'');
$('nvGeometry').textContent=e.geometrySource;$('nvForm').textContent=e.form;
$('nvFraming').textContent=e.framing;$('nvGradient').textContent=e.gradient;$('nvTiming').textContent=e.animation;
const layers=$('nvLayers');layers.replaceChildren();for(const layer of e.layers){const tag=document.createElement('span');tag.className='nvToken';tag.title=layer.description;tag.textContent=layer.name;layers.append(tag)}
const canvas=$('nvGuide');C.drawGuide(canvas.getContext('2d'),e,canvas.width,canvas.height);
$('nvTime').value='0';$('nvTime').max=String(Math.max(4000,...C.scenario(e).map(x=>x.atMs+750)));demoComposition=null;preview()};
function preview(){const e=C.find(activeId),canvas=$('nvAnim'),t=Number($('nvTime').value);$('nvTimeText').textContent=t+' ms';if(!e)return;try{const c=demoComposition||C.makeTemplate(e.id),events=C.scenario(e);demoComposition=c;T.render(c,t,canvas,events)}catch(error){$('nvEditStatus').textContent='Erreur prévisualisation : '+error.message}}
$('nvGroup').onchange=syncChoices;$('nvSearch').oninput=syncChoices;$('nvFeatured').onchange=syncChoices;
$('nvAbility').onchange=()=>{activeId=$('nvAbility').value;renderInfo()};
$('nvTime').oninput=preview;
$('nvDemo').onclick=()=>{const e=C.find(activeId);if(!e)return;demoComposition=C.makeTemplate(e.id);$('nvTime').value='0';preview()};
$('nvLoad').onclick=()=>{try{const e=C.find(activeId);if(!e)return;const composition=C.makeTemplate(e.id);U.loadComposition(composition);demoComposition=composition;editedAssetId=null;if($('prodTarget'))$('prodTarget').value='nightventure';if($('prodAbility'))$('prodAbility').value=e.id;$('nvEditStatus').textContent='Modèle chargé : '+e.name+' · '+composition.layers.length+' calques. Choisis une texture dans le compositeur.';preview()}catch(error){alert(error.message)}};
$('nvEdit').onclick=()=>{try{const c=U.getComposition(),id=U.getSelectedAssetId(),asset=c.assets.find(a=>a.id===id);if(!asset)throw Error('Sélectionne une texture du compositeur');if(!confirm('Ouvrir cet asset dans l’éditeur ? Les modifications non sauvegardées de l’éditeur actuel seront perdues.'))return;Bridge.loadProject({schema:'vfx-studio-project',version:1,name:asset.name,width:asset.width,height:asset.height,fps:c.fps,frames:asset.frames.map(a=>a.slice())});editedAssetId=id;$('nvEditStatus').textContent='Asset ouvert : '+asset.name+'. Modifie-le en haut de page, puis clique Réinjecter.';window.scrollTo?.({top:0,behavior:'smooth'})}catch(error){alert(error.message)}};
$('nvUpdate').onclick=()=>{try{if(!editedAssetId)throw Error('Aucun asset en cours d’édition');const source=Bridge.currentProject(),img=window.VFXComposerEngine.imageAsset(source);U.editTimeline(c=>{const asset=c.assets.find(a=>a.id===editedAssetId);if(!asset)throw Error('Asset source introuvable');asset.width=img.width;asset.height=img.height;asset.frames=img.frames});$('nvEditStatus').textContent='Pixels et frames actualisés dans le compositeur. Enregistre la composition pour conserver le changement.';demoComposition=U.getComposition();preview()}catch(error){alert(error.message)}};
syncChoices();
window.NightVentureCatalogUI={select:id=>{if(!C.find(id))throw Error('Compétence inconnue');activeId=id;$('nvGroup').value='Toutes';$('nvSearch').value='';$('nvFeatured').checked=false;syncChoices()},getSelected:()=>activeId,load:()=>{$('nvLoad').onclick();return U.getComposition()},previewAt:ms=>{$('nvTime').value=String(ms);preview()}};
})();
