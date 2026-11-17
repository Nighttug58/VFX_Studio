/* node tests/timeline-engine.test.js — no dependencies */
'use strict';
const assert=require('node:assert/strict');
global.VFXComposerEngine=require('../composer-engine.js');
const T=require('../timeline-engine.js');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
function fixture(){const c=global.VFXComposerEngine.makeComposition({width:32,height:32,fps:20,durationMs:1000,seed:99});c.assets.push({id:'dot',name:'Dot',width:1,height:1,frames:[[255,255,255,255]]});c.layers.push({kind:'sprite',assetId:'dot',name:'sprite',x:8,y:9,startMs:0,lifeMs:900,scale:{from:1,to:1},alpha:{from:1,to:1}});return c}
test('legacy composition accepted',()=>assert.equal(T.validate(fixture()).version,1));
test('time interpolation linear',()=>assert.equal(T.sample([{timeMs:0,value:0},{timeMs:1000,value:100}],250,0),25));
test('stepped interpolation',()=>assert.equal(T.sample([{timeMs:0,value:0,ease:'step'},{timeMs:1000,value:100}],999,0),0));
test('ease-in interpolation',()=>assert.equal(T.sample([{timeMs:0,value:0,ease:'ease-in'},{timeMs:1000,value:100}],500,0),25));
test('color blending',()=>assert.equal(T.sample([{timeMs:0,value:'#000000'},{timeMs:1000,value:'#ffffff'}],500,'#000000'),'#808080'));
test('keyframe sort/replace',()=>{const l={};T.keyframe(l,'x',1000,10);T.keyframe(l,'x',0,1);T.keyframe(l,'x',1000,15);assert.deepEqual(l.tracks.x.map(k=>k.value),[1,15])});
test('keyframe removal',()=>{const l={};T.keyframe(l,'x',10,3);assert.equal(T.removeKeyframe(l,'x',10),true);assert.equal(l.tracks.x.length,0)});
test('keyframe invalid property',()=>assert.throws(()=>T.keyframe({},'evil',1,4)));
test('keyframe duplicate timestamps invalid import',()=>{const c=fixture();c.layers[0].tracks={x:[{timeMs:0,value:1},{timeMs:0,value:3}]};assert.throws(()=>T.validate(c))});
test('position keyframes to integer pixels',()=>{const c=fixture();T.keyframe(c.layers[0],'x',0,5);T.keyframe(c.layers[0],'x',1000,20);const p=T.entities(c,250)[0];assert.equal(p.x,9);assert.equal(Number.isInteger(p.x),true)});
test('alpha/scale keyframes',()=>{const c=fixture();T.keyframe(c.layers[0],'alpha',0,1);T.keyframe(c.layers[0],'alpha',1000,0);T.keyframe(c.layers[0],'scale',0,1);T.keyframe(c.layers[0],'scale',1000,3);const p=T.entities(c,500)[0];assert.equal(p.alpha,.5);assert.equal(p.scale,2)});
test('rotation keyframe snapped to quarter-turn',()=>{const c=fixture();T.keyframe(c.layers[0],'rotation',0,0);T.keyframe(c.layers[0],'rotation',1000,180);assert.equal(T.entities(c,500)[0].quarterTurn,1)});
test('no event no event-layer rendering',()=>{const c=fixture();c.layers[0].sequence='impact';assert.equal(T.entities(c,200).length,0)});
test('event fired at arbitrary timestamp',()=>{const c=fixture();c.layers[0].sequence='impact';const ev=[{type:'impact',atMs:300,id:'hit'}];assert.equal(T.entities(c,299,ev).length,0);assert.equal(T.entities(c,300,ev).length,1)});
test('independent collision impact event',()=>{const c=fixture();c.layers[0].sequence='impact';c.sequences=[{name:'impact',durationMs:600,playback:'once'}];assert.equal(T.entities(c,301,[{type:'impact',atMs:300}]).length,1);assert.equal(T.entities(c,1000,[{type:'impact',atMs:300}]).length,0)});
test('multiple repeated events give separate instances',()=>{const c=fixture();c.layers[0].sequence='pulse';const events=[{type:'pulse',atMs:0,id:'a'},{type:'pulse',atMs:250,id:'b'}];assert.equal(T.entities(c,300,events).length,2)});
test('event position offset',()=>{const c=fixture();c.layers[0].sequence='impact';assert.equal(T.entities(c,350,[{type:'impact',atMs:300,x:10,y:4}])[0].x,18)});
test('deterministic events and seed',()=>{const c=fixture();c.layers[0].kind='emitter';c.layers[0].count=30;c.layers[0].lifeMs=700;c.layers[0].sequence='impact';const events=[{type:'impact',atMs:30}];assert.deepEqual(T.entities(c,200,events),T.entities(c,200,events))});
test('sequence export manifest timing',()=>{const c=fixture();c.sequences=[{name:'impact',durationMs:300,playback:'once'}];const m=T.manifest(c,'impact',3);assert.equal(m.trigger,'impact');assert.equal(m.frames.length,6);assert.equal(m.frames[4].y,32)});
test('clip renderer event-only',()=>{const c=fixture();c.layers[0].sequence='impact';assert.equal(T.entities(c,0,[]).length,0);assert.equal(T.entities(c,0,[{type:'impact',atMs:0}]).length,1)});
test('reject corrupted sequence',()=>{const c=fixture();c.sequences=[{name:'arbitrary',durationMs:500}];assert.throws(()=>T.validate(c))});
test('looping event remains active until cleared',()=>{const c=fixture();c.layers[0].sequence='maintain';c.sequences=[{name:'maintain',durationMs:300,playback:'loop'}];assert.equal(T.entities(c,650,[{type:'maintain',atMs:0}]).length,1);assert.equal(T.entities(c,650,[]).length,0)});
test('valid zero X/Y coordinates survive rendering',()=>{const c=fixture();c.layers[0].x=0;c.layers[0].y=0;const p=T.entities(c,0)[0];assert.equal(p.x,0);assert.equal(p.y,0)});
test('JSON roundtrip keyframes and events',()=>{const c=fixture();T.keyframe(c.layers[0],'x',0,5);T.keyframe(c.layers[0],'x',500,14);assert.deepEqual(T.entities(JSON.parse(JSON.stringify(c)),300),T.entities(c,300))});
test('render without interpolation',()=>{const c=fixture(),oldDoc=global.document,oldImage=global.ImageData;const context={clearRect(){},putImageData(){},save(){},restore(){},translate(){},rotate(){},drawImage(){},set globalAlpha(v){}};global.document={createElement:()=>({getContext:()=>context})};global.ImageData=class{constructor(data,w,h){this.data=data;this.width=w;this.height=h}};try{T.render(c,100);assert.equal(context.imageSmoothingEnabled,false)}finally{global.document=oldDoc;global.ImageData=oldImage}});
console.log('SUCCESS '+count+' timeline tests');
