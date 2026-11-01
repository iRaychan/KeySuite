const assert=require('assert/strict');
const {chromium}=require('playwright');

(async()=>{
  const baseUrl=process.env.KEYSUITE_TEST_URL||'http://127.0.0.1:8270/';
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(`${baseUrl}selector-kv/index.html?product=1&v=50025`,{waitUntil:'networkidle'});
    await page.evaluate(()=>window.postMessage({type:'KEYSUITE_PRODUCT_MODEL',model:'KV 1-50',action:'view',options:{}},'*'));
    await page.waitForSelector('.selection-model');
    assert.match((await page.locator('.selection-model').textContent()).trim(),/^KV 1-50/);
    assert.equal(await page.locator('.curve-grid .chart-card').count(),4);
    const curve=await page.evaluate(()=>{
      const current=window.__KEYSUITE_CURRENT_SELECTION?.();
      const model=window.KeySuiteKVData.models.find(row=>row.model==='KV 1-50');
      const evaluated=window.KeySuiteKVCore.evaluateModel(window.KeySuiteKVData,model,.2,0,50);
      const source=evaluated.headFit.pts.find(point=>Math.abs(point.x-.2)<1e-9).y;
      return {model:current?.model,order:evaluated.headFit.order,polynomialOnly:evaluated.headFit.polynomialOnly,source,value:window.KeySuiteKVCore.fitValue(evaluated.headFit,.2)};
    });
    assert.equal(curve.model,'KV 1-50');
    assert.equal(curve.order,2);
    assert.equal(curve.polynomialOnly,true);
    assert.notEqual(curve.value,curve.source);
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS V5.00.25 KV 1-50 Product model and smooth Head browser path');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
