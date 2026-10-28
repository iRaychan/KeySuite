const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const pdfPath=path.resolve(root,'../tmp/pdfs/ks05-v50003-sealed.pdf');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8269/index.html',{waitUntil:'networkidle'});
    const result=await page.evaluate(()=>{
      const expected='Capacity: 8 L/s (28.8 m³/hr) @ 25 Mtr';
      const source={
        model:'KeyPLC VSD Booster System (2Pumps System)',qty:1,unit:'set',unitPrice:26240,
        productFamily:'ASSEMBLY',displayCapacity:true,capacityValue:'8',capacityUnit:'L/s',headValue:'25',headUnit:'Mtr',
        description:`${expected}\nVertical Multistage Pump Model: CHC 32-20\nc/w  5.5HP 2Pole IE3 Motor (415V / 3Ph / 50Hz)\nSuction & Discharge: DN65 x DN65\nMaterial: SS304 (Cast Iron Connection) / Mechanical Seal`
      };

      setQuoteItems([source]);
      const draft=getQuoteItems()[0];
      assertValue(draft.description.startsWith(expected+'\nVertical Multistage'), 'draft serialization');
      assertValue(draft.displayCapacity===true, 'draft capacity flag');

      const saved=JSON.parse(JSON.stringify(remoteQuotePayload({
        id:'ks05-fixture',no:'RC-2610-0238',date:'2026-10-26',status:'saved',items:[draft],total:26240
      })));
      const sealed={...saved,status:'sealed',sealedAt:'2026-10-26T08:00:00.000Z'};
      secureQuotes=[JSON.parse(JSON.stringify(sealed))];
      loadQuote('ks05-fixture');
      quotationStatus='sealed';
      updateQuotationStateUi();

      const reloaded=getQuoteItems()[0];
      assertValue(reloaded.description.startsWith(expected+'\nVertical Multistage Pump Model: CHC 32-20'), 'sealed reload');
      assertValue(reloaded.displayCapacity===true, 'sealed reload capacity flag');
      buildPrintQuotation();
      const desc=document.querySelector('#pItemPages .print-item-desc');
      const row=desc?.closest('tr');
      const model=row?.previousElementSibling?.querySelector('.print-item-model');
      assertValue(desc?.textContent.startsWith(expected+'\nVertical Multistage Pump Model: CHC 32-20'), 'PDF description order');
      assertValue(row?.classList.contains('print-capacity-item'), 'compact capacity spacing class');
      document.body.classList.add('print-complete');
      return {expected,description:desc.textContent,rowClass:row.className,model:model.textContent,status:quotationStatus};

      function assertValue(value,label){if(!value)throw new Error(`KS-05 assertion failed: ${label}`)}
    });
    assert.equal(result.status,'sealed');
    assert.equal(result.model,'KeyPLC VSD Booster System (2Pumps System)');
    assert.equal(errors.length,0,errors.join('\n'));
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true});
    console.log(JSON.stringify({pass:true,pdfPath,...result},null,2));
  }finally{
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exit(1)});
