const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const { chromium }=require('playwright');
const root=path.resolve(__dirname,'..');
require(path.join(root,'supabase/functions/shared-kv/kv-data.js'));
require(path.join(root,'supabase/functions/shared-kv/kv-selector-core.js'));
const db=globalThis.KeySuiteKVData,core=globalThis.KeySuiteKVCore;
for(const [series,count] of [['KV 12',19],['KV 15',18]]){
  const rows=db.models.filter(row=>row.series===series);
  assert.equal(rows.length,count);
  assert.equal(db.curves[series].flow.length,20);
  const result=core.evaluateModel(db,rows[0],series==='KV 12'?5:8,10,50);
  assert(Number.isFinite(result.predHead)&&Number.isFinite(result.shaft));
}
for(const f of ['index.html','product.html']){
  const source=fs.readFileSync(path.join(root,'selector-g1',f),'utf8');
  const map=JSON.parse(source.match(/const G1_DIMENSION_IMAGES=(\{[^\n]*\});/)[1]);
  assert.deepEqual(Object.keys(map),Array.from({length:13},(_,i)=>String(i+1)));
  for(const url of Object.values(map))assert(url.startsWith('data:image/png;base64,')&&Buffer.from(url.slice(22),'base64').length>10000);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8372/selector-kv/index.html');
  await page.waitForFunction(()=>globalThis.KeySuiteKVData?.models?.length===253);
  const result=await page.evaluate(()=>{
   document.getElementById('flow').value='12';
   document.getElementById('head').value='18';
   document.getElementById('go').click();
   return {selection:window.__KEYSUITE_CURRENT_SELECTION?.(),text:document.body.innerText};
  });
  assert(result.selection?.model);
  assert(result.text.includes('KV') && result.selection.model.startsWith('KV '));
  console.log('PASS KV 12/15 catalogue, curves, selector and CHC 13-image mapping');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
