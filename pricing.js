(() => {
  'use strict';

  let secureData={
    companies:[],
    users:[],
    categories:[],
    products:[],
    currency_multiplier:0,
    fuel_price:2,
    fuel_base_price:2
  };
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
  const isAdmin=()=>['owner','admin'].includes(String(access?.role||'').toLowerCase());
  const roundUp10=value=>Math.ceil((Number(value||0)-1e-9)/10)*10;

  function company(){return secureData.companies.find(x=>x.id===companyId)||secureData.companies[0]||null}
  function category(){return secureData.categories.find(x=>x.id===categoryId)||secureData.categories[0]||null}
  function categoryForCompany(c){return secureData.categories.find(x=>x.name===c?.category)||secureData.categories[0]||null}
  function selectedCustomer(){
    return window.KeySuiteApp?.getSelectedCustomer?.()||
      ((typeof customers==='function'&&byId('qCustomer'))?(customers().find(x=>x.id===byId('qCustomer').value)||null):null);
  }
  function context(options={}){
    const customer=options.customer||selectedCustomer();
    const distanceKm=Math.max(0,Number(options.distanceKm??customer?.distanceKm??0));
    const fuelPrice=Math.max(0,Number(options.fuelPrice??secureData.fuel_price??2));
    const fuelBasePrice=Math.max(0,Number(options.fuelBasePrice??secureData.fuel_base_price??2));
    return {customer,distanceKm,fuelPrice,fuelBasePrice};
  }
  function formula(){
    return 'Final Price = ROUND UP TO RM10 { [ [ [ (USD × Rate) ÷ (1 − Margin) + Transport ] ÷ (1 − Commission) ] ÷ (1 − Set Discount) ] ÷ (1 − Final Discount) + Distance × max(Fuel Price − RM2.00, 0) }';
  }

  function calculate(sourceUsd,material='CHC',cat=category(),options={}){
    if(sourceUsd===null || sourceUsd==='' || !Number.isFinite(Number(sourceUsd)))return null;
    const usd=Number(sourceUsd);
    const multiplier=Number(secureData.currency_multiplier||1);
    const margin=Number(cat?.margins?.[material]??cat?.margins?.CHC??cat?.factors?.[material]??cat?.factors?.CHC??0);
    const transport=Number(cat?.transport||0);
    const commission=Number(cat?.commission||0);
    const setDiscount=Number(cat?.set_discount||0);
    const finalDiscount=Number(cat?.final_discount||0);
    const priceContext=context(options);

    const baseMyr=usd*multiplier;
    const marginPrice=baseMyr/Math.max(.0001,1-margin);
    const withTransport=marginPrice+transport;
    const afterCommission=withTransport/Math.max(.0001,1-commission);
    const afterSetDiscount=afterCommission/Math.max(.0001,1-setDiscount);
    const beforeFuel=afterSetDiscount/Math.max(.0001,1-finalDiscount);
    const fuelCharge=priceContext.distanceKm*Math.max(priceContext.fuelPrice-priceContext.fuelBasePrice,0);
    const unroundedPrice=beforeFuel+fuelCharge;
    const finalPrice=roundUp10(unroundedPrice);

    return {
      usd,multiplier,margin,transport,commission,setDiscount,finalDiscount,
      baseMyr,marginPrice,withTransport,afterCommission,afterSetDiscount,beforeFuel,
      distanceKm:priceContext.distanceKm,fuelPrice:priceContext.fuelPrice,
      fuelBasePrice:priceContext.fuelBasePrice,fuelCharge,unroundedPrice,finalPrice
    };
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

  function renderFuelSetting(){
    const input=byId('pricingFuelPrice'),button=byId('saveFuelPrice'),message=byId('pricingFuelMessage');
    if(!input||!button||!message)return;
    input.value=Number(secureData.fuel_price??2).toFixed(2);
    input.disabled=!isAdmin();
    button.disabled=!isAdmin();
    button.style.display=isAdmin()?'inline-block':'none';
    message.textContent=isAdmin()
      ?`Saved globally until changed. Base fuel price: ${cash(secureData.fuel_base_price??2)}/L`
      :`Current fuel price: ${cash(secureData.fuel_price??2)}/L · Only Owner/Admin can change it.`;
  }

  function renderSummary(){
    const c=company(),cat=category(),customer=selectedCustomer(),ctx=context();
    byId('pricingCompanyCount').textContent=(secureData.companies||[]).length;
    byId('pricingCategoryCount').textContent=(secureData.categories||[]).length;
    byId('pricingModelCount').textContent=(secureData.products||[]).length;
    byId('pricingVariantCount').textContent=variants(false).length;
    byId('pricingAccessNotice').innerHTML=`Signed in as <b>${e(access?.display_name||access?.email||'approved user')}</b> · Role: <b>${e(access?.role||'user')}</b>. ${customer?`Quotation customer: <b>${e(customer.company)}</b> · Distance: <b>${n(ctx.distanceKm,1)} km</b>.`:'No quotation customer selected; fuel charge is currently RM 0.00.'}`;
    byId('pricingAccessNotice').classList.add('active-customer');
    byId('pricingCompanySummary').innerHTML=c?[
      ['Company ID',c.id],['Company Name',c.name],['Pricing Category',c.category||'-'],['Phone',c.phone||'-'],['Payment Term',`${c.term_days||0} days`],['TIN',c.tin||'-'],['Business Registration No.',c.business_registration_no||'-'],['SST No.',c.sst_no||'-'],['Address',c.address||'-']
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No company data.</p>';
    byId('pricingCategorySummary').innerHTML=cat?[
      ['Category ID',cat.id],
      ['Category Name',cat.name],
      ['CHC Margin',percent(cat.margins?.CHC??cat.factors?.CHC??0)],
      ['Transport',cash(cat.transport||0)],
      ['Commission',percent(cat.commission||0)],
      ['Set Discount',percent(cat.set_discount||0)],
      ['Final Discount',percent(cat.final_discount||0)],
      ['USD → MYR Rate',n(secureData.currency_multiplier||0,2)],
      ['Current Fuel Price',`${cash(ctx.fuelPrice)}/L`],
      ['Base Fuel Price',`${cash(ctx.fuelBasePrice)}/L`],
      ['Customer Distance',`${n(ctx.distanceKm,1)} km`],
      ['Fuel Charge per Item',cash(ctx.distanceKm*Math.max(ctx.fuelPrice-ctx.fuelBasePrice,0))]
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No category data.</p>';
    byId('pricingFormula').textContent=formula();
    renderFuelSetting();
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
      return `<tr>
        <td><b>${e(shownModel)}</b></td>
        <td><span class="pricing-badge ${calc?'ok':'warn'}">${e(row.material)}</span></td>
        <td class="num">${calc?n(calc.usd,2):'-'}</td>
        <td class="num">${calc?cash(calc.baseMyr):'-'}</td>
        <td class="num">${calc?percent(calc.margin):'-'}</td>
        <td class="num">${calc?cash(calc.marginPrice):'-'}</td>
        <td class="num">${calc?cash(calc.withTransport):'-'}</td>
        <td class="num">${calc?cash(calc.beforeFuel):'-'}</td>
        <td class="num">${calc?cash(calc.fuelCharge):'-'}</td>
        <td class="num"><b>${calc?cash(calc.finalPrice):'-'}</b></td>
        <td>${calc?`<button type="button" class="btn green" data-pricing-add="${index}">Add to Quotation</button>`:''}</td>
      </tr>`;
    }).join('')||'<tr><td colspan="11" class="muted">No matching products.</td></tr>';
    byId('pricingCount').textContent=`Showing ${visibleRows.length.toLocaleString('en-MY')} variants. ${variants(false).length.toLocaleString('en-MY')} variants currently contain source prices. Final prices are rounded upward to the next RM10.`;
    document.querySelectorAll('[data-pricing-add]').forEach(button=>button.addEventListener('click',()=>addToQuotation(Number(button.dataset.pricingAdd))));
  }

  function findPrice(model,options={}){
    const text=String(model||'').trim();
    let material='CHC',base=text;
    if(/^CHCS\b/i.test(text)){material='CHCS';base=text.replace(/^CHCS\b/i,'CHC')}
    else if(/^CHCN\b/i.test(text)){material='CHCN';base=text.replace(/^CHCN\b/i,'CHC')}
    const product=(secureData.products||[]).find(p=>String(p.model).toLowerCase()===base.toLowerCase());
    if(!product)return null;
    const calc=calculate(product.prices_usd?.[material],material,category(),options);
    return calc?{product,material,calc}:null;
  }

  function sourceSnapshot(found){
    return {
      product_id:found.product.id,
      material:found.material,
      category_id:category()?.id||'',
      source_usd:found.calc.usd,
      distance_km:found.calc.distanceKm,
      fuel_price:found.calc.fuelPrice,
      fuel_base_price:found.calc.fuelBasePrice,
      fuel_charge:found.calc.fuelCharge,
      unrounded_price:found.calc.unroundedPrice,
      calculated_price:found.calc.finalPrice
    };
  }

  function applyPriceToQuoteRow(row,model){
    const found=findPrice(model);
    if(!row||!found)return false;
    const input=row.querySelector('.item-price');
    if(!input)return false;
    input.value=found.calc.finalPrice.toFixed(2);
    row.dataset.pricingSource=JSON.stringify(sourceSnapshot(found));
    if(typeof calcTotal==='function')calcTotal();
    return true;
  }

  function refreshQuotePrices(){
    const rows=[...document.querySelectorAll('.quote-item[data-pricing-source]')];
    for(const row of rows){
      let source={};try{source=JSON.parse(row.dataset.pricingSource||'{}')}catch(_){}
      const product=(secureData.products||[]).find(p=>p.id===source.product_id);
      const material=source.material||'CHC';
      const usd=product?.prices_usd?.[material]??source.source_usd;
      const calc=calculate(usd,material);
      if(!calc)continue;
      row.querySelector('.item-price').value=calc.finalPrice.toFixed(2);
      row.dataset.pricingSource=JSON.stringify({
        ...source,
        source_usd:calc.usd,
        distance_km:calc.distanceKm,
        fuel_price:calc.fuelPrice,
        fuel_base_price:calc.fuelBasePrice,
        fuel_charge:calc.fuelCharge,
        unrounded_price:calc.unroundedPrice,
        calculated_price:calc.finalPrice
      });
    }
    if(typeof calcTotal==='function')calcTotal();
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
    quoteRow.querySelector('.item-description').value=description;
    quoteRow.dataset.pricingSource=JSON.stringify({
      product_id:row.product.id,material:row.material,category_id:category()?.id||'',
      source_usd:calc.usd,distance_km:calc.distanceKm,fuel_price:calc.fuelPrice,
      fuel_base_price:calc.fuelBasePrice,fuel_charge:calc.fuelCharge,
      unrounded_price:calc.unroundedPrice,calculated_price:calc.finalPrice
    });
    calcTotal();refreshItemExportButtons();showPage('quotation');
  }

  async function saveFuelPrice(){
    if(!isAdmin()){alert('Only an Owner or Admin can change Fuel Price.');return}
    const input=byId('pricingFuelPrice'),button=byId('saveFuelPrice'),message=byId('pricingFuelMessage');
    const value=Number(input?.value);
    if(!Number.isFinite(value)||value<0){alert('Enter a valid Fuel Price.');return}
    const client=window.KeySuiteAuth?.getClient?.();
    if(!client){alert('Supabase is not connected.');return}
    button.disabled=true;button.textContent='Saving…';
    try{
      const {data,error}=await client.from('ks_app_settings').update({fuel_price:value}).eq('id','default').select('fuel_price,fuel_base_price').single();
      if(error)throw error;
      secureData.fuel_price=Number(data?.fuel_price??value);
      secureData.fuel_base_price=Number(data?.fuel_base_price??secureData.fuel_base_price??2);
      if(window.KEYSUITE_SECURE_DATA){
        window.KEYSUITE_SECURE_DATA.fuel_price=secureData.fuel_price;
        window.KEYSUITE_SECURE_DATA.fuel_base_price=secureData.fuel_base_price;
      }
      message.textContent=`Fuel Price saved at ${cash(secureData.fuel_price)}/L. It remains active until an Owner/Admin changes it.`;
      renderSummary();renderTable();refreshQuotePrices();
    }catch(error){
      console.error(error);
      alert(`Fuel Price could not be saved: ${error.message||error}. Run the V1.10 Supabase migration first.`);
    }finally{
      button.disabled=false;button.textContent='Save Fuel Price';
    }
  }

  function exportCsv(){
    const rows=[['Product ID','Model','Material','USD','Base MYR','Margin','Margin Price','With Transport','After Commission','After Set Discount','Before Fuel','Distance KM','Fuel Price','Fuel Charge','Unrounded Price','Final Price']];
    for(const row of visibleRows){
      const calc=calculate(row.sourceUsd,row.material);if(!calc)continue;
      rows.push([row.product.id,row.product.model,row.material,calc.usd,calc.baseMyr,calc.margin,calc.marginPrice,calc.withTransport,calc.afterCommission,calc.afterSetDiscount,calc.beforeFuel,calc.distanceKm,calc.fuelPrice,calc.fuelCharge,calc.unroundedPrice,calc.finalPrice]);
    }
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='KeySuite_V1.10_Visible_Pricing.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function bind(){
    if(bound)return;bound=true;
    byId('pricingCompanySelect')?.addEventListener('change',event=>{companyId=event.target.value;syncCompanyCategory();renderSummary();renderTable()});
    byId('pricingCategorySelect')?.addEventListener('change',event=>{categoryId=event.target.value;renderSummary();renderTable()});
    byId('pricingModelSearch')?.addEventListener('input',renderTable);
    byId('pricingMaterialFilter')?.addEventListener('change',renderTable);
    byId('pricingShowUnpriced')?.addEventListener('change',renderTable);
    byId('pricingExportCsv')?.addEventListener('click',exportCsv);
    byId('saveFuelPrice')?.addEventListener('click',saveFuelPrice);
  }

  function init(data,userAccess){
    secureData={...secureData,...(data||{})};access=userAccess||access;
    companyId=(access?.company_id&&(secureData.companies||[]).some(c=>c.id===access.company_id))?access.company_id:(secureData.companies?.[0]?.id||'');
    categoryId=categoryForCompany(company())?.id||secureData.categories?.[0]?.id||'';
    fillSelects();bind();renderSummary();renderTable();
  }

  window.KeySuitePricing={
    init,calculate,findPrice,applyPriceToQuoteRow,refreshQuotePrices,
    render:()=>{renderSummary();renderTable()}
  };
})();
