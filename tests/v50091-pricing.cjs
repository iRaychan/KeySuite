const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const load=file=>fs.readFileSync(path.join(root,file),'utf8');

(async()=>{
 const dom=new JSDOM(load('index.html'),{url:'https://keysuite.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 try{
  const customer={id:'captured',company:'Fixture',distanceKm:100,pricingCategoryId:'special'};
  const captures=[
   ['pump','ES','ES 40-16',24801.27,149.31,5.5,'USD'],
   ['baseplate','BASEPLATE','ES Baseplate Frame 75',778.87,560.5,1,'MYR'],
   ['motor','MOTOR','ES 3BM7.5-2',931.99,750,.8338,'RMB'],
   ['coupling','COUPLING','F60',281.33,215.34,.818,'RMB']
  ];
  const category={id:'special',productRules:Object.fromEntries(captures.map(([,family,,,,,currency])=>
   [family,{currencies:[currency],useFuelCharge:true,useSetDiscount:true}]))};
  const data={categories:[category],fuel_efficiency:1,fuel_price:.4873,fuel_base_price:0,return_journey:false,customerPricingRows:[{customerId:customer.id,setDiscount:.08}]};
  const quoteRows=[],alerts=[];
  w.KEYSUITE_SECURE_DATA=data;
  w.KeySuiteApp={getCustomers:()=>[customer],getPricingCustomerId:()=>customer.id,getPricingCustomer:()=>customer,showPage:()=>{},
   selectCustomerForQuotation:async()=>true,addExternalQuoteItem:item=>(quoteRows.push(item),item)};
  w.KeySuitePermissions={can:()=>true};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.alert=message=>alerts.push(message);
  for(const file of ['product-family-registry-v50047.js','component-prices-v50011.js','pricing.js','commercial-identity.js','assembly.js','costing-audit-v50032.js'])w.eval(load(file));
  w.KeySuitePricing.init(data,{role:'owner'});
  const items=captures.map(([section,family,model,before,raw,ratio,currency])=>({
   id:section,section,model,qty:1,description:section==='pump'?'End Suction Pump Model: ES 40-16':'',
   unitPrice:Math.ceil((before+48.73)/10)*10,
   pricingSource:{product_family:family,product_id:section,source_currency:currency,source_price:raw,currency_multiplier:ratio,
    base_myr:raw*ratio,fuel_charge:48.73,unrounded_price:before+48.73,calculated_price:Math.ceil((before+48.73)/10)*10}
  }));
  const price=rows=>w.KeySuitePricing.priceAssemblyRowsForDisplay(rows,{customer,category});
  const full=price(items);
  assert.equal(full.total,26870);
  assert.equal(full.fuelComparison.nonShared.final,27010);
  for(const [key,shared,nonShared] of [['before',26793.46,26793.46],['after',26842.19,26988.38],['rounding',27.81,21.62],['fuel',48.73,194.92]]){
   assert.equal(full.fuelComparison.shared[key].toFixed(2),shared.toFixed(2));
   assert.equal(full.fuelComparison.nonShared[key].toFixed(2),nonShared.toFixed(2));
  }
  assert.equal(full.fuelComparison.sharedPerLine.toFixed(4),'12.1825');
  const qty=price([{...items[0],qty:3},...items.slice(1),{...items[0],id:'zero',qty:0}]).fuelComparison;
  assert.equal(qty.eligibleCount,4);
  assert.equal((qty.details[0].fuelSharePerUnit*3).toFixed(4),'12.1825');
  assert.equal(qty.nonShared.fuel.toFixed(2),'292.38');
  category.productRules.MOTOR.useFuelCharge=false;
  const mixed=price(items).fuelComparison;
  assert.equal(mixed.eligibleCount,3);
  assert.equal(mixed.details.find(row=>row.id==='motor').fuelShare,0);
  for(const rule of Object.values(category.productRules))rule.useFuelCharge=false;
  const noFuel=price(items).fuelComparison;
  assert.equal(noFuel.configured,0);
  assert.equal(noFuel.shared.final,noFuel.nonShared.final);
  for(const rule of Object.values(category.productRules))rule.useFuelCharge=true;
  assert.equal(price( items.map(item=>({...item,qty:0})) ).total,0);
  const individual=w.KeySuitePricing.repriceAssemblyLeaf(items[0],'quotation',{customer,category}).calc;
  assert.equal(individual.includeSetDiscount,true);
  assert.equal(individual.fuelCharge.toFixed(2),'48.73');
  assert(await w.KeySuiteAssembly.quotePumpsetSelection(items,{model:'ES 40-16',qty:1}));
  for(const item of items)assert(await w.KeySuiteAssembly.addItem(item,{type:'pumpset',section:item.section}));
  await w.KeySuiteAssembly.toQuotation();
  assert.deepEqual(quoteRows.map(x=>x.unitPrice),[26870,26870]);
  assert.equal(quoteRows[0].description,quoteRows[1].description);
  assert.deepEqual(alerts,[]);
  const draft=w.KeySuiteAssembly.getCurrentDraft();
  const authoritative=w.KeySuitePricing.priceAssemblyRowsForDisplay;
  w.KeySuitePricing.priceAssemblyRowsForDisplay=()=>({error:'Fixture calculation unavailable'});
  assert.equal(await w.KeySuiteAssembly.quotePumpsetSelection(items,{model:'ES 40-16',qty:1}),false);
  await w.KeySuiteAssembly.toQuotation();
  assert.equal(quoteRows.length,2);
  assert.equal(alerts.filter(message=>message.includes('Quotation pricing is unavailable')).length,2);
  w.KeySuitePricing.priceAssemblyRowsForDisplay=authoritative;
  const bom=w.KeySuiteAssembly.auditBomPricing(draft);
  await w.KeySuiteCostingAudit.open({...draft,quote_unit_price:quoteRows[1].unitPrice},'Fixture',bom);
  const compare=d.querySelector('.fuel-charge-comparison');
  assert.match(compare.textContent,/26,870\.00/);
  assert.match(compare.textContent,/27,010\.00/);
  assert.match(compare.textContent,/Difference:\s*RM 0\.00/);
  assert.equal(compare.previousElementSibling.querySelector('table').rows.length,5);
  const row=d.createElement('div');
  row.className='quote-item';
  row.dataset.pricingSource=JSON.stringify(quoteRows[0].pricingSource);
  row.innerHTML='<input class="item-model" value="ES 40-16"><input class="item-price" value="26870"><button class="remark-quote-item">Remarks</button>';
  d.body.append(row);
  w.KeySuiteCostingAudit.enhance();
  dom.window.document.querySelector('.quote-bom-cost').click();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(d.querySelector('.fuel-charge-comparison').textContent,/Difference:\s*RM 0\.00/);
  console.log('PASS captured ES BOM through direct and builder handoffs, shared RM26,870, hypothetical RM27,010, audit difference RM0');
  console.log('PASS multi-quantity, zero quantity, mixed eligibility, disabled fuel, preserved Individual set discount');
  console.log('PASS both complete Pumpset handoffs reject an unavailable calculation without quoting displayed prices');
 }finally{d.body.replaceChildren();await new Promise(resolve=>setTimeout(resolve,0));dom.window.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
