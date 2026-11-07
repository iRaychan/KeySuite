/* KeySuite V5.00.47 — shared commercial product-family registry. */
(() => {
  'use strict';
  if (window.KeySuiteProductFamilies) return;
  const families = Object.freeze([
    { code: 'BASEPLATE', label: 'Baseplate' }, { code: 'BFI', label: 'BFI' },
    { code: 'BGF', label: 'BGF' }, { code: 'BSV', label: 'BSV' },
    { code: 'BSW', label: 'BSW' },
    { code: 'CHC_G1', label: 'CHC G1', baseFamily: 'CHC', generation: 'G1' },
    { code: 'CHC_G2', label: 'CHC G2', baseFamily: 'CHC', generation: 'G2', legacyCodes: ['CHC'] },
    { code: 'COUPLING', label: 'Coupling' }, { code: 'CR', label: 'CR' },
    { code: 'ES', label: 'ES', mappingLabel: 'End Suction' }, { code: 'GWS', label: 'GWS' },
    { code: 'ISO', label: 'ISO' }, { code: 'KEYPLC', label: 'KeyPLC' },
    { code: 'KV', label: 'KV' }, { code: 'MANIFOLD', label: 'Manifold' },
    { code: 'MOTOR', label: 'Motor' }
  ].map(item => Object.freeze({ ...item, legacyCodes: Object.freeze([...(item.legacyCodes || [])]) })));
  const byCode = new Map(families.map(item => [item.code, item]));
  function normalize(value) { const code=String(value||'').trim().toUpperCase().replace(/\s+/g,'_');return code==='CHC'?'CHC_G2':code; }
  function get(value) { return byCode.get(normalize(value)) || null; }
  function label(value, context='default') { const item=get(value);return item?(context==='mapping'?(item.mappingLabel||item.label):item.label):String(value||'').replace(/_/g,' '); }
  function list() { return families.map(item => ({ ...item, legacyCodes: [...item.legacyCodes] })); }
  window.KeySuiteProductFamilies = Object.freeze({ normalize, get, label, list });
})();
