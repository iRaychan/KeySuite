const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.KEYSUITE_TEST_URL||'http://127.0.0.1:8360';
const series=['selector','selector-g1','selector-cr','selector-kv','selector-bfi','selector-bgf','selector-bsw'];
const duties=[[6,20],[12,30],[3,12],[25,25],[40,15],[2,8],[10,50],[90,30],[150,20]];
async function run(){
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const ctx=await browser.newContext({serviceWorkers:'block'});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  for(const folder of series){
   const page=await ctx.newPage();
   try{
    page.on('dialog',d=>{console.log(folder,d.message());void d.dismiss();});
    await page.goto(base+'/'+folder+'/index.html');
    let model;
    for(const [flow,head] of duties){
     await page.locator('#flow').fill(String(flow));
     await page.locator('#head').fill(String(head));
     await page.locator('#go').click();
     await page.waitForTimeout(150);
     model=await page.evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION?.()?.model);
     if(model)break;
    }
    assert(model,'No suitable fixture duty was found');
    const result=page.waitForEvent('download',{timeout:15000});
    await page.locator('#keysuitePdf').evaluate(el=>el.click());
    const pdf=await result;
    assert.match(pdf.suggestedFilename(),/\.pdf$/);
    console.log('PASS',folder,model,pdf.suggestedFilename());
   } catch(error){
    process.exitCode=1;
    console.error('FAIL',folder,error.message);
   } finally { await page.close(); }
  }
 } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
