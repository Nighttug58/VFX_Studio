/* node tests/nightventure-ui.test.js — DOM stub integration smoke without dependencies */
'use strict';
const assert=require('node:assert/strict');
global.VFXComposerEngine=require('../composer-engine.js');
global.VFXTimeline=require('../timeline-engine.js');
global.NightVentureCatalogData=require('../data/nightventure-abilities.json');
const C=require('../nightventure-catalog.js');
const controls={};class Element{
constructor(tag='div'){this.tag=tag;this.style={};this.children=[];this.value='';this.checked=false;this.width=420;this.height=270;this.textContent='';this.disabled=false}
set innerHTML(s){this.html=s;for(const m of s.matchAll(/id="([^"]+)"/g))get(m[1])}
append(...arr){this.children.push(...arr);if(this.tag==='select'&&this.children.length===1)this.value=arr[0].value}
replaceChildren(...arr){this.children=arr;if(this.tag==='select')this.value=arr[0]?.value||''}
after(el){if(el.id)controls[el.id]=el}
getContext(){return{save(){},restore(){},clearRect(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){}}}
}
function get(id){return controls[id]??(controls[id]=new Element(id==='nvGroup'||id==='nvAbility'?'select':'div'))}
global.document={getElementById:get,createElement:t=>new Element(t),head:new Element('head')};
global.confirm=()=>true;global.alert=msg=>{throw Error('Unexpected alert: '+msg)};
get('productionPanel');get('nvGroup').value='Toutes';get('nvSearch').value='';get('nvFeatured').checked=false;get('nvTime').value='0';get('prodTarget').value='generic';get('prodAbility').value='';
let loaded,opened,updates=0,previewCount=0;
const UI={loadComposition:c=>{global.VFXTimeline.validate(c);loaded=structuredClone(c)},getComposition:()=>structuredClone(loaded),getSelectedAssetId:()=>loaded?.assets[0]?.id,editTimeline:fn=>{const next=structuredClone(loaded);fn(next,0);global.VFXTimeline.validate(next);loaded=next;updates++}};
const Bridge={loadProject:p=>{opened=structuredClone(p)},currentProject:()=>opened,library:()=>[]};
global.window={NightVentureCatalog:C,VFXComposerUI:UI,VFXTimeline:{...global.VFXTimeline,render:()=>{previewCount++}},VFXStudioBridge:Bridge,VFXComposerEngine:global.VFXComposerEngine};
require('../nightventure-catalog-ui.js');
const app=window.NightVentureCatalogUI;
assert.equal(app.getSelected(),'sword_duelist_step');
app.select('magic_elemental_nova');
assert.equal(app.getSelected(),'magic_elemental_nova');
const composition=app.load();
assert.equal(composition.catalog.id,'magic_elemental_nova');
assert.equal(composition.layers.length,3);
assert.equal(get('prodTarget').value,'nightventure');
assert.equal(get('prodAbility').value,'magic_elemental_nova');
get('nvEdit').onclick();
assert.equal(opened.schema,'vfx-studio-project');
const original=opened.frames[0][0];opened.frames[0][0]=(original+1)%255;
get('nvUpdate').onclick();
assert.equal(updates,1);
assert.equal(loaded.assets[0].frames[0][0],(original+1)%255);
app.previewAt(1800);
assert.ok(previewCount>=2);
console.log('SUCCESS 11 NightVenture UI integration checks');
