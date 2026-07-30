(() => {
  'use strict';

  let access=null;
  let selectedId='';
  let bound=false;

  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=(value,d=2)=>Number(value||0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const categories=()=>window.KEYSUITE_SECURE_DATA?.categories||[];

  function message(text,type='info'){
    const box=byId('categoryMessage');if(!box)return;
    box.textContent=text||'';
    box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function pulseEditor(){
    const card=byId('categoryEditorCard');
    if(!card)return;
    card.classList.remove('category-editor-active');
    void card.offsetWidth;
    card.classList.add('category-editor-active');
    setTimeout(()=>card.classList.remove('category-editor-active'),900);
    card.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function defaultMultiplier(currency='USD'){
    if(currency==='USD')return Number(window.KEYSUITE_SECURE_DATA?.currency_multiplier||5.8);
    return .65;
  }

  function setForm(category=null,showFeedback=false){
    selectedId=category?.id||'';
    byId('categoryFormTitle').textContent=category?'Edit Category':'New Category';
    byId('categoryNameInput').value=category?.name||'';
    byId('categoryCommissionInput').value=num(Number(category?.commission??.03)*100,2).replace(/,/g,'');
    byId('categorySetDiscountInput').value=num(Number(category?.set_discount??.068)*100,2).replace(/,/g,'');
    byId('categoryFinalDiscountInput').value=num(Number(category?.final_discount??.08)*100,2).replace(/,/g,'');
    const currency=String(category?.source_currency||'USD').toUpperCase()==='RMB'?'RMB':'USD';
    byId('categoryCurrencyInput').value=currency;
    byId('categoryMultiplierInput').value=num(category?.currency_multiplier??defaultMultiplier(currency),4).replace(/,/g,'');
    byId('categoryMarginInput').value=num(Number(category?.margins?.CHC??category?.factors?.CHC??.38)*100,2).replace(/,/g,'');
    byId('categoryTransportInput').value=num(category?.transport??30,2).replace(/,/g,'');
    message(showFeedback?(category?'Category loaded for editing.':'New category form is ready.'):'','info');
    renderRows();
    if(showFeedback)pulseEditor();
    setTimeout(()=>byId('categoryNameInput')?.focus(),0);
  }

  function renderRows(){
    const body=byId('categoryRows');if(!body)return;
    const rows=categories();
    if(!rows.length){body.innerHTML='<tr><td colspan="2" class="category-empty">No pricing categories yet.</td></tr>';return}
    body.innerHTML=rows.map(category=>`<tr class="${category.id===selectedId?'category-row-selected':''}">
      <td><b>${esc(category.name)}</b></td>
      <td><button class="btn secondary" type="button" data-category-edit="${esc(category.id)}">Edit</button></td>
    </tr>`).join('');
    body.querySelectorAll('[data-category-edit]').forEach(button=>button.addEventListener('click',()=>{
      const category=categories().find(item=>item.id===button.dataset.categoryEdit);if(category)setForm(category,true);
    }));
  }

  function mapRows(rows){
    return (rows||[]).map(c=>({
      id:c.id,
      name:c.category_name,
      final_discount:Number(c.final_discount||0),
      set_discount:Number(c.set_discount||0),
      commission:Number(c.commission||0),
      source_currency:String(c.source_currency||'USD').toUpperCase(),
      currency_multiplier:Number(c.currency_multiplier||window.KEYSUITE_SECURE_DATA?.currency_multiplier||1),
      margins:{CHC:Number(c.chc_margin??c.chc_factor??0)},
      factors:{CHC:Number(c.chc_margin??c.chc_factor??0)},
      transport:Number(c.transport||0)
    }));
  }

  async function reload(){
    const client=window.KeySuiteAuth?.getClient?.();if(!client)return;
    const {data,error}=await client.from('ks_pricing_categories').select('*').order('category_name');
    if(error)throw error;
    const mapped=mapRows(data);
    const target=window.KEYSUITE_SECURE_DATA?.categories;
    if(Array.isArray(target))target.splice(0,target.length,...mapped);
    renderRows();
    window.KeySuitePricing?.render?.();
  }

  function fieldPercent(id,label){
    const value=Number(byId(id)?.value);
    if(!Number.isFinite(value)||value<0||value>=100)throw new Error(`${label} must be from 0% to below 100%.`);
    return value/100;
  }

  async function save(event){
    event.preventDefault();
    if(!isOwner()){message('Only the Owner can manage pricing categories.','error');return}
    const name=byId('categoryNameInput').value.trim();
    const sourceCurrency=String(byId('categoryCurrencyInput').value||'USD').toUpperCase();
    const multiplier=Number(byId('categoryMultiplierInput').value);
    const transport=Number(byId('categoryTransportInput').value);
    if(!name){message('Category Name is required.','error');byId('categoryNameInput').focus();return}
    if(!['USD','RMB'].includes(sourceCurrency)){message('Select USD or RMB.','error');return}
    if(!Number.isFinite(multiplier)||multiplier<=0){message('Multiply must be greater than zero.','error');return}
    if(!Number.isFinite(transport)||transport<0){message('Transport must be RM0.00 or more.','error');return}
    let margin,commission,setDiscount,finalDiscount;
    try{
      commission=fieldPercent('categoryCommissionInput','Commission');
      setDiscount=fieldPercent('categorySetDiscountInput','Set Discount');
      finalDiscount=fieldPercent('categoryFinalDiscountInput','Final Discount');
      margin=fieldPercent('categoryMarginInput','CHC Margin');
    }catch(error){message(error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('Supabase is not connected.','error');return}
    const button=byId('saveCategoryRule'),original=button.textContent;button.disabled=true;button.textContent='Saving…';message('');
    try{
      const {error}=await client.rpc('keysuite_manage_pricing_category',{
        p_category_id:selectedId||null,
        p_category_name:name,
        p_source_currency:sourceCurrency,
        p_currency_multiplier:multiplier,
        p_chc_margin:margin,
        p_transport:transport,
        p_commission:commission,
        p_set_discount:setDiscount,
        p_final_discount:finalDiscount
      });
      if(error)throw error;
      await reload();
      const saved=categories().find(item=>item.name.toLowerCase()===name.toLowerCase());
      selectedId=saved?.id||'';renderRows();
      message(`Category “${name}” saved and is available in Company & Pricing.`,'info');
    }catch(error){
      console.error(error);
      message(`${error.message||error}. Run the V1.15 Supabase migration first.`,'error');
    }finally{button.disabled=false;button.textContent=original}
  }

  function bind(){
    if(bound)return;bound=true;
    byId('categoryForm')?.addEventListener('submit',save);
    byId('newPricingCategory')?.addEventListener('click',event=>{event.preventDefault();setForm(null,true)});
    byId('cancelCategoryEdit')?.addEventListener('click',()=>setForm(null,true));
    byId('categoryCurrencyInput')?.addEventListener('change',event=>{
      byId('categoryMultiplierInput').value=num(defaultMultiplier(event.target.value),4).replace(/,/g,'');
    });
  }

  function render(){
    if(!isOwner())return;
    renderRows();
    const notice=byId('categoryAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Create or edit a category, then assign it to customers under Company &amp; Pricing.`;
  }

  function init(data,userAccess){access=userAccess||access;bind();render()}
  function pageShown(id){if(id==='categoryManagement')render()}

  window.KeySuiteCategories={init,pageShown,reload,render};
})();
