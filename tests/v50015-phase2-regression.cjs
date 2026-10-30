const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),auth=read('auth.js'),categories=read('categories.js'),pricing=read('pricing.js');
const index=read('index.html'),brands=read('v40001-multibrand.js'),iso=read('iso-v50011.js');
const series=read('v40001-product-series-overhaul.js'),migration=read('supabase/migrations/20261030193000_v50015_category_archive.sql');
const selectorIso=read('selector-iso/index.html'),selectorEs=read('selector-es/index.html');
const baselineRoot=[path.join(root,'..','..','v50014','KeySuite_V5.00.14'),path.join(root,'..','v50014','KeySuite_V5.00.14')].find(candidate=>fs.existsSync(candidate));
assert.ok(baselineRoot,'V5.00.14 baseline is required for preservation checks');

// 1 Category protection and archival.
assert.match(index,/id="editCategoryList"[^>]*>Hold 5s to Edit/);
assert.match(categories,/setTimeout\(\(\)=>\{stop\(false\);setListEditing\(true\)\},5000\)/);
assert.match(categories,/keysuite_archive_pricing_category_v50015/);
assert.match(migration,/set is_active=false,archived_at=now\(\),archived_by=/);
assert.match(migration,/pricing_category_id::text=p_category_id/);
assert.doesNotMatch(index,/<th>Category<\/th>/);

// 2–4 Full shared pricing registry, CR routing and preserved pricing factors.
const groups=['Baseplate','BFI','BGF','CHC G1','CHC G2','Coupling','CR','ES','GWS','ISO','KeyPLC','Manifold','Motor'];
for(const label of groups)assert.match(pricing,new RegExp(`:'${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}'`));
assert.match(pricing,/code==='GENERAL'\|\|code==='KEYLAB'/);
assert.match(pricing,/selectedPricingFamily=normalizedFamily\(button\.dataset\.pricingFamily\)/);
assert.match(pricing,/cat\?\.productRules\?\.\[code\]/);
for(const factor of ['margin','normal','rare','trimming','transport','useCommission','useSetDiscount','useFinalDiscount','useFuelCharge','currencies'])assert.ok(pricing.includes(factor));

// 5 Brand ordering and saved per-customer values.
assert.match(brands,/\['b\.g\.reich','b\.g\. reich'\].*\?0:lowName\(value\)==='tesk'\?1/);
assert.match(brands,/!!key&&!!name/);
assert.match(brands,/grid\.innerHTML=marginBrands\.map/);
assert.match(brands,/state\.customerMargins\.has\(key\)/);
assert.match(index,/\.v391-margin-grid\{grid-template-columns:repeat\(4/);

// 6 ISO Product equals the ES structural contract and routes its own curve.
for(const id of ['isoMaterial','isoSealType','isoSeal','isoElastomer','isoSearch','isoProductSeriesList','isoProducts','productIsoSelectorFrame'])assert.match(index,new RegExp(`id="${id}"`));
assert.match(index,/class="product-layout es-product-layout iso-product-layout"/);
assert.match(iso,/openProductCurve\(window\.ISO_SELECTOR_DB\.pumps/);
assert.match(iso,/productIsoSelectorFrame/);
assert.doesNotMatch(iso,/showPage\('selectorIso'\)/);

// 7–8 ES/ISO selectors and Product Curve share the responsive architecture.
const contract=html=>['html,body{width:100%;max-width:100%;min-width:0;overflow-x:hidden}','grid-template-columns:350px minmax(0,1fr)','grid-template-columns:minmax(0,1.55fr) minmax(310px,1fr)','@media(max-width:1100px)','html.macos-safari body{zoom:1;width:100%;min-width:0}'].every(token=>html.includes(token));
assert.ok(contract(selectorEs));assert.ok(contract(selectorIso));
assert.match(series,/fam==='ISO'\?'productIsoSelectorFrame'/);
assert.match(series,/f==='ES'\|\|f==='ISO'/);
assert.match(series,/installSelectionIsoProductPanel/);
assert.match(series,/#selectorIsoFrame\{display:block;width:100%!important;max-width:100%!important;min-width:0!important/);

// 9 Save/retry/auth recovery and database confirmation.
assert.match(auth,/Secure data request/);
assert.match(auth,/refreshSession/);
assert.match(auth,/ensureActiveSession/);
assert.match(app,/for\(let attempt=0;attempt<2;attempt\+\+\)/);
assert.match(app,/forceRefresh:attempt>0/);
assert.match(app,/if\(!exact\).*database did not confirm this quotation save/);
assert.match(app,/retainQuotationDraft\(q\)/);
assert.match(app,/clearQuotationDraft\(\)/);

// 10–11 Clone, account-scoped Copy and Paste.
assert.match(app,/duplicate-quote-item"[^>]*>Clone<\/button>/);
assert.match(app,/copy-quote-item"[^>]*>Copy<\/button>/);
assert.match(index,/id="pasteQuoteItem">Paste Item/);
assert.match(app,/quote-item-clipboard:\$\{currentCompanyId\(\)\}:\$\{currentEmail\(\)\.toLowerCase\(\)\}/);
assert.match(app,/structuredClone\(payload\.item\)/);

// 12–13 Existing numbering/revisions and hydraulic sources remain untouched.
assert.match(app,/quoteRevisionNumberFromNo/);
assert.match(app,/keysuite_save_quotation_v50004/);
for(const file of ['selector-iso/es-core.js','selector-iso/iso-data.js','selector-es/es-core.js','selector-es/es-data.js','power-curve.js']){
  assert.deepEqual(fs.readFileSync(path.join(root,file)),fs.readFileSync(path.join(baselineRoot,file)),`${file} hydraulic source changed`);
}

// 14 Version and Safari responsive rule contract (manual Safari result is recorded separately).
assert.equal(read('VERSION.txt').trim(),'5.00.15');
assert.match(read('v50015-version-lock.js'),/const V='5\.00\.15'/);
assert.equal(JSON.parse(read('RELEASE.json')).version,'5.00.15');
assert.equal(JSON.parse(read('manifest.json')).name,'KeySuite V5.00.15');
console.log('PASS: KeySuite V5.00.15 Phase 2 regression contract (14 areas)');
