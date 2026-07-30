(() => {
  'use strict';

  let access=null;
  let secureData={products:[],gwsProducts:[],productMultipliers:{CHC:{USD:5.8,RMB:.65,MYR:1},GWS:{USD:5.8,RMB:.65,MYR:1}}};
  let bound=false;
  const saveTimers=new Map();
  const unlockedMultipliers=new Set();

  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const chcProducts=()=>secureData.products||[];
  const gwsProducts=()=>secureData.gwsProducts||[];
  const validCurrency=value=>['USD','RMB','MYR'].includes(String(value||'').toUpperCase())?String(value).toUpperCase():'USD';
  const validRarity=value=>['common','many','rare'].includes(String(value||'').toLowerCase())?String(value).toLowerCase():'many';
  const currentCurrency=prefix=>validCurrency(el(`${prefix}PriceCurrency`)?.value||localStorage.getItem(`ks_${prefix}_price_currency`)||'USD');
  const familyCode=prefix=>String(prefix||'chc').toUpperCase()==='GWS'?'GWS':'CHC';

  function message(prefix,text,type='info'){
    const box=el(`${prefix}PriceListMessage`);if(!box)return;
    box.textContent=text||'';
    box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function ratesFor(prefix){
    const family=familyCode(prefix);
    const rates=secureData.productMultipliers?.[family]||{};
    return {USD:Number(rates.USD??secureData.usd_multiplier??5.8),RMB:Number(rates.RMB??secureData.rmb_multiplier??.65),MYR:1};
  }

  function currencyPrices(product,currency){return product?.pricesByCurrency?.[currency]||{}}
  function rarityFor(product,variant){return validRarity(product?.rarityByVariant?.[variant]||'many')}

  function rarityOptions(selected){
    return [['common','Common'],['many','Many'],['rare','Rare']].map(([value,label])=>`<option value="${value}" ${value===selected?'selected':''}>${label}</option>`).join('');
  }

  function priceInput(currency,value,variant,id,rarity){
    const shown=value===null||value===''||!Number.isFinite(Number(value))?'':Number(value).toFixed(2);
    return `<div class="price-rarity-cell">
      <div class="currency-price-input"><span>${esc(currency)}</span><input type="number" min="0" step="0.01" value="${esc(shown)}" data-price-product="${esc(id)}" data-price-variant="${esc(variant)}" aria-label="${esc(variant)} price"></div>
      <select data-rarity-product="${esc(id)}" data-rarity-variant="${esc(variant)}" aria-label="${esc(variant)} rarity">${rarityOptions(validRarity(rarity))}</select>
    </div>`;
  }

  function setMultiplierUnlocked(prefix,currency,on){
    const key=`${prefix}:${currency}`;
    if(on)unlockedMultipliers.add(key);else unlockedMultipliers.delete(key);
    const group=el(`${prefix}MultiplierLock_${currency}`);
    const input=el(`${prefix}${currency==='USD'?'Usd':'Rmb'}Multiplier`);
    if(group){
      group.classList.toggle('unlocked',on);
      group.classList.toggle('locked',!on);
      const hint=group.querySelector('.hold-edit-hint');if(hint)hint.textContent=on?'Unlocked':'Hold 3s to edit';
    }
    if(input)input.readOnly=!on;
  }

  function renderMultiplierInputs(prefix){
    const rates=ratesFor(prefix);
    const usd=el(`${prefix}UsdMultiplier`),rmb=el(`${prefix}RmbMultiplier`);
    if(usd&&document.activeElement!==usd)usd.value=Number(rates.USD).toFixed(4);
    if(rmb&&document.activeElement!==rmb)rmb.value=Number(rates.RMB).toFixed(4);
    ['USD','RMB'].forEach(currency=>{
      const key=`${prefix}:${currency}`;
      setMultiplierUnlocked(prefix,currency,unlockedMultipliers.has(key));
    });
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
        <td>${priceInput(currency,prices.CHC,'CHC',product.id,rarityFor(product,'CHC'))}</td>
        <td>${priceInput(currency,prices.CHCS,'CHCS',product.id,rarityFor(product,'CHCS'))}</td>
        <td>${priceInput(currency,prices.CHCN,'CHCN',product.id,rarityFor(product,'CHCN'))}</td>
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
        <td>${priceInput(currency,prices['10'],'10',product.id,rarityFor(product,'10'))}</td>
        <td>${priceInput(currency,prices['16'],'16',product.id,rarityFor(product,'16'))}</td>
        <td>${priceInput(currency,prices['25'],'25',product.id,rarityFor(product,'25'))}</td>
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
    const key=`${prefix}:${currency}`;
    if(!unlockedMultipliers.has(key))return;
    let value;
    try{value=readPositive(`${prefix}${currency==='USD'?'Usd':'Rmb'}Multiplier`,`${currency} rate`)}catch(error){message(prefix,error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message(prefix,'Supabase is not connected.','error');return}
    const family=familyCode(prefix);
    message(prefix,`Saving ${family} ${currency} rate…`,'info');
    try{
      const {data,error}=await client.rpc('keysuite_save_product_pricelist_multiplier_v119',{p_product_code:family,p_currency:currency,p_multiplier:value});
      if(error)throw error;
      const saved=Array.isArray(data)?data[0]:data||{};
      secureData.productMultipliers=secureData.productMultipliers||{};
      secureData.productMultipliers[family]={USD:Number(saved.usd_multiplier??ratesFor(prefix).USD),RMB:Number(saved.rmb_multiplier??ratesFor(prefix).RMB),MYR:1};
      if(window.KEYSUITE_SECURE_DATA){window.KEYSUITE_SECURE_DATA.productMultipliers=secureData.productMultipliers}
      window.KeySuitePricing?.syncPriceListSettings?.({productMultipliers:secureData.productMultipliers});
      window.KeySuiteCategories?.render?.();
      renderMultiplierInputs(prefix);
      message(prefix,`${family} ${currency} saved: MYR ${Number(currency==='USD'?secureData.productMultipliers[family].USD:secureData.productMultipliers[family].RMB).toFixed(4)}.`,'info');
    }catch(error){console.error(error);message(prefix,`${error.message||error}. Run the V1.19 Supabase migration first.`,'error')}
  }

  function queueMultiplierSave(prefix,currency){
    const key=`${prefix}:${currency}`;
    if(!unlockedMultipliers.has(key))return;
    clearTimeout(saveTimers.get(key));
    saveTimers.set(key,setTimeout(()=>saveMultiplier(prefix,currency),650));
  }

  function bindMultiplierLongPress(group){
    const prefix=group.dataset.multiplierPrefix;
    const currency=group.dataset.multiplierCurrency;
    const key=`${prefix}:${currency}`;
    let timer=null,pointerId=null;
    const cancel=()=>{
      if(timer){clearTimeout(timer);timer=null}
      group.classList.remove('holding');
      if(pointerId!==null){try{group.releasePointerCapture(pointerId)}catch(_){ }pointerId=null}
    };
    group.addEventListener('pointerdown',event=>{
      if(!isOwner()||unlockedMultipliers.has(key))return;
      if(event.pointerType==='mouse'&&event.button!==0)return;
      pointerId=event.pointerId;
      try{group.setPointerCapture(pointerId)}catch(_){ }
      group.classList.add('holding');
      timer=setTimeout(()=>{
        timer=null;group.classList.remove('holding');setMultiplierUnlocked(prefix,currency,true);
        message(prefix,`${familyCode(prefix)} ${currency} rate unlocked. It will save automatically after editing.`,'info');
        el(`${prefix}${currency==='USD'?'Usd':'Rmb'}Multiplier`)?.focus();
      },3000);
    });
    ['pointerup','pointercancel'].forEach(type=>group.addEventListener(type,cancel));
    group.addEventListener('contextmenu',event=>event.preventDefault());
  }

  function nullablePrice(value,label){
    const text=String(value??'').trim();if(text==='')return null;
    const number=Number(text);if(!Number.isFinite(number)||number<0)throw new Error(`${label} must be blank or zero and above.`);
    return number;
  }

  function rowRarity(row,variant){return validRarity(row.querySelector(`[data-rarity-variant="${CSS.escape(variant)}"]`)?.value||'many')}

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
    const rarities={CHC:rowRarity(row,'CHC'),CHCS:rowRarity(row,'CHCS'),CHCN:rowRarity(row,'CHCN')};
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('chc','Supabase is not connected.','error');return}
    const original=button.innerHTML;button.disabled=true;button.textContent='…';message('chc','');
    try{
      const {error}=await client.rpc('keysuite_save_chc_product_price_v119',{
        p_product_id:productId,p_currency:currency,p_chc_price:chc,p_chcs_price:chcs,p_chcn_price:chcn,
        p_chc_rarity:rarities.CHC,p_chcs_rarity:rarities.CHCS,p_chcn_rarity:rarities.CHCN
      });
      if(error)throw error;
      const product=chcProducts().find(item=>item.id===productId);
      if(product){
        product.pricesByCurrency=product.pricesByCurrency||{};
        product.pricesByCurrency[currency]={CHC:chc,CHCS:chcs,CHCN:chcn};
        product.rarityByVariant={...product.rarityByVariant,...rarities};
      }
      window.KeySuitePricing?.render?.();
      message('chc',`${product?.model||'CHC model'} ${currency} prices and rarity saved.`,'info');
    }catch(error){console.error(error);message('chc',`${error.message||error}. Run the V1.19 Supabase migration first.`,'error')}
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
    const rarities={'10':rowRarity(row,'10'),'16':rowRarity(row,'16'),'25':rowRarity(row,'25')};
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('gws','Supabase is not connected.','error');return}
    const original=button.innerHTML;button.disabled=true;button.textContent='…';message('gws','');
    try{
      const {error}=await client.rpc('keysuite_save_gws_product_price_v119',{
        p_product_id:productId,p_currency:currency,p_price_10:p10,p_price_16:p16,p_price_25:p25,
        p_rarity_10:rarities['10'],p_rarity_16:rarities['16'],p_rarity_25:rarities['25']
      });
      if(error)throw error;
      const product=gwsProducts().find(item=>item.id===productId);
      if(product){
        product.pricesByCurrency=product.pricesByCurrency||{};
        product.pricesByCurrency[currency]={'10':p10,'16':p16,'25':p25};
        product.rarityByVariant={...product.rarityByVariant,...rarities};
      }
      window.KeySuitePricing?.render?.();
      message('gws',`${product?.model||'GWS model'} ${currency} prices and rarity saved.`,'info');
    }catch(error){console.error(error);message('gws',`${error.message||error}. Run the V1.19 Supabase migration first.`,'error')}
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
    document.querySelectorAll('.pricelist-multiplier-lock').forEach(bindMultiplierLongPress);
  }

  function render(){
    if(!isOwner())return;
    renderSettings('chc');renderSettings('gws');renderChcRows();renderGwsRows();
    const notice=el('priceListAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Each product family keeps its own USD/RMB rates and Common/Many/Rare settings.`;
  }

  function init(data,userAccess){secureData={...secureData,...(data||{})};access=userAccess||access;bind();render()}
  function pageShown(id){if(['priceListDashboard','chcPriceList','gwsPriceList'].includes(id))render()}

  window.KeySuitePriceList={init,pageShown,render};
})();
