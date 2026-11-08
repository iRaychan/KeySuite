const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.KEYSUITE_BASELINE_URL || 'http://127.0.0.1:8356';
const out = path.resolve('../deliverables/Phase_V50057');

async function run(){
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    for(const family of ['ES','ISO']){
      const iso=family==='ISO',model=iso?'150-125-400':'65-26';
      const page=await context.newPage();
      await page.goto(base+'/index.html');
      await page.waitForFunction(()=>window.KeySuitePumpPdfDownload);
      const frame=page.frameLocator(iso?'#selectorIsoFrame':'#selectorEsFrame');
      await frame.locator('#flow').evaluate((el,{iso})=>{
        el.value=iso?'1000':'90';
        document.getElementById('flowUnit').value=iso?'usgpm':'m3h';
        document.getElementById('head').value=iso?'55':'90';
        document.getElementById('run').click();
      },{iso});
      const payload=await frame.locator('body').evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION());
      assert.equal(payload.model,family+' '+model);
      const popupPending=page.waitForEvent('popup');
      const fromPage=page.waitForEvent('download',{timeout:15000}).catch(()=>null);
      await frame.locator('#keysuiteMobileExport').evaluate(el=>el.click());
      const popup=await popupPending;
      const download=await Promise.race([popup.waitForEvent('download',{timeout:15000}),fromPage]);
      assert(download);
      assert.match(download.suggestedFilename(),new RegExp('^Item '+(iso?'02':'01')+' - '+family+' '+model));
      await download.saveAs(path.join(out,'Selection-'+family+'-baseline.pdf'));
      await popup.close();
      await page.close();

      const selector=await context.newPage();
      await selector.goto(base+'/selector-'+family.toLowerCase()+'/index.html?product=1');
      const reportHtml=await selector.evaluate(({model,iso})=>{
        window.dispatchEvent(new MessageEvent('message',{data:{type:'KEYSUITE_PRODUCT_MODEL',model,pole:iso?4:2}}));
        document.getElementById('flow').value=iso?'1000':'90';
        document.getElementById('flowUnit').value=iso?'usgpm':'m3h';
        document.getElementById('head').value=iso?'55':'90';
        document.getElementById('run').click();
        window.open=()=>({document:{open(){},write(html){window.reviewReport=html;},close(){}},addEventListener(){}});
        document.getElementById('keysuiteMobileExport').click();
        return window.reviewReport;
      },{model,iso});
      assert(reportHtml?.includes(model));
      const native=await context.newPage();
      await native.goto(base+'/selector-'+family.toLowerCase()+'/index.html?product=1');
      await native.setContent(reportHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
      const dimensions=await native.locator('.dimension-drawing img').evaluate(async img=>{
        await img.decode();
        return [img.naturalWidth,img.naturalHeight,img.width,img.height];
      });
      assert.deepEqual(dimensions.slice(0,2),[1911,858]);
      assert(Math.abs(dimensions[2]/dimensions[3]-1911/858)<.03);
      await native.pdf({path:path.join(out,'Product-'+family+'-baseline.pdf'),preferCSSPageSize:true,printBackground:true});
      console.log(family,download.suggestedFilename(),dimensions);
      await native.close();
      await selector.close();
    }
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
