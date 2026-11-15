/* KeySuite V5.00.69 — G catalogue, pricing and performance view. */
(()=>{'use strict';
const $=id=>document.getElementById(id),source=window.KeySuiteGData?.models||[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
let rows=source.map(x=>({...x})),access={};
function model(name){return rows.find(x=>x.model===name)}
function currency(){return $('gPriceCurrency')?.value||'MYR'}
function description(p){return `B.G.Reich Close-Coupled Pump Model: ${p.model}
c/w ${p.hp}HP 2Pole Motor (${p.phase==='1Ph'?'240V / 1Ph':'415V / 3Ph'} / 50Hz)
Suction & Discharge: ${p.inlet} x ${p.outlet}
Material: CI / SS / SS / Mechanical Seal`}
function message(s,error=false){let el=$('gQuoteMessage');if(el){el.textContent=s||'';el.className=s?'auth-message show '+(error?'error':'info'):'auth-message'}}
function quote(p){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id),problem=api?.gPriceProblem?.(p.id,found);
 if(problem){
  void window.KeySuiteManualPrice?.offer?.({model:p.model,brand:'B.G.Reich',description:description(p),productFamily:'G',pricingSource:{product_family:'G',product_id:p.id,model:p.model,variant:p.phase}},problem);
  return;
 }
 const item={model:p.model,brand:'B.G.Reich',qty:1,unitPrice:found.calc.finalPrice,description:description(p),pricingSource:api.sourceSnapshot(found),productFamily:'G',pumpData:{family:'G',model:p.model,base_model:p.base,weight_kg:p.weight,dimensions:p.dimensions}};
 const added=window.KeySuiteApp?.addExternalQuoteItem?.(item);
 if(added){document.querySelector('[data-page="quotation"]')?.click();message('')}
 else message('The quotation item could not be added.',true);
}
let selected=null,duties=[];
function cost(p){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id),source=found?api.sourceSnapshot(found):{product_family:'G',product_id:p.id,model:p.model,variant:p.phase==='1Ph'?'M':'T'};
 window.KeySuiteCostingAudit?.open?.({model:p.model,description:description(p),qty:1,productFamily:'G',pricingSource:source,unitPrice:found?.calc?.finalPrice},p.model+' Costing Audit');
}
async function assembly(p){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id,{pricingMode:'assembly'}),problem=api?.gPriceProblem?.(p.id,found);
 if(problem){message(problem,true);return}
 const item={model:p.model,brand:'B.G.Reich',qty:1,unitPrice:found.calc.finalPrice,description:description(p),pricingSource:api.sourceSnapshot(found),productFamily:'G',pumpData:{family:'G',model:p.model,base_model:p.base,motor_phase:p.phase,weight_kg:p.weight,dimensions:p.dimensions},assemblyLevel:'COMPLETE_PUMPSET',assemblySection:'pumpset'};
 if(!window.KeySuiteAssembly?.addItem){message('Assembly is unavailable.',true);return}
 await window.KeySuiteAssembly.addItem(item,{type:'pumpset',section:'pump',replacePumpset:true});message(p.model+' added to Assembly.');
}
function renderProduct(){
 for(const body of [$('gProductRows'),$('gSelectorRows')].filter(Boolean)){body.innerHTML='';
 for(const p of rows){const tr=document.createElement('tr');tr.innerHTML=`<td><button type="button" class="g-model-link" data-g-details>${esc(p.model)}</button></td><td>${esc(p.kw)} kW / ${esc(p.hp)} HP</td><td>${esc(p.phase)}</td><td>${esc(p.inlet)} × ${esc(p.outlet)}</td><td><span class="product-model-actions bgf-product-actions"><button class="btn keysuite-cost-button" data-g-cost>Cost</button>${p.curve?.length?'<button class="btn secondary" data-g-curve>Curve</button>':''}<button class="btn action-quote" data-g-quote>Quote</button></span></td>`;
 tr.querySelector('[data-g-details]').onclick=()=>showCurve(p);tr.querySelector('[data-g-cost]')?.addEventListener('click',()=>cost(p));tr.querySelector('[data-g-curve]')?.addEventListener('click',()=>showCurve(p));tr.querySelector('[data-g-quote]').onclick=()=>quote(p);body.appendChild(tr)}
 }}
