(() => {
  'use strict';

  let access=null;
  let users=[];
  let audit=[];
  let editingEmail='';
  let bound=false;

  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const role=()=>String(access?.role||'user').toLowerCase();
  const canManage=()=>['owner','admin'].includes(role());
  const isOwner=()=>role()==='owner';
  const client=()=>window.KeySuiteAuth?.getClient?.()||null;
  const title=value=>String(value||'').replace(/\b\w/g,ch=>ch.toUpperCase());

  function setMessage(id,text,type='error'){
    const box=el(id);if(!box)return;
    box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message';
  }

  function renderKeyDashboard(){
    const notice=el('keyDashboardNotice'),roleButton=el('openRoleModule');
    if(!notice||!roleButton)return;
    if(canManage()){
      notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'approved user')}</b> · <b>${esc(title(role()))}</b>. Role management is available.`;
      notice.classList.add('active-customer');
      roleButton.disabled=false;roleButton.style.opacity='1';roleButton.title='Open Role';
    }else{
      notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'approved user')}</b> · <b>${esc(title(role()))}</b>. Role management is restricted to Owner/Admin.`;
      roleButton.disabled=true;roleButton.style.opacity='.55';roleButton.title='Owner/Admin only';
    }
  }

  function formatDate(value){
    if(!value)return '-';
    try{return new Date(value).toLocaleString('en-MY',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return value}
  }

  function renderUsers(){
    const rows=el('roleRows');if(!rows)return;
    if(!users.length){rows.innerHTML='<tr><td colspan="6" class="muted">No approved users found.</td></tr>';return}
    rows.innerHTML=users.map(user=>{
      const userRole=String(user.role||'user').toLowerCase();
      const canEdit=isOwner()||(role()==='admin'&&userRole!=='owner');
      return `<tr>
        <td><b>${esc(user.display_name||'-')}</b></td>
        <td>${esc(user.email)}</td>
        <td><span class="role-badge ${esc(userRole)}">${esc(userRole)}</span></td>
        <td>${user.active?'<span class="badge won">Active</span>':'<span class="badge lost">Inactive</span>'}</td>
        <td>${user.auth_exists?'<span class="auth-state ok">Login ready</span>':'<span class="auth-state missing">Create Auth user</span>'}</td>
        <td>${canEdit?`<button class="btn secondary edit-role-user" type="button" data-email="${esc(user.email)}">Edit</button>`:'<span class="muted">Protected</span>'}</td>
      </tr>`;
    }).join('');
    rows.querySelectorAll('.edit-role-user').forEach(button=>button.addEventListener('click',()=>openEdit(button.dataset.email)));
  }

  function renderAudit(){
    const rows=el('roleAuditRows');if(!rows)return;
    if(!audit.length){rows.innerHTML='<tr><td colspan="5" class="muted">No role changes recorded yet.</td></tr>';return}
    rows.innerHTML=audit.map(row=>`<tr>
      <td class="role-audit-time">${esc(formatDate(row.changed_at))}</td>
      <td><b>${esc(row.target_display_name||row.target_email)}</b><div class="muted">${esc(row.target_email)}</div></td>
      <td>${row.old_role?`<span class="role-badge ${esc(row.old_role)}">${esc(row.old_role)}</span>${row.old_active===false?' · Inactive':''}`:'New user'}</td>
      <td><span class="role-badge ${esc(row.new_role)}">${esc(row.new_role)}</span>${row.new_active===false?' · Inactive':''}</td>
      <td>${esc(row.changed_by_email||'-')}</td>
    </tr>`).join('');
  }

  async function load(){
    renderKeyDashboard();
    const notice=el('roleAccessNotice');
    if(!canManage()){
      if(notice)notice.textContent='Role management is restricted to Owner/Admin.';
      if(typeof showPage==='function')showPage('keyDashboard');
      return;
    }
    const db=client();if(!db)return;
    if(notice){notice.textContent='Loading approved users…';notice.classList.remove('active-customer')}
    try{
      const [userResult,auditResult]=await Promise.all([
        db.rpc('keysuite_list_role_users'),
        db.rpc('keysuite_list_role_audit',{p_limit:30})
      ]);
      if(userResult.error)throw userResult.error;
      if(auditResult.error)throw auditResult.error;
      users=userResult.data||[];audit=auditResult.data||[];
      if(notice){notice.innerHTML=`<b>${users.length}</b> approved user${users.length===1?'':'s'} in your company. Changes apply after refresh or next sign-in.`;notice.classList.add('active-customer')}
      renderUsers();renderAudit();
    }catch(error){
      console.error(error);
      if(notice)notice.textContent=`Role data could not be loaded: ${error.message||error}. Run the V1.12 Supabase migration first.`;
      users=[];audit=[];renderUsers();renderAudit();
    }
  }

  function setRoleOptions(selected='user',lockedOwner=false){
    const select=el('roleUserRole');if(!select)return;
    [...select.options].forEach(option=>{
      option.disabled=option.value==='owner'&&!isOwner();
    });
    select.value=selected||'user';
    if(lockedOwner&&!isOwner())select.disabled=true;else select.disabled=false;
  }

  function openAdd(){
    if(!canManage())return;
    editingEmail='';setMessage('roleDialogMessage','');
    el('roleDialogTitle').textContent='Add User Access';
    el('roleUserEmail').readOnly=false;el('roleUserEmail').value='';
    el('roleUserDisplayName').value='';setRoleOptions('user');el('roleUserActive').value='true';
    el('roleUserDialog').showModal();
  }

  function openEdit(email){
    const user=users.find(item=>String(item.email).toLowerCase()===String(email).toLowerCase());if(!user)return;
    if(!isOwner()&&String(user.role).toLowerCase()==='owner')return;
    editingEmail=user.email;setMessage('roleDialogMessage','');
    el('roleDialogTitle').textContent='Edit User Role';
    el('roleUserEmail').value=user.email;el('roleUserEmail').readOnly=true;
    el('roleUserDisplayName').value=user.display_name||'';setRoleOptions(user.role,String(user.role).toLowerCase()==='owner');
    el('roleUserActive').value=user.active?'true':'false';
    el('roleUserDialog').showModal();
  }

  function closeDialog(){el('roleUserDialog')?.close()}

  async function save(event){
    event.preventDefault();if(!canManage())return;
    const email=el('roleUserEmail').value.trim().toLowerCase();
    const displayName=el('roleUserDisplayName').value.trim();
    const nextRole=el('roleUserRole').value;
    const active=el('roleUserActive').value==='true';
    if(!/^\S+@\S+\.\S+$/.test(email)){setMessage('roleDialogMessage','Enter a valid email address.');return}
    if(!displayName){setMessage('roleDialogMessage','Display Name is required.');return}
    const button=el('saveRoleUser');button.disabled=true;button.textContent='Saving…';setMessage('roleDialogMessage','');
    try{
      const result=await client().rpc('keysuite_manage_user_role',{p_email:email,p_display_name:displayName,p_role:nextRole,p_active:active});
      if(result.error)throw result.error;
      setMessage('roleDialogMessage',editingEmail?'Role updated.':'User access added. Create the same email under Supabase Authentication if Login shows “Create Auth user”.','info');
      await load();
      setTimeout(closeDialog,700);
    }catch(error){
      console.error(error);setMessage('roleDialogMessage',error.message||'The user role could not be saved.');
    }finally{button.disabled=false;button.textContent='Save User'}
  }

  function bind(){
    if(bound)return;bound=true;
    el('openRoleModule')?.addEventListener('click',()=>{if(!canManage()){alert('Only Owner/Admin can open Role.');return}if(typeof showPage==='function')showPage('roleManagement')});
    el('addRoleUser')?.addEventListener('click',openAdd);
    el('reloadRoles')?.addEventListener('click',load);
    el('roleUserForm')?.addEventListener('submit',save);
    el('closeRoleDialog')?.addEventListener('click',closeDialog);
    el('cancelRoleDialog')?.addEventListener('click',closeDialog);
  }

  function init(userAccess){access=userAccess||access;bind();renderKeyDashboard()}
  function pageShown(id){
    if(id==='keyDashboard')renderKeyDashboard();
    if(id==='roleManagement')load();
  }

  window.KeySuiteRoles={init,pageShown,load};
})();
