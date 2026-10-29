/* N10-A7.54 proposal: offline security regression for the EXACT proposed closed Edge.
 * The only enabled conditions are injected in the VM's memory; never in GitHub
 * source, Supabase settings, Cloudflare or the live production database.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const closed=fs.readFileSync('review/N10-A7.54-CANDIDATE-DUAL-UID-ALLOWLIST-NEVER-DEPLOY.ts','utf8');
assert.match(closed,/const CODE_GATE_OPEN = false;/);
assert.match(closed,/const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(closed,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(closed,/qaAllowlistReady\(\) &&/);
assert.match(closed,/!qaUidAllowed\(uid\)/);
assert.match(closed,/!qaUidAllowed\(user\.id\)/);
const A='11111111-1111-4111-8111-111111111111',
 B='22222222-2222-4222-8222-222222222222',
 C='33333333-3333-4333-8333-333333333333';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co',PUB='MOCK_ONLY_PUBLISHABLE_ABC1234567',SVC='MOCK_ONLY_SERVER_ROLE_ABC1234567';
const users=Object.fromEntries([A,B,C].map((id,i)=>[id,{id,email:'user'+i+'@example.test',email_confirmed_at:'2026-01-01',is_anonymous:false}]));
const tokenToUid=token=>{
 for(const uid of [A,B,C])if(token==='mock-user-'+uid||token==='mock-proof-'+uid)return uid;
 return null;
};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
let id=0;const fresh=prefix=>prefix+String(++id).padStart(25,'0');
function simulate({open=false,windowOpen=false,allowA=A,allowB=B,flag='true',preseedC=false}={}){
 let code=closed;
 if(open)code=code.replace('const CODE_GATE_OPEN = false;','const CODE_GATE_OPEN = true;');
 if(windowOpen){
  code=code.replace("const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';",
    'const WINDOW_START_UTC = '+JSON.stringify(new Date(Date.now()-20000).toISOString())+';');
  code=code.replace("const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';",
    'const WINDOW_END_UTC = '+JSON.stringify(new Date(Date.now()+90000).toISOString())+';');
 }
 const aliases=new Map(preseedC?[['charlie_test',C]]:[]),calls=[],counts=new Map();
 const env={
  SUPABASE_URL:BASE,SUPABASE_ANON_KEY:PUB,SUPABASE_SERVICE_ROLE_KEY:SVC,
  N10A740_TURNSTILE_SECRET:'MOCK_SITEVERIFY_KEY_NOT_REAL',
  N10A740_RATE_HMAC_KEY:'MOCK_HMAC_SECRET_KEY_LONG_ENOUGH_0000000000000',
  N10A740_PRODUCTION_ENABLED:flag,
  N10A754_TEST_UID_A:allowA,N10A754_TEST_UID_B:allowB
 };
 const fetch=async(url,opts={})=>{
  const u=new URL(url),h=opts.headers||{},method=opts.method||'GET';
  calls.push({path:u.pathname,method});
  if(u.host==='challenges.cloudflare.com'){
   assert.equal(u.pathname,'/turnstile/v0/siteverify');
   const form=new URLSearchParams(opts.body);
   assert.equal(form.get('secret'),env.N10A740_TURNSTILE_SECRET);
   const response=form.get('response')||'';
   return json({success:true,hostname:'mmhvault.com',
    action:response.startsWith('bind.')?'mmh_n10a740_bind':'mmh_n10a740_login'});
  }
  assert.equal(u.origin,BASE);
  if(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/auth/v1/admin/')){
    assert.equal(h.apikey,SVC);assert.equal(h.Authorization,'Bearer '+SVC);
  }
  if(u.pathname==='/rest/v1/rpc/mmh_n10a740_take_attempt'){
   const {p_key,p_limit}=JSON.parse(opts.body);
   assert.match(p_key,/^[0-9a-f]{64}$/);
   const n=(counts.get(p_key)||0)+1;counts.set(p_key,n);
   return json(n<=p_limit);
  }
  if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&method==='GET'){
   const name=(u.searchParams.get('username_key')||'').replace(/^eq\./,'');
   return json(aliases.has(name)?[{user_id:aliases.get(name)}]:[]);
  }
  if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&method==='POST'){
    const item=JSON.parse(opts.body);
    if(aliases.has(item.username_key)||[...aliases.values()].includes(item.user_id))
      return json({code:'23505'},409);
    aliases.set(item.username_key,item.user_id);
    return new Response(null,{status:201});
  }
  if(u.pathname==='/auth/v1/user'){
   assert.equal(h.apikey,PUB);
   const uid=tokenToUid((h.Authorization||'').replace(/^Bearer /,''));
   return uid?json(users[uid]):json({},401);
  }
  if(u.pathname.startsWith('/auth/v1/admin/users/')){
   const uid=u.pathname.split('/').pop();return users[uid]?json(users[uid]):json({},404);
  }
  if(u.pathname==='/auth/v1/token'){
   const {email,password}=JSON.parse(opts.body);
   const user=Object.values(users).find(x=>x.email===email);
   if(!user||password!=='correct-'+user.id)return json({},400);
   return json({access_token:'mock-proof-'+user.id,
    refresh_token:'mock-refresh-'+user.id,user:{id:user.id},expires_in:3600});
  }
  if(u.pathname==='/auth/v1/logout')return json({});
  throw Error('Unexpected mock path: '+u.pathname);
 };
 let handler=null;
 vm.runInNewContext(code,{
   Deno:{env:{get:key=>env[key]??''},serve:fn=>handler=fn},
   fetch,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,
   AbortSignal,crypto:webcrypto,Uint8Array,Date,Set,Map,Number,String,JSON,Array,RegExp
 },{timeout:2500,filename:'N10-A7.54-VIRTUAL-ONLY.ts'});
 assert.equal(typeof handler,'function');
 async function send(action,uid,name,password='correct-'+uid){
   const headers={'content-type':'application/json','Origin':'https://mmhvault.com',apikey:PUB};
   if(action==='bind')headers.Authorization='Bearer mock-user-'+uid;
   const req=new Request(BASE+'/functions/v1/mmh-n10-a740-username',{
    method:'POST',headers,
    body:JSON.stringify({action,username:name,password,captcha_token:fresh(action==='bind'?'bind.':'login.')})
   });
   const response=await handler(req);return {status:response.status,body:await response.json()};
 }
 return {send,aliases,calls};
}
(async()=>{
 const noOpen=simulate({open:false,windowOpen:true});
 assert.equal((await noOpen.send('bind',A,'alice_test')).status,503);assert.equal(noOpen.calls.length,0);
 const noWindow=simulate({open:true,windowOpen:false});
 assert.equal((await noWindow.send('bind',A,'alice_test')).status,503);assert.equal(noWindow.calls.length,0);
 for(const pair of [[A,A],[A,''],['bad-uid',B]]){
   const mock=simulate({open:true,windowOpen:true,allowA:pair[0],allowB:pair[1]});
   assert.equal((await mock.send('bind',A,'alice_test')).status,503);
   assert.equal(mock.calls.length,0,'Invalid or duplicate allowlist must block before any HTTP');
 }
 const envOff=simulate({open:true,windowOpen:true,flag:'false'});
 assert.equal((await envOff.send('bind',A,'alice_test')).status,503);
 const test=simulate({open:true,windowOpen:true,preseedC:true});
 const outsider=await test.send('bind',C,'charlie_new');
 assert.equal(outsider.status,401);
 assert.equal(test.aliases.has('charlie_new'),false);
 assert.equal(test.calls.some(c=>c.path==='/auth/v1/token'),false,'Unlisted UID must not trigger password exchange');
 const loginOutsider=await test.send('login',C,'charlie_test');
 assert.equal(loginOutsider.status,401);
 assert.equal(loginOutsider.body.access_token,undefined);
 assert.equal(test.calls.some(c=>c.path==='/auth/v1/admin/users/'+C),false,'Unlisted UID must never query account info');
 assert.equal((await test.send('bind',A,'alice_test')).status,200);
 assert.equal((await test.send('bind',B,'bob_test')).status,200);
 assert.equal(test.aliases.get('alice_test'),A);
 assert.equal(test.aliases.get('bob_test'),B);
 for(const [uid,username] of [[A,'alice_test'],[B,'bob_test']]){
   const response=await test.send('login',uid,username);
   assert.equal(response.status,200);
   assert.equal(response.body.access_token,'mock-proof-'+uid);
 }
 const wrong=await test.send('login',B,'alice_test');
 assert.equal(wrong.status,401);
 assert.equal(test.aliases.size,3);
 console.log('PASS N10-A7.54 proposal: two-UID env allowlist fail-closed, outside UID denied before password/user lookup, A/B bind/login isolated and all existing production gates remain off in checked-in source.');
})().catch(e=>{console.error(e);process.exitCode=1});
