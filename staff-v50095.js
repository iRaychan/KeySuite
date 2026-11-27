(() => {
  'use strict';
  const pageId = 'staffManagement';
  const byId = id => document.getElementById(id);
  const permitted = key => window.KeySuitePermissions?.level?.(key) === 'full';
  const active = () => byId(pageId)?.classList.contains('active') && permitted('view_staff');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let data = null;
  let generation = 0;
  let busy = false;
  const status = text => { byId('staffStatus').textContent = text; };
  const percentFields = [
    ['commission', 'Company Commission'],
    ['set_discount', 'Set Discount'],
    ['final_discount', 'Final Discount']
  ];

  function closeEditor() {
    const editor = byId('staffProfileEditor');
    editor.hidden = true;
    editor.replaceChildren();
  }

  function clear() {
    ++generation;
    data = null;
    busy = false;
    closeEditor();
    byId('staffProfileList').replaceChildren();
    byId('staffAdd').hidden = true;
    status('');
  }

  async function request(p_action, profile, payload) {
    if (!active()) throw Error('Staff access denied.');
    const client = window.KeySuiteAuth?.getClient?.();
    if (!client) throw Error('Sign in to manage Staff profiles.');
    const {data: response, error} = await client.rpc('keysuite_staff_profiles_v50095', {
      p_action, p_id: profile?.id ?? null, p_revision: profile?.revision ?? null, p_profile: payload ?? null
    });
    if (error) {
      if (['PGRST202', '42883'].includes(error.code)) throw Error('The Staff profile migration is required on this staging database.');
      throw error;
    }
    return response;
  }

  async function load() {
    clear();
    if (!active()) return;
    const token = generation;
    status('Loading Staff profiles…');
    try {
      const response = await request('list');
      if (token !== generation || !active()) return;
      data = response;
      const people = new Map(data.users.map(user => [user.id, user]));
      byId('staffProfileList').innerHTML = data.profiles.length ? `<ul class="staff-profiles">${data.profiles.map(profile => {
        const account = people.get(profile.user_id);
        return `<li><div><strong>${escape(profile.staff_name)}</strong><div class="muted">${escape(account?.email || 'Account unavailable')}</div></div><div>
          <button class="btn secondary" type="button" data-staff-edit="${escape(profile.id)}">${permitted('edit_staff') ? 'Edit' : 'View'}</button>
          ${permitted('delete_staff') ? `<button class="btn secondary" type="button" data-staff-delete="${escape(profile.id)}">Delete</button>` : ''}
        </div></li>`;
      }).join('')}</ul>` : '<p>No Staff profiles yet.</p>';
      byId('staffAdd').hidden = !permitted('add_staff');
      status('');
    } catch (error) {
      if (token === generation && active()) status(error.message || 'Unable to load Staff profiles.');
    }
  }

  function percentInput(name, label, value) {
    const percentage = Number((Number(value ?? 0) * 100).toFixed(8));
    return `<label>${escape(label)} (%)<input type="number" min="0" max="99.99999999" step="any" required
      name="${escape(name)}" value="${percentage}"></label>`;
  }

  function openEditor(profile = null) {
    if (!data || !active() || busy || (!profile && !permitted('add_staff'))) return;
    const canSave = permitted(profile ? 'edit_staff' : 'add_staff');
    const editor = byId('staffProfileEditor');
    const availableAccounts = data.users.filter(user => !data.profiles.some(p => p.user_id === user.id && p.id !== profile?.id));
    const options = (rows, selection, label) => rows.map(row =>
      `<option value="${escape(row.id)}" ${row.id === selection ? 'selected' : ''}>${escape(label(row))}</option>`).join('');
    const brands = data.brands.filter(brand => brand.active || Object.hasOwn(profile?.brand_margins ?? {}, brand.id));
    editor.innerHTML = `<h2>${profile ? (canSave ? 'Edit Staff' : 'View Staff') : 'Add Staff'}</h2>
      <form id="staffProfileForm">
        <fieldset ${canSave ? '' : 'disabled'}>
          <legend>Staff pricing profile</legend>
          <div class="staff-grid">
            <label>Staff Name<input required maxlength="120" name="staff_name" value="${escape(profile?.staff_name)}"></label>
            <label>Linked User Account<select name="user_id" required><option value="">Choose an account</option>
              ${options(availableAccounts, profile?.user_id, u => `${u.name || u.email} (${u.email})`)}</select></label>
            <label>Category<select name="category_id" required><option value="">Choose a Category</option>
              ${options(data.categories.filter(c => c.active || c.id === profile?.category_id), profile?.category_id, c => c.name + (c.active ? '' : ' (Archived)'))}</select></label>
            ${percentFields.map(([key,label]) => percentInput(key,label,profile?.[key])).join('')}
            <label>Fuel Charge (RM)<input type="number" min="0" step="any" name="fuel_charge_rm"
              value="${escape(profile?.fuel_charge_rm)}" placeholder="Automatic"></label>
          </div>
          <h3>Brand Margins</h3>
          <div class="staff-grid">${brands.map(brand => percentInput('brand_' + brand.id, brand.name, profile?.brand_margins?.[brand.id])).join('') || '<p>No company brands are configured.</p>'}</div>
        </fieldset>
        <div class="staff-actions">
          ${canSave ? '<button class="btn" type="submit">Save Staff</button>' : ''}
          <button type="button" class="btn secondary" id="staffCloseEditor">${canSave ? 'Cancel' : 'Close'}</button>
        </div>
      </form>`;
    editor.hidden = false;
    byId('staffCloseEditor').onclick = closeEditor;
    const form = byId('staffProfileForm');
    form.onsubmit = event => {
      event.preventDefault();
      if (!permitted(profile ? 'edit_staff' : 'add_staff') || !form.reportValidity()) return;
      const fields = new FormData(form);
      const fraction = key => Number(fields.get(key)) / 100;
      mutate(profile ? 'edit' : 'add', profile, {
        staff_name: String(fields.get('staff_name')).trim(), user_id: fields.get('user_id'), category_id: fields.get('category_id'),
        ...Object.fromEntries(percentFields.map(([key]) => [key, fraction(key)])),
        fuel_charge_rm: fields.get('fuel_charge_rm') === '' ? null : Number(fields.get('fuel_charge_rm')),
        brand_margins: Object.fromEntries(brands.map(brand => [brand.id, fraction('brand_' + brand.id)]))
      });
    };
    if (canSave) form.elements.staff_name.focus();
  }

  async function mutate(action, profile, payload) {
    if (busy || !active() || !permitted(action + '_staff')) return;
    busy = true;
    const token = generation;
    const submit = byId('staffProfileForm')?.querySelector('button[type=submit]');
    if (submit) submit.disabled = true;
    status('Saving…');
    try {
      await request(action, profile, payload);
      if (token === generation && active()) await load();
    } catch (error) {
      if (token === generation && active()) {
        status(error.message || 'Unable to save the Staff profile.');
        if (error.code === '42501') {
          clear();
          status('Staff access denied.');
        }
      }
    } finally {
      if (token === generation) busy = false;
      if (submit?.isConnected) submit.disabled = false;
    }
  }

  byId('staffAdd').onclick = () => openEditor();
  byId('staffProfileList').onclick = event => {
    if (!active() || !data || busy) return;
    const button = event.target.closest('[data-staff-edit],[data-staff-delete]');
    const profile = data.profiles.find(p => p.id === (button?.dataset.staffEdit || button?.dataset.staffDelete));
    if (!profile) return;
    if (button.dataset.staffEdit) openEditor(profile);
    else if (permitted('delete_staff') && window.confirm(`Delete the Staff profile for ${profile.staff_name}?`)) mutate('delete', profile);
  };
  window.addEventListener('KEYSUITE_PAGE_CHANGED', event => {
    if (event.detail?.page === pageId) load();
    else if (event.detail?.previousPage === pageId) clear();
  });
  for (const event of ['KEYSUITE_AUTH_CONTEXT_READY', 'keysuite-permissions-changed']) window.addEventListener(event, load);
})();
