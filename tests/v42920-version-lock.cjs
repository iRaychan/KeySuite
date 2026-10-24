/* Run with: node tests/v42920-version-lock.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const nodes={suite:{textContent:'KeySuite V4.29.19'},auth:{textContent:'V4.29.19',closest:()=>({})},brand:{textContent:'Full Suite V4.29.19',closest:()=>null}};
const document={
 title:'KeySuite V4.29.19',readyState:'complete',
 documentElement:{attrs:{},getAttribute(k){return this.attrs[k]||null},setAttribute(k,v){this.attrs[k]=v}},
 querySelectorAll(selector){if(selector==='.suite-version')return [nodes.suite];if(selector==='.brand small,.auth-brand small')return [nodes.auth,nodes.brand];return []}
};
const context={window:{addEventListener(){}},document,requestAnimationFrame:fn=>fn(),MutationObserver:class{observe(){}}};
context.window.window=context.window;context.window.document=document;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','v42920-version-lock.js'),'utf8'),context);
assert.strictEqual(document.title,'KeySuite V4.29.20');
assert.strictEqual(nodes.suite.textContent,'KeySuite V4.29.20');
assert.strictEqual(nodes.auth.textContent,'V4.29.20');
assert.strictEqual(nodes.brand.textContent,'Full Suite V4.29.20');
assert.strictEqual(document.documentElement.attrs['data-keysuite-version'],'4.29.20');
console.log('V4.29.20 version lock: PASS');
