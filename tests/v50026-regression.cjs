const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const assert=require('assert/strict');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const load=(files)=>{const context=vm.createContext({console});for(const file of files)vm.runInContext(read(file),context,{filename:file});return context};

assert.equal(sha('selector-cr/index.html'),'224594e1ef5f5ecfcede14f332f82fcd60a2bce8bd9fa847ccfcf5aacf330898','CR MASTER changed');
assert.equal(sha('selector-es/index.html'),'93230b96c5ba91b6bbb920d6851281183b6ad9dfd4c925206379eb7974284dbf','ES MASTER changed');
assert.equal(sha('selector/index.html'),'63e3461f2e1a2290e517c987ace622cc50a59f81874e04577820b539ec259433','CHC C6 changed');
assert.equal(sha('selector-g1/index.html'),'0322ae4ce13e47e45e65990d09769c0570b57dd38d74753ece8ee1728dde2838','CHC C4 changed');
assert.equal(sha('selector-cr/product.html'),'6cb441dfa181be1128bb9dfa4c96b789b09fb2177b5f4ceb5ac930da1797b974','Product CR changed');
const index=read('index.html');
const quotation=index.slice(index.indexOf('<div id="printQuotationDocument"'),index.indexOf('<script src="config.js">'));
assert.equal(crypto.createHash('sha256').update(quotation).digest('hex'),'44641a3b87ec90cdfd342eaacf65f5b90dbde6f313df5269a76de431b34955ba','quotation/PDF layout changed');
assert.equal(read('VERSION.txt').trim(),'5.00.26');
assert.equal(JSON.parse(read('RELEASE.json')).version,'5.00.26');

const kv=load(['supabase/functions/shared-kv/kv-data.js','kv-fixes-v50026.js','supabase/functions/shared-kv/kv-selector-core.js']);
const kvModel=kv.KeySuiteKVData.models.find(model=>model.model==='KV 1-50');
const evaluated=kv.KeySuiteKVCore.evaluateModel(kv.KeySuiteKVData,kvModel,.2,0,50);
assert(evaluated);
for(const fit of [evaluated.headFit,evaluated.effFit,evaluated.npshFit,evaluated.powerFit])assert.equal(fit.polynomialOnly,true);
assert.equal(evaluated.npshFit.order,3);
assert.equal(evaluated.effFit.order,5);
assert.equal(evaluated.powerFit.order,3);
assert.equal(kv.KeySuiteKVCore.sampleFit(evaluated.npshFit,220).length,221);
for(const fit of [evaluated.effFit,evaluated.npshFit,evaluated.powerFit]){
  const point=fit.pts.find(item=>item.x>0);
  assert.notEqual(kv.KeySuiteKVCore.fitValue(fit,point.x),point.y,'exact-point substitution is active');
}
assert(kv.KeySuiteKVData.models.every(model=>model.connection==='DN25 (G1¼) x DN25 (G1¼)'));
assert.deepEqual(Array.from(new Set(kv.KeySuiteKVData.models.map(model=>model.series))),['KV 1']);

const bgf=load(['bgf-data-v50026.js','supabase/functions/shared-kv/kv-selector-core.js']);
const motor=bgf.KeySuiteKVCore.evaluateModel(bgf.KeySuiteKVData,bgf.KeySuiteKVData.models[0],5,40,50);
const engine=bgf.KeySuiteKVCore.evaluateModel(bgf.KeySuiteKVData,bgf.KeySuiteKVData.models[1],5,40,50);
assert(motor&&engine);
for(const key of ['predHead','eff','npsh','shaft'])assert.equal(motor[key],engine[key],`BGF hydraulic mismatch: ${key}`);
assert.match(read('bgf-v50006.js'),/c\/w \$\{p\.motorHp\}HP 2Pole Motor \(415V \/ 3Ph \/ 50Hz\)/);
assert.match(read('bgf-selector-v50026.js'),/Drive<\/label>/);
assert.match(read('index.html'),/data-page="productBgf">BGF<\/button>/);
const materialFix=read('kv-fixes-v50026.js');
assert.match(materialFix,/Stainless Steel 304 \/ Mechanical Seal/);
assert.match(materialFix,/SS304 \(Cast Iron Connection\) \/ Mechanical Seal/);
assert.match(materialFix,/Stainless Steel 316 \/ Mechanical Seal/);
console.log('PASS V5.00.26 BUG FIX 001-010 and locked-master protection');
