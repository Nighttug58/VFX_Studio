/* Run with: node tests/composer-engine.test.js (no external dependencies). */
'use strict';
const assert=require('node:assert/strict');
const E=require('../composer-engine.js');
function sample(){const c=E.makeComposition({width:64,height:64,fps:20,durationMs:1000,seed:555});c.assets.push({id:'spark',name:'Spark',width:1,height:1,frames:[[255,70,20,255]]});c.layers.push({kind:'emitter',assetId:'spark',x:32,y:32,mode:'burst',count:50,lifeMs:1000,rate:10,speed:20,angle:15,spread:240,gravity:8,drag:.5,scale:{from:1,to:2,ease:'smooth'},alpha:{from:1,to:0,ease:'smooth'},trajectory:'linear'});return c}
const c=sample(), tests=[];
function run(label,fn){fn();tests.push(label);process.stdout.write('PASS '+label+'\n')}
run('schema and number of frames',()=>{assert.equal(E.validate(c),c);assert.equal(E.framesCount(c),20)});
run('burst quantity',()=>assert.equal(E.entities(c,10).length,50));
run('deterministic same seed/frame',()=>assert.deepEqual(E.entities(c,10),E.entities(c,10)));
run('integer pixel alignment',()=>assert.ok(E.entities(c,10).every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&Number.isInteger(p.scale))));
run('easing changes alpha',()=>assert.ok(E.entities(c,10)[0].alpha<1));
run('different seed changes placement',()=>{const other=JSON.parse(JSON.stringify(c));other.seed++;assert.notDeepEqual(E.entities(c,10),E.entities(other,10))});
run('wave trajectory',()=>{const other=JSON.parse(JSON.stringify(c));other.layers[0].trajectory='wave';assert.notDeepEqual(E.entities(c,10),E.entities(other,10))});
run('spiral trajectory',()=>{const other=JSON.parse(JSON.stringify(c));other.layers[0].trajectory='spiral';assert.notDeepEqual(E.entities(c,10),E.entities(other,10))});
run('continuous emission count',()=>{const other=JSON.parse(JSON.stringify(c));other.layers[0].mode='continuous';assert.equal(E.entities(other,10).length,6)});
run('sprite expires',()=>{const other=JSON.parse(JSON.stringify(c));other.layers.push({kind:'sprite',assetId:'spark',x:12,y:14,startMs:0,lifeMs:300});assert.ok(E.entities(other,10).every(p=>p.layer!==1))});
run('atlas mapping',()=>{const m=E.atlasManifest(c,4);assert.equal(m.width,256);assert.equal(m.height,320);assert.equal(m.frames[5].x,64);assert.equal(m.frames[5].y,64)});
run('reject invalid asset',()=>{const other=JSON.parse(JSON.stringify(c));other.assets[0].frames[0]=[1,2];assert.throws(()=>E.validate(other))});
run('reject unsafe frame count',()=>{const other=JSON.parse(JSON.stringify(c));other.fps=120;other.durationMs=10000;assert.throws(()=>E.validate(other))});
run('JSON roundtrip',()=>assert.deepEqual(E.entities(JSON.parse(JSON.stringify(c)),8),E.entities(c,8)));
run('raster no smoothing',()=>{const originalDoc=global.document,originalImg=global.ImageData;const context={clearRect(){},save(){},restore(){},translate(){},rotate(){},drawImage(){},putImageData(){},set globalAlpha(value){this.alpha=value}};global.document={createElement:()=>({getContext:()=>context})};global.ImageData=class{constructor(data,width,height){this.data=data;this.width=width;this.height=height}};try{E.render(c,5);assert.equal(context.imageSmoothingEnabled,false)}finally{global.document=originalDoc;global.ImageData=originalImg}});
process.stdout.write('SUCCESS '+tests.length+' tests\n');
