/* KeySuite V5.00.09 — BGF Price List from 004 - BGF - 261026 - V1.0.xlsx. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const SOURCE='004 - BGF -  261026 - V1.0.xlsx';
const FALLBACK=[
 {id:'bgf-350m',model:'BGF 350M',sourceModel:'BGF 350M',brandName:'B.G.Reich',sourceRow:4,motorKw:2.2,motorHp:3,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'},
 {id:'bgf-350e',model:'BGF 350E',sourceModel:'BGF 350E',brandName:'B.G.Reich',sourceRow:5,motorKw:3.7,motorHp:5,inlet:'G1½',outlet:'G1¼',stages:2,type:'Engine'},
 {id:'bgf-400',model:'BGF 400',sourceModel:'BGF 400',brandName:'B.G.Reich',sourceRow:6,motorKw:3,motorHp:4,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'},
 // Workbook B7 and user confirmation: BGF 550. Keep the existing database ID and prices.
 {id:'bgf-500',model:'BGF 550',sourceModel:'BGF 550',brandName:'B.G.Reich',sourceRow:7,motorKw:4,motorHp:5.5,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'}
];
let rows=FALLBACK.map(row=>({...row})),access={};
const role=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'viewer').toLowerCase(),canEdit=()=>role()==='owner';
const currency=()=>['MYR','USD','RMB'].includes($('bgfPriceCurrency')?.value)?$('bgfPriceCurrency').value:'MYR';
const priceKey=cur=>`price_${cur.toLowerCase()}`,rarityKey=cur=>`rarity_${cur.toLowerCase()}`;
function normalize(row){return {brandName:row.brand_name||row.brandName||FALLBACK.find(p=>p.id===row.id)?.brandName||'',id:row.id,model:row.id==='bgf-500'?'BGF 550':row.model,sourceModel:row.source_model||row.sourceModel||row.model,sourceRow:Number(row.source_row||row.sourceRow||0),motorKw:Number(row.motor_kw??row.motorKw??0),motorHp:Number(row.motor_hp??row.motorHp??0),inlet:row.inlet||'',outlet:row.outlet||'',stages:Number(row.stages||0),type:row.drive_type||row.type||'',price_myr:Number(row.price_myr||0),price_usd:Number(row.price_usd||0),price_rmb:Number(row.price_rmb||0),rarity_myr:String(row.rarity_myr||'common'),rarity_usd:String(row.rarity_usd||'common'),rarity_rmb:String(row.rarity_rmb||'common')}}
function message(text,type='info'){const box=$('bgfPriceListMessage');if(!box)return;box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message'}
// Workbook B10:B13 and B17:B20; B9 groups electric models. HP comes from D4:D7.
function description(p){return `B.G.Reich Close Coupled Pump Model: ${p.model}\n${p.type==='Engine'?`c/w ${p.motorHp}HP 3600rpm Diesel Engine`:`c/w ${p.motorHp}HP 2Pole Motor`}\nSuction x Discharge: ${p.inlet} x ${p.outlet}\nPump Material: CI / BZ / SS / Mech Seal`;}
function quote(p){
 const error=$('bgfQuoteMessage');
 const fail=text=>{error.textContent=`${p.model}: ${text}`;error.className='auth-message show error';error.setAttribute('role','alert');error.tabIndex=-1;error.scrollIntoView({block:'nearest'});error.focus({preventScroll:true});};
 try{
 const api=window.KeySuitePricing;
 if(!api?.findBgfPrice||!api?.bgfPriceProblem||!window.KeySuiteApp?.addExternalQuoteItem)throw new Error('Quotation services are not ready. Reload and try again.');
 const found=api.findBgfPrice(p.id),problem=api.bgfPriceProblem(p.id,found);
 if(problem){void window.KeySuiteManualPrice.offer({model:p.model,description:description(p),productFamily:'BGF',pricingSource:{product_family:'BGF',product_id:p.id}},problem);return;}
 const row=window.KeySuiteApp.addExternalQuoteItem({model:p.model,brand:p.brandName,qty:1,unitPrice:found.calc.finalPrice,description:description(p),pricingSource:api.sourceSnapshot(found),productFamily:'BGF',displayCapacity:true,capacityValue:$('ksDashFlow')?.value||'',capacityUnit:$('ksDashFlowUnit')?.value||'m3h',headValue:$('ksDashHead')?.value||'',headUnit:$('ksDashHeadUnit')?.value||'m'});
 if(!row)throw new Error('The quotation item could not be added.');
 error.textContent='';error.className='auth-message';if(typeof showPage==='function')showPage('quotation');else document.querySelector('[data-page="quotation"]')?.click();
 }catch(e){console.error('BGF quotation lookup failed',e);fail('Pricing lookup / system error. '+(e.message||'Try again or contact the administrator.'));}
}
function renderProduct(){
 const body=$('bgfProductRows');if(!body)return;body.innerHTML='';
 for(const p of rows){const tr=document.createElement('tr');tr.innerHTML=`<td><b>${esc(p.model)}</b></td><td>${esc(p.motorKw)} kW / ${esc(p.motorHp)} HP</td><td>${esc(p.type)}</td><td>${esc(p.inlet)} × ${esc(p.outlet)}</td><td style="width:96px;text-align:right"><button class="btn action-quote product-action-button" style="width:auto;min-width:72px;padding:7px 10px!important" type="button">Quote</button></td>`;tr.querySelector('button').onclick=()=>quote(p);body.appendChild(tr)}
}
document.addEventListener('DOMContentLoaded',renderProduct);
function render(){renderProduct();
 const body=$('bgfPriceRows');if(!body)return;const cur=currency(),pKey=priceKey(cur),rKey=rarityKey(cur);body.innerHTML='';
 let priced=0;
 for(const product of rows){const price=Number(product[pKey]||0);if(price>0)priced++;const tr=document.createElement('tr');tr.innerHTML=`<td><b>${esc(product.model)}</b></td><td>${product.motorKw} kW / ${product.motorHp} HP</td><td>${esc(product.type)}</td><td>${esc(product.inlet)} × ${esc(product.outlet)}</td><td>${product.stages}</td><td><div class="currency-price-input"><span>${cur}</span><input type="number" min="0" step="0.01" value="${price}" data-bgf-price aria-label="${esc(product.model)} ${cur} price" ${canEdit()?'':'disabled'}></div></td><td><select data-bgf-rarity ${canEdit()?'':'disabled'}><option value="many">Many</option><option value="common">Common</option><option value="rare">Rare</option><option value="fixed">Fixed</option></select></td><td><button class="btn" type="button" data-bgf-save ${canEdit()?'':'hidden'}>Save</button></td>`;tr.querySelector('[data-bgf-rarity]').value=String(product[rKey]||'common').toLowerCase();tr.querySelector('[data-bgf-save]')?.addEventListener('click',()=>save(product,tr,cur));body.appendChild(tr)}
 if($('bgfPriceListCount'))$('bgfPriceListCount').textContent=`${rows.length} models · ${cur} · ${priced} with positive source price`;
 window.dispatchEvent(new Event('keysuite-price-list-rendered'));
}
async function save(product,tr,cur){
 const client=window.KeySuiteAuth?.getClient?.(),button=tr.querySelector('[data-bgf-save]');if(!client){message('Supabase is not connected.','error');return}const price=Math.max(0,Number(tr.querySelector('[data-bgf-price]').value||0)),rarity=tr.querySelector('[data-bgf-rarity]').value,pKey=priceKey(cur),rKey=rarityKey(cur);button.disabled=true;button.textContent='Saving…';
 try{const {data,error}=await client.from('ks_products_bgf').update({[pKey]:price,[rKey]:rarity,updated_at:new Date().toISOString()}).eq('id',product.id).select('id').maybeSingle();if(error)throw error;if(!data?.id)throw new Error('The BGF row was not updated. Owner permission is required.');product[pKey]=price;product[rKey]=rarity;message(`${product.model} ${cur} source price saved.`);render()}
 catch(error){console.error(error);message(error?.message||'BGF price could not be saved.','error')}
 finally{button.disabled=false;button.textContent='Save'}
}
function init(data,nextAccess){access=nextAccess||{};const loaded=(data?.bgfProducts||[]).map(normalize),byId=new Map(loaded.map(row=>[row.id,row]));rows=FALLBACK.map(base=>normalize({...base,...(byId.get(base.id)||{})}));$('bgfPriceCurrency')?.addEventListener('change',render);render();if(!loaded.length)message(`BGF database rows are not installed. Apply the V5.00.06 migration. Prices in ${SOURCE} are blank and remain unpriced.`,'info');else message(`Verified against ${SOURCE}. Blank source prices remain 0 and are not quotable.`,'info')}
window.KeySuiteBGF={init,render,description,source:SOURCE,models:()=>rows.map(row=>({...row}))};
})();
