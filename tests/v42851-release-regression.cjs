const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),power=require('../power-curve.js');
let tested=0,points=0,endpoints=0;
function check(input,label){
 const c=power.fit(input);assert(c,label+' fit');assert(c.y0>0,label+' shutoff');
 for(const p of c.pts){assert(Math.abs(power.value(c,p.x)-p.y)<1e-8,label+' preserves points');points++}
 for(let j=0;j<c.pts.length-1;j++){
  const a=c.pts[j],b=c.pts[j+1];
  for(let k=0;k<=50;k++){const y=power.value(c,a.x+(b.x-a.x)*k/50);assert(Number.isFinite(y)&&y>=Math.min(a.y,b.y)-1e-8&&y<=Math.max(a.y,b.y)+1e-8,label+' no overshoot')}
 }
 for(let j=1;j<c.pts.length-1;j++){
  const x=c.pts[j].x,e=Math.min(x-c.pts[j-1].x,c.pts[j+1].x-x)*1e-6;
  const l=(power.value(c,x)-power.value(c,x-e))/e,r=(power.value(c,x+e)-power.value(c,x))/e;
  assert(Math.abs(l-r)<1e-3*(1+Math.abs(l)+Math.abs(r)),label+' smooth join');
 }
 tested++;
}
for(const folder of ['selector','selector-g1']){
 const s=fs.readFileSync(path.join(root,folder,'product.html'),'utf8');
 const db=JSON.parse(s.split('\n').find(l=>l.startsWith('const DB=')).slice(9).replace(/;\s*$/,''));
 const ctx=vm.createContext({});
 vm.runInContext(s.slice(s.indexOf('function solve('),s.indexOf('function nice('))+s.slice(s.indexOf('function fitMixedHeadCurve('),s.indexOf('function evaluateModel(')),ctx);
 for(const [name,curve] of Object.entries(db.curves))for(const ratio of [1,.8]){
  const mix={full:1,small:0,smallest:0,total:1};
  const h=ctx.fitMixedHeadCurve(curve,mix,ratio),e=ctx.fitMixedEfficiencyCurve(curve,mix,ratio);
  if(!h||!e)continue;
  check(h.pts.map(p=>({x:p.x,y:9.81*p.x*p.y/3600/(Math.max(1,Math.min(100,ctx.peval(e.c,p.x)))/100)})),folder+name);
 }
 for(const page of ['index.html','product.html']){const t=fs.readFileSync(path.join(root,folder,page),'utf8');assert(t.includes('powerSmooth=kind===\'power\'?keysuitePowerSmoothFit(fit):null'));assert(t.includes('../power-curve.js?v=42851'))}
}
const bfiDataContext=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'supabase/functions/shared-bfi/bfi-data.js'),'utf8'),bfiDataContext);
vm.runInContext(fs.readFileSync(path.join(root,'supabase/functions/shared-bfi/bfi-selector-core.js'),'utf8'),bfiDataContext);
const reportedFlow=18.3*.2727654,reportedHead=82*.3048,bfiCore=bfiDataContext.KeySuiteBFICore,bfiDb=bfiDataContext.KeySuiteBFIData;
const reportedTenTwo=bfiCore.evaluateModel(bfiDb,bfiDb.models.find(x=>x.model==='BFI 10-2'),reportedFlow,reportedHead,50);
const reportedTenThree=bfiCore.evaluateModel(bfiDb,bfiDb.models.find(x=>x.model==='BFI 10-3'),reportedFlow,reportedHead,50);
assert(reportedTenTwo&&reportedTenThree,'reported BFI 10-2 and BFI 10-3 duty candidates are valid');
assert(bfiCore.mostSuitableCompare(reportedTenTwo,reportedTenThree,reportedFlow)<0,'18.3 IGPM at 82 ft ranks BFI 10-2 ahead of BFI 10-3 hydraulically');
for(const [series,curve] of Object.entries(bfiDataContext.KeySuiteBFIData.curves)){
 const input=[];
 for(let i=0;i<curve.flow.length;i++){
  const q=Number(curve.flow[i]),h=Number(curve.head_per_stage[i]),e=Number(curve.efficiency[i]);
  if(q>0&&h>=0&&e>0)input.push({x:q,y:9.81*q*h/3600/(e/100)});
 }
 check(input,'BFI '+series);
}
const core=require('../selector-es/es-core.js'),db=require('../selector-es/es-data.js');
const source=fs.readFileSync(path.join(root,'selector-es/index.html'),'utf8');
const ctx=vm.createContext({ESCore:core});
vm.runInContext(source.match(/function headCurveSeries\([^\n]+/)[0],ctx);
for(const pump of db.pumps)for(const ratio of [1,.8]){
 let previous=-Infinity;
 for(const d of [...new Set(pump.impellers)].filter(d=>d>0).sort((a,b)=>a-b)){
  const curve=ctx.headCurveSeries({pump},d,ratio,{});
  assert(curve.max>previous,pump.id+' diameter endpoint ordering');previous=curve.max;
  assert(Number.isFinite(curve.fn(curve.max)),pump.id+' finite head endpoint');endpoints++;
  check(core.curvePoints(pump,d,ratio).map(p=>({x:p.flowLps*3.6,y:p.shaftKw})),pump.id+' '+d);
 }
}
const natural=power.fit([{x:0,y:0},{x:1,y:2},{x:2,y:2.7},{x:3,y:3.1}]);
assert(Math.abs(power.value(natural,.5)-(natural.y0+2)/2)>1e-4,'curved shutoff extension');
assert.strictEqual(power.fit([{x:1,y:1}]),null);
assert.strictEqual(power.fit([{x:0,y:4},{x:1,y:3},{x:2,y:2}]).y0,4,'measured shutoff retained');
const esSelection=fs.readFileSync(path.join(root,'selector-es/index.html'),'utf8');
assert(esSelection.includes('html,body{width:100%;max-width:100%;min-width:0;overflow-x:hidden}'),'ES Selection viewport containment');
assert(esSelection.includes('.es-top-options,.layout,.main,.grid2{width:100%}'),'ES Selection contained geometry');
assert(esSelection.includes('html.macos-safari .grid2{width:100%;max-width:100%;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr)}'),'ES Selection Safari Product curve columns');
assert(esSelection.includes('body:not(.product-frame) aside.inputs{display:block;position:sticky;top:128px;align-self:start;max-height:none;overflow:visible;width:auto}'),'ES Selection uses Product input-panel geometry');
assert(esSelection.includes('body:not(.product-frame)>.layout{display:grid;grid-template-columns:350px minmax(0,1fr);gap:14px;padding:14px;max-width:1550px;margin:auto;align-items:start}'),'ES Selection defaults to Product canvas');
const bfiSelection=fs.readFileSync(path.join(root,'selector-bfi/index.html'),'utf8');
const bfiProduct=fs.readFileSync(path.join(root,'selector-bfi/product.html'),'utf8');
const chcC4Selection=fs.readFileSync(path.join(root,'selector-g1/index.html'),'utf8');
const chcC4Product=fs.readFileSync(path.join(root,'selector-g1/product.html'),'utf8');
assert(chcC4Selection.includes('<h1>KeyCHC <span>- CHC Series</span></h1>'),'CHC C4 Selection uses the shared CHC Series heading');
assert(chcC4Product.includes('<h1>KeyCHC <span>- CHC Series</span></h1>'),'CHC C4 Product uses the shared CHC Series heading');
assert(bfiSelection.includes('main,.result-area,#out,.curve-grid{width:100%}'),'BFI Selection contained geometry');
assert(bfiSelection.includes('main,.result-area,#out,.curve-grid,.curve-grid>*,.chart-stack,.chart-stack>*{min-width:0;max-width:100%}'),'BFI Selection curve containment');
assert(bfiSelection.includes('body:not(.product-frame) main{display:grid;max-width:1220px;margin:20px auto;padding:0 15px 18px;grid-template-columns:330px minmax(0,1fr);gap:17px;align-items:start}'),'BFI Selection uses CHC compact canvas');
assert(bfiSelection.includes("if(keybfiIncludeColdItems)return rows.map(x=>{const priced=keybfiHasInputPrice(x);return {...x,_keysuiteColdItem:!priced,_keysuitePriceAvailable:priced}})"),'BFI Cold Item selection preserves hydraulic candidate order');
assert(bfiSelection.includes('all.sort(keychcMostSuitableCompare)'),'BFI Cold Item selection uses the normal hydraulic suitability comparator');
assert(!bfiSelection.includes('Number(a._keysuiteColdItem===true)-Number(b._keysuiteColdItem===true)'),'BFI no longer promotes hot items ahead of more suitable cold items');
assert(bfiProduct.includes("keybfiPublishProductIdentity('Motor phase updated.')"),'BFI Product publishes phase-driven model identity');
assert(bfiProduct.includes("keybfiPublishProductIdentity('Pump material updated.')"),'BFI Product publishes material-driven model identity');
assert(bfiProduct.includes("material==='SS316'?branded.replace(/^BFI\\b/i,'BFIN'):branded"),'BFI Product preserves BFIN after presentation aliases');
assert(bfiProduct.includes('keysuite_display_model:displayModel'),'BFI Product refreshes export identity after live option changes');
for(const [name,page] of [['Selection',bfiSelection],['Product',bfiProduct]]){
 assert(page.includes("powerSmooth=kind==='power'?keysuitePowerSmoothFit(fit):null"),`BFI ${name} draws a non-zero shut-off power extension`);
}
const suite=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(suite.includes('html.macos-safari body.print-complete #printQuotationDocument{zoom:.92}'),'macOS Safari quotation print fits the physical printable area');
assert.strictEqual((suite.match(/#printQuotationDocument\{zoom:\.92\}/g)||[]).length,1,'quotation print fitting is scoped only to macOS Safari');
assert(suite.includes('body.print-complete .quick-selection-return,'),'floating return button is excluded from quotation printing');
assert(suite.includes('body.print-complete .ks39445-dialog-return,'),'dialog return button is excluded from quotation printing');
assert(suite.includes('body.print-complete .ks40413-page-return{display:none!important}'),'page return button is excluded from quotation printing');
assert(suite.includes('border-bottom-color:var(--template-primary,#17365d)'),'quotation item headers use the dark navy rule');
assert(suite.includes('.print-meta{position:absolute;top:107mm;'),'quotation metadata block gives two body-text rows after the heading and before the salutation');
assert(!suite.includes('.print-meta{position:absolute;top:112mm;'),'old asymmetric quotation cover spacing is removed');
assert(!suite.includes('selectorEsProductCurvePanel'),'ES Selection no longer imitates Product with a separate wrapper');
assert(!suite.includes('selectorEsProductCurveHost'),'ES Selection no longer uses a separate host');
assert(suite.includes('id="productCurveDialog" class="ks-dialog product-curve-dialog"'),'suite provides the real shared Product Curve panel');
assert(suite.includes('id="productCurveHost"'),'suite provides the real shared Product Curve host');
assert((suite.match(/class="card selection-curve-shell"/g)||[]).length===0,'ES and BFI no longer use separate Selection shells');
assert(/id="selectorBfiFrame"[^>]+display:block/.test(suite),'BFI Selection retains a visible fallback if shared-panel startup is delayed');
const productLayout=fs.readFileSync(path.join(root,'v40001-product-series-overhaul.js'),'utf8');
const productCurve=fs.readFileSync(path.join(root,'v394411-product-curve.js'),'utf8');
assert(productLayout.includes("doc.body.classList.add('product-frame','ks3963-product-es')"),'ES Selection receives Product frame classes after loading');
assert(productLayout.includes("ensureFrameStyle(doc,'ES')"),'ES Selection receives the shared Product ES layout rules');
assert(productLayout.includes("if(frame.parentNode!==host)host.appendChild(frame)"),'ES Selection mounts its iframe in the real Product Curve host');
assert(productLayout.includes("dlg.classList.add('ks3963-inline');dlg.setAttribute('open','')"),'ES Selection opens the real shared Product Curve panel');
assert(productLayout.includes("#productCurveDialog.ks3963-inline #selectorEsFrame"),'ES Selection iframe receives the same outer sizing rule as Product frames');
assert(productLayout.includes("KEYSUITE_PAGE_CHANGED"),'ES Selection shared panel follows page navigation');
assert(productLayout.includes("doc.getElementById('ksV42840SelectionEsFit')?.remove()"),'ES Selection removes the old clipping override');
assert(productLayout.includes("doc.body.classList.add('product-frame','ks3963-product-chc')"),'BFI Selection receives Product frame classes after loading');
assert(productLayout.includes("ensureFrameStyle(doc,'BFI')"),'BFI Selection receives the shared Product BFI layout rules');
assert(productLayout.includes("Selection · BFI"),'BFI Selection opens in the shared Product Curve panel');
assert(productLayout.includes("#productCurveDialog.ks3963-inline #selectorBfiFrame"),'BFI Selection iframe receives the same outer sizing rule as Product frames');
assert(productLayout.includes("if(page==='selectorBfi')"),'BFI Selection shared panel follows page navigation');
assert(productLayout.includes('openSelectionBfiPanel()||showSelectionBfiFallback()'),'BFI Selection recovers visibly if the shared host is unavailable');
assert(productLayout.includes('syncSelectionProductPanels()'),'Selection panels are re-synchronized after navigation and brand refresh');
assert(productLayout.includes("frame?.contentDocument?.getElementById('pumpMaterial')?.value"),'shared BFI Product presentation reads the live iframe material');
assert(productCurve.includes("bfi=['bfiProductMaterial','bfiProductPhase'"),'BFI Product outer options include material identity changes');
assert(productCurve.includes("m.material||current.options?.material||'SS304'"),'BFI Product accepts live material updates from its curve frame');
const multibrand=fs.readFileSync(path.join(root,'v40001-multibrand.js'),'utf8');
assert(multibrand.includes("const directSpecs=[{key:'b.g.reich',label:'B.G.Reich'},{key:'tesk',label:'Tesk'}]"),'Selection places B.G.Reich and Tesk before Brand');
assert(multibrand.includes("['selectorBfi','BFI',fallback.bfi]"),'BFI participates in Selection fallback binding');
assert(multibrand.includes("['CHC','BFI','ES','MOTOR']"),'BFI remains eligible during brand-context recovery');
const firstOpen=fs.readFileSync(path.join(root,'v42851-chc-first-open.js'),'utf8');
assert(firstOpen.includes("window.addEventListener('KEYSUITE_PAGE_CHANGED'"),'CHC first-open stabilization follows page navigation');
assert(firstOpen.includes("target.style.visibility='hidden'"),'CHC hides the incorrect first Safari frame');
assert(firstOpen.includes("target.dataset.ksChcVisibleReloaded='1'"),'CHC reloads once after its selector host becomes visible');
assert(firstOpen.includes("url.searchParams.set('ks-visible','1')"),'CHC visible reload bypasses the hidden-frame document instance');
assert(firstOpen.includes("target.dataset.ksChcVisibleReloadLoading==='1'"),'CHC stays hidden while the visible reload is in progress');
assert(firstOpen.includes('if(token!==sequence)return false'),'stale CHC stabilization timers cannot hide a newer visible frame');
assert(firstOpen.includes("target.style.width=width+'px'"),'CHC receives its measured visible host width');
assert(firstOpen.includes("target.style.width='100%'"),'CHC returns to responsive width after reflow');
assert(firstOpen.includes("target.style.visibility='visible'"),'CHC is revealed after the stabilized layout pass');
assert(firstOpen.includes("window.dispatchEvent(new CustomEvent('KEYSUITE_CHC_VIEWPORT_READY'"),'CHC publishes a visible-frame-ready handshake');
assert(suite.includes('<script src="v42851-chc-first-open.js?v=42851"></script>'),'suite loads CHC first-open stabilization');
const quickSelection=fs.readFileSync(path.join(root,'v40201-quick-selection.js'),'utf8');
assert(quickSelection.includes('function waitChcViewportReady(value,requestId)'),'Quick Selection can wait for CHC viewport readiness');
assert(quickSelection.includes('const viewportReady=await waitChcViewportReady(e,req.requestId)'),'CHC model open waits before sending the first curve request');
assert(quickSelection.includes("if(includeColdItems)return tagged.length?{...tagged[0],alternatives:tagged.slice(1)}:null"),'Quick Selection preserves BFI suitability order when Cold Item is enabled');
console.log(JSON.stringify({powerCurves:tested,preservedPoints:points,orderedFiniteImpellerEndpoints:endpoints,status:'PASS'}));
