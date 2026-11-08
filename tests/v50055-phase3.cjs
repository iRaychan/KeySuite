const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.KEYSUITE_TEST_URL || 'http://127.0.0.1:8355';
const baseline = process.env.KEYSUITE_BASELINE_URL;
const evidence = process.env.KEYSUITE_TEST_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-'));

async function run() {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const context = await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1020}});
    await context.route('**/*', route => [base,baseline].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('dialog', async dialog => { console.log('Dialog:',dialog.message()); await dialog.dismiss(); });
    await page.goto(base+'/__safari_fixture.html');
    await page.getByText('Open local KeyStock test',{exact:true}).click();
    await page.waitForFunction(() => window.KeySuiteModelReturn && window.KeySuiteV40001ProductSeries);
    await page.evaluate(() => {
      KeySuitePermissions.can=()=>true;
      if(window.KeySuiteAuthority)KeySuiteAuthority.canOpenPage=()=>true;
      KeySuiteApp.showPage('productCoupling');
      // Seed every verified coupling model so both auto and manual selection use the real evaluator.
      const products = [
        ...[90,100,112,125,140,160,180,200,224,250,280,315,355,400,450,560,630].map(n=>({model:'FCL '+n,componentType:'pin_bush'})),
        ...[40,50,60,70,80,90,100,110,120,140,160,180,200,220,250].map(n=>({model:'F'+n,componentType:'tyre'}))
      ];
      KeySuiteCoupling.init({couplingProducts:products},{role:'owner'});
    });
    const select = async (id,value) => page.locator('#'+id).selectOption(String(value));
    await select('couplingProductPump','32-13');
    await select('couplingProductMotorPole',4);
    await select('couplingProductMotorHp',75);
    const result = () => page.evaluate(()=>({config:KeySuiteCoupling.getProductSelection(),context:KeySuiteCoupling.getProductContext()}));
    let current=await result();
    assert.equal(current.config.model,'FCL 224');
    assert.equal(current.context.pumpShaft,24);
    assert.equal(current.context.motorShaft,65);
    await select('couplingProductPumpSeries','ISO');
    await select('couplingProductPump','ISO 80-50-250');
    await select('couplingProductMotorPole',2);
    await select('couplingProductMotorHp',60);
    current=await result();
    assert.equal(current.context.pumpShaft,32);
    assert.equal(current.context.motorFrame,'225M');
    assert.equal(current.context.motorShaft,60);
    assert.equal(current.config.model,'FCL 180');
    await page.screenshot({path:path.join(evidence,'002-after-coupling.png')});
    await select('couplingProductMotorPole',4);
    await select('couplingProductMotorHp',75);
    assert.equal((await result()).config,null);
    assert.match(await page.locator('#couplingSuitabilityRows').innerText(),/pump-shaft limit 285 Nm/);
    await select('couplingProductPump','ISO 300-250-400');
    assert.equal((await result()).context.pumpShaft,65);
    assert.equal((await result()).config.model,'FCL 224');
    await select('couplingProductPump','ISO 350-300-400');
    assert.equal((await result()).config,null);
    assert.match(await page.locator('#couplingSuitabilityRows').innerText(),/torque limit is unavailable for Ø75 mm/);
    const engineering=await page.evaluate(()=>{
      const c=KeySuiteCoupling;
      const pump={pumpModel:'ISO 300-250-400',pumpShaft:65,motorShaft:60,motorTorque:200,motorRpm:2900};
      return {
        bore:c.pinEvaluation({model:'FCL 180'},pump).reasons,
        speed:c.pinEvaluation({model:'FCL 250'},pump).reasons,
        motor:c.pinEvaluation({model:'FCL 200'},{...pump,motorShaft:75}).reasons,
        tyre:c.tyreEvaluation({model:'F100'},{...pump,motorRpm:1450}).suitable
      };
    });
    assert( engineering.bore.some(x=>x.includes('Pump shaft 65 mm')));
    assert( engineering.speed.some(x=>x.includes('maximum speed')));
    assert( engineering.motor.some(x=>x.includes('Motor shaft 75 mm')));
    assert.equal(engineering.tyre,true);
    console.log('PASS ES/ISO model list, 24/32/65/75 mm pump shafts, 225M/250M motor frames, both bores, speed, rated torque and shaft limit.');

    await page.evaluate(()=>KeySuiteApp.showPage('selectorIso'));
    const iso=page.frameLocator('#selectorIsoFrame');
    await iso.locator('#flow').fill('90');
    await iso.locator('#head').fill('90');
    await iso.locator('#run').click();
    assert.equal(await iso.locator('#summary h1').innerText(),'ISO 80-50-250');
    const exportData=async()=>iso.locator('body').evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION());
    const pump=await exportData();
    assert.equal(pump.impeller_mm,270);
    assert.equal(pump.pumpData.suction,'DN80 PN16');
    const afterScreenshot=path.join(evidence,'004-after-floating-back.png');
    await page.evaluate(()=>window.scrollTo(0,480));
    assert.equal(await page.locator('#ks40413PageReturn').isVisible(),true);
    await page.screenshot({path:afterScreenshot});
    await page.locator('#ks40413PageReturn').click();
    assert.equal(await page.locator('.page.active').getAttribute('id'),'productCoupling');
    await page.evaluate(()=>KeySuiteApp.showPage('selectorIso'));
    assert.equal((await exportData()).model,pump.model);

    // Use Quick Selection's same-origin open-model message, with a stale presentation pin.
    const ack=await page.evaluate(()=>new Promise(resolve=>{
      const frame=document.getElementById('selectorIsoFrame');
      frame.contentWindow.__KEYSUITE_MODEL_PRESENTATION_CONTEXT={family:'ISO',masterModel:'ISO 300-250-400',displayModel:'ISO 50-32-200',pinned:true};
      window.addEventListener('message',function onAck(e){
        if(e.data?.requestId!=='phase3'||e.data.type!=='KEYSUITE_DASHBOARD_MODEL_OPENED')return;
        window.removeEventListener('message',onAck);
        resolve(e.data);
      });
      frame.contentWindow.postMessage({type:'KEYSUITE_DASHBOARD_OPEN_MODEL',requestId:'phase3',quickSelection:true,
        model:'ISO 300-250-400',pole:4,flowM3h:1116,headM:57},location.origin);
    }));
    assert.equal(ack.opened,true);
    assert.equal(ack.model,'ISO 300-250-400');
    assert.equal(ack.pole,4);
    const large=await exportData();
    assert.equal(large.model,ack.model);
    assert.equal(large.pumpData.suction,'DN300 PN16');
    assert.equal(large.pumpData.discharge,'DN250 PN16');
    assert.equal(await iso.locator('#summary h1').innerText(),large.model);
    await page.screenshot({path:path.join(evidence,'003-after-model.png')});
    await page.evaluate(()=>KeySuiteApp.showPage('quotation'));
    await page.getByRole('button',{name:'Back to Selection',exact:true}).click();
    assert.equal((await exportData()).model,large.model);
    assert.equal(await iso.locator('#flow').inputValue(),'1116');
    console.log('PASS ISO Selection and Quick Selection message keep model, pole, engineering data and floating Back in sync.');

    await page.evaluate(()=>KeySuiteApp.showPage('productIso'));
    for(const [series,model] of [['250','300-250-400'],['32','50-32-200'],['50','80-50-250']]){
      await page.locator('[data-iso-series="'+series+'"]').click();
      await page.locator('#isoProducts .product-model-row').filter({hasText:'ISO '+model}).getByRole('button',{name:'Curve',exact:true}).first().click();
      const product=page.frameLocator('#productIsoSelectorFrame');
      await product.locator('#summary h1').filter({hasText:'ISO '+model}).waitFor();
      const record=await product.locator('body').evaluate(()=>window.__KEYSUITE_CURRENT_SELECTION());
      assert.equal(record.model,'ISO '+model);
      await page.evaluate(()=>document.getElementById('productCurveDialog').close());
    }
    console.log('PASS Product Curve consecutive ISO model changes.');

    const quotations=await page.evaluate(async payload=>{
      KeySuiteApp.ensureQuotationPricingContext=()=>true;
      KeySuiteApp.getPricingCustomer=()=>null;
      const offers=[];
      KeySuiteManualPrice.offer=async item=>{offers.push(item);return item};
      await KeySuiteISO.route(payload);
      const motorOnly={...payload,motor_hp:75,pole:4,motor_efficiency_class:'IE4',motor_voltage:380,frequency_hz:47.5,assembly_components:[]};
      await KeySuiteISO.route(motorOnly);
      await KeySuiteISO.route({model:'150-125-400',keysuite_bare_shaft:true});
      await KeySuiteISO.route({model:'150-125-400',keysuite_bare_shaft:true,keysuite_seal_type:'Gland Packing'});
      const es=KeySuitePricing.esDescription({model:'ES 65-26'},'CI / SS / SS / MS',{bareShaft:false,impellerMm:260,trimmed:true});
      const assembled=KeySuiteAssembly.formatPumpsetDescription({assembly_type:'pumpset',items:[
        {...offers[0],description:KeySuiteISO.description(KeySuiteISO.findProduct(payload.model),'CI / SS / SS / MS',{bareShaft:false}),section:'pump'},
        {description:KeySuiteMotor.assemblyMotorLine({hp:75,pole:4,efficiencyClass:'IE3',voltage:415,phase:'3Ph',frequency:50}),section:'motor'},
        {section:'coupling',couplingData:{model:'FCL 224',selectionMode:'flexible'}},
        {section:'baseplate',qty:1}
      ]});
      const esComplete='Capacity: 90 m³/hr @ 90 Mtr\n'+KeySuiteAssembly.formatPumpsetDescription({assembly_type:'pumpset',items:[
        {productFamily:'ES',description:es,section:'pump'},
        {description:KeySuiteMotor.assemblyMotorLine({hp:60,pole:2,efficiencyClass:'IE3',voltage:415,phase:'3Ph',frequency:50}),section:'motor'},
        {section:'coupling',couplingData:{model:'FCL 180',selectionMode:'flexible'}},
        {section:'baseplate',qty:1}
      ]});
      const esBare=KeySuitePricing.esDescription({model:'ES 32-20'},'CI / SS / SS / MS');
      return {offers,es,assembled,esComplete,esBare};
    },pump);
    const normalize=text=>text.replace(/\t/g,' ');
    assert.match(normalize(quotations.offers[0].description),/Capacity: 90 m³\/hr @ 90 Mtr\nB\.G\.Reich ISO End Suction Pump Model: 80-50-250\nc\/w 60HP 2Pole IE3 Motor \(415V \/ 3Ph \/ 50Hz\)\nc\/w Baseplate with Flexible Coupling\nSuction x Discharge: DN80 x DN50\nPump Material: CI \/ SS \/ SS \/ Mech Seal/);
    assert.match(normalize(quotations.offers[1].description),/75HP 4Pole IE4 Motor \(380V \/ 3Ph \/ 47\.5Hz\)/);
    assert.doesNotMatch(quotations.offers[1].description,/Baseplate/);
    assert.equal(quotations.offers[0].unit,'set');
    assert.equal(quotations.offers[2].unit,'unit');
    assert.equal(quotations.offers[2].description,'B.G.Reich ISO End Suction Pump Model: 150-125-400\nSuction x Discharge: DN150 x DN125\nPump Material: CI / SS / SS / Mech Seal\n(Bare shaft pump only)');
    assert.match(quotations.offers[3].description,/Gland Packing\n\(Bare shaft pump only\)$/);
    assert.doesNotMatch(quotations.es,/Impeller Diameter|Trimmed/);
    assert.match(quotations.assembled,/Model: 80-50-250\nc\/w\s+75HP/);
    assert.match(quotations.assembled,/Baseplate with Flexible Coupling/);
    fs.writeFileSync(path.join(evidence,'quotation-samples.txt'),[
      'ES complete, trimmed impeller\n'+normalize(quotations.esComplete),
      'ISO complete\n'+normalize(quotations.offers[0].description),
      'ISO motor only\n'+normalize(quotations.offers[1].description),
      'ES bare shaft\n'+quotations.esBare,
      'ISO bare shaft\n'+quotations.offers[2].description,
      'ISO bare shaft with gland packing\n'+quotations.offers[3].description
    ].join('\n\n')+'\n');
    await page.evaluate(({esComplete,offers})=>{
      KeySuiteApp.showPage('quotation');
      setQuoteItems([
        {model:'ES 65-26',description:esComplete,qty:1,unit:'set',unitPrice:32720},
        {...offers[0],unitPrice:4444}
      ]);
      setAllItemsCollapsed(false);
      document.querySelector('.quote-item')?.scrollIntoView();
    },quotations);
    await page.screenshot({path:path.join(evidence,'005-006-after-assembly-quote.png')});
    await page.evaluate(({esBare,offers})=>{
      setQuoteItems([
        {model:'ES 32-20',description:esBare,qty:1,unit:'unit',unitPrice:27330},
        {...offers[2],unitPrice:444}
      ]);
      setAllItemsCollapsed(false);
      document.querySelector('.quote-item')?.scrollIntoView();
    },quotations);
    await page.screenshot({path:path.join(evidence,'007-after-bare-quote.png')});
    console.log('PASS ES trimmed text and ISO complete, motor-only, bare shaft, gland packing and assembled descriptions.');

    for(const origin of [base,baseline].filter(Boolean))for(const family of ['iso','es']){
      const selector=await context.newPage();
      await selector.goto(origin+'/selector-'+family+'/index.html');
      await selector.locator('#flow').fill('90');
      await selector.locator('#head').fill('90');
      await selector.locator('#run').click();
      await selector.evaluate(()=>{
        window.open=()=>({document:{open(){},write(html){window.__phase3PdfHtml=html},close(){}},addEventListener(){}});
      });
      await selector.locator('#keysuiteMobileExport').evaluate(button=>button.click());
      const html=await selector.evaluate(()=>window.__phase3PdfHtml);
      assert.match(html,/<section class="dimension-page">/);
      const report=await context.newPage();

      await report.setContent(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));

      await report.locator('.dimension-page').waitFor({state:'attached',timeout:7000});
      if(family==='iso'&&origin===base){
        const image=report.locator('.dimension-drawing img.iso-dimension-original');
        await image.evaluate(img=>img.decode());
        assert.equal(await image.evaluate(img=>img.naturalWidth),829);
        assert.match(await report.locator('.dimension-page').innerText(),/DN80 PN16/);
      }
      const pdf=path.join(origin===base?evidence:os.tmpdir(),family+(origin===base?'-generated.pdf':'-v50054-baseline.pdf'));
      await report.pdf({path:pdf,preferCSSPageSize:true,printBackground:true,timeout:10000});
      await report.close();
      await selector.close();
    }
    console.log('PASS generated ISO and ES technical PDFs.');
  } finally {
    await browser.close();
  }
}

run().catch(error=>{console.error(error);process.exitCode=1});
