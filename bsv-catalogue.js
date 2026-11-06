(() => {
  'use strict';
  // 004 - BSV 261106 - V1.0.xlsx, BSV Data!B4:G7.
  const models = Object.freeze([
    Object.freeze({ name: 'BSV 32G05', kw: 0.75, hp: 1, poles: 2, rpm: 2900, discharge: 'G1¼' }),
    Object.freeze({ name: 'BSV 65G20', kw: 1.1, hp: 1.5, poles: 2, rpm: 2900, discharge: 'G2½' }),
    Object.freeze({ name: 'BSV 80G10', kw: 1.1, hp: 1.5, poles: 2, rpm: 2900, discharge: 'G3' }),
    Object.freeze({ name: 'BSV 100G30', kw: 1.5, hp: 2, poles: 2, rpm: 2900, discharge: 'G4' }),
  ]);
  const variants = Object.freeze({
    T: 'Three phase',
    M: 'Single phase',
    MA: 'Single phase with automatic float switch',
  });
  const get = id => document.getElementById(id);
  function init() {
    const model = get('bsvModel');
    const variant = get('bsvVariant');
    for (const row of models) model.add(new Option(row.name, row.name));
    for (const [code, label] of Object.entries(variants)) variant.add(new Option(`${code} · ${label}`, code));
    function render() {
      const row = models.find(item => item.name === model.value);
      get('bsvSpecs').textContent = `${row.name} · ${row.kw} kW · ${row.hp} HP · ${row.poles} poles · ${row.rpm} rpm · Discharge ${row.discharge}`;
      get('bsvVariantNote').textContent = `${variant.value}: ${variants[variant.value]}. Model-specific variant availability and motor ratings require confirmation.`;
    }
    model.addEventListener('change', render);
    variant.addEventListener('change', render);
    get('bsvPriceRows').innerHTML = models.map(row => `<tr><th scope="row">${row.name}</th><td>Unpriced · Many</td><td>Not supplied</td><td>Unpriced · Many</td><td><button class="btn" type="button" disabled>Save</button></td></tr>`).join('');
    render();
  }
  window.KeySuiteBSVCatalogue = Object.freeze({ models, variants });
  document.addEventListener('DOMContentLoaded', init, { once: true });
})();
