const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../build_v50077');
const fixture = `<script>
addEventListener('DOMContentLoaded',()=>{
 const controls=document.createElement('div');
 controls.style='position:fixed;right:8px;bottom:64px;z-index:9999;background:white';
 document.body.append(controls);
 const testButton=(label,onclick)=>{const b=document.createElement('button');b.textContent=label;b.onclick=onclick;controls.append(b);return b};
 const result=document.createElement('output');controls.append(result);
 const access={email:'review@example.invalid',role:'owner',company_id:'review',quotation_prefix:'QA'};
 const id='review', customer={id,company:'Keylargo (isolated)',companyId:id,pricingCategoryId:'cat',contacts:[],distanceKm:50};
 const productRules={};
 for(const [family,transport,currencies,normal,trimming] of [
   ['CHC_G1',0,['MYR','RMB'],.08,0],['ES',50,['USD','MYR'],.08,19950],['MOTOR',50,['RMB'],.08,0],
   ['BASEPLATE',50,['MYR'],.08,0],['COUPLING',30,['RMB'],.08,0]
 ])productRules[family]={margin:.08,normal,rare:.08,transport,trimming,currencies};
 const cat={id:'cat',name:'Review',productRules};
 const pump={id:'chc',model:'CHC 10-4',hp:2,kw:1.5,pricesByCurrency:{RMB:{CHC:1508},MYR:{CHC:1150}},rarityByCurrency:{RMB:{CHC:'many'},MYR:{CHC:'many'}}};
 const es={id:'es',model:'ES 40-16',rarity:'many',variants:[{material:'CI / SS / SS / MS',priceUsd:149.31,priceMyr:751.78}]};
 const motor={id:'motor',model:'3BM7.5-2',hp:7.5,pole:2,efficiencyClass:'IE3',rarity:'common',priceRmb:750};
 const data={categories:[cat],chcG1Products:[pump],esProducts:[es],motorProducts:[motor],
  customerPricingRows:[{customerId:id,commission:.08,setDiscount:.08,finalDiscount:.08}],
  fuel_price:5.07,fuel_base_price:2,fuel_efficiency:6.3,
  productMultipliers:{CHC_G1:{RMB:.8668},ES:{USD:5.5},MOTOR:{RMB:.8338},COUPLING:{RMB:.818}}};
 function start(){
  window.KEYSUITE_ACCESS=access;window.KEYSUITE_PROFILE=access;window.KEYSUITE_SECURE_DATA=data;
  window.KeySuiteAuth.getClient=()=>null;
  if(window.KeySuitePermissions)window.KeySuitePermissions.can=()=>true;
  window.KeySuiteAuthority={scopeEnforced:()=>false,isBrandSeriesAllowed:()=>true};
  window.KeySuiteV40001CustomerBrandSettings={isPriceAllowed:()=>true};
  document.body.classList.remove('auth-locked');
  document.getElementById('loginView').classList.add('hidden');document.getElementById('loadingView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');
  document.querySelector('.app').style.setProperty('display','grid','important');
  store.set('ks_customers',[customer]);refreshCustomers();document.getElementById('qCustomer').value=id;
  Object.assign(window.KeySuiteApp,{getPricingCustomer:()=>customer,getPricingCustomerId:()=>id,ensureQuotationPricingContext:()=>true});
  const api=window.KeySuiteV391;
  api.state.brands=[{id:'bg',brand_name:'B.G.Reich',brand_key:'b.g.reich',brand_type:'master',active:true},{id:'ok',brand_name:'O.K. Pump',brand_key:'o.k. pump',brand_type:'oem',active:true},{id:'oem',brand_name:'-',brand_key:'oem',brand_type:'oem',active:true}];
  api.state.mappings=[{brand_id:'bg',master_family:'CHC_G1',master_series:'CHC',selling_series:'CHC',active:true},{brand_id:'ok',master_family:'CHC_G1',master_series:'CHC',selling_series:'VMS',active:true},{brand_id:'oem',master_family:'ES',master_series:'ES',selling_series:'ES',active:true}];
  api.state.customerMargins=new Map([[id+'::bg',.10],[id+'::ok',0],[id+'::oem',0]]);
  Object.assign(api.state.general,{fuelPrice:5.07,fuelBasePrice:2,fuelEfficiency:6.3,returnJourney:true});
  window.KeySuiteComponents.loadForTest([{family:'CHC',kind:'oring',size_group:'8_20',material:'Viton',price_myr:0}]);
  window.KeySuitePricing.init(data,access);window.KeySuiteMotor.init(data,access);
  for(const b of controls.querySelectorAll('button'))b.disabled=false;
  openC4('ok');
 }
 function openC4(brand){
  const api=window.KeySuiteV391;api.setSelectedBrand(brand,'CHC','productChc','CHC_G1');
  window.KeySuiteProduct.setChcGeneration('G1');
  showPage('productChc');api.decorateProductDisplay();
  document.getElementById('productModelInput').value='10-4';
  const series=[...document.querySelectorAll('[data-product-series]')].find(b=>/10$/.test(b.dataset.productSeries));
  series?.click();api.decorateProductDisplay();
 }
 function openEs(brand){
  const api=window.KeySuiteV391;api.setSelectedBrand(brand,'ES','productEs','ES');showPage('productEs');
 }
 function verifyEngine(){
  const p=window.KeySuitePricing,b=window.KeySuiteV391;
  const brand=(id,group)=>b.brandContext(id,group==='CHC_G1'?'CHC':'ES','',group);
  const calc=(source,mode)=>p.applyAssemblyBrandMargin(p.repriceSource(source,mode,{customer,category:cat}),source,customer)?.calc;
  const asComponent=(id,name,family,price,currency,rarity)=>{
   const calc=p.calculateManual(price,currency,rarity,cat,family,{customer,pricingMode:'assembly'});
   return {id,model:name,qty:1,pricingSource:p.sourceSnapshot({product:{id,model:name},calc,customer,category:cat,family})};
  };
  const baseplate=asComponent('plate','ES Baseplate Frame 75','BASEPLATE',560.5,'MYR','many');
  const coupling=asComponent('coupling','F60','COUPLING',215.34,'RMB','common');
  const render=(items)=>{
   const a=p.priceAssemblyRowsForDisplay(items,{customer,category:cat});
   if(a.error)throw Error(a.error);
   const individual=p.flattenAssemblyItems(items,1,[],true).map(i=>calc(i.pricingSource,'quotation'));
   return {a,individual:individual.map(x=>x?.finalPrice??null)};
  };
  const chc=['ok','bg'].map(id=>{
   const item=p.buildChcAssemblyItem('CHC 10-4',{customer,category:cat,generation_code:'G1',sellingBrand:brand(id,'CHC_G1')});
   if(!item)throw Error('Missing CHC source');
   const sameFuel=[{id:'pump',...item,qty:2},...['panel','manifold','tank'].map(id=>({id,qty:1,unitPrice:300,pricingSource:{product_family:'MANUAL'}}))];
   const rows=p.priceAssemblyRowsForDisplay(sameFuel,{customer});
   return [item.unitPrice,calc(item.pricingSource,'quotation')?.finalPrice,rows.rows?.pump?.unitPrice,rows.fuelSharePerBom,rows.error||''];
  });
  const sets=['oem','bg'].map(id=>{
   const src={...p.sourceSnapshot(p.findEsPrice('es','CI / SS / SS / MS',{customer,category:cat,pricingMode:'assembly'})),...p.assemblySellingBrand(brand(id,'ES'),'ES')};
   const items=[{id:'pump',model:'ES 40-16',qty:1,pricingSource:src},baseplate,{id:'motor',model:motor.model,qty:1,pricingSource:p.sourceSnapshot(window.KeySuiteMotor.findPrice('motor',{customer,category:cat,pricingMode:'assembly'}))},coupling];
   const {a,individual}=render(items);
   const margins=p.flattenAssemblyItems(items,1,[],true).map(x=>calc(x.pricingSource,'assembly')?.brandMargin||0);
   return {margins,lines:Object.values(a.rows).map(x=>x.unitPrice),total:a.total,individual};
  });
  const expected=JSON.stringify([[1730,1880,1690],[1920,2080,1880]]);
  if(JSON.stringify(chc.map(x=>x.slice(0,3)))!==expected)throw Error('Unexpected C4 costs '+JSON.stringify(chc));
  if(JSON.stringify(sets.map(x=>x.margins))!==JSON.stringify([[0,0,0,0],[.1,0,.1,0]]))throw Error('Unexpected ES margins '+JSON.stringify(sets));
  if(sets[0].lines[1]!==sets[1].lines[1]||sets[0].lines[3]!==sets[1].lines[3])throw Error('Accessories changed');
  result.textContent='Pricing check passed '+JSON.stringify({chc,sets});
 }
 testButton('Start isolated V5.00.77 review',start);
 for(const [label,fn] of [['VMS C4',()=>openC4('ok')],['CHC C4',()=>openC4('bg')],['OEM ES',()=>openEs('oem')],['B.G.Reich ES',()=>openEs('bg')],['Add 3BM7.5-2',()=>window.KeySuiteMotor.addProduct(motor,'assembly')],['Run pricing check',()=>{try{verifyEngine()}catch(e){result.textContent=e.message;console.error(e)}}]])testButton(label,fn).disabled=true;
});
</script>`;
http.createServer((req,res)=>{
 const name = new URL(req.url,'http://localhost').pathname;
 const file = path.resolve(root, '.' + (name==='/'?'/index.html':name));
 if (!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end();return;}
 res.setHeader('Content-Security-Policy',"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; worker-src 'none'");
 res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
 if(name==='/'){res.end(fs.readFileSync(file,'utf8').replace('</body>',fixture+'</body>'));return;}
 fs.createReadStream(file).pipe(res);
}).listen(8777,'127.0.0.1');

