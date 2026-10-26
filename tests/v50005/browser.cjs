const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const pdfPath=path.resolve(root,'../tmp/pdfs/ks09-11-v50005.pdf');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8265/index.html',{waitUntil:'networkidle'});
    await page.emulateMedia({media:'print'});
    const result=await page.evaluate(async()=>{
      localStorage.clear();
      const values=select=>[...select.options].map(option=>option.textContent);
      setQuoteItems([{model:'KeyPLC VSD Booster System (2Pumps System)',qty:1,unit:'set',unitPrice:17910,description:'Isolation valves and flexible joints on the suction and discharge ports of each pump',displayCapacity:true,capacityValue:'10',capacityUnit:'m³/hr',headValue:'10',headUnit:'Mtr'}]);
      const row=document.querySelector('.quote-item'),flowUnit=row.querySelector('.item-capacity-unit'),headUnit=row.querySelector('.item-head-unit');
      const quoteFlowUnits=values(flowUnit),quoteHeadUnits=values(headUnit);
      flowUnit.value='US gpm';flowUnit.dispatchEvent(new Event('change',{bubbles:true}));
      headUnit.value='Ft';headUnit.dispatchEvent(new Event('change',{bubbles:true}));
      const quoteSaved=getQuoteItems()[0];
      const sealed=JSON.parse(JSON.stringify(remoteQuotePayload({id:'ks09-fixture',no:'RC-2610-0999',date:'2026-10-26',status:'sealed',sealedAt:'2026-10-26T08:00:00.000Z',items:[quoteSaved],total:17910})));
      secureQuotes=[sealed];loadQuote('ks09-fixture');quotationStatus='sealed';updateQuotationStateUi();const quoteReloaded=getQuoteItems()[0];
      buildPrintQuotation();document.body.classList.add('print-complete');
      const headRow=document.querySelector('#pItemPages .print-system-item-head'),descRow=document.querySelector('#pItemPages .print-system-item-desc-row'),descCell=descRow.querySelector('.print-system-desc-cell'),descText=descCell.querySelector('.print-item-desc');
      const range=document.createRange(),target='Isolation valves and flexible joints on the suction and discharge ports of each pump',textNode=descText.firstChild,targetOffset=textNode.textContent.indexOf(target);range.setStart(textNode,targetOffset);range.setEnd(textNode,targetOffset+target.length);const targetLineRects=[...range.getClientRects()].length;
      const manifoldDescription=window.KeySuiteManifold.description({configuration:{material:'GI',options:{suctionStrainer:true,suctionFlexible:true,dischargeFlexible:true}},source:{manifoldDn:'DN65',strainerConnection:'Thread'}},{includeCw:true});

      await window.KeySuiteAssembly.open('system');
      const assemblyFlowUnit=document.getElementById('assemblyCapacityUnit'),assemblyHeadUnit=document.getElementById('assemblyHeadUnit'),assemblyFlow=document.getElementById('assemblyCapacityValue'),assemblyHead=document.getElementById('assemblyHeadValue'),assemblyDisplay=document.getElementById('assemblyDisplayCapacity');
      const systemFlowUnits=values(assemblyFlowUnit),systemHeadUnits=values(assemblyHeadUnit);
      assemblyDisplay.checked=true;assemblyDisplay.dispatchEvent(new Event('change',{bubbles:true}));
      assemblyFlow.value='10';assemblyFlow.dispatchEvent(new Event('input',{bubbles:true}));assemblyHead.value='10';assemblyHead.dispatchEvent(new Event('input',{bubbles:true}));
      assemblyFlowUnit.value='Imp gpm';assemblyFlowUnit.dispatchEvent(new Event('change',{bubbles:true}));assemblyHeadUnit.value='bar';assemblyHeadUnit.dispatchEvent(new Event('change',{bubbles:true}));
      return {
        quoteFlowUnits,quoteHeadUnits,systemFlowUnits,systemHeadUnits,
        quoteFlow:row.querySelector('.item-capacity-value').value,quoteHead:row.querySelector('.item-head-value').value,
        saved:{capacityValue:quoteSaved.capacityValue,capacityUnit:quoteSaved.capacityUnit,headValue:quoteSaved.headValue,headUnit:quoteSaved.headUnit,description:quoteSaved.description},
        reloaded:{capacityValue:quoteReloaded.capacityValue,capacityUnit:quoteReloaded.capacityUnit,headValue:quoteReloaded.headValue,headUnit:quoteReloaded.headUnit,description:quoteReloaded.description},
        pdf:{headCells:headRow.cells.length,unitPrice:headRow.cells[3].textContent.trim(),total:headRow.cells[4].textContent.trim(),descCells:descRow.cells.length,colSpan:descCell.colSpan,targetLineRects,descWithinTable:descCell.getBoundingClientRect().right<=descRow.closest('table').getBoundingClientRect().right+.5,text:descText.textContent},
        manifoldDescription,
        system:{flow:assemblyFlow.value,flowUnit:assemblyFlowUnit.value,head:assemblyHead.value,headUnit:assemblyHeadUnit.value,description:document.getElementById('assemblyDescription').value}
      };
    });

    const expectedFlow=['m³/hr','US gpm','Imp gpm','L/s','L/min'];
    const expectedHead=['Mtr','bar','kPa','psi','Ft'];
    assert.deepEqual(result.quoteFlowUnits,expectedFlow);assert.deepEqual(result.systemFlowUnits,expectedFlow);
    assert.deepEqual(result.quoteHeadUnits,expectedHead);assert.deepEqual(result.systemHeadUnits,expectedHead);
    assert(Math.abs(Number(result.quoteFlow)-44.0287)<.0002);assert(Math.abs(Number(result.quoteHead)-32.8084)<.0002);
    assert.equal(result.saved.capacityUnit,'US gpm');assert.equal(result.saved.headUnit,'Ft');
    assert.match(result.saved.description,/Capacity: 44\.03 US gpm \(10 m³\/hr\) @ 32\.81 Ft \(10 Mtr\)/);
    assert.deepEqual(result.reloaded,result.saved);
    assert.equal(result.pdf.headCells,5);assert.equal(result.pdf.unitPrice,'17,910.00');assert.equal(result.pdf.total,'17,910.00');
    assert.equal(result.pdf.descCells,1);assert.equal(result.pdf.colSpan,4);assert.equal(result.pdf.descWithinTable,true);assert.equal(result.pdf.targetLineRects,1);
    assert.match(result.pdf.text,/Isolation valves and flexible joints on the suction and discharge ports of each pump/);
    assert.doesNotMatch(result.manifoldDescription,/Gate valves|Threaded strainer/);assert.match(result.manifoldDescription,/Isolation valves/);assert.match(result.manifoldDescription,/Strainer on the suction port of each pump/);
    assert(Math.abs(Number(result.system.flow)-36.6615)<.0002);assert.equal(result.system.flowUnit,'Imp gpm');
    assert(Math.abs(Number(result.system.head)-.9807)<.0002);assert.equal(result.system.headUnit,'bar');
    assert.match(result.system.description,/Capacity: 36\.66 Imp gpm \(10 m³\/hr\) @ 0\.98 bar \(10 Mtr\)/);
    assert.deepEqual(errors,[]);
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true});
    console.log(JSON.stringify({pass:true,pdfPath,result},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
