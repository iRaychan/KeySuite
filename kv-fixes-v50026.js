/* KeySuite V5.00.26 — canonical KV presentation fixes. */
(()=>{'use strict';
  const data=globalThis.KeySuiteKVData;if(!data)return;
  for(const model of data.models||[])model.connection=`${model.connection||'DN25 (G1¼)'} x ${model.connection||'DN25 (G1¼)'}`;
  globalThis.KeySuiteKVV50026=Object.freeze({
    materials:Object.freeze({KVC:'SS304 (Cast Iron Connection) / Stainless Steel / Stainless Steel',KV:'Stainless Steel 304 / Stainless Steel 304 / Stainless Steel 304',KVN:'Stainless Steel 316 / Stainless Steel 316 / Stainless Steel 316',KVD:'Duplex 2205 / Duplex 2205 / Duplex 2205',KVSD:'Duplex 2507 / Duplex 2507 / Duplex 2507'}),
    connection:model=>`${model?.connection||'DN25 (G1¼)'} x ${model?.connection||'DN25 (G1¼)'}`
  });
})();
