/* node tests/editor-stability.test.js — dependency-free DOM/Canvas smoke test */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
class FakeCanvasContext{
 constructor(canvas){this.canvas=canvas;this.data=new Uint8ClampedArray(canvas.width*canvas.height*4)}
 sync(){const expected=this.canvas.width*this.canvas.height*4;if(this.data.length!==expected)this.data=new Uint8ClampedArray(expected)}
 putImageData(image){this.sync();this.data.set(image.data.slice(0,this.data.length))}
 getImageData(){this.sync();return{data:new Uint8ClampedArray(this.data)}}
 drawImage(image){this.sync();if(!image?.getContext)return;const src=image.getContext('2d').getImageData().data;const w=image.width,h=image.height;for(let y=0;y<Math.min(h,this.canvas.height);y++)for(let x=0;x<Math.min(w,this.canvas.width);x++){const i=(y*w+x)*4,j=(y*this.canvas.width+x)*4;this.data.set(src.slice(i,i+4),j)}}
 clearRect(){this.data.fill(0)}save(){}restore(){}setLineDash(){}strokeRect(){}translate(){}rotate(){}beginPath(){}arc(){}fill(){}stroke(){}moveTo(){}lineTo(){}closePath(){}
}
class FakeElement{
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.dataset={};this.style={};this.listeners={};this.children=[];this.className='';this.textContent='';this.value='';this.checked=false;this.disabled=false;this.width=tag==='canvas'?32:undefined;this.height=tag==='canvas'?32:undefined;this.classList={toggle(){},remove(){},add(){}};this._context=null}
 set innerHTML(content){this._html=content;for(const m of content.matchAll(/id="([^"]+)"/g))get(m[1]);for(const m of content.matchAll(/data-adv="([^"]+)"/g)){const b=new FakeElement('button');b.dataset.adv=m[1];advancedButtons.push(b)}}
 get innerHTML(){return this._html}
 getContext(){return this._context??(this._context=new FakeCanvasContext(this))}
 append(...x){this.children.push(...x)}replaceChildren(...x){this.children=x}addEventListener(type,fn,capture){(this.listeners[type]??=[]).push({fn,capture:!!capture})}getBoundingClientRect(){return{left:0,top:0,width:this.width*10,height:this.height*10}}setPointerCapture(){}click(){this.onclick?.()}setAttribute(){}
}
const controls={},advancedButtons=[];
function get(id){return controls[id]??(controls[id]=new FakeElement(id==='editor'?'canvas':'div',id))}
const toolButtons=['pencil','eraser','fill','picker'].map(t=>{const b=new FakeElement('button');b.dataset.tool=t;return b});
const document={getElementById:get,createElement:t=>new FakeElement(t),querySelector:()=>new FakeElement('section'),head:new FakeElement('head'),querySelectorAll:q=>q==='[data-tool]'?toolButtons:q==='[data-adv]'?advancedButtons:q==='[data-tool],[data-adv]'?[...toolButtons,...advancedButtons]:[]};
const vals={w:'32',h:'32',zoom:'10',color:'#8b7cff',oldColor:'#8b7cff',fps:'12',assetName:'Test',columns:'4',layerOpacity:'100'};for(const [id,val] of Object.entries(vals))get(id).value=val;
const canvas=get('editor');canvas.width=32;canvas.height=32;
const ImageData=class{constructor(data,w,h){this.data=data;this.width=w;this.height=h}};
const downloads=[],URL={createObjectURL(blob){downloads.push(blob);return 'blob:test'},revokeObjectURL(){}};
const sandbox={document,window:{},ImageData,Blob:class{constructor(parts,options){this.parts=parts;this.options=options}},URL,localStorage:{getItem(){return null},setItem(){}},confirm:()=>true,alert:msg=>{throw Error('Alert: '+msg)},prompt:()=>null,crypto:{randomUUID:()=>String(Date.now())},setInterval:()=>1,clearInterval(){},setTimeout(){},Uint8ClampedArray,Uint8Array,Image:class{},Number,Math,JSON,console};
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),base=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(base,'base script missing');
const advanced=fs.readFileSync(path.join(__dirname,'../advanced.js'),'utf8');
vm.runInNewContext(base+'\n'+advanced+'\nwindow.__test={project:()=>project(),loadProject:p=>loadProject(p)};',sandbox,{filename:'vfx-studio-combined.js'});
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name)}
function fire(type,x,y){const list=canvas.listeners[type]||[];const e={clientX:x*10+1,clientY:y*10+1,pointerId:1,stopImmediatePropagation(){this.stopped=true},setPointerCapture(){}};for(const {fn,capture} of [...list].sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(e);if(e.stopped)break}}
function tool(name){const b=[...toolButtons,...advancedButtons].find(b=>b.dataset.tool===name||b.dataset.adv===name);assert.ok(b,'tool '+name+' not found');b.onclick()}
function alpha(x,y){return sandbox.window.__test.project().frames[0][(y*32+x)*4+3]}
test('editor launches with one transparent frame',()=>{const p=sandbox.window.__test.project();assert.equal(p.version,2);assert.equal(p.frames.length,1);assert.equal(alpha(4,4),0)});
test('pencil paints a single opaque pixel',()=>{fire('pointerdown',4,4);fire('pointerup',4,4);assert.equal(alpha(4,4),255)});
test('undo restores pixel',()=>{get('undo').click();assert.equal(alpha(4,4),0)});
test('redo restores pixel',()=>{get('redo').click();assert.equal(alpha(4,4),255)});
test('dither never overpaints the excluded checkerboard cells',()=>{tool('dither');fire('pointerdown',0,10);fire('pointermove',9,10);fire('pointerup',9,10);for(let x=0;x<10;x++)assert.equal(alpha(x,10),x%2===0?255:0)});
test('extra layer can be added',()=>{get('addLayer').click();assert.equal(sandbox.window.__test.project().layers.length,2)});
test('paint in top layer and toggle its visibility',()=>{tool('pencil');fire('pointerdown',2,2);fire('pointerup',2,2);assert.equal(alpha(2,2),255);const layerButtons=get('layers').children[0].children;layerButtons[0].click();assert.equal(alpha(2,2),0);layerButtons[0].click();assert.equal(alpha(2,2),255)});
test('source project supports round-trip with layers',()=>{const p=sandbox.window.__test.project();sandbox.window.__test.loadProject(p);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.__test.project().layerFrames)),p.layerFrames)});
test('duplicate and delete animated frame',()=>{get('duplicateFrame').click();assert.equal(sandbox.window.__test.project().frames.length,2);get('deleteFrame').click();assert.equal(sandbox.window.__test.project().frames.length,1)});
console.log('SUCCESS '+passed+' editor UI smoke tests');
