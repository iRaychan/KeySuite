(() => {
  'use strict';

  let access=null,users=[],audit=[],editingEmail='',editingUser=null,bound=false;
  const el=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const role=()=>String(access?.role||'user').toLowerCase();
  const isOwner=()=>role()==='owner';
  const canManage=()=>isOwner();
  const client=()=>window.KeySuiteAuth?.getClient?.()||null;
  const title=value=>String(value||'').replace(/\b\w/g,ch=>ch.toUpperCase());

  function setMessage(id,text,type='error'){const box=el(id);if(!box)return;box.textContent=text||'';box.className=text?`auth-message show ${type}`:'auth-message'}
  function renderKeyDashboard(){const notice=el('keyDashboardNotice'),button=el('openRoleModule');if(!notice||!button)return;if(canManage()){notice.innerHTML=`Signed in as <b>${esc(access?.display_name||access?.email||'approved user')}</b> · <b>${esc(title(role()))}</b>. Owner access confirmed.`;notice.classList.add('active-customer');button.disabled=false;button.style.opacity='1'}else{notice.innerHTML='The Key Dashboard is restricted to Owner only.';button.disabled=true;button.style.opacity='.55'}}
  function formatDate(value){if(!value)return '-';try{return new Date(value).toLocaleString('en-MY',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return value}}

  function renderUsers(){
    const rows=el('roleRows');if(!rows)return;if(!users.length){rows.innerHTML='<tr><td colspan="6" class="muted">No approved users found.</td></tr>';return}
    rows.innerHTML=users.map(user=>{const userRole=String(user.role||'user').toLowerCase();return `<tr><td><b>${esc(user.display_name||'-')}</b></td><td>${esc(user.email)}</td><td><span class="role-badge ${esc(userRole)}">${esc(userRole)}</span></td><td>${user.active?'<span class="badge won">Active</span>':'<span class="badge lost">Inactive</span>'}</td><td>${user.auth_exists?'<span class="auth-state ok">Login ready</span>':'<span class="auth-state missing">Invitation required</span>'}</td><td><div class="role-row-actions"><button class="btn secondary edit-role-user" type="button" data-email="${esc(user.email)}">Edit</button>${!user.auth_exists?`<button class="btn invite-role-user" type="button" data-invite-email="${esc(user.email)}">Invite</button>`:''}</div></td></tr>`}).join('');
    rows.querySelectorAll('.edit-role-user').forEach(button=>button.addEventListener('click',()=>openEdit(button.dataset.email)));rows.querySelectorAll('.invite-role-user').forEach(button=>button.addEventListener('click',()=>inviteExisting(button.dataset.inviteEmail,button)));
  }

  function renderAudit(){const rows=el('roleAuditRows');if(!rows)return;if(!audit.length){rows.innerHTML='<tr><td colspan="5" class="muted">No role changes recorded yet.</td></tr>';return}rows.innerHTML=audit.map(row=>`<tr><td class="role-audit-time">${esc(formatDate(row.changed_at))}</td><td><b>${esc(row.target_display_name||row.target_email)}</b><div class="muted">${esc(row.target_email)}</div></td><td>${row.old_role?`<span class="role-badge ${esc(row.old_role)}">${esc(row.old_role)}</span>${row.old_active===false?' · Inactive':''}`:'New user'}</td><td><span class="role-badge ${esc(row.new_role)}">${esc(row.new_role)}</span>${row.new_active===false?' · Inactive':''}</td><td>${esc(row.changed_by_email||'-')}</td></tr>`).join('')}

  async function load(){
    renderKeyDashboard();const notice=el('roleAccessNotice');if(!canManage()){if(notice)notice.textContent='Role management is restricted to Owner only.';if(typeof showPage==='function')showPage('keyDashboard');return}
    const db=client();if(!db)return;if(notice){notice.textContent='Loading approved users…';notice.classList.remove('active-customer')}
    try{const [userResult,auditResult]=await Promise.all([db.rpc('keysuite_list_role_users'),db.rpc('keysuite_list_role_audit',{p_limit:30})]);if(userResult.error)throw userResult.error;if(auditResult.error)throw auditResult.error;users=userResult.data||[];audit=auditResult.data||[];if(notice){notice.innerHTML=`<b>${users.length}</b> approved user${users.length===1?'':'s'}. New users can receive a secure invitation email to set their own password.`;notice.classList.add('active-customer')}renderUsers();renderAudit()}catch(error){console.error(error);if(notice)notice.textContent=`Role data could not be loaded: ${error.message||error}.`;users=[];audit=[];renderUsers();renderAudit()}
  }

  function setRoleOptions(selected='user'){const select=el('roleUserRole');if(!select)return;select.value=selected||'user';select.disabled=false}
  function setInviteRow(show,checked=true){const row=el('roleInviteRow');if(row)row.style.display=show?'block':'none';const input=el('roleSendInvite');if(input)input.checked=checked}

  function openAdd(){if(!canManage())return;editingEmail='';editingUser=null;setMessage('roleDialogMessage','');el('roleDialogTitle').textContent='Add User';el('roleUserEmail').readOnly=false;el('roleUserEmail').value='';el('roleUserDisplayName').value='';setRoleOptions('user');el('roleUserActive').value='true';setInviteRow(true,true);el('roleUserDialog').showModal()}
  function openEdit(email){const user=users.find(item=>String(item.email).toLowerCase()===String(email).toLowerCase());if(!user)return;editingEmail=user.email;editingUser=user;setMessage('roleDialogMessage','');el('roleDialogTitle').textContent='Edit User Role';el('roleUserEmail').value=user.email;el('roleUserEmail').readOnly=true;el('roleUserDisplayName').value=user.display_name||'';setRoleOptions(user.role);el('roleUserActive').value=user.active?'true':'false';setInviteRow(!user.auth_exists,!user.auth_exists);el('roleUserDialog').showModal()}
  function closeDialog(){el('roleUserDialog')?.close()}
  function openPermissions(){if(isOwner())el('rolePermissionsDialog')?.showModal()}
  function closePermissions(){el('rolePermissionsDialog')?.close()}

  async function sendInvitation(user){
    const db=client();if(!db)throw new Error('Supabase is not connected.');
    const redirectTo=`${location.origin}${location.pathname}`;
    const {data,error}=await db.functions.invoke('keysuite-invite-user',{body:{email:user.email,display_name:user.display_name,role:user.role,redirect_to:redirectTo}});
    if(error)throw new Error(`${error.message||error}. Deploy the included Supabase Edge Function “keysuite-invite-user”.`);
    if(data?.error)throw new Error(data.error);
    return data||{};
  }

  async function inviteExisting(email,button){
    const user=users.find(item=>String(item.email).toLowerCase()===String(email).toLowerCase());if(!user)return;
    const original=button.textContent;button.disabled=true;button.textContent='Sending…';
    try{await sendInvitation(user);alert(`Invitation sent to ${user.email}. The user can set their own password from the email link.`);await load()}catch(error){console.error(error);alert(`Invitation could not be sent: ${error.message||error}`)}finally{button.disabled=false;button.textContent=original}
  }

  async function save(event){
    event.preventDefault();if(!canManage())return;
    const email=el('roleUserEmail').value.trim().toLowerCase(),displayName=el('roleUserDisplayName').value.trim(),nextRole=el('roleUserRole').value,active=el('roleUserActive').value==='true',sendInvite=!!el('roleSendInvite')?.checked;
    if(!/^\S+@\S+\.\S+$/.test(email)){setMessage('roleDialogMessage','Enter a valid email address.');return}if(!displayName){setMessage('roleDialogMessage','Display Name is required.');return}
    const button=el('saveRoleUser');button.disabled=true;button.textContent='Saving…';setMessage('roleDialogMessage','');
    try{
      const result=await client().rpc('keysuite_manage_user_role',{p_email:email,p_display_name:displayName,p_role:nextRole,p_active:active});if(result.error)throw result.error;
      let invitationText='';
      if(sendInvite&&!editingUser?.auth_exists){button.textContent='Sending invite…';try{const result=await sendInvitation({email,display_name:displayName,role:nextRole});invitationText=result?.status==='already_exists'?' Login account already exists.':' Invitation email sent; the user will set their own password.'}catch(inviteError){invitationText=` Access was saved, but the invitation failed: ${inviteError.message||inviteError}`}}
      setMessage('roleDialogMessage',`${editingEmail?'Role updated.':'User access added.'}${invitationText}`,'info');await load();if(!invitationText.includes('failed'))setTimeout(closeDialog,1100);
    }catch(error){console.error(error);setMessage('roleDialogMessage',error.message||'The user role could not be saved.')}finally{button.disabled=false;button.textContent='Save User'}
  }

  function bind(){
    if(bound)return;bound=true;el('openRoleModule')?.addEventListener('click',()=>{if(!canManage()){alert('Only the Owner can open Role.');return}if(typeof showPage==='function')showPage('roleManagement')});el('viewRolePermissions')?.addEventListener('click',openPermissions);el('closeRolePermissions')?.addEventListener('click',closePermissions);el('closeRolePermissionsBottom')?.addEventListener('click',closePermissions);el('addRoleUser')?.addEventListener('click',openAdd);el('reloadRoles')?.addEventListener('click',load);el('roleUserForm')?.addEventListener('submit',save);el('closeRoleDialog')?.addEventListener('click',closeDialog);el('cancelRoleDialog')?.addEventListener('click',closeDialog);
  }
  function init(userAccess){access=userAccess||access;bind();renderKeyDashboard()}
  function pageShown(id){if(id==='keyDashboard')renderKeyDashboard();if(id==='roleManagement')load()}
  window.KeySuiteRoles={init,pageShown,load};
})();
