(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  let client=null;
  let session=null;
  let access=null;

  function configReady(){
    const cfg=window.KEYSUITE_CONFIG||{};
    return /^https:\/\/.+\.supabase\.co\/?$/i.test(String(cfg.supabaseUrl||'').trim())&&String(cfg.supabaseAnonKey||'').trim().length>20&&!String(cfg.supabaseAnonKey).includes('PASTE_');
  }
  function setView(name){el('loginView').classList.toggle('hidden',name!=='login');el('loadingView').classList.toggle('hidden',name!=='loading');el('appView').classList.toggle('hidden',name!=='app')}
  function message(text,type='error'){const box=el('loginMessage');box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message'}
  function busy(on){el('loginButton').disabled=on;el('loginButton').textContent=on?'Signing in…':'Sign in';el('loginEmail').disabled=on;el('loginPassword').disabled=on}
  function showLogin(text='',type='error'){setView('login');busy(false);message(text,type);el('loginPassword').value='';lockSelector()}
  function showLoading(text){el('loadingText').textContent=text||'Checking secure access…';setView('loading')}
  function friendly(error){const text=String(error?.message||'').toLowerCase();if(text.includes('invalid login credentials'))return 'The email or password is incorrect.';if(text.includes('email not confirmed'))return 'This email account has not been confirmed yet.';if(text.includes('rate limit'))return 'Too many attempts. Please try again later.';return error?.message||'Unable to sign in.'}
  function unlockSelector(){const frame=el('selectorFrame');if(frame&&frame.src==='about:blank')frame.src=frame.dataset.src||'selector/index.html'}
  function lockSelector(){const frame=el('selectorFrame');if(frame&&frame.getAttribute('src')!=='about:blank')frame.src='about:blank'}

  async function verify(email){
    const {data,error}=await client.from('ks_user_access').select('email,employee_id,company_id,role,display_name,active').eq('email',String(email||'').toLowerCase()).limit(1);
    if(error)throw new Error(`Access check failed: ${error.message}`);
    return data?.[0]?.active?data[0]:null;
  }
  async function loadData(){
    const [companies,users,categories,products,settings]=await Promise.all([
      client.from('ks_companies').select('*').order('company_name'),client.from('ks_company_users').select('*').order('full_name'),client.from('ks_pricing_categories').select('*').order('category_name'),client.from('ks_products_chc').select('*').order('source_row'),client.from('ks_app_settings').select('*').eq('id','default').limit(1)
    ]);
    const failed=[companies,users,categories,products,settings].find(x=>x.error);if(failed?.error)throw new Error(failed.error.message);
    const setting=settings.data?.[0]||{};
    return {version:'1.02',release_date:'2026-07-29',currency:setting.currency||'MYR',source_currency:setting.source_currency||'USD',currency_multiplier:Number(setting.currency_multiplier||0),
      companies:(companies.data||[]).map(c=>({id:c.id,name:c.company_name,category:c.pricing_category,delivery_distance:Number(c.delivery_distance||0),phone:c.company_phone,term_days:c.term_days,address:c.address,tin:c.tin_number,business_registration_no:c.business_registration_no,sst_no:c.sst_no,msic_code:c.msic_code,business_activities:c.business_activities})),
      users:(users.data||[]).map(u=>({id:u.id,company_id:u.company_id,source_company_id:u.source_company_id,prefix:u.prefix,name:u.full_name,phone:u.phone,email:u.email})),
      categories:(categories.data||[]).map(c=>({id:c.id,name:c.category_name,final_discount:Number(c.final_discount||0),set_discount:Number(c.set_discount||0),commission:Number(c.commission||0),factors:{CHC:Number(c.chc_factor||1)},transport:Number(c.transport||0)})),
      products:(products.data||[]).map(p=>({id:p.id,category:p.product_category,model:p.model,prices_usd:{CHC:p.chc_usd===null?null:Number(p.chc_usd),CHCS:p.chcs_usd===null?null:Number(p.chcs_usd),CHCN:p.chcn_usd===null?null:Number(p.chcn_usd)},source_row:p.source_row}))};
  }
  async function enter(s){
    showLoading('Verifying approved user…');
    try{
      const userAccess=await verify(s?.user?.email||'');
      if(!userAccess){await client.auth.signOut({scope:'local'});showLogin('This account is valid, but it is not approved for KeySuite.');return}
      showLoading('Loading protected company and pricing data…');
      const data=await loadData();if(!data.companies.length)throw new Error('No company data was returned. Check the database and RLS policies.');
      session=s;access=userAccess;window.KEYSUITE_SECURE_DATA=data;window.KEYSUITE_ACCESS=access;
      el('sessionUserName').textContent=access.display_name||s.user.email||'Signed in';
      el('sessionUserEmail').textContent=`${s.user.email||''}${access.role?` · ${access.role}`:''}`;
      const role=String(access.role||'').toLowerCase();
      const keyAllowed=['owner','admin','administrator','superadmin'].includes(role);
      const keyButton=el('keyAccessButton');
      if(keyButton)keyButton.classList.toggle('hidden',!keyAllowed);
      if(!keyAllowed&&document.getElementById('companyPricing')?.classList.contains('active')){
        document.querySelector('[data-page="dashboard"]')?.click();
      }
      if(el('preparedBy')&&(!el('preparedBy').value||el('preparedBy').value==='Ray'))el('preparedBy').value=access.display_name||'Ray';
      window.KeySuitePricing?.init(data,access);unlockSelector();refreshAll();setView('app');
    }catch(error){console.error(error);try{await client.auth.signOut({scope:'local'})}catch(_){ }showLogin(`Secure data could not be loaded: ${error.message}`)}
  }
  async function signIn(event){
    event.preventDefault();message('');if(!client){message('Supabase is not configured. Keep your working config.js in the repository.','info');return}
    const email=el('loginEmail').value.trim().toLowerCase(),password=el('loginPassword').value;if(!email||!password){message('Enter both email and password.');return}
    busy(true);const {data,error}=await client.auth.signInWithPassword({email,password});if(error||!data?.session){busy(false);message(friendly(error));return}await enter(data.session)
  }
  async function signOut(){el('logoutButton').disabled=true;try{await client?.auth.signOut()}catch(error){console.warn(error)}session=null;access=null;window.KEYSUITE_SECURE_DATA=null;window.KEYSUITE_ACCESS=null;el('logoutButton').disabled=false;showLogin('You have signed out.','info')}
  async function refreshSecure(){if(!session)return;await enter(session)}
  async function init(){
    el('loginForm').addEventListener('submit',signIn);el('logoutButton').addEventListener('click',signOut);el('showPassword').addEventListener('change',event=>el('loginPassword').type=event.target.checked?'text':'password');el('refreshSecurePricing')?.addEventListener('click',refreshSecure);
    if(!configReady()){showLogin('Your existing config.js is missing or incomplete. Keep the config.js that already works on GitHub.','info');return}
    if(!window.supabase?.createClient){showLogin('The Supabase library could not be loaded. Check the internet connection.');return}
    const cfg=window.KEYSUITE_CONFIG;client=window.supabase.createClient(cfg.supabaseUrl.trim(),cfg.supabaseAnonKey.trim(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){session=null;access=null;showLogin()}});
    showLoading('Checking existing session…');const {data,error}=await client.auth.getSession();if(error){showLogin(error.message);return}if(data?.session)await enter(data.session);else showLogin();
  }
  init();
})();
