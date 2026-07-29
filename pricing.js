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
  let companyId=''; // Customer/company selected inside Key.
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

  function customersList(){
    return window.KeySuiteApp?.getCustomers?.()||[];
  }
  function company(){
    return customersList().find(x=>x.id===companyId)||null;
  }
  function category(){
    return secureData.categories.find(x=>x.id===categoryId)||null;
  }
  function quotationCustomer(){
    return window.KeySuiteApp?.getSelectedCustomer?.()||null;
  }
  function selectedCustomer(){
    return quotationCustomer()||company();
  }
  function categoryForCustomer(customer){
    return secureData.categories.find(x=>x.id===customer?.pricingCategoryId)||null;
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

  function hasPricingContext(customer=quotationCustomer()){
    return !!(customer&&customer.pricingCategoryId&&secureData.categories.some(x=>x.id===customer.pricingCategoryId));
  }

  function calculate(sourceUsd,material='CHC',cat=category(),options={}){
    if(!cat)return null;
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
    categoryId=company()?.pricingCategoryId||'';
    if(byId('pricingCategorySelect'))byId('pricingCategorySelect').value=categoryId;
  }

  function fillSelects(){
    const cs=byId('pricingCompanySelect'),cats=byId('pricingCategorySelect');
    const list=customersList();
    if(cs){
      cs.innerHTML='<option value="">Select customer/company</option>'+list.map(x=>`<option value="${e(x.id)}">${e(x.company)}</option>`).join('');
      cs.value=list.some(x=>x.id===companyId)?companyId:'';
    }
    if(cats){
      cats.innerHTML='<option value="">No pricing category assigned</option>'+(secureData.categories||[]).map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join('');
      cats.value=categoryId;
      cats.disabled=!isAdmin()||!company();
    }
    const save=byId('savePricingCategory');
    if(save){save.style.display=isAdmin()?'inline-block':'none';save.disabled=!company();}
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
    const c=company(),cat=category(),quoteCustomer=quotationCustomer(),ctx=context({customer:c||quoteCustomer});
    byId('pricingCompanyCount').textContent=customersList().length;
    byId('pricingCategoryCount').textContent=(secureData.categories||[]).length;
    byId('pricingModelCount').textContent=(secureData.products||[]).length;
    byId('pricingVariantCount').textContent=variants(false).length;

    let notice=`Signed in as <b>${e(access?.display_name||access?.email||'approved user')}</b> · Role: <b>${e(access?.role||'user')}</b>. `;
    if(!quoteCustomer)notice+='No quotation customer selected. A quotation cannot be priced, saved or generated until a customer is selected.';
    else if(!hasPricingContext(quoteCustomer))notice+=`Quotation customer: <b>${e(quoteCustomer.company)}</b>. No Pricing Category is assigned, so price generation is blocked.`;
    else notice+=`Quotation customer: <b>${e(quoteCustomer.company)}</b> · Category: <b>${e(categoryForCustomer(quoteCustomer)?.name||'-')}</b> · Distance: <b>${n(quoteCustomer.distanceKm,1)} km</b>.`;
    byId('pricingAccessNotice').innerHTML=notice;
    byId('pricingAccessNotice').classList.add('active-customer');

    byId('pricingCompanySummary').innerHTML=c?[
      ['Customer ID',c.id],
      ['Company Name',c.company],
      ['Classification',c.classification||'-'],
      ['Pricing Category',categoryForCustomer(c)?.name||'Not assigned'],
      ['Assigned User',typeof customerOwnerName==='function'?customerOwnerName(c.assignedUserEmail):(c.assignedUserEmail||'-')],
      ['Phone',c.companyPhone||'-'],
      ['Payment Term',c.terms||'-'],
      ['TIN',c.tinNumber||'-'],
      ['Business Registration No.',c.brnNumber||'-'],
      ['SST No.',c.sstNumber||'-'],
      ['Address',c.address||'-'],
      ['Distance',`${n(c.distanceKm,1)} km`]
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">Select a customer/company to view its saved address and pricing category.</p>';

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
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No pricing category is assigned to this customer. Owner/Admin must assign one before prices can be generated.</p>';
    byId('pricingFormula').textContent=formula();
    renderFuelSetting();
    fillSelects();
  }

  function renderTable(){
    if(!byId('pricingRows'))return;
    const search=(byId('pricingModelSearch').value||'').trim().toLowerCase();
    const material=byId('pricingMaterialFilter').value;
    const showUnpriced=byId('pricingShowUnpriced').checked;
    visibleRows=variants(showUnpriced).filter(row=>(material==='ALL'||row.material===material)&&(!search||row.product.model.toLowerCase().includes(search)||row.material.toLowerCase().includes(search)));
    const c=company(),cat=category();
    byId('pricingRows').innerHTML=visibleRows.map((row,index)=>{
      const calc=c&&cat?calculate(row.sourceUsd,row.material,cat,{customer:c}):null;
      const shownModel=row.material==='CHC'?row.product.model:row.product.model.replace(/^CHC\b/,row.material);
      return `<tr>
        <td><b>${e(shownModel)}</b></td>
        <td><span class="pricing-badge ${calc?'ok':'warn'}">${e(row.material)}</span></td>
        <td class="num">${row.sourceUsd!==null?n(row.sourceUsd,2):'-'}</td>
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
    const contextText=!c?'Select a customer/company in Key.':!cat?'Assign a Pricing Category to generate prices.':'Final prices are rounded upward to the next RM10.';
    byId('pricingCount').textContent=`Showing ${visibleRows.length.toLocaleString('en-MY')} variants. ${variants(false).length.toLocaleString('en-MY')} variants currently contain source prices. ${contextText}`;
    document.querySelectorAll('[data-pricing-add]').forEach(button=>button.addEventListener('click',()=>addToQuotation(Number(button.dataset.pricingAdd))));
  }

  function findPrice(model,options={}){
    const customer=options.customer||quotationCustomer();
    const cat=options.category||categoryForCustomer(customer);
    if(!customer||!cat)return null;
    const text=String(model||'').trim();
    let material='CHC',base=text;
    if(/^CHCS\b/i.test(text)){material='CHCS';base=text.replace(/^CHCS\b/i,'CHC')}
    else if(/^CHCN\b/i.test(text)){material='CHCN';base=text.replace(/^CHCN\b/i,'CHC')}
    const product=(secureData.products||[]).find(p=>String(p.model).toLowerCase()===base.toLowerCase());
    if(!product)return null;
    const calc=calculate(product.prices_usd?.[material],material,cat,{...options,customer});
    return calc?{product,material,calc,category:cat,customer}:null;
  }

  function sourceSnapshot(found){
    return {
      product_id:found.product.id,
      material:found.material,
      customer_id:found.customer?.id||'',
      category_id:found.category?.id||'',
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
    const customer=quotationCustomer();
    const cat=categoryForCustomer(customer);
    if(!customer||!cat)return;
    selectCustomer(customer.id,false);
    const rows=[...document.querySelectorAll('.quote-item[data-pricing-source]')];
    for(const row of rows){
      let source={};try{source=JSON.parse(row.dataset.pricingSource||'{}')}catch(_){}
      const product=(secureData.products||[]).find(p=>p.id===source.product_id);
      const material=source.material||'CHC';
      const usd=product?.prices_usd?.[material]??source.source_usd;
      const calc=calculate(usd,material,cat,{customer});
      if(!calc)continue;
      row.querySelector('.item-price').value=calc.finalPrice.toFixed(2);
      row.dataset.pricingSource=JSON.stringify({
        ...source,
        customer_id:customer.id,
        category_id:cat.id,
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
    const customer=quotationCustomer();
    if(!customer){if(typeof showPage==='function')showPage('quotation');byId('qCustomer')?.focus();alert('Select a customer in Quotation first. KeySuite cannot generate a selling price without the customer pricing category.');return}
    const cat=categoryForCustomer(customer);
    if(!cat){alert(`No Pricing Category is assigned to ${customer.company}. Owner/Admin must assign one in Key before adding priced items.`);return}
    selectCustomer(customer.id,false);
    const row=visibleRows[index];
    if(!row)return;
    const calc=calculate(row.sourceUsd,row.material,cat,{customer});if(!calc)return;
    const shownModel=row.material==='CHC'?row.product.model:row.product.model.replace(/^CHC\b/,row.material);
    const description=`B.G.Reich Vertical Multistage Pump Model: ${shownModel}`;
    const rows=[...document.querySelectorAll('.quote-item')];
    const first=rows[0];
    const empty=rows.length===1&&first&&!first.querySelector('.item-model').value&&!first.querySelector('.item-description').value&&!Number(first.querySelector('.item-price').value||0);
    const quoteRow=empty?first:quoteItemRow({});
    quoteRow.querySelector('.item-model').value=shownModel;
    quoteRow.querySelector('.item-qty').value=1;
    quoteRow.querySelector('.item-price').value=calc.finalPrice.toFixed(2);
    quoteRow.querySelector('.item-description').value=description;
    quoteRow.dataset.pricingSource=JSON.stringify(sourceSnapshot({product:row.product,material:row.material,calc,category:cat,customer}));
    calcTotal();refreshItemExportButtons();showPage('quotation');
  }

  async function savePricingCategory(){
    if(!isAdmin()){alert('Only an Owner or Admin can assign a Pricing Category.');return}
    const c=company(),message=byId('pricingCategoryMessage'),button=byId('savePricingCategory');
    if(!c){alert('Select a customer/company first.');return}
    const next=byId('pricingCategorySelect')?.value||'';
    button.disabled=true;button.textContent='Saving…';
    try{
      await window.KeySuiteApp?.updateCustomerPricingCategory?.(c.id,next);
      categoryId=next;
      if(message)message.textContent=next?`Pricing Category saved for ${c.company}.`:`Pricing Category removed from ${c.company}.`;
      renderSummary();renderTable();refreshQuotePrices();
    }catch(error){
      console.error(error);
      alert(`Pricing Category could not be saved: ${error.message||error}. Run the V1.11 Supabase migration first.`);
    }finally{button.disabled=false;button.textContent='Save Category'}
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
    const rows=[['Customer','Category','Product ID','Model','Material','USD','Base MYR','Margin','Margin Price','With Transport','After Commission','After Set Discount','Before Fuel','Distance KM','Fuel Price','Fuel Charge','Unrounded Price','Final Price']];
    const c=company(),cat=category();
    for(const row of visibleRows){
      const calc=c&&cat?calculate(row.sourceUsd,row.material,cat,{customer:c}):null;if(!calc)continue;
      rows.push([c.company,cat.name,row.product.id,row.product.model,row.material,calc.usd,calc.baseMyr,calc.margin,calc.marginPrice,calc.withTransport,calc.afterCommission,calc.afterSetDiscount,calc.beforeFuel,calc.distanceKm,calc.fuelPrice,calc.fuelCharge,calc.unroundedPrice,calc.finalPrice]);
    }
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='KeySuite_V1.11_Visible_Pricing.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function selectCustomer(id,rerender=true){
    companyId=id||'';
    syncCompanyCategory();
    fillSelects();
    if(rerender){renderSummary();renderTable();}
  }

  function refreshCustomers(){
    const list=customersList();
    const quoteId=byId('qCustomer')?.value||'';
    if(quoteId&&list.some(x=>x.id===quoteId))companyId=quoteId;
    else if(companyId&&!list.some(x=>x.id===companyId))companyId='';
    if(!companyId&&list.length)companyId=list[0].id;
    syncCompanyCategory();
    fillSelects();
    renderSummary();renderTable();
  }

  function bind(){
    if(bound)return;bound=true;
    byId('pricingCompanySelect')?.addEventListener('change',event=>selectCustomer(event.target.value));
    byId('pricingCategorySelect')?.addEventListener('change',event=>{categoryId=event.target.value;renderSummary();renderTable()});
    byId('savePricingCategory')?.addEventListener('click',savePricingCategory);
    byId('pricingModelSearch')?.addEventListener('input',renderTable);
    byId('pricingMaterialFilter')?.addEventListener('change',renderTable);
    byId('pricingShowUnpriced')?.addEventListener('change',renderTable);
    byId('pricingExportCsv')?.addEventListener('click',exportCsv);
    byId('saveFuelPrice')?.addEventListener('click',saveFuelPrice);
  }

  function init(data,userAccess){
    secureData={...secureData,...(data||{})};access=userAccess||access;
    const list=customersList(),quoteId=byId('qCustomer')?.value||'';
    companyId=(quoteId&&list.some(x=>x.id===quoteId))?quoteId:(list[0]?.id||'');
    syncCompanyCategory();
    fillSelects();bind();renderSummary();renderTable();
  }

  window.KeySuitePricing={
    init,calculate,findPrice,applyPriceToQuoteRow,refreshQuotePrices,
    selectCustomer,refreshCustomers,hasPricingContext,
    render:()=>{renderSummary();renderTable()}
  };
})();
