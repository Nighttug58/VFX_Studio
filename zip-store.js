/* Store-only ZIP writer for PNG atlas + JSON bundle; browser and Node compatible. */
(function(root,factory){const api=factory();root.VFXZip=api;if(typeof module==='object'&&module.exports)module.exports=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const encoder=new TextEncoder();
function u16(x){return[x&255,(x>>>8)&255]}function u32(x){return[x&255,(x>>>8)&255,(x>>>16)&255,(x>>>24)&255]}
function crc32(data){let crc=0xffffffff;for(const b of data){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^0xffffffff)>>>0}
function bytes(x){if(typeof x==='string')return encoder.encode(x);if(x instanceof Uint8Array)return x;throw Error('ZIP : contenu binaire invalide')}
function pack(files){if(!Array.isArray(files)||!files.length||files.length>129)throw Error('Nombre de fichiers ZIP invalide');const names=new Set(),local=[],central=[];let offset=0,size=0;
for(const file of files){if(!file||typeof file.name!=='string'||!file.name||file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))throw Error('Nom ZIP invalide');if(names.has(file.name))throw Error('Doublon ZIP');names.add(file.name);const name=encoder.encode(file.name),data=bytes(file.data),crc=crc32(data);
if(name.length>65535||data.length>134217728)throw Error('Fichier trop volumineux');const header=Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
local.push(header,name,data);const c=Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]);central.push(c,name);offset+=header.length+name.length+data.length;size+=data.length}
const centralSize=central.reduce((n,a)=>n+a.length,0),end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);
const output=new Uint8Array(offset+centralSize+end.length);let at=0;for(const part of [...local,...central,end]){output.set(part,at);at+=part.length}return output}
return{crc32,pack};
});