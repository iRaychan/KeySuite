const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'keyhq', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'keyhq', 'index.html'), 'utf8');
const launcher = fs.readFileSync(path.join(root, 'keyhq-launcher.js'), 'utf8');

const requiredFloorLabels = [
  'Reception + KeyLab', 'KeyLab + Warehouse', 'Showroom', 'Wellness + Social',
  'KeyBot', 'KeyOffice', 'Conference', 'Owner Room'
];
for (const label of requiredFloorLabels) {
  if (!app.includes(label)) throw new Error(`Missing KeyHQ V0.1 floor: ${label}`);
}

for (const feature of [
  'RECEPTION · FRONT', 'KEYLAB · CENTER', 'WAREHOUSE · REAR', 'PRODUCT SHOWROOM',
  'CANTEEN', 'GYM', 'GAMING', 'SHOWER', 'SAUNA', 'CONNECTED GROUPS OF 4',
  '18 SEATS · 9 PER SIDE', 'OWNER ROOM · PRIVATE STRATEGY',
  '50% BASKETBALL', '50% SOCIAL · VIEW DECK', 'ELEVATOR'
]) {
  if (!app.includes(feature)) throw new Error(`Missing KeyHQ V0.1 structural feature: ${feature}`);
}

if (!app.includes('PODIUM_H=1.95') || !app.includes('function floorZ(level)')) {
  throw new Error('The combined tall Levels 1–2 podium geometry is missing.');
}
if (!app.includes("logoImage.src='../keylargo-logo.png'")) throw new Error('Original Keylargo logo is not retained.');
if (!html.includes('V0.5 ARCHITECTURAL OFFICE') || !html.includes('data-theme-mode="sunset"')) {
  throw new Error('Current KeyHQ identity or sunset control is missing.');
}
if (!launcher.includes("frame.src='keyhq/index.html?embedded=1&v=keyhq05'")) {
  throw new Error('KeySuite does not launch the current KeyHQ cache identifier.');
}
if (!launcher.includes("event.origin!==location.origin") || !launcher.includes("action:'list_inbox'")) {
  throw new Error('Existing same-origin or live KeyBot integration guard was lost.');
}
if (/progress:\d+|eta:'/.test(app)) throw new Error('Fabricated live progress data was introduced.');

console.log('KeyHQ structural continuity regression: PASS');
