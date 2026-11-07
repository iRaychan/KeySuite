'use strict';
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8290';
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
      setQuoteItems([{model:'Older quote line',qty:1,unitPrice:50,description:'Legacy without a unit',
        pricingSource:{product_family:'ES',base_myr:40,margin:.2,fixed_price:true,calculated_price:50}}]);
      const common={qty:1,unitPrice:100,pricingSource:{product_family:'ES',base_myr:75,margin:.2,fixed_price:true,calculated_price:100}};
      KeySuiteApp.addExternalQuoteItem({...common,model:'Product pump',description:'Product handoff',unit:'Nos'});
      KeySuiteApp.addExternalQuoteItem({...common,model:'Selection pump',description:'Selection handoff'});
      KeySuiteApp.addExternalQuoteItem({model:'New System',description:'System handoff',qty:2,unitPrice:13510,unit:'set',
        pricingSource:{product_family:'ASSEMBLY',source_kind:'SYSTEM',pricing_mode:'carried_final',carried_final_price:true,calculated_price:13510}});
      showPage('quotation');
      updateQuotationStateUi();
    });
    await page.locator('#addQuoteItem').click();
    await page.evaluate(()=>setAllItemsCollapsed(false));
    const rows=page.locator('.quote-item');
    const units=page.locator('.item-unit');
    assert.deepEqual(await units.evaluateAll(inputs=>inputs.map(input=>input.value)),['unit','Nos','unit','set','unit']);
    for(const width of [1300,1500]){
      await page.setViewportSize({width,height:900});
      const rowsGeometry=await page.locator('.quote-item-grid').evaluateAll(grids=>grids.map(grid=>{
        const input=[...grid.querySelectorAll('input')];
        const [model,qty,unit,price]=input.map(e=>e.getBoundingClientRect());
        const originalGap=parseFloat(getComputedStyle(grid).columnGap);
        const originalMiddle=grid.children[1].getBoundingClientRect();
        return {order:input.map(e=>e.className),outerWidth:[model.width,price.width],
          sameRow:[qty,unit,price].every(r=>Math.abs(r.top-model.top)<1&&Math.abs(r.height-model.height)<1),
          equalSplit:Math.abs(qty.width-unit.width)<1&&Math.abs(qty.width+unit.width+originalGap-originalMiddle.width)<1,
          threeColumns:grid.children.length===3};
      }));
      for(const geometry of rowsGeometry){
        assert.deepEqual(geometry.order,['item-model','item-qty','item-unit','item-price']);
        assert.ok(geometry.sameRow&&geometry.equalSplit&&geometry.threeColumns);
        assert.deepEqual(geometry.outerWidth,rowsGeometry[0].outerWidth);
      }
    }
    await units.nth(1).fill('set');
    await units.nth(2).fill('Nos');
    await units.nth(3).fill('Skids & <kits>');
    await units.nth(4).fill('Supply lot');
    const system=rows.nth(3),manual=rows.nth(4);
    assert.equal(await system.locator('.item-summary-qty').innerText(),'Qty: 2 Skids & <kits>');
    await manual.locator('.item-price').fill('125.50');
    await manual.locator('.item-qty').fill('3');
    await manual.locator('.item-description').fill('Custom description retained');
    assert.equal(await units.nth(4).inputValue(),'Supply lot');
    assert.equal(await manual.locator('.item-total').innerText(),'RM 376.50');
    await page.evaluate(async ()=>{
      if(!await saveQuote({silent:true}))throw Error('Mock save failed');
      loadQuote(currentQuote().id);
      setAllItemsCollapsed(false);
      buildPrintQuotation();
    });
    assert.deepEqual(await units.evaluateAll(inputs=>inputs.map(input=>input.value)),['unit','set','Nos','Skids & <kits>','Supply lot']);
    assert.equal(await page.locator('.print-system-item-head td:nth-child(3)').textContent(),'2 Skids & <kits>');
    assert.equal(await page.locator('.print-system-item-head').count(),1);
    assert.match(await page.locator('#pItemPages').textContent(),/3 Supply lot/);
    assert.match(await page.locator('#pItemPages').textContent(),/1 Set/);
    await page.evaluate(()=>document.querySelector('.app').style.removeProperty('display'));
    await page.evaluate(()=>document.body.classList.add('print-complete'));
    await page.pdf({path:process.env.KEYSUITE_TEST_PDF||'/tmp/keysuite-v50050-units.pdf',format:'A4',preferCSSPageSize:true,printBackground:true});
    await page.evaluate(async ()=>{
      document.body.classList.remove('print-complete');
      document.querySelector('.app').style.setProperty('display','grid','important');
      await sealQuotation();
      if(!isQuotationSealed())throw Error('Fixture did not seal');
      await reviseQuotation();
      if(!isRevisionCopy())throw Error('Fixture did not revise');
      setAllItemsCollapsed(false);
    });
    assert.equal(await units.nth(3).inputValue(),'Skids & <kits>');
    assert.equal(await units.nth(4).inputValue(),'Supply lot');
    await rows.nth(3).locator('.duplicate-quote-item').click();
    assert.equal(await units.nth(4).inputValue(),'Skids & <kits>');
    assert.equal(await page.evaluate(()=>getQuoteItems()[4].printAsSet),true);
    assert.deepEqual(errors,[]);
    console.log('PASS four aligned fields, prefills, legacy defaults, totals, save/reopen, PDF labels and row format, revision and clone');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
