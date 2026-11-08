const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8356';
const baseline = process.env.KEYSUITE_BASELINE_URL || 'http://127.0.0.1:8357';
const output = path.resolve(process.env.KEYSUITE_TEST_OUTPUT || '../deliverables/Phase_V50056');

async function openFixture(context, origin) {
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(origin + '/index.html');
  await page.waitForFunction(()=>window.KeySuiteApp&&window.KeySuiteAuthority);
  await page.evaluate(() => {
    window.KEYSUITE_ACCESS={email:'qa@example.invalid',role:'owner',company_id:'review'};
    window.KEYSUITE_PROFILE={...window.KEYSUITE_ACCESS};
    document.body.classList.remove('auth-locked');
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('loadingView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    document.querySelector('.app').style.setProperty('display','grid','important');
    KeySuitePermissions.can = () => true;
    KeySuiteAuthority.canOpenPage = () => true;
    KeySuiteAuthority.can = () => true;
    window.dispatchEvent(new Event('KEYSUITE_AUTHORITY_CHANGED'));
  });
  return page;
}

async function run() {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const context = await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1050}});
    await context.route(url => /^https?:$/.test(url.protocol)&&![base,baseline].includes(url.origin), route => route.abort());
    context.on('page',tab=>{
      tab.on('pageerror',error=>console.error('Browser:',error.message));
      tab.on('dialog',dialog=>{console.error('Browser dialog:',dialog.message());void dialog.dismiss().catch(()=>{});});
      tab.on('console',message=>{if(tab.url()==='about:blank'&&message.type()==='error')console.error('Report console:',message.text());});
    });
    context.on('requestfailed',request=>{if(request.url().includes('127.0.0.1'))console.error('Local request failed:',request.url(),request.failure());});
    const old = await openFixture(context, baseline);
    const page = await openFixture(context, base);
    const capture = (tab,name) => tab.screenshot({path:path.join(output,name+'.png')});
    const quoteItems = ['ES','ISO'].flatMap(family => [false,true].map(set => ({
      model: family==='ES'?'ES 65-26':'ISO 150-125-400',
      description: [
        set?'Capacity: 1000 US gpm (227.1 m³/hr) @ 55 Mtr':'',
        `B.G.Reich ${family==='ISO'?'ISO ':''}End Suction Pump Model: ${family==='ES'?'65-26':'150-125-400'}`,
        set?'c/w 75HP 4Pole IE3 Motor (415V / 3Ph / 50Hz)\nc/w Baseplate with Flexible Coupling':'',
        'Pump Material: CI / SS / SS / Mech Seal',
        set?'':'(Bare shaft pump only)'
      ].filter(Boolean).join('\n'),
      pricingSource:set?{product_family:'ASSEMBLY',source_kind:'PUMPSET_DIRECT_'+family,carried_final_price:true}:{product_family:family},
      qty:1,unit:set?'set':'unit',unitPrice:set?16720:8960
    })));

    for(const [tab,tag] of [[old,'before'],[page,'after']]){
      await tab.evaluate(async () => {
        const rows=KeySuiteComponents.defaults.map(row=>({...row}));
        const getClient=KeySuiteAuth.getClient;
        KeySuiteAuth.getClient=()=>({from:()=>({select:async()=>({data:rows,error:null})})});
        await KeySuiteComponents.init();
        KeySuiteAuth.getClient=getClient;
        KeySuiteApp.showPage('esPriceList');
      });
      await tab.locator('#esPriceList .component-price-editor').screenshot({path:path.join(output,`002-${tag}-surcharge.png`)});
      await tab.evaluate(async () => {
        KeySuiteApp.showPage('productCoupling');
        KeySuiteCoupling.init({couplingProducts:[]},{role:'owner'});
      });
      await tab.locator('#couplingProductPumpSeries').selectOption('ISO');
      await tab.locator('#couplingProductPump').selectOption('ISO 100-65-315S');
      const options = await tab.locator('#couplingProductPump option').allTextContents();
      const sorted = [...options].sort((a,b) => a.localeCompare(b,'en',{numeric:true,sensitivity:'variant'}));
      assert.equal(JSON.stringify(options)===JSON.stringify(sorted),tag==='after');
      await tab.evaluate(() => KeySuiteCoupling.init({couplingProducts:[]},{role:'owner'}));
      assert.equal(await tab.locator('#couplingProductPump').inputValue(),'ISO 100-65-315S');
      await tab.locator('#couplingProductPump').focus();
      await capture(tab,`003-${tag}-coupling`);
      await tab.locator('#couplingProductPumpSeries').selectOption('ES');
      if(tag==='after'){
        const es=await tab.locator('#couplingProductPump option').allTextContents();
        assert.deepEqual(es,[...es].sort((a,b) => a.localeCompare(b,'en',{numeric:true,sensitivity:'variant'})));
      }
      const quote = await tab.evaluate(items => {
        KeySuiteApp.showPage('quotation');
        setQuoteItems(items);
        setAllItemsCollapsed(false);
        buildPrintQuotation();
        const positions = [...document.querySelectorAll('#pItemPages .print-items-table tbody tr')].filter(row=>row.cells[0]?.rowSpan===2);
        return {
          capacityOnHeading: positions.map(row=>row.cells[1].textContent.startsWith('Capacity:')),
          editor: getQuoteItems().map(item=>item.description),
          total: getQuoteItems().reduce((sum,item)=>sum+item.qty*item.unitPrice,0)
        };
      },quoteItems);
      assert.deepEqual(quote.capacityOnHeading,[tag==='after',tag==='after']);
      assert.equal(quote.total,51360);
      assert.deepEqual(quote.editor,quoteItems.map(item=>item.description));
      await capture(tab,`004-${tag}-editor`);
      await tab.evaluate(()=>{document.body.classList.add('print-complete');document.querySelector('.app').style.removeProperty('display');});
      await tab.pdf({path:path.join(output,`004-${tag}-quotation.pdf`),preferCSSPageSize:true,printBackground:true});
      await tab.evaluate(()=>{document.body.classList.remove('print-complete');document.querySelector('.app').style.setProperty('display','grid','important');});
      await tab.evaluate(()=>KeySuiteApp.showPage('dashboard'));
      await tab.locator('#ksDashFlow').waitFor();
      await capture(tab,`005-${tag}-dashboard`);
    }

    const pricing = await page.evaluate(async () => {
      const components = KeySuiteComponents;
      const rows = components.defaults.map(row=>({...row}));
      const prices = {'Car/Cer':null,'Viton':null,'SiC/SiC':125,Tungsten:240,EPDM:60,NBR:40};
      for(const row of rows)if(['ES','ISO'].includes(row.family))row.price_myr=prices[row.material];
      const mock = {from:()=>({
        async select(){return {data:rows,error:null}},
        upsert(records){for(const record of records)Object.assign(rows.find(row=>['family','kind','size_group','material'].every(k=>row[k]===record[k])),record);return {select:async()=>({data:records,error:null})}}
      })};
      const getClient=KeySuiteAuth.getClient;
      KeySuiteAuth.getClient=()=>mock;
      await components.init();
      const models = {ES:['32-13','65-26','80-40','250-40'],ISO:['50-32-160','80-50-250','100-65-315S','150-125-400','150-125-500','300-250-400','350-300-500']};
      const results=Object.entries(models).flatMap(([family,modelList])=>modelList.map(model=>({
        family,model,shaft:components.shaftSize(family,model),
        total:[['Car/Cer','Viton'],['SiC/SiC','EPDM'],['Tungsten','NBR']].map(([seal,elastomer])=>components.additions(family,model,{seal,elastomer}).total)
      })));
      const input=document.querySelector('[data-component-price="ISO|oring|42|NBR"]');
      input.value='0';await input.closest('tr').querySelector('button').onclick();
      const zero=components.additions('ISO','150-125-400',{elastomer:'NBR'}).total;
      input.value='';await input.closest('tr').querySelector('button').onclick();
      const missing=components.additions('ISO','150-125-400',{elastomer:'NBR'});
      const upgraded=components.apply({finalPrice:1000,beforeFuel:970},'ISO','150-125-400',{seal:'Tungsten',elastomer:'EPDM'});
      const unknown=components.additions('ES','125-26G');
      const customer={id:'review',pricingCategoryId:'review-category',company:'Local review'};
      const rule={margin:.1,normal:0,rare:0,trimming:0,transport:0,currencies:['USD']};
      const category={id:'review-category',productRules:{ISO:rule,ES:rule}};
      const variant='CI / SS / SS / MS';
      const esProduct={id:'es-review',model:'ES 80-40',variants:[{material:variant,priceUsd:1000}]};
      KeySuitePricing.init({categories:[category],esProducts:[esProduct]},{role:'owner'});
      const opts={customer,category,seal:'Tungsten',elastomer:'EPDM'};
      const iso=KeySuiteISO.findPrice('150-125-400',variant,opts);
      const es=KeySuitePricing.findEsPrice(esProduct.id,variant,opts);
      const bom=[iso,es].map(found=>({model:found.product.model,qty:1,pricingSource:KeySuitePricing.sourceSnapshot(found)}));
      const assembly=KeySuitePricing.priceAssemblyForDisplay(bom,{customer,category});
      const repriced=KeySuitePricing.repriceSource(bom[0].pricingSource,'quotation',{customer,category});
      KeySuiteAuth.getClient=getClient;
      return {results,zero,missing,upgraded,unknown,
        integrated:{iso:iso.calc.componentAddon,es:es.calc.componentAddon,
          reprice:repriced.calc.componentAddon,assembly:assembly.items.map(item=>item.pricingSource.component_addon_myr),assemblyTotal:assembly.total}};
    });
    assert.deepEqual(pricing.results.map(result=>Number(result.shaft)),[24,32,42,48,24,32,37,42,48,65,75]);
    for(const result of pricing.results)assert.deepEqual(result.total,[0,185,280]);
    assert.equal(pricing.zero,0);
    assert.match(pricing.missing.error,/ISO 42 NBR/);
    assert.equal(pricing.upgraded.beforeFuel,1270);
    assert.equal(pricing.upgraded.finalPrice,1300);
    assert.match(pricing.unknown.error,/No V1.3 shaft size/);
    assert.deepEqual(pricing.integrated.assembly,[300,300]);
    assert.equal(pricing.integrated.iso,300);
    assert.equal(pricing.integrated.es,300);
    assert.equal(pricing.integrated.reprice,300);
    fs.writeFileSync(path.join(output,'002-surcharge-results.json'),JSON.stringify(pricing,null,2));

    for(const [origin,tag] of [[baseline,'before'],[base,'after']])for(const family of ['es','iso']){
      const selector=await context.newPage();
      await selector.goto(origin+'/selector-'+family+'/index.html');
      await selector.locator('#flow').fill(family==='iso'?'1000':'90');
      if(family==='iso')await selector.locator('#flowUnit').selectOption('usgpm');
      await selector.locator('#head').fill(family==='iso'?'55':'90');
      await selector.locator('#run').click();
      const html=await selector.evaluate(()=>{
        window.open=()=>({document:{open(){},write(value){window.reviewReport=value;},close(){}},addEventListener(){}});
        document.getElementById('keysuiteMobileExport').onclick();
        return window.reviewReport;
      });
      const report=await context.newPage();
      await report.goto(origin+'/selector-'+family+'/index.html');
      await report.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
      const drawing=report.locator('.dimension-drawing img');
      await drawing.evaluate(img=>img.decode());
      if(tag==='after')assert.equal(await drawing.evaluate(img=>img.naturalWidth),1911);
      await report.locator('.dimension-page').screenshot({path:path.join(output,`001-${tag}-${family}-page3.png`)});
      await report.pdf({path:path.join(output,`001-${tag}-${family}-native.pdf`),preferCSSPageSize:true,printBackground:true});
      await report.close();
      await selector.close();
    }

    const item=page.locator('#ksDashPdfItemNo');
    assert.equal(await item.inputValue(),'01');
    for(const family of ['ISO','ES']){
      await page.evaluate(f=>KeySuiteApp.showPage(f==='ISO'?'selectorIso':'selectorEs'),family);
      const frame=page.frameLocator(family==='ISO'?'#selectorIsoFrame':'#selectorEsFrame');
      await frame.locator('#flow').fill(family==='ISO'?'1000':'90');
      if(family==='ISO')await frame.locator('#flowUnit').selectOption('usgpm');
      await frame.locator('#head').fill(family==='ISO'?'55':'90');
      await frame.locator('#run').click();
      await frame.locator('body').evaluate(()=>new Promise(resolve=>setTimeout(resolve,400)));
      const popupPromise=page.waitForEvent('popup').catch(()=>null);
      const openerDownload=page.waitForEvent('download',{timeout:15000}).catch(()=>null);
      await frame.locator('#keysuiteMobileExport').evaluate(button=>button.onclick());
      const popup=await popupPromise;
      assert(popup,'Selection did not open a report popup');
      const download=await Promise.race([popup.waitForEvent('download',{timeout:15000}),openerDownload]);
      assert(download,JSON.stringify(await popup.evaluate(()=>({
        injected:!!document.querySelector('#ks50035PdfDownload'),config:window.__KEYSUITE_DOWNLOAD_CONFIG__,
        print:String(window.print).slice(0,120),images:[...document.images].map(i=>[i.src.slice(0,100),i.naturalWidth]),
        markup:document.documentElement.outerHTML.slice(0,1200),state:document.readyState,
        vendors:[typeof html2canvas,typeof jspdf],opener:!!window.opener,origin:window.origin
      }))));
      assert.match(download.suggestedFilename(),new RegExp('^Item 01 - '+family));
      if(family==='ISO')assert.match(download.suggestedFilename(),/1000 US GPM @ 55 Mtr/);
      await download.saveAs(path.join(output,`001-${family}-technical.pdf`));
      await popup.close();
      await page.evaluate(()=>KeySuiteApp.showPage('dashboard'));
      assert.equal(await item.inputValue(),'02');
      if(family==='ISO'){
        await item.fill('1');
        await item.press('Tab');
        assert.equal(await item.inputValue(),'01');
      }
    }
    const sequence = await page.evaluate(async () => {
      const api=KeySuitePumpPdfNames;
      api.setNext(5);
      const name=api.nextFromPayload({model:'ISO 150-125-400'}),ticket=api.ticket(name);
      api.setNext(1);
      api.commit(name,ticket);
      const afterStale=api.nextFromPayload({model:'ISO 150-125-400'});
      const fresh=api.ticket(afterStale);
      api.commit(afterStale,fresh);
      api.commit(afterStale,fresh);
      const afterDuplicate=api.nextFromPayload({model:'ISO 150-125-400'});
      const product=api.productFromPayload({model:'ISO 150-125-400'},new Date(2026,10,8));
      const failedReport={document:{images:[],createElement:()=>({}),head:{appendChild(){}},querySelectorAll:()=>[],body:{querySelectorAll:()=>[]}},alert(){}};
      const failedName=api.nextFromPayload({model:'ISO 150-125-400'});
      let failure='';
      try{await KeySuitePumpPdfDownload.download(failedReport,{filename:failedName,itemTicket:api.ticket(failedName)});}
      catch(error){failure=error.message;}
      const fakeSource={open:()=>null,alert(){}};
      KeySuitePumpPdfDownload.openSelectionReport(fakeSource,'<html><head></head><body></body></html>');
      const afterFailureAndCancel=api.nextFromPayload({model:'ISO 150-125-400'});
      api.reset();
      return {afterStale,afterDuplicate,product,failure,afterFailureAndCancel,afterReset:api.nextFromPayload({model:'ISO 150-125-400'})};
    });
    assert.match(sequence.afterStale,/^Item 01/);
    assert.match(sequence.afterDuplicate,/^Item 02/);
    assert.equal(sequence.product,'261108 - ISO 150-125-400.pdf');
    assert.match(sequence.failure,/Report pages are unavailable/);
    assert.match(sequence.afterFailureAndCancel,/^Item 02/);
    assert.match(sequence.afterReset,/^Item 01/);
    console.log('PASS Coupling numeric sorting and selection retention, four quotation rows and totals, 11 shaft groups and all six materials, zero/blank saves, two real numbered downloads, stale/duplicate counters, Product naming and reset.');
  } finally {
    await browser.close();
  }
}

run().catch(error=>{console.error(error);process.exitCode=1;});
