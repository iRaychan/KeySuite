(() => {
  'use strict';

  let access=null;
  let selectedId='';
  let selectedProduct='CHC';
  let editing=false;
  let bound=false;
  const unlocked=new Set();

  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num=(value,d=2)=>Number(value||0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const isOwner=()=>String(access?.role||window.KEYSUITE_ACCESS?.role||'').toLowerCase()==='owner';
  const categories=()=>window.KEYSUITE_SECURE_DATA?.categories||[];

  const defaultRule=()=>({margin:.38,normal:0,rare:0,transport:30,commission:.03,setDiscount:.068,finalDiscount:.08,includeCommission:true,includeSetDiscount:true,includeFinalDiscount:true,includeFuelCharge:true});

  function message(text,type='info'){
    const box=byId('categoryMessage');if(!box)return;
    box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function normalizeRule(rule={},fallback=defaultRule()){
    return {
      margin:Number(rule.margin??fallback.margin),normal:Number(rule.normal??fallback.normal??0),rare:Number(rule.rare??fallback.rare??0),transport:Number(rule.transport??fallback.transport),commission:Number(rule.commission??fallback.commission),
      setDiscount:Number(rule.setDiscount??rule.set_discount??fallback.setDiscount),finalDiscount:Number(rule.finalDiscount??rule.final_discount??fallback.finalDiscount),
      includeCommission:rule.includeCommission??rule.include_commission??fallback.includeCommission,includeSetDiscount:rule.includeSetDiscount??rule.include_set_discount??fallback.includeSetDiscount,
      includeFinalDiscount:rule.includeFinalDiscount??rule.include_final_discount??fallback.includeFinalDiscount,includeFuelCharge:rule.includeFuelCharge??rule.include_fuel_charge??fallback.includeFuelCharge
    };
  }

  function ruleFor(category,product=selectedProduct){
    const fallback=defaultRule();
    if(product==='CHC'){
      fallback.margin=Number(category?.margins?.CHC??category?.factors?.CHC??fallback.margin);fallback.transport=Number(category?.transport??fallback.transport);fallback.commission=Number(category?.commission??fallback.commission);fallback.setDiscount=Number(category?.set_discount??fallback.setDiscount);fallback.finalDiscount=Number(category?.final_discount??fallback.finalDiscount);
    }
    return normalizeRule(category?.productRules?.[product]||{},fallback);
  }

  function currentCategory(){return categories().find(item=>item.id===selectedId)||null}

  function productRates(product=selectedProduct){
    const data=window.KEYSUITE_SECURE_DATA||{},family=String(product||'CHC').toUpperCase(),rates=data.productMultipliers?.[family]||{};
    return {USD:Number(rates.USD??data.usd_multiplier??5.8),RMB:Number(rates.RMB??data.rmb_multiplier??.65),MYR:1};
  }

  function setUnlockedState(key,on){
    if(on)unlocked.add(key);else unlocked.delete(key);
    const group=byId(`categoryLock_${key}`);if(!group)return;
    group.classList.toggle('unlocked',on);group.classList.toggle('locked',!on);
    group.querySelectorAll('input').forEach(input=>{if(input.type==='checkbox')input.disabled=!on;else input.readOnly=!on});
    group.querySelector('.category-hold-button')?.classList.toggle('hidden',on);
    const hint=group.querySelector('.hold-edit-hint');if(hint)hint.textContent=on?'Unlocked':'Hold 3s to edit';
  }

  function resetLocks(){unlocked.clear();['margin','normal','rare','transport','commission','setDiscount','finalDiscount','fuelCharge'].forEach(key=>setUnlockedState(key,false))}

  function setEditable(on){
    editing=!!on;
    const name=byId('categoryNameInput');if(name)name.disabled=!editing;
    const edit=byId('editCategoryRule');if(edit)edit.style.display=selectedId&&!editing?'inline-block':'none';
    const save=byId('saveCategoryRule');if(save)save.disabled=!editing;
    const cancel=byId('cancelCategoryEdit');if(cancel)cancel.disabled=!editing;
    byId('categoryForm')?.classList.toggle('category-form-readonly',!editing);resetLocks();
  }

  function showCurrencySummary(){
    const rates=productRates(),box=byId('categoryCurrencySummary');
    if(box)box.innerHTML=`<b>${esc(selectedProduct)} Price List Currency</b><span>USD (MYR ${num(rates.USD,2)})</span><span>RMB (MYR ${num(rates.RMB,2)})</span><span>MYR (MYR 1.00)</span>`;
  }

  function optionalFormulaParts(rule){
    const parts=[];if(rule.includeCommission)parts.push('÷ (1 − Commission)');if(rule.includeSetDiscount)parts.push('÷ (1 − Set Discount)');if(rule.includeFinalDiscount)parts.push('÷ (1 − Final Discount)');if(rule.includeFuelCharge)parts.push('+ Fuel Charge');parts.push('Round up to RM10');return parts;
  }

  function formulaText(rule,rarity){
    const parts=['Highest of USD × USD rate / RMB × RMB rate / MYR','÷ (1 − Margin)'];
    if(rarity==='common'||rarity==='rare')parts.push('÷ (1 − Normal)');if(rarity==='rare')parts.push('÷ (1 − Rare)');parts.push('+ Transport',...optionalFormulaParts(rule));return parts.join('  →  ');
  }

  function updateFormula(){
    const rule=readRule(false),box=byId('categoryFormulaPreview');if(!box)return;
    box.innerHTML=`<div class="category-formula-lines"><div class="category-formula-line"><b>Many</b>${esc(formulaText(rule,'many'))}</div><div class="category-formula-line"><b>Common</b>${esc(formulaText(rule,'common'))}</div><div class="category-formula-line"><b>Rare</b>${esc(formulaText(rule,'rare'))}</div></div>`;
  }

  function fillRule(category){
    const rule=ruleFor(category,selectedProduct);
    byId('categoryMarginInput').value=num(rule.margin*100,2).replace(/,/g,'');byId('categoryNormalInput').value=num(rule.normal*100,2).replace(/,/g,'');byId('categoryRareInput').value=num(rule.rare*100,2).replace(/,/g,'');byId('categoryTransportInput').value=num(rule.transport,2).replace(/,/g,'');byId('categoryCommissionInput').value=num(rule.commission*100,2).replace(/,/g,'');byId('categorySetDiscountInput').value=num(rule.setDiscount*100,2).replace(/,/g,'');byId('categoryFinalDiscountInput').value=num(rule.finalDiscount*100,2).replace(/,/g,'');
    byId('categoryCommissionEnabled').checked=!!rule.includeCommission;byId('categorySetDiscountEnabled').checked=!!rule.includeSetDiscount;byId('categoryFinalDiscountEnabled').checked=!!rule.includeFinalDiscount;byId('categoryFuelChargeEnabled').checked=!!rule.includeFuelCharge;
    byId('categoryProductHeading').textContent=`${selectedProduct} Pricing Rule`;if(byId('categoryMarginLabel'))byId('categoryMarginLabel').textContent=`${selectedProduct} Margin (%)`;
    document.querySelectorAll('[data-category-product]').forEach(button=>button.classList.toggle('active',button.dataset.categoryProduct===selectedProduct));
    resetLocks();showCurrencySummary();updateFormula();
  }

  function fill(category=null){
    selectedId=category?.id||'';const name=category?.name||'';
    byId('categoryFormTitle').textContent=category?'Edit Category':'New Category';byId('categorySelectedName').textContent=category?name:'New Category';byId('categoryNameInput').value=name;fillRule(category);renderRows();
  }

  function openCategory(category,forEdit=false){if(!category)return;fill(category);setEditable(forEdit);message(forEdit?'Editing enabled. Hold the lock control for 3 seconds to unlock a protected value.':'Category loaded. Hold a lock control for 3 seconds to edit a protected value.','info')}

  function newCategory(){selectedProduct='CHC';fill(null);setEditable(true);message('New category ready. Enter the Category Name, then hold a protected field for 3 seconds to change its default.','info');setTimeout(()=>byId('categoryNameInput')?.focus(),0)}

  function renderRows(){
    const body=byId('categoryRows');if(!body)return;const rows=categories();
    if(!rows.length){body.innerHTML='<tr><td class="category-empty">No pricing categories yet.</td></tr>';return}
    body.innerHTML=rows.map(category=>{const name=String(category.name||category.category_name||'Unnamed Category').trim()||'Unnamed Category';return `<tr class="${category.id===selectedId?'category-row-selected':''}"><td><button class="category-name-button ${category.id===selectedId?'active':''}" type="button" data-category-open="${esc(category.id)}"><span>${esc(name)}</span></button></td></tr>`}).join('');
  }

  function mapRows(rows){
    return (rows||[]).map(c=>{
      let rules=c.product_rules||{};if(typeof rules==='string'){try{rules=JSON.parse(rules)}catch(_){rules={}}}
      const normalize=code=>normalizeRule(rules?.[code]||{},{margin:Number(code==='CHC'?(c.chc_margin??c.chc_factor??.38):.38),normal:0,rare:0,transport:Number(c.transport??30),commission:Number(c.commission??.03),setDiscount:Number(c.set_discount??.068),finalDiscount:Number(c.final_discount??.08),includeCommission:true,includeSetDiscount:true,includeFinalDiscount:true,includeFuelCharge:true});
      return {id:c.id,name:String(c.category_name||c.name||'Unnamed Category'),productRules:{CHC:normalize('CHC'),GWS:normalize('GWS')},margins:{CHC:Number(c.chc_margin??c.chc_factor??0)},factors:{CHC:Number(c.chc_margin??c.chc_factor??0)},transport:Number(c.transport||0),commission:Number(c.commission||0),set_discount:Number(c.set_discount||0),final_discount:Number(c.final_discount||0)};
    });
  }

  async function reload(){
    const client=window.KeySuiteAuth?.getClient?.();if(!client)return [];
    const {data,error}=await client.from('ks_pricing_categories').select('*').order('category_name');if(error)throw error;
    const mapped=mapRows(data),target=window.KEYSUITE_SECURE_DATA?.categories;if(Array.isArray(target))target.splice(0,target.length,...mapped);window.KeySuitePricing?.render?.();return mapped;
  }

  function percentValue(id,label,validate=true){const value=Number(byId(id)?.value);if(validate&&(!Number.isFinite(value)||value<0||value>=100))throw new Error(`${label} must be from 0% to below 100%.`);return Number.isFinite(value)?value/100:0}
  function readRule(validate=true){const transport=Number(byId('categoryTransportInput')?.value||0);if(validate&&(!Number.isFinite(transport)||transport<0))throw new Error('Transport must be RM0.00 or more.');return {margin:percentValue('categoryMarginInput',`${selectedProduct} Margin`,validate),normal:percentValue('categoryNormalInput','Normal',validate),rare:percentValue('categoryRareInput','Rare',validate),transport:Number.isFinite(transport)?transport:0,commission:percentValue('categoryCommissionInput','Commission',validate),setDiscount:percentValue('categorySetDiscountInput','Set Discount',validate),finalDiscount:percentValue('categoryFinalDiscountInput','Final Discount',validate),includeCommission:!!byId('categoryCommissionEnabled')?.checked,includeSetDiscount:!!byId('categorySetDiscountEnabled')?.checked,includeFinalDiscount:!!byId('categoryFinalDiscountEnabled')?.checked,includeFuelCharge:!!byId('categoryFuelChargeEnabled')?.checked}}

  async function save(event){
    event.preventDefault();if(!editing)return;if(!isOwner()){message('Only the Owner can manage pricing categories.','error');return}
    const name=byId('categoryNameInput').value.trim();if(!name){message('Category Name is required.','error');return}
    let rule;try{rule=readRule(true)}catch(error){message(error.message,'error');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){message('Supabase is not connected.','error');return}
    const button=byId('saveCategoryRule'),original=button.textContent;button.disabled=true;button.textContent='Saving…';message('');
    try{
      const {error}=await client.rpc('keysuite_manage_pricing_category_v119',{p_category_id:selectedId||null,p_category_name:name,p_product_code:selectedProduct,p_margin:rule.margin,p_normal:rule.normal,p_rare:rule.rare,p_transport:rule.transport,p_commission:rule.commission,p_set_discount:rule.setDiscount,p_final_discount:rule.finalDiscount,p_include_commission:rule.includeCommission,p_include_set_discount:rule.includeSetDiscount,p_include_final_discount:rule.includeFinalDiscount,p_include_fuel_charge:rule.includeFuelCharge});
      if(error)throw error;const rows=await reload(),saved=(rows||categories()).find(item=>item.name.toLowerCase()===name.toLowerCase());openCategory(saved||rows[0],false);message(`${selectedProduct} pricing rule for “${name}” saved.`,'info');
    }catch(error){console.error(error);message(`${error.message||error}. Run the V1.20 Supabase migration first.`,'error')}
    finally{button.disabled=false;button.textContent=original}
  }

  function cancel(){if(selectedId){const category=currentCategory();if(category)openCategory(category,false)}else{const first=categories()[0];if(first)openCategory(first,false);else newCategory()}}

  function beginProtectedEdit(group,key){
    if(!isOwner()||unlocked.has(key))return;
    if(!editing){editing=true;const name=byId('categoryNameInput');if(name)name.disabled=false;const save=byId('saveCategoryRule');if(save)save.disabled=false;const cancelButton=byId('cancelCategoryEdit');if(cancelButton)cancelButton.disabled=false;const edit=byId('editCategoryRule');if(edit)edit.style.display='none';byId('categoryForm')?.classList.remove('category-form-readonly')}
    setUnlockedState(key,true);message(`${group.dataset.lockLabel||key} unlocked. Edit the value, then press Save Category or Cancel.`,'info');const input=group.querySelector('input:not([type="checkbox"])');input?.focus();input?.select();
  }

  function bindLongHold(target,callback){
    let timer=null,progress=null,start=0;
    const stop=()=>{if(timer)clearTimeout(timer);if(progress)clearInterval(progress);timer=progress=null;target.classList.remove('holding');const hint=target.querySelector('.hold-edit-hint');if(hint&&!target.closest('.unlocked'))hint.textContent='Hold 3s to edit'};
    target.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();start=Date.now();target.classList.add('holding');const hint=target.querySelector('.hold-edit-hint');progress=setInterval(()=>{if(hint)hint.textContent=`Hold ${Math.min(3,Math.max(1,Math.ceil((Date.now()-start)/1000)))}/3s`;},250);timer=setTimeout(()=>{stop();callback()},3000)});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>target.addEventListener(type,stop));target.addEventListener('contextmenu',event=>event.preventDefault());
  }

  function bind(){
    if(bound)return;bound=true;
    byId('categoryForm')?.addEventListener('submit',save);byId('newPricingCategory')?.addEventListener('click',newCategory);byId('cancelCategoryEdit')?.addEventListener('click',cancel);
    byId('editCategoryRule')?.addEventListener('click',()=>{if(!selectedId)return;setEditable(true);message('Editing enabled. Hold a lock control for 3 seconds to unlock a protected value.','info');byId('categoryNameInput')?.focus()});
    byId('categoryRows')?.addEventListener('click',event=>{const button=event.target.closest('[data-category-open]');if(!button)return;const category=categories().find(item=>item.id===button.dataset.categoryOpen);if(category)openCategory(category,false)});
    document.querySelectorAll('[data-category-product]').forEach(button=>button.addEventListener('click',()=>{selectedProduct=button.dataset.categoryProduct;fillRule(currentCategory());message(`${selectedProduct} pricing rule loaded. Hold a lock control for 3 seconds to edit it.`,'info')}));
    document.querySelectorAll('.category-lock-field').forEach(group=>{const key=group.dataset.lockKey,target=group.querySelector('.category-hold-button')||group;bindLongHold(target,()=>beginProtectedEdit(group,key))});
    ['categoryMarginInput','categoryNormalInput','categoryRareInput','categoryTransportInput','categoryCommissionInput','categorySetDiscountInput','categoryFinalDiscountInput','categoryCommissionEnabled','categorySetDiscountEnabled','categoryFinalDiscountEnabled','categoryFuelChargeEnabled'].forEach(id=>{byId(id)?.addEventListener('input',updateFormula);byId(id)?.addEventListener('change',updateFormula)});
  }

  function render(){
    if(!isOwner())return;const list=categories();if(selectedId&&!list.some(item=>item.id===selectedId))selectedId='';renderRows();showCurrencySummary();
    if(!selectedId&&list.length)openCategory(list[0],false);else if(selectedId){const category=currentCategory();if(category&&!editing){fill(category);setEditable(false)}}
    const notice=byId('categoryAccessNotice');if(notice)notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'Owner')}</b>. Select a Category Name on the left; its saved CHC/GWS rules will appear on the right.`;
  }

  function init(data,userAccess){access=userAccess||access;bind();render()}
  function pageShown(id){if(id==='categoryManagement')render()}
  window.KeySuiteCategories={init,pageShown,reload,render};
})();
