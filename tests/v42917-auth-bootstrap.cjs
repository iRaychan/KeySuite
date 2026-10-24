/* Run with: node tests/v42917-auth-bootstrap.cjs */
const assert=require('node:assert');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const elements=new Map();
function element(id){
  if(!elements.has(id))elements.set(id,{
    id,value:'',textContent:'',className:'',disabled:false,hidden:false,style:{},dataset:{},
    classList:{toggle(){}},addEventListener(){},setAttribute(){},getAttribute(){return 'about:blank'},
    focus(){},close(){},showModal(){}
  });
  return elements.get(id);
}

const context={
  console,setTimeout,clearTimeout,AbortController,URL,Promise,Error,
  location:{href:'https://example.test/',hostname:'example.test',origin:'https://example.test',pathname:'/'},
  history:{replaceState(){}},
  document:{getElementById:element},
  fetch:global.fetch,
  window:null
};
context.window=context;
context.KEYSUITE_TEST_MODE=true;
context.KEYSUITE_CONFIG={};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','auth.js'),'utf8'),context,{filename:'auth.js'});

const api=context.KeySuiteAuthTest;
assert.ok(api,'test hooks must be available only when test mode is enabled');

(async()=>{
  const loggedOut=await api.readInitialSession({auth:{getSession:async()=>({data:{session:null},error:null})}},50);
  assert.strictEqual(loggedOut.data.session,null,'logged-out state must settle without waiting');

  const valid={access_token:'valid',user:{email:'valid@example.test'}};
  const current=await api.readInitialSession({auth:{getSession:async()=>({data:{session:valid},error:null})}},50);
  assert.strictEqual(current.data.session,valid,'a valid persisted session must be preserved');

  let refreshed=false;
  const expired=await api.readInitialSession({auth:{getSession:async()=>{
    await new Promise(resolve=>setTimeout(resolve,5));refreshed=true;
    return {data:{session:{access_token:'refreshed',user:{email:'expired@example.test'}}},error:null};
  }}},50);
  assert.ok(refreshed&&expired.data.session.access_token==='refreshed','an expired session must be allowed to refresh');

  await assert.rejects(
    api.readInitialSession({auth:{getSession:()=>new Promise(()=>{})}},20),
    error=>error&&error.code==='KEYSUITE_AUTH_TIMEOUT',
    'a hung SDK initialization must end at the startup deadline'
  );

  let calls=0;
  const refreshClient={auth:{getSession:async()=>({data:{session:{access_token:`refresh-${++calls}`}},error:null})}};
  const first=await api.readInitialSession(refreshClient,50);
  const second=await api.readInitialSession(refreshClient,50);
  assert.strictEqual(first.data.session.access_token,'refresh-1');
  assert.strictEqual(second.data.session.access_token,'refresh-2','page refresh must perform a fresh session read');

  context.fetch=(_input,init)=>new Promise((resolve,reject)=>{
    init.signal.addEventListener('abort',()=>reject(init.signal.reason||new Error('aborted')),{once:true});
  });
  await assert.rejects(
    api.timeoutFetch('https://example.test/auth',{},20),
    error=>error&&error.code==='KEYSUITE_AUTH_TIMEOUT',
    'a stalled auth network request must be actively aborted'
  );

  console.log('V4.29.17 auth bootstrap scenarios: PASS (logged-out, valid, expired refresh, hung request, reload)');
})().catch(error=>{console.error(error);process.exitCode=1});
