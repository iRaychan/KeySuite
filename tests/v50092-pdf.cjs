const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),output=process.env.KEYSUITE_TEST_OUTPUT;

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KEYSUITE_CHROMIUM});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:950},serviceWorkers:'block'});
  await page.route('**/*',route=>{
   const u=new URL(route.request().url()),file=path.join(root,u.pathname);
   if(u.hostname!=='keysuite.test')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')});
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file}):route.abort();
  });
  await page.goto('https://keysuite.test/');
  await page.evaluate(asset=>{
   window.KEYLARGO_LOGO_DATA=asset;
   window.KEYSUITE_ACCESS={email:'test@example.invalid',role:'owner',company_id:'isolated',quotation_prefix:'QA'};
   window.KEYSUITE_PROFILE={...KEYSUITE_ACCESS,display_name:'Test Signatory',signatory_name:'Test Signatory'};
   window.KEYSUITE_SECURE_DATA={categories:[],users:[]};
  },'data:image/png;base64,'+fs.readFileSync(path.join(root,'keylargo-logo.png')).toString('base64'));
  for(const file of ['permissions.js','payment-terms.js','commercial-identity.js','app.js','quotation-templates.js','costing-audit-v50032.js'])await page.addScriptTag({url:'/'+file});
  await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=250;canvas.height=100;
   const label=canvas.getContext('2d');label.font='42px serif';label.fillText('TESK TEST',12,65);
   const logoData=canvas.toDataURL();
   localStorage.setItem('ks_v218_quotation_templates_isolated',JSON.stringify([{id:'tesk-fixture',company_id:'isolated',template_name:'TESK test fixture',template_scope:'company',status:'active',settings:{logoData,companyName:'TESK Pump (test fixture)',registration:'',address:'Test address',phone:'',fax:'',email:'',priceColumns:'amount-only'}}]));
   await KeySuiteTemplates.init(KEYSUITE_ACCESS);
   setQuoteNoValue('QA-2611-0092');
   document.getElementById('qPrintedCompany').value='Example Customer';
   document.getElementById('qDate').value='2026-11-26';
  });
  for(const [template,key] of [['standard:isolated','Keylargo'],['tesk-fixture','TESK']]){
   for(const [name,count,pages] of [['short',1,2],['mixed',5,2],['long',27,null]]){
    const result=await page.evaluate(({template,count})=>{
     KeySuiteTemplates.selectForCustomer(template,{applyDefaults:true});
     const description='Wide first line '.repeat(9)+'ending\n'+'Available text width on subsequent lines '.repeat(3).trim();
     const types=['SYSTEM','PUMPSET','PUMPSET_DIRECT_ES','ASSEMBLY','MANUAL'];
     setQuoteItems(Array.from({length:count},(_,i)=>({
      model:'Test Item '+(i+1),qty:1,unit:'set',unitPrice:100+i,description,
      manualItem:i%5===4,displayHeader:(i%4&2)>0,itemHeader:'Header '+(i+1),
      displayCapacity:(i%4&1)>0,capacityValue:'30',headValue:'30',
      pricingSource:{product_family:types[i%5]==='MANUAL'?'MANUAL':'ASSEMBLY',source_kind:types[i%5]}
     })));
     buildPrintQuotation();
     const pages=[...document.querySelectorAll('#printQuotationDocument .print-page')];
     return {count:pages.length,coverText:pages[0].textContent,coverTable:!!pages[0].querySelector('table'),
      schedule:pages.slice(1).map(p=>({text:p.textContent,items:p.querySelectorAll('.print-quote-line').length,first:p.querySelector('tbody tr td')?.textContent,totals:!!p.querySelector('.grand')})),
      descriptions:[...pages[1].querySelectorAll('.print-item-desc')].map(n=>n.textContent)};
    },{template,count});
    assert.equal(result.coverTable,false);
    for(const expected of ['We like to thank you','Delivery','Term','Validity','Price Basis','Your sincerely','Page 1 of'])assert(result.coverText.includes(expected),expected);
    assert.equal(result.schedule[0].first,'1');
    assert(result.schedule.every((p,i)=>p.items>0&&p.totals===(i===result.schedule.length-1)&&!p.text.includes('Your sincerely')));
    if(pages)assert.equal(result.count,pages);else assert(result.count>2);
    if(name==='mixed')for(let i=0;i<4;i++){
     assert.equal(result.descriptions[i].includes('Header '+(i+1)),(i&2)>0);
     assert.equal(result.descriptions[i].includes('Capacity:'),(i&1)>0);
    }
    if(output&&((key==='Keylargo'&&name!=='short')||(key==='TESK'&&name==='short'))){
     const base64=await page.evaluate(async()=>{
      const root=document.querySelector('#printQuotationDocument');
      root.querySelectorAll('img:not([data-template-logo])').forEach(img=>{if(img.id!=='pSignatureImage')img.src=KEYLARGO_LOGO_DATA});
      await Promise.all([...root.querySelectorAll('img[src]')].map(img=>img.decode()));
      const coverLogo=root.querySelector('#pTemplateLogo');
      if([...root.querySelectorAll('.print-items-logo')].some(img=>img.src!==coverLogo.src))throw Error('Schedule logo differs from cover logo');
      const blob=await quotationPdfBlob(root,quotationPrintCss(),()=>{});
      return new Promise((resolve,reject)=>{
       const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);
      });
     });
     fs.writeFileSync(path.join(output,`V5.00.92-${key}-${name}.pdf`),Buffer.from(base64,'base64'));
    }
   }
  }
  const button=await page.evaluate(async()=>{
   KeySuitePermissions.can=()=>true;
   const list=document.getElementById('quoteItems');
   const row=quoteItemRow({model:'Test Cost',qty:1,unitPrice:100,pricingSource:{fuel_comparison:{details:[]},assembly_items:[]}});
   const body=row.querySelector('.item-body-actions');
   document.body.append(body);
   KeySuiteCostingAudit.enhance();
   row.append(body);
   document.body.append(row);row.classList.remove('collapsed');
   KeySuiteCostingAudit.enhance();
   const buttons=[...body.querySelectorAll('button')];
   const dimensions=b=>[b.getBoundingClientRect().width,b.getBoundingClientRect().height,getComputedStyle(b).fontSize,getComputedStyle(b).borderRadius];
   return {labels:buttons.map(b=>b.textContent),cost:dimensions(buttons[0]),del:dimensions(buttons.at(-1))};
  });
  assert.deepEqual(button.labels,['Cost','Clone','Copy','Remarks','Delete']);
  assert.deepEqual(button.cost,button.del);
  assert(button.cost[0]>0&&button.cost[1]>0);
  console.log('PASS six PDF layouts, both template paths, all Header/Capacity combinations, identical Cost and Delete sizing');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
