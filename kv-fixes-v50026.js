/* KeySuite V5.00.26 — canonical KV presentation fixes. */
(()=>{'use strict';
  const data=globalThis.KeySuiteKVData;if(!data)return;
  for(const model of data.models||[])model.connection=`${model.connection||'DN25 (G1¼)'} x ${model.connection||'DN25 (G1¼)'}`;
  globalThis.KeySuiteKVV50026=Object.freeze({
    materials:Object.freeze({KV:'Stainless Steel 304 / Mechanical Seal',KVC:'SS304 (Cast Iron Connection) / Mechanical Seal',KVN:'Stainless Steel 316 / Mechanical Seal'}),
    connection:model=>`${model?.connection||'DN25 (G1¼)'} x ${model?.connection||'DN25 (G1¼)'}`
  });
})();
