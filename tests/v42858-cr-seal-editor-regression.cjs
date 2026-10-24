const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const editor=read('cr-pricelist-v42854.js');
const pricing=read('pricing.js');
const migration=read('supabase/migrations/20261005090000_v42858_cr_mechanical_seal_addons.sql');
const verify=read('supabase/migrations/20261005090001_v42858_verify_cr_mechanical_seal_addons.sql');

assert(/id="crSealRows"/.test(html),'CR seal table must remain visible');
assert(/seal-price-table/.test(html),'seal tables must use the compact layout');
assert(/\.seal-price-table \.currency-price-input\{width:66px;min-width:66px\}/.test(html),'CHC and CR seal inputs must be approximately half width');
assert(/data-cr-seal-group/.test(editor),'CR seal prices must render as inputs');
assert(/data-save-cr-seal/.test(editor),'CR seal rows must have save actions');
assert(/keysuite_save_cr_mechanical_seal_addons_v42858/.test(editor),'CR seal editor must call its save RPC');
assert(/ks_cr_mechanical_seal_addons/.test(editor),'CR seal editor must load saved values');
assert(/secureData\.crSealAddons\?\.length/.test(pricing),'pricing must prefer saved CR seal add-ons');

assert(/create table if not exists public\.ks_cr_mechanical_seal_addons/.test(migration));
assert(/enable row level security/.test(migration));
assert(/lower\(coalesce\(ua\.role,''\)\)='owner'/.test(migration),'save RPC must require owner access');
assert(/revoke all on function[\s\S]+from public,anon/.test(migration));
assert(/grant execute on function[\s\S]+to authenticated/.test(migration));
assert(/Expected 15 CR mechanical-seal add-on rows/.test(verify));

console.log('V4.28.58 CR seal editor regression: PASS');
