/* KeySuite V5.00.06 — BGF Price List from 004 - BGF - 261026 - V1.0.xlsx. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const SOURCE='004 - BGF -  261026 - V1.0.xlsx';
const FALLBACK=[
 {id:'bgf-350m',model:'BGF 350M',sourceModel:'BGF 350M',sourceRow:4,motorKw:2.2,motorHp:3,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'},
 {id:'bgf-350e',model:'BGF 350E',sourceModel:'BGF 350E',sourceRow:5,motorKw:3.7,motorHp:5,inlet:'G1½',outlet:'G1¼',stages:2,type:'Engine'},
 {id:'bgf-400',model:'BGF 400',sourceModel:'BGF 400',sourceRow:6,motorKw:3,motorHp:4,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'},
 // The approved release name and workbook summary say BGF 500. The workbook's detail row says BGF 550.
 {id:'bgf-500',model:'BGF 500',sourceModel:'BGF 550',sourceRow:7,motorKw:4,motorHp:5.5,inlet:'G1½',outlet:'G1¼',stages:2,type:'Motor'}
];
let rows=FALLBACK.map(row=>({...row})),access={};
const role=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'viewer').toLowerCase(),canEdit=()=>role()==='owner';
const currency=()=>['MYR','USD','RMB'].includes($('bgfPriceCurrency')?.value)?$('bgfPriceCurrency').value:'MYR';
const priceKey=cur=>`price_${cur.toLowerCase()}`,rarityKey=cur=>`rarity_${cur.toLowerCase()}`;
function normalize(row){return {id:row.id,model:row.model,sourceModel:row.source_model||row.sourceModel||row.model,sourceRow:Number(row.source_row||row.sourceRow||0),motorKw:Number(row.motor_kw??row.motorKw??0),motorHp:Number(row.motor_hp??row.motorHp??0),inlet:row.inlet||'',outlet:row.outlet||'',stages:Number(row.stages||0),type:row.drive_type||row.type||'',price_myr:Number(row.price_myr||0),price_usd:Number(row.price_usd||0),price_rmb:Number(row.price_rmb||0),rarity_myr:String(row.rarity_myr||'common'),rarity_usd:String(row.rarity_usd||'common'),rarity_rmb:String(row.rarity_rmb||'common')}}
function message(text,type='info'){const box=$('bgfPriceListMessage');if(!box)return;box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message'}
function renderProduct(){
 const body=$('bgfProductRows');if(!body)return;body.innerHTML='';
 for(const p of rows){const tr=document.createElement('tr');tr.innerHTML=`<td><b>${esc(p.model)}</b></td><td>${esc(p.motorKw)} kW / ${esc(p.motorHp)} HP</td><td>${esc(p.type)}</td><td>${esc(p.inlet)} × ${esc(p.outlet)}</td><td>${esc(p.stages)}</td><td><button class="btn secondary" type="button">View model</button></td>`;
 tr.querySelector('button').onclick=()=>{$('bgfModelDetails').innerHTML=`<h2>${esc(p.model)}</h2><p>${esc(p.motorKw)} kW / ${esc(p.motorHp)} HP · ${esc(p.type)} · ${esc(p.stages)} stages</p><p>Suction ${esc(p.inlet)} · Discharge ${esc(p.outlet)}</p><p class="muted">Source: ${esc(SOURCE)}, row ${esc(p.sourceRow)}${p.sourceModel!==p.model?` (source row labelled ${esc(p.sourceModel)})`:''}.</p><p>Flow, head, curves and dimensions: not supplied.</p>`;$('bgfModelDialog').showModal()};body.appendChild(tr)}
}
document.addEventListener('DOMContentLoaded',renderProduct);
function render(){renderProduct();
 const body=$('bgfPriceRows');if(!body)return;const cur=currency(),pKey=priceKey(cur),rKey=rarityKey(cur);body.innerHTML='';
 let priced=0;
 for(const product of rows){const price=Number(product[pKey]||0);if(price>0)priced++;const tr=document.createElement('tr'),sourceWarning=product.model==='BGF 500'&&product.sourceModel!=='BGF 500'?`<div class="pricelist-note">Workbook detail row says ${esc(product.sourceModel)}; approved model name is BGF 500.</div>`:'';tr.innerHTML=`<td><b>${esc(product.model)}</b>${sourceWarning}</td><td>${product.motorKw} kW / ${product.motorHp} HP</td><td>${esc(product.type)}</td><td>${esc(product.inlet)} × ${esc(product.outlet)}</td><td>${product.stages}</td><td><div class="currency-price-input"><span>${cur}</span><input type="number" min="0" step="0.01" value="${price}" data-bgf-price aria-label="${esc(product.model)} ${cur} price" ${canEdit()?'':'disabled'}></div></td><td><select data-bgf-rarity ${canEdit()?'':'disabled'}><option value="many">Many</option><option value="common">Common</option><option value="rare">Rare</option><option value="fixed">Fixed</option></select></td><td><button class="btn" type="button" data-bgf-save ${canEdit()?'':'hidden'}>Save</button></td>`;tr.querySelector('[data-bgf-rarity]').value=String(product[rKey]||'common').toLowerCase();tr.querySelector('[data-bgf-save]')?.addEventListener('click',()=>save(product,tr,cur));body.appendChild(tr)}
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
window.KeySuiteBGF={init,render,source:SOURCE,models:()=>rows.map(row=>({...row}))};
})();
