/* Run with: node tests/v42917-release-regression.cjs */
const assert=require('node:assert');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const preserved={
  'app.js':'03be864747fb54241e032ae187245559b20e1ab9ce0252de969221ec168b1ab7',
  'pricing.js':'7d716e3fe7d7dbf33db783f7bd2db73040e10a7f02bd8cbd3190edeaa91ed031',
  'keyhq-launcher.js':'b9763bf870d147d3fc1decf3f7b44a5b2af1d5a3d6e5b78341033c0b045c553a',
  'keyhq/app.js':'b72ec2d6f78028d8c9082bfaacad87371eea5e796116fb173324058cfe1f2838',
  'keyhq/index.html':'0597f03c0288af2881b95d13e816e75e890396d1adfdfb0301737f870986925e',
  'keyhq/styles.css':'52cf0eb9e16e4a6a31da7453cc1783993921b026062d18d4670fd6f8743e0b68',
  'supabase/migrations/20261021213000_v42916_quotation_integrity_and_scope.sql':'16d8205405ed680fc8c992ec93544073ba0c75ff9567ed6f40abf0fed2f24a99'
};

const html=read('index.html'),auth=read('auth.js'),sw=read('sw.js');
assert.strictEqual(read('VERSION.txt').trim(),'4.29.17');
assert.match(html,/KeySuite V4\.29\.17/);
assert.match(html,/@supabase\/supabase-js@2\.118\.0\/dist\/umd\/supabase\.js/);
assert.doesNotMatch(html,/@supabase\/supabase-js@2["']/);
assert.match(html,/auth\.js\?v=42917/);
assert.match(html,/v42917-version-lock\.js\?v=42917/);
assert.match(read('v41200-bootstrap.js'),/KEYSUITE_VERSION='4\.29\.17'/);
assert.match(sw,/keysuite-v42917/);
assert.match(sw,/v42917-version-lock\.js/);

assert.match(auth,/const AUTH_REQUEST_TIMEOUT_MS=6000/);
assert.match(auth,/const AUTH_STARTUP_TIMEOUT_MS=8000/);
assert.match(auth,/__KEYSUITE_AUTH_V42917_ACTIVE__/);
assert.match(auth,/KeySuiteAuth\?\.getClient\?\.\(\)\?\.auth\?\.dispose/);
assert.match(auth,/function timeoutFetch\(input,init=\{\},timeoutMs=AUTH_REQUEST_TIMEOUT_MS\)/);
assert.match(auth,/global:\{fetch:timeoutFetch\}/);
assert.match(auth,/await readInitialSession\(\)/);
assert.match(auth,/disposeAuthClient\(\)/);
assert.doesNotMatch(auth,/boundedAuth/);
const getSessionAt=auth.indexOf('await readInitialSession()');
const listenerAt=auth.indexOf('installAuthListener();',getSessionAt);
assert.ok(getSessionAt>=0&&listenerAt>getSessionAt,'auth listener must be installed after the initial session read');
assert.match(auth,/client=createAuthClient\(\)/);
assert.match(auth,/showLogin\(error\?\.code==='KEYSUITE_AUTH_TIMEOUT'/);

// The Safari patch must not alter the V4.29.16 quotation or KeyHQ implementations.
for(const [file,expected] of Object.entries(preserved))if(fs.existsSync(path.join(root,file)))assert.strictEqual(hash(file),expected,`${file} changed unexpectedly`);
if(fs.existsSync(path.join(root,'app.js'))){
  assert.match(read('app.js'),/keysuite_save_quotation_v42916/);
  assert.match(read('app.js'),/normalizeQuoteItemQuantities/);
}
if(fs.existsSync(path.join(root,'keyhq-launcher.js')))assert.match(read('keyhq-launcher.js'),/KEYHQ_CONTEXT/);
if(fs.existsSync(path.join(root,'keyhq/app.js')))assert.match(read('keyhq/app.js'),/timeZone:'Asia\/Kuala_Lumpur'/);

console.log('V4.29.17 release regression: PASS');
