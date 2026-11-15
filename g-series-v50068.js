/* KeySuite V5.00.68 — independent G catalogue and pricing. */
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
function renderProduct(){
 for(const body of [$('gProductRows'),$('gSelectorRows')].filter(Boolean)){body.innerHTML='';
 for(const p of rows){
  const tr=document.createElement('tr');
  tr.innerHTML=`<td><b>${esc(p.model)}</b></td><td>${esc(p.kw)} kW / ${esc(p.hp)} HP</td><td>${esc(p.phase)}</td><td>${esc(p.inlet)} × ${esc(p.outlet)}</td><td>${p.curve?'<button class="btn secondary" type="button" data-g-curve>Curve</button>':'No curve data'}</td><td><span class="product-model-actions bgf-product-actions"><button class="btn secondary" type="button" data-g-pdf>PDF</button><button class="btn action-quote" type="button" data-g-quote>Quote</button></span></td>`;
  tr.querySelector('[data-g-curve]')?.addEventListener('click',()=>showCurve(p));
  tr.querySelector('[data-g-quote]').onclick=()=>quote(p);
  tr.querySelector('[data-g-pdf]').onclick=()=>window.KeySuiteGPdf?.open(p);
  body.appendChild(tr);
 }}
}
function showCurve(p){
 const dialog=$('gCurveDialog'),svg=$('gCurveSvg'),title=$('gCurveTitle');if(!dialog||!svg||!p.curve)return;
 const pts=p.curve,qmax=Math.max(...pts.map(x=>x.q)),hmax=Math.max(...pts.map(x=>x.h))*1.08;
 const path=pts.map((x,i)=>(i?'L':'M')+(40+x.q/qmax*560).toFixed(1)+' '+(240-x.h/hmax*210).toFixed(1)).join(' ');
 title.textContent=p.model+' · Head versus Flow';svg.innerHTML='<path d="M40 25V240H605" fill="none" stroke="#8698a7"/><path d="'+path+'" fill="none" stroke="#0f629c" stroke-width="3"/><text x="500" y="260" font-size="13">Flow (m³/h)</text><text x="45" y="20" font-size="13">Head (m)</text>';
 dialog.showModal();
}
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
document.addEventListener('DOMContentLoaded',()=>{renderProduct();renderPrices()});
window.KeySuiteG={init,models:()=>rows,description,quoteModel(name){const p=model(name);if(p)quote(p)}};
})();
