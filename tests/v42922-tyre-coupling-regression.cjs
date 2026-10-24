const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'coupling.js'),'utf8');
const document={activeElement:null,getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]}};
const localStorage={getItem(){return null},setItem(){}};
const window={addEventListener(){}};
const context={window,document,localStorage,alert(){},console,setTimeout,clearTimeout,setInterval,clearInterval,structuredClone:global.structuredClone};
window.window=window;vm.createContext(context);vm.runInContext(source,context);

const tyre=(model,torqueNm,maxSpeedRpm,pumpBush,motorBush)=>({id:`tyre-${model}`,componentType:'tyre',model,torqueNm,maxSpeedRpm,pumpBush,motorBush,active:true});
const bush=(model,maxShaftMm)=>({id:`bush-${model}`,componentType:'bush',model,maxShaftMm,active:true});
window.KeySuiteCoupling.init({couplingProducts:[
  tyre('F70',250,3600,'2012','1610'),tyre('F80',375,3100,'2517','2012'),tyre('F90',500,3000,'2517','2517'),tyre('F100',675,2600,'3020','2517'),
  bush('1610',42),bush('2012',50),bush('2517',65),bush('3020',75)
]},{role:'owner'});

const selected=window.KeySuiteCoupling.recommendForContext('tyre',{pumpModel:'32-13',motorHp:40,motorPole:4});
assert(selected,'a tyre coupling should be selected');
assert.strictEqual(selected.model,'F80');
assert.strictEqual(selected.pumpShaft,24);
assert.strictEqual(selected.motorShaft,55);
assert.strictEqual(selected.pumpBushType,'H');
assert.strictEqual(selected.pumpBush,'2012');
assert.strictEqual(selected.pumpBushMax,50);
assert.strictEqual(selected.motorBushType,'F');
assert.strictEqual(selected.motorBush,'2517');
assert.strictEqual(selected.motorBushMax,60);
assert(selected.motorTorque>196&&selected.motorTorque<197);

const f80=window.KeySuiteCoupling.productRows('tyre').find(row=>row.model==='F80');
const overbore=window.KeySuiteCoupling.tyreEvaluation(f80,{pumpModel:'32-13',pumpShaft:24,motorHp:40,motorPole:4,motorShaft:61,motorTorque:197.2,motorRpm:1450});
assert.strictEqual(overbore.suitable,false);
assert(overbore.reasons.some(reason=>/maximum 60 mm/.test(reason)));

const next=window.KeySuiteCoupling.recommendForContext('tyre',{pumpModel:'32-13',pumpShaft:24,motorHp:40,motorPole:4,motorShaft:61,motorTorque:197.2,motorRpm:1450});
assert.strictEqual(next.model,'F100');
assert.strictEqual(next.motorBushType,'F');
assert.strictEqual(next.motorBushMax,75);

const telegram=fs.readFileSync(path.join(root,'supabase/functions/telegram-webhook/index.ts'),'utf8');
assert.match(telegram,/keybotTyreFlangeMax/);
assert.doesNotMatch(telegram,/const arrangements=ps>24/);
console.log('V4.29.22 tyre coupling regression: PASS');
