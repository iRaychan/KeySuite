const assert=require('assert');
const {chromium}=require('playwright');

(async()=>{
  const baseUrl=process.env.KEYSUITE_TEST_URL||'http://127.0.0.1:8270/';
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(`${baseUrl}selector-kv/index.html?v=50024`,{waitUntil:'networkidle'});
    await page.fill('#flow','1.2');
    await page.fill('#head','80');
    await page.click('#go');
    await page.waitForSelector('.selection-model');
    assert.match((await page.locator('.selection-model').textContent()).trim(),/^KV 1-/);
    assert.equal(await page.locator('.curve-grid .chart-card').count(),4);
    assert.equal(await page.locator('#dutyPointList .duty-point-row').count(),0);
    await page.click('#addDutyPoint');
    assert.equal(await page.locator('#dutyPointList .duty-point-row').count(),1);
    assert.match(await page.locator('.kpi-core').nth(1).textContent(),/kW at Q=0/);
    await page.check('#parallel2');
    await page.check('#enhancedMode');
    await page.click('#go');
    await page.waitForFunction(()=>document.querySelector('.selection-status')?.textContent.includes('ENHANCED'));
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS V5.00.24 KV browser workflow and CR MASTER controls');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
