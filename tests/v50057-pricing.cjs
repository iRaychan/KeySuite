const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:8358';
const material = 'CI / SS / SS / MS';
const models = {
  ES: ['32-13','65-26','80-40','200-32'],
  ISO: ['50-32-160','80-50-250','100-65-315S','150-125-400','125-100-500','300-250-400','350-300-400']
};

async function run() {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(base+'/index.html');
    await page.waitForFunction(() => window.KeySuiteISO && window.KeySuiteCostingAudit);
    const report = await page.evaluate(async ({models,material}) => {
      const customer = {id:'review',pricingCategoryId:'review-usd',company:'Local review'};
      const rule = {margin:.1,normal:0,rare:0,trimming:0,transport:0,currencies:['USD']};
      const category = {id:'review-usd',productRules:{ISO:rule,ES:rule}};
      const other = {id:'review-myr',productRules:{ISO:{...rule,currencies:['MYR']},ES:{...rule,currencies:['MYR']}}};
      const esProducts = models.ES.map(model => ({id:'es-es-'+model,model:'ES '+model,variants:[{material,priceUsd:1000}]}));
      const getClient = KeySuiteAuth.getClient;
      KeySuiteAuth.getClient = () => null;
      KeySuiteApp.getPricingCustomer = () => customer;
      KeySuitePermissions.can = () => true;
      window.KEYSUITE_SECURE_DATA = {...window.KEYSUITE_SECURE_DATA,categories:[category,other]};
      KeySuitePricing.init({categories:[category,other],esProducts},{role:'owner'});
      const C = KeySuiteComponents;
      // Distinct fixture rates by family, shaft group and material expose misrouting.
      const rows = C.defaults.map(row => ({...row,price_myr:row.material==='NBR'?null:
        row.material==='Tungsten'?0:row.material==='Car/Cer'||row.material==='Viton'?99:
        (row.family==='ISO'?100:200)+Number(row.size_group)+(row.kind==='seal'?10:20)}));
      C.loadForTest(rows);
      const results = [];
      for(const [family,list] of Object.entries(models)){
        for(const model of list){
          const id=family==='ISO'?'iso-'+model.toLowerCase():'es-es-'+model;
          const find=family==='ISO'?KeySuiteISO.findPrice:KeySuitePricing.findEsPrice;
          const options={customer,category,keysuite_seal:'Silicon Carbide',keysuite_elastomer:'EPDM'};
          const standard=find(id,material,{customer,category});
          const priced=find(id,material,options);
          const item=KeySuiteCostingAudit.selectionItem({product:family,model:family+' '+model,keysuite_material:material,
            es_product_id:family==='ES'?id:undefined,iso_product_id:family==='ISO'?id:undefined,...options});
          const source=item.pricingSource;
          const assembly=KeySuitePricing.repriceSource(source,'assembly',{customer,category});
          const individual=KeySuitePricing.repriceSource(source,'quotation',{customer,category});
          const blank=find(id,material,{...options,keysuite_elastomer:'NBR'});
          const zero=find(id,material,{...options,keysuite_seal:'Tungsten',keysuite_elastomer:'Viton'});
          results.push({family,model,shaft:C.shaftSize(family,model),addon:priced?.calc.componentAddon,
            base:standard?.calc.componentAddon,delta:priced?.calc.finalPrice-standard?.calc.finalPrice,
            unroundedDelta:priced?.calc.unroundedPrice-standard?.calc.unroundedPrice,
            seal:source.seal_material,elastomer:source.elastomer,assembly:assembly?.calc.componentAddon,individual:individual?.calc.componentAddon,
            blank:KeySuitePricing.quoteBlockReason(blank?.calc),zero:zero?.calc.componentAddon});
        }
      }
      const isoModel = 'ISO 150-125-400';
      const show = async elastomer => {
        const item=KeySuiteCostingAudit.selectionItem({product:'ISO',model:isoModel,keysuite_material:material,keysuite_seal:'Silicon Carbide',keysuite_elastomer:elastomer});
        await KeySuiteCostingAudit.open(item);
        const dialog=document.querySelector('#costingAuditDialog'),text=dialog.textContent;
        dialog.close();
        return text;
      };
      const trail=await show('EPDM'),missing=await show('NBR');
      const otherCategory=KeySuiteISO.findPrice(isoModel,material,{customer,category:other,keysuite_seal:'Silicon Carbide'});
      const quoteItems=[];
      const ensure=KeySuiteApp.ensureQuotationPricingContext,add=KeySuiteApp.addExternalQuoteItem;
      KeySuiteApp.ensureQuotationPricingContext=()=>true;
      KeySuiteApp.addExternalQuoteItem=item=>{quoteItems.push(item);return null;};
      for(const [seal,elastomer] of [['Carbon Ceramic','Viton'],['Silicon Carbide','EPDM']]){
        await KeySuiteISO.route({model:isoModel,keysuite_material:material,keysuite_seal_type:'Mechanical Seal',
          keysuite_seal:seal,keysuite_elastomer:elastomer,keysuite_bare_shaft:true,raw_flow_text:''});
      }
      KeySuiteApp.ensureQuotationPricingContext=ensure;
      KeySuiteApp.addExternalQuoteItem=add;
      KeySuiteAuth.getClient = () => ({from:()=>({select:async()=>({error:Error('fixture unavailable')})})});
      await C.init();
      const failure=C.additions('ISO',isoModel,{seal:'Silicon Carbide'}).error;
      KeySuiteAuth.getClient = getClient;
      return {results,trail,missing,failure,otherCategory:!!otherCategory,quoteItems};
    },{models,material});
    assert.deepEqual(report.results.map(x=>Number(x.shaft)),[24,32,42,48,24,32,37,42,48,65,75]);
    for(const x of report.results){
      const amount = 2*((x.family==='ISO'?100:200)+Number(x.shaft))+30;
      for(const v of [x.addon,x.delta,x.assembly,x.individual]) assert.equal(v,amount,JSON.stringify(x));
      assert(Math.abs(x.unroundedDelta-amount)<1e-8,JSON.stringify(x));
      assert.equal(x.seal,'Silicon Carbide');
      assert.equal(x.elastomer,'EPDM');
      assert.equal(x.base,0);
      assert.equal(x.zero,0);
      assert.match(x.blank,/NBR O-ring/);
    }
    assert.match(report.trail,/Mechanical Seal AdjustmentRM \+152\.00/);
    assert.match(report.trail,/O-ring AdjustmentRM \+162\.00/);
    assert.match(report.missing,/Component price not entered: ISO 42 NBR O-ring/);
    assert.match(report.missing,/Individual final:\s*RM —/);
    assert.match(report.failure,/lookup failed/);
    assert.equal(report.otherCategory,false);
    assert.equal(report.quoteItems.length,2);
    assert.equal(report.quoteItems[1].unitPrice-report.quoteItems[0].unitPrice,314);
    assert.equal(report.quoteItems[1].pricingSource.seal_material,'Silicon Carbide');
    console.log('PASS 11 shaft groups, standard inclusion, both upgrade paths, explicit zero, blank, lookup failure, both pricing modes, audit rows and totals.');

    const products=await page.evaluate(() => ['125-100-500','150-125-400','80-50-250'].map(model=>KeySuiteISO.findProduct(model)));
    const window={addEventListener(){},KEYSUITE_SECURE_DATA:{esProducts:[{model:'ES 65-26',variants:[{priceUsd:1}]}]},
      KeySuiteISO:{findProduct(model){return [...products,{model:'unpriced',variants:[{priceUsd:null,priceMyr:0}]}].find(p=>p.model===model.replace(/^ISO /i,''));}}};
    const document={readyState:'loading',addEventListener(){}};
    const script=readFileSync('v40201-quick-selection.js','utf8');
    vm.runInNewContext(script.replace(/\}\)\(\);\s*$/, 'window.review = applyDashboardStockPriority;})();'),{window,document});
    const classify=(family,model,price_available)=>window.review({family},{model,price_available}).stock_status;
    for(const p of products)assert.equal(classify('ISO','ISO '+p.model),'hot');
    assert.equal(classify('ISO','ISO unpriced'),'cold');
    assert.equal(classify('ISO','ISO unknown'),'cold');
    assert.equal(classify('ISO','ISO '+products[0].model,false),'cold');
    assert.equal(classify('ES','ES 65-26'),'hot');
    assert.equal(classify('ES','ES 65-20'),'cold');
    console.log('PASS ISO priced examples and another model, missing and zero prices, explicit classification and ES regression.');
  } finally {
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
