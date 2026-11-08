const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.KEYSUITE_TEST_URL||'http://127.0.0.1:8304';
const readOnly=process.env.KEYSTOCK_READ_ONLY==='1';

async function run(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1500,height:1020}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    const page=await context.newPage();
    page.setDefaultTimeout(8000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const at=selector=>page.locator(selector);
    const tab=key=>at(`#stockTabs [data-tab="${key}"]`).click();
    const state=async()=> (await (await context.request.post(base+'/__stock_rpc',
      {data:{p_action:'state',p_payload:{ledger_client:'v102'}}})).json()).data;
    const saved=()=>page.getByText('Saved successfully.',{exact:true}).waitFor();
    const initial=await state();
    const model=initial.catalog.find(row=>row.family==='ISO');
    const locA=initial.locations.find(l=>l.label.startsWith('A01')).id;
    const locB=initial.locations.find(l=>l.label.startsWith('B01')).id;
    await page.goto(base+'/__safari_fixture.html');
    await page.getByText('Open local KeyStock test',{exact:true}).click();
    await at('#stockTable [data-stock-detail]').first().waitFor();
    assert.equal(await at('html').getAttribute('data-keysuite-version'),'5.00.54');
    assert.equal(await at('#stockVersion').textContent(),'V1.02');
    assert.match(await at('#keyStockNav').evaluate(node=>getComputedStyle(node).boxShadow),/rgb\(22, 239, 247\)/);
    assert.deepEqual(await at('#stockTabs button').allTextContents(),
      ['Stock Check','Missing Parts','Reservations','Stock Movement','Stock History',...(readOnly?[]:['Add Stock','Dropdown Management'])]);
    if(readOnly){
      await tab('reservations');
      assert.equal(await at('#stockReservationForm').count(),0);
      await tab('movement');
      assert.equal(await at('#stockMovementForm').count(),0);
      assert(initial.ledger.lots.every(l=>!Object.hasOwn(l,'unit_cost_myr')));
      assert.deepEqual(errors,[]);
      console.log('PASS: V5.00.54 read-only stock UI and cost redaction.');
      return;
    }

    await tab('dropdowns');
    await at('#stockSerialPolicy').locator('..').locator('summary').click();
    await at('#stockSerialPolicy [name=subject]').selectOption('ISO');
    await at('#stockSerialPolicy [name=required]').selectOption('true');
    await page.getByRole('button',{name:'Save serial rule'}).click();
    await saved();

    await tab('receive');
    await at('#stockReceiveSeries').selectOption('ISO');
    await at('#stockReceiveForm [name=supplier_id]').selectOption(initial.suppliers[0].id);
    await at('#stockAddReceiptRow').click();
    for(const [index,location] of [locA,locB].entries()){
      const row=at('[data-receipt-row]').nth(index);
      await row.locator('[name=model]').fill(model.model);
      await row.locator('[name=model]').press('Tab');
      await row.locator('[name=quantity]').fill('1');
      await row.locator('[name=cost]').fill(String(100+index));
      await row.locator('[name=location_id]').selectOption(location);
      await at('#stockReceiptConfig fieldset').nth(index).locator('[name=serials]').fill('BROWSER-'+(index+1));
    }
    const general=at('#stockReceiveForm details').first().locator('summary');
    await general.click();
    await general.click();
    assert.equal(await at('#stockReceiptConfig fieldset [name=serials]').first().inputValue(),'BROWSER-1');
    await page.getByRole('button',{name:'Save Receiving'}).click();
    await saved();
    let current=await state();
    assert.equal(current.ledger.events.filter(e=>e.kind==='receive').length,2);
    const config=current.configurations.find(c=>c.item_key===model.key).id;
    const first=current.ledger.positions.find(p=>p.configuration_id===config&&p.location_id===locA);
    const second=current.ledger.positions.find(p=>p.configuration_id===config&&p.location_id===locB);

    await tab('reservations');
    await at('#stockReservationFormPanel summary').click();
    await at('#stockReservationForm [name=configuration_id]').selectOption(config);
    await at('#stockReservationForm [name=quantity]').fill('2');
    await at('#stockCustomerQuery').fill('fixture');
    await at('#stockReservationForm [name=customer_id]').selectOption({label:'Fixture Customer'});
    await at('#stockReservationForm [name=reason]').fill('Browser test');
    await at('#stockReservationForm [name=reference]').fill('QT-BROWSER');
    await page.getByRole('button',{name:'Reserve Stock',exact:true}).click();
    await saved();
    const reservation=at('[data-reservation]').first();
    await reservation.locator('summary').click();
    await reservation.locator('[name=quantity]').fill('1');
    await reservation.locator('[name=reference]').fill('DO-BROWSER');
    await reservation.locator('[name=serials]').fill('BROWSER-1');
    await reservation.getByRole('button',{name:'Confirm Stock Out'}).click();
    await saved();
    assert.match(await reservation.locator('summary').textContent(),/Partially fulfilled/);
    await reservation.locator('summary').click();
    page.once('dialog',dialog=>dialog.accept());
    await reservation.getByRole('button',{name:'Return to Available'}).click();
    await saved();
    assert.match(await reservation.locator('summary').textContent(),/Released/);

    await tab('movement');
    await at('#stockMovementFormPanel summary').click();
    await at('#stockMovementAction').selectOption('transfer');
    const movement=at('#stockMovementForm');
    await movement.locator('[name=position_id]').selectOption(second.id);
    await movement.locator('[name=location_id]').selectOption(locA);
    await movement.locator('[name=quantity]').fill('1');
    await movement.locator('[name=serials]').fill('BROWSER-2');
    await movement.locator('[name=reason]').fill('Move bin');
    await movement.locator('[name=reference]').fill('MV-BROWSER');
    await movement.getByRole('button',{name:'Save Transfer Location'}).click();
    await saved();
    assert.match(await at('#stockMovementResults').innerText(),/MV-BROWSER/);

    await tab('history');
    await at('#stockHistoryModel').fill(model.model.toLowerCase());
    await at('#stockHistorySerial').fill('browser-1');
    await at('#stockHistorySelection').selectOption(model.key);
    assert.match(await at('.stock-history-metrics').innerText(),/Total Purchased\s+2[\s\S]*Total Delivered\s+1[\s\S]*Current Stock\s+1/);
    assert.equal(await at('#stockHistoryResults tbody tr').count(),2);
    assert.match(await at('#stockHistoryResults').innerText(),/DO-BROWSER/);
    await tab('check');
    await at('#stockCheckFilter summary').click();
    await at('#stockFilterSerial').fill('browser-2');
    assert.equal(await at('#stockTable [data-stock-detail]').count(),1);
    await at('#stockTable [data-stock-detail]').click();
    assert.deepEqual(await at('.stock-row-actions button').allTextContents(),['+','R','−']);
    await at('#stockDetailBack').click();
    assert.equal(await at('#stockFilterSerial').inputValue(),'browser-2');
    current=await state();
    assert.deepEqual(current.opening_balances,initial.opening_balances);
    assert.deepEqual(current.purchase_costs,initial.purchase_costs);
    assert.deepEqual(current.mappings,initial.mappings);
    assert.equal(current.ledger.positions.some(p=>p.id===first.id),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: V5.00.54 seven modules, serial rules, two-row receiving, customer search, reservation/fulfillment/release, transfer, serial and lifetime history, stock actions, and unchanged historical records.');
  }finally{
    await browser.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
