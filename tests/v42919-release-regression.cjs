/* Run with: node tests/v42919-release-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const app=read('app.js');
const sw=read('sw.js');
const migration=read('supabase/migrations/20261022170000_v42919_quotation_history_and_counter.sql');

assert.strictEqual(read('VERSION.txt').trim(),'4.29.19');
assert.match(html,/KeySuite V4\.29\.19/);
assert.match(html,/app\.js\?v=42919/);
assert.match(html,/auth\.js\?v=42919/);
assert.match(html,/v42919-version-lock\.js\?v=42919/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.19'/);
assert.match(sw,/keysuite-v42919/);
assert.match(sw,/v42919-version-lock\.js/);
assert.match(read('v42918-version-lock.js'),/v42919-version-lock\.js\?v=42919&compat=42918/);

assert.match(app,/quotationCacheError/);
assert.match(app,/browser backup could not be updated/);
assert.match(app,/quotation_sync_required/);
assert.match(app,/keysuite_list_quotations_v42919/);
assert.ok(app.indexOf("keysuite_list_quotations_v42919")<app.indexOf("keysuite_list_quotations_v42916"),'V4.29.19 list RPC must be attempted before compatibility RPCs');

assert.match(migration,/create or replace function public\.keysuite_list_quotations_v42919/);
assert.match(migration,/from public\.ks_quotation_archive_v409 archived/);
assert.match(migration,/from public\.ks_quotations current_quote/);
assert.match(migration,/row_number\(\) over/);
assert.match(migration,/revoke all on function public\.keysuite_list_quotations_v42919\(text\) from public,anon/);
assert.match(migration,/grant execute on function public\.keysuite_list_quotations_v42919\(text\) to authenticated/);
assert.match(migration,/on conflict on constraint ks_quotation_company_sequences_v42910_pkey/);

const release=JSON.parse(read('RELEASE.json'));
assert.strictEqual(release.version,'4.29.19');
assert.strictEqual(release.baseline,'4.29.18');
assert.strictEqual(release.new_database_migration_required,true);
assert.strictEqual(release.edge_function_deploy_required,false);

console.log('V4.29.19 release regression: PASS');
