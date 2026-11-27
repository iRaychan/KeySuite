'use strict';
const {JSDOM}=require('jsdom');
const {randomUUID}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {rpc}=require('./v50051-db.cjs');
const {fixture}=require('./v50093-db.cjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function run(){
  const db=await fixture();
  const windows=[];
  try{
    const call=(action,p={})=>rpc(db,action,{config_client:'v104',ledger_client:'v102',stock_client:'v105',request_id:randomUUID(),...p});
    let s=await call('state');
    const model=s.catalog.find(i=>i.family==='ES'&&i.model==='ES 32-13')||s.catalog.find(i=>i.family==='ES');
    const source=s.locations[0].id,supplier=s.suppliers[0].id;
    await call('location',{label:'Warehouse'});
    const opt=(kind,label)=>call('series_option_save',{series_key:model.family,kind,label});
    const square=await opt('normal','Square Housing'),round=await opt('normal','Round Housing');
    const critical=await opt('critical','Casing Material');
    s=await call('state');
    const warehouse=s.locations.find(l=>l.label==='Warehouse').id;
    const normalGroup=s.options.find(o=>o.id===square.id).group_id;
    const criticalGroup=s.options.find(o=>o.id===critical.id).group_id;
    const receive=(quantity,cost,selections,variant)=>call('ledger_receive',{
      family:model.family,supplier_id:supplier,date:'2026-01-01',
      rows:[{item_key:model.key,quantity,unit_cost_myr:cost,location_id:source,selections,variant}]
    });
    const a=model.choices[0].code,b=model.choices[1].code;
    await receive(8,55,{[normalGroup]:[square.id],[criticalGroup]:critical.id},a);
    await receive(70,55,{},a);
    await receive(2,75,{[normalGroup]:[round.id]},b);
    const appRoot=path.join(__dirname,'..');
    const app=fs.readFileSync(path.join(appRoot,'keystock-v100.js'),'utf8');
    let user='qa-stock-owner',writes=0;
    const start=async persisted=>{
      const dom=new JSDOM('<main></main><nav><button id="keyAiNavButton"></button></nav>',{
        url:'https://keystock-fixture.invalid/',runScripts:'outside-only',pretendToBeVisual:true
      });
      const w=dom.window,d=w.document;windows.push(w);
      w.scrollTo=()=>{};w.HTMLElement.prototype.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
      w.KEYSUITE_ACCESS={company_id:'test-links'};
      w.KeySuitePermissions={level:()=> 'full'};
      w.KeySuiteAuth={getSession:()=>({user:{id:user}}),getClient:()=>({rpc:async(_name,args)=>{
        try{
          if(args.p_action!=='state')writes++;
          return {data:await rpc(db,args.p_action,args.p_payload),error:null};
        }catch(e){return {data:null,error:{message:e.message}};}
      }})};
      for(const [key,value] of persisted||[])w.localStorage.setItem(key,value);
      w.eval(app);d.dispatchEvent(new w.Event('DOMContentLoaded'));
      assert(await w.KeyStock.refresh());return w;
    };
    let w=await start(),d=w.document;
    const $=q=>{const n=d.querySelector(q);assert(n,'Missing '+q);return n;};
    const click=q=>$(q).click();
    const set=(q,value,event='change')=>{const el=$(q);el.value=value;el.dispatchEvent(new w.Event(event,{bubbles:true}));};
    const submit=q=>$(q).dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
    const settled=async()=>{
      for(let i=0;i<150;i++){
        if(!/Saving|Loading/.test($('#stockMessage').textContent))break;
        await pause(20);
      }
      assert.match($('#stockMessage').textContent,/Saved successfully/);
    };
    const nav=tab=>click(`[data-tab="${tab}"]`);
    click(`[data-stock-detail="${model.key}"]`);
    const bucket=code=>[...d.querySelectorAll('[data-bucket]')].find(el=>el.textContent.slice(2)===code);
    bucket(a).click();
    $('[data-detail-section=normal]').open=true;
    await pause(10);
    const groupButtons=[...$('[data-detail-section=normal] .stock-normal-row').querySelectorAll('button')];
    assert.equal(groupButtons[0].textContent.trim(),'All');
    assert.deepEqual(groupButtons.slice(1).map(x=>x.textContent.trim()).sort(),['Round Housing 2','Square Housing 8']);
    click(`[data-detail-option="${square.id}"]`);
    assert.equal(bucket(a).getAttribute('aria-expanded'),'true');assert(!bucket(b));
    assert.match(bucket(a).closest('tr').textContent,/8/);
    click(`[data-detail-option="${round.id}"]`);
    assert.equal(bucket(b).getAttribute('aria-expanded'),'false');assert(!bucket(a));
    click('[data-detail-kind=normal][data-detail-option=""]');
    assert.equal(bucket(a).getAttribute('aria-expanded'),'true');assert.equal(bucket(b).getAttribute('aria-expanded'),'false');
    if(process.env.KEYSTOCK_LAYOUT_FIXTURE){
      const css=['release-v50089.css','keystock-v100.css'].map(file=>fs.readFileSync(path.join(appRoot,file),'utf8')).join('\n');
      fs.writeFileSync(process.env.KEYSTOCK_LAYOUT_FIXTURE,`<!doctype html><meta charset="utf-8"><style>${css}</style>
        <div id="keyStock"><div id="stockContent">${$('#stockContent').innerHTML}</div></div>
        <script>
          const alignment=s=>[...document.querySelector(s).rows].filter(row=>row.cells.length>1).slice(0,2).map(row=>
            [...row.cells].map(cell=>getComputedStyle(cell).textAlign));
          const buttons=[...document.querySelectorAll('[data-detail-section=normal] button')];
          document.body.dataset.qa=JSON.stringify({configuration:alignment('[aria-label="Configuration stock"]'),
            batch:alignment('[data-layout="batch-details"]'),
            tops:buttons.map(b=>b.getBoundingClientRect().top),heights:buttons.map(b=>b.getBoundingClientRect().height)});
        </script>`);
    }
    click(`[data-detail-option="${critical.id}"]`);
    assert.equal(bucket(a).getAttribute('aria-expanded'),'true');
    $('#stockEdit').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));
    await pause(3200);
    click('[data-edit-position]');
    assert.deepEqual([...$('#stockBatchCorrection').querySelectorAll('details')].map(p=>p.open),[false,true]);
    assert.equal(d.querySelectorAll('#stockBatchCorrection [name=location]').length,1);
    set('#stockBatchCorrection [name=corrected]','3','input');
    assert.equal($('#stockBatchCorrection [name=adjustment]').value,'-5');
    assert.equal($('#stockBatchCorrection [name=stock_value]').value,'165.00');
    set('#stockBatchCorrection [name=reason]','Count corrected','input');
    $('#stockBatchCorrection details').open=true;$('#stockBatchCorrection details').open=false;
    assert.equal($('#stockBatchCorrection [name=reason]').value,'Count corrected');
    submit('#stockBatchCorrection');await settled();
    console.log('PASS Critical and Normal filters preserve open and closed configuration state; two-panel correction retains draft; live quantity and value update.');

    nav('dropdowns');click('[data-grouping=parts]');click('#stockOptionAdd');
    set('#stockSeriesOptionForm [name=label]','Casing','input');
    set('#stockSeriesOptionForm [name=group_ids]',normalGroup);
    submit('#stockSeriesOptionForm');await settled();
    assert.match($('#stockContent').textContent,/Normal Group/);
    nav('movement');
    set('#stockMovementAction','transfer');
    const input=name=>`#stockMovementForm [name="${name}"]`;
    set(input('series'),model.family);set(input('model'),model.key);
    s=await call('state');
    const squareBatch=s.ledger.positions.find(p=>s.configurations.find(c=>c.id===p.configuration_id).selections[normalGroup]?.includes(square.id));
    set(input('configuration'),squareBatch.configuration_id);set(input('source_location'),source);
    assert.equal($(input('batch_method')).value,'fifo');assert.equal($(input('available')).value,'3');
    assert($(input('serials')).closest('label').hidden);
    set(input('batch_method'),'manual');set(input('position_id'),squareBatch.id);
    set(input('location_id'),warehouse);set(input('quantity'),'1','input');
    assert.match($('#stockMovementForm output').textContent,/3 → 2.*0 → 1.*stays 3/);
    set(input('reason'),'Move to warehouse','input');submit('#stockMovementForm');await settled();

    nav('check');click(`[data-stock-detail="${model.key}"]`);
    if(bucket(a).getAttribute('aria-expanded')==='false')bucket(a).click();
    click(`[data-row-action=cannibalise][data-position="${squareBatch.id}"]`);
    assert.equal($('#stockMovementAction').value,'cannibalise');
    assert.equal($(input('position_id')).value,squareBatch.id);
    const casing=(await call('state')).parts[0];
    set(input('part_id'),casing.id);set(input('quantity'),'1','input');set(input('purpose'),'spare');
    assert.match($('#stockMovementForm output').textContent,/Not Complete 0 → 1/);
    set(input('reason'),'QA fixture','input');submit('#stockMovementForm');await settled();
    nav('check');click(`[data-stock-detail="${model.key}"]`);
    const casingRow=[...d.querySelectorAll('.stock-component-availability tbody tr')].find(r=>r.textContent.includes('Square Housing'));
    assert.deepEqual([...casingRow.cells].slice(2).map(c=>c.textContent),['2','1']);
    nav('missing');click('[data-restore-part]');
    const restore='#stockRestorePanel form';
    assert.match($(restore).textContent,/Square Housing/);
    set(restore+' [name=replacement_reference]','QA external replacement','input');
    set(restore+' [name=reason]','Replacement fitted','input');
    $(restore+' input[type=checkbox]').checked=true;
    submit(restore);await settled();assert.match($('#stockMissingResults').textContent,/Restored/);
    console.log('PASS series dropdown mapping, dependent movement fields, manual transfer preview and submit, batch-prefilled removal, casing availability and restoration.');

    nav('history');set('#stockHistoryTime [data-period]','custom');
    set('#stockHistoryTime [data-date=from]','2026-01-01');set('#stockHistoryTime [data-date=to]','2026-12-31');
    assert.match($('#stockHistoryResults').textContent,/Receiving Quantity Correction/);
    assert.match($('#stockHistoryResults').textContent,/Restore Parts/);
    nav('movement');set('#stockMovementTime [data-period]','90');
    const writesBefore=writes;
    nav('history');assert.equal($('#stockHistoryTime [data-period]').value,'custom');
    await w.KeyStock.refresh();assert.equal($('#stockHistoryTime [data-date=from]').value,'2026-01-01');
    assert.equal($('#stockHistoryTime [data-date=to]').value,'2026-12-31');
    user='other-stock-user';w.dispatchEvent(new w.Event('KEYSUITE_AUTH_CONTEXT_READY'));await w.KeyStock.refresh();
    nav('history');assert.equal($('#stockHistoryTime [data-period]').value,'all');
    user='qa-stock-owner';w.dispatchEvent(new w.Event('KEYSUITE_AUTH_CONTEXT_READY'));await w.KeyStock.refresh();
    nav('movement');assert.equal($('#stockMovementTime [data-period]').value,'90');
    const persisted=Object.entries(w.localStorage);
    w=await start(persisted);d=w.document;
    nav('history');assert.equal($('#stockHistoryTime [data-period]').value,'custom');
    assert.equal($('#stockHistoryTime [data-date=to]').value,'2026-12-31');
    assert.equal(writes,writesBefore);
    console.log('PASS independent user and page Time Frame persistence, refresh, auth-context reset, and new browser context with persisted storage.');
  }finally{
    for(const w of windows)w.close();
    await db.close();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
