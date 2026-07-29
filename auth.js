(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  let client=null;
  let session=null;
  let access=null;
  let profile=null;

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
    return {version:'1.03',release_date:'2026-07-29',currency:setting.currency||'MYR',source_currency:setting.source_currency||'USD',currency_multiplier:Number(setting.currency_multiplier||0),
      companies:(companies.data||[]).map(c=>({id:c.id,name:c.company_name,category:c.pricing_category,delivery_distance:Number(c.delivery_distance||0),phone:c.company_phone,term_days:c.term_days,address:c.address,tin:c.tin_number,business_registration_no:c.business_registration_no,sst_no:c.sst_no,msic_code:c.msic_code,business_activities:c.business_activities})),
      users:(users.data||[]).map(u=>({id:u.id,company_id:u.company_id,source_company_id:u.source_company_id,prefix:u.prefix,name:u.full_name,phone:u.phone,email:u.email})),
      categories:(categories.data||[]).map(c=>({id:c.id,name:c.category_name,final_discount:Number(c.final_discount||0),set_discount:Number(c.set_discount||0),commission:Number(c.commission||0),factors:{CHC:Number(c.chc_factor||1)},transport:Number(c.transport||0)})),
      products:(products.data||[]).map(p=>({id:p.id,category:p.product_category,model:p.model,prices_usd:{CHC:p.chc_usd===null?null:Number(p.chc_usd),CHCS:p.chcs_usd===null?null:Number(p.chcs_usd),CHCN:p.chcn_usd===null?null:Number(p.chcn_usd)},source_row:p.source_row}))};
  }
  function buildProfile(s,userAccess,data){
    const meta=s?.user?.user_metadata||{};
    const directory=(data?.users||[]).find(u=>String(u.email||'').toLowerCase()===String(s?.user?.email||'').toLowerCase())||{};
    return {
      display_name:String(meta.display_name||userAccess?.display_name||directory.name||s?.user?.email||'').trim(),
      designation:String(meta.designation||'').trim(),
      phone:String(meta.phone||directory.phone||'').trim(),
      email:String(s?.user?.email||userAccess?.email||'').toLowerCase(),
      role:userAccess?.role||'user',
      company_id:userAccess?.company_id||''
    };
  }
  function applyProfile(next){
    profile=next||profile||{};window.KEYSUITE_PROFILE=profile;
    el('sessionUserName').textContent=profile.display_name||profile.email||'Signed in';
    el('sessionUserEmail').textContent=`${profile.email||''}${profile.role?` · ${profile.role}`:''}`;
    window.KeySuiteApp?.applyProfile?.(profile);
  }
  async function enter(s){
    showLoading('Verifying approved user…');
    try{
      const userAccess=await verify(s?.user?.email||'');
      if(!userAccess){await client.auth.signOut({scope:'local'});showLogin('This account is valid, but it is not approved for KeySuite.');return}
      showLoading('Loading protected company and pricing data…');
      const data=await loadData();if(!data.companies.length)throw new Error('No company data was returned. Check the database and RLS policies.');
      session=s;access=userAccess;profile=buildProfile(s,access,data);
      window.KEYSUITE_SECURE_DATA=data;window.KEYSUITE_ACCESS=access;applyProfile(profile);
      window.KeySuitePricing?.init(data,access);unlockSelector();
      showLoading('Loading your customer access…');
      try{await window.KeySuiteCustomerStore?.load?.()}catch(error){console.warn('Customer load warning',error)}
      refreshAll();setView('app');
    }catch(error){console.error(error);try{await client.auth.signOut({scope:'local'})}catch(_){ }showLogin(`Secure data could not be loaded: ${error.message}`)}
  }
  async function signIn(event){
    event.preventDefault();message('');if(!client){message('Supabase is not configured. Keep your working config.js in the repository.','info');return}
    const email=el('loginEmail').value.trim().toLowerCase(),password=el('loginPassword').value;if(!email||!password){message('Enter both email and password.');return}
    busy(true);const {data,error}=await client.auth.signInWithPassword({email,password});if(error||!data?.session){busy(false);message(friendly(error));return}await enter(data.session)
  }
  async function signOut(){el('logoutButton').disabled=true;try{await client?.auth.signOut()}catch(error){console.warn(error)}session=null;access=null;profile=null;window.KEYSUITE_SECURE_DATA=null;window.KEYSUITE_ACCESS=null;window.KEYSUITE_PROFILE=null;el('logoutButton').disabled=false;showLogin('You have signed out.','info')}
  async function refreshSecure(){if(!session)return;await enter(session)}

  function settingsMessage(text,type='error'){
    const box=el('settingsMessage');box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message';
  }
  function openSettings(){
    if(!session||!profile)return;
    settingsMessage('');el('settingsDisplayName').value=profile.display_name||'';el('settingsDesignation').value=profile.designation||'';el('settingsPhone').value=profile.phone||'';el('settingsEmail').value=profile.email||'';
    el('settingsCurrentPassword').value='';el('settingsNewPassword').value='';el('settingsConfirmPassword').value='';el('settingsDialog').showModal();
  }
  function closeSettings(){el('settingsDialog')?.close()}
  async function saveSettings(event){
    event.preventDefault();if(!client||!session)return;
    const displayName=el('settingsDisplayName').value.trim(),designation=el('settingsDesignation').value.trim();
    const phone=typeof window.formatMYPhone==='function'?window.formatMYPhone(el('settingsPhone').value):el('settingsPhone').value.trim();
    const currentPassword=el('settingsCurrentPassword').value,newPassword=el('settingsNewPassword').value,confirmPassword=el('settingsConfirmPassword').value;
    if(!displayName){settingsMessage('Display Name is required.');return}
    const changingPassword=!!(currentPassword||newPassword||confirmPassword);
    if(changingPassword){
      if(!currentPassword||!newPassword||!confirmPassword){settingsMessage('Complete all three password fields.');return}
      if(newPassword.length<8){settingsMessage('The new password must contain at least 8 characters.');return}
      if(newPassword!==confirmPassword){settingsMessage('The new passwords do not match.');return}
    }
    const button=el('saveSettings');button.disabled=true;button.textContent='Saving…';settingsMessage('');
    try{
      if(changingPassword){
        const check=await client.auth.signInWithPassword({email:profile.email,password:currentPassword});
        if(check.error)throw new Error('The current password is incorrect.');
      }
      const metadata={...(session.user.user_metadata||{}),display_name:displayName,designation,phone};
      const profileResult=await client.auth.updateUser({data:metadata});if(profileResult.error)throw profileResult.error;
      if(changingPassword){const passwordResult=await client.auth.updateUser({password:newPassword});if(passwordResult.error)throw passwordResult.error}
      const sessionResult=await client.auth.getSession();if(sessionResult.data?.session)session=sessionResult.data.session;
      applyProfile({...profile,display_name:displayName,designation,phone});
      el('settingsPhone').value=phone;el('settingsCurrentPassword').value='';el('settingsNewPassword').value='';el('settingsConfirmPassword').value='';
      settingsMessage(changingPassword?'Profile and password updated.':'Profile updated.','info');
      setTimeout(closeSettings,700);
    }catch(error){console.error(error);settingsMessage(error.message||'Settings could not be saved.')}finally{button.disabled=false;button.textContent='Save Settings'}
  }

  async function init(){
    el('loginForm').addEventListener('submit',signIn);el('logoutButton').addEventListener('click',signOut);el('showPassword').addEventListener('change',event=>el('loginPassword').type=event.target.checked?'text':'password');el('refreshSecurePricing')?.addEventListener('click',refreshSecure);
    el('settingsButton')?.addEventListener('click',openSettings);el('settingsForm')?.addEventListener('submit',saveSettings);el('closeSettings')?.addEventListener('click',closeSettings);el('cancelSettings')?.addEventListener('click',closeSettings);
    if(!configReady()){showLogin('Your existing config.js is missing or incomplete. Keep the config.js that already works on GitHub.','info');return}
    if(!window.supabase?.createClient){showLogin('The Supabase library could not be loaded. Check the internet connection.');return}
    const cfg=window.KEYSUITE_CONFIG;client=window.supabase.createClient(cfg.supabaseUrl.trim(),cfg.supabaseAnonKey.trim(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){session=null;access=null;profile=null;showLogin()}});
    showLoading('Checking existing session…');const {data,error}=await client.auth.getSession();if(error){showLogin(error.message);return}if(data?.session)await enter(data.session);else showLogin();
  }

  window.KeySuiteAuth={getClient:()=>client,getSession:()=>session,getAccess:()=>access,getProfile:()=>profile,openSettings,refreshSecure};
  init();
})();
