(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const money = n => `RM ${Number(n || 0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = (n,d=2) => Number(n || 0).toLocaleString('en-MY',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct = n => `${num(Number(n || 0) * 100,1)}%`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const today = () => new Date().toISOString().slice(0,10);

  let client = null;
  let currentSession = null;
  let currentAccess = null;
  let workspaceBound = false;
  let data = emptyData();

  const state = {companyId:'', categoryId:'', quoteItems:[], visiblePricingRows:[]};

  function emptyData(){
    return {version:'1.00',release_date:'2026-07-29',currency:'MYR',source_currency:'USD',currency_multiplier:0,companies:[],users:[],categories:[],products:[]};
  }

  function configReady(){
    const cfg=window.KEYSUITE_CONFIG || {};
    return /^https:\/\/.+\.supabase\.co\/?$/i.test(String(cfg.supabaseUrl || '').trim()) && String(cfg.supabaseAnonKey || '').trim().length > 20 && !String(cfg.supabaseAnonKey).includes('PASTE_');
  }

  function setView(name){
    $('loginView').classList.toggle('hidden',name!=='login');
    $('loadingView').classList.toggle('hidden',name!=='loading');
    $('appView').classList.toggle('hidden',name!=='app');
  }

  function showLogin(message='',type='error'){
    setView('login');
    setLoginBusy(false);
    if(message) setLoginMessage(message,type); else clearLoginMessage();
    $('loginPassword').value='';
  }

  function showLoading(message='Checking secure access…'){
    $('loadingText').textContent=message;
    setView('loading');
  }

  function setLoginMessage(message,type='error'){
    const el=$('loginMessage');
    el.textContent=message;
    el.className=`auth-message show ${type}`;
  }

  function clearLoginMessage(){
    const el=$('loginMessage');
    el.textContent='';
    el.className='auth-message';
  }

  function setLoginBusy(busy){
    $('loginButton').disabled=busy;
    $('loginButton').textContent=busy?'Signing in…':'Sign in';
    $('loginEmail').disabled=busy;
    $('loginPassword').disabled=busy;
  }

  function friendlyAuthError(error){
    const msg=String(error?.message || '').toLowerCase();
    if(msg.includes('invalid login credentials')) return 'The email or password is incorrect.';
    if(msg.includes('email not confirmed')) return 'This email account has not been confirmed yet.';
    if(msg.includes('rate limit')) return 'Too many attempts. Please try again later.';
    return error?.message || 'Unable to sign in.';
  }

  async function signIn(event){
    event.preventDefault();
    clearLoginMessage();
    if(!client){setLoginMessage('Supabase is not configured yet. Complete config.js first.','info');return;}
    const email=$('loginEmail').value.trim().toLowerCase();
    const password=$('loginPassword').value;
    if(!email || !password){setLoginMessage('Enter both email and password.');return;}
    setLoginBusy(true);
    const {data:authData,error}=await client.auth.signInWithPassword({email,password});
    if(error || !authData?.session){setLoginBusy(false);setLoginMessage(friendlyAuthError(error));return;}
    await enterWorkspace(authData.session);
  }

  async function signOut(){
    if($('logoutButton')) $('logoutButton').disabled=true;
    try{if(client) await client.auth.signOut();}catch(error){console.warn(error)}
    resetPrivateState();
    if($('logoutButton')) $('logoutButton').disabled=false;
    showLogin('You have signed out.','info');
  }

  function resetPrivateState(){
    currentSession=null;
    currentAccess=null;
    data=emptyData();
    state.companyId='';state.categoryId='';state.quoteItems=[];state.visiblePricingRows=[];
  }

  async function verifyAccess(email){
    const {data:rows,error}=await client.from('ks_user_access')
      .select('email,employee_id,company_id,role,display_name,active')
      .eq('email',String(email || '').toLowerCase())
      .limit(1);
    if(error) throw new Error(`Access check failed: ${error.message}`);
    const access=rows?.[0];
    if(!access?.active) return null;
    return access;
  }

  async function loadProtectedData(){
    const [companiesRes,usersRes,categoriesRes,productsRes,settingsRes]=await Promise.all([
      client.from('ks_companies').select('*').order('company_name'),
      client.from('ks_company_users').select('*').order('full_name'),
      client.from('ks_pricing_categories').select('*').order('category_name'),
      client.from('ks_products_chc').select('*').order('source_row'),
      client.from('ks_app_settings').select('*').eq('id','default').limit(1)
    ]);
    const failed=[companiesRes,usersRes,categoriesRes,productsRes,settingsRes].find(r=>r.error);
    if(failed?.error) throw new Error(failed.error.message);
    const setting=settingsRes.data?.[0] || {};
    return {
      version:'1.00',release_date:'2026-07-29',
      currency:setting.currency || 'MYR',source_currency:setting.source_currency || 'USD',currency_multiplier:Number(setting.currency_multiplier || 0),
      companies:(companiesRes.data || []).map(c=>({id:c.id,name:c.company_name,category:c.pricing_category,delivery_distance:Number(c.delivery_distance || 0),phone:c.company_phone,term_days:c.term_days,address:c.address,tin:c.tin_number,business_registration_no:c.business_registration_no,sst_no:c.sst_no,msic_code:c.msic_code,business_activities:c.business_activities})),
      users:(usersRes.data || []).map(u=>({id:u.id,company_id:u.company_id,source_company_id:u.source_company_id,prefix:u.prefix,name:u.full_name,phone:u.phone,email:u.email})),
      categories:(categoriesRes.data || []).map(c=>({id:c.id,name:c.category_name,final_discount:Number(c.final_discount || 0),set_discount:Number(c.set_discount || 0),commission:Number(c.commission || 0),factors:{CHC:Number(c.chc_factor || 1)},transport:Number(c.transport || 0)})),
      products:(productsRes.data || []).map(p=>({id:p.id,category:p.product_category,model:p.model,prices_usd:{CHC:p.chc_usd===null?null:Number(p.chc_usd),CHCS:p.chcs_usd===null?null:Number(p.chcs_usd),CHCN:p.chcn_usd===null?null:Number(p.chcn_usd)},source_row:p.source_row}))
    };
  }

  async function enterWorkspace(session){
    showLoading('Verifying approved user…');
    try{
      const email=String(session?.user?.email || '').toLowerCase();
      const access=await verifyAccess(email);
      if(!access){
        await client.auth.signOut({scope:'local'});
        resetPrivateState();
        showLogin('This account is valid, but it is not approved for KeySuite. Ask the owner to add it to ks_user_access.');
        return;
      }
      showLoading('Loading protected company and pricing data…');
      const protectedData=await loadProtectedData();
      if(!protectedData.companies.length) throw new Error('No company data was returned. Check the database setup and RLS policies.');
      currentSession=session;currentAccess=access;data=protectedData;
      state.companyId=(access.company_id && data.companies.some(c=>c.id===access.company_id))?access.company_id:(data.companies[0]?.id || '');
      state.categoryId=categoryForCompany(companyById(state.companyId))?.id || data.categories[0]?.id || '';
      initializeWorkspace();
      $('sessionUserName').textContent=access.display_name || session.user.email || 'Signed in';
      $('sessionUserEmail').textContent=`${session.user.email || ''}${access.role?` · ${access.role}`:''}`;
      setView('app');
    }catch(error){
      console.error(error);
      try{await client.auth.signOut({scope:'local'})}catch(_){ }
      resetPrivateState();
      showLogin(`Secure data could not be loaded: ${error.message}`);
    }
  }

  function categoryForCompany(company){return data.categories.find(c=>c.name===company?.category) || data.categories[0] || null;}
  function categoryById(id){return data.categories.find(c=>c.id===id) || data.categories[0] || null;}
  function companyById(id){return data.companies.find(c=>c.id===id) || data.companies[0] || null;}

  function priceCalculation(sourceUsd,material='CHC',category=categoryById(state.categoryId)){
    if(!Number.isFinite(Number(sourceUsd))) return null;
    const usd=Number(sourceUsd),multiplier=Number(data.currency_multiplier || 1),factor=Number(category?.factors?.[material] ?? category?.factors?.CHC ?? 1),transport=Number(category?.transport || 0),commission=Number(category?.commission || 0),setDiscount=Number(category?.set_discount || 0),finalDiscount=Number(category?.final_discount || 0);
    const baseMyr=usd*multiplier,landedCost=baseMyr*factor+transport,quotationList=landedCost/Math.max(.0001,1-commission)/Math.max(.0001,1-setDiscount),finalPrice=quotationList*(1-finalDiscount);
    return {usd,multiplier,factor,transport,commission,setDiscount,finalDiscount,baseMyr,landedCost,quotationList,finalPrice};
  }

  function allPricedVariants(){
    const rows=[];for(const p of data.products){for(const material of ['CHC','CHCS','CHCN']){const sourceUsd=p.prices_usd?.[material];if(Number.isFinite(Number(sourceUsd))&&sourceUsd!==null) rows.push({product:p,material,sourceUsd:Number(sourceUsd)});}}return rows;
  }
  function allVariants(includeUnpriced=false){
    const rows=[];for(const p of data.products){for(const material of ['CHC','CHCS','CHCN']){const sourceUsd=p.prices_usd?.[material],priced=Number.isFinite(Number(sourceUsd))&&sourceUsd!==null;if(priced||includeUnpriced) rows.push({product:p,material,sourceUsd:priced?Number(sourceUsd):null});}}return rows;
  }
  function formulaText(){return 'Final Price = (((USD × Multiplier × Factor) + Transport) ÷ (1 − Commission) ÷ (1 − Set Discount)) × (1 − Final Discount)';}

  function initNavigation(){document.querySelectorAll('nav button[data-page], [data-go]').forEach(btn=>btn.addEventListener('click',()=>openPage(btn.dataset.page||btn.dataset.go)));}
  function openPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===id));if(id==='pricing')renderPricing();if(id==='quotation')renderQuoteItems();window.scrollTo({top:0,behavior:'smooth'});}

  function fillCompanySelects(){
    const options=data.companies.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    ['companySelect','pricingCompany'].forEach(id=>{if($(id)){$(id).innerHTML=options;$(id).value=state.companyId;}});
  }
  function fillCategorySelects(){
    const options=data.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    ['pricingCategory','quoteCategory'].forEach(id=>{if($(id)){$(id).innerHTML=options;$(id).value=state.categoryId;}});
  }
  function fillPreparedBy(){
    $('preparedBy').innerHTML=data.users.map(u=>`<option value="${esc(u.id)}">${esc(`${u.prefix||''} ${u.name||''}`.trim())}</option>`).join('');
    if(currentAccess?.employee_id && data.users.some(u=>u.id===currentAccess.employee_id)) $('preparedBy').value=currentAccess.employee_id;
  }
  function syncCompanyCategory(){const cat=categoryForCompany(companyById(state.companyId));if(cat)state.categoryId=cat.id;if($('pricingCategory'))$('pricingCategory').value=state.categoryId;if($('quoteCategory'))$('quoteCategory').value=state.categoryId;if($('companySelect'))$('companySelect').value=state.companyId;if($('pricingCompany'))$('pricingCompany').value=state.companyId;}

  function renderDashboard(){
    const priced=allPricedVariants();$('mCompanies').textContent=data.companies.length;$('mUsers').textContent=data.users.length;$('mProducts').textContent=data.products.length;$('mPriced').textContent=priced.length;$('formulaText').textContent=formulaText();
    const company=companyById(state.companyId),cat=categoryById(state.categoryId);
    $('linkStatus').innerHTML=`<b>${esc(company?.name||'-')}</b> is linked to category <b>${esc(cat?.name||'-')}</b>. CHC factor <b>${num(cat?.factors?.CHC||0,2)}</b> is applied after secure sign-in.`;
    const basis=[['USD Multiplier',num(data.currency_multiplier||0,2)],['CHC Factor',num(cat?.factors?.CHC||0,2)],['Transport',money(cat?.transport||0)],['Commission',pct(cat?.commission||0)],['Set Discount',pct(cat?.set_discount||0)],['Final Discount',pct(cat?.final_discount||0)],['Priced Models',new Set(priced.map(r=>r.product.id)).size],['Priced Variants',priced.length]];
    $('pricingBasis').innerHTML=basis.map(([k,v])=>`<div class="metric"><span>${esc(k)}</span><b style="font-size:21px">${esc(v)}</b></div>`).join('');
  }

  function renderCompany(){
    const c=companyById(state.companyId);if(!c)return;
    $('companySummary').innerHTML=[['Company ID',c.id],['Category',c.category],['Phone',c.phone||'-'],['Term',`${c.term_days||0} days`],['TIN',c.tin||'-'],['Business Reg No.',c.business_registration_no||'-'],['SST No.',c.sst_no||'-'],['MSIC Code',c.msic_code||'-'],['Business Activities',c.business_activities||'-']].map(([k,v])=>`<div class="kv"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
    const users=data.users.filter(u=>u.company_id===c.id);$('companyUsers').innerHTML=users.length?users.map(u=>`<div class="user-row"><div><b>${esc(`${u.prefix||''} ${u.name||''}`.trim())}</b><div class="muted">${esc(u.id)}</div></div><div>${esc(u.phone||'-')}</div><div>${esc(u.email||'-')}</div></div>`).join(''):'<p class="muted">No users linked.</p>';
  }

  function renderCategoryRule(){const c=companyById(state.companyId),cat=categoryById(state.categoryId);$('categoryRule').innerHTML=`<b>${esc(c?.name||'-')}</b> → <b>${esc(cat?.name||'-')}</b> · CHC factor ${num(cat?.factors?.CHC||0,2)} · Transport ${money(cat?.transport||0)} · Commission ${pct(cat?.commission||0)} · Set Discount ${pct(cat?.set_discount||0)} · Final Discount ${pct(cat?.final_discount||0)}`;}
  function renderPricing(){
    syncCompanyCategory();renderCategoryRule();const includeUnpriced=$('showUnpriced').checked,search=$('modelSearch').value.trim().toLowerCase(),cat=categoryById(state.categoryId),rows=allVariants(includeUnpriced).filter(r=>!search||r.product.model.toLowerCase().includes(search)||r.product.id.toLowerCase().includes(search));state.visiblePricingRows=rows;
    $('pricingRows').innerHTML=rows.map((r,index)=>{const calc=r.sourceUsd===null?null:priceCalculation(r.sourceUsd,r.material,cat);return `<tr><td>${esc(r.product.id)}</td><td><b>${esc(r.product.model)}</b></td><td><span class="badge ${r.material==='CHC'?'green':r.material==='CHCS'?'orange':''}">${esc(r.material)}</span></td><td class="num">${calc?num(calc.usd,2):'<span class="badge red">Unavailable</span>'}</td><td class="num">${calc?money(calc.baseMyr):'-'}</td><td class="num">${calc?money(calc.landedCost):'-'}</td><td class="num">${calc?money(calc.quotationList):'-'}</td><td class="num"><b>${calc?money(calc.finalPrice):'-'}</b></td><td>${calc?`<button class="btn green small" data-add-price="${index}">Add</button>`:''}</td></tr>`;}).join('')||'<tr><td colspan="9" class="muted">No matching products.</td></tr>';
    $('pricingCount').textContent=`Showing ${rows.length.toLocaleString('en-MY')} material variants. ${allPricedVariants().length} variants currently contain source prices.`;document.querySelectorAll('[data-add-price]').forEach(btn=>btn.addEventListener('click',()=>addPricingRowToQuote(Number(btn.dataset.addPrice))));
  }

  function addPricingRowToQuote(index){const r=state.visiblePricingRows[index];if(!r||r.sourceUsd===null)return;const calc=priceCalculation(r.sourceUsd,r.material,categoryById(state.categoryId));state.quoteItems.push({id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,productId:r.product.id,model:r.product.model,material:r.material,description:`B.G.Reich Vertical Multistage Pump Model: ${r.material==='CHC'?r.product.model:r.product.model.replace(/^CHC/,r.material)}\nPrice basis: ${r.material} / Category ${categoryById(state.categoryId)?.name||''}`,qty:1,unitPrice:calc.finalPrice});saveQuoteState();openPage('quotation');}
  function addBlankItem(){state.quoteItems.push({id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,productId:'',model:'Custom Item',material:'',description:'',qty:1,unitPrice:0});renderQuoteItems();}
  function renderQuoteItems(){
    const wrap=$('quoteItems');if(!state.quoteItems.length){wrap.innerHTML='<div class="notice">No items yet. Open Company & Pricing and press Add, or create a blank item.</div>';updateQuoteTotal();return;}
    wrap.innerHTML=state.quoteItems.map((item,index)=>`<div class="quote-line" data-quote-row="${index}"><div><label>Model</label><input value="${esc(item.model)}" data-field="model"></div><div class="desc"><label>Description</label><textarea data-field="description">${esc(item.description)}</textarea></div><div><label>Qty</label><input type="number" min="0" step="1" value="${Number(item.qty||0)}" data-field="qty"></div><div><label>Unit Price</label><input type="number" min="0" step="0.01" value="${Number(item.unitPrice||0).toFixed(2)}" data-field="unitPrice"></div><div><label>Total</label><input value="${money(Number(item.qty||0)*Number(item.unitPrice||0))}" readonly data-total></div><div class="remove"><label>&nbsp;</label><button class="btn red small" data-remove="${index}">×</button></div></div>`).join('');
    wrap.querySelectorAll('[data-quote-row]').forEach(row=>{const index=Number(row.dataset.quoteRow);row.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{const field=input.dataset.field;state.quoteItems[index][field]=['qty','unitPrice'].includes(field)?Number(input.value||0):input.value;row.querySelector('[data-total]').value=money(Number(state.quoteItems[index].qty||0)*Number(state.quoteItems[index].unitPrice||0));updateQuoteTotal();saveQuoteState();}));});
    wrap.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{state.quoteItems.splice(Number(btn.dataset.remove),1);saveQuoteState();renderQuoteItems();}));updateQuoteTotal();
  }
  function updateQuoteTotal(){const total=state.quoteItems.reduce((sum,i)=>sum+Number(i.qty||0)*Number(i.unitPrice||0),0);$('quoteTotal').textContent=money(total);return total;}
  function storageSuffix(){return String(currentSession?.user?.email||'user').toLowerCase().replace(/[^a-z0-9]+/g,'_');}
  function draftKey(){return `keysuite_v100_quote_draft_${storageSuffix()}`;}
  function sequenceKey(){return `keysuite_v100_quote_sequence_${storageSuffix()}`;}
  function nextQuoteNo(){const now=new Date(),yy=String(now.getFullYear()).slice(-2),mm=String(now.getMonth()+1).padStart(2,'0'),sequence=Number(localStorage.getItem(sequenceKey())||1);return `R-${yy}${mm}-${String(sequence).padStart(4,'0')}`;}
  function saveQuoteState(){if(!currentSession)return;const payload={quoteNo:$('quoteNo')?.value||'',quoteDate:$('quoteDate')?.value||'',preparedBy:$('preparedBy')?.value||'',categoryId:state.categoryId,customer:$('quoteCustomer')?.value||'',project:$('quoteProject')?.value||'',items:state.quoteItems};localStorage.setItem(draftKey(),JSON.stringify(payload));}
  function loadQuoteState(){
    try{const saved=JSON.parse(localStorage.getItem(draftKey())||'null');if(saved){$('quoteNo').value=saved.quoteNo||nextQuoteNo();$('quoteDate').value=saved.quoteDate||today();$('preparedBy').value=saved.preparedBy||currentAccess?.employee_id||data.users[0]?.id||'';$('quoteCustomer').value=saved.customer||'';$('quoteProject').value=saved.project||'';state.categoryId=saved.categoryId||state.categoryId;state.quoteItems=Array.isArray(saved.items)?saved.items:[];$('quoteCategory').value=state.categoryId;$('pricingCategory').value=state.categoryId;return;}}catch(e){console.warn('Could not load quote draft',e)}
    $('quoteNo').value=nextQuoteNo();$('quoteDate').value=today();$('preparedBy').value=currentAccess?.employee_id||data.users[0]?.id||'';
  }
  function newQuote(){const current=Number(localStorage.getItem(sequenceKey())||1);localStorage.setItem(sequenceKey(),String(current+1));localStorage.removeItem(draftKey());state.quoteItems=[];$('quoteNo').value=nextQuoteNo();$('quoteDate').value=today();$('quoteCustomer').value='';$('quoteProject').value='';renderQuoteItems();}
  function printQuote(){const total=updateQuoteTotal(),user=data.users.find(u=>u.id===$('preparedBy').value);$('pQuoteNo').textContent=$('quoteNo').value||'-';$('pDate').textContent=$('quoteDate').value||'-';$('pCustomer').textContent=$('quoteCustomer').value||'-';$('pProject').textContent=$('quoteProject').value||'-';$('pPrepared').textContent=user?`${user.prefix||''} ${user.name||''}`.trim():'-';$('pItems').innerHTML=state.quoteItems.map((i,index)=>`<tr><td>${index+1}</td><td><b>${esc(i.model)}</b><div style="white-space:pre-line">${esc(i.description)}</div></td><td class="num">${num(i.qty,0)}</td><td class="num">${num(i.unitPrice,2)}</td><td class="num">${num(Number(i.qty||0)*Number(i.unitPrice||0),2)}</td></tr>`).join('');$('pTotal').textContent=money(total);window.print();}
  function exportVisibleCsv(){const cat=categoryById(state.categoryId),rows=[['Product ID','Model','Material','USD','Base MYR','Landed Cost','Quotation List','Final Price']];for(const r of state.visiblePricingRows){if(r.sourceUsd===null)continue;const c=priceCalculation(r.sourceUsd,r.material,cat);rows.push([r.product.id,r.product.model,r.material,c.usd,c.baseMyr,c.landedCost,c.quotationList,c.finalPrice]);}const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='KeySuite_V1.00_Visible_Pricing.csv';a.click();URL.revokeObjectURL(a.href);}

  function renderValidation(){
    const companyIds=new Set(data.companies.map(c=>c.id)),normalized=data.users.filter(u=>u.source_company_id&&u.source_company_id!==u.company_id),orphanUsers=data.users.filter(u=>!companyIds.has(u.company_id)),productCount=data.products.length,priced=allPricedVariants();
    const items=[['Authentication',currentSession?'Active session':'No session',!!currentSession],['Approved access',currentAccess?.active?`${currentAccess.role||'user'} · ${currentAccess.email}`:'Not approved',!!currentAccess?.active],['Company/User link',orphanUsers.length?`${orphanUsers.length} orphan user(s)`:'All users linked',!orphanUsers.length],['ID normalization',normalized.length?`${normalized.length} user link(s) normalized`:'No normalization required',true],['CHC model rows',`${productCount} loaded`,productCount===409],['Priced variants',`${priced.length} available`,priced.length>0],['Source multiplier',`${num(data.currency_multiplier||0,2)} MYR per USD`,Number(data.currency_multiplier)>0]];
    $('validationList').innerHTML=items.map(([k,v,ok])=>`<div class="kv"><b>${esc(k)}</b><span><span class="badge ${ok?'green':'red'}">${ok?'OK':'Review'}</span> ${esc(v)}</span></div>`).join('');
    const coverage=['CHC','CHCS','CHCN'].map(material=>{const count=priced.filter(r=>r.material===material).length;return `<tr><td><b>${material}</b></td><td class="num">${count}</td><td class="num">${pct(count/(data.products.length||1))}</td></tr>`;}).join('');$('coverageTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Material</th><th class="num">Priced Models</th><th class="num">Coverage</th></tr></thead><tbody>${coverage}</tbody></table></div>`;
  }

  function bindWorkspaceEvents(){
    $('companySelect').addEventListener('change',e=>{state.companyId=e.target.value;syncCompanyCategory();renderCompany();renderDashboard();});
    $('pricingCompany').addEventListener('change',e=>{state.companyId=e.target.value;syncCompanyCategory();renderPricing();renderDashboard();});
    $('pricingCategory').addEventListener('change',e=>{state.categoryId=e.target.value;$('quoteCategory').value=state.categoryId;renderPricing();renderDashboard();});
    $('quoteCategory').addEventListener('change',e=>{state.categoryId=e.target.value;$('pricingCategory').value=state.categoryId;renderQuoteItems();renderDashboard();});
    $('modelSearch').addEventListener('input',renderPricing);$('showUnpriced').addEventListener('change',renderPricing);$('addBlankItem').addEventListener('click',addBlankItem);$('newQuote').addEventListener('click',newQuote);$('printQuote').addEventListener('click',printQuote);$('saveQuote').addEventListener('click',()=>{saveQuoteState();alert('Quotation draft saved in this browser for the signed-in user.');});$('exportPricingCsv').addEventListener('click',exportVisibleCsv);['quoteNo','quoteDate','preparedBy','quoteCustomer','quoteProject'].forEach(id=>$(id).addEventListener('input',saveQuoteState));
  }

  function initializeWorkspace(){
    fillCompanySelects();fillCategorySelects();fillPreparedBy();syncCompanyCategory();loadQuoteState();
    if(!workspaceBound){initNavigation();bindWorkspaceEvents();workspaceBound=true;}
    openPage('dashboard');renderDashboard();renderCompany();renderPricing();renderQuoteItems();renderValidation();
  }

  async function init(){
    $('loginForm').addEventListener('submit',signIn);$('logoutButton').addEventListener('click',signOut);$('showPassword').addEventListener('change',e=>$('loginPassword').type=e.target.checked?'text':'password');
    if(!configReady()){
      showLogin('Setup required: open config.js and paste your Supabase Project URL and publishable/anon key.','info');
      return;
    }
    if(!window.supabase?.createClient){showLogin('The Supabase login library could not be loaded. Check the internet connection.');return;}
    const cfg=window.KEYSUITE_CONFIG;
    client=window.supabase.createClient(cfg.supabaseUrl.trim(),cfg.supabaseAnonKey.trim(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){resetPrivateState();showLogin();}});
    showLoading('Checking existing session…');
    const {data:sessionData,error}=await client.auth.getSession();
    if(error){showLogin(friendlyAuthError(error));return;}
    if(sessionData?.session) await enterWorkspace(sessionData.session); else showLogin();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  init();
})();
