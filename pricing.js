(() => {
  'use strict';

  let secureData={
    companies:[],users:[],categories:[],products:[],gwsProducts:[],
    productMultipliers:{CHC:{USD:5.8,RMB:.65,MYR:1},GWS:{USD:5.8,RMB:.65,MYR:1}},
    fuel_price:2,fuel_base_price:2
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
  const isOwner=()=>String(access?.role||'').toLowerCase()==='owner';
  const roundUp10=value=>Math.ceil((Number(value||0)-1e-9)/10)*10;
  const normalizeRarity=value=>['common','many','rare'].includes(String(value||'').toLowerCase())?String(value).toLowerCase():'many';
  const rarityLabel=value=>({common:'Common',many:'Many',rare:'Rare'})[normalizeRarity(value)];

  function customersList(){return window.KeySuiteApp?.getCustomers?.()||[]}
  function company(){return customersList().find(x=>x.id===companyId)||null}
  function category(){return secureData.categories.find(x=>x.id===categoryId)||null}
  function quotationCustomer(){return window.KeySuiteApp?.getPricingCustomer?.()||window.KeySuiteApp?.getSelectedCustomer?.()||null}
  function selectedCustomer(){return quotationCustomer()||company()}
  function categoryForCustomer(customer){return secureData.categories.find(x=>x.id===customer?.pricingCategoryId)||null}
  function context(options={}){
    const customer=options.customer||selectedCustomer();
    return {
      customer,
      distanceKm:Math.max(0,Number(options.distanceKm??customer?.distanceKm??0)),
      fuelPrice:Math.max(0,Number(options.fuelPrice??secureData.fuel_price??2)),
      fuelBasePrice:Math.max(0,Number(options.fuelBasePrice??secureData.fuel_base_price??2))
    };
  }

  function multipliers(family='CHC'){
    const code=String(family||'CHC').toUpperCase()==='GWS'?'GWS':'CHC';
    const rates=secureData.productMultipliers?.[code]||{};
    return {USD:Number(rates.USD??secureData.usd_multiplier??5.8),RMB:Number(rates.RMB??secureData.rmb_multiplier??.65),MYR:1};
  }

  function normalizeRule(raw={},family='CHC',cat=null){
    const fallback={margin:.38,normal:0,rare:0,transport:30,commission:.03,setDiscount:.068,finalDiscount:.08,includeCommission:true,includeSetDiscount:true,includeFinalDiscount:true,includeFuelCharge:true};
    return {
      margin:Number(raw.margin??(family==='CHC'?(cat?.margins?.CHC??cat?.factors?.CHC):fallback.margin)??fallback.margin),
      normal:Number(raw.normal??fallback.normal),
      rare:Number(raw.rare??fallback.rare),
      transport:Number(raw.transport??cat?.transport??fallback.transport),
      commission:Number(raw.commission??cat?.commission??fallback.commission),
      setDiscount:Number(raw.setDiscount??raw.set_discount??cat?.set_discount??fallback.setDiscount),
      finalDiscount:Number(raw.finalDiscount??raw.final_discount??cat?.final_discount??fallback.finalDiscount),
      includeCommission:raw.includeCommission??raw.include_commission??true,
      includeSetDiscount:raw.includeSetDiscount??raw.include_set_discount??true,
      includeFinalDiscount:raw.includeFinalDiscount??raw.include_final_discount??true,
      includeFuelCharge:raw.includeFuelCharge??raw.include_fuel_charge??true
    };
  }

  function categoryRule(cat,family='CHC'){return normalizeRule(cat?.productRules?.[family]||{},family,cat)}

  function formula(cat=category(),family='CHC',rarity='many'){
    const rule=categoryRule(cat,family),level=normalizeRarity(rarity);
    const parts=['Highest of (USD × USD rate), (RMB × RMB rate), MYR','÷ (1 − Margin)'];
    if(level==='common'||level==='rare')parts.push('÷ (1 − Normal)');
    if(level==='rare')parts.push('÷ (1 − Rare)');
    parts.push('+ Transport');
    if(rule.includeCommission)parts.push('÷ (1 − Commission)');
    if(rule.includeSetDiscount)parts.push('÷ (1 − Set Discount)');
    if(rule.includeFinalDiscount)parts.push('÷ (1 − Final Discount)');
    if(rule.includeFuelCharge)parts.push('+ Fuel Charge');
    parts.push('Round up to RM10');
    return `${family} ${rarityLabel(level)} = ${parts.join(' → ')}`;
  }

  function hasPricingContext(customer=quotationCustomer()){
    return !!(customer&&customer.pricingCategoryId&&secureData.categories.some(x=>x.id===customer.pricingCategoryId));
  }

  function currencyCandidates(priceBook={},variant,family='CHC'){
    const rates=multipliers(family);
    return ['USD','RMB','MYR'].map(currency=>{
      const raw=priceBook?.[currency]?.[variant];
      const valid=raw!==null&&raw!==''&&Number.isFinite(Number(raw))&&Number(raw)>0;
      return valid?{currency,sourcePrice:Number(raw),multiplier:rates[currency],baseMyr:Number(raw)*rates[currency]}:null;
    }).filter(Boolean);
  }

  function calculatePrice(priceBook,variant,cat=category(),family='CHC',options={}){
    if(!cat)return null;
    const candidates=currencyCandidates(priceBook,variant,family);
    if(!candidates.length)return null;
    const chosen=candidates.reduce((best,row)=>!best||row.baseMyr>best.baseMyr?row:best,null);
    const rule=categoryRule(cat,family);
    const priceContext=context(options);
    const rarity=normalizeRarity(options.rarity||'many');
    const marginPrice=chosen.baseMyr/Math.max(.0001,1-rule.margin);
    const afterNormal=(rarity==='common'||rarity==='rare')?marginPrice/Math.max(.0001,1-rule.normal):marginPrice;
    const afterRare=rarity==='rare'?afterNormal/Math.max(.0001,1-rule.rare):afterNormal;
    const withTransport=afterRare+rule.transport;
    const afterCommission=rule.includeCommission?withTransport/Math.max(.0001,1-rule.commission):withTransport;
    const afterSetDiscount=rule.includeSetDiscount?afterCommission/Math.max(.0001,1-rule.setDiscount):afterCommission;
    const beforeFuel=rule.includeFinalDiscount?afterSetDiscount/Math.max(.0001,1-rule.finalDiscount):afterSetDiscount;
    const fuelCharge=rule.includeFuelCharge?priceContext.distanceKm*Math.max(priceContext.fuelPrice-priceContext.fuelBasePrice,0):0;
    const unroundedPrice=beforeFuel+fuelCharge;
    const finalPrice=roundUp10(unroundedPrice);
    return {
      family,variant,rarity,candidates,sourceCurrency:chosen.currency,sourcePrice:chosen.sourcePrice,multiplier:chosen.multiplier,baseMyr:chosen.baseMyr,
      margin:rule.margin,normal:rule.normal,rare:rule.rare,transport:rule.transport,commission:rule.commission,setDiscount:rule.setDiscount,finalDiscount:rule.finalDiscount,
      includeCommission:rule.includeCommission,includeSetDiscount:rule.includeSetDiscount,includeFinalDiscount:rule.includeFinalDiscount,includeFuelCharge:rule.includeFuelCharge,
      marginPrice,afterNormal,afterRare,withTransport,afterCommission,afterSetDiscount,beforeFuel,
      distanceKm:priceContext.distanceKm,fuelPrice:priceContext.fuelPrice,fuelBasePrice:priceContext.fuelBasePrice,fuelCharge,unroundedPrice,finalPrice
    };
  }

  function calculate(sourceOrBook,material='CHC',cat=category(),options={}){
    if(sourceOrBook&&typeof sourceOrBook==='object')return calculatePrice(sourceOrBook,material,cat,options.productFamily||'CHC',options);
    const priceBook={USD:{[material]:sourceOrBook},RMB:{},MYR:{}};
    return calculatePrice(priceBook,material,cat,options.productFamily||'CHC',options);
  }

  function variants(includeUnpriced=false){
    const result=[];
    for(const product of secureData.products||[]){
      for(const material of ['CHC','CHCS','CHCN']){
        const candidates=currencyCandidates(product.pricesByCurrency||{},material,'CHC');
        if(candidates.length||includeUnpriced)result.push({product,material,rarity:normalizeRarity(product.rarityByVariant?.[material]),priced:!!candidates.length});
      }
    }
    return result;
  }

  function syncCompanyCategory(){categoryId=company()?.pricingCategoryId||'';if(byId('pricingCategorySelect'))byId('pricingCategorySelect').value=categoryId}

  function fillSelects(){
    const cs=byId('pricingCompanySelect'),cats=byId('pricingCategorySelect'),list=customersList();
    if(cs){cs.innerHTML='<option value="">Select customer/company</option>'+list.map(x=>`<option value="${e(x.id)}">${e(x.company)}</option>`).join('');cs.value=list.some(x=>x.id===companyId)?companyId:''}
    if(cats){cats.innerHTML='<option value="">No pricing category assigned</option>'+(secureData.categories||[]).map(x=>`<option value="${e(x.id)}">${e(x.name)}</option>`).join('');cats.value=categoryId;cats.disabled=!isOwner()||!company()}
    const save=byId('savePricingCategory');if(save){save.style.display=isOwner()?'inline-block':'none';save.disabled=!company()}
  }

  function renderFuelSetting(){
    const input=byId('pricingFuelPrice'),button=byId('saveFuelPrice'),message=byId('pricingFuelMessage');if(!input||!button||!message)return;
    if(document.activeElement!==input)input.value=Number(secureData.fuel_price??2).toFixed(2);
    input.disabled=!isOwner();button.disabled=!isOwner();button.style.display=isOwner()?'inline-block':'none';
    message.textContent=isOwner()?`Saved globally until changed. Base fuel price: ${cash(secureData.fuel_base_price??2)}/L`:`Current fuel price: ${cash(secureData.fuel_price??2)}/L`;
  }

  function ruleSummary(cat,family){
    const rule=categoryRule(cat,family),rates=multipliers(family);
    return [
      [`${family} Margin`,percent(rule.margin)],['Normal',percent(rule.normal)],['Rare',percent(rule.rare)],['Transport',cash(rule.transport)],
      ['Commission',rule.includeCommission?percent(rule.commission):'Not included'],
      ['Set Discount',rule.includeSetDiscount?percent(rule.setDiscount):'Not included'],
      ['Final Discount',rule.includeFinalDiscount?percent(rule.finalDiscount):'Not included'],
      ['Fuel Charge',rule.includeFuelCharge?'Included':'Not included'],
      [`${family} Currency`,`USD (MYR ${n(rates.USD,2)}) · RMB (MYR ${n(rates.RMB,2)}) · MYR (MYR 1.00)`]
    ];
  }

  function renderSummary(){
    const c=company(),cat=category(),quoteCustomer=quotationCustomer(),ctx=context({customer:c||quoteCustomer});
    byId('pricingCompanyCount').textContent=customersList().length;
    byId('pricingCategoryCount').textContent=(secureData.categories||[]).length;
    byId('pricingModelCount').textContent=(secureData.products||[]).length;
    byId('pricingVariantCount').textContent=variants(false).length;
    let notice=`Signed in as <b>${e(access?.display_name||access?.email||'approved user')}</b>. `;
    if(!quoteCustomer)notice+='No quotation pricing customer selected.';
    else if(!hasPricingContext(quoteCustomer))notice+=`Quotation pricing customer: <b>${e(quoteCustomer.company)}</b>. No Pricing Category is assigned.`;
    else notice+=`Quotation pricing customer: <b>${e(quoteCustomer.company)}</b> · Category: <b>${e(categoryForCustomer(quoteCustomer)?.name||'-')}</b> · Distance: <b>${n(quoteCustomer.distanceKm,1)} km</b>.`;
    byId('pricingAccessNotice').innerHTML=notice;byId('pricingAccessNotice').classList.add('active-customer');
    byId('pricingCompanySummary').innerHTML=c?[
      ['Company Name',c.company],['Classification',c.classification||'-'],['Pricing Category',categoryForCustomer(c)?.name||'Not assigned'],['Assigned User',typeof customerOwnerName==='function'?customerOwnerName(c.assignedUserEmail):(c.assignedUserEmail||'-')],['Phone',c.companyPhone||'-'],['Payment Term',c.terms||'-'],['TIN',c.tinNumber||'-'],['Business Registration No.',c.brnNumber||'-'],['SST No.',c.sstNumber||'-'],['Address',c.address||'-'],['Distance',`${n(c.distanceKm,1)} km`]
    ].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">Select a customer/company to view its saved details.</p>';
    const otherRows=[['Current Fuel Price',`${cash(ctx.fuelPrice)}/L`],['Customer Distance',`${n(ctx.distanceKm,1)} km`]];
    byId('pricingCategorySummary').innerHTML=cat?[['Category Name',cat.name],...ruleSummary(cat,'CHC'),...ruleSummary(cat,'GWS'),...otherRows].map(([k,v])=>`<div class="pricing-kv"><b>${e(k)}</b><span>${e(v)}</span></div>`).join(''):'<p class="muted">No pricing category is assigned to this customer.</p>';
    byId('pricingFormula').textContent=cat?[
      formula(cat,'CHC','many'),formula(cat,'CHC','common'),formula(cat,'CHC','rare'),
      formula(cat,'GWS','many'),formula(cat,'GWS','common'),formula(cat,'GWS','rare')
    ].join('\n'):'';
    renderFuelSetting();fillSelects();
  }

  function renderTable(){
    if(!byId('pricingRows'))return;
    const search=(byId('pricingModelSearch').value||'').trim().toLowerCase(),material=byId('pricingMaterialFilter').value,showUnpriced=byId('pricingShowUnpriced').checked;
    visibleRows=variants(showUnpriced).filter(row=>(material==='ALL'||row.material===material)&&(!search||row.product.model.toLowerCase().includes(search)||row.material.toLowerCase().includes(search)));
    const c=company(),cat=category();
    byId('pricingSourceCurrencyHeader').textContent='Highest Source';
    byId('pricingRows').innerHTML=visibleRows.map((row,index)=>{
      const calc=c&&cat?calculatePrice(row.product.pricesByCurrency||{},row.material,cat,'CHC',{customer:c,rarity:row.rarity}):null;
      return `<tr><td><b>${e(row.product.model)}</b></td><td><span class="pricing-badge ${calc?'ok':'warn'}">${e(row.material)}</span></td><td><span class="pricing-badge">${e(rarityLabel(row.rarity))}</span></td><td class="num">${calc?`${e(calc.sourceCurrency)} ${n(calc.sourcePrice,2)}`:'-'}</td><td class="num">${calc?cash(calc.baseMyr):'-'}</td><td class="num">${calc?percent(calc.margin):'-'}</td><td class="num">${calc?cash(calc.marginPrice):'-'}</td><td class="num">${calc?cash(calc.withTransport):'-'}</td><td class="num">${calc?cash(calc.beforeFuel):'-'}</td><td class="num">${calc?cash(calc.fuelCharge):'-'}</td><td class="num"><b>${calc?cash(calc.finalPrice):'-'}</b></td><td>${calc?`<button type="button" class="btn green" data-pricing-add="${index}">Add to Quotation</button>`:''}</td></tr>`;
    }).join('')||'<tr><td colspan="12" class="muted">No matching products.</td></tr>';
    const contextText=!c?'Select a customer/company in Key.':!cat?'Assign a Pricing Category to generate prices.':'Highest converted currency and the selected Common/Many/Rare rule are used; final prices round upward to RM10.';
    byId('pricingCount').textContent=`Showing ${visibleRows.length.toLocaleString('en-MY')} variants. ${contextText}`;
    document.querySelectorAll('[data-pricing-add]').forEach(button=>button.addEventListener('click',()=>addToQuotation(Number(button.dataset.pricingAdd))));
  }

  function findPrice(model,options={}){
    const customer=options.customer||quotationCustomer(),cat=options.category||categoryForCustomer(customer);if(!customer||!cat)return null;
    const text=String(model||'').trim();let material='CHC',base=text;
    if(/^CHCS\b/i.test(text)){material='CHCS';base=text.replace(/^CHCS\b/i,'CHC')}
    else if(/^CHCN\b/i.test(text)){material='CHCN';base=text.replace(/^CHCN\b/i,'CHC')}
    const product=(secureData.products||[]).find(p=>String(p.model).toLowerCase()===base.toLowerCase());if(!product)return null;
    const rarity=normalizeRarity(options.rarity||product.rarityByVariant?.[material]);
    const calc=calculatePrice(product.pricesByCurrency||{},material,cat,'CHC',{...options,customer,rarity});
    return calc?{product,material,rarity,calc,category:cat,customer,family:'CHC'}:null;
  }

  function findGwsPrice(model,pressure,options={}){
    const customer=options.customer||quotationCustomer(),cat=options.category||categoryForCustomer(customer);if(!customer||!cat)return null;
    const product=(secureData.gwsProducts||[]).find(p=>String(p.model).toLowerCase()===String(model||'').toLowerCase());if(!product)return null;
    const variant=String(pressure||'10').replace(/\D/g,'');
    const rarity=normalizeRarity(options.rarity||product.rarityByVariant?.[variant]);
    const calc=calculatePrice(product.pricesByCurrency||{},variant,cat,'GWS',{...options,customer,rarity});
    return calc?{product,material:variant,variant,rarity,calc,category:cat,customer,family:'GWS'}:null;
  }

  function sourceSnapshot(found){
    return {
      product_family:found.family||found.calc.family||'CHC',product_id:found.product.id,material:found.material,variant:found.variant||found.material,rarity:found.calc.rarity,
      customer_id:found.customer?.id||'',category_id:found.category?.id||'',source_currency:found.calc.sourceCurrency,currency_multiplier:found.calc.multiplier,source_price:found.calc.sourcePrice,
      distance_km:found.calc.distanceKm,fuel_price:found.calc.fuelPrice,fuel_base_price:found.calc.fuelBasePrice,fuel_charge:found.calc.fuelCharge,unrounded_price:found.calc.unroundedPrice,calculated_price:found.calc.finalPrice
    };
  }

  function applyPriceToQuoteRow(row,model,options={}){
    const found=options.productFamily==='GWS'?findGwsPrice(model,options.pressure,options):findPrice(model,options);if(!row||!found)return false;
    const input=row.querySelector('.item-price');if(!input)return false;
    input.value=found.calc.finalPrice.toFixed(2);row.dataset.pricingSource=JSON.stringify(sourceSnapshot(found));if(typeof calcTotal==='function')calcTotal();return true;
  }

  function refreshQuotePrices(){
    const customer=quotationCustomer(),cat=categoryForCustomer(customer);if(!customer||!cat)return;
    const rows=[...document.querySelectorAll('.quote-item[data-pricing-source]')];
    for(const row of rows){
      let source={};try{source=JSON.parse(row.dataset.pricingSource||'{}')}catch(_){ }
      let found=null;
      if(source.product_family==='GWS'){
        const product=(secureData.gwsProducts||[]).find(p=>p.id===source.product_id);if(product)found=findGwsPrice(product.model,source.variant||source.material,{customer,category:cat});
      }else{
        const product=(secureData.products||[]).find(p=>p.id===source.product_id);if(product){const model=(source.material==='CHC'?product.model:product.model.replace(/^CHC\b/,source.material||'CHC'));found=findPrice(model,{customer,category:cat})}
      }
      if(!found)continue;
      row.querySelector('.item-price').value=found.calc.finalPrice.toFixed(2);row.dataset.pricingSource=JSON.stringify(sourceSnapshot(found));
    }
    if(typeof calcTotal==='function')calcTotal();
  }

  function quoteRowForNewItem(){
    const rows=[...document.querySelectorAll('.quote-item')],first=rows[0];
    const empty=rows.length===1&&first&&!first.querySelector('.item-model').value&&!first.querySelector('.item-description').value&&!Number(first.querySelector('.item-price').value||0);
    return empty?first:quoteItemRow({});
  }

  function addToQuotation(index){
    const customer=quotationCustomer();if(!customer){if(typeof showPage==='function')showPage('quotation');alert('Select a pricing customer before adding an item.');return}
    const cat=categoryForCustomer(customer);if(!cat){alert(`No Pricing Category is assigned to ${customer.company}.`);return}
    const row=visibleRows[index];if(!row)return;
    const calc=calculatePrice(row.product.pricesByCurrency||{},row.material,cat,'CHC',{customer,rarity:row.rarity});if(!calc)return;
    const shownModel=row.material==='CHC'?row.product.model:row.product.model.replace(/^CHC\b/,row.material),description=`B.G.Reich Vertical Multistage Pump Model: ${shownModel}`;
    const quoteRow=quoteRowForNewItem();quoteRow.querySelector('.item-model').value=shownModel;quoteRow.querySelector('.item-qty').value=1;quoteRow.querySelector('.item-price').value=calc.finalPrice.toFixed(2);quoteRow.querySelector('.item-description').value=description;quoteRow.dataset.pricingSource=JSON.stringify(sourceSnapshot({product:row.product,material:row.material,rarity:row.rarity,calc,category:cat,customer,family:'CHC'}));calcTotal();refreshItemExportButtons();showPage('quotation');
  }

  function addGwsToQuotation(model,pressure){
    const customer=quotationCustomer();if(!customer){if(typeof showPage==='function')showPage('quotation');alert('Select a pricing customer before adding a GWS Tank.');return}
    const found=findGwsPrice(model,pressure,{customer});if(!found){alert(`No price is available for GWS Tank ${model} · ${pressure} Bar, or the customer has no pricing category.`);return}
    const shown=`GWS Tank Model ${model} — ${pressure} Bar`,description=`GWS Pressure Tank Model: ${model}\nWorking Pressure: ${pressure} Bar`;
    const quoteRow=quoteRowForNewItem();quoteRow.querySelector('.item-model').value=shown;quoteRow.querySelector('.item-qty').value=1;quoteRow.querySelector('.item-price').value=found.calc.finalPrice.toFixed(2);quoteRow.querySelector('.item-description').value=description;quoteRow.dataset.pricingSource=JSON.stringify(sourceSnapshot(found));calcTotal();refreshItemExportButtons();showPage('quotation');
  }

  async function savePricingCategory(){
    if(!isOwner()){alert('Only the Owner can assign a Pricing Category.');return}
    const c=company(),message=byId('pricingCategoryMessage'),button=byId('savePricingCategory');if(!c){alert('Select a customer/company first.');return}
    const next=byId('pricingCategorySelect')?.value||'';button.disabled=true;button.textContent='Saving…';
    try{await window.KeySuiteApp?.updateCustomerPricingCategory?.(c.id,next);categoryId=next;if(message)message.textContent=next?`Pricing Category saved for ${c.company}.`:`Pricing Category removed from ${c.company}.`;renderSummary();renderTable();refreshQuotePrices()}
    catch(error){console.error(error);alert(`Pricing Category could not be saved: ${error.message||error}`)}
    finally{button.disabled=false;button.textContent='Save Category'}
  }

  async function saveFuelPrice(){
    if(!isOwner()){alert('Only the Owner can change Fuel Price.');return}
    const input=byId('pricingFuelPrice'),button=byId('saveFuelPrice'),message=byId('pricingFuelMessage'),value=Number(input?.value);if(!Number.isFinite(value)||value<0){alert('Enter a valid Fuel Price.');return}
    const client=window.KeySuiteAuth?.getClient?.();if(!client){alert('Supabase is not connected.');return}
    const originalButton=button.innerHTML;button.disabled=true;button.textContent='…';
    try{const {data,error}=await client.from('ks_app_settings').update({fuel_price:value}).eq('id','default').select('fuel_price,fuel_base_price').single();if(error)throw error;secureData.fuel_price=Number(data?.fuel_price??value);secureData.fuel_base_price=Number(data?.fuel_base_price??secureData.fuel_base_price??2);if(window.KEYSUITE_SECURE_DATA){window.KEYSUITE_SECURE_DATA.fuel_price=secureData.fuel_price;window.KEYSUITE_SECURE_DATA.fuel_base_price=secureData.fuel_base_price}message.textContent=`Saved: ${cash(secureData.fuel_price)}/L · Base ${cash(secureData.fuel_base_price)}/L`;renderSummary();renderTable();refreshQuotePrices()}
    catch(error){console.error(error);alert(`Fuel Price could not be saved: ${error.message||error}`)}
    finally{button.disabled=!isOwner();button.innerHTML=originalButton}
  }

  function exportCsv(){
    const rows=[['Customer','Category','Model','Variant','Rarity','Source Currency','Source Price','Base MYR','Margin','Normal','Rare','Transport','Fuel Charge','Final Price']],c=company(),cat=category();
    for(const row of visibleRows){const calc=c&&cat?calculatePrice(row.product.pricesByCurrency||{},row.material,cat,'CHC',{customer:c,rarity:row.rarity}):null;if(calc)rows.push([c.company,cat.name,row.product.model,row.material,rarityLabel(row.rarity),calc.sourceCurrency,calc.sourcePrice,calc.baseMyr,calc.margin,calc.normal,calc.rare,calc.transport,calc.fuelCharge,calc.finalPrice])}
    const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='KeySuite_V1.19_Visible_Pricing.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }

  function selectCustomer(id,rerender=true){companyId=id||'';syncCompanyCategory();fillSelects();if(rerender){renderSummary();renderTable()}}
  function refreshCustomers(){const list=customersList(),quoteId=quotationCustomer()?.id||'';if(quoteId&&list.some(x=>x.id===quoteId))companyId=quoteId;else if(companyId&&!list.some(x=>x.id===companyId))companyId='';if(!companyId&&list.length)companyId=list[0].id;syncCompanyCategory();fillSelects();renderSummary();renderTable()}

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

  function syncPriceListSettings(next={}){secureData={...secureData,...next};renderSummary();renderTable();refreshQuotePrices()}
  function init(data,userAccess){secureData={...secureData,...(data||{})};access=userAccess||access;const list=customersList(),quoteId=quotationCustomer()?.id||'';companyId=(quoteId&&list.some(x=>x.id===quoteId))?quoteId:(list[0]?.id||'');syncCompanyCategory();fillSelects();bind();renderSummary();renderTable()}

  window.KeySuitePricing={init,calculate,calculatePrice,findPrice,findGwsPrice,applyPriceToQuoteRow,refreshQuotePrices,addGwsToQuotation,selectCustomer,refreshCustomers,hasPricingContext,syncPriceListSettings,render:()=>{renderSummary();renderTable()}};
})();
