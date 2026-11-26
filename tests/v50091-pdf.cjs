const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const output=process.env.KEYSUITE_TEST_OUTPUT;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KEYSUITE_CHROMIUM});
 try{
 const page=await browser.newPage({viewport:{width:1400,height:900},serviceWorkers:'block'});
 page.on('pageerror',e=>console.error('PAGE',e.message));
 await page.route('**/*',route=>{
   const u=new URL(route.request().url()),file=path.join(root,u.pathname);
   if(u.hostname!=='keysuite.test')return route.abort();
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/src="(?:https?:)?\/\/[^"]+"/g,'')});
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({path:file}):route.abort();
 });
 await page.goto('https://keysuite.test/');
 await page.evaluate(asset=>{window.KEYSUITE_VERSION='5.00.91';window.KEYLARGO_LOGO_DATA=asset;window.KEYSUITE_ACCESS={email:'test@example.invalid',role:'owner',company_id:'isolated',quotation_prefix:'QA'};window.KEYSUITE_PROFILE={...window.KEYSUITE_ACCESS,display_name:'Test',signatory_name:'Test'};window.KEYSUITE_SECURE_DATA={categories:[],users:[]};},'data:image/png;base64,'+fs.readFileSync(path.join(root,'keylargo-logo.png')).toString('base64'));
 for(const file of ['permissions.js','payment-terms.js','commercial-identity.js','app.js','quotation-templates.js'])await page.addScriptTag({url:'/'.concat(file)});
 const report=await page.evaluate(async()=>{
   localStorage.setItem('ks_v218_quotation_templates_isolated',JSON.stringify([{id:'tesk-fixture',company_id:'isolated',template_name:'TESK',template_scope:'company',status:'active',settings:{companyName:'TESK Pump',priceColumns:'amount-only'}}]));
   await KeySuiteTemplates.init(KEYSUITE_ACCESS);
   setQuoteNoValue('QA-2611-0090');
   const description=[
    'B.G.Reich Vertical Multistage Pump Model: CHC 32-3',
    'c/w\t7.5HP 2Pole IE2 Motor (415V / 3Ph / 50Hz)',
    'Suction & Discharge: DN65 x DN65',
    'Material: SS304 (Cast Iron Connection) / Mechanical Seal',
    'c/w\tKeyPLC Control Panel (Indoor Type)',
    '\t\tPump Controller & HMI Touch Screen @ 1 Lot',
    '\t\t5.5kW VFD @ 2 nos & Pressure Transmitter @ 1 no',
    '\t\tWiring for pumps & pressure transmitter within pump skid @ 1 Lot',
    'c/w\tBaseplate in mild steel, GI manifold 4" inlet & 4" outlet',
    '\t\tIsolation valves on the suction and discharge ports of each pump',
    '\t\tCheck valve on the discharge port of each pump',
    '\t\t1 pressure gauge on the discharge manifold',
    'c/w\t100 litres (10 bar) non-jkkp approved tank @ 1 unit'
   ].join('\n');
   const entries=[];
   for(const template of ['tesk-fixture','standard:isolated'])for(const header of [false,true])for(const capacity of [false,true]){
    KeySuiteTemplates.selectForCustomer(template,{applyDefaults:false});
    setQuoteItems([{model:'New System',description,qty:1,unitPrice:23790,unit:'set',displayHeader:header,itemHeader:'WWO',displayCapacity:capacity,capacityValue:'30',headValue:'30',pricingSource:{product_family:'ASSEMBLY',source_kind:'SYSTEM'}}]);
    buildPrintQuotation();
    const root=document.getElementById('printQuotationDocument');
    entries.push({template,company:root.querySelector('#pTemplateCompanyName').textContent,header,capacity,count:root.querySelectorAll('.print-page').length,text:root.querySelector('.print-item-desc').textContent,
     dateInCompany:!!root.querySelector('.print-company #pDate'),metaBelowTitle:!!root.querySelector('#pDocTitle + .print-meta'),
     footer:root.querySelector('footer').textContent,closingAfter:!!root.querySelector('table + .print-terms + .print-closing')});
   }
   return entries;
 });
 for(const r of report){
  assert(r.count<=2,JSON.stringify(r));assert.equal(r.text.startsWith('WWO\n'),r.header);
  assert(r.dateInCompany&&r.metaBelowTitle);
  assert.equal((r.text.match(/Capacity:/g)||[]).length,Number(r.capacity));
  assert.equal(r.closingAfter,true);
  assert(r.company.includes(r.template==='tesk-fixture'?'TESK':'Keylargo'));assert.equal(r.text.includes('\n\n'),false);
 }
 console.log('PASS original letterhead structure, four Header/Capacity combinations per template, terms and signature after totals');
 await page.evaluate(()=>document.body.classList.add('print-complete'));await page.emulateMedia({media:'print'});
 if(output)await page.pdf({path:path.join(output,'quote-system.pdf'),preferCSSPageSize:true});
 const onePage=await page.evaluate(()=>{
   localStorage.setItem('ks_v218_quotation_templates_isolated',JSON.stringify([{id:'short',company_id:'isolated',template_name:'Short TESK',template_scope:'company',status:'active',settings:{companyName:'TESK Pump',showSignature:false}}]));
   return KeySuiteTemplates.init(KEYSUITE_ACCESS).then(()=>{
   KeySuiteTemplates.selectForCustomer('short',{applyDefaults:false});
   setQuoteItems([{model:'Short Manual',manualItem:true,qty:1,description:'Small part',unitPrice:120}]);
   buildPrintQuotation();
   const root=document.querySelector('#printQuotationDocument');
   return {count:root.querySelectorAll('.print-page').length,ordered:!!root.querySelector('table + .print-terms + .print-closing')};
   });
 });
 assert.deepEqual(onePage,{count:1,ordered:true});
 if(output)await page.pdf({path:path.join(output,'quote-single.pdf'),preferCSSPageSize:true});
 const multi=await page.evaluate(()=>{
   KeySuiteTemplates.selectForCustomer('standard:isolated',{applyDefaults:false});
   const line='c/w  7.5HP 2Pole IE3 Motor (415V / 3Ph / 50Hz) Model: ES 3BM7.5-2';
   const items=Array.from({length:19},(_,i)=>({manualItem:true,model:'Pump '+i,description:'Pump Model: ES 40-16\n'+line+'\nSuction x Discharge: DN65 x DN40',qty:1,unit:'unit',unitPrice:100+i,displayHeader:true,itemHeader:'Header '+i}));
   setQuoteItems(items);
   buildPrintQuotation();
   const root=document.getElementById('printQuotationDocument');
   const numbers=[...root.querySelectorAll('.print-quote-line')].map(row=>row.firstElementChild.textContent).filter(Boolean);
   return {numbers,pages:[...root.querySelectorAll('.print-page')].map(p=>({footer:p.querySelector('footer').textContent,closing:!!p.querySelector('.print-closing'),tableEnd:p.querySelector('table')?.getBoundingClientRect().bottom,footerTop:p.querySelector('footer').getBoundingClientRect().top})),desc:root.querySelector('.print-item-desc').textContent,line};
 });
 assert.equal(multi.numbers.length,19);
 assert(multi.pages.length>1);
 assert(multi.pages.every((p,i)=>p.footer.includes(`Page ${i+1} of ${multi.pages.length}`)&&p.closing===(i===multi.pages.length-1)&&(p.tableEnd??0)<p.footerTop),JSON.stringify(multi));
 assert(multi.desc.includes(multi.line));
 if(output)await page.pdf({path:path.join(output,'quote-multi.pdf'),preferCSSPageSize:true});
 if(output){
   const pdf=await page.evaluate(async()=>{
     const root=document.querySelector('#printQuotationDocument');
     root.querySelectorAll('img:not([data-template-logo])').forEach(img=>{img.src=KEYLARGO_LOGO_DATA});
     const blob=await quotationPdfBlob(root,quotationPrintCss(),()=>{});
     return new Promise((resolve,reject)=>{
       const reader=new FileReader();
       reader.onload=()=>resolve(String(reader.result).split(',')[1]);
       reader.onerror=reject;
       reader.readAsDataURL(blob);
     });
   });
   fs.writeFileSync(path.join(output,'quote-app-export.pdf'),Buffer.from(pdf,'base64'));
 }
 console.log('PASS multipage numbering, all quantities retained, closing on the final page');
 const wrapping=await page.evaluate(()=>{
   const first='Wide first line '.repeat(9)+'ending';
   const second='Available width on subsequent lines '.repeat(3).trim();
   const item={model:'ES 40-16',description:first+'\n'+second,qty:1,unit:'set',unitPrice:26970,displayCapacity:false};
   setQuoteItems([{...item,pricingSource:{product_family:'ASSEMBLY',source_kind:'PUMPSET_DIRECT_ES'}},{...item,pricingSource:{product_family:'ASSEMBLY',source_kind:'PUMPSET'}}]);
   const assembly=document.querySelectorAll('.quote-item')[1];
   assembly.querySelector('.duplicate-quote-item').click();
   assembly.querySelector('.copy-quote-item').click();
   pasteQuoteItem();
   quoteItemRow({...item,manualItem:true});
   buildPrintQuotation();
   const rows=[...document.querySelectorAll('tr[data-print-index]')];
   function bounds(node,start,end){
     const range=document.createRange();range.setStart(node,start);range.setEnd(node,end);return range.getBoundingClientRect();
   }
   return rows.map(row=>{
     const amounts=row.querySelector('.print-item-amounts').getBoundingClientRect();
     const node=row.querySelector('.print-item-desc').firstChild;
     const top=bounds(node,0,1),bottom=bounds(node,node.length-1,node.length);
     const onFirstLine=[];
     for(let i=0;i<node.length;i++){const box=bounds(node,i,i+1);if(Math.abs(box.top-top.top)<1)onFirstLine.push(box.right);}
     return {count:rows.length,firstRight:Math.max(...onFirstLine),amountLeft:amounts.left,lastRight:bottom.right,text:node.data};
   });
 });
 assert.equal(wrapping.length,5);
 assert(wrapping.every(r=>r.firstRight<r.amountLeft&&r.lastRight>r.amountLeft&&r.text.endsWith('subsequent lines')),JSON.stringify(wrapping));
 console.log('PASS first-line amount clearance and full-width continuation for Curve/Assembly-shaped rows, Clone, Copy/Paste and Manual');
 const long=await page.evaluate(()=>{
   const description=Array.from({length:110},(_,i)=>`Description line ${i+1}`).join('\n');
   setQuoteItems([{model:'Long item',manualItem:true,description,qty:1,unitPrice:100}]);
   buildPrintQuotation();
   const root=document.querySelector('#printQuotationDocument');
   return {text:[...root.querySelectorAll('.print-item-desc')].map(node=>node.textContent).join('\n'),amounts:root.querySelectorAll('.print-item-amounts').length};
 });
 assert.equal(long.amounts,1);
 assert.equal((long.text.match(/Description line /g)||[]).length,110);
 assert(long.text.includes('Description line 110'));
 console.log('PASS oversized multi-page description retains all 110 lines and one price');
 await page.emulateMedia({media:'screen'});
 await page.addScriptTag({url:'/stock-source-v50088.js'});
 await page.addScriptTag({url:'/costing-audit-v50032.js'});
 await page.addScriptTag({url:'/keystock-v100.js'});
 const interfaceChecks=await page.evaluate(async()=>{
   document.body.classList.remove('print-complete','auth-locked');
   for(const el of document.querySelectorAll('#appView,.app,main,#keyStock')){
     el.classList.remove('hidden');el.style.setProperty('display','block','important');
   }
   KeySuiteStockCost.notice('Exact stock unavailable.');
   const warning=document.getElementById('stockCostNotice');
   const sizedWarning=warning.getBoundingClientRect().height<60&&warning.getBoundingClientRect().width>120;
   window.dispatchEvent(new CustomEvent('KEYSUITE_PAGE_CHANGED',{detail:{page:'pumpset'}}));
   const clearedWarning=warning.getBoundingClientRect().height===0;
   KeySuitePermissions.can=()=>true;
   await KeySuiteCostingAudit.open({model:'ES 32-13',pricingSource:{product_family:'ES',source_currency:'STOCK',source_price:90,base_myr:90,currency_multiplier:1,calculated_price:120}},'Test costing');
   const audit=[...document.querySelectorAll('#costingAuditBody table')].map(table=>[...table.rows].map(row=>[...row.cells].map(cell=>getComputedStyle(cell).textAlign)));
   document.getElementById('costingAuditDialog').close();
   const permissions=Object.fromEntries(['receive_stock','manage_stock_dropdowns','adjust_stock','move_stock','confirm_stock_out','reserve_stock'].map(k=>[k,true]));
   const fixture={permissions:{},config_version:'v104',catalog:[],items:[],groups:[],options:[],mappings:[],configurations:[],series_mappings:[],locations:[],suppliers:[],opening_balances:[],critical_quantities:[],ledger_permissions:permissions,ledger:{events:[],positions:[],lots:[],reservations:[],serial_policy:[]}};
   window.KeySuiteAuth={getClient:()=>({rpc:async()=>({data:fixture})})};
   await KeyStock.refresh();
   document.querySelector('[data-tab="movement"]').click();
   document.getElementById('stockMovementTime').open=true;
   document.getElementById('stockMovementFormPanel').open=true;
   const actions=[...document.querySelector('#stockMovementAction').options].map(option=>option.value);
   const measurements=actions.map(action=>{
     const selector=document.getElementById('stockMovementAction');
     selector.value=action;selector.dispatchEvent(new Event('change'));document.getElementById('stockMovementFormPanel').open=true;
     const coords=el=>{const b=el.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right)];};
     const fields=[...document.querySelectorAll('#stockMovementFormPanel label select,#stockMovementFormPanel label input,#stockMovementFormPanel label textarea')].map(coords);
     const time=coords(document.querySelector('#stockMovementTime select'));
     const button=coords(document.querySelector('#stockMovementForm button'));
     return {action,fields,time,button};
   });
   return {sizedWarning,clearedWarning,audit,measurements};
 });
 assert(interfaceChecks.sizedWarning&&interfaceChecks.clearedWarning);
 assert(interfaceChecks.audit.length>=2);
 assert(interfaceChecks.audit.every(rows=>rows.every(cells=>cells[0]==='left'&&cells.slice(1).every(value=>value==='right'))));
 assert(interfaceChecks.measurements.length>=5);
 assert(interfaceChecks.measurements.every(({fields,time,button})=>fields.length>3&&fields[0][0]>0&&fields.every(([left,right])=>left===time[0]&&right===time[1])&&button[0]===time[0]),JSON.stringify(interfaceChecks.measurements));
 console.log('PASS warning geometry and navigation cleanup, Costing Audit alignments, and actual Movement fields and save alignment');


 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
