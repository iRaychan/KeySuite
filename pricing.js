(() => {
  'use strict';
  let secureData={companies:[],users:[],categories:[],products:[],currency_multiplier:0};
  let access=null;
  let companyId='';
  let categoryId='';
  let visibleRows=[];
  let bound=false;
  const byId=id=>document.getElementById(id);
  const e=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const n=(value,d=2)=>Number(value||0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const cash=value=>`RM ${n(value,2)}`;
  const percent=value=>`${n(Number(value||0)*100,1)}%`;

  function company(){return secureData.companies.find(x=>x.id===companyId)||secureData.companies[0]||null}
  function category(){return secureData.categories.find(x=>x.id===categoryId)||secureData.categories[0]||null}
  function categoryForCompany(c){return secureData.categories.find(x=>x.name===c?.category)||secureData.categories[0]||null}
  function formula(){return 'Final Price = (((USD × Multiplier × Factor) + Transport) ÷ (1 − Commission) ÷ (1 − Set Discount)) × (1 − Final Discount)'}

  function calculate(sourceUsd,material='CHC',cat=category()){
    if(sourceUsd===null || sourceUsd==='' || !Number.isFinite(Number(sourceUsd)))return null;
    const usd=Number(sourceUsd), multiplier=Number(secureData.currency_multiplier||1);
    const factor=Number(cat?.factors?.[material]??cat?.factors?.CHC??1);
    const transport=Number(cat?.transport||0), commission=Number(cat?.commission||0), setDiscount=Number(cat?.set_discount||0), finalDiscount=Number(cat?.final_discount||0);
    const baseMyr=usd*multiplier;
    const landedCost=baseMyr*factor+transport;
    const quotationList=landedCost/Math.max(.0001,1-commission)/Math.max(.0001,1-setDiscount);
    const finalPrice=quotationList*(1-finalDiscount);
    return {usd,multiplier,factor,transport,commission,setDiscount,finalDiscount,baseMyr,landedCost,quotationList,finalPrice};
  }

  function variants(includeUnpriced=false){
    const result=[];
    for(const product of secureData.products||[]){
      for(const material of ['CHC','CHCS','CHCN']){
        const source=product.prices_usd?.[material];
        const priced=source!==null && source!=='' && Number.isFinite(Number(source));
        if(priced||includeUnpriced)result.push({product,material,sourceUsd:priced?Number(source):null});
      }
    }
    return result;
  }

  function syncCompanyCategory(){
    const cat=categoryForCompany(company());
    if(cat)categoryId=cat.id;
    if(byId('pricingCategorySelect'))byId('pricingCategorySelect').value=categoryId;
  }

  function fillSelects(){
    const cs=byId('pricingCompanySelect'),cats=byId('pricingCategorySelect');
    if(cs){cs.innerHTML=(secureData.companies||[]).map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join('');cs.value=companyId;}
    if(cats){cats.innerHTML=(secureData.categories||[]).map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join('');cats.value=categoryId;}
  }

  function renderSummary(){
    const c=company(),cat=category();
    byId('pricingCompanyCount').textContent=(secureData.companies||[]).length;
    byId('pricingCategoryCount').textContent=(secureData.categories||[]).length;
    byId('pricingModelCount').textContent=(secureData.products||[]).length;
    byId('pricingVariantCount').textContent=variants(false).length;
    byId('pricingAccessNotice').innerHTML=`Signed in as <b>${e(access?.display_name||access?.email||'approved user')}</b> · Role: <b>${e(access?.role||'user')}</b>. Company and pricing data are loaded only after authentication.`;
    byId('pricingAccessNotice').classList.add('active-customer');
    byId('pricingCompanySummary').innerHTML=c?[
      ['Company ID',c.id],['Company Name',c.name],['Pricing Category',c.category||'-'],['Phone',c.phone||'-'],['Payment Term',`${c.term_days||0} days`],['TIN',c.tin||'-'],['Business Registration No.',c.business_registration_no||'-'],['SST No.',c.sst_no||'-'],['Address',c.address||'-']
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No company data.</p>';
    byId('pricingCategorySummary').innerHTML=cat?[
      ['Category ID',cat.id],['Category Name',cat.name],['CHC Factor',n(cat.factors?.CHC||0,2)],['Transport',cash(cat.transport||0)],['Commission',percent(cat.commission||0)],['Set Discount',percent(cat.set_discount||0)],['Final Discount',percent(cat.final_discount||0)],['USD → MYR Multiplier',n(secureData.currency_multiplier||0,2)]
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No category data.</p>';
    byId('pricingFormula').textContent=formula();
  }

  function renderTable(){
    if(!byId('pricingRows'))return;
    const search=(byId('pricingModelSearch').value||'').trim().toLowerCase();
    const material=byId('pricingMaterialFilter').value;
    const showUnpriced=byId('pricingShowUnpriced').checked;
    visibleRows=variants(showUnpriced).filter(row=>(material==='ALL'||row.material===material)&&(!search||row.product.model.toLowerCase().includes(search)||row.material.toLowerCase().includes(search)));
    byId('pricingRows').innerHTML=visibleRows.map((row,index)=>{
      const calc=calculate(row.sourceUsd,row.material);
      const shownModel=row.material==='CHC'?row.product.model:row.product.model.replace(/^CHC\b/,row.material);
      return `<tr><td><b>${e(shownModel)}</b></td><td><span class="pricing-badge ${calc?'ok':'warn'}">${e(row.material)}</span></td><td class="num">${calc?n(calc.usd,2):'-'}</td><td class="num">${calc?cash(calc.baseMyr):'-'}</td><td class="num">${calc?n(calc.factor,2):'-'}</td><td class="num">${calc?cash(calc.landedCost):'-'}</td><td class="num">${calc?cash(calc.quotationList):'-'}</td><td class="num"><b>${calc?cash(calc.finalPrice):'-'}</b></td><td>${calc?`<button type="button" class="btn green" data-pricing-add="${index}">Add to Quotation</button>`:''}</td></tr>`;
    }).join('')||'<tr><td colspan="9" class="muted">No matching products.</td></tr>';
    byId('pricingCount').textContent=`Showing ${visibleRows.length.toLocaleString('en-MY')} variants. ${variants(false).length.toLocaleString('en-MY')} variants currently contain source prices.`;
    document.querySelectorAll('[data-pricing-add]').forEach(button=>button.addEventListener('click',()=>addToQuotation(Number(button.dataset.pricingAdd))));
  }

  function findPrice(model){
    const text=String(model||'').trim();
    let material='CHC',base=text;
    if(/^CHCS\b/i.test(text)){material='CHCS';base=text.replace(/^CHCS\b/i,'CHC')}
    else if(/^CHCN\b/i.test(text)){material='CHCN';base=text.replace(/^CHCN\b/i,'CHC')}
    const product=(secureData.products||[]).find(p=>String(p.model).toLowerCase()===base.toLowerCase());
    if(!product)return null;
    const calc=calculate(product.prices_usd?.[material],material);
    return calc?{product,material,calc}:null;
  }

  function applyPriceToQuoteRow(row,model){
    const found=findPrice(model);
    if(!row||!found)return false;
    const input=row.querySelector('.item-price');
    if(!input)return false;
    input.value=found.calc.finalPrice.toFixed(2);
    row.dataset.pricingSource=JSON.stringify({product_id:found.product.id,material:found.material,category_id:category()?.id||'',source_usd:found.calc.usd,calculated_price:found.calc.finalPrice});
    if(typeof calcTotal==='function')calcTotal();
    return true;
  }

  function addToQuotation(index){
    const row=visibleRows[index];
    if(!row)return;
    const calc=calculate(row.sourceUsd,row.material);if(!calc)return;
    const shownModel=row.material==='CHC'?row.product.model:row.product.model.replace(/^CHC\b/,row.material);
    const description=`B.G.Reich Vertical Multistage Pump Model: ${shownModel}\nPrice basis: ${row.material} / Category ${category()?.name||''}`;
    const rows=[...document.querySelectorAll('.quote-item')];
    const first=rows[0];
    const empty=rows.length===1&&first&&!first.querySelector('.item-model').value&&!first.querySelector('.item-description').value&&!Number(first.querySelector('.item-price').value||0);
    const quoteRow=empty?first:quoteItemRow({});
    quoteRow.querySelector('.item-model').value=shownModel;
    quoteRow.querySelector('.item-qty').value=1;
    quoteRow.querySelector('.item-price').value=calc.finalPrice.toFixed(2);
    quoteRow.querySelector('.item-discount').value=0;
    quoteRow.querySelector('.item-description').value=description;
    quoteRow.dataset.pricingSource=JSON.stringify({product_id:row.product.id,material:row.material,category_id:category()?.id||'',source_usd:calc.usd,calculated_price:calc.finalPrice});
    calcTotal();refreshItemExportButtons();showPage('quotation');
  }

  function exportCsv(){
    const rows=[['Product ID','Model','Material','USD','Base MYR','Factor','Net Cost','Quotation List','Final Price']];
    for(const row of visibleRows){
      const calc=calculate(row.sourceUsd,row.material);if(!calc)continue;
      rows.push([row.product.id,row.product.model,row.material,calc.usd,calc.baseMyr,calc.factor,calc.landedCost,calc.quotationList,calc.finalPrice]);
    }
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='KeySuite_V1.06_Visible_Pricing.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function bind(){
    if(bound)return;bound=true;
    byId('pricingCompanySelect')?.addEventListener('change',event=>{companyId=event.target.value;syncCompanyCategory();renderSummary();renderTable()});
    byId('pricingCategorySelect')?.addEventListener('change',event=>{categoryId=event.target.value;renderSummary();renderTable()});
    byId('pricingModelSearch')?.addEventListener('input',renderTable);
    byId('pricingMaterialFilter')?.addEventListener('change',renderTable);
    byId('pricingShowUnpriced')?.addEventListener('change',renderTable);
    byId('pricingExportCsv')?.addEventListener('click',exportCsv);
  }

  function init(data,userAccess){
    secureData=data||secureData;access=userAccess||access;
    companyId=(access?.company_id&&(secureData.companies||[]).some(c=>c.id===access.company_id))?access.company_id:(secureData.companies?.[0]?.id||'');
    categoryId=categoryForCompany(company())?.id||secureData.categories?.[0]?.id||'';
    fillSelects();bind();renderSummary();renderTable();
  }

  window.KeySuitePricing={init,calculate,findPrice,applyPriceToQuoteRow,render:()=>{renderSummary();renderTable()}};
})();
