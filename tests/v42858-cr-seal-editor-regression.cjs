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
const v50012=read('proposals/pricing_v50012.sql');

assert(/id="crSealRows"/.test(html),'CR seal table must remain visible');
assert(/seal-price-table/.test(html),'seal tables must use the compact layout');
assert(/\.seal-price-table\{width:100%;table-layout:fixed\}/.test(html),'CR seal editor must use the compact responsive table');
assert(/data-cr-seal-code/.test(editor),'CR seal values must render by material column');
assert(/data-cr-seal-group-row/.test(editor),'CR seal pump-size groups must render as rows');
assert(/data-save-cr-seal-group/.test(editor),'each pump-size group must have a save action');
assert(/keysuite_save_cr_mechanical_seal_group_v50012/.test(editor),'CR seal group editor must call its owner-only save RPC');
assert(/ks_cr_mechanical_seal_addons/.test(editor),'CR seal editor must load saved values');
assert(/secureData\.crSealAddons\?\.length/.test(pricing),'pricing must prefer saved CR seal add-ons');

assert(/create table if not exists public\.ks_cr_mechanical_seal_addons/.test(migration));
assert(/enable row level security/.test(migration));
assert(/lower\(coalesce\(ua\.role,''\)\)='owner'/.test(migration),'save RPC must require owner access');
assert(/revoke all on function[\s\S]+from public,anon/.test(migration));
assert(/grant execute on function[\s\S]+to authenticated/.test(migration));
assert(/Expected 15 CR mechanical-seal add-on rows/.test(verify));
assert(/keysuite_save_cr_mechanical_seal_group_v50012/.test(v50012),'V5.00.12 migration must include the size-group save function');
assert(/on conflict\(seal_code,group_code\) do update/.test(v50012),'group save must update only existing add-on keys');

console.log('V4.28.58 CR seal editor regression: PASS');
