const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const base=process.env.KEYSUITE_TEST_URL||'http://127.0.0.1:8360';
const output=path.resolve('../deliverables/Phase_V50057');

async function run(){
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage();
  let popups=0,downloads=0;
  page.on('popup',()=>popups++);
  page.on('download',()=>downloads++);
  page.on('pageerror',error=>console.error('Page error:',error.message));
  page.on('response',r=>{if(r.url().includes('/api/technical-pdf'))console.log('Renderer HTTP',r.status());});
  let expectFailure=false;
  page.on('dialog',dialog=>{if(!expectFailure){console.error('Unexpected dialog:',dialog.message());void dialog.dismiss();}});
  await page.goto(base+'/index.html');
  await page.waitForFunction(()=>window.KeySuiteTechnicalPdf&&window.KeySuitePumpPdfNames&&window.KeySuiteSelectorBrand);
  for(const family of ['ES','ISO']){
   const iso=family==='ISO',model=iso?'150-125-400':'65-26';
   const applyDuty=async frame=>frame.locator('#flow').evaluate((el,{iso})=>{
    el.value=iso?'1000':'90';
    document.getElementById('flowUnit').value=iso?'usgpm':'m3h';
    document.getElementById('head').value=iso?'55':'90';
    document.getElementById('run').click();
   },{iso});
   for(const product of [false,true]){
    const entry=product?'Product':'Selection';
    const frameId=product?'product'+(iso?'Iso':'Es')+'SelectorFrame':iso?'selectorIsoFrame':'selectorEsFrame';
    if(product){
     await page.locator('#'+frameId).evaluate((el,family)=>{el.src='/selector-'+family+'/index.html?product=1';},family.toLowerCase());
    }
    const frame=page.frameLocator('#'+frameId);
    if(product){
     await frame.locator('#flow').evaluate((el,{iso,model})=>{
      window.dispatchEvent(new MessageEvent('message',{data:{type:'KEYSUITE_PRODUCT_MODEL',model,pole:iso?4:2}}));
     },{iso,model});
    }
    await applyDuty(frame);
    const payload=await frame.locator('body').evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION());
    assert.equal(payload.model,family+' '+model);
    const downloadPromise=page.waitForEvent('download',{timeout:55000});
    await frame.locator('#keysuiteMobileExport').evaluate(el=>{el.click();el.click();});
    const download=await downloadPromise;
    if(product)assert.match(download.suggestedFilename(),new RegExp('^\\d{6} - '+family+' '+model+' - '));
    else assert.match(download.suggestedFilename(),new RegExp('^Item '+(iso?'02':'01')+' - '+family+' '+model));
    await download.saveAs(path.join(output,entry+'-'+family+'-shared.pdf'));
    console.log(entry,family,download.suggestedFilename());
   }
  }
  assert.equal(downloads,4);
  assert.equal(popups,0);
  const before=await page.evaluate(()=>KeySuitePumpPdfNames.ticket('Item 03 - pump.pdf'));
  assert(before);
  await page.route('**/api/technical-pdf',route=>route.fulfill({status:500}));
  expectFailure=true;
  const errorPromise=page.waitForEvent('dialog',{timeout:50000});
  await page.frameLocator('#selectorIsoFrame').locator('#keysuiteMobileExport').evaluate(el=>el.click());
  const error=await errorPromise;
  assert.match(error.message(),/PDF generation failed/);
  await error.dismiss();
  const after=await page.evaluate(()=>KeySuitePumpPdfNames.ticket('Item 03 - pump.pdf'));
  assert.deepEqual(after,before);
  assert.equal(downloads,4);
  console.log('PASS no preview popups, duplicate click guard, Product numbering isolation and failure counter preservation.');
 } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
