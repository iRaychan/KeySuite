const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'../..');
const pdfPath=path.resolve(root,'../tmp/pdfs/ks08-v50004-three-page.pdf');

const descriptions=[
`Vertical Multistage Pump Model: CHC 32-20
c/w  5.5HP 2Pole IE3 Motor (415V / 3Ph / 50Hz)
Suction & Discharge: DN65 x DN65
Material: SS304 (Cast Iron Connection) / Mechanical Seal
c/w  KeyPLC Control Panel (Sheltered)
       Pump Controller & HMI Touch Screen @ 1 Lot
       4kW VFD @ 2 nos & Pressure Transmitter @ 1 no
       Wiring for pumps & pressure transmitter within pump skid @ 1 Lot
c/w  Baseplate in mild steel, GI manifold 4" inlet & 4" outlet
       Gate valves on the suction and discharge ports of each pump
       Check valve on the discharge port of each pump
       1 pressure gauge on the discharge manifold
c/w  100 litres (10 bar) non-jkkp approved tank @ 1 unit`,
`Vertical Multistage Pump Model: CHC 4-30
c/w  0.75HP 2Pole IE3 Motor (415V / 3Ph / 50Hz)
Suction & Discharge: DN32 x DN32
Material: SS304 (Cast Iron Connection) / Mechanical Seal
c/w  KeyPLC Control Panel (Sheltered)
       Pump Controller & HMI Touch Screen @ 1 Lot
       0.75kW VFD (1Ph In / Ph Out) @ 2 nos & Pressure Transmitter @ 1 no
       Wiring for pumps & pressure transmitter within pump skid @ 1 Lot
c/w  Baseplate in mild steel, GI manifold 2" inlet & 2" outlet
       Gate valves on the suction and discharge ports of each pump
       Check valve on the discharge port of each pump
       1 pressure gauge on the discharge manifold
c/w  24 litres (10 bar) non-jkkp approved tank @ 1 unit`,
`Vertical Multistage Pump Model: CHC 10-30
c/w  1.5HP 2Pole IE3 Motor (415V / 3Ph / 50Hz)
Suction & Discharge: DN40 x DN40
Material: SS304 (Cast Iron Connection) / Mechanical Seal
c/w  KeyPLC Control Panel (Sheltered)
       Pump Controller & HMI Touch Screen @ 1 Lot
       1.5kW VFD (1Ph In / Ph Out) @ 2 nos & Pressure Transmitter @ 1 no
       Wiring for pumps & pressure transmitter within pump skid @ 1 Lot
c/w  Baseplate in mild steel, GI manifold 2.5" inlet & 2.5" outlet
       Gate valves on the suction and discharge ports of each pump
       Check valve on the discharge port of each pump
       1 pressure gauge on the discharge manifold
c/w  24 litres (10 bar) non-jkkp approved tank @ 1 unit`
];

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8266/index.html',{waitUntil:'networkidle'});
    const result=await page.evaluate(({descriptions})=>{
      setQuoteItems([
        {model:'KeyPLC VSD Booster System (2Pumps System)',qty:1,unit:'set',unitPrice:27240,description:descriptions[0]},
        {model:'KeyPLC VSD Booster System (2Pumps System)',qty:2,unit:'set',unitPrice:15150,description:descriptions[1]},
        {model:'KeyPLC VSD Booster System (2Pumps System)',qty:1,unit:'set',unitPrice:17170,description:descriptions[2]},
        {model:'KeyPLC VSD Booster System (2Pumps System)',qty:4,unit:'set',unitPrice:17170,description:descriptions[2]}
      ]);
      document.getElementById('quoteNo').value='RC-2610-0238';
      document.getElementById('qDate').value='2026-10-26';
      buildPrintQuotation();
      document.body.classList.add('print-complete');
      const pages=[...document.querySelectorAll('#pItemPages .print-items-page')];
      const detail=pages.map(node=>({
        items:[...node.querySelectorAll('tr.print-system-item-head>td:first-child')].map(cell=>cell.textContent.trim()),
        summaryRules:node.querySelectorAll('.print-summary-rule').length,
        pseudo:getComputedStyle(node.querySelector('thead'),'::after').content,
        headerBorder:getComputedStyle(node.querySelector('thead th')).borderBottomStyle
      }));
      return {pageCount:1+pages.length,detail};
    },{descriptions});
    assert.equal(result.pageCount,3);
    assert.deepEqual(result.detail[0].items,['1','2']);
    assert.deepEqual(result.detail[1].items,['3','4']);
    assert.equal(result.detail[0].summaryRules,0,'continuation page must not have a closing/totals rule');
    assert(result.detail[1].summaryRules>=1,'final item page keeps the rule before totals');
    assert(['none','normal'].includes(result.detail[0].pseudo));
    assert.equal(result.detail[0].headerBorder,'solid');
    assert.deepEqual(errors,[]);
    await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true});
    console.log(JSON.stringify({pass:true,pdfPath,...result},null,2));
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
