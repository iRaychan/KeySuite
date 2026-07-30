(() => {
  'use strict';

  let access=null;
  let secureData={products:[],chc_source_currency:'USD',usd_multiplier:5.8,rmb_multiplier:.65};
  let bound=false;

  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const products=()=>secureData.products||[];
  const currentCurrency=()=>String(el('chcPriceCurrency')?.value||secureData.chc_source_currency||'USD').toUpperCase()==='RMB'?'RMB':'USD';

  function message(text,type='info'){
    const box=el('chcPriceListMessage');if(!box)return;
    box.textContent=text||'';
    box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function productPrices(product){
    return product.prices||product.prices_usd||{CHC:null,CHCS:null,CHCN:null};
  }

  function priceInput(currency,value,material,id){
    const shown=value===null||value===''||!Number.isFinite(Number(value))?'':Number(value).toFixed(2);
    return `<div class="currency-price-input"><span>${esc(currency)}</span><input type="number" min="0" step="0.01" value="${esc(shown)}" data-price-product="${esc(id)}" data-price-material="${material}" aria-label="${material} price"></div>`;
  }

  function renderSettings(){
    if(!el('chcPriceCurrency'))return;
    el('chcPriceCurrency').value=String(secureData.chc_source_currency||secureData.source_currency||'USD').toUpperCase()==='RMB'?'RMB':'USD';
    el('chcUsdMultiplier').value=Number(secureData.usd_multiplier??5.8).toFixed(4);
    el('chcRmbMultiplier').value=Number(secureData.rmb_multiplier??.65).toFixed(4);
  }

  function renderRows(){
    const body=el('chcPriceRows');if(!body)return;
    const search=String(el('chcPriceSearch')?.value||'').trim().toLowerCase();
    const currency=currentCurrency();
    const rows=products().filter(product=>!search||String(product.model||'').toLowerCase().includes(search));
    body.innerHTML=rows.map(product=>{
      const prices=productPrices(product);
      return `<tr data-pricelist-row="${esc(product.id)}">
        <td><b>${esc(product.model)}</b></td>
        <td>${priceInput(currency,prices.CHC,'CHC',product.id)}</td>
        <td>${priceInput(currency,prices.CHCS,'CHCS',product.id)}</td>
        <td>${priceInput(currency,prices.CHCN,'CHCN',product.id)}</td>
        <td class="pricelist-row-actions"><button class="btn icon-save-button" type="button" data-save-price-row="${esc(product.id)}" title="Save ${esc(product.model)}" aria-label="Save ${esc(product.model)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h12l2 2v14H5z"></path><path d="M8 4v6h8V4"></path><path d="M8 20v-6h8v6"></path></svg></button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="5" class="muted">No matching CHC models.</td></tr>';
    el('chcPriceListCount').textContent=`Showing ${rows.length.toLocaleString('en-MY')} of ${products().length.toLocaleString('en-MY')} CHC models · Currency: ${currency}`;
    body.querySelectorAll('[data-save-price-row]').forEach(button=>button.addEventListener('click',()=>saveProductRow(button.dataset.savePriceRow,button)));
  }

  function readPositive(id,label){
    const value=Number(el(id)?.value);
    if(!Number.isFinite(value)||value<=0)throw new Error(`${label} must be greater than zero.`);
    return value;
  }

  async function saveSettings(button){
    if(!isOwner()){message('Only the Owner can maintain Price List settings.','error');return}
    let usd,rmb;
    try{usd=readPositive('chcUsdMultiplier','USD Multiply');rmb=readPositive('chcRmbMultiplier','RMB Multiply')}
    catch(error){message(error.message,'error');return}
    const currency=currentCurrency();
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('Supabase is not connected.','error');return}
    const original=button?.innerHTML;if(button){button.disabled=true;button.textContent='…'}message('');
    try{
      const {data,error}=await client.rpc('keysuite_save_chc_pricelist_settings',{
        p_source_currency:currency,
        p_usd_multiplier:usd,
        p_rmb_multiplier:rmb
      });
      if(error)throw error;
      const saved=Array.isArray(data)?data[0]:data||{};
      const next={
        chc_source_currency:String(saved.source_currency||currency).toUpperCase(),
        source_currency:String(saved.source_currency||currency).toUpperCase(),
        usd_multiplier:Number(saved.usd_multiplier??usd),
        rmb_multiplier:Number(saved.rmb_multiplier??rmb),
        currency_multiplier:Number(saved.active_multiplier??(currency==='RMB'?rmb:usd))
      };
      Object.assign(secureData,next);
      if(window.KEYSUITE_SECURE_DATA)Object.assign(window.KEYSUITE_SECURE_DATA,next);
      window.KeySuitePricing?.syncPriceListSettings?.(next);
      renderSettings();renderRows();
      message(`CHC Price List saved: ${next.chc_source_currency} · Multiply ${next.currency_multiplier.toFixed(4)}.`,'info');
    }catch(error){console.error(error);message(`${error.message||error}. Run the V1.16 Supabase migration first.`,'error')}
    finally{if(button){button.disabled=false;button.innerHTML=original}}
  }

  function nullablePrice(value,label){
    const text=String(value??'').trim();if(text==='')return null;
    const number=Number(text);if(!Number.isFinite(number)||number<0)throw new Error(`${label} must be blank or zero and above.`);
    return number;
  }

  async function saveProductRow(productId,button){
    if(!isOwner()){message('Only the Owner can maintain product prices.','error');return}
    const row=document.querySelector(`[data-pricelist-row="${CSS.escape(productId)}"]`);if(!row)return;
    let chc,chcs,chcn;
    try{
      chc=nullablePrice(row.querySelector('[data-price-material="CHC"]')?.value,'CHC Price');
      chcs=nullablePrice(row.querySelector('[data-price-material="CHCS"]')?.value,'CHCS Price');
      chcn=nullablePrice(row.querySelector('[data-price-material="CHCN"]')?.value,'CHCN Price');
    }catch(error){message(error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('Supabase is not connected.','error');return}
    const original=button.innerHTML;button.disabled=true;button.textContent='…';message('');
    try{
      const {error}=await client.rpc('keysuite_save_chc_product_price',{
        p_product_id:productId,
        p_chc_price:chc,
        p_chcs_price:chcs,
        p_chcn_price:chcn
      });
      if(error)throw error;
      const product=products().find(item=>item.id===productId);
      if(product){product.prices={CHC:chc,CHCS:chcs,CHCN:chcn};product.prices_usd=product.prices}
      window.KeySuitePricing?.render?.();
      message(`${product?.model||'CHC model'} prices saved.`,'info');
    }catch(error){console.error(error);message(`${error.message||error}. Run the V1.16 Supabase migration first.`,'error')}
    finally{button.disabled=false;button.innerHTML=original}
  }

  function bind(){
    if(bound)return;bound=true;
    el('chcPriceSearch')?.addEventListener('input',renderRows);
    el('chcPriceCurrency')?.addEventListener('change',renderRows);
    ['saveChcCurrency','saveChcUsdMultiplier','saveChcRmbMultiplier'].forEach(id=>el(id)?.addEventListener('click',event=>saveSettings(event.currentTarget)));
  }

  function render(){
    if(!isOwner())return;
    renderSettings();renderRows();
    const notice=el('priceListAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Select CHC to maintain its protected source price list.`;
  }

  function init(data,userAccess){secureData={...secureData,...(data||{})};access=userAccess||access;bind();render()}
  function pageShown(id){if(id==='priceListDashboard'||id==='chcPriceList')render()}

  window.KeySuitePriceList={init,pageShown,render};
})();
