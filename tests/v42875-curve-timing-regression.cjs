const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'v40201-quick-selection.js'), 'utf8');
const frame = { requestMatches: true, dataset: { ksSelectorViewportReady: '1' }, visibility: 'visible' };
const oldReady = (x) => x.requestMatches && x.dataset.ksChcViewportReady === '1' && x.visibility !== 'hidden';
const fixedReady = (x) => x.requestMatches && (x.dataset.ksSelectorViewportReady === '1' || x.dataset.ksChcViewportReady === '1') && x.visibility !== 'hidden';

assert.strictEqual(oldReady(frame), false);
assert.strictEqual(fixedReady(frame), true);
assert.strictEqual(fixedReady({ ...frame, visibility: 'hidden' }), false);
assert.strictEqual(fixedReady({ ...frame, requestMatches: false }), false);
assert.strictEqual(fixedReady({ requestMatches: true, dataset: { ksChcViewportReady: '1' }, visibility: 'visible' }), true);
assert.match(source, /ksSelectorViewportReady==='1'\|\|x\.dataset\.ksChcViewportReady==='1'/);

async function measure(predicate) {
  const events = new EventEmitter();
  const started = performance.now();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(fallback);
      resolve(Math.round(performance.now() - started));
    };
    events.once('ready', () => { if (predicate(frame)) finish(); });
    const fallback = setTimeout(finish, 4500);
    setTimeout(() => events.emit('ready'), 0);
  });
}

(async () => {
  const baselineMs = await measure(oldReady);
  const fixedMs = await measure(fixedReady);
  assert.ok(baselineMs >= 4400, `baseline did not reach the fallback: ${baselineMs} ms`);
  assert.ok(fixedMs < 100, `fixed readiness was not immediate: ${fixedMs} ms`);
  console.log(`V4.28.75 curve timing regression: PASS (baseline ${baselineMs} ms; fixed ${fixedMs} ms)`);
})().catch((error) => { console.error(error); process.exitCode = 1; });

