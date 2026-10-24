const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const launcher = fs.readFileSync(path.join(root, 'keyhq-launcher.js'), 'utf8');
const keyhq = fs.readFileSync(path.join(root, 'keyhq', 'index.html'), 'utf8');

const keyBotIndex = html.indexOf('id="keyAiNavButton"');
const keyHQIndex = html.indexOf('id="keyhqNavButton"');
if (keyBotIndex < 0 || keyHQIndex < 0 || keyHQIndex <= keyBotIndex) {
  throw new Error('KeyHQ must appear immediately after KeyBot in the sidebar source.');
}
if (!/src="keyhq-launcher\.js\?v=42923-keyhq05"/.test(html)) {
  throw new Error('KeyHQ launcher is not loaded by KeySuite.');
}
if (!launcher.includes("frame.src='keyhq/index.html?embedded=1&v=keyhq05'")) {
  throw new Error('KeyHQ launcher does not target the embedded HQ page.');
}
if (!launcher.includes("event.data?.type==='KEYHQ_CLOSE'")) {
  throw new Error('KeyHQ return-to-KeySuite message handler is missing.');
}
if (!keyhq.includes('Interactive eight-level KeyHQ V0.5 headquarters')) {
  throw new Error('The expandable KeyHQ application is missing.');
}
if (!launcher.includes('KEYHQ_CONTEXT') || !launcher.includes("action:'list_inbox'")) throw new Error('Shared KeySuite context or company inbox connection is missing.');
if (!launcher.includes("inbox.data?.error") || !launcher.includes("inbox.data?.ok===false")) throw new Error('KeyHQ does not surface a failed inbox verification.');
if (!launcher.includes("context.eventMode=context.events.length?'live':'empty'")) throw new Error('Live and connected-empty Telegram modes are not separated.');
if (/progress:\d+|eta:'/.test(fs.readFileSync(path.join(root, 'keyhq', 'app.js'), 'utf8'))) throw new Error('KeyHQ still contains fabricated agent progress or ETA values.');
if (!launcher.includes("event.origin!==location.origin")) throw new Error('Same-origin KeyHQ messaging guard is missing.');

console.log('KeyHQ integration regression: PASS');
