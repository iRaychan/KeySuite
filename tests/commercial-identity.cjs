const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const brands=[{id:'bg',brand_name:'B.G.Reich'},{id:'new',brand_name:'New Brand'}];
const window={KeySuiteV391:{state:{brands}}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../commercial-identity.js'),'utf8'),{window});
const I=window.KeySuiteCommercialIdentity;
for(const family of ['BFI','ES','ISO','KV','CR','CHC','BSW','BSV','FUTURE_SOURCE'])for(const name of ['B.G.Reich','Megaflow','O.K.Pump','-','','New Brand']){
 const ctx={id:'new',name,family,masterSeries:'CONFIGURED_SOURCE',sellingSeries:'COMMERCIAL'};
 const identity=I.resolve(ctx,family+' 10-3T');assert.equal(identity.model,'COMMERCIAL 10-3T');assert.equal(identity.hydraulic.model,family+' 10-3T');
 const desc=I.description('Capacity: 30 m³/hr @ 30 Mtr\nB.G.Reich End Suction Pump Model: '+family+' 10-3T\nOther details',identity);
 assert.equal(desc.split('\n')[1],(name&&name!=='-'?name+' ':'')+'End Suction Pump Model: COMMERCIAL 10-3T');
 assert.equal(I.description(desc,identity),desc,'idempotent description');
 const item={model:family+' 10-3T',description:desc,qty:2,unitPrice:123.45,pricingSource:{source_price:100,brand_margin:.1},pumpData:{curve:[1,2,3]}};
 const before=JSON.stringify(item.pricingSource),out=I.stamp(item,ctx);assert.equal(JSON.stringify(out.pricingSource),before);assert.equal(out.qty,2);assert.equal(out.unitPrice,123.45);assert.equal(JSON.stringify(out.pumpData),JSON.stringify(item.pumpData));
}
assert.equal(I.description('End Suction Pump Model: ES 40-16',I.resolve({name:'-',family:'ES'},'ES 40-16')),'End Suction Pump Model: ES 40-16');
console.log('PASS 54 configuration combinations, idempotence, explicit brandless, unchanged price/quantity/hydraulic inputs');
