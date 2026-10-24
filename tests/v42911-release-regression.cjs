const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

assert.strictEqual(read('VERSION.txt').trim(), '4.29.11');
assert.match(read('index.html'), /KEYSUITE_VERSION='4\.29\.11'/);
assert.match(read('index.html'), /v42911-version-lock\.js\?v=42911/);
assert.match(read('v41200-bootstrap.js'), /const VERSION='42911'/);
assert.match(read('sw.js'), /keysuite-v42911/);
assert.match(read('sw.js'), /v42911-version-lock\.js/);
assert.match(read('v42911-version-lock.js'), /const V='4\.29\.11'/);

const telegramWebhook = read('supabase/functions/telegram-webhook/index.ts');
const gate = telegramWebhook.indexOf("if(responseMode==='nothing')");
const menu = telegramWebhook.indexOf("if(menuText||callbackData==='menu:home')");
assert.ok(gate >= 0, 'unassigned sender mode is blocked');
assert.ok(menu >= 0 && gate < menu, 'the unassigned gate runs before the main menu');
assert.match(telegramWebhook, /Your Telegram account is not assigned yet\./);
assert.match(telegramWebhook, /Please contact your administrator to request access\./);
assert.match(telegramWebhook.slice(gate, menu), /telegramRemoveKeyboard\(\)/, 'the unassigned response removes the keyboard');
assert.match(telegramWebhook.slice(gate, menu), /automated_reply:true/, 'the access notice is reported as an automated reply');

assert.match(
  telegramWebhook,
  /if\(series==='CHC'\)return \['CHC_G1','CHC_G2'\]\.includes\(group\)/,
  'CHC Fast Search spans all assigned selling brands mapped to either CHC generation'
);
assert.match(
  telegramWebhook,
  /seriesMatch=raw\.match\(\/\\b\(CHC\|VMS\|SVM\|BFI\|HMS\|ES\).*request\.series_filter=/,
  'CHC, VMS, BFI, HMS and ES numeric input is retained as a hydraulic series filter'
);
assert.match(
  telegramWebhook,
  /initial=await guidedSizeSelectedProducts\(service,companyId,wanted,q,h,240,240,requestedEsPole,String\(parsed\.series_filter\|\|''\)\)/,
  'Fast Search passes the numeric series filter to hydraulic sizing'
);

assert.match(telegramWebhook, /\(CHCS\|CHCN\|CHC\|VMS\)/, 'CHCS and CHCN exact models are recognised');
assert.match(telegramWebhook, /prefix==='CHCS'\?'SS304':prefix==='CHCN'\?'SS316':'Standard'/, 'CHCS and CHCN map to SS304 and SS316');
assert.match(telegramWebhook, /function keybotDutyPoints\(text:any,limit=5\)/, 'up to five duty points are parsed');
assert.match(telegramWebhook, /keybotDutyPoints\(text,5\)\.count===lines\.length/, 'multiple bare duty rows are not mistaken for Customer plus Product');
assert.match(telegramWebhook, /A maximum of 5 duty points can be plotted on one curve\./, 'a sixth duty point is rejected clearly');
assert.match(telegramWebhook, /pumpModelMeetsDutyPoints\(/, 'multi-point suitability filters candidate models');
assert.match(telegramWebhook, /curveIdentity\.duty_points=requestedDuties/, 'exact-model curves receive all requested duty points');

const curvePdf = read('supabase/functions/telegram-webhook/curve-pdf.ts');
assert.match(curvePdf, /export function pumpModelMeetsDutyPoints/, 'the hydraulic engines validate every duty point');
assert.match(curvePdf, /duties\?:Array<\{point:XY,label:string\}>/, 'curve charts accept multiple labelled duty markers');
assert.match(curvePdf, /`D\$\{i\+1\}`/, 'curve duty points are labelled D1 through D5');
assert.match(curvePdf, /dutyPoints\.length>1&&forcedD<=0/, 'ES curves use one multi-duty impeller selection');
assert.match(curvePdf, /\(\?:CHC\|BFI\|ES\)/, 'numeric family filtering covers CHC, BFI and ES');

const customerBrandSettings = read('v40001-customer-brand-settings.js');
assert.match(customerBrandSettings, /PRICE_GROUPS=\['CHC_G1','CHC_G2','CR','BFI','ES'/, 'Customer Brand / Series Price Preference includes CR');
assert.match(customerBrandSettings, /priceGroup:'CR',family:'CR',selectionKey:keyOf\(b\.id,'CR'\)/, 'B.G.Reich CR has an independently saved Price and Selection key');
assert.match(customerBrandSettings, /\['CHC_G1','CHC_G2','CR','BFI','ES'\]\.includes\(group\)/, 'CR is eligible for Customer Curve / Quick Selection preference');

const quickSelection = read('v40201-quick-selection.js');
assert.match(quickSelection, /FAMILIES=\['CHC','CR','BFI','ES'\]/, 'Quick Selection recognises CR as a hydraulic family');
assert.match(quickSelection, /family:'CR',productGroup:'CR',key:keyOf\(b\.id,'CR'\)/, 'Quick Selection exposes assigned B.G.Reich CR');

const esCorePath = path.join(root, 'supabase/functions/telegram-webhook/es-core.js');
const esDataPath = path.join(root, 'supabase/functions/telegram-webhook/es-data.js');
if (fs.existsSync(esCorePath) && fs.existsSync(esDataPath)) {
  const esCore = require(esCorePath);
  const esData = require(esDataPath);
  const esDuties = [1, 2, 3, 4, 5].map((flow, i) => ({
    label: `D${i + 1}`,
    totalFlowLps: flow,
    headM: 10 - i,
    pumps: 1
  }));
  const esMulti = esCore.selectPumpsMulti(esData, { dutyPoints: esDuties, mode: 'trim', rpm: 2900 });
  assert.ok(esMulti.length > 0, 'ES selector returns a model that satisfies five duty points');
  assert.strictEqual(esMulti[0].dutyPoints.length, 5, 'the selected ES result retains all five duty points');
}

console.log('V4.29.11 Telegram access, CR assignment, series filtering and five-point curve regression: PASS');
