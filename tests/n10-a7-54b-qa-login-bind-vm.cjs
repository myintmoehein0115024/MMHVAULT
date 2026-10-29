/* N10-A7.54-B: complete QA UI module with fake browser/Supabase/Turnstile.
 * No real network, accounts, secrets or Supabase writes.
 * Locks are inverted ONLY within Node VM runtime for the mock scenarios.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/mmhvault-n10-a7-54b-liveflow.js','utf8');
const html=fs.readFileSync('n10-a7-53-qa.html','utf8');
assert.match(source,/const QA_CLOSED = true;/);
assert.match(source,/const LIVE_REQUESTS_ALLOWED = false;/);
assert.match(html,/connect-src 'none'/);
assert.match(html,/noindex,nofollow/);
assert.match(html,/mmhvault-n10-a7-54b-liveflow\.js/);
assert.equal((html.match(/disabled readonly/g)||[]).length,4);
assert.equal((html.match(/<button disabled id="qa54b/g)||[]).length,4);
assert.doesNotMatch(source,/setSession|persistSession:true.*refresh_token|localStorage|sessionStorage|service_role|sb_secret_|user_metadata/);
new vm.Script(source);
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const users={[A]:{id:A,email_confirmed_at:'2026-10-01',is_anonymous:false},[B]:{id:B,email_confirmed_at:'2026-10-01',is_anonymous:false}};
const aliases=new Map(),requests=[],revoke=[],widgetActions=[];
function makeNode(value=''){
 const handlers={};
 return {value,disabled:true,readOnly:true,hidden:true,textContent:'',handlers,
  addEventListener:(event,fn)=>{handlers[event]=fn},
  fire:async(event,extra={})=>handlers[event]?.({target:{value, ...extra}})};
}
function makeBrowser({live=false,uid=A,host='mmhvault.com',sdk=true,sessionVerified=true,forceWrongProof=false}={}){
 const elements=new Map(),captcha=new Map();
 for(const k of ['A','B']){
  for(const id of ['qa54bName','qa54bPassword','qa54bBind','qa54bLogin','qa54bCaptcha','qa54bMode','qa54bStatus'])
   elements.set(id+k,makeNode());
  elements.get('qa54bMode'+k).value='bind';
 }
 const get=id=>elements.get(id);
 const rendered=[];
 const turnstile={
  render:(slot,opts)=>{const id=rendered.length;rendered.push({id,slot,opts,used:false});widgetActions.push(opts.action);return id},
  remove:id=>{rendered[id].used=true},
  reset:id=>{rendered[id].used=true}
 };
 const fakeClient=opts=>{
  const persistent=opts.auth?.persistSession===true;
  return {auth:{
   getSession:async()=>persistent?{data:{session:{user:{id:uid},access_token:'mock-current-'+uid}}}:{data:{session:null}},
   getUser:async access=>{
    if(access){const id=access.replace('mock-proof-','');return {data:{user:users[forceWrongProof?(id===A?B:A):id]||null}};}
    return {data:{user:sessionVerified?users[uid]:null},error:sessionVerified?null:{message:'bad'}};
   },
   setSession:()=>{throw Error('setSession is forbidden in QA!')}
  }};
 };
 const fetch=async(url,opts={})=>{
  requests.push({url,opts});
  if(url.endsWith('/auth/v1/logout?scope=local')){
   revoke.push(opts.headers.Authorization);
   return {status:204};
  }
  assert.equal(url,'https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10-a740-username');
  assert.equal(opts.credentials,'omit');assert.equal(opts.cache,'no-store');
  const d=JSON.parse(opts.body),name=d.username;
  assert.ok(d.captcha_token.startsWith(d.action+'.'));
  if(d.action==='bind'){
   assert.equal(opts.headers.Authorization,'Bearer mock-current-'+uid);
   if(d.password!=='password-'+uid)return {status:401,json:async()=>({code:'invalid_credentials'})};
   if(aliases.has(name)||[...aliases.values()].includes(uid))return {status:409,json:async()=>({code:'username_unavailable'})};
   aliases.set(name,uid);
   return {status:200,json:async()=>({code:'bind_success'})};
  }
  assert.equal(d.action,'login');
  const owner=aliases.get(name);
  if(!owner||d.password!=='password-'+owner)return {status:401,json:async()=>({code:'invalid_credentials'})};
  return {status:200,json:async()=>({code:'login_success',
   access_token:'mock-proof-'+owner,refresh_token:'mock-refresh-'+owner})};
 };
 const document={readyState:'complete',documentElement:{lang:'zh-CN'},getElementById:get,
  addEventListener:()=>{throw Error('Unexpected DOM ready listener')}};
 const listeners={};
 const window={supabase:sdk?{createClient:(_base,_key,opts)=>fakeClient(opts)}:undefined,
  turnstile,addEventListener:(event,fn)=>{listeners[event]=fn}};
 let code=source;
 if(live){code=code.replace('const QA_CLOSED = true;','const QA_CLOSED = false;').replace('const LIVE_REQUESTS_ALLOWED = false;','const LIVE_REQUESTS_ALLOWED = true;');}
 vm.runInNewContext(code,{document,window,location:{protocol:'https:',hostname:host},
  fetch,AbortController,JSON,URL,URLSearchParams,setTimeout,clearTimeout,Error,Array,Object,Number,String,RegExp},{timeout:2000,filename:'N10-A7.54B-FAKE-BROWSER-ONLY.js'});
 const challenge=k=>{
  const slot=get('qa54bCaptcha'+k);
  const current=rendered.filter(x=>x.slot===slot&&!x.used).at(-1);
  assert.ok(current,'captcha should be mounted');
  const operation=current.opts.action.endsWith('login')?'login':'bind';
  current.opts.callback(operation+'.fake-only-token-00000000000');
  return operation;
 };
 const act=async (k,action,name,password)=>{
  get('qa54bName'+k).value=name;
  get('qa54bPassword'+k).value=password;
  assert.equal(challenge(k),action);
  const fn=get('qa54b'+(action==='bind'?'Bind':'Login')+k).handlers.click;
  assert.equal(typeof fn,'function');
  await fn();
  // click listener starts async perform as a void result; flush microtasks.
  for(let i=0;i<50;i++)await Promise.resolve();
  assert.equal(get('qa54bPassword'+k).value,'','password must be cleared');
  return get('qa54bStatus'+k).textContent;
 };
 const mode=async(k,value)=>{
  get('qa54bMode'+k).value=value;
  await get('qa54bMode'+k).handlers.change({target:{value}});
 };
 return {get,act,mode,challenge,rendered,listeners};
}
(async()=>{
 const count=requests.length;
 const locked=makeBrowser();
 for(const k of ['A','B']){
   assert.equal(locked.get('qa54bBind'+k).disabled,true);
   assert.equal(locked.get('qa54bLogin'+k).disabled,true);
   assert.equal(locked.get('qa54bName'+k).disabled,true);
   assert.equal(locked.get('qa54bPassword'+k).disabled,true);
 }
 assert.equal(widgetActions.length,0);
 assert.equal(requests.length,count,'hard-closed candidate must not call network');
 const missing=makeBrowser({live:true,sdk:false});
 assert.equal(missing.get('qa54bBindA').disabled,true);
 const badDomain=makeBrowser({live:true,host:'evil.example'});
 assert.equal(badDomain.get('qa54bBindA').disabled,true);
 const a=makeBrowser({live:true,uid:A});
 assert.equal(await a.act('A','bind','alice_qa','password-'+A),'用户名已绑定：UID 未变化（QA）');
 assert.equal(aliases.get('alice_qa'),A);
 await a.mode('A','login');
 assert.equal(await a.act('A','login','alice_qa','password-'+A),'登录验证通过：UID 匹配，未接管当前会话');
 assert.equal(a.rendered[0].opts.action,'mmh_n10a740_bind');
 assert.ok(a.rendered.some(x=>x.opts.action==='mmh_n10a740_login'));
 assert.ok(revoke.some(x=>x==='Bearer mock-proof-'+A));
 const b=makeBrowser({live:true,uid:B});
 assert.equal(await b.act('B','bind','bob_qa','password-'+B),'用户名已绑定：UID 未变化（QA）');
 await b.mode('B','login');
 assert.equal(await b.act('B','login','bob_qa','password-'+B),'登录验证通过：UID 匹配，未接管当前会话');
 const mismatch=makeBrowser({live:true,uid:A,forceWrongProof:true});
 // a separate mock browser cannot login until it has bound in its own page/session.
 assert.equal(mismatch.get('qa54bLoginA').disabled,true);
 const invalid=makeBrowser({live:true,uid:B,sessionVerified:false});
 assert.equal((await invalid.act('A','bind','bad_qa','password-'+B)).includes('测试未完成'),true);
 assert.equal(aliases.has('bad_qa'),false);
 assert.equal(aliases.get('alice_qa'),A);assert.equal(aliases.get('bob_qa'),B);
 assert.ok(requests.every(x=>x.url.startsWith('https://vrypucmyrztxgiqhjspd.supabase.co')));
 assert.ok(widgetActions.includes('mmh_n10a740_login')&&widgetActions.includes('mmh_n10a740_bind'));
 console.log('PASS N10-A7.54-B: locked zero network; mock A/B real-path bind, login, UID check, distinct CAPTCHA, no session takeover, token revoke, missing SDK, bad host and invalid session.');
})().catch(e=>{console.error(e);process.exitCode=1;});
