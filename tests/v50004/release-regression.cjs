const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.js');
const refs=read('quotation-references.js');
const html=read('index.html');
const safari=read('v42872-selector-first-open.js');
const sql=read('supabase/migrations/20261026170000_v50004_ks06_reuse_deleted_quotation_numbers.sql');
const queueSql=read('supabase/migrations/20261026172000_v50004_ks06_owner_delete_reuse_queue.sql');

assert.match(app,/keysuite_save_quotation_v50004/);
assert.match(app,/keysuite_save_quotation_v42920/);
assert.match(refs,/keysuite_preview_quotation_reference_v50004/);
assert.match(refs,/keysuite_preview_quotation_reference_v42910/);
assert.match(sql,/from public\.ks_quotation_archive_v409/i);
assert.match(sql,/from public\.ks_quotations/i);
assert.match(sql,/keysuite_v50004_first_available_running/i);
assert.match(sql,/pg_advisory_xact_lock[\s\S]*keysuite-quotation:/i);
assert.match(sql,/v_clean:=jsonb_set\(v_clean,'\{no\}',to_jsonb\(v_existing_no\)/i);
assert.match(sql,/quotation_number_reused/i);
assert.match(sql,/last_number=greatest\(/i);
assert.match(queueSql,/ks_quotation_reuse_pool_v50004/i);
assert.match(queueSql,/generate_series\(235,239\)/i);
assert.match(queueSql,/v_role='owner' and v_deleted>0/i);
assert.match(queueSql,/status='allocated'/i);
assert.match(queueSql,/generate_series\(greatest\(state\.last_number\+1,1\),9999\)/i);
assert.doesNotMatch(queueSql,/generate_series\(1,9999\) candidate/i);
assert.match(queueSql,/0232 through 0234 are deliberately not seeded/i);

assert.match(safari,/removeProperty\('zoom'\)/);
assert.match(safari,/removeProperty\('transform'\)/);
assert.doesNotMatch(safari,/transform\s*=\s*['"]scale\(/i);
assert.match(safari,/target\.style\.width='100%'/);
assert.match(safari,/version:'4\.28\.72'/);

assert.match(html,/\.print-items-table thead::after\{content:none;display:none\}/);
assert.match(html,/\.print-items-table thead th\{[^}]*border-bottom:1\.2px solid var\(--template-primary/i);
assert.match(app,/const summary=showSummary\?/);
assert.match(app,/idx===pages\.length-1/);
assert.match(html,/V5\.00\.04/);

console.log('PASS V5.00.04 KS-06..08 release regression');
