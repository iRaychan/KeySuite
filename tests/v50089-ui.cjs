const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {rpc,as}=require('./v50051-db.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const {db}=await require('./v50086-db.cjs').fixture();
 await db.exec('reset role; alter table ks_products_kv add column price_kvd_myr numeric, add column price_kvsd_myr numeric;alter table ks_products_es add column if not exists source_row integer,add column if not exists rarity text;');
 const dir=path.join(__dirname,'../supabase/migrations');
 await db.exec(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.includes('v50088'))),'utf8'));
 await db.exec(fs.readFileSync('../supabase/migrations/20261125093807_v50089_keystock.sql','utf8'));
 await as(db,'owner','test-links');
 const dom=new JSDOM('<main></main><nav><button id="keyAiNavButton"></button></nav>',{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,checks=[];let failNext=false,writes=0;
 w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.confirm=()=>true;
 w.KeySuitePermissions={level:()=> 'full'};
 w.KeySuiteApp={showPage:page=>w.dispatchEvent(new w.CustomEvent('KEYSUITE_PAGE_CHANGED',{detail:{page}}))};
 w.KeySuiteAuth={getClient:()=>({rpc:async(_name,args)=>{
  try{if(args.p_action!=='state'){writes++;if(failNext){failNext=false;throw Error('Simulated persistence failure');}}
   return {data:await rpc(db,args.p_action,args.p_payload),error:null};
  }catch(e){return {data:null,error:{message:e.message}};}
 }})};
 const $=selector=>{const n=d.querySelector(selector);assert(n,'Missing '+selector);return n};
 const click=selector=>$(selector).click();
 const fill=(selector,value)=>{$(selector).value=value;};
 const submit=selector=>$(selector).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 async function settled(){for(let i=0;i<150;i++){if(!/Saving|Loading/.test($('#stockMessage').textContent)){await sleep(10);return;}await sleep(30);}throw Error('UI operation timeout');}
 const pass=s=>{checks.push(s);console.log('PASS '+s)};
 const link=a=>`[data-link-action="${a}"]`;
 try{
  w.eval(fs.readFileSync(path.join(__dirname,'../keystock-v100.js'),'utf8'));d.dispatchEvent(new w.Event('DOMContentLoaded'));await w.KeyStock.refresh();
  if(process.env.KEYSUITE_LAYOUT_HTML){
   const result=d.querySelector('table[aria-label="Stock Check results"]').outerHTML;
   const css=['keystock-v100.css','release-v50089.css'].map(f=>fs.readFileSync('../'+f,'utf8')).join('\n');
   const measure=()=>{const t=document.querySelector('table'),widths=()=>[...t.rows[0].cells].map(c=>c.getBoundingClientRect().width);
     const before=widths();t.tBodies[0].rows[0].cells[0].textContent='VeryLongModel'.repeat(40);
     while(t.tBodies[0].rows.length>1)t.tBodies[0].deleteRow(1);
     document.body.dataset.result=JSON.stringify({stable:JSON.stringify(before)===JSON.stringify(widths()),alignment:[...t.rows[0].cells].map(c=>getComputedStyle(c).textAlign),widths:before});};
   fs.writeFileSync(process.env.KEYSUITE_LAYOUT_HTML,'<meta charset=utf-8><style>'+css+'</style><div id=keyStock><div id=stockContent>'+result+'</div></div><script>('+measure.toString()+')()</script>');
  }
  click('[data-tab="dropdowns"]');assert.equal(d.querySelectorAll('.stock-browser>section').length,4);assert.equal(d.querySelectorAll('[data-grouping]').length,3);
  assert($('[data-series="CHC_G1"]'));assert($('[data-series="CHC_G2"]'));assert($('#stockOptionAdd').disabled);
  $('#stockEdit').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));await sleep(500);$('#stockEdit').dispatchEvent(new w.KeyboardEvent('keyup',{key:'Enter'}));
  assert($('#stockOptionAdd').disabled);$('#stockEdit').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));await sleep(3200);$('#stockEdit').dispatchEvent(new w.KeyboardEvent('keyup',{key:'Enter'}));
  assert(!$('#stockOptionAdd').disabled);pass('four columns, exactly three categories, C4/C6 separation, short hold cancelled, three-second unlock');
  click('#stockOptionAdd');fill('#stockSeriesOptionForm [name="label"]','Casing');submit('#stockSeriesOptionForm');await settled();assert.match($('#stockContent').textContent,/Casing/);
  click('#stockOptionEdit');fill('#stockSeriesOptionForm [name="label"]','Pump Casing');submit('#stockSeriesOptionForm');await settled();
  click('#stockOptionAdd');fill('#stockSeriesOptionForm [name="label"]','pump casing');submit('#stockSeriesOptionForm');await settled();assert.match($('#stockMessage').textContent,/already exists/);click('#stockOptionCancel');
  click('[data-series="ISO"]');assert(!$('#stockContent').textContent.includes('Pump Casing'));click('[data-series="ES"]');
  await w.KeyStock.refresh();assert.match($('#stockContent').textContent,/Pump Casing/);
  click('#stockOptionDelete');await settled();assert.match($('#stockContent').textContent,/No options yet/);pass('direct option CRUD, duplicate error, independence and refresh persistence through UI');
  click('[data-grouping="linked"]');click('[data-series="KV"]');assert.deepEqual([...d.querySelectorAll('[data-series-option]')].map(n=>n.dataset.seriesOption),['KV','KVC','KVN','KVD','KVSD']);click('[data-series-option="KVSD"]');assert(/Valid for/.test($('#stockContent').textContent));click('[data-series="ES"]');click(link('add-arrangement'));fill('#stockLinkForm [name="label"]','Construction');submit('#stockLinkForm');await settled();
  click(link('add-option'));fill('#stockLinkForm [name="label"]','Bronze');submit('#stockLinkForm');await settled();
  click(link('edit-option'));fill('#stockLinkForm [name="label"]','Bronze impeller');submit('#stockLinkForm');await settled();
  click('[data-series-option="CI / CI / SS / MS"]');click(link('add-mapping'));
  const sel=$('[data-map-group]');sel.value=sel.options[1].value;submit('#stockLinkForm');await settled();assert.match($('#stockMessage').textContent,/Saved successfully/);
  assert.match($('.stock-link-record').textContent,/Mapped/);await w.KeyStock.refresh();assert.match($('.stock-link-record').textContent,/Bronze impeller/);
  click(link('edit-mapping'));fill('#stockLinkForm [name="variant"]','CI / CI / SS / GP');submit('#stockLinkForm');await settled();assert.match($('#stockContent').textContent,/Saved mappings/);
  click(link('add-mapping'));const pick=$('[data-map-group]');pick.value=pick.options[1].value;submit('#stockLinkForm');await settled();assert.match($('#stockMessage').textContent,/Duplicate or ambiguous/);click('#stockLinkCancel');
  click(link('edit-arrangement'));fill('#stockLinkForm [name="label"]','Impeller');failNext=true;submit('#stockLinkForm');await settled();assert.match($('#stockMessage').textContent,/Simulated persistence failure/);assert.equal($('#stockLinkForm [name="label"]').value,'Impeller');
  submit('#stockLinkForm');await settled();pass('arrangement/options/mapping edit and persistence; failed save retains draft and reports error');
  click('[data-tab="receive"]');const s=await rpc(db,'state',{config_client:'v104',ledger_client:'v102'}),model=s.catalog.find(x=>x.family==='ES');
  const series=$('#stockReceiveForm [name="family"]');series.value='ES';series.dispatchEvent(new w.Event('change',{bubbles:true}));
  fill('#stockReceiveForm [name="model"]',model.model);$('#stockReceiveForm [name="model"]').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.deepEqual([...d.querySelectorAll('.receipt-general label')].map(l=>l.firstChild.textContent.trim()),['Series','Supplier','Date','Reference']);
  assert.equal(d.querySelector('.receipt-general button'),null);
  assert.equal(d.querySelectorAll('#receiptVariant').length,1);
  assert.equal(d.querySelector('#stockReceiveForm [name=serials]'),null);
  assert.deepEqual([...d.querySelectorAll('#stockReceiveForm details')].map(x=>x.open),[true,false,false,false,true]);
  assert.equal($('#receiptVariant').selectedOptions.length,1);
  const variant=JSON.parse($('#receiptVariant').value)[0];
  fill('[name=supplier_id]',s.suppliers[0].id);fill('[name=location_id]',s.locations[0].id);fill('[name=quantity]','5');fill('[name=cost]','70');
  click('#stockAddReceiptRow');const second=$('[data-receipt-row]:last-child');second.querySelector('[name=model]').value=model.model;second.querySelector('[name=model]').dispatchEvent(new w.Event('change',{bubbles:true}));
  second.querySelector('[name=quantity]').value='2';second.querySelector('[name=cost]').value='90';second.querySelector('[name=location_id]').value=s.locations[0].id;
  submit('#stockReceiveForm');await settled();assert.match($('#stockMessage').textContent,/Saved/);
  click('[data-tab=check]');click('[data-stock-detail="'+model.key+'"]');const bucket=$('[data-bucket]');assert.equal(bucket.getAttribute('aria-expanded'),'false');
  assert(bucket.closest('tr').textContent.includes(variant));assert(bucket.closest('tr').textContent.includes('90.00'));bucket.click();
  const batch=d.querySelector('[data-layout=batch-details] tbody tr:last-child');assert.match(batch.textContent,/90.00/);
  w.prompt=()=>'Correct unopened receipt';batch.querySelector('[data-cancel-position]').click();await settled();assert.match($('#stockMessage').textContent,/Saved/);assert.match($('[data-bucket]').closest('tr').textContent,/70.00/);
  pass('Shared mapped two-row receipt, collapsed sections, persisted batch costs, exact cancellation and refreshed maximum');
  click('[data-tab=references]');fill('[data-ref-form] [name=label]','Zz sample');submit('[data-ref-form]');await settled();fill('#masterFilter','zz sample');$('#masterFilter').dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('#masterRows li').length,1);click('[data-remove-reference]');await settled();assert.equal(d.querySelectorAll('#masterRows li').length,0);click('#masterClear');click('[data-reference-tab=location]');click('[data-remove-reference="'+s.locations[0].id+'"]');await settled();assert.match($('#stockMessage').textContent,/contains stock/);
  pass('Supplier creation, filtering, deletion and occupied location protection');
  await as(db,'user','test-links',false);w.dispatchEvent(new w.Event('keysuite-permissions-changed'));await w.KeyStock.refresh();assert.equal(d.querySelector('[data-tab="dropdowns"]'),null);pass('read-only user cannot reach editing controls');

 }finally{dom.window.close();await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
