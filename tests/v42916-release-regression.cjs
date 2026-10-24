/* Run with: node tests/v42916-release-regression.cjs */
const assert=require('node:assert');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const app=read('app.js'),html=read('index.html'),launcher=read('keyhq-launcher.js');
const hqHtml=read('keyhq/index.html'),hqApp=read('keyhq/app.js'),hqCss=read('keyhq/styles.css');
const migration=read('supabase/migrations/20261021213000_v42916_quotation_integrity_and_scope.sql');

assert.strictEqual(read('VERSION.txt').trim(),'4.29.16');
assert.match(html,/KeySuite V4\.29\.16/);
assert.match(html,/keyhq-launcher\.js\?v=42916/);
assert.match(html,/v42916-version-lock\.js\?v=42916/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.16'/);
assert.match(read('sw.js'),/keysuite-v42916/);

assert.match(app,/keysuite_save_quotation_v42916/);
assert.match(app,/keysuite_list_quotations_v42916/);
assert.match(app,/function canManageQuotationHistory\(\)\{return currentRole\(\)==='owner'\}/);
assert.match(app,/normalizeQuoteItemQuantities/);
assert.match(app,/quantity:Number\.isFinite/);
assert.match(app,/numberAdjustedFrom=payload\.no/);
assert.match(app,/\?'created':'updated'/);
assert.match(app,/successfully\.\$\{adjusted\}/);

assert.match(migration,/pg_catalog|keysuite_save_quotation_v42915/);
assert.match(migration,/operation.*created.*updated/s);
assert.match(migration,/'qty'.*'quantity'/s);
assert.ok(migration.includes("lower(trim(coalesce(access_row.role,'')))='owner'"));
assert.match(migration,/You may update only quotations assigned to your own account/);
assert.match(migration,/revoke all on function public\.keysuite_save_quotation_v42916\(text,jsonb\) from public,anon/);
assert.match(migration,/grant execute on function public\.keysuite_list_quotations_v42916\(text\) to authenticated/);

assert.ok(html.indexOf('id="keyhqNavButton"')>html.indexOf('id="keyAiNavButton"'));
assert.match(launcher,/loading="lazy"/);
assert.match(launcher,/KEYHQ_CONTEXT/);
assert.match(launcher,/telegram_connected/);
assert.match(launcher,/Demo · Acme Engineering/);
assert.match(hqHtml,/Auto<\/button><button data-theme-mode="day">Day<\/button><button data-theme-mode="night">Night/);
assert.match(hqHtml,/\.\.\/keylargo-logo\.png/);
assert.match(hqApp,/const baseFloors=\[/);
assert.strictEqual((hqApp.match(/\['(?:Lobby|Operations|KeyBot|Engineering|Sales|Creative|Management|Executive)'/g)||[]).length,8);
assert.match(hqApp,/MAX_FLOORS=12/);
assert.match(hqApp,/BASKETBALL/);
assert.match(hqApp,/FUTSAL/);
assert.match(hqApp,/text3d\('WC'/);
assert.match(hqApp,/text3d\('PANTRY'/);
assert.match(hqApp,/text3d\('GAME'/);
assert.match(hqApp,/timeZone:'Asia\/Kuala_Lumpur'/);
assert.match(hqApp,/triggerEnquiry/);
assert.match(hqApp,/canProjector/);
assert.match(hqCss,/drop-shadow\(0 0 7px #62f1dc\)/);

const logo=fs.readFileSync(path.join(root,'keylargo-logo.png'));
assert.strictEqual(crypto.createHash('sha256').update(logo).digest('hex'),'5ab07e647741bc8bc79faf8237d6b2ce5ba77499ac3b4a75216d17acba8ba1b1');
console.log('V4.29.16 release regression: PASS');
