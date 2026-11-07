'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8270';
const output = process.env.KEYSUITE_TEST_OUTPUT || '/tmp';

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1300,height:900},serviceWorkers:'block'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base
      ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type()==='error'&&message.text().startsWith('Error')) console.error(message.text()); });
    page.on('dialog', dialog => dialog.accept());
    await page.goto(base + '/index.html', {waitUntil:'load'});
    await page.waitForFunction(() => window.KeySuiteV391 && window.KeySuiteApp);
    await page.evaluate(() => {
      const email = 'qa@example.invalid';
      window.KEYSUITE_ACCESS = {email,role:'owner',company_id:'qa-company'};
      window.KEYSUITE_PROFILE = {email,display_name:'QA',quotation_prefix:'RC'};
      document.body.classList.remove('auth-locked');
      document.querySelector('.app').style.setProperty('display','grid','important');
      const customer = {
        id:crypto.randomUUID(),companyId:'qa-company',company:'Apex Unipart KL Sdn Bhd',
        quotationAssignedSaveName:'Apex (KL)',terms:'30',pricingCategoryId:'qa-category',
        contacts:[{prefix:'Mr.',name:'David Michael Beckham',quotationAssignedName:'Mr. Beckham',email,otherField:42},
          {prefix:'Ms.',name:'Jane Fullname',quotationAssignedName:'Jane'}]
      };
      const check = (ok,message) => { if(!ok) throw Error(message); };
      store.set('ks_customers',[customer]);
      refreshCustomers();
      editCustomer(customer.id);
      check($('quotationAssignedSaveName').value==='Apex (KL)','customer alias loads');
      check(getContacts()[0].otherField===42 && getContacts()[1].quotationAssignedName==='Jane','contact aliases preserve existing fields');
      check(normalizeCustomerRecord(remoteCustomerPayload(customer)).quotationAssignedSaveName==='Apex (KL)','customer remote mapping');
      check(quotationContactName({prefix:'Mr.',name:'Full Name'})==='Mr. Full Name','contact full-name fallback');
      const remote = new Map();
      window.KeySuiteAuth.getClient = () => ({rpc: async (name,args) => {
        if(name==='keysuite_save_quotation_v50037'){
          const item=structuredClone(args.p_quotation);remote.set(item.id,item);
          return {data:{status:'saved',saved:item},error:null};
        }
        if(name==='keysuite_list_quotations_v42919')return {data:[...remote.values()],error:null};
        return {data:null,error:null};
      }});
      window.KeySuiteAuth.ensureActiveSession = async () => {};
      window.KeySuiteQuotationReferences.registerUsed = async () => {};
      quotationSyncMode='supabase';
      quotationReferenceAllocated=true;
      $('qDate').value='2026-11-07';
      setQuoteNoValue('RC-2611-0012');
      applyQuotationCustomerSelection(customer.id,{refreshPrices:false});
      $('qContact').value='1';$('qContact').dispatchEvent(new Event('change'));
      check($('qPrintedContact').value==='Ms. Jane','second contact alias');
      $('qContact').value='0';$('qContact').dispatchEvent(new Event('change'));
      check($('qPrintedContact').value==='Mr. Beckham','prefix de-duplicated');
      const api=window.KeySuiteV391;
      api.state.brands=[{id:'bgr',brand_name:'B.G.Reich',brand_key:'b.g.reich',brand_type:'master',active:true},
        {id:'mf',brand_name:'Megaflow',brand_type:'oem',active:true},
        {id:'ok',brand_name:'O.K. Pump',brand_type:'oem',active:true},
        {id:'none',brand_name:'-',brand_type:'oem',active:true}];
      for(const [id,model,expected] of [['mf','BSV 80G10-2T','Megaflow '],['bgr','BSV 100G30-2T','B.G.Reich '],
        ['ok','BSV 65G20-2T','O.K. Pump '],['none','CHC 10-4','']]){
        api.state.selectedBrandId=id;
        const row=KeySuiteApp.addExternalQuoteItem({model,description:'B.G.Reich Submersible Pump Model: '+model+'\nc/w test motor\nDischarge: G3',
          unitPrice:id==='none'?1930:770,productFamily:id==='none'?'CHC':'BSV',
          pricingSource:{product_family:id==='none'?'CHC':'BSV',base_myr:100,margin:.2,fixed_price:true,calculated_price:id==='none'?1930:770}});
        check(row.querySelector('.item-description').value.startsWith(expected+'Submersible Pump Model:'),'generated brand '+id);
      }
      setAllItemsCollapsed(false);
      showPage('quotation');
    });
    const rows = page.locator('.quote-item');
    const last = rows.nth(3);
    const price = last.locator('.item-price');
    const description = last.locator('.item-description');
    const original = await description.inputValue();
    const status = async value => assert.match(await last.getAttribute('class'),new RegExp('status-'+value));
    await status('complete');
    await last.locator('.item-qty').fill('5'); await status('complete');
    await price.fill('1931'); await status('warning');
    await price.fill('1930'); await status('complete');
    await price.fill('0'); await status('error');
    await price.fill('1931'); await status('warning');
    await description.fill('Manually supplied model\n  Keep indentation');
    await price.fill('1930'); await status('warning');
    await description.fill(original); await status('complete');
    await last.locator('.item-custom-header').fill('Block B - Car Park');
    await last.locator('.item-display-header').check(); await status('complete');
    await rows.first().locator('.item-description').fill('Custom Megaflow line\n  Original manual indentation');
    await page.evaluate(() => {
      document.querySelectorAll('.quote-item')[1].dataset.internalRemark='Synthetic remark';
      syncItemRemarkUi(document.querySelectorAll('.quote-item')[1]);
      setAllItemsCollapsed(true);
    });
    for (const width of [1300,890]) {
      await page.setViewportSize({width,height:900});
      const columns = await page.locator('.quote-item-head').evaluateAll(headers => headers.map(h =>
        [...h.children].slice(2).map(cell=>Math.round(cell.getBoundingClientRect().left))));
      for (const row of columns) assert.deepEqual(row,columns[0]);
    }
    await page.setViewportSize({width:1300,height:900});
    await rows.first().locator('.drag-handle').dragTo(rows.nth(1),{targetPosition:{x:30,y:32}});
    assert.match(await rows.first().locator('.item-summary-model').innerText(),/100G30/);
    await page.locator('#quoteSst').fill('6');
    await page.locator('#quoteDiscountMode').selectOption('RM');
    await page.locator('#quoteDiscount').fill('10');
    assert.equal(await page.locator('#quoteDiscountAmount').textContent(),'− RM 10.00');
    await page.locator('#quoteDiscountMode').selectOption('%');
    assert.equal(await page.locator('#quoteDiscountAmount').textContent(),'− RM 1,196.00');
    await page.locator('#quoteDiscountMode').selectOption('RM');
    await page.evaluate(() => {
      const r=document.querySelectorAll('.quote-item')[3],source={product_family:'CHC',margin:.2};
      r.dataset.pricingSource=JSON.stringify(source);
      if(!quotationPricingSourceError(r).startsWith('Pump price not found:'))throw Error('missing-price safeguard');
    });
    await last.locator('.collapse-item').click();
    await price.fill('1931');
    assert.equal(await last.evaluate(row=>quotationPricingSourceError(row)),'');
    await page.evaluate(async () => {
      if(!await saveQuote({silent:true}))throw Error('mock secure save failed');
      const saved=currentQuote();
      loadQuote(saved.id);
      const r=document.querySelectorAll('.quote-item')[3],item=getQuoteItems()[3];
      if(item.originalQuotationItem.unitPrice!==1930||item.unitPrice!==1931||item.itemHeader!=='Block B - Car Park')throw Error('saved snapshot');
      if(quotationPricingSourceError(r))throw Error('override lost on reopen');
      await sealQuotation();
      if(!isQuotationSealed())throw Error('valid override did not seal');
      if($('quoteDiscountMode').value!=='RM'||$('quoteDiscount').value!=='10')throw Error('adjustment roundtrip');
      window.print=()=>{};
      await printCompleteQuotation();
      if(document.title!=='Apex (KL) - 261107 - 0012.pdf')throw Error('print filename '+document.title);
      if($('pDear').textContent!=='Dear Mr. Beckham,')throw Error('salutation');
      if($('pItemPages').querySelector('.print-item-model')||$('pItemPages').textContent.includes('Brand:'))throw Error('duplicate model/brand');
      const header=$('pItemPages').querySelector('.print-item-desc strong');
      if(header?.textContent!=='Block B - Car Park'||!header.nextSibling?.textContent.startsWith('\nSubmersible'))throw Error('heading spacing');
      if(!$('pItemPages').textContent.includes('Custom Megaflow line\n  Original manual indentation'))throw Error('manual text changed');
      if(quotationPdfFilename('Apex:  (PG). Ltd','2026-11-06','RC-2611-0012-R3')!=='Apex-  (PG). Ltd - 261106 - 0012-R3.pdf')throw Error('revision filename');
      document.body.classList.add('print-complete');
    });
    await page.evaluate(() => document.querySelector('.app').style.removeProperty('display'));
    await page.pdf({path:path.join(output,'keysuite-v50048-quotation.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true});
    await page.evaluate(() => {
      window.print=()=>{window.qaHistoryPrintTitle=document.title;};
      openHistoryQuotationPdf(currentQuote().id);
    });
    await page.waitForFunction(() => window.qaHistoryPrintTitle==='Apex (KL) - 261107 - 0012.pdf');
    await page.evaluate(async () => { await openHistoryQuotationPdfModal(currentQuote().id); });
    const downloadPromise=page.waitForEvent('download',{timeout:10000});
    await page.locator('[data-pdf-download]').click();
    const download=await downloadPromise.catch(async error=>{
      throw Error(await page.locator('.keyhq-pdf-status').textContent(),{cause:error});
    });
    assert.equal(download.suggestedFilename(),'Apex (KL) - 261107 - 0012.pdf');
    await download.saveAs(path.join(output,'keysuite-v50048-history.pdf'));
    await page.locator('[data-pdf-close]').click();
    await page.evaluate(async () => {
      await reviseQuotation();
      if(!isRevisionCopy()||isQuotationSealed()||getQuoteItems()[3].itemHeader!=='Block B - Car Park')throw Error('revision copy');
      const r=document.querySelectorAll('.quote-item')[3];
      r.querySelector('.duplicate-quote-item').click();
      if(getQuoteItems()[4].originalQuotationItem.unitPrice!==1930||getQuoteItems()[4].itemHeader!=='Block B - Car Park')throw Error('clone persistence');
      if(quotationPdfFilename(quotationExportCompany(),$('qDate').value,$('quoteNo').value)!=='Apex (KL) - 261107 - 0012-R1.pdf')throw Error('revision export identity');
    });
    assert.deepEqual(errors,[]);
    console.log('PASS Chrome quotation workflow, drag/order, adjustment persistence, manual price seal, PDF export, history download, clone and revision');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
