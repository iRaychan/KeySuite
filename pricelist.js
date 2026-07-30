(() => {
  'use strict';

  let access=null;
  let secureData={products:[],gwsProducts:[],usd_multiplier:5.8,rmb_multiplier:.65};
  let bound=false;
  const saveTimers=new Map();

  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const chcProducts=()=>secureData.products||[];
  const gwsProducts=()=>secureData.gwsProducts||[];
  const validCurrency=value=>['USD','RMB','MYR'].includes(String(value||'').toUpperCase())?String(value).toUpperCase():'USD';
  const currentCurrency=prefix=>validCurrency(el(`${prefix}PriceCurrency`)?.value||localStorage.getItem(`ks_${prefix}_price_currency`)||'USD');

  function message(prefix,text,type='info'){
    const box=el(`${prefix}PriceListMessage`);if(!box)return;
    box.textContent=text||'';
    box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function currencyPrices(product,currency){
    return product?.pricesByCurrency?.[currency]||{};
  }

  function priceInput(currency,value,variant,id){
    const shown=value===null||value===''||!Number.isFinite(Number(value))?'':Number(value).toFixed(2);
    return `<div class="currency-price-input"><span>${esc(currency)}</span><input type="number" min="0" step="0.01" value="${esc(shown)}" data-price-product="${esc(id)}" data-price-variant="${esc(variant)}" aria-label="${esc(variant)} price"></div>`;
  }

  function renderMultiplierInputs(prefix){
    const usd=el(`${prefix}UsdMultiplier`),rmb=el(`${prefix}RmbMultiplier`);
    if(usd&&document.activeElement!==usd)usd.value=Number(secureData.usd_multiplier??5.8).toFixed(4);
    if(rmb&&document.activeElement!==rmb)rmb.value=Number(secureData.rmb_multiplier??.65).toFixed(4);
  }

  function renderChcRows(){
    const body=el('chcPriceRows');if(!body)return;
    const search=String(el('chcPriceSearch')?.value||'').trim().toLowerCase();
    const currency=currentCurrency('chc');
    const rows=chcProducts().filter(product=>!search||String(product.model||'').toLowerCase().includes(search));
    body.innerHTML=rows.map(product=>{
      const prices=currencyPrices(product,currency);
      return `<tr data-chc-pricelist-row="${esc(product.id)}">
        <td><b>${esc(product.model)}</b></td>
        <td>${priceInput(currency,prices.CHC,'CHC',product.id)}</td>
        <td>${priceInput(currency,prices.CHCS,'CHCS',product.id)}</td>
        <td>${priceInput(currency,prices.CHCN,'CHCN',product.id)}</td>
        <td class="pricelist-row-actions"><button class="btn icon-save-button" type="button" data-save-chc-row="${esc(product.id)}" title="Save ${esc(product.model)}" aria-label="Save ${esc(product.model)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5z"></path><path d="M8 4v6h8V4"></path><path d="M8 20v-6h8v6"></path></svg></button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="5" class="muted">No matching CHC models.</td></tr>';
    el('chcPriceListCount').textContent=`Showing ${rows.length.toLocaleString('en-MY')} of ${chcProducts().length.toLocaleString('en-MY')} CHC models · Editing ${currency}`;
    body.querySelectorAll('[data-save-chc-row]').forEach(button=>button.addEventListener('click',()=>saveChcRow(button.dataset.saveChcRow,button)));
  }

  function renderGwsRows(){
    const body=el('gwsPriceRows');if(!body)return;
    const search=String(el('gwsPriceSearch')?.value||'').trim().toLowerCase();
    const currency=currentCurrency('gws');
    const rows=gwsProducts().filter(product=>!search||String(product.model||'').toLowerCase().includes(search));
    body.innerHTML=rows.map(product=>{
      const prices=currencyPrices(product,currency);
      return `<tr data-gws-pricelist-row="${esc(product.id)}">
        <td><b>${esc(product.model)}</b></td>
        <td>${priceInput(currency,prices['10'],'10',product.id)}</td>
        <td>${priceInput(currency,prices['16'],'16',product.id)}</td>
        <td>${priceInput(currency,prices['25'],'25',product.id)}</td>
        <td class="pricelist-row-actions"><button class="btn icon-save-button" type="button" data-save-gws-row="${esc(product.id)}" title="Save ${esc(product.model)}" aria-label="Save ${esc(product.model)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5z"></path><path d="M8 4v6h8V4"></path><path d="M8 20v-6h8v6"></path></svg></button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="5" class="muted">No matching GWS Tank models.</td></tr>';
    el('gwsPriceListCount').textContent=`Showing ${rows.length.toLocaleString('en-MY')} GWS Tank models · Editing ${currency}`;
    body.querySelectorAll('[data-save-gws-row]').forEach(button=>button.addEventListener('click',()=>saveGwsRow(button.dataset.saveGwsRow,button)));
  }

  function renderSettings(prefix){
    const select=el(`${prefix}PriceCurrency`);
    if(select){const saved=validCurrency(localStorage.getItem(`ks_${prefix}_price_currency`)||select.value||'USD');select.value=saved}
    renderMultiplierInputs(prefix);
  }

  function readPositive(id,label){
    const value=Number(el(id)?.value);
    if(!Number.isFinite(value)||value<=0)throw new Error(`${label} must be greater than zero.`);
    return value;
  }

  async function saveMultiplier(prefix,currency){
    if(!isOwner()){message(prefix,'Only the Owner can maintain Price List settings.','error');return}
    let value;
    try{value=readPositive(`${prefix}${currency==='USD'?'Usd':'Rmb'}Multiplier`,`${currency} rate`)}catch(error){message(prefix,error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message(prefix,'Supabase is not connected.','error');return}
    message(prefix,`Saving ${currency} rate…`,'info');
    try{
      const {data,error}=await client.rpc('keysuite_save_pricelist_multiplier',{p_currency:currency,p_multiplier:value});
      if(error)throw error;
      const saved=Array.isArray(data)?data[0]:data||{};
      secureData.usd_multiplier=Number(saved.usd_multiplier??secureData.usd_multiplier??5.8);
      secureData.rmb_multiplier=Number(saved.rmb_multiplier??secureData.rmb_multiplier??.65);
      if(window.KEYSUITE_SECURE_DATA){window.KEYSUITE_SECURE_DATA.usd_multiplier=secureData.usd_multiplier;window.KEYSUITE_SECURE_DATA.rmb_multiplier=secureData.rmb_multiplier}
      window.KeySuitePricing?.syncPriceListSettings?.({usd_multiplier:secureData.usd_multiplier,rmb_multiplier:secureData.rmb_multiplier});
      renderMultiplierInputs('chc');renderMultiplierInputs('gws');
      message(prefix,`${currency} saved: MYR ${Number(currency==='USD'?secureData.usd_multiplier:secureData.rmb_multiplier).toFixed(4)}.`,'info');
    }catch(error){console.error(error);message(prefix,`${error.message||error}. Run the V1.18 Supabase migration first.`,'error')}
  }

  function queueMultiplierSave(prefix,currency){
    const key=`${prefix}:${currency}`;
    clearTimeout(saveTimers.get(key));
    saveTimers.set(key,setTimeout(()=>saveMultiplier(prefix,currency),550));
  }

  function nullablePrice(value,label){
    const text=String(value??'').trim();if(text==='')return null;
    const number=Number(text);if(!Number.isFinite(number)||number<0)throw new Error(`${label} must be blank or zero and above.`);
    return number;
  }

  async function saveChcRow(productId,button){
    if(!isOwner()){message('chc','Only the Owner can maintain product prices.','error');return}
    const row=document.querySelector(`[data-chc-pricelist-row="${CSS.escape(productId)}"]`);if(!row)return;
    const currency=currentCurrency('chc');
    let chc,chcs,chcn;
    try{
      chc=nullablePrice(row.querySelector('[data-price-variant="CHC"]')?.value,'CHC Price');
      chcs=nullablePrice(row.querySelector('[data-price-variant="CHCS"]')?.value,'CHCS Price');
      chcn=nullablePrice(row.querySelector('[data-price-variant="CHCN"]')?.value,'CHCN Price');
    }catch(error){message('chc',error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('chc','Supabase is not connected.','error');return}
    const original=button.innerHTML;button.disabled=true;button.textContent='…';message('chc','');
    try{
      const {error}=await client.rpc('keysuite_save_chc_product_price_v118',{p_product_id:productId,p_currency:currency,p_chc_price:chc,p_chcs_price:chcs,p_chcn_price:chcn});
      if(error)throw error;
      const product=chcProducts().find(item=>item.id===productId);
      if(product){product.pricesByCurrency=product.pricesByCurrency||{};product.pricesByCurrency[currency]={CHC:chc,CHCS:chcs,CHCN:chcn}}
      window.KeySuitePricing?.render?.();
      message('chc',`${product?.model||'CHC model'} ${currency} prices saved.`,'info');
    }catch(error){console.error(error);message('chc',`${error.message||error}. Run the V1.18 Supabase migration first.`,'error')}
    finally{button.disabled=false;button.innerHTML=original}
  }

  async function saveGwsRow(productId,button){
    if(!isOwner()){message('gws','Only the Owner can maintain product prices.','error');return}
    const row=document.querySelector(`[data-gws-pricelist-row="${CSS.escape(productId)}"]`);if(!row)return;
    const currency=currentCurrency('gws');
    let p10,p16,p25;
    try{
      p10=nullablePrice(row.querySelector('[data-price-variant="10"]')?.value,'10 Bar Price');
      p16=nullablePrice(row.querySelector('[data-price-variant="16"]')?.value,'16 Bar Price');
      p25=nullablePrice(row.querySelector('[data-price-variant="25"]')?.value,'25 Bar Price');
    }catch(error){message('gws',error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('gws','Supabase is not connected.','error');return}
    const original=button.innerHTML;button.disabled=true;button.textContent='…';message('gws','');
    try{
      const {error}=await client.rpc('keysuite_save_gws_product_price_v118',{p_product_id:productId,p_currency:currency,p_price_10:p10,p_price_16:p16,p_price_25:p25});
      if(error)throw error;
      const product=gwsProducts().find(item=>item.id===productId);
      if(product){product.pricesByCurrency=product.pricesByCurrency||{};product.pricesByCurrency[currency]={'10':p10,'16':p16,'25':p25}}
      window.KeySuitePricing?.render?.();
      message('gws',`${product?.model||'GWS model'} ${currency} prices saved.`,'info');
    }catch(error){console.error(error);message('gws',`${error.message||error}. Run the V1.18 Supabase migration first.`,'error')}
    finally{button.disabled=false;button.innerHTML=original}
  }

  function bindCurrency(prefix,renderRows){
    el(`${prefix}PriceCurrency`)?.addEventListener('change',event=>{
      localStorage.setItem(`ks_${prefix}_price_currency`,validCurrency(event.target.value));
      renderRows();
    });
    el(`${prefix}UsdMultiplier`)?.addEventListener('input',()=>queueMultiplierSave(prefix,'USD'));
    el(`${prefix}RmbMultiplier`)?.addEventListener('input',()=>queueMultiplierSave(prefix,'RMB'));
  }

  function bind(){
    if(bound)return;bound=true;
    el('chcPriceSearch')?.addEventListener('input',renderChcRows);
    el('gwsPriceSearch')?.addEventListener('input',renderGwsRows);
    bindCurrency('chc',renderChcRows);
    bindCurrency('gws',renderGwsRows);
  }

  function render(){
    if(!isOwner())return;
    renderSettings('chc');renderSettings('gws');renderChcRows();renderGwsRows();
    const notice=el('priceListAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Select CHC or GWS Tank to maintain protected source prices.`;
  }

  function init(data,userAccess){secureData={...secureData,...(data||{})};access=userAccess||access;bind();render()}
  function pageShown(id){if(['priceListDashboard','chcPriceList','gwsPriceList'].includes(id))render()}

  window.KeySuitePriceList={init,pageShown,render};
})();