function svgChart(points,key,label,large=false){const valid=(points||[]).filter(x=>Number.isFinite(Number(x[key]))&&Number.isFinite(Number(x.q))),w=640,h=large?300:170;if(valid.length<2)return '';
 const maxQ=Math.max(...valid.map(x=>Number(x.q))),maxY=Math.max(...valid.map(x=>Number(x[key])))*1.12||1;
 const xy=p=>[45+Number(p.q)/maxQ*(w-75),h-35-Number(p[key])/maxY*(h-65)];const path=valid.map((p,i)=>(i?'L':'M')+xy(p).map(x=>x.toFixed(1)).join(' ')).join(' ');
 const markers=large?duties.filter(d=>Number.isFinite(d.q)&&d.q>=0&&d.q<=maxQ).map((d,i)=>{let idx=valid.findIndex(v=>v.q>=d.q);if(idx<1)idx=1;const a=valid[idx-1],b=valid[idx],v=Number(a[key])+(Number(b[key])-Number(a[key]))*(d.q-a.q)/(b.q-a.q),[x,y]=xy({q:d.q,[key]:v});return `<circle cx="${x}" cy="${y}" r="5" fill="#e11d48"/><text x="${x+7}" y="${y-7}" font-size="12">D${i+1}</text>`}).join(''):'';
 return `<path d="M45 20V${h-35}H${w-25}" stroke="#8194a4" fill="none"/><path d="${path}" stroke="#0869a6" stroke-width="3" fill="none"/>${markers}<text x="${w-120}" y="${h-9}" font-size="12">Flow (m³/h)</text><text x="49" y="16" font-size="12">${label}</text>`}
function renderDuties(){const el=$('gDutyPoints');el.innerHTML=duties.map((d,i)=>`<div class="g-duty-point"><strong>D${i+1}</strong><span>${esc(d.q)} m³/h</span><span>${esc(d.h)} m</span><button type="button" data-remove="${i}">×</button></div>`).join('');el.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{duties.splice(Number(b.dataset.remove),1);renderDuties();plot()})}
function plot(){if(!selected)return;const q=Number($('gDutyFlow').value),h=Number($('gDutyHead').value);if(q>0&&h>0){duties[0]={q,h};renderDuties()}$('gCurveSvg').innerHTML=selected.curve?.length?svgChart(selected.curve,'h','Head (m)',true):'<text x="40" y="90">No verified performance curve supplied for this model.</text>';$('gDutyResult').textContent=duties.length?`D1: ${duties[0].q} m³/h @ ${duties[0].h} m`:'Enter Flow and Head to plot D1.'}
function syncSelected(){const p=selected;if(!p)return;$('gCurveTitle').textContent=p.model;$('gModelSpecs').textContent=`${p.kw} kW / ${p.hp} HP · ${p.inlet} × ${p.outlet} · ${p.phase}`;$('gPhase').value=p.phase;$('gVoltage').textContent=p.phase==='1Ph'?'240 V':'415 V';$('gRpm').textContent=`${Math.round(p.speed*Number($('gSpeed').value||50)/50)} RPM`;
 $('gCurveSvg').innerHTML=p.curve?.length?svgChart(p.curve,'h','Head (m)',true):'<text x="40" y="90">No verified performance curve supplied for this model.</text>';$('gSecondaryCharts').innerHTML=[['eff','Efficiency (%)'],['power','Shaft Power (kW)'],['npsh','NPSHr (m)']].filter(([key])=>p.curve?.some(v=>Number.isFinite(Number(v[key])))).map(([key,label])=>`<div><h3>${label}</h3><svg viewBox="0 0 640 170">${svgChart(p.curve,key,label)}</svg></div>`).join('');$('gAlternatives').innerHTML=rows.filter(v=>v.curve?.length&&v.model!==p.model).map(v=>`<button class="btn secondary" data-alt="${v.model}">${v.model}</button>`).join(' ');$('gAlternatives').querySelectorAll('[data-alt]').forEach(b=>b.onclick=()=>showCurve(model(b.dataset.alt),false));plot()}
