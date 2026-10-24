/* Run with: node tests/v42919-version-lock.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

let writes=0;
let observerCallback=null;
const makeNode=(initial,auth=false)=>{
  let value=initial;
  return {get textContent(){return value},set textContent(next){writes+=1;value=next},closest(selector){return auth&&selector==='.auth-brand'?{}:null}};
};
const suite=makeNode('KeySuite V4.29.18');
const auth=makeNode('V4.29.18',true);
const brand=makeNode('Full Suite V4.29.18');
const attrs=new Map();
const context={window:null,document:{title:'KeySuite V4.29.18',readyState:'complete',documentElement:{getAttribute:key=>attrs.get(key)||null,setAttribute:(key,value)=>attrs.set(key,value)},querySelectorAll(selector){return selector==='.suite-version'?[suite]:[auth,brand]}},MutationObserver:class{constructor(callback){observerCallback=callback}observe(){}},requestAnimationFrame(callback){callback();return 1}};
context.window=context;context.addEventListener=()=>{};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','v42919-version-lock.js'),'utf8'),context);

assert.strictEqual(context.document.title,'KeySuite V4.29.19');
assert.strictEqual(suite.textContent,'KeySuite V4.29.19');
assert.strictEqual(auth.textContent,'V4.29.19');
assert.strictEqual(brand.textContent,'Full Suite V4.29.19');
assert.strictEqual(writes,3);
observerCallback();observerCallback();
assert.strictEqual(writes,3);
console.log('V4.29.19 version lock: PASS');
