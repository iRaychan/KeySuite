const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const sandbox={
  window:{},
  document:{getElementById(){return null},querySelectorAll(){return []}},
  localStorage:{getItem(){return null},setItem(){}},
  console,
  alert(){},
  setTimeout,
  clearTimeout,
};
sandbox.window.window=sandbox.window;
vm.runInNewContext(fs.readFileSync(path.join(root,'pricing.js'),'utf8'),sandbox,{filename:'pricing.js'});
const api=sandbox.window.KeySuitePricing;
assert(api,'pricing API loads');

const nested=[
  {model:'Pumpset',qty:2,pricingSource:{product_family:'MANUAL',assembly_items:[
    {model:'Pump',qty:1,pricingSource:{product_family:'ES'}},
    {model:'Motor',qty:1,pricingSource:{product_family:'MOTOR'}},
    {model:'Coupling',qty:1,pricingSource:{product_family:'COUPLING'}},
    {model:'Baseplate',qty:1,pricingSource:{product_family:'BASEPLATE'}},
  ]}},
  {model:'Panel',qty:1,pricingSource:{product_family:'KEYPLC'}},
];
const leaves=api.flattenAssemblyItems(nested);
assert.deepStrictEqual(Array.from(leaves,x=>x.model),['Pump','Motor','Coupling','Baseplate','Panel'],'nested Assembly wrapper is excluded');
assert.deepStrictEqual(Array.from(leaves,x=>x.qty),[2,2,2,2,1],'nested quantities are expanded once');

const result=api.consolidateAssemblyPricing([
  {qty:1,calc:{beforeFuel:1000,transport:100,fuelCharge:70}},
  {qty:1,calc:{beforeFuel:500,transport:80,fuelCharge:55}},
  {qty:1,calc:{beforeFuel:250,transport:30,fuelCharge:40}},
  {qty:1,calc:{beforeFuel:300,transport:60,fuelCharge:50}},
]);
assert.strictEqual(result.beforeFuelTotal,2050,'component prices after their own discounts are summed');
assert.strictEqual(result.transportTotal,270,'all component Transport is summed');
assert.strictEqual(result.maxFuelCharge,70,'only the highest Fuel Charge is used');
assert.strictEqual(result.total,2120,'the consolidated price is rounded once after MAX Fuel');

const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const curve=fs.readFileSync(path.join(root,'v394411-product-curve.js'),'utf8');
const baseplate=fs.readFileSync(path.join(root,'baseplate.js'),'utf8');
const pricing=fs.readFileSync(path.join(root,'pricing.js'),'utf8');
assert(index.includes('max-width:288px;min-width:0'),'Mechanical Seal Add-On editable inputs retain a responsive 288px maximum');
assert(curve.includes('>PDF</button>')&&curve.includes('>Assembly</button>')&&curve.includes('>Add to Quote</button>'),'curve action group contains PDF, Assembly and Add to Quote');
assert(index.includes('id="productBaseplateAssembly"')&&baseplate.includes("section:'baseplate'"),'Product Baseplate routes to the Pumpset Baseplate section');
assert(pricing.includes("repriceSource(source,'quotation'")&&pricing.includes('set_discount_retained=true'),'Assembly/System leaves retain each component quotation Set Discount');
assert(!/print-system-item-head|print-item-desc/.test(curve),'curve action restoration does not change quotation print markup');
console.log('V4.28.59 assembly/system pricing and restored-action regression checks passed.');
