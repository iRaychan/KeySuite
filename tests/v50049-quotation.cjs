'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8282';
const windowsChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext({serviceWorkers:'block',userAgent:windowsChrome});
    await context.route('**/*', route => new URL(route.request().url()).origin===base ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base+'/index.html');
    await page.evaluate(() => {
      const email='qa@example.invalid';
      window.KEYSUITE_ACCESS={email,role:'owner',company_id:'qa-company'};
      window.KEYSUITE_PROFILE={email,display_name:'QA',quotation_prefix:'RC'};
      document.body.classList.remove('auth-locked');
      document.querySelector('.app').style.setProperty('display','grid','important');
      const customer={id:crypto.randomUUID(),companyId:'qa-company',company:'KeySuite QA',terms:'30',pricingCategoryId:'qa-category',contacts:[]};
      const remote=new Map();
      window.KeySuiteAuth.getClient=()=>({rpc:async (name,args)=>{
        if(name==='keysuite_save_quotation_v50037'){
          const quote=structuredClone(args.p_quotation);
          remote.set(quote.id,quote);
          return {data:{status:'saved',saved:quote},error:null};
        }
        if(name==='keysuite_list_quotations_v42919')return {data:[...remote.values()],error:null};
        return {data:null,error:null};
      }});
      window.KeySuiteAuth.ensureActiveSession=async()=>{};
      window.KeySuiteQuotationReferences.registerUsed=async()=>{};
      quotationSyncMode='supabase';
      quotationReferenceAllocated=true;
      store.set('ks_customers',[customer]);
      refreshCustomers();
      applyQuotationCustomerSelection(customer.id,{refreshPrices:false});
      $('qDate').value='2026-11-07';
      setQuoteNoValue('RC-2611-0049');
      setQuoteItems([
        {model:'ES 32-20',description:'B.G.Reich End Suction Pump Model: ES 32-20',qty:1,unitPrice:1480,
          brands:['B.G.Reich'],productFamily:'ES',
          pricingSource:{product_family:'ES',base_myr:100,margin:.2,fixed_price:true,calculated_price:1480}},
        {model:'Manual item',description:'Legacy description',qty:2,unit:'box',brand:'Original OEM',
          unitPrice:100,manualItem:true,manualCapacity:'10 m³/hr @ 50 m'},
        {model:'Special order',description:'Alternate duty',qty:1,unitPrice:50,manualItem:true,manualCapacity:'Dual speed / see curve'}
      ]);
      showPage('quotation');
      updateQuotationStateUi();
      setAllItemsCollapsed(false);
    });
    const rows=page.locator('.quote-item');
    const manual=rows.nth(1), capacity=manual.locator('.item-capacity-value');
    const toggle=manual.locator('.item-display-capacity');
    assert.equal(await rows.first().locator('.quote-item-brands,.v391-row-brand-chip').count(),0);
    assert.match(await rows.first().locator('.item-description').inputValue(),/^B\.G\.Reich/);
    assert.deepEqual(await rows.first().locator('.quote-capacity-row').evaluate(e=>[...e.children].map(c=>c.className)),
      await manual.locator('.quote-capacity-row').evaluate(e=>[...e.children].map(c=>c.className)));
    assert.equal(await capacity.inputValue(),'10');
    assert.equal(await manual.locator('.item-head-value').inputValue(),'50');
    assert.equal(await manual.locator('.item-unit').inputValue(),'box');
    assert.match(await rows.nth(2).locator('.quote-capacity-row').textContent(),/Dual speed/);
    assert.equal(await page.evaluate(()=>quotePrintDescription(getQuoteItems()[1])),'Capacity: 10 m³/hr @ 50 m\nLegacy description');
    await toggle.uncheck();
    assert.equal(await capacity.isDisabled(),true);
    await page.evaluate(()=>updateQuotationStateUi());
    assert.equal(await capacity.isDisabled(),true);
    assert.equal(await page.evaluate(()=>quotePrintDescription(getQuoteItems()[1])),'Legacy description');
    await toggle.check();
    await manual.locator('.item-capacity-unit').selectOption('L/s');
    await manual.locator('.item-head-unit').selectOption('bar');
    assert.equal(await capacity.inputValue(),'2.7778');
    assert.equal(await manual.locator('.item-head-value').inputValue(),'4.9033');
    await manual.locator('.item-custom-header').fill('Optional title');
    await manual.locator('.item-display-header').check();
    await page.evaluate(async () => {
      if(!await saveQuote({silent:true}))throw Error('Mock save failed');
      loadQuote(currentQuote().id);
      setAllItemsCollapsed(false);
    });
    const saved=await page.evaluate(()=>getQuoteItems()[1]);
    assert.deepEqual([saved.brand,saved.description,saved.unit,saved.qty,saved.unitPrice,saved.displayHeader,saved.itemHeader],
      ['Original OEM','Legacy description','box',2,100,true,'Optional title']);
    assert.equal(saved.capacityUnit,'L/s');
    assert.equal(saved.headUnit,'bar');
    assert.equal(await page.evaluate(()=>getQuoteItems()[2].manualCapacity),'Dual speed / see curve');
    await manual.locator('.duplicate-quote-item').click();
    assert.equal(await page.evaluate(()=>getQuoteItems()[2].manualCapacity),saved.manualCapacity);
    await page.evaluate(()=>setAllItemsCollapsed(false));
    await rows.nth(2).locator('.item-display-header').uncheck();
    assert.equal(await page.evaluate(()=>getQuoteItems()[2].displayHeader),false);
    await page.locator('#addQuoteItem').click();
    assert.equal(await rows.last().locator('.item-capacity-value').isDisabled(),true);
    await rows.last().locator('.item-display-capacity').check();
    assert.equal(await rows.last().locator('.item-head-value').isEnabled(),true);
    const printRoutes=await page.evaluate(async () => {
      let prints=0;
      window.print=()=>{prints++};
      quotationStatus='sealed';
      await printCompleteQuotation({historySnapshot:true});
      await new Promise(resolve=>setTimeout(resolve,200));
      return [prints,!!$('macQuotationPdfPreview')];
    });
    assert.deepEqual(printRoutes,[1,false]);
    await page.evaluate(async () => {
      loadQuote(currentQuote().id);
      await sealQuotation();
      if(!isQuotationSealed())throw Error('Fixture did not seal');
      window.qaSealedId=currentQuote().id;
      await openHistoryQuotationPdfModal(window.qaSealedId);
    });
    const printButton=page.locator('[data-pdf-print]');
    await printButton.waitFor();
    await page.waitForFunction(()=>!document.querySelector('[data-pdf-print]').disabled);
    const keyhqFrame=page.frameLocator('#keyhqPdfModal iframe');
    assert.match(await keyhqFrame.locator('#printQuotationDocument').textContent(),/Legacy description/);
    await keyhqFrame.locator('body').evaluate(el=>{el.ownerDocument.defaultView.print=()=>el.dataset.printCalled='yes'});
    await printButton.click();
    assert.equal(await keyhqFrame.locator('body').getAttribute('data-print-called'),'yes');
    await page.locator('[data-pdf-close]').click();
    await page.evaluate(async () => {
      await reviseQuotation();
      const item=getQuoteItems()[1];
      if(!isRevisionCopy()||item.brand!=='Original OEM'||item.capacityUnit!=='L/s'||item.headUnit!=='bar')throw Error('Manual capacity lost in revision');
      loadQuote(window.qaSealedId);
      Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15'});
      window.print=()=>{window.qaNativePrint=(window.qaNativePrint||0)+1};
      await printCompleteQuotation({historySnapshot:true});
    });
    await page.waitForFunction(()=>window.qaNativePrint===1);
    assert.equal(await page.locator('#macQuotationPdfPreview').count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS manual items, save/reopen, clone/revision, and native Print for KeyHQ and both quotation browser routes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
