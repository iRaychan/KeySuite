/* G engineering report, printed through the same report host as BFI. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const number = (value, decimals=2) => Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
  const measure = (value, unit='') => value == null || value === '' || value === '-' ? '–' : value+unit;
  const table = (label, rows) => `<table><colgroup><col><col><col><col></colgroup><thead><tr><th colspan="4">${label}</th></tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(value=>'<td>'+escape(value)+'</td>').join('')+'</tr>').join('')}</tbody></table>`;
  const phase = model => model.phase==='3Ph'?'3 Phase':'1 Phase';
  const footer = '<footer>B.G.Reich reserves the right to make modifications without notice.</footer>';
  function header(model, heading='') {
    return `<header><img src="selector-bgf/bgreich-logo.png" alt="B.G.REICH"><div><strong>${escape(model.model)}</strong><small>${escape(heading||`${model.hp} HP ${model.pole}P · ${phase(model)}`)}</small></div></header>`;
  }
  function technical(p, hz, duty, results) {
    const m=p.motor||{}, d=p.dimensions||{}, three=p.phase==='3Ph';
    const g=window.KeySuiteGPerformance;
    return table('Operating Data', [
      ['Application','–','Rated Capacity',measure(number(duty?.q),' m³/h')],
      ['Location','–','Rated Head / Pressure',measure(number(duty?.h),' m')],
      ['Fluid','Water, Clean','Temperature','20 °C'],
      ['Density','0.9983 kg/dm³','Kin. Viscosity','1.005 mm²/s'],
      ['Curve Basis',hz===50?'Guaranteed reference':'Speed-adjusted estimate','Plotted Speed',measure(Math.round(p.speed*hz/50),' rpm')]
    ])+table('Pump', [
      ['Brand','B.G.Reich','Country of Origin','Malaysia'],
      ['Type','Close-coupled','Country of Manufacture','China'],
      ['Model',p.model,'Suction Size',p.inlet],
      ['Guaranteed Curve Speed',measure(p.speed,' rpm'),'Discharge Size',p.outlet],
      ['Casing','Cast Iron','Pump Efficiency',measure(number(results.eff,1),' %')],
      ['Impeller','Stainless Steel','Brake HP',measure(number(g.toHP(results.power)),' HP')],
      ['Shaft','Stainless Steel','NPSHr',measure(number(results.npsh),' m')],
      ['Shaft Seal','Mechanical Seal','Impeller Type','Closed'],
      ['Bearing Type','Ball','','']
    ])+table('Motor', [
      ['Brand','B.G.Reich','Country of Origin','Malaysia'],
      ['Type','TEFC','Country of Manufacture','China'],
      ['Model',measure(m.model),'Efficiency Class','IE1'],
      ['Rated Power',p.hp+' HP / '+p.kw+' kW','Efficiency at 100%',measure(three?m.efficiency3:m.efficiency1,' %')],
      ['Motor Rated Speed',measure(m.speed,' rpm'),'Power Factor at 100%',measure(three?m.pf3:m.pf1)],
      ['Rated FL Amp',measure(three?m.amp3:m.amp1,' A'),'Protection','IP 44'],
      ['Rated Voltage',three?'415 V':'240 V','Insulation Class','Class B'],
      ['Phase',phase(p),'Rated Frequency','50 Hz']
    ])+table('Pumpset', [
      ['Length',measure(d.L,' mm'),'Weight',measure(p.weight,' kg')],
      ['Width',measure(d.B,' mm'),'Height',measure(d.H,' mm')]
    ])+'<p class="note">* Approximate dimension and weight</p>';
  }
  function build(model, {hz=50,duties=[],performance={}}={}) {
    const g=window.KeySuiteGPerformance, d=model.dimensions||{}, duty=duties[0];
    const charts=g.fields.map(field=>{
      const display=field.key==='power'?{...field,unit:'Shaft Power (HP)'}:field;
      return `<section class="chart"><b>${display.unit}</b>${g.svg(model,display,hz,duties,false,true)}</section>`;
    }).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(model.model)}</title><style>
      @page{size:A4;margin:8mm}*{box-sizing:border-box}
      body{margin:0;font:10pt Arial,sans-serif;color:#162b37;background:#fff}
      .sheet{width:194mm;height:280mm;margin:0 auto;padding:3mm 5mm;position:relative;break-after:page;page-break-after:always}
      .sheet:last-of-type{break-after:auto;page-break-after:auto}
      header{display:flex;justify-content:space-between;align-items:center;padding-bottom:3mm;border-bottom:1px solid #244354}
      header img{width:50mm;height:15mm;object-fit:contain}header div{text-align:right}header strong{display:block;font-size:15pt}header small{display:block;margin-top:1mm}
      h1{text-align:center;margin:4mm 0 1mm;font-size:15pt}.rated{color:#b51f32}.basis{text-align:center;margin:0 0 3mm;font-size:9pt}
      .chart{border:1px solid #a6b7c2;padding:1mm 2mm;margin-bottom:2mm;font-size:8.5pt}
      svg{display:block;width:100%;height:49mm}svg text{font:11px Arial,sans-serif;fill:#40586a}
      .g-grid{stroke:#dce6ee}.g-axis{stroke:#8da3b4;fill:none}.g-line{stroke:#0868a6;stroke-width:2.4;fill:none}
      .g-point,.g-point-label{fill:#b51f32}.g-bep,.g-bep-label{fill:#137943}
      table{border-collapse:collapse;width:100%;margin:3mm 0 0;table-layout:fixed;font-size:8.7pt}
      td,th{border:1px solid #96a0aa;padding:1.6mm 2mm}th{background:#f9dbe4;font-size:10pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .note{font-size:8.5pt}.drawing{width:100%;height:130mm;object-fit:contain;margin:3mm 0}
      footer{position:absolute;bottom:3mm;left:5mm;right:5mm;text-align:center;font-size:8pt;color:#40586a}
      @media screen{body{background:#edf1f5}.sheet{background:white;margin:12px auto}}
    </style></head><body>
      <article class="sheet">${header(model)}<h1 class="rated">${duty?`${number(duty.q)} m³/h @ ${number(duty.h)} Mtr`:'Performance Curves'}</h1>
      <p class="basis">${hz===50?`Guaranteed reference · 50 Hz · ${model.speed} rpm`:`Speed-adjusted estimate · ${hz} Hz · ${Math.round(model.speed*hz/50)} rpm`}</p>${charts}${footer}</article>
      <article class="sheet">${header(model,'Technical Data')}${technical(model,hz,duty,performance)}${footer}</article>
      <article class="sheet">${header(model,'Dimension')}<h1>Dimension</h1>
      <img class="drawing" src="assets/v50068/g-dimension.png" alt="G Series dimension drawing">
      ${table('Table Dimensions',[
        ['L',measure(d.L,' mm'),'L1',measure(d.L1,' mm')],
        ['A',measure(d.A,' mm'),'B',measure(d.B,' mm')],
        ['H',measure(d.H,' mm'),'H1',measure(d.H1,' mm')],
        ['Suction',model.inlet,'Discharge',model.outlet],
        ['Weight',measure(model.weight,' kg'),'','']
      ])}<p class="note">* Approximate dimension and weight</p>${footer}</article>
      <script>window.onload=async()=>{await Promise.all([...document.images].map(image=>image.decode()));window.print()};<\/script>
    </body></html>`;
  }
  function open(model, options={}) {
    const duty=options.duties?.[0];
    const payload={model:model.model, raw_flow:duty?.q, raw_head:duty?.h, flow_m3h:duty?.q, head_m:duty?.h};
    const filename=options.filename||window.KeySuitePumpPdfNames.productFromPayload(payload);
    window.KeySuiteTechnicalPdf.openReport(window,build(model,options),filename,filename);
  }
  window.KeySuiteGPdf={open,build};
})();