function showCurve(p,open=true){if(!p)return;selected=p;syncSelected();if(open&&!$('gCurveDialog').open)$('gCurveDialog').showModal()}
function setupCurve(){const d=$('gCurveDialog');if(!d)return;d.querySelector('[data-g-back]').onclick=()=>d.close();d.querySelector('[data-g-cost]').onclick=()=>cost(selected);d.querySelector('[data-g-pdf]').onclick=()=>window.KeySuiteGPdf?.open(selected,{duties});d.querySelector('[data-g-quote]').onclick=()=>quote(selected);d.querySelector('[data-g-assembly]').onclick=()=>assembly(selected);d.querySelector('[data-g-plot]').onclick=plot;d.querySelector('[data-g-add-duty]').onclick=()=>{if(duties.length>=6)return;const q=Number($('gDutyFlow').value),h=Number($('gDutyHead').value);if(q>0&&h>0){duties.push({q,h});renderDuties();plot()}};$('gPhase').onchange=()=>{const next=rows.find(v=>v.base===selected.base&&v.phase===$('gPhase').value);if(next)showCurve(next,false);else $('gPhase').value=selected.phase};$('gSpeed').oninput=syncSelected}
function renderPrices(){
 const body=$('gPriceRows');if(!body)return;body.innerHTML='';
 const c=currency(),field='price_'+c.toLowerCase(),rf='rarity_'+c.toLowerCase();
 for(const p of rows){
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><b>${esc(p.base)}</b></td><td>${esc(p.model)}</td><td>${esc(p.phase)}</td><td><div class="currency-price-input"><span>${c}</span><input type="number" min="0" step="0.01" data-price value="${Number(p[field]||0)}" ${access.role==='owner'?'':'disabled'}></div></td><td><select data-rarity ${access.role==='owner'?'':'disabled'}><option value="many">Many</option><option value="common">Common</option><option value="rare">Rare</option><option value="fixed">Fixed</option></select></td><td><button class="btn" type="button" data-save ${access.role==='owner'?'':'hidden'}>Save</button></td>`;
  tr.querySelector('[data-rarity]').value=p[rf]||'many';
  tr.querySelector('[data-save]').onclick=async()=>{
   const client=window.KeySuiteAuth?.getClient?.(),price=Number(tr.querySelector('[data-price]').value),rarity=tr.querySelector('[data-rarity]').value;
   if(!client||!Number.isFinite(price)||price<0)return;
   const {data,error}=await client.from('ks_products_g').update({[field]:price,[rf]:rarity,updated_at:new Date().toISOString()}).eq('id',p.id).select('id').maybeSingle();
   const note=$('gPriceListMessage');note.textContent=error?.message||(!data?.id?'Owner permission or G migration is required.':p.model+' price saved.');
   if(data?.id){p[field]=price;p[rf]=rarity;window.KEYSUITE_SECURE_DATA.gProducts=rows}
  };
  body.appendChild(tr);
 }
 $('gPriceListCount').textContent=`${rows.length} variants · ${c} · ${rows.filter(p=>Number(p[field])>0).length} priced`;
}
function init(data,a){
 access=a||{};const fromDb=new Map((data?.gProducts||[]).map(p=>[p.id,p]));
 rows=source.map(p=>({...p,...fromDb.get(p.id)}));
 $('gPriceCurrency')?.addEventListener('change',renderPrices);
 renderProduct();renderPrices();
 if(!fromDb.size)$('gPriceListMessage').textContent='G database rows are not installed. Apply the V5.00.68 migration before saving prices.';
}
document.addEventListener('DOMContentLoaded',()=>{renderProduct();renderPrices();setupCurve()});
window.KeySuiteG={init,models:()=>rows,description,quoteModel(name){const p=model(name);if(p)quote(p)}};
})();
