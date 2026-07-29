(() => {
  'use strict';

  const data = window.KEYSUITE_MASTER_DATA || {};
  const $ = id => document.getElementById(id);
  const money = n => `RM ${Number(n || 0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = (n,d=2) => Number(n || 0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct = n => `${num(Number(n || 0) * 100,1)}%`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const today = () => new Date().toISOString().slice(0,10);

  const state = {
    companyId: data.companies?.[0]?.id || '',
    categoryId: data.categories?.[0]?.id || '',
    quoteItems: [],
    visiblePricingRows: []
  };

  function categoryForCompany(company){
    return (data.categories || []).find(c => c.name === company?.category) || data.categories?.[0] || null;
  }

  function categoryById(id){
    return (data.categories || []).find(c => c.id === id) || data.categories?.[0] || null;
  }

  function companyById(id){
    return (data.companies || []).find(c => c.id === id) || data.companies?.[0] || null;
  }

  function priceCalculation(sourceUsd, material='CHC', category=categoryById(state.categoryId)){
    if(!Number.isFinite(Number(sourceUsd))) return null;
    const usd = Number(sourceUsd);
    const multiplier = Number(data.currency_multiplier || 1);
    const factor = Number(category?.factors?.[material] ?? category?.factors?.CHC ?? 1);
    const transport = Number(category?.transport || 0);
    const commission = Number(category?.commission || 0);
    const setDiscount = Number(category?.set_discount || 0);
    const finalDiscount = Number(category?.final_discount || 0);
    const baseMyr = usd * multiplier;
    const landedCost = baseMyr * factor + transport;
    const quotationList = landedCost / Math.max(0.0001,1-commission) / Math.max(0.0001,1-setDiscount);
    const finalPrice = quotationList * (1-finalDiscount);
    return {usd,multiplier,factor,transport,commission,setDiscount,finalDiscount,baseMyr,landedCost,quotationList,finalPrice};
  }

  function allPricedVariants(){
    const rows=[];
    for(const p of data.products || []){
      for(const material of ['CHC','CHCS','CHCN']){
        const sourceUsd = p.prices_usd?.[material];
        if(Number.isFinite(Number(sourceUsd)) && sourceUsd !== null){
          rows.push({product:p,material,sourceUsd:Number(sourceUsd)});
        }
      }
    }
    return rows;
  }

  function allVariants(includeUnpriced=false){
    const rows=[];
    for(const p of data.products || []){
      for(const material of ['CHC','CHCS','CHCN']){
        const sourceUsd = p.prices_usd?.[material];
        const priced = Number.isFinite(Number(sourceUsd)) && sourceUsd !== null;
        if(priced || includeUnpriced) rows.push({product:p,material,sourceUsd:priced?Number(sourceUsd):null});
      }
    }
    return rows;
  }

  function formulaText(){
    return 'Final Price = (((USD × Multiplier × Factor) + Transport) ÷ (1 − Commission) ÷ (1 − Set Discount)) × (1 − Final Discount)';
  }

  function initNavigation(){
    document.querySelectorAll('nav button[data-page], [data-go]').forEach(btn => {
      btn.addEventListener('click', () => openPage(btn.dataset.page || btn.dataset.go));
    });
  }

  function openPage(id){
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active',p.id===id));
    document.querySelectorAll('nav button[data-page]').forEach(b => b.classList.toggle('active',b.dataset.page===id));
    if(id==='pricing') renderPricing();
    if(id==='quotation') renderQuoteItems();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function fillCompanySelects(){
    const options=(data.companies || []).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    ['companySelect','pricingCompany'].forEach(id=>{if($(id)){$(id).innerHTML=options;$(id).value=state.companyId;}});
    $('companySelect')?.addEventListener('change',e=>{state.companyId=e.target.value;syncCompanyCategory();renderCompany();});
    $('pricingCompany')?.addEventListener('change',e=>{state.companyId=e.target.value;syncCompanyCategory();renderPricing();});
  }

  function fillCategorySelects(){
    const options=(data.categories || []).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    ['pricingCategory','quoteCategory'].forEach(id=>{if($(id)){$(id).innerHTML=options;$(id).value=state.categoryId;}});
    $('pricingCategory')?.addEventListener('change',e=>{state.categoryId=e.target.value;$('quoteCategory').value=state.categoryId;renderPricing();renderDashboard();});
    $('quoteCategory')?.addEventListener('change',e=>{state.categoryId=e.target.value;$('pricingCategory').value=state.categoryId;renderQuoteItems();renderDashboard();});
  }

  function fillPreparedBy(){
    const options=(data.users || []).map(u=>`<option value="${esc(u.id)}">${esc(`${u.prefix || ''} ${u.name || ''}`.trim())}</option>`).join('');
    $('preparedBy').innerHTML=options;
  }

  function syncCompanyCategory(){
    const cat=categoryForCompany(companyById(state.companyId));
    if(cat) state.categoryId=cat.id;
    if($('pricingCategory')) $('pricingCategory').value=state.categoryId;
    if($('quoteCategory')) $('quoteCategory').value=state.categoryId;
    if($('companySelect')) $('companySelect').value=state.companyId;
    if($('pricingCompany')) $('pricingCompany').value=state.companyId;
  }

  function renderDashboard(){
    const priced=allPricedVariants();
    $('mCompanies').textContent=(data.companies || []).length;
    $('mUsers').textContent=(data.users || []).length;
    $('mProducts').textContent=(data.products || []).length;
    $('mPriced').textContent=priced.length;
    $('formulaText').textContent=formulaText();
    const company=companyById(state.companyId);
    const cat=categoryById(state.categoryId);
    $('linkStatus').innerHTML=`<b>${esc(company?.name || '-')}</b> is linked to category <b>${esc(cat?.name || '-')}</b>. CHC factor <b>${num(cat?.factors?.CHC || 0,2)}</b> is applied to the CHC source price list.`;
    const basis=[
      ['USD Multiplier',num(data.currency_multiplier || 0,2)],
      ['CHC Factor',num(cat?.factors?.CHC || 0,2)],
      ['Transport',money(cat?.transport || 0)],
      ['Commission',pct(cat?.commission || 0)],
      ['Set Discount',pct(cat?.set_discount || 0)],
      ['Final Discount',pct(cat?.final_discount || 0)],
      ['Priced Models',new Set(priced.map(r=>r.product.id)).size],
      ['Priced Variants',priced.length]
    ];
    $('pricingBasis').innerHTML=basis.map(([k,v])=>`<div class="metric"><span>${esc(k)}</span><b style="font-size:21px">${esc(v)}</b></div>`).join('');
  }

  function renderCompany(){
    const c=companyById(state.companyId);
    if(!c) return;
    $('companySummary').innerHTML=[
      ['Company ID',c.id],['Category',c.category],['Phone',c.phone || '-'],['Term',`${c.term_days || 0} days`],['TIN',c.tin || '-'],['Business Reg No.',c.business_registration_no || '-'],['SST No.',c.sst_no || '-'],['MSIC Code',c.msic_code || '-'],['Business Activities',c.business_activities || '-']
    ].map(([k,v])=>`<div class="kv"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
    const users=(data.users || []).filter(u=>u.company_id===c.id);
    $('companyUsers').innerHTML=users.length?users.map(u=>`<div class="user-row"><div><b>${esc(`${u.prefix || ''} ${u.name || ''}`.trim())}</b><div class="muted">${esc(u.id)}</div></div><div>${esc(u.phone || '-')}</div><div>${esc(u.email || '-')}</div></div>`).join(''):'<p class="muted">No users linked.</p>';
  }

  function renderCategoryRule(){
    const c=companyById(state.companyId);
    const cat=categoryById(state.categoryId);
    $('categoryRule').innerHTML=`<b>${esc(c?.name || '-')}</b> → <b>${esc(cat?.name || '-')}</b> · CHC factor ${num(cat?.factors?.CHC || 0,2)} · Transport ${money(cat?.transport || 0)} · Commission ${pct(cat?.commission || 0)} · Set Discount ${pct(cat?.set_discount || 0)} · Final Discount ${pct(cat?.final_discount || 0)}`;
  }

  function renderPricing(){
    syncCompanyCategory();
    renderCategoryRule();
    const includeUnpriced=$('showUnpriced').checked;
    const search=$('modelSearch').value.trim().toLowerCase();
    const cat=categoryById(state.categoryId);
    const rows=allVariants(includeUnpriced).filter(r=>!search || r.product.model.toLowerCase().includes(search) || r.product.id.toLowerCase().includes(search));
    state.visiblePricingRows=rows;
    $('pricingRows').innerHTML=rows.map((r,index)=>{
      const calc=r.sourceUsd===null?null:priceCalculation(r.sourceUsd,r.material,cat);
      return `<tr>
        <td>${esc(r.product.id)}</td>
        <td><b>${esc(r.product.model)}</b></td>
        <td><span class="badge ${r.material==='CHC'?'green':r.material==='CHCS'?'orange':''}">${esc(r.material)}</span></td>
        <td class="num">${calc?num(calc.usd,2):'<span class="badge red">Unavailable</span>'}</td>
        <td class="num">${calc?money(calc.baseMyr):'-'}</td>
        <td class="num">${calc?money(calc.landedCost):'-'}</td>
        <td class="num">${calc?money(calc.quotationList):'-'}</td>
        <td class="num"><b>${calc?money(calc.finalPrice):'-'}</b></td>
        <td>${calc?`<button class="btn green small" data-add-price="${index}">Add</button>`:''}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="9" class="muted">No matching products.</td></tr>';
    $('pricingCount').textContent=`Showing ${rows.length.toLocaleString('en-MY')} material variants. ${allPricedVariants().length} variants currently contain source prices.`;
    document.querySelectorAll('[data-add-price]').forEach(btn=>btn.addEventListener('click',()=>addPricingRowToQuote(Number(btn.dataset.addPrice))));
  }

  function addPricingRowToQuote(index){
    const r=state.visiblePricingRows[index];
    if(!r || r.sourceUsd===null) return;
    const calc=priceCalculation(r.sourceUsd,r.material,categoryById(state.categoryId));
    state.quoteItems.push({
      id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      productId:r.product.id,
      model:r.product.model,
      material:r.material,
      description:`B.G.Reich Vertical Multistage Pump Model: ${r.material==='CHC'?r.product.model:r.product.model.replace(/^CHC/,r.material)}\nPrice basis: ${r.material} / Category ${categoryById(state.categoryId)?.name || ''}`,
      qty:1,
      unitPrice:calc.finalPrice
    });
    saveQuoteState();
    openPage('quotation');
  }

  function addBlankItem(){
    state.quoteItems.push({id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,productId:'',model:'Custom Item',material:'',description:'',qty:1,unitPrice:0});
    renderQuoteItems();
  }

  function renderQuoteItems(){
    const wrap=$('quoteItems');
    if(!state.quoteItems.length){wrap.innerHTML='<div class="notice">No items yet. Open Company & Pricing and press Add, or create a blank item.</div>';updateQuoteTotal();return;}
    wrap.innerHTML=state.quoteItems.map((item,index)=>`<div class="quote-line" data-quote-row="${index}">
      <div><label>Model</label><input value="${esc(item.model)}" data-field="model"></div>
      <div class="desc"><label>Description</label><textarea data-field="description">${esc(item.description)}</textarea></div>
      <div><label>Qty</label><input type="number" min="0" step="1" value="${Number(item.qty || 0)}" data-field="qty"></div>
      <div><label>Unit Price</label><input type="number" min="0" step="0.01" value="${Number(item.unitPrice || 0).toFixed(2)}" data-field="unitPrice"></div>
      <div><label>Total</label><input value="${money(Number(item.qty || 0)*Number(item.unitPrice || 0))}" readonly data-total></div>
      <div class="remove"><label>&nbsp;</label><button class="btn red small" data-remove="${index}">×</button></div>
    </div>`).join('');
    wrap.querySelectorAll('[data-quote-row]').forEach(row=>{
      const index=Number(row.dataset.quoteRow);
      row.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{
        const field=input.dataset.field;
        state.quoteItems[index][field]=['qty','unitPrice'].includes(field)?Number(input.value || 0):input.value;
        row.querySelector('[data-total]').value=money(Number(state.quoteItems[index].qty || 0)*Number(state.quoteItems[index].unitPrice || 0));
        updateQuoteTotal();
        saveQuoteState();
      }));
    });
    wrap.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{state.quoteItems.splice(Number(btn.dataset.remove),1);saveQuoteState();renderQuoteItems();}));
    updateQuoteTotal();
  }

  function updateQuoteTotal(){
    const total=state.quoteItems.reduce((sum,i)=>sum+Number(i.qty || 0)*Number(i.unitPrice || 0),0);
    $('quoteTotal').textContent=money(total);
    return total;
  }

  function nextQuoteNo(){
    const now=new Date();
    const yy=String(now.getFullYear()).slice(-2);
    const mm=String(now.getMonth()+1).padStart(2,'0');
    const sequence=Number(localStorage.getItem('keysuite_v100_quote_sequence') || 1);
    return `R-${yy}${mm}-${String(sequence).padStart(4,'0')}`;
  }

  function saveQuoteState(){
    const payload={
      quoteNo:$('quoteNo')?.value || '',quoteDate:$('quoteDate')?.value || '',preparedBy:$('preparedBy')?.value || '',categoryId:state.categoryId,
      customer:$('quoteCustomer')?.value || '',project:$('quoteProject')?.value || '',items:state.quoteItems
    };
    localStorage.setItem('keysuite_v100_quote_draft',JSON.stringify(payload));
  }

  function loadQuoteState(){
    try{
      const saved=JSON.parse(localStorage.getItem('keysuite_v100_quote_draft') || 'null');
      if(saved){
        $('quoteNo').value=saved.quoteNo || nextQuoteNo();$('quoteDate').value=saved.quoteDate || today();$('preparedBy').value=saved.preparedBy || data.users?.[0]?.id || '';
        $('quoteCustomer').value=saved.customer || '';$('quoteProject').value=saved.project || '';state.categoryId=saved.categoryId || state.categoryId;state.quoteItems=Array.isArray(saved.items)?saved.items:[];
        $('quoteCategory').value=state.categoryId;$('pricingCategory').value=state.categoryId;
        return;
      }
    }catch(e){console.warn('Could not load quote draft',e)}
    $('quoteNo').value=nextQuoteNo();$('quoteDate').value=today();$('preparedBy').value=data.users?.[0]?.id || '';
  }

  function newQuote(){
    const current=Number(localStorage.getItem('keysuite_v100_quote_sequence') || 1);
    localStorage.setItem('keysuite_v100_quote_sequence',String(current+1));
    localStorage.removeItem('keysuite_v100_quote_draft');
    state.quoteItems=[];
    $('quoteNo').value=nextQuoteNo();$('quoteDate').value=today();$('quoteCustomer').value='';$('quoteProject').value='';
    renderQuoteItems();
  }

  function printQuote(){
    const total=updateQuoteTotal();
    const user=(data.users || []).find(u=>u.id===$('preparedBy').value);
    $('pQuoteNo').textContent=$('quoteNo').value || '-';$('pDate').textContent=$('quoteDate').value || '-';$('pCustomer').textContent=$('quoteCustomer').value || '-';$('pProject').textContent=$('quoteProject').value || '-';$('pPrepared').textContent=user?`${user.prefix || ''} ${user.name || ''}`.trim():'-';
    $('pItems').innerHTML=state.quoteItems.map((i,index)=>`<tr><td>${index+1}</td><td><b>${esc(i.model)}</b><div style="white-space:pre-line">${esc(i.description)}</div></td><td class="num">${num(i.qty,0)}</td><td class="num">${num(i.unitPrice,2)}</td><td class="num">${num(Number(i.qty || 0)*Number(i.unitPrice || 0),2)}</td></tr>`).join('');
    $('pTotal').textContent=money(total);
    window.print();
  }

  function exportVisibleCsv(){
    const cat=categoryById(state.categoryId);
    const rows=[['Product ID','Model','Material','USD','Base MYR','Landed Cost','Quotation List','Final Price']];
    for(const r of state.visiblePricingRows){
      if(r.sourceUsd===null) continue;
      const c=priceCalculation(r.sourceUsd,r.material,cat);
      rows.push([r.product.id,r.product.model,r.material,c.usd,c.baseMyr,c.landedCost,c.quotationList,c.finalPrice]);
    }
    const csv=rows.map(row=>row.map(v=>`"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='KeySuite_V1.00_Visible_Pricing.csv';a.click();URL.revokeObjectURL(a.href);
  }

  function renderValidation(){
    const companyIds=new Set((data.companies || []).map(c=>c.id));
    const normalized=(data.users || []).filter(u=>u.source_company_id && u.source_company_id!==u.company_id);
    const orphanUsers=(data.users || []).filter(u=>!companyIds.has(u.company_id));
    const productCount=(data.products || []).length;
    const priced=allPricedVariants();
    const items=[
      [`Company/User link`,orphanUsers.length?`${orphanUsers.length} orphan user(s)`:'All users linked',!orphanUsers.length],
      [`ID normalization`,normalized.length?`${normalized.length} user link(s) normalized`:'No normalization required',true],
      [`CHC model rows`,`${productCount} imported`,productCount===409],
      [`Priced variants`,`${priced.length} available`,priced.length>0],
      [`Source multiplier`,`${num(data.currency_multiplier || 0,2)} MYR per USD`,Number(data.currency_multiplier)>0]
    ];
    $('validationList').innerHTML=items.map(([k,v,ok])=>`<div class="kv"><b>${esc(k)}</b><span><span class="badge ${ok?'green':'red'}">${ok?'OK':'Review'}</span> ${esc(v)}</span></div>`).join('');
    const coverage=['CHC','CHCS','CHCN'].map(material=>{
      const count=priced.filter(r=>r.material===material).length;
      return `<tr><td><b>${material}</b></td><td class="num">${count}</td><td class="num">${pct(count/(data.products?.length || 1))}</td></tr>`;
    }).join('');
    $('coverageTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Material</th><th class="num">Priced Models</th><th class="num">Coverage</th></tr></thead><tbody>${coverage}</tbody></table></div>`;
  }

  function bindEvents(){
    $('modelSearch').addEventListener('input',renderPricing);
    $('showUnpriced').addEventListener('change',renderPricing);
    $('addBlankItem').addEventListener('click',addBlankItem);
    $('newQuote').addEventListener('click',newQuote);
    $('printQuote').addEventListener('click',printQuote);
    $('saveQuote').addEventListener('click',()=>{saveQuoteState();alert('Quotation draft saved in this browser.');});
    $('exportPricingCsv').addEventListener('click',exportVisibleCsv);
    ['quoteNo','quoteDate','preparedBy','quoteCustomer','quoteProject'].forEach(id=>$(id).addEventListener('input',saveQuoteState));
  }

  function init(){
    initNavigation();
    fillCompanySelects();
    fillCategorySelects();
    fillPreparedBy();
    syncCompanyCategory();
    loadQuoteState();
    bindEvents();
    renderDashboard();
    renderCompany();
    renderPricing();
    renderQuoteItems();
    renderValidation();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  init();
})();
