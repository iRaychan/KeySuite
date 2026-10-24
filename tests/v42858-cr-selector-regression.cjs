const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const root=path.resolve(__dirname,'..');
const context={globalThis:{}};context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'supabase/functions/shared-cr/cr-data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'supabase/functions/shared-cr/cr-selector-core.js'),'utf8'),context);
const db=context.KeySuiteCRData,core=context.KeySuiteCRCore;
assert(db&&core,'CR data/core must load');
assert.strictEqual(db.models.length,454);
assert.strictEqual(Object.keys(db.curves).length,22);
assert.strictEqual(db.models[0].model,'CR 1-1');
assert.strictEqual(db.models.at(-1).model,'CR 320-3-1');
assert(db.models.some(x=>x.model==='CR 125-1'),'CR 125 typo must be normalized');
assert(!db.models.some(x=>/^CHC\b/i.test(x.model)),'CR catalogue must not expose CHC model names');
for(const [series,curve] of Object.entries(db.curves)){
  for(const key of ['flow','efficiency','npshr','head_per_stage'])assert.strictEqual(curve[key].length,20,`${series} ${key}`);
  assert(Number(curve.speed_rpm)>0,`${series} speed`);
}
for(const model of db.models){
  const curve=db.curves[model.series];assert(curve,`${model.model} curve`);
  if(model.smallImpellers)assert(curve.head_per_stage_2&&curve.efficiency_2,`${model.model} secondary impeller curve`);
  if(model.smallestImpellers)assert(curve.head_per_stage_3&&curve.efficiency_3,`${model.model} tertiary impeller curve`);
  const q=curve.flow.filter(Number.isFinite).sort((a,b)=>a-b)[Math.floor(curve.flow.length/2)];
  assert(core.evaluateModel(db,model,Math.max(.01,q),1,50),`${model.model} must evaluate`);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(/data-page="productCr"/.test(html),'Product CR must route to product search');
assert(/id="productCr"/.test(html),'CR product page must exist');
assert(/id="crPriceList"/.test(html),'CR Price List editor must remain available');
assert(/selector-cr\/product\.html/.test(html),'CR Product must use CR selector');
console.log('V4.28.58 CR selector regression: PASS');
