const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8302';
const readOnly = process.env.KEYSTOCK_READ_ONLY === '1';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1500, height: 1020 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const at = selector => page.locator(selector);
    const tab = key => at(`#stockTabs [data-tab="${key}"]`).click();
    async function rpc(action, payload) {
      const res = await context.request.post(base + '/__stock_rpc', { data: { p_action: action, p_payload: payload } });
      return res.json();
    }
    const initial = (await rpc('state')).data;
    const model = initial.catalog.find(row => row.model === 'ES 32-13' && row.family === 'ES');
    if (!readOnly) {
      const location = '90000000-0000-4000-8000-000000000001';
      const id = '90000000-0000-4000-8000-000000000002';
      const group = initial.groups.find(g => g.item_key === model.key && g.kind === 'normal');
      const old = initial.configurations.find(c => c.item_key === model.key && c.selections[group.id]);
      assert.equal((await rpc('location', { id: location, label: 'A01 / Rack 3' })).error, null);
      const result = await rpc('opening', { id, item_key: model.key, selections: old.selections,
        location_id: location, supplier_id: initial.suppliers[0].id, quantity: 3 });
      assert.equal(result.error, null);
    }
    const before = (await rpc('state')).data;
    await page.goto(base + '/__safari_fixture.html');
    await page.getByText('Open local KeyStock test', { exact: true }).click();
    await at('#stockTable [data-stock-detail]').first().waitFor();
    assert.equal(await at('html').getAttribute('data-keysuite-version'), '5.00.53');
    assert.deepEqual(await page.evaluate(() => {
      const stock = document.querySelector('#keyStockNav');
      return [stock.previousElementSibling.textContent.trim(), stock.textContent.trim(), stock.nextElementSibling.textContent.trim()];
    }), ['Pumpset', 'KeyStock', 'KeyBot']);
    assert.equal(await at('#keyStockNav svg[aria-hidden="true"]').count(), 1);
    assert.match(await at('#keyStockNav').evaluate(node => getComputedStyle(node).boxShadow), /rgb\(22, 239, 247\)/);
    if (!readOnly) {
      await page.evaluate(() => {
        const permissions = window.KeySuitePermissions;
        const level = permissions.level.bind(permissions);
        permissions.level = (key, role) =>
          ['create_quotations', 'use_selector', 'key_dashboard'].includes(key) ? 'full' : level(key, role);
        syncOwnerKeyVisibility();
      });
      for (const module of ['system', 'pumpset']) {
        const button = at(`aside [data-assembly-open="${module}"]`);
        assert.equal(await button.isVisible(), true);
        assert.match(await button.evaluate(node => getComputedStyle(node).borderColor), /rgb\(255, (19\d|20\d|21\d), 0\)/);
      }
    }
    assert.deepEqual(await at('#stockTabs button').allTextContents(),
      ['Stock Check', 'Missing Parts', 'Reservations', 'Stock Movement', 'Stock History', ...(readOnly ? [] : ['Dropdown Management'])]);
    await at('#stockQuery').fill('es 32-13');
    assert.equal(await at('#stockTable [data-stock-detail]').count(), 1);
    assert.match(await at('#stockTable tbody').innerText(), readOnly ? /\b14\b/ : /\b17\b/);
    await at('#stockCheckFilter summary').click();
    if (!readOnly) {
      await at('#stockQuery').fill('');
      await at('#stockFilterLocation').fill('a01 /');
      assert.equal(await at('#stockTable [data-stock-detail]').count(), 1);
      await at('#stockFilterSupplier').fill('does not exist');
      assert.equal(await at('#stockTable [data-stock-detail]').count(), 0);
      await at('#stockFilterSupplier').fill('legacy supplier');
      await at('#stockQuery').fill('es 32-13');
    }
    await at('#stockTable [data-stock-detail]').click();
    assert.equal(await at('#stockTable').count(), 0);
    assert.equal(await at('.stock-detail-metrics > div').count(), 4);
    assert.equal(await at('#stockDateOrder').inputValue(), 'oldest');
    assert.equal(await at('.stock-phase2-table tbody tr').count(), readOnly ? 2 : 1);
    await at('#stockDateOrder').selectOption('newest');
    await at('#stockDetailBack').click();
    assert.equal(await at('#stockQuery').inputValue(), 'es 32-13');
    assert.equal(await at('#stockFilterLocation').inputValue(), readOnly ? '' : 'a01 /');
    await tab('missing');
    assert.match(await at('#stockMissingResults').innerText(), /ES 32-13[\s\S]*Cover[\s\S]*Unknown/);
    await at('[data-missing-filter="component"]').fill('no component');
    assert.match(await at('#stockMissingResults').innerText(), /No recorded shortages/);
    await tab('reservations');
    assert.match(await at('#stockContent').innerText(), /no reservation ledger/);
    await tab('movement');
    assert.equal(await at('#stockMovementTime').getAttribute('open'), null);
    assert.match(await at('#stockMovementTime summary').innerText(), /Last 30 Days/);
    await at('#stockMovementTime summary').click();
    await at('#stockMovementTime select').selectOption('7');
    await at('#stockMovementTime summary').click();
    await tab('history');
    assert.match(await at('#stockHistoryTime summary').innerText(), /All Time/);
    await at('#stockHistoryModel').fill('es 32-13');
    await at('#stockHistorySelection').selectOption(model.key);
    assert.match(await at('.stock-history-metrics').innerText(), readOnly ? /Current Stock\s+14/ : /Current Stock\s+17/);
    assert.equal(await at('#stockHistoryResults tbody tr').count(), readOnly ? 2 : 3);
    await at('#stockHistoryTime summary').click();
    await at('#stockHistoryTime select').selectOption('custom');
    await at('#stockHistoryTime [data-date="to"]').fill('2000-01-01');
    assert.match(await at('#stockHistoryResults').innerText(), /No opening-balance events/);
    await tab('movement');
    assert.match(await at('#stockMovementTime summary').innerText(), /Last 7 Days/);
    if (!readOnly) {
      await tab('dropdowns');
      for (const [index, value] of ['ES', 'Normal Group', 'Housing', 'Round'].entries()) {
        await at(`[data-dropdown-filter="${index}"]`).fill(value);
      }
      assert.match(await at('#stockDropdownOverview').innerText(), /ES 32-13/);
      await at('[data-dropdown-filter="3"]').fill('no option');
      assert.match(await at('#stockDropdownOverview').innerText(), /No groups match/);
      await at('#stockUtilities summary').click();
      await at('[data-stock-tool="input"]').click();
      await at('#stockModel').selectOption(model.key);
      assert.match(await at('#stockContent').innerText(), /Opening balance history/);
    } else {
      assert.equal(await at('[data-stock-tool="input"],[data-tab="dropdowns"]').count(), 0);
      assert.match((await rpc('group', { item_key: model.key })).error.message, /permission required/);
    }
    await tab('check');
    if (process.env.KEYSTOCK_REVIEW_PNG && !readOnly) {
      await page.screenshot({ path: process.env.KEYSTOCK_REVIEW_PNG });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await at('.stock-workspace').evaluate(n => n.scrollWidth <= n.clientWidth), true);
    const after = (await rpc('state')).data;
    for (const key of ['opening_balances', 'configurations', 'mappings', 'purchase_costs']) {
      assert.deepEqual(after[key], before[key], key + ' unchanged while browsing');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: Phase 2 review UI (${readOnly ? 'read-only' : 'owner'}), navigation, stock filters, batches, history and preserved data.`);
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
