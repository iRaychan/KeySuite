const {chromium}=require('/private/tmp/keysuite-v50035-qa/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage();
 page.on('dialog',d=>{console.log('DIALOG',d.message());d.dismiss()});
 await page.goto('http://127.0.0.1:8275/index.html');await page.waitForFunction(()=>window.KeySuitePricing&&window.KeySuiteCostingAudit&&window.KeySuitePumpPdfNames);
 const setup=await page.evaluate(()=>{
  window.fixtureCustomer={id:'fixture35',pricingCategoryId:'cat35',company:'Fixture'};
  const select=document.getElementById('qCustomer');select.add(new Option('Fixture','fixture35'));select.value='fixture35';
  window.KeySuiteApp.getPricingCustomer=()=>fixtureCustomer;window.KeySuiteApp.getCustomers=()=>[fixtureCustomer];window.KeySuiteApp.getSelectedCustomer=()=>fixtureCustomer;
  window.KeySuitePermissions.can=()=>true;
  window.KeySuiteAuth.getClient=()=>null;
  const rule={margin:.08,normal:.08,rare:.08,trimming:0,transport:0,currencies:['RMB','USD'],useCommission:true,useSetDiscount:true,useFinalDiscount:true,useFuelCharge:false};
  window.KEYSUITE_SECURE_DATA={categories:[{id:'cat35',productRules:{CHC_G2:rule,CHC_G1:rule,MOTOR:rule,ES:rule}}],products:[{id:'pump35',model:'CHC 10-40',hp:3,pricesByCurrency:{RMB:{CHC:1560,CHCS:2161,CHCN:2348}},rarityByCurrency:{RMB:{CHC:'common',CHCS:'many',CHCN:'rare'}}}],esProducts:[{id:'es35',model:'ES 32-13',dimensions:{shaft_mm:24},variants:[{material:'CI / SS / SS / MS',priceUsd:134.49,priceRmb:null,priceMyr:null}]}],motorProducts:[{id:'motor35',model:'Fixture 3HP IE3',hp:3,pole:2,efficiencyClass:'IE3',pricesByCurrency:{RMB:{MOTOR:400}}}],productMultipliers:{CHC_G2:{RMB:.8668,USD:5.8},ES:{USD:5.5,RMB:.8668},MOTOR:{RMB:.8668}},customerPricingRows:[{customerId:'fixture35',commission:.08,setDiscount:.08,finalDiscount:.08}]};
  KeySuiteComponents.loadForTest([{family:'ES',kind:'seal',size_group:'24',material:'Car/Cer',price_myr:0},{family:'ES',kind:'oring',size_group:'24',material:'Viton',price_myr:0},{family:'CHC',kind:'oring',size_group:'8_20',material:'Viton',price_myr:0}]);
  KeySuitePricing.init(KEYSUITE_SECURE_DATA,{});
  const result=['CHC','CHCS','CHCN'].map(variant=>{const f=KeySuitePricing.findPrice(variant+' 10-40');return {variant,source:f.calc.sourcePrice,rarity:f.calc.rarity,snapshot:KeySuitePricing.sourceSnapshot(f)}});
  document.getElementById('esProductModelGrid').innerHTML='<div class="product-model-row"><h3>ES 32-13</h3><div class="product-model-actions"><button>Curve</button></div></div>';
  KeySuiteCostingAudit.enhance();return result;
 });
 assert.deepEqual(setup.map(x=>x.source),[1560,2161,2348]);assert.deepEqual(setup.map(x=>x.rarity),['common','many','rare']);
 await page.locator('#esProductModelGrid .keysuite-cost-button').evaluate(b=>b.click());await page.waitForFunction(()=>document.querySelector('#costingAuditDialog')?.open);
 const direct=await page.locator('#costingAuditBody').innerText();assert(!direct.includes('Customer pricing not selected'));assert(/Assembly final: RM [\d,]+/.test(direct));
 assert(!direct.includes('Saved quotation price:'));
 const directTotals=direct.match(/Assembly final:.*Individual final: RM [\d,.]+/)?.[0];await page.evaluate(()=>document.getElementById('costingAuditDialog').close());
 await page.evaluate(()=>KeySuiteCostingAudit.open({model:'ES 32-13',qty:1,pricingSource:KeySuitePricing.sourceSnapshot(KeySuitePricing.findEsPrice('es35','CI / SS / SS / MS'))}));
 assert.equal((await page.locator('#costingAuditBody').innerText()).match(/Assembly final:.*Individual final: RM [\d,.]+/)?.[0],directTotals);
 await page.evaluate(()=>document.getElementById('costingAuditDialog').close());
 await page.evaluate(()=>KeySuiteCostingAudit.open({model:'CHCN 10-40',qty:1,pricingSource:KeySuitePricing.sourceSnapshot(KeySuitePricing.findPrice('CHCN 10-40',{bareShaft:true}))}));
 const bare=await page.locator('#costingAuditBody').textContent();assert(bare.includes('2,348.00'));assert(bare.includes('Fixture 3HP IE3'));assert(bare.includes('Bare shaft: converted source deduction'));await page.evaluate(()=>document.getElementById('costingAuditDialog').close());
 console.log('PASS selected-customer Product Cost equals shared Curve source context; independent CHC/CHCS/CHCN costs and rarity; motor detail and bare deduction');
 const curve=await context.newPage();await curve.goto('http://127.0.0.1:8275/selector-es/index.html?product=1');
 for(let i=0;i<4;i++)for(const pole of [2,4]){await curve.evaluate(p=>window.postMessage({type:'KEYSUITE_PRODUCT_MODEL',model:'ES 32-13',options:{pole:p,material:'CI / SS / SS',sealType:'Mechanical Seal',sealMaterial:'Carbon Ceramic',elastomer:'Viton'}},'*'),pole);await curve.waitForFunction(p=>window.__KEYSUITE_CURRENT_SELECTION?.()?.pole===p,pole);assert(await curve.locator('svg').count()>0)}
 console.log('PASS ES 32-13 repeated native 2P/4P curve model load');
 const lifecycle=await context.newPage();await lifecycle.goto('http://127.0.0.1:8275/tests/');await lifecycle.setContent('<main><dialog id="productCurveDialog"><div class="product-curve-selector-head"><h2 id="productCurveTitle"></h2><button id="closeProductCurve">Back</button></div><div id="productCurveHost"></div></dialog><iframe id="productEsSelectorFrame" style="display:none;width:100%" src="about:blank" data-src="/selector-es/index.html?product=1"></iframe></main>');
 await lifecycle.addScriptTag({url:'http://127.0.0.1:8275/v394411-product-curve.js'});
 for(let i=0;i<3;i++){
  await lifecycle.evaluate(()=>KeySuiteV394411ProductCurve.open('ES','ES 32-13'));
  await lifecycle.waitForFunction(()=>{const f=document.getElementById('productEsSelectorFrame');return f.getBoundingClientRect().width>0&&f.contentWindow.__KEYSUITE_CURRENT_SELECTION?.()?.model&&document.getElementById('ks50035CurveStatus')?.hidden});
  const iframe=lifecycle.frameLocator('#productEsSelectorFrame');assert(await iframe.locator('svg').count()>0);
  await lifecycle.evaluate(()=>document.getElementById('productCurveDialog').close());
 }
 console.log('PASS Product Curve runtime opens/reopens ES with initially hidden frame and native readiness');await lifecycle.close();
 const names=await page.evaluate(()=>{const names=KeySuitePumpPdfNames,p={model:'CHCN 10-40',required_flow_m3h:10,required_head_m:40};names.reset();const a=names.nextFromPayload(p),again=names.nextFromPayload(p);names.commit(a);const b=names.nextFromPayload(p);names.reset();return {a,again,b,reset:names.nextFromPayload(p),title:names.metadataTitleFromPump(p,new Date(2026,10,4))}});
 assert(names.a.startsWith('Item 01 - CHCN 10-40'));assert.equal(names.a,names.again);assert(names.b.startsWith('Item 02'));assert.equal(names.reset,names.a);assert.equal(names.title,'261104 - CHCN 10-40 - 10m3／hr @ 40 Mtr');
 console.log('PASS PDF reservation, successful-generation commit, reset and metadata title with duty');
 fs.mkdirSync('tests/v50035-results',{recursive:true});
 // Use an actual native ES report, then exercise the PDF-byte downloader.
 const popupPromise=curve.waitForEvent('popup');await curve.locator('#keysuiteMobileExport').click();const nativeReport=await popupPromise;await nativeReport.waitForLoadState();const html=await nativeReport.content();await nativeReport.close();
 await page.evaluate(()=>{window.__pdfHtml=null});
 const reportPromise=page.waitForEvent('popup');await page.evaluate(()=>{window.testReport=window.open('','_blank')});const report=await reportPromise;report.on('pageerror',e=>console.log('REPORT ERROR',e.message));const downloadPromise=report.waitForEvent('download');
 await page.evaluate(html=>{const report=window.testReport,source={__KEYSUITE_CURRENT_SELECTION:()=>({model:'ES 32-13',required_flow_m3h:10,required_head_m:20}),__KEYSUITE_PDF_FILE_TITLE__:'Item 01 - ES 32-13 - 10 m3 per hr at 20 Mtr.pdf'};KeySuiteSelectorBrand.installReportWriteTransform(report,source);report.document.open();report.document.write(html);report.document.close()},html);
 const download=await downloadPromise;await download.saveAs('tests/v50035-results/es-report.pdf');assert(download.suggestedFilename().startsWith('Item 01 - ES 32-13'));console.log('PASS real ES report PDF download',download.suggestedFilename());
 const extra=await page.evaluate(async()=>{
  document.getElementById('qCustomer').value='';quotationPricingCustomerId='';quotationPricingCustomerSnapshot=null;fixtureCustomer=null;
  KeySuiteApp.getCustomers=()=>fixtureCustomer?[fixtureCustomer]:[];
  const plain=KeySuitePumpPdfNames.nextFromPayload({model:'KV 4-50'});KeySuitePumpPdfNames.commit(plain);
  await KeySuiteCostingAudit.open({model:'Manual',unitPrice:123.45,pricingSource:{product_family:'MANUAL',manual_override:true,calculated_price:123.45}});
  const manual=document.getElementById('costingAuditBody').textContent;document.getElementById('costingAuditDialog').close();
  KeySuitePermissions.can=()=>false;const denied=await KeySuiteCostingAudit.authorized();KeySuitePermissions.can=()=>true;
  KeySuiteCostingAudit.enhance();document.querySelector('#esProductModelGrid .keysuite-cost-button').click();await new Promise(resolve=>setTimeout(resolve,0));
  const sourceOnly=document.getElementById('costingAuditBody').textContent;document.getElementById('costingAuditDialog').close();
  document.getElementById('startCustomerClear').click();document.getElementById('qCustomer').add(new Option('Fixture','fixture35'));document.getElementById('qCustomer').value='fixture35';
  return {plain,manual,denied,sourceOnly,reset:KeySuitePumpPdfNames.nextFromPayload({model:'KV 4-50'})};
 });
 assert.equal(extra.plain,'KV 4-50');assert(extra.manual.includes('123.45'));assert.equal(extra.denied,false);assert(extra.sourceOnly.includes('739.70'));assert(extra.sourceOnly.includes('Customer pricing not selected'));assert(extra.reset.startsWith('Item 01'));
 console.log('PASS no-customer filename/costs, Dashboard X counter reset, manual override and permission denial');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
