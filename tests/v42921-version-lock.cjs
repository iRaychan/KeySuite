const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const nodes={suite:{textContent:'KeySuite V4.29.20'},auth:{textContent:'V4.29.20',closest:selector=>selector==='.auth-brand'?{}:null},brand:{textContent:'Full Suite V4.29.20',closest:()=>null}};
const document={title:'Old',readyState:'complete',documentElement:{attrs:{},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v}},querySelectorAll(selector){if(selector==='.suite-version')return[nodes.suite];if(selector==='.brand small,.auth-brand small')return[nodes.auth,nodes.brand];return[]}};
const context={window:{top:null,self:null,addEventListener(){}},document,MutationObserver:function(){this.observe=()=>{}},requestAnimationFrame:fn=>fn()};context.window.top=context.window;context.window.self=context.window;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','v42921-version-lock.js'),'utf8'),context);
assert.strictEqual(document.title,'KeySuite V4.29.21');assert.strictEqual(nodes.suite.textContent,'KeySuite V4.29.21');assert.strictEqual(nodes.auth.textContent,'V4.29.21');assert.strictEqual(nodes.brand.textContent,'Full Suite V4.29.21');assert.strictEqual(document.documentElement.attrs['data-keysuite-version'],'4.29.21');
console.log('V4.29.21 version lock: PASS');
