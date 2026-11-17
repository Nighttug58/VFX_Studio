/* node tests/production-export.test.js — zero dependencies */
'use strict';
const assert=require('node:assert/strict');
global.VFXComposerEngine=require('../composer-engine.js');
global.VFXTimeline=require('../timeline-engine.js');
const P=require('../production-export.js'),Z=require('../zip-store.js');
let completed=0;function test(name,fn){fn();completed++;console.log('PASS '+name)}
function fixture(){const c=global.VFXComposerEngine.makeComposition({width:16,height:12,fps:10,durationMs:600,seed:817});c.assets.push({id:'p',name:'Pixel',width:1,height:1,frames:[[255,20,0,255]]});c.layers.push({kind:'sprite',assetId:'p',x:4,y:3,startMs:0,lifeMs:700,alpha:{from:1,to:1},scale:{from:1,to:1}});c.layers.push({kind:'sprite',assetId:'p',x:5,y:6,startMs:0,lifeMs:500,sequence:'impact',alpha:{from:1,to:1}});c.sequences=[{name:'impact',durationMs:400,playback:'once'}];return c}
test('frame count and per-clip mapping',()=>{const m=P.plan(fixture(),{maxTexture:256});assert.equal(m.frames.length,10);assert.equal(m.animations.main.frameCount,6);assert.equal(m.animations.impact.frameCount,4);assert.equal(m.animations.impact.trigger,'impact')});
test('JSON v3 and source seed',()=>{const m=P.plan(fixture());assert.equal(m.version,3);assert.equal(m.schema,'vfx-studio-atlas');assert.equal(m.source.seed,817);assert.equal(m.source.fps,10)});
test('padding/extrusion dimensions',()=>{const m=P.plan(fixture(),{padding:3,extrusion:2});assert.equal(m.frames[0].x,5);assert.equal(m.frames[0].y,5);assert.equal(m.frames[0].cell.w,26);assert.equal(m.frames[0].cell.h,22)});
test('clear padding separated by extrusion',()=>{const m=P.plan(fixture(),{padding:2,extrusion:1});const f=m.frames[0];assert.equal(f.x-f.cell.x,3);assert.equal(f.y-f.cell.y,3)});
test('pivot metadata normalized and pixel',()=>{const m=P.plan(fixture(),{pivotX:.25,pivotY:.75});assert.deepEqual(m.frames[0].pivot,{x:.25,y:.75});assert.deepEqual(m.frames[0].pivotPx,{x:4,y:9})});
test('world size independent from raster scale',()=>{const m=P.plan(fixture(),{scale:2,logicalWidth:140,logicalHeight:70});assert.equal(m.frames[0].w,32);assert.equal(m.world.width,140);assert.equal(m.world.height,70)});
test('NightVenture metadata keeps collisions external',()=>{const m=P.plan(fixture(),{target:'nightventure',abilityId:'magic_elemental_nova'});assert.equal(m.integration.target,'nightventure');assert.equal(m.integration.abilityId,'magic_elemental_nova');assert.equal(m.integration.hitboxes,'external')});
test('reject unsafe ability identifiers',()=>assert.throws(()=>P.plan(fixture(),{target:'nightventure',abilityId:'../bad'})));
test('legacy source accepted',()=>{const c=fixture();delete c.sequences;delete c.layers[1].sequence;assert.equal(Object.keys(P.plan(c).animations).length,1)});
test('strict nearest-neighbor flag',()=>{const m=P.plan(fixture(),{profile:'strict',scale:2});assert.equal(m.render.nearestNeighbor,true)});
test('hybrid permits fractional scaling',()=>{const m=P.plan(fixture(),{profile:'hybrid',scale:1.5});assert.equal(m.frames[0].w,24);assert.equal(m.render.nearestNeighbor,false)});
test('strict rejects fractional scale',()=>assert.throws(()=>P.plan(fixture(),{profile:'strict',scale:1.5})));
test('invalid pivot rejected',()=>assert.throws(()=>P.plan(fixture(),{pivotX:1.1})));
test('invalid max texture rejected',()=>assert.throws(()=>P.plan(fixture(),{maxTexture:768})));
test('oversize frame rejected',()=>{const c=fixture();c.width=128;c.height=128;assert.throws(()=>P.plan(c,{scale:4,padding:16,extrusion:16,maxTexture:256}))});
test('multiple pages with no duplicate cells',()=>{const c=fixture();c.width=128;c.height=128;c.fps=20;c.durationMs=1000;c.sequences[0].durationMs=1000;const m=P.plan(c,{maxTexture:256,padding:2,extrusion:1});assert.ok(m.pages.length>1);const seen=new Set();for(const f of m.frames){const key=f.page+':'+f.x+':'+f.y;assert.ok(!seen.has(key));seen.add(key);assert.ok(f.x+f.w<=m.pages[f.page].width);assert.ok(f.y+f.h<=m.pages[f.page].height)}});
test('texture pixel budget cap',()=>{const c=fixture();c.width=512;c.height=512;c.fps=120;c.durationMs=5000;delete c.sequences;c.layers.pop();assert.throws(()=>P.plan(c,{maxTexture:1024,padding:0,extrusion:0}),/Budget/)});
test('atlas deterministic across two plans',()=>assert.deepEqual(P.plan(fixture()),P.plan(JSON.parse(JSON.stringify(fixture())))));
test('animation maps refer to valid frames',()=>{const m=P.plan(fixture());for(const anim of Object.values(m.animations))for(const i of anim.frames)assert.ok(i>=0&&i<m.frames.length)});
test('extrusion draws four edges plus corners per pixel',()=>{const calls=[];const makeCanvas=(w,h)=>({width:w,height:h,getContext(){return{clearRect(){},set imageSmoothingEnabled(v){},drawImage(...args){calls.push(args)}}}});const m=P.plan(fixture(),{padding:2,extrusion:2});P.rasterize(fixture(),m,()=>({width:16,height:12}),makeCanvas);assert.ok(calls.length>=m.frames.length*(1+1+16))});
test('padding-only no edge extrusion',()=>{const calls=[];const makeCanvas=(w,h)=>({width:w,height:h,getContext(){return{clearRect(){},drawImage(...args){calls.push(args)},set imageSmoothingEnabled(v){}}}});const m=P.plan(fixture(),{extrusion:0});P.rasterize(fixture(),m,()=>({width:16,height:12}),makeCanvas);assert.equal(calls.length,m.frames.length)});
test('zip signature and central-directory footer',()=>{const zip=Z.pack([{name:'atlas.json',data:'{}'},{name:'page.png',data:new Uint8Array([137,80,78,71])}]);assert.equal(zip[0],0x50);assert.equal(zip[1],0x4b);assert.equal(zip[zip.length-22],0x50);assert.equal(zip[zip.length-21],0x4b)});
test('CRC32 known reference',()=>assert.equal(Z.crc32(new TextEncoder().encode('123456789')),0xcbf43926));
test('ZIP reproducible and rejects duplicates',()=>{const a=[{name:'a.txt',data:'a'}];assert.deepEqual(Z.pack(a),Z.pack(a));assert.throws(()=>Z.pack([a[0],a[0]]))});
console.log('SUCCESS '+completed+' production-export tests');
