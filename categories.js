(() => {
  'use strict';

  let access=null;
  let selectedId='';
  let bound=false;

  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=(value,d=2)=>Number(value||0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=value=>`${num(Number(value||0)*100,2)}%`;
  const cash=value=>`RM ${num(value,2)}`;
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const categories=()=>window.KEYSUITE_SECURE_DATA?.categories||[];

  function message(text,type='info'){
    const box=byId('categoryMessage');if(!box)return;
    box.textContent=text||'';
    box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function setForm(category=null){
    selectedId=category?.id||'';
    byId('categoryFormTitle').textContent=category?'Edit Category':'New Category';
    byId('categoryNameInput').value=category?.name||'';
    byId('categoryMarginInput').value=num(Number(category?.margins?.CHC??category?.factors?.CHC??.38)*100,2).replace(/,/g,'');
    byId('categoryTransportInput').value=num(category?.transport??30,2).replace(/,/g,'');
    byId('categoryCommissionInput').value=num(Number(category?.commission??.03)*100,2).replace(/,/g,'');
    byId('categorySetDiscountInput').value=num(Number(category?.set_discount??.068)*100,2).replace(/,/g,'');
    byId('categoryFinalDiscountInput').value=num(Number(category?.final_discount??.08)*100,2).replace(/,/g,'');
    message('');renderRows();
    if(category)byId('categoryNameInput')?.focus();
  }

  function renderRows(){
    const body=byId('categoryRows');if(!body)return;
    const rows=categories();
    if(!rows.length){body.innerHTML='<tr><td colspan="4" class="category-empty">No pricing categories yet.</td></tr>';return}
    body.innerHTML=rows.map(category=>`<tr class="${category.id===selectedId?'category-row-selected':''}">
      <td><b>${esc(category.name)}</b><div class="muted">Commission ${esc(pct(category.commission))} · Set ${esc(pct(category.set_discount))} · Final ${esc(pct(category.final_discount))}</div></td>
      <td class="num">${esc(pct(category.margins?.CHC??category.factors?.CHC??0))}</td>
      <td class="num">${esc(cash(category.transport||0))}</td>
      <td><button class="btn secondary" type="button" data-category-edit="${esc(category.id)}">Edit</button></td>
    </tr>`).join('');
    body.querySelectorAll('[data-category-edit]').forEach(button=>button.addEventListener('click',()=>{
      const category=categories().find(item=>item.id===button.dataset.categoryEdit);if(category)setForm(category);
    }));
  }

  function mapRows(rows){
    return (rows||[]).map(c=>({
      id:c.id,
      name:c.category_name,
      final_discount:Number(c.final_discount||0),
      set_discount:Number(c.set_discount||0),
      commission:Number(c.commission||0),
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
    const transport=Number(byId('categoryTransportInput').value);
    if(!name){message('Category Name is required.','error');return}
    if(!Number.isFinite(transport)||transport<0){message('Transport must be RM0.00 or more.','error');return}
    let margin,commission,setDiscount,finalDiscount;
    try{
      margin=fieldPercent('categoryMarginInput','CHC Margin');
      commission=fieldPercent('categoryCommissionInput','Commission');
      setDiscount=fieldPercent('categorySetDiscountInput','Set Discount');
      finalDiscount=fieldPercent('categoryFinalDiscountInput','Final Discount');
    }catch(error){message(error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('Supabase is not connected.','error');return}
    const button=byId('saveCategoryRule'),original=button.textContent;button.disabled=true;button.textContent='Saving…';message('');
    try{
      const {error}=await client.rpc('keysuite_manage_pricing_category',{
        p_category_id:selectedId||null,
        p_category_name:name,
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
      message(`Category “${name}” saved. It is now available in Company & Pricing.`,'info');
    }catch(error){
      console.error(error);
      message(`${error.message||error}. Run the V1.14 Supabase migration first.`,'error');
    }finally{button.disabled=false;button.textContent=original}
  }

  function bind(){
    if(bound)return;bound=true;
    byId('categoryForm')?.addEventListener('submit',save);
    byId('newPricingCategory')?.addEventListener('click',()=>setForm(null));
    byId('cancelCategoryEdit')?.addEventListener('click',()=>setForm(null));
  }

  function render(){
    if(!isOwner())return;
    renderRows();
    const notice=byId('categoryAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Create or edit a category, then assign it to customers under Company &amp; Pricing.`;
  }

  function init(data,userAccess){
    access=userAccess||access;bind();render();
  }

  function pageShown(id){if(id==='categoryManagement')render()}

  window.KeySuiteCategories={init,pageShown,reload,render};
})();
