/* N10-A7.54: production CLOSED deployment preview, offline authorized boolean health.
 * Uses entirely dummy UUIDs and mocked Auth API; zero real HTTP/DB/Secrets.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('review/N10-A7.54-CLOSED-UID-HEALTH-PREDEPLOY.ts','utf8');
assert.match(code,/const CODE_GATE_OPEN = false;/);
assert.match(code,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(code,/await allowedPairHealth\(\)/);
assert.match(code,/!qaUidAllowed\(uid\)/);
assert.match(code,/!qaUidAllowed\(user\.id\)/);
assert.doesNotMatch(code,/sb_secret_|(?:localStorage|sessionStorage)\s*\./);
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co',PUB='MOCK_ONLY_PUBLISHABLE_ABC1234567',SVC='MOCK_ONLY_SERVICE_ROLE_ABC123456789';
const known={[A]:{id:A,email:'a@example.invalid',email_confirmed_at:'2026-01-01',is_anonymous:false},
[B]:{id:B,email:'b@example.invalid',email_confirmed_at:'2026-01-01',is_anonymous:false},
[C]:{id:C,email:'c@example.invalid',email_confirmed_at:null,is_anonymous:false}};
function scenario({a=A,b=B,admin=true,missingSecret=false}={}){
 const env={SUPABASE_URL:BASE,SUPABASE_ANON_KEY:PUB,SUPABASE_SERVICE_ROLE_KEY:SVC,
 N10A740_TURNSTILE_SECRET:missingSecret?'':'MOCK_ONLY_SITEVERIFY_KEY_12345',
 N10A740_RATE_HMAC_KEY:'MOCK_HMAC_0123456789012345678901234567890',
 N10A740_PRODUCTION_ENABLED:'false',N10A754_TEST_UID_A:a,N10A754_TEST_UID_B:b};
 let handler;const network=[];
 const resp=(data,status=200)=>new Response(JSON.stringify(data),{status});
 const fetch=async(url,opts={})=>{
  const u=new URL(url);network.push(u.pathname);
  if(u.pathname==='/auth/v1/user') {
   const auth=opts.headers?.Authorization;return auth==='Bearer admin-mock'?resp({id:A,email:known[A].email,email_confirmed_at:'2026-01-01'}):resp(null,401);
  }
  if(u.pathname==='/rest/v1/rpc/mmh_is_admin')return resp(admin);
  if(u.pathname.startsWith('/auth/v1/admin/users/')){
   const uid=u.pathname.split('/').pop();
   return known[uid]?resp(known[uid]):resp(null,404);
  }
  throw Error('unexpected network target: '+u.pathname);
 };
 vm.runInNewContext(code,{
  Deno:{env:{get:key=>env[key]||''},serve:fn=>{handler=fn}},fetch,
  URL,URLSearchParams,Request,Response,TextEncoder,TextDecoder,AbortSignal,
  crypto:require('node:crypto').webcrypto,Uint8Array,Date,Set,Map,JSON,Number,String,Array,RegExp
 },{timeout:3000});
 const send=async(action,auth='Bearer admin-mock')=>{
  const headers={'Origin':'https://mmhvault.com','Content-Type':'application/json'};
  if(auth)headers.Authorization=auth;
  const reply=await handler(new Request(BASE+'/functions/v1/mmh-n10-a740-username',{
   method:'POST',headers,body:JSON.stringify({action})
  }));
  return {status:reply.status,body:await reply.json()};
 };
 return {send,network};
}
(async()=>{
 const yes=scenario(),result=await yes.send('configuration_health');
 assert.equal(result.status,200);assert.equal(result.body,true);
 assert.deepEqual(yes.network,['/auth/v1/user','/rest/v1/rpc/mmh_is_admin',
 '/auth/v1/admin/users/'+A,'/auth/v1/admin/users/'+B]);
 const none=scenario({a:'',b:B}),dup=scenario({a:A,b:A}),bad=scenario({a:A,b:C});
 for(const item of [none,dup,bad]){
  const r=await item.send('configuration_health');
  assert.equal(r.status,200);assert.equal(r.body,false);
 }
 const unadmin=scenario({admin:false});assert.equal((await unadmin.send('configuration_health')).status,403);
 assert.equal((await scenario().send('configuration_health','')).status,403);
 assert.equal((await scenario().send('configuration_health','Bearer outsider')).status,403);
 assert.equal((await scenario({missingSecret:true}).send('configuration_health')).body,false);
 const off=scenario();const closed=await off.send('bind');
 assert.equal(closed.status,503);assert.equal(closed.body.code,'n10a740_disabled');
 assert.deepEqual(off.network,[],'CLOSED bind must not contact Auth or DB');
 console.log('PASS N10-A7.54 CLOSED Edge: admin-only boolean health validates two distinct real verified UIDs; invalid/duplicate/nonadmin blocked; bind remains 503 with zero backend calls.');
})().catch(e=>{console.error(e);process.exitCode=1});
