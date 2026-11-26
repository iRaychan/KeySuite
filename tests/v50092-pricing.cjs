const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const load=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');

(async()=>{
 const dom=new JSDOM(load('index.html'),{url:'https://keysuite.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 try{
  const customer={id:'fixture',company:'Fixture',distanceKm:100,pricingCategoryId:'special'};
  const category={id:'special',productRules:{
   MOTOR:{currencies:['RMB'],margin:.08,normal:.08,transport:50},
   ES:{currencies:['USD']},ISO:{currencies:['USD']},BASEPLATE:{currencies:['MYR']},COUPLING:{currencies:['RMB']}
  }};
  const product={id:'motor-75',model:'3BM7.5-2',hp:7.5,pole:2,efficiencyClass:'IE3',priceRmb:750};
  const data={categories:[category],motorProducts:[product],productMultipliers:{MOTOR:{RMB:.8338}},
   fuel_efficiency:1,fuel_price:.4873,fuel_base_price:0,return_journey:false,
   customerPricingRows:[{customerId:customer.id,setDiscount:.08,commission:.08,finalDiscount:.08}]};
  const quotes=[],alerts=[];
  w.KEYSUITE_SECURE_DATA=data;
  w.KeySuiteV391={customerBrandMargin:(_,id)=>({reich:.1,ok:.05,megaflow:0,supplier:.02})[id]??0,defaultPricingBrand:family=>family==='ES'?'reich':''};
  w.KeySuiteApp={getCustomers:()=>[customer],getPricingCustomerId:()=>customer.id,getPricingCustomer:()=>customer,showPage:()=>{},
   selectCustomerForQuotation:async()=>true,addExternalQuoteItem:item=>(quotes.push(item),item)};
  w.KeySuitePermissions={can:()=>true};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.alert=message=>alerts.push(message);
  for(const file of ['product-family-registry-v50047.js','component-prices-v50011.js','pricing.js','motor.js','commercial-identity.js','assembly.js','costing-audit-v50032.js'])w.eval(load(file));
  const pricing=w.KeySuitePricing;
  pricing.init(data,{role:'owner'});
  w.KeySuiteMotor.init(data,{role:'owner'});
  const captured=(section,family,model,before,currency,raw,ratio)=>({
   id:section,section,model,qty:1,unitPrice:Math.ceil((before+48.73)/10)*10,
   pricingSource:{product_family:family,product_id:section,brand_margin:family==='ES'?.1:0,base_myr:family==='ES'?821.205:before,
    source_currency:currency,source_price:raw,currency_multiplier:ratio,
    fuel_charge:48.73,unrounded_price:before*(1-.08)**2+48.73,calculated_price:Math.ceil((before+48.73)/10)*10}
  });
  const pump=captured('pump','ES','ES 40-16',24801.27,'USD',149.31,5.5);
  pump.pricingSource.v391_brand_id='reich';
  pump.commercialIdentity={brandId:'reich',brand:'B.G.Reich',model:pump.model};
  const motor={id:'motor',section:'motor',model:product.model,qty:1,unitPrice:990,
   pricingSource:{product_family:'MOTOR',product_id:product.id,v391_brand_id:'supplier'}};
  const other=[captured('baseplate','BASEPLATE','ES Baseplate Frame 75',778.87,'MYR',560.5,1),captured('coupling','COUPLING','F60',281.33,'RMB',215.34,.818)];
  const bom=[pump,motor,...other];
  const price=rows=>pricing.priceAssemblyRowsForDisplay(rows,{customer,category});
  const round=n=>Number(n.toFixed(2));
  const direct=price(bom),fromAssembly=price([pump,{...motor,model:'ES 3BM7.5-2'},...other]);
  for(const result of [direct,fromAssembly]){
   assert.equal(result.total,26970,result.error);
   assert.deepEqual(Array.from(result.fuelComparison.details,r=>r.lineTotal),[24820,1050,800,300]);
   assert.equal(round(result.rows.motor.unitBeforeFuel),1028.98);
   assert.equal(round(result.rows.motor.fuelSharePerUnit),12.18);
   const source=result.source.assembly_items.find(x=>x.id==='motor').pricingSource;
   assert.equal(source.product_id,product.id);
   assert.equal(source.v391_brand_id,'supplier');
   assert.equal(source.pricing_brand_id,'reich');
   assert.equal(round(source.base_myr),625.35);
   assert.equal(round(source.after_brand_margin_price-source.base_myr),69.48);
   assert.equal(source.brand_margin,.1);
  }
  const old=price([{...motor,pricingSource:{...motor.pricingSource,v391_brand_id:''}}]);
  assert.equal(round(old.rows.motor.unitBeforeFuel),931.99);
  assert.equal(pricing.repriceAssemblyLeaf(motor,'quotation',{customer,category}).calc.brandMargin,.02);
  const pair=(id,brand,family='ISO')=>[
   {...pump,id:id+'-pump',commercialIdentity:{brandId:brand},pricingSource:{...pump.pricingSource,v391_brand_id:brand,product_family:family,brand_margin:({reich:.1,ok:.05})[brand]??0}},
   {...motor,id:id+'-motor'}
  ];
  const group=(id,items)=>({id,model:id,qty:2,section:'pumpset',pricingSource:{product_family:'MANUAL',assembly_items:items}});
  const mixed=price([group('reich',pair('a','reich')),group('megaflow',pair('b','megaflow')),group('ok',pair('c','ok')),group('no-brand',pair('d',''))]);
  assert(!mixed.error,mixed.error);
  const motors=mixed.source.assembly_items.filter(x=>x.pricingSource.product_family==='MOTOR');
  assert.deepEqual(Array.from(motors,x=>x.pricingSource.brand_margin),[.1,0,.05,0]);
  assert(motors.every(x=>x.qty===2&&x.pricingSource.v391_brand_id==='supplier'));
  assert.deepEqual(Array.from(motors,x=>round(x.pricingSource.after_brand_margin_price)),[694.83,625.35,658.26,625.35]);
  w.KeySuiteV391.customerBrandMargin=(_,id)=>id==='ok'?.08:0;
  const changed=pair('c','ok');
  changed[0].pricingSource.brand_margin=.08;
  assert.equal(price(changed).source.assembly_items[1].pricingSource.brand_margin,.08);
  w.KeySuiteV391.customerBrandMargin=(_,id)=>id==='reich'?.1:id==='supplier'?.02:0;
  assert(await w.KeySuiteAssembly.quotePumpsetSelection(bom,{model:'ES 40-16'}),alerts.join('\n'));
  for(const item of [pump,{...motor,model:'ES 3BM7.5-2'},...other])assert(await w.KeySuiteAssembly.addItem(item,{type:'pumpset',section:item.section}),alerts.join('\n'));
  await w.KeySuiteAssembly.toQuotation();
  assert.deepEqual(quotes.map(q=>q.unitPrice),[26970,26970],alerts.join('\n'));
  const draft=w.KeySuiteAssembly.getCurrentDraft(),audit=w.KeySuiteAssembly.auditBomPricing(draft);
  await w.KeySuiteCostingAudit.open({...draft,quote_unit_price:26970},'Fixture',audit);
  const body=d.querySelector('#costingAuditBody');
  assert.equal(body.lastElementChild.className,'fuel-charge-comparison');
  assert.equal(body.querySelectorAll('.fuel-charge-comparison').length,1);
  assert.match(body.lastElementChild.textContent,/Difference:\s*RM 0\.00/);
  assert.match(body.textContent,/Brand Margin \(10%\)/);
  console.log('PASS two quote handoffs at RM26,970, live motor stages, mixed pumpsets, dynamic margin, zero/No Brand, standalone identity and audit reconciliation');
 }finally{d.body.replaceChildren();await new Promise(resolve=>setTimeout(resolve,0));w.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
