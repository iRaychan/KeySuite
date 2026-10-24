/* Run with: node tests/v42915-release-regression.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js');
const migration=read('supabase/migrations/20261021194500_v42915_atomic_quotation_claim.sql');
const sequenceMigration=read('supabase/migrations/20261018190000_v42910_company_wide_quotation_sequence.sql');
const c4=read('selector-g1/index.html');

assert.strictEqual(read('VERSION.txt').trim(),'4.29.15');
assert.match(read('index.html'),/KeySuite V4\.29\.15/);
assert.match(read('index.html'),/v42915-version-lock\.js\?v=42915/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.15'/);
assert.match(read('sw.js'),/keysuite-v42915/);

assert.doesNotMatch(app,/lines\.splice\(2,0,`Motor price adjustment:/);
assert.match(app,/keysuite_save_quotation_v42915/);
assert.match(app,/Quotation number \$\{attemptedDigits\} has already been used\.\\nThe number has been updated to \$\{nextDigits\}\. Please save again\./);
assert.match(app,/descriptionManuallyEdited/);
assert.match(app,/YELLOW — MANUALLY EDITED/);
assert.match(app,/const dutyText=hasDutyPoint\(p\)\?quotationDutyText\(p\):'';/);

assert.match(migration,/pg_advisory_xact_lock/);
assert.match(migration,/'status','conflict'/);
assert.match(migration,/archived\.logical_id,archived\.quote_data->>'id'/);
assert.doesNotMatch(migration,/archived\.row_data/);
assert.match(migration,/grant execute on function public\.keysuite_save_quotation_v42915\(text,jsonb\) to authenticated/);
assert.match(sequenceMigration,/with reference_rows as \(/);
assert.doesNotMatch(sequenceMigration,/with references as \(/);

assert.match(c4,/V4\.29\.15: C4 uses the established standard Selector responsive container/);
assert.match(c4,/html,body\{width:100%;max-width:100%;min-width:0;overflow-x:hidden\}/);
assert.match(c4,/grid-template-columns:330px minmax\(0,1fr\)/);

console.log('V4.29.15 release regression: PASS');
