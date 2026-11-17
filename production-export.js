/* Pass 5: production atlas builder and validation. */
(function(root,factory){const api=factory(root.VFXTimeline);root.VFXProductionExport=api;if(typeof module==='object'&&module.exports)module.exports=api})(typeof globalThis!=='undefined'?globalThis:this,function(T){
'use strict';
if(!T)throw Error('Timeline engine required');
const MAX_PIXELS=67108864,MAX_FRAMES=1800,MAX_PAGES=128,integer=Number.isInteger;
function between(x,a,b){return typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b}
function settings(user={}){
 const o={profile:'strict',scale:1,padding:2,extrusion:1,maxTexture:2048,pivotX:.5,pivotY:.5,logicalWidth:null,logicalHeight:null,target:'generic',abilityId:'',...user};
 if(!['strict','hybrid'].includes(o.profile))throw Error('Profil invalide');
 if(!['generic','nightventure'].includes(o.target)||typeof o.abilityId!=='string'||(o.abilityId!==''&&!/^[a-z0-9_]{1,80}$/.test(o.abilityId)))throw Error('Cible ou identifiant de compétence invalide');
 if(!between(o.scale,.5,4)||(o.profile==='strict'&&!integer(o.scale)))throw Error('Mode strict : échelle entière 1–4');
 for(const k of ['padding','extrusion'])if(!integer(o[k])||o[k]<0||o[k]>16)throw Error(k+' hors limites');
 if(![256,512,1024,2048,4096,8192].includes(o.maxTexture))throw Error('Limite texture invalide');
 if(!between(o.pivotX,0,1)||!between(o.pivotY,0,1))throw Error('Pivot hors limites');
 for(const k of ['logicalWidth','logicalHeight'])if(o[k]!==null&&!between(o[k],.001,100000))throw Error('Dimension logique invalide');
 return o
}
function clips(c){const active=new Set(['main']);for(const s of c.sequences||[])active.add(s.name);for(const l of c.layers)if(l.sequence)active.add(l.sequence);return T.CLIPS.filter(n=>active.has(n))}
function plan(c,options={}){
 T.validate(c);const o=settings(options),names=clips(c),w=Math.round(c.width*o.scale),h=Math.round(c.height*o.scale),pad=o.padding,ext=o.extrusion,cellW=w+2*(pad+ext),cellH=h+2*(pad+ext);
 if(!w||!h||cellW>o.maxTexture||cellH>o.maxTexture)throw Error('Frame trop grande pour la texture');
 const columns=Math.floor(o.maxTexture/cellW),rows=Math.floor(o.maxTexture/cellH),capacity=columns*rows;
 let total=0;const durations=names.map(name=>{const count=T.frameCount(c,name);total+=count;return{name,count,trigger:name==='main'?'timeline':name,loop:name==='main'?false:(c.sequences||[]).find(s=>s.name===name)?.playback==='loop'}});
 if(total>MAX_FRAMES)throw Error('Limite '+MAX_FRAMES+' frames dépassée');
 const pages=[],pageCount=Math.ceil(total/capacity);if(pageCount>MAX_PAGES)throw Error('Trop de pages atlas (maximum '+MAX_PAGES+') : augmentez la taille texture');let pixels=0;
 for(let i=0;i<pageCount;i++){const count=Math.min(capacity,total-i*capacity),pcols=Math.min(columns,count),prows=Math.ceil(count/columns),pw=pcols*cellW,ph=prows*cellH;pixels+=pw*ph;if(pixels>MAX_PIXELS)throw Error('Budget atlas 64 Mpx dépassé');pages.push({index:i,image:'vfx-atlas-'+String(i).padStart(2,'0')+'.png',width:pw,height:ph,frameCount:count})}
 const animations={},frames=[];let serial=0;
 for(const item of durations){
   const refs=[];
   for(let i=0;i<item.count;i++,serial++){const page=Math.floor(serial/capacity),cell=serial%capacity,col=cell%columns,row=Math.floor(cell/columns),x=col*cellW+pad+ext,y=row*cellH+pad+ext;
     frames.push({id:item.name+'/'+String(i).padStart(4,'0'),sequence:item.name,index:i,page,x,y,w,h,cell:{x:col*cellW,y:row*cellH,w:cellW,h:cellH},durationMs:1000/c.fps,pivot:{x:o.pivotX,y:o.pivotY},pivotPx:{x:o.pivotX*w,y:o.pivotY*h}});
     refs.push(serial)}
   animations[item.name]={trigger:item.trigger,loop:!!item.loop,fps:c.fps,frameCount:item.count,frames:refs}
 }
 return{schema:'vfx-studio-atlas',version:3,generator:'VFX_Studio',name:c.name,source:{width:c.width,height:c.height,seed:c.seed,fps:c.fps},render:{profile:o.profile,scale:o.scale,nearestNeighbor:o.profile==='strict',padding:pad,extrusion:ext,maxTexture:o.maxTexture,alpha:'straight',pixelBudget:pixels},world:{width:o.logicalWidth??c.width,height:o.logicalHeight??c.height,units:'logical',pivot:{x:o.pivotX,y:o.pivotY}},integration:{target:o.target,abilityId:o.target==='nightventure'?(o.abilityId||c.catalog?.id||''):null,triggerMode:'gameplay-events',hitboxes:'external',coordinateSpace:'world-2d',orientation:'source-positive-x',catalog:o.target==='nightventure'&&c.catalog?{id:c.catalog.id,svg:c.catalog.svg,category:c.catalog.category,sourceRevision:c.catalog.sourceRevision,geometry:JSON.parse(JSON.stringify(c.catalog.geometry)),geometrySource:c.catalog.geometrySource,referenceLayers:[...(c.catalog.referenceLayers||[])],framing:c.catalog.framing||'',animation:c.catalog.animation||'',guideOnly:true}:null},pages,animations,frames}
}
function rasterize(c,layout,drawClip,makeCanvas){
 const opts=layout.render,pages=layout.pages.map(p=>{const can=makeCanvas(p.width,p.height);const g=can.getContext('2d');g.clearRect(0,0,p.width,p.height);g.imageSmoothingEnabled=opts.profile!=='strict';return can});
 for(const f of layout.frames){const src=drawClip(c,f.sequence,f.index),can=pages[f.page],g=can.getContext('2d');g.imageSmoothingEnabled=opts.profile!=='strict';g.drawImage(src,0,0,src.width,src.height,f.x,f.y,f.w,f.h);const n=opts.extrusion;if(!n)continue;
   // Copy the scaled image to a separate canvas before replicating all four borders and corners.
   const border=makeCanvas(f.w,f.h),bg=border.getContext('2d');bg.imageSmoothingEnabled=false;bg.drawImage(can,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
   for(let d=1;d<=n;d++){
     g.drawImage(border,0,0,1,f.h,f.x-d,f.y,1,f.h);
     g.drawImage(border,f.w-1,0,1,f.h,f.x+f.w-1+d,f.y,1,f.h);
     g.drawImage(border,0,0,f.w,1,f.x,f.y-d,f.w,1);
     g.drawImage(border,0,f.h-1,f.w,1,f.x,f.y+f.h-1+d,f.w,1);
     g.drawImage(border,0,0,1,1,f.x-d,f.y-d,1,1);
     g.drawImage(border,f.w-1,0,1,1,f.x+f.w-1+d,f.y-d,1,1);
     g.drawImage(border,0,f.h-1,1,1,f.x-d,f.y+f.h-1+d,1,1);
     g.drawImage(border,f.w-1,f.h-1,1,1,f.x+f.w-1+d,f.y+f.h-1+d,1,1)
   }
 }
 return pages
}
function makeCanvas(w,h){const el=document.createElement('canvas');el.width=w;el.height=h;return el}
function render(c,options={}){const manifest=plan(c,options);return{manifest,canvases:rasterize(c,manifest,(source,sequence,index)=>T.renderClip(source,sequence,index),makeCanvas)}}
return{settings,clips,plan,rasterize,render,MAX_PIXELS,MAX_FRAMES,MAX_PAGES};
});