/* Optional real Chromium E2E: npm install -D playwright && npm run test:browser
 * Uses local source files; no GitHub Pages or NightVenture_Legacy access. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
async function main(){
 let chromium;
 try{({chromium}=require('playwright'))}catch{throw Error('Playwright absent. Installer avec npm install -D playwright puis npx playwright install chromium.')}
 const server=http.createServer(async(req,res)=>{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname),filename=path.resolve(ROOT,'.'+(requested==='/'?'/index.html':requested));
  if(!filename.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
  try{const content=await fs.readFile(filename);const ext=path.extname(filename).toLowerCase(),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});res.end(content)}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const page=await browser.newPage({acceptDownloads:true,viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.NightVentureCatalogUI&&!!window.VFXProductionUI);
  assert.deepEqual(errors,[],'Initial browser console errors');
  const box=await page.locator('#editor').boundingBox();assert.ok(box);
  await page.mouse.click(box.x+box.width*5.5/32,box.y+box.height*6.5/32);
  assert.equal(await page.evaluate(()=>window.VFXStudioBridge.currentProject().frames[0][(6*32+5)*4+3]),255,'Pixel paint');
  await page.locator('#compFromEditor').click();await page.locator('#compAddEmitter').click();
  assert.equal(await page.evaluate(()=>window.VFXComposerUI.getComposition().layers.length),1,'Emitter insertion');
  await page.locator('#tlTime').fill('0');await page.locator('#tlValue').fill('3');await page.locator('#tlAddKey').click();
  await page.locator('#tlTime').fill('500');await page.locator('#tlValue').fill('14');await page.locator('#tlAddKey').click();
  assert.equal(await page.evaluate(()=>window.VFXComposerUI.getComposition().layers[0].tracks.x.length),2,'Keyframes');
  const downloadPromise=page.waitForEvent('download',{timeout:90000});await page.locator('#prodDownload').click();const zip=await downloadPromise;
  assert.equal(zip.suggestedFilename(),'vfx-atlas-production.zip');
  const binary=await fs.readFile(await zip.path());assert.equal(binary.toString('ascii',0,2),'PK','Production ZIP signature');
  assert.ok(binary.includes(Buffer.from('atlas.json')),'ZIP manifest included');
  assert.ok(binary.includes(Buffer.from('vfx-atlas-00.png')),'ZIP PNG included');
  await page.selectOption('#nvAbility','magic_elemental_nova');await page.locator('#nvLoad').click();
  assert.equal(await page.evaluate(()=>window.VFXComposerUI.getComposition().catalog.id),'magic_elemental_nova');
  assert.equal(await page.locator('#prodTarget').inputValue(),'nightventure');
  const plan=await page.evaluate(()=>window.VFXProductionUI.plan());assert.equal(plan.integration.catalog.geometry.radiusU,70);
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  console.log('SUCCESS Chromium E2E: paint → asset → emitter → keyframes → ZIP → NightVenture metadata');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(err=>{console.error(err);process.exitCode=1});
