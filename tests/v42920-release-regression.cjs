/* Run with: node tests/v42920-release-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const html=read('index.html');
const app=read('app.js');
const refs=read('quotation-references.js');
const sw=read('sw.js');
const migration=read('supabase/migrations/20261022193000_v42920_atomic_quotation_save.sql');

assert.strictEqual(read('VERSION.txt').trim(),'4.29.21');
assert.match(html,/KeySuite V4\.29\.21/);
assert.match(html,/app\.js\?v=42921/);
assert.match(html,/auth\.js\?v=42921/);
assert.match(html,/v42921-version-lock\.js\?v=42921/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.21'/);
assert.match(sw,/keysuite-v42921/);
assert.match(sw,/v42921-version-lock\.js/);
assert.match(read('v42919-version-lock.js'),/v42920-version-lock\.js\?v=42920&compat=42919/);

assert.ok(app.indexOf("keysuite_save_quotation_v42920")<app.indexOf("keysuite_save_quotation_v42916"),'V4.29.20 save RPC must be attempted first');
assert.doesNotMatch(app,/async function importLocalQuotes/);
assert.match(app,/QUOTATION_BACKUP_MAX_CHARS=500000/);
assert.match(app,/QUOTATION_BACKUP_MAX_ROWS=100/);
assert.match(app,/localStorage\.removeItem\('ks_quotes_backup_v236'\)/);
assert.match(app,/savedNo=canonicalQuotationNumber\(savedPayload\?\.no\)/);
assert.match(refs,/p_minimum_last_number:0/);
assert.ok(refs.indexOf('p_minimum_last_number:0')<refs.indexOf('const floor=scanRunningFloor'),'local floor must only be used after the Supabase preview path');

function functionSource(source,name){
  const start=source.indexOf(`function ${name}(`);assert(start>=0,`${name} exists`);
  const match=source.slice(start).match(/^function [\s\S]*?^}/m);assert(match,`${name} is extractable`);return match[0];
}
const backupSandbox={result:null};vm.createContext(backupSandbox);
vm.runInContext(`const QUOTATION_BACKUP_MAX_CHARS=500000,QUOTATION_BACKUP_MAX_ROWS=100;\n${functionSource(app,'compactQuotationBackupValue')}\n${functionSource(app,'compactQuotationBackup')}\nresult=compactQuotationBackup([{id:'one',signatureImage:'data:image/png;base64,'+'x'.repeat(900000),quotationTemplateSnapshot:{settings:{logoData:'data:image/png;base64,abc'}},items:[{model:'CHC 10',qty:1}]}]);`,backupSandbox);
assert.strictEqual(backupSandbox.result.length,1);
assert.strictEqual(backupSandbox.result[0].signatureImage,undefined);
assert.strictEqual(backupSandbox.result[0].quotationTemplateSnapshot.settings.logoData,undefined);
assert.strictEqual(backupSandbox.result[0].items[0].model,'CHC 10');
assert.ok(JSON.stringify(backupSandbox.result).length<500000);

assert.match(migration,/create or replace function public\.keysuite_save_quotation_v42920/);
assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/on conflict on constraint ks_quotation_company_sequences_v42910_pkey/);
assert.match(migration,/v_clean:=jsonb_set\(v_clean,'\{no\}',to_jsonb\(v_existing_no\),true\)/);
assert.match(migration,/v_clean:=jsonb_set\(v_clean,'\{createdByEmail\}',to_jsonb\(v_creator\),true\)/);
assert.match(migration,/revoke all on function public\.keysuite_save_quotation_v42920\(text,jsonb\) from public,anon/);
assert.match(migration,/grant execute on function public\.keysuite_save_quotation_v42920\(text,jsonb\) to authenticated/);

const release=JSON.parse(read('RELEASE.json'));
assert.strictEqual(release.version,'4.29.21');
assert.strictEqual(release.baseline,'4.29.20');
assert.strictEqual(release.new_database_migration_required,true);
assert.strictEqual(release.edge_function_deploy_required,true);

console.log('V4.29.20 release regression: PASS');
