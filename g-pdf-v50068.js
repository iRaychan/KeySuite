/* G engineering data adapter for the shared BFI report. */
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
  const measure = (value, unit='') => value == null || value === '' || value === '-' ? '-' : value+unit;
  const rounded = value => Number.isFinite(value) ? Number(value.toFixed(1)) : null;
  const gap = '<tr class="section-gap"><td colspan="4"></td></tr>';
  function section(name, rows) {
    return '<tr class="section table-block table-start"><td colspan="4">'+escape(name)+'</td></tr>'
      + rows.map((row, index) => {
        const classes = index===rows.length-1 ? 'table-block table-end' : 'table-block';
        const cells = row.map(cell => {
          const [value, style] = Array.isArray(cell) ? cell : [cell,''];
          return '<td class="'+style+'">'+escape(value)+'</td>';
        });
        return '<tr class="'+classes+'">'+cells.join('')+'</tr>';
      }).join('');
  }
  function technical(p, hz, duty, results) {
    const m=p.motor||{}, d=p.dimensions||{}, three=p.phase==='3Ph';
    const g=window.KeySuiteGPerformance;
    return [
      section('Operating Data', [
        ['Application','-','',''],
        ['Location','-','Capacity',measure(duty?.q,' m³/h')],
        ['Fluid','Water, Clean','Pressure',measure(duty?.h,' Mtr')],
        ['Density','0.9983 kg/dm³','Temperature','20 °C'],
        ['Kin. Viscosity','1.005 mm²/s','','']
      ]),
      section('Pump', [
        ['Brand','B.G.Reich','Country of Origin','Malaysia'],
        ['Type','Close-coupled','Country of Manufacture','China'],
        ['Model',[p.model,'model-value'],'Suction Size',p.inlet],
        ['Speed',measure(Math.round(p.speed*hz/50),' rpm'),'Discharge Size',p.outlet],
        [['Material: -','material-heading no-bottom'],['','no-bottom'],'Efficiency',measure(rounded(results.eff),' %')],
        [['Casing','material-label indent'],['Cast Iron','material-value'],'Brake HP',measure(rounded(g.toHP(results.power)),' HP')],
        [['Impeller','material-label indent'],['Stainless Steel','material-value'],'NPSHr',measure(rounded(results.npsh),' Mtr')],
        [['Shaft','material-last indent'],['Stainless Steel','material-last'],'Impeller Type','Closed'],
        ['Shaft Seal','Mechanical Seal','',''],
        ['Bearing Type','Ball','','']
      ]),
      section('Motor', [
        ['Brand','B.G.Reich','Country of Origin','Malaysia'],
        ['Type','TEFC','Country of Manufacture','China'],
        ['Model',measure(m.model),['Efficiency: -','no-bottom field-heading'],['IE1','no-bottom']],
        ['Rated Power',p.hp+' HP / '+p.kw+' kW',['100%','no-top no-bottom indent'],[measure(three?m.efficiency3:m.efficiency1,' %'),'no-top no-bottom']],
        ['Speed',measure(m.speed,' rpm'),['75%','no-top indent'],['-','no-top']],
        ['Rated FL Amp',measure(three?m.amp3:m.amp1,' Amp'),['Power Factor:-','no-bottom field-heading'],['','no-bottom']],
        ['Frequency','50 Hz',['100%','no-top no-bottom indent'],[measure(three?m.pf3:m.pf1),'no-top no-bottom']],
        ['Rated Voltage',three?'415 Volt':'240 Volt',['75%','no-top indent'],['-','no-top']],
        ['Phase',three?'3 Phase':'1 Phase','Protection','IP 44'],
        ['Insulation Class','Class B','','']
      ]),
      section('Pumpset', [
        [['Dimension: -','pumpset-open field-heading'],['','pumpset-open dimension-divider'],'Weight',measure(p.weight,' kG')],
        [['Length','sub-label pumpset-open-next'],[measure(d.L,' mm'),'pumpset-open-next'],'',''],
        [['Width','sub-label pumpset-open-next'],[measure(d.B,' mm'),'pumpset-open-next'],'',''],
        [['Height','sub-label pumpset-open-last'],[measure(d.H,' mm'),'pumpset-open-last'],'','']
      ]),
    ].join(gap);
  }
  const dimensions = rows => rows.map(([label,value])=>'<div>'+escape(label)+'</div><div>'+escape(value)+'</div>').join('');
  function build(model, {hz=50,duties=[],performance={},filename,projectName}={}) {
    const g=window.KeySuiteGPerformance, d=model.dimensions||{}, duty=duties[0];
    return window.KeySuiteBFIReport.build({
      pdfFileTitle:escape(filename||model.model),
      pdfDisplayModel:escape(model.model),
      flowText:measure(duty?.q,' m³/h'),headText:measure(duty?.h,' Mtr'),
      drive:'<div>'+escape(model.hp)+' HP '+escape(model.pole)+'P</div><div>'+escape(hz)+'Hz '+Math.round(model.speed*hz/50)+'rpm</div>',
      charts:g.fields.map(field=>g.svg(model,field,hz,duties,field.key==='h',true,performance)),
      projectHtml:escape(projectName??(document.getElementById('startProject')?.value||document.getElementById('project')?.value||'')),
      techRows:technical(model,hz,duty,performance),
      dimensionImage:new URL('assets/v50068/g-dimension.png',location.href).href,
      series:'G Series',
      drawingWidth:147.2,
      safariTopInset:16,
      optimizationUrl:new URL('pdf-optimization.js?v=42510',location.href).href,
      leftDimensions:dimensions(['L','L1','A','B','H'].map(key=>[key,measure(d[key],' mm')])),
      rightDimensions:dimensions([['H1',measure(d.H1,' mm')],['Inlet',model.inlet],['Outlet',model.outlet],['Weight',measure(model.weight,' kG')]])
    }).replace(/<img class="(?:brand-logo|tds-logo)"/g, tag =>
      tag.replace('<img ', '<img data-keysuite-preserve-original '));
  }
  function open(model, options={}) {
    const duty=options.duties?.[0];
    const payload={model:model.model, raw_flow:duty?.q, raw_head:duty?.h, flow_m3h:duty?.q, head_m:duty?.h};
    const filename=options.filename||window.KeySuitePumpPdfNames.productFromPayload(payload);
    window.KeySuiteTechnicalPdf.openReport(
      window, build(model,{...options,filename}), filename, filename,
      {preserveReportIdentity:true}
    );
  }
  window.KeySuiteGPdf={open,build};
})();

