/* node tests/pipeline-stability.test.js — simulated full editor → composer → atlas ZIP */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const elements=new Map(),sources=new Map(),downloads=[],advanced=[];
const clone=o=>JSON.parse(JSON.stringify(o));
class CanvasContext{
 constructor(el){this.el=el;this.data=new Uint8ClampedArray(el.width*el.height*4);this.stack=[];this.imageSmoothingEnabled=false;this.globalAlpha=1}
 sync(){const len=this.el.width*this.el.height*4;if(this.data.length!==len)this.data=new Uint8ClampedArray(len)}
 clearRect(){this.sync();this.data.fill(0)}
 putImageData(img){this.sync();this.data.set(img.data.slice(0,this.data.length))}
 getImageData(){this.sync();return{data:new Uint8ClampedArray(this.data)}}
 drawImage(image,...arg){this.sync();if(!image||typeof image.getContext!=='function')return;const srcCtx=image.getContext('2d');srcCtx.sync();let sx=0,sy=0,sw=image.width,sh=image.height,dx=0,dy=0,dw=sw,dh=sh;
 if(arg.length===2){[dx,dy]=arg}else if(arg.length===4){[dx,dy,dw,dh]=arg}else if(arg.length===8){[sx,sy,sw,sh,dx,dy,dw,dh]=arg}
 for(let y=0;y<Math.max(0,Math.ceil(dh));y++){const yy=Math.round(dy+y);if(yy<0||yy>=this.el.height)continue;const syy=Math.floor(sy+(y+.5)*sh/dh);if(syy<0||syy>=image.height)continue;for(let x=0;x<Math.max(0,Math.ceil(dw));x++){const xx=Math.round(dx+x);if(xx<0||xx>=this.el.width)continue;const sxx=Math.floor(sx+(x+.5)*sw/dw);if(sxx<0||sxx>=image.width)continue;const src=(syy*image.width+sxx)*4,dst=(yy*this.el.width+xx)*4;this.data.set(srcCtx.data.slice(src,src+4),dst)}}}
 save(){this.stack.push({alpha:this.globalAlpha})}restore(){const s=this.stack.pop();if(s)this.globalAlpha=s.alpha}
 translate(){}rotate(){}setLineDash(){}strokeRect(){}beginPath(){}moveTo(){}lineTo(){}closePath(){}arc(){}fill(){}stroke(){}
}
class El{
 constructor(tag='div',id=''){this.tag=tag;this.id=id;this.dataset={};this.style={};this.listeners={};this.children=[];this.textContent='';this.value='';this.checked=false;this.disabled=false;this.className='';this.width=tag==='canvas'?32:0;this.height=tag==='canvas'?32:0;this.classList={toggle(){},add(){},remove(){}}}
 set innerHTML(s){this._html=s;for(const m of s.matchAll(/id="([^"]+)"/g))get(m[1]);for(const m of s.matchAll(/data-adv="([^"]+)"/g)){const b=new El('button');b.dataset.adv=m[1];advanced.push(b)}}
 append(...arr){this.children.push(...arr);if(this.tag==='select'&&this.children.length===1)this.value=arr[0].value}
 replaceChildren(...arr){this.children=arr;if(this.tag==='select')this.value=arr[0]?.value||''}
 after(obj){if(obj.id)elements.set(obj.id,obj)}
 addEventListener(n,f,capture){(this.listeners[n]??=[]).push({fn:f,capture:!!capture})}
 getBoundingClientRect(){return{left:0,top:0,width:this.width*10,height:this.height*10}}
 setPointerCapture(){}
 getContext(){return this._context??(this._context=new CanvasContext(this))}
 toBlob(callback){const data=new Uint8Array([137,80,78,71,13,10,26,10,this.width&255,this.height&255]);callback(new BlobMock([data],{type:'image/png'}))}
 click(){if(typeof this.onclick==='function')return this.onclick()}
}
class BlobMock{
 constructor(parts=[],opts={}){this.parts=parts;this.type=opts.type||''}
 async arrayBuffer(){const list=[];let len=0;for(const p of this.parts){let bytes;if(typeof p==='string')bytes=new Encoder().encode(p);else if(p instanceof Uint8Array)bytes=p;else if(p instanceof ArrayBuffer)bytes=new Uint8Array(p);else if(p?.arrayBuffer)bytes=new Uint8Array(await p.arrayBuffer());else throw Error('Unsupported blob input');list.push(bytes);len+=bytes.length}const arr=new Uint8Array(len);let at=0;for(const p of list){arr.set(p,at);at+=p.length}return arr.buffer}
}
class Encoder{encode(s){const out=[];for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c<128)out.push(c);else if(c<2048)out.push(192|c>>6,128|c&63);else out.push(224|c>>12,128|(c>>6)&63,128|c&63)}return Uint8Array.from(out)}}
function get(id){if(!elements.has(id))elements.set(id,new El(['editor','compCanvas','nvGuide','nvAnim'].includes(id)?'canvas':'div',id));return elements.get(id)}
const selectors=['pencil','eraser','fill','picker'].map(tool=>{const b=new El('button');b.dataset.tool=tool;return b});
const document={getElementById:get,createElement:tag=>new El(tag),head:new El('head'),querySelector:q=>q==='main'?get('main'):get('left'),querySelectorAll:q=>q==='[data-tool]'?selectors:q==='[data-adv]'?advanced:q==='[data-tool],[data-adv]'?[...selectors,...advanced]:[]};
for(const [id,value] of Object.entries({w:32,h:32,zoom:10,fps:12,color:'#8b7cff',oldColor:'#8b7cff',columns:4,assetName:'Spark',layerOpacity:100,compAsset:'',compName:'New VFX',compWidth:32,compHeight:32,compFps:12,compDuration:300,compSeed:12345,prodProfile:'strict',prodScale:1,prodMax:512,prodPad:2,prodExtrude:1,prodPivotX:0.5,prodPivotY:0.5,prodTarget:'generic',prodAbility:'',prodLogicalW:'',prodLogicalH:''}))get(id).value=String(value);
get('editor').width=32;get('editor').height=32;for(const id of ['compCanvas','nvAnim']){get(id).width=128;get(id).height=128}
get('nvGuide').width=420;get('nvGuide').height=270;
const blobUrls=new Map(),URL={createObjectURL:b=>{const key='blob:'+blobUrls.size;blobUrls.set(key,b);return key},revokeObjectURL(){}};El.prototype.click=function(){if(this.tag==='a'){downloads.push({name:this.download,blob:blobUrls.get(this.href)});return}if(typeof this.onclick==='function')return this.onclick()};
const ImageData=class{constructor(data,w,h){this.data=data;this.width=w;this.height=h}};
const sandbox={document,window:{},globalThis:null,localStorage:{getItem:()=>null,setItem(){}},ImageData,Blob:BlobMock,TextEncoder:Encoder,URL,Image:class{},confirm:()=>true,alert:e=>{throw Error('Alert: '+e)},prompt:()=>null,crypto:{randomUUID:()=>String(Date.now())},setInterval:()=>1,clearInterval(){},setTimeout(){},structuredClone:clone,Math,Number,JSON,Uint8Array,Uint8ClampedArray,console};
sandbox.globalThis=sandbox.window;
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),inline=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scripts=(html.match(/<script src="([^"]+)"/g)||[]).map(s=>s.match(/"([^"]+)"/)[1]);
for(const s of scripts)assert.ok(fs.readFileSync(path.join(root,s),'utf8'),'Missing '+s);
const combined=[inline,...scripts.map(s=>fs.readFileSync(path.join(root,s),'utf8'))].join('\n');
vm.runInNewContext(combined,sandbox,{filename:'vfx-studio-full.js'});
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name)}
function fire(type,x,y){const e={clientX:x*10+1,clientY:y*10+1,pointerId:1,stopImmediatePropagation(){this.stopped=true}};for(const handler of [...(get('editor').listeners[type]||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){handler.fn(e);if(e.stopped)break}}
check('boot all six passes',()=>{assert.ok(sandbox.window.VFXStudioBridge);assert.ok(sandbox.window.VFXComposerUI);assert.ok(sandbox.window.VFXTimelineUI);assert.ok(sandbox.window.VFXProductionUI);assert.ok(sandbox.window.NightVentureCatalogUI)});
check('draw pixel sprite',()=>{fire('pointerdown',8,8);fire('pointerup',8,8);const project=sandbox.window.VFXStudioBridge.currentProject();assert.equal(project.frames[0][(8*32+8)*4+3],255)});
check('load source particle into composer',()=>{get('compFromEditor').click();get('compAddEmitter').click();const c=sandbox.window.VFXComposerUI.getComposition();assert.equal(c.assets.length,1);assert.equal(c.layers.length,1)});
check('set animation keyframe and deterministic preview',()=>{const U=sandbox.window.VFXComposerUI,T=sandbox.window.VFXTimeline;U.editTimeline((c,index)=>T.keyframe(c.layers[index],'x',0,2));U.editTimeline((c,index)=>T.keyframe(c.layers[index],'x',200,18));const before=U.previewEntities(2),after=U.previewEntities(2);assert.deepEqual(before,after)});
check('JSON composition export and reuse',()=>{get('compSave').click();assert.ok(downloads.some(x=>x.name==='vfx-composition.json'));const c=sandbox.window.VFXComposerUI.getComposition();sandbox.window.VFXComposerUI.loadComposition(c);assert.equal(sandbox.window.VFXComposerUI.getSelectedLayer(),0)});
check('load NightVenture signature and reset selection',()=>{sandbox.window.NightVentureCatalogUI.select('polearm_forest_of_points');const c=sandbox.window.NightVentureCatalogUI.load();assert.equal(c.catalog.id,'polearm_forest_of_points');assert.equal(get('prodTarget').value,'nightventure')});
check('production plan contains event clips',()=>{const m=sandbox.window.VFXProductionUI.plan();assert.ok(m.animations.main);assert.ok(m.animations.pulse);assert.equal(m.integration.catalog.geometry.radiusU,142)});
check('edit a catalog asset and update its source',()=>{const selectedId=sandbox.window.VFXComposerUI.getSelectedAssetId();get('nvEdit').click();const p=sandbox.window.VFXStudioBridge.currentProject();assert.equal(p.width,32);fire('pointerdown',2,2);fire('pointerup',2,2);get('nvUpdate').click();const c=sandbox.window.VFXComposerUI.getComposition();assert.equal(c.assets.find(a=>a.id===selectedId).frames[0][(2*32+2)*4+3],255)});
async function asyncChecks(){const c=sandbox.window.VFXComposerUI.getComposition();get('prodMax').value='512';await get('prodDownload').click();const zip=downloads.find(x=>x.name==='vfx-atlas-production.zip');assert.ok(zip,'production zip missing');const bytes=new Uint8Array(await zip.blob.arrayBuffer());assert.equal(bytes[0],80);assert.equal(bytes[1],75);check('production ZIP includes atlas and PNG',()=>{assert.ok(bytes.length>200)});
get('exportSheet').click();check('source spritesheet maps PNG and JSON',()=>{assert.ok(downloads.some(x=>x.name==='vfx-spritesheet.json'))});
console.log('SUCCESS '+passed+' full-pipeline smoke tests');}
module.exports={asyncChecks};
