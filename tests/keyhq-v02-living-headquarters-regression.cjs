const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'keyhq', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'keyhq', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'keyhq', 'styles.css'), 'utf8');
const launcher = fs.readFileSync(path.join(root, 'keyhq-launcher.js'), 'utf8');

for (const feature of [
  'function drawKeyBotStudio', 'TELEGRAM ENQUIRY OPERATIONS',
  'KEYBOT · VERIFIED LIVE WORKSPACE', 'function opsConsole',
  'function drawVerticalCore', 'function drawRoof', 'function drawGround'
]) {
  if (!app.includes(feature)) throw new Error(`Missing V0.2 design feature: ${feature}`);
}
if ((app.match(/opsConsole\(/g) || []).length < 2 || !app.includes('[-2.55,-1.25]')) {
  throw new Error('The Level 5 multi-workstation operations center is missing.');
}
if (!app.includes("logoImage.src='../keylargo-logo.png'") || !app.includes('drawFacadeLogo')) {
  throw new Error('The unchanged Keylargo logo asset is not wired into the building.');
}
if (!html.includes('V0.5 ARCHITECTURAL OFFICE') || !launcher.includes('v=keyhq05')) {
  throw new Error('Current KeyHQ identity/cache wiring is incomplete.');
}
if (!css.includes('body[data-theme="sunset"]') || !css.includes('body[data-theme="day"]')) {
  throw new Error('The designed lighting modes are missing.');
}
if (!launcher.includes("action:'list_inbox'") || !launcher.includes('event.origin!==location.origin')) {
  throw new Error('Live company feed or same-origin protections were lost.');
}
if (/progress:\d+|eta:'/.test(app)) throw new Error('Fabricated task progress was introduced.');

console.log('KeyHQ V0.2 Living Headquarters regression: PASS');
