'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:8840';
const results=[];
class LocalOnly extends ResourceLoader{fetch(url,opts){if(!url.startsWith(origin+'/'))return null;const p=path.join(root,decodeURIComponent(new URL(url).pathname));const result=fs.promises.readFile(p);result.abort=()=>{};return result;}}
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
async function load(name){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 let html=read(name).replace('function prepareProductModel(', 'window.__prepare=prepareProductModel;function prepareProductModel(').replace('function loadEsProductModel(', 'window.__esEval=code=>eval(code);function loadEsProductModel(');
 const dom=new JSDOM(html,{url:origin+'/'+name+'?product=1',runScripts:'dangerously',resources:new LocalOnly(),pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.structuredClone=structuredClone;w.alert=m=>{throw Error('Unexpected popup: '+m)};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.ResizeObserver=class{observe(){} disconnect(){}};w.HTMLElement.prototype.scrollIntoView=function(){};w.CSS={escape:x=>String(x)};}});
 await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
 return {dom,w:dom.window,errors};
}
function near(a,b,tag,tol=1e-5){assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${tag}: ${a} != ${b}`)}
function input(w,el,value){el.value=String(value);el.dispatchEvent(new w.Event('input',{bubbles:true}));}
async function selectorTest(name){
 const {dom,w,errors}=await load(name);
 try{
  const api=w.KeySuiteOperatingSpeed,el=w.document.getElementById('speedInput');assert(api&&el,name+' policy and control load');assert.equal(el.value,'50');
  assert(w.eval('typeof DB!=="undefined"&&!!DB'),JSON.stringify(errors));const first=w.eval('DB.models[0]');
  if(w.__prepare)assert(w.__prepare(first.model),name+' initial model');
  else{w.document.getElementById('flow').value='1';w.document.getElementById('head').value='1';w.eval('run()');}
  const base=w.eval('selectionState.models[selectionState.selectedIndex]');assert(base,name+' selected model');
  const id=base.model;
  const groups=w.eval(`Array.from(new Map(DB.models.map(m=>[m.series,m])).values()).map(m=>{const c=DB.curves[m.series],q=c&&Math.max(...c.flow.map(Number))*.5,a=evaluateModel(m,q,1,50),b=evaluateModel(m,q*1.2,1,60);return {series:m.series,model:m.model,a:a&&{head:a.predHead,eff:a.eff,npsh:a.npsh,shaft:a.shaft,max:a.headFit.max},b:b&&{head:b.predHead,eff:b.eff,npsh:b.npsh,shaft:b.shaft,max:b.headFit.max}}})`);
  for(const g of groups){assert(g.a&&g.b,name+' group '+g.series+' evaluates at 50/60');near(g.b.head,g.a.head*1.44,name+' group head '+g.series);near(g.b.max,g.a.max*1.2,name+' group flow '+g.series);near(g.b.eff,g.a.eff,name+' group eff '+g.series);if(Number.isFinite(g.a.npsh)&&Number.isFinite(g.b.npsh))near(g.b.npsh,g.a.npsh*1.44,name+' group npsh '+g.series);if(Number.isFinite(g.a.shaft)&&Number.isFinite(g.b.shaft))near(g.b.shaft,g.a.shaft*1.728,name+' group power '+g.series,.025);}
  const ref=w.eval(`evaluateModel(DB.models.find(x=>x.model===${JSON.stringify(id)}),${Number(base.headFit?.max||10)*.5},1,50)`);
  assert(ref,name+' reference performance');
  for(const hz of [45,50,50.01,55,60,60.01]){
   input(w,el,hz);const applied=Math.min(hz,60);
   near(Number(w.document.getElementById('hz').value),applied,name+' input precision',1e-10);
   assert.equal(el.classList.contains('keysuite-speed-over50'),applied>50,name+' color '+hz);
   assert.equal(w.eval('selectionState.models[selectionState.selectedIndex].model'),id,name+' stable model');
   near(w.eval('selectionState.curveHz'),applied,name+' live curve frequency',1e-10);
   const ratio=applied/50,q=ref.headFit.max*.5*ratio;
   const p=w.eval(`evaluateModel(DB.models.find(x=>x.model===${JSON.stringify(id)}),${q},1,${applied})`);
   assert(p,name+' performance at '+applied);
   const p0=w.eval(`evaluateModel(DB.models.find(x=>x.model===${JSON.stringify(id)}),${q/ratio},1,50)`);
   near(p.headFit.max,p0.headFit.max*ratio,name+' flow');near(p.predHead,p0.predHead*ratio**2,name+' head');near(p.eff,p0.eff,name+' efficiency');
   if(Number.isFinite(p.npsh)&&Number.isFinite(p0.npsh))near(p.npsh,p0.npsh*ratio**2,name+' NPSHr');
   if(Number.isFinite(p.shaft)&&Number.isFinite(p0.shaft))near(p.shaft,p0.shaft*ratio**3,name+' shaft power',.025);
  }
  input(w,el,45);input(w,el,60.01);near(w.eval('selectionState.curveHz'),45,name+' rejected input preserves prior curve');assert.equal(el.checkValidity(),false);
  assert.equal(w.eval(`evaluateModel(DB.models[0],1,1,60.01)`),null,name+' engine rejects above60');
  const unit=w.document.getElementById('speedUnit');input(w,el,50.01);unit.value='rpm';unit.dispatchEvent(new w.Event('change',{bubbles:true}));near(Number(el.value),2900*50.01/50,name+' RPM precision');assert.equal(Number(el.max),3480);
  unit.value='hz';unit.dispatchEvent(new w.Event('change',{bubbles:true}));near(Number(el.value),50.01,name+' Hz roundtrip',1e-10);
  if(w.__prepare){w.__prepare(first.model);assert.equal(el.value,'50',name+' reopen default');assert(!el.classList.contains('keysuite-speed-over50'));}
  assert.deepEqual(errors,[],name+' page execution errors');
  results.push({test:name,status:'PASS',hydraulicGroups:groups.length,checks:'default, thresholds, decimal, rejection, live curve, model stability, affinity, RPM conversion'});
 }finally{dom.window.close()}
}
async function esTest(series){
 const name=`selector-${series}/index.html`,{dom,w,errors}=await load(name);
 try{
  const el=w.document.getElementById('manualFrequency');assert.equal(el.value,'50');
  const ev=w.__esEval;assert(ev,JSON.stringify(errors));const db=series==='iso'?'ISO_SELECTOR_DB':'ES_SELECTOR_DB';ev(`loadEsProductModel(${db}.pumps[0],{})`);assert(ev('current()'));
  const id=ev('current().pump.id');
  for(const hz of [45,50,50.01,55,60,60.01]){
   input(w,el,hz);const applied=Math.min(60,hz);near(ev('current().frequencyHz'),applied,series+' decimal/live',1e-10);
   assert.equal(el.classList.contains('keysuite-speed-over50'),applied>50);assert.equal(ev('current().pump.id'),id);
   const vals=ev(`(()=>{const r=current(),p=r.pump,d=r.impellerMm,s=${applied}/50,q=ESCore.bepData(p,d,1).bep.flowLps;return [ESCore.performance(p,d,q,1),ESCore.performance(p,d,q*s,s)]})()`);
   const [a,b]=vals;near(b.headM,a.headM*(applied/50)**2,series+' head');near(b.efficiencyPct,a.efficiencyPct,series+' eff');near(b.shaftKw,a.shaftKw*(applied/50)**3,series+' power');if(a.npshrM!=null)near(b.npshrM,a.npshrM*(applied/50)**2,series+' npsh');
  }
  assert.equal(ev('ESCore.applyFlexibleSetting(current(),current().impellerMm,60.01)'),null);
  input(w,el,45);input(w,el,60.01);near(ev('current().frequencyHz'),45,series+' rejects without changing curve');el.dispatchEvent(new w.Event('change',{bubbles:true}));near(ev('current().frequencyHz'),45,series+' invalid blur does not apply');
  ev(`loadEsProductModel(${db}.pumps[1],{})`);assert.equal(el.value,'50');assert(!el.classList.contains('keysuite-speed-over50'));
  assert.deepEqual(errors,[],name+' page errors');results.push({test:name,status:'PASS',checks:'default, thresholds, decimal, cap, model change, affinity, live curve'});
 }finally{dom.window.close()}
}
async function gTest(){
 const dom=new JSDOM('<head></head><body><section id="productGCurve" class="active"></section></body>',{url:origin,runScripts:'outside-only'}),w=dom.window;
 try{w.HTMLElement.prototype.scrollIntoView=function(){};
  for(const n of ['operating-speed.js','supabase/functions/shared-bfi/bfi-selector-core.js','bfi-curve-view.js','g-data-v50068.js'])w.eval(read(n));
  const models=w.KeySuiteGData.models;w.KeySuiteG={models:()=>models,message(){},description:()=>'',quoteModel(){},assembly(){}};
  w.eval(read('g-performance-v50072.js'));
  const api=w.KeySuiteGPerformance,m=models.find(x=>api.hasCurve(x));assert(api.open(m));
  const el=w.document.getElementById('gSpeed');assert.equal(el.value,'50');
  for(const hz of [45,50,50.01,55,60,60.01]){input(w,el,hz);await Promise.resolve();const applied=Math.min(hz,60);assert.equal(Number(el.value),hz);assert.equal(el.classList.contains('keysuite-speed-over50'),applied>50);assert.equal(w.document.getElementById('gCurveTitle').textContent,m.model);const q=api.ratedDuty(m,50).q,ratio=applied/50;for(const [key,power] of [['h',2],['eff',0],['power',3],['npsh',2]]){near(api.valueAt(api.curveFit(m,key,applied),q*ratio),api.valueAt(api.curveFit(m,key,50),q)*ratio**power,'G '+key)}}
  input(w,el,45);input(w,el,60.01);assert(w.document.getElementById('gCurveSpeed').textContent.includes('45.0 Hz'));assert.equal(el.checkValidity(),false);
  assert.equal(api.curveFit(m,'h',60.01),null);api.open(m);assert.equal(w.document.getElementById('gSpeed').value,'50');
  results.push({test:'G dynamic commercial curve',status:'PASS',checks:'default, decimal thresholds, cap, live curve, identity, affinity'});
 }finally{dom.window.close()}
}
(async()=>{
 const selectors=['selector/product.html','selector-g1/product.html','selector-cr/product.html','selector-bfi/product.html','selector-kv/index.html','selector-bgf/index.html','selector-bsw/index.html','selector/index.html','selector-g1/index.html','selector-cr/index.html','selector-bfi/index.html'];
 for(const name of selectors){try{await selectorTest(name);console.log('PASS',name)}catch(e){results.push({test:name,status:'FAIL',error:e.stack});console.log('FAIL',name,e.message)}}
 for(const series of ['es','iso'])try{await esTest(series);console.log('PASS',series)}catch(e){results.push({test:series,status:'FAIL',error:e.stack});console.log('FAIL',series,e.message)}
 try{await gTest();console.log('PASS G')}catch(e){results.push({test:'G',status:'FAIL',error:e.stack});console.log('FAIL G',e.message)}
 console.log(JSON.stringify(results,null,2));if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
})();
