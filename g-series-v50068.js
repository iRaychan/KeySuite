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
function message(s,error=false){for(const el of [$('gQuoteMessage'),$('gCurveMessage')].filter(Boolean)){el.textContent=s||'';el.className=s?'auth-message show '+(error?'error':'info'):'auth-message'}}
function payload(p,conditions={}){const value={family:'G',model:p.model,base_model:p.base,motor_phase:p.phase,motor_kw:p.kw,motor_hp:p.hp,pole:p.pole,motor_voltage:p.phase==='1Ph'?240:415,suction:p.inlet,discharge:p.outlet,weight_kg:p.weight,dimensions:p.dimensions,reference_speed_rpm:p.speed,motor_rated_speed_rpm:p.motor?.speed,...conditions};return window.KeySuiteCommercialIdentity?.captureSelection(value)||value}
function quote(p,conditions){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id),problem=api?.gPriceProblem?.(p.id,found);
 if(problem){
  void window.KeySuiteManualPrice?.offer?.({model:p.model,description:description(p),productFamily:'G',pumpData:payload(p,conditions),pricingSource:{product_family:'G',product_id:p.id,model:p.model,variant:p.phase}},problem);
  return;
 }
 const item={model:p.model,qty:1,unitPrice:found.calc.finalPrice,description:description(p),pricingSource:api.sourceSnapshot(found),productFamily:'G',pumpData:payload(p,conditions)};
 const added=window.KeySuiteApp?.addExternalQuoteItem?.(item);
 if(added){document.querySelector('[data-page="quotation"]')?.click();message('')}
 else message('The quotation item could not be added.',true);
}
function cost(p){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id),source=found?api.sourceSnapshot(found):{product_family:'G',product_id:p.id,model:p.model,variant:p.phase==='1Ph'?'M':'T'};
 window.KeySuiteCostingAudit?.open?.({model:p.model,description:description(p),qty:1,productFamily:'G',pricingSource:source,unitPrice:found?.calc?.finalPrice},p.model+' Costing Audit');
}
async function assembly(p,conditions){
 const api=window.KeySuitePricing,found=api?.findGPrice?.(p.id,{pricingMode:'assembly'}),problem=api?.gPriceProblem?.(p.id,found);
 if(problem){message(problem,true);return}
 const item={model:p.model,qty:1,unitPrice:found.calc.finalPrice,description:description(p),pricingSource:api.sourceSnapshot(found),productFamily:'G',pumpData:payload(p,conditions),assemblyLevel:'COMPLETE_PUMPSET',assemblySection:'pumpset'};
 if(!window.KeySuiteAssembly?.addItem){message('Assembly is unavailable.',true);return}
 try{
  if(await window.KeySuiteAssembly.addItem(item,{type:'system',section:'pumpset'}))message(p.model+' added to Assembly.');
 }catch(error){message(error.message||'Assembly could not be opened.',true)}
}
let group='All G';
const hasCurve=p=>window.KeySuiteGPerformance.hasCurve(p);
function renderProduct(){
 const grid=$('gProductGrid'),groups=$('gProductGroups');
 if(!grid||!groups)return;
 groups.replaceChildren();
 for(const name of ['All G','G25','G32']){
  const button=document.createElement('button');
  button.type='button';button.className='product-series-button'+(group===name?' active':'');
  button.setAttribute('aria-pressed',String(group===name));button.textContent=name;
  button.onclick=()=>{group=name;renderProduct();groups.querySelector('[aria-pressed="true"]')?.focus()};
  groups.append(button);
 }
 const phase=$('gProductPhase').value,query=$('gProductSearch').value.trim().toLowerCase();
 const filtered=rows.filter(p=>p.phase===phase&&(group==='All G'||p.model.startsWith(group))&&p.model.toLowerCase().includes(query));
 $('gProductCount').textContent=filtered.length+' model'+(filtered.length===1?'':'s');
 grid.replaceChildren();
 for(const p of filtered){
  const row=document.createElement('div');
  row.className='product-model-row g-product-row';
  row.innerHTML=`<div><h3>${esc(p.model)}</h3><div class="muted">${esc(p.kw)} kW / ${esc(p.hp)} HP · ${esc(p.phase)} · ${esc(p.inlet)} × ${esc(p.outlet)}</div></div>
   <div class="product-model-actions g-product-actions">
    <button type="button" class="btn keysuite-cost-button product-action-button" data-g-cost>Cost</button>
    <div class="g-curve-slot">${hasCurve(p)?'<button type="button" class="btn secondary product-action-button" data-g-curve>Curve</button>':''}</div>
    <button type="button" class="btn action-assembly product-action-button" data-g-assembly>Assembly</button>
    <button type="button" class="btn action-quote product-action-button" data-g-quote>Quote</button>
   </div>`;
  row.querySelector('[data-g-cost]').onclick=()=>cost(p);
  if(hasCurve(p))row.querySelector('[data-g-curve]').onclick=()=>openCurve(p.model);
  row.querySelector('[data-g-assembly]').onclick=()=>assembly(p);
  row.querySelector('[data-g-quote]').onclick=()=>quote(p);
  grid.append(row);
 }
}
function renderSelector(){
 const body=$('gSelectorRows');if(!body)return;
 body.replaceChildren();
 for(const p of rows){
  const row=document.createElement('tr');
  row.innerHTML=`<td>${esc(p.model)}</td><td>${esc(p.kw)} kW / ${esc(p.hp)} HP</td><td>${esc(p.phase)}</td><td>${esc(p.inlet)} × ${esc(p.outlet)}</td>
   <td class="g-action-cell"><button class="btn keysuite-cost-button" data-g-cost>Cost</button></td>
   <td class="g-action-cell">${hasCurve(p)?'<button class="btn secondary" data-g-curve>Curve</button>':''}</td>
   <td class="g-action-cell"><button class="btn action-quote" data-g-quote>Quote</button></td>`;
  row.querySelector('[data-g-cost]').onclick=()=>cost(p);
  if(hasCurve(p))row.querySelector('[data-g-curve]').onclick=()=>openCurve(p.model,{origin:'selectorG'});
  row.querySelector('[data-g-quote]').onclick=()=>quote(p);
  body.append(row);
 }
}
function openCurve(name,options){
 const p=model(name);
 return hasCurve(p)&&window.KeySuiteGPerformance.open(p,options);
}
function renderPrices(){
 const body=$('gPriceRows');if(!body)return;body.innerHTML='';
 const c=currency(),field='price_'+c.toLowerCase(),rf='rarity_'+c.toLowerCase();
 const owner=String(access.role).toLowerCase()==='owner';
 const pairs=new Map();
 for(const p of rows){
  if(!pairs.has(p.base))pairs.set(p.base,{});
  pairs.get(p.base)[p.phase]=p;
 }
 for(const [base,pair] of pairs){
  const tr=document.createElement('tr');
  const phases=['1Ph','3Ph'],lock=owner?'':'disabled';
  const cell=phase=>pair[phase]?`<div class="bfi-price-pair"><div class="currency-price-input"><span>${c}</span><input type="number" min="0" step="0.01" data-price="${phase}" value="${Number(pair[phase][field]||0)}" aria-label="${esc(base)} ${phase} ${c} price" ${lock}></div><select aria-label="${esc(base)} ${phase} rarity" data-rarity="${phase}" ${lock}><option value="many">Many</option><option value="common">Common</option><option value="rare">Rare</option><option value="fixed">Fixed</option></select></div>`:'<span class="muted">N/A</span>';
  tr.innerHTML=`<td><b>${esc(base)}</b></td>${phases.map(phase=>`<td>${cell(phase)}</td>`).join('')}<td>${owner&&phases.every(phase=>pair[phase])?'<button class="btn" type="button" data-save>Save</button>':''}</td>`;
  for(const phase of phases){
   const select=tr.querySelector(`[data-rarity="${phase}"]`);
   if(select)select.value=pair[phase][rf]||'many';
  }
  const button=tr.querySelector('[data-save]');
  if(button)button.onclick=async()=>{
   const client=window.KeySuiteAuth?.getClient?.(),note=$('gPriceListMessage');
   if(!client||button.disabled)return;
   const entries=phases.map(phase=>({
    price:Number(tr.querySelector(`[data-price="${phase}"]`).value),
    rarity:tr.querySelector(`[data-rarity="${phase}"]`).value
   }));
   const report=(text,error)=>{note.textContent=text;note.className='auth-message show '+(error?'error':'info')};
   if(entries.some(entry=>!Number.isFinite(entry.price)||entry.price<0)){report('Enter valid non-negative phase prices.',true);return}
   button.disabled=true;
   try{
    const [single,three]=entries;
    const {error}=await client.rpc('keysuite_save_g_price_pair_v50071',{
     p_base_model:base,p_currency:c,p_price_1ph:single.price,p_price_3ph:three.price,
     p_rarity_1ph:single.rarity,p_rarity_3ph:three.rarity
    });
    if(error)throw error;
    for(const [i,phase] of phases.entries())Object.assign(pair[phase],{[field]:entries[i].price,[rf]:entries[i].rarity});
    if(window.KEYSUITE_SECURE_DATA)window.KEYSUITE_SECURE_DATA.gProducts=rows;
    report(base+' prices saved.',false);
   }catch(error){report(error.message||String(error),true)}
   finally{button.disabled=false}
  };
  body.appendChild(tr);
 }
 $('gPriceListCount').textContent=`${pairs.size} models · ${c}`;
}
function init(data,a){
 access=a||{};const fromDb=new Map((data?.gProducts||[]).map(p=>[p.id,p]));
 rows=source.map(p=>({...p,...fromDb.get(p.id)}));
 renderProduct();renderSelector();renderPrices();
 if(!fromDb.size)$('gPriceListMessage').textContent='G database rows are not installed. Apply the V5.00.68 migration before saving prices.';
}
document.addEventListener('DOMContentLoaded',()=>{
 $('gProductSearch')?.addEventListener('input',renderProduct);
 $('gProductPhase')?.addEventListener('change',renderProduct);
 renderProduct();renderSelector();renderPrices();
});
window.KeySuiteG={init,renderPrices,models:()=>rows,description,openCurve,cost,quote,assembly,message,
 curveOrigin:()=>window.KeySuiteGPerformance.origin(),quoteModel(name){const p=model(name);if(p)quote(p)}};
})();
