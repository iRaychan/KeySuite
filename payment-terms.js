/* Customer payment terms: one codec for existing text storage and quotation wording. */
(() => {
 'use strict';
 const modes=['cash','advised','usual','custom'];
 const days=value=>String(Math.max(0,Math.round(Number(String(value??'').match(/-?\d+(?:\.\d+)?/)?.[0])||0)));
 function parse(value){
  let raw=value;
  if(typeof raw==='string'&&raw.trim().startsWith('{')){try{const v=JSON.parse(raw);if(v.ksPaymentTerms===1)raw=v}catch(_){}}
  if(raw&&typeof raw==='object')return {terms:days(raw.terms??raw.days),pdc:!!raw.pdc,termOption:modes.includes(raw.termOption)?raw.termOption:'',customTerms:String(raw.customTerms??'')};
  const text=String(raw??'').trim(),pdc=/\bPDC\b/i.test(text);
  let termOption='',customTerms='';
  if(/^cash$/i.test(text))termOption='cash';
  else if(/^to be advised$/i.test(text))termOption='advised';
  else if(/^as usual$/i.test(text))termOption='usual';
  else if(text&&!/^\d+(?:\s*days?)?(?:\s*PDC)?$/i.test(text)&&!/^PDC$|cash\s*before\s*delivery|^cod$/i.test(text)){termOption='custom';customTerms=text}
  return {terms:termOption?'0':days(text),pdc,termOption,customTerms};
 }
 function format(value){const t=parse(value);if(t.termOption==='cash')return 'Cash';if(t.termOption==='advised')return 'To be advised';if(t.termOption==='usual')return 'As usual';if(t.termOption==='custom')return t.customTerms.trim();return Number(t.terms)>0?`${t.terms} days${t.pdc?' PDC':''}`:t.pdc?'PDC':'Cash before delivery'}
 function serialize(value){const t=parse(value);if(t.termOption)return JSON.stringify({ksPaymentTerms:1,...t});return t.pdc?(Number(t.terms)>0?`${t.terms} days PDC`:'PDC'):t.terms}
 window.KeySuitePaymentTerms={parse,format,serialize};
})();
