(() => {
  'use strict';
  const models = [
    { name: 'BSV 32G05', kw: 0.37, hp: 0.5, discharge: 'G1¼' },
    { name: 'BSV 65G20', kw: 1.5, hp: 2, discharge: 'G2½' },
    { name: 'BSV 80G10', kw: 0.75, hp: 1, discharge: 'G3' },
    { name: 'BSV 100G30', kw: 1.5, hp: 3, discharge: 'G4' },
  ];
  const variants = ['MA', 'T'];
  const poles = 2;
  const rpm = 2900;
  const key = (model, variant) => model + '|' + variant;
  const table = 'ks_bsv_variant_prices_v50043';
  const prices = new Map();
  let loaded = false;
  let busy = false;
  let request = 0;
  const get = id => document.getElementById(id);
  const client = () => window.KeySuiteAuth?.getClient?.();
  const owner = () => String(window.KEYSUITE_ACCESS?.role).toLowerCase() === 'owner';
  const configuration = (model, variant) => {
    const row = models.find(m => m.name === model);
    if (!row || !variants.includes(variant)) return null;
    const ma = variant === 'MA';
    const name = model + '-' + poles + variant;
    const hp = row.hp;
    const description = [
      'B.G.Reich Submersible Pump Model: ' + name,
      `c/w ${hp}HP ${poles}Pole Motor (${ma ? '240V / 1Ph' : '415V / 3Ph'} / 50Hz)`,
      'Discharge: ' + row.discharge,
      'Pump Material: CI / CI / 45C / Mech Seal',
      ...(ma ? ['c/w Float switch'] : []),
    ].join('\n');
    return { name, hp, catalogueKw: row.kw, discharge: row.discharge, poles, rpm, description };
  };
  function findPrice(model, variant, options = {}) {
    const config = configuration(model, variant);
    const row = loaded && prices.get(key(model, variant));
    const customer = options.customer || window.KeySuiteApp?.getPricingCustomer?.();
    const category = options.category || window.KEYSUITE_SECURE_DATA?.categories?.find(c => c.id === customer?.pricingCategoryId);
    if (!config || !row || !customer || !category) return null;
    const book = Object.fromEntries(['USD', 'RMB', 'MYR'].map(c => [c, { [variant]: row['price_' + c.toLowerCase()] }]));
    const calc = window.KeySuitePricing.calculatePrice(book, variant, category, 'BSV', { ...options, customer, rarity: row.rarity });
    return calc ? { product: { id: model, model: config.name }, material: variant, variant, family: 'BSV', customer, category, calc, sourceExtra: { technical_model: model } } : null;
  }
  function message(text) {
    const node = get('bsvPriceListMessage');
    node.textContent = text;
    node.classList.toggle('show', !!text);
  }
  async function load() {
    if (busy) return;
    const id = ++request;
    loaded = false;
    prices.clear();
    renderPrices();
    if (!client()) return;
    try {
      const { data, error } = await client().from(table).select('*').in('variant', variants);
      if (id !== request) return;
      if (error) throw error;
      for (const row of data) prices.set(key(row.model, row.variant), row);
      loaded = true;
      message('');
    } catch (e) {
      if (id === request) message(e.message);
    } finally {
      if (id === request) renderPrices();
    }
  }
  function renderPrices() {
    const body = get('bsvPriceRows');
    if (!body) return;
    const currency = get('bsvPriceCurrency').value;
    const column = 'price_' + currency.toLowerCase();
    const editable = loaded && owner() && !busy;
    const disabled = editable ? '' : 'disabled';
    body.innerHTML = models.map(model => `<tr><th scope="row">${model.name}</th>${variants.map(variant => {
      const row = prices.get(key(model.name, variant));
      return `<td><div class="currency-price-input"><span>${currency}</span><input style="min-width:0" aria-label="${model.name} ${variant} price" type="number" min="0" step=".01" data-price="${variant}" value="${row?.[column] ?? ''}" ${disabled}></div></td>
        <td><select aria-label="${model.name} ${variant} rarity" data-rarity="${variant}" ${disabled}>${['many','common','rare'].map(x => `<option value="${x}" ${x === (row?.rarity || 'many') ? 'selected' : ''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></td>`;
    }).join('')}<td><button class="btn" type="button" ${disabled}>Save</button></td></tr>`).join('');
    [...body.rows].forEach((row, index) => row.querySelector('button').onclick = async () => {
      if (busy || !loaded || !owner()) return;
      const model = models[index].name;
      const payload = variants.map(variant => {
        const input = row.querySelector(`[data-price="${variant}"]`);
        if (!input.reportValidity()) return null;
        return { model, variant, [column]: input.value === '' ? null : Number(input.value), rarity: row.querySelector(`[data-rarity="${variant}"]`).value };
      });
      if (payload.includes(null)) return;
      busy = true;
      const controls = [...body.querySelectorAll('input,select,button'), get('bsvPriceCurrency')];
      controls.forEach(node => node.disabled = true);
      try {
        const { data, error } = await client().from(table).upsert(payload, { onConflict: 'model,variant', defaultToNull: false }).select();
        if (error || data?.length !== 2) throw error || Error('The database did not confirm both prices.');
        for (const saved of data) prices.set(key(saved.model, saved.variant), saved);
        message(model + ' saved.');
        window.KeySuitePricing.refreshQuotePrices?.();
      } catch (e) {
        message(e.message);
      } finally {
        busy = false;
        controls.forEach(node => node.disabled = !owner() && node !== get('bsvPriceCurrency'));
      }
    });
  }
  function action(model, variant, mode) {
    const config = configuration(model, variant);
    if (!config || window.KeySuitePermissions?.can?.(mode === 'cost' ? 'view_costing_breakdown' : 'create_quotations') !== true) return;
    const pricing = window.KeySuitePricing;
    if (!loaded) return alert('BSV prices are unavailable. Reopen the BSV product page to reload them.');
    const customer = window.KeySuiteApp?.getPricingCustomer?.();
    const category = window.KEYSUITE_SECURE_DATA?.categories?.find(c => c.id === customer?.pricingCategoryId);
    if (!customer || !category) return alert('Select a customer with a pricing category first.');
    const found = findPrice(model, variant, { pricingMode: mode === 'assembly' ? 'assembly' : 'quotation' });
    if (!found) return alert(`No price is available for ${config.name}. Check its BSV price list and the category’s enabled currencies.`);
    const blocked = pricing.quoteBlockReason(found.calc);
    if (blocked && mode !== 'cost') return alert(`${config.name}: ${blocked}`);
    const item = { model: config.name, description: config.description, qty: 1, unitPrice: found.calc.finalPrice, pricingSource: pricing.sourceSnapshot(found), productFamily: 'BSV', assemblyLevel: 'COMPLETE_PUMPSET', assemblySection: 'pumpset' };
    if (mode === 'cost') return window.KeySuiteCostingAudit?.open(item, config.name + ' Costing Audit');
    if (mode === 'assembly') return window.KeySuiteAssembly?.addItem(item);
    if (window.KeySuiteApp?.addExternalQuoteItem(item)) window.KeySuiteApp.showPage('quotation');
  }
  function renderProduct() {
    const variant = get('bsvProductPhase').value === '1Ph' ? 'MA' : 'T';
    get('bsvProductFloat').value = variant === 'MA' ? 'Yes' : 'No';
    const modelInput = get('bsvProductModelInput');
    const otherSuffix = /-2(?:MA|T)$/i;
    if (otherSuffix.test(modelInput.value.trim())) modelInput.value = modelInput.value.trim().replace(otherSuffix, '-2' + variant);
    const query = [modelInput.value, get('bsvProductSearch').value].map(x => x.trim().toUpperCase().replace(otherSuffix, ''));
    const rows = models.filter(m => query.every(q => m.name.includes(q)));
    const showCost = window.KeySuitePermissions?.can?.('view_costing_breakdown') === true;
    const showQuote = window.KeySuitePermissions?.can?.('create_quotations') === true;
    const grid = get('bsvProductGrid');
    get('bsvProductCount').textContent = `${rows.length} of ${models.length} workbook models`;
    grid.innerHTML = rows.map(m => {
      const config = configuration(m.name, variant);
      return `<div class="product-model-row"><div><h3>${config.name}</h3><div class="muted">${config.catalogueKw} kW (catalogue) · ${config.hp} HP · ${config.poles} Pole · ${config.rpm} rpm · Discharge: ${config.discharge}</div></div><div class="product-model-actions">
        ${showCost ? '<button class="btn keysuite-cost-button product-action-button" data-action="cost">Cost</button>' : ''}
        ${showQuote ? '<button class="btn action-assembly product-action-button" data-action="assembly">Assembly</button><button class="btn action-quote product-action-button" data-action="quotation">Quote</button>' : ''}
      </div></div>`;
    }).join('') || '<div class="product-empty">No matching BSV model.</div>';
    [...grid.children].forEach((node, i) => node.querySelectorAll('[data-action]').forEach(button => button.onclick = () => action(rows[i].name, variant, button.dataset.action)));
  }
  window.KeySuiteBSV = { configuration, findPrice, renderPrices };
  document.addEventListener('DOMContentLoaded', () => {
    get('bsvProductModelOptions').innerHTML = models.map(m => `<option value="${m.name}"></option>`).join('');
    for (const id of ['bsvProductModelInput','bsvProductSearch']) get(id).addEventListener('input', renderProduct);
    get('bsvProductPhase').addEventListener('change', renderProduct);
    renderProduct();
    renderPrices();
  }, { once: true });
  window.addEventListener('KEYSUITE_AUTH_CONTEXT_READY', load);
  window.addEventListener('keysuite-permissions-changed', renderProduct);
  window.addEventListener('KEYSUITE_PAGE_CHANGED', e => {
    if (e.detail.page === 'bsvPriceList' || e.detail.page === 'productBsv') load();
  });
})();
