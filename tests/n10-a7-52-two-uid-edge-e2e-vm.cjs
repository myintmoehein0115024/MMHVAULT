/* N10-A7.52 — real v4 Edge source, two-UID offline end-to-end mock.
 * No live networks, identities, passwords, Secret values, or DB modifications.
 * Gate is opened ONLY by transforming a string in this test's VM memory;
 * the checked-in rollback snapshot remains exact, closed production v4.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const original=fs.readFileSync('review/N10-A7.52-PRODUCTION-EDGE-V4-CLOSED-ROLLBACK.ts','utf8');
assert.match(original,/const CODE_GATE_OPEN = false;/);
assert.match(original,/const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(original,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(original,/configuration_health/);
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co',PUB='MOCK_PUBLISHABLE_ONLY_1234567890',SVC='MOCK_SERVER_ROLE_ONLY_1234567890';
const users={
 [A]:{id:A,email:'a@example.test',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false},
 [B]:{id:B,email:'b@example.test',email_confirmed_at:'2026-10-01T00:00:00Z',is_anonymous:false}
};
const uidForAccess=x=>{
 for(const uid of [A,B])if(x==='mock-user-'+uid||x==='mock-proof-'+uid)return uid;
 return null;
};
const result=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
let counter=0;
const fresh=prefix=>prefix+String(++counter).padStart(23,'0');
function instance({open=true,windowOpen=true,enabled=true,swapProof=false}={}){
 const aliases=new Map(),buckets=new Map(),events={authAttempts:0,claimCount:0,revokeCount:0,privilegedRequests:0,externalRequests:0};
 const env={SUPABASE_URL:BASE,SUPABASE_ANON_KEY:PUB,SUPABASE_SERVICE_ROLE_KEY:SVC,
   N10A740_TURNSTILE_SECRET:'MOCK_ONLY_NO_REAL_CLOUDFLARE_SECRET',
   N10A740_RATE_HMAC_KEY:'MOCK_FAKE_SEPARATE_HMAC_SALT_01234567890123456789',
   N10A740_PRODUCTION_ENABLED:enabled?'true':'false'};
 const fetch=async(url,opts={})=>{
   events.externalRequests++;
   const u=new URL(url),h=opts.headers||{},method=opts.method||'GET';
   if(u.host==='challenges.cloudflare.com'){
     assert.equal(u.pathname,'/turnstile/v0/siteverify');
     const x=new URLSearchParams(opts.body);
     assert.equal(x.get('secret'),env.N10A740_TURNSTILE_SECRET);
     const token=x.get('response')||'';
     return result({success:!token.startsWith('fail.'),
       hostname:token.startsWith('wronghost.')?'evil.example':'mmhvault.com',
       action:token.startsWith('bind.')?'mmh_n10a740_bind':'mmh_n10a740_login'});
   }
   assert.equal(u.origin,BASE,'All non-Captcha calls remain in the test production-like origin');
   if(u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/auth/v1/admin/')){
     events.privilegedRequests++;
     assert.equal(h.apikey,SVC);assert.equal(h.Authorization,'Bearer '+SVC);
   }
   if(u.pathname==='/rest/v1/rpc/mmh_n10a740_take_attempt'){
     const x=JSON.parse(opts.body);assert.match(x.p_key,/^[0-9a-f]{64}$/);
     assert.equal(typeof x.p_limit,'number');
     const count=(buckets.get(x.p_key)||0)+1;buckets.set(x.p_key,count);
     return result(count<=x.p_limit);
   }
   if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&method==='GET'){
     const username=(u.searchParams.get('username_key')||'').replace(/^eq\./,'');
     return result(aliases.has(username)?[{user_id:aliases.get(username)}]:[]);
   }
   if(u.pathname==='/rest/v1/mmh_n10a740_username_links'&&method==='POST'){
     const x=JSON.parse(opts.body);
     if(aliases.has(x.username_key)||[...aliases.values()].includes(x.user_id))return result({code:'23505'},409);
     assert.ok([A,B].includes(x.user_id));
     aliases.set(x.username_key,x.user_id);events.claimCount++;
     return new Response(null,{status:201});
   }
   if(u.pathname.startsWith('/auth/v1/admin/users/')){
     const uid=u.pathname.split('/').pop();return users[uid]?result(users[uid]):result({},404);
   }
   if(u.pathname==='/auth/v1/user'){
     assert.equal(h.apikey,PUB);
     const uid=uidForAccess((h.Authorization||'').replace(/^Bearer /,''));
     return uid?result(users[uid]):result({},401);
   }
   if(u.pathname==='/auth/v1/token'){
     events.authAttempts++;
     assert.equal(h.apikey,PUB);
     const x=JSON.parse(opts.body);
     const uid=x.email===users[A].email?A:x.email===users[B].email?B:null;
     if(!uid||x.password!=='correct-'+uid)return result({error:'invalid_credentials'},400);
     const grantedUid=swapProof?(uid===A?B:A):uid;
     return result({access_token:'mock-proof-'+grantedUid,
       refresh_token:'mock-refresh-'+grantedUid,expires_in:3600,user:{id:grantedUid}});
   }
   if(u.pathname==='/auth/v1/logout'){
     assert.equal(h.apikey,PUB);events.revokeCount++;return result({});
   }
   throw Error('Unknown mock route '+u.pathname);
 };
 let src=original;
 if(open)src=src.replace('const CODE_GATE_OPEN = false;','const CODE_GATE_OPEN = true;');
 if(windowOpen){
   src=src.replace("const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';",
     'const WINDOW_START_UTC = '+JSON.stringify(new Date(Date.now()-30000).toISOString())+';');
   src=src.replace("const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';",
     'const WINDOW_END_UTC = '+JSON.stringify(new Date(Date.now()+90000).toISOString())+';');
 }
 let handler;
 vm.runInNewContext(src,{
  Deno:{env:{get:n=>env[n]||''},serve:fn=>handler=fn},
  fetch,Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,AbortSignal,
  crypto:webcrypto,Uint8Array,Date,Set,Map,Error,Number,String,Array,JSON,RegExp
 },{timeout:2000,filename:'N10A752-MEMORY-ONLY.ts'});
 assert.equal(typeof handler,'function');
 const send=async({action='login',username='alice_test',uid=null,password=null,
   token=null,origin='https://mmhvault.com',authorization=null}={})=>{
   const isBind=action==='bind',selectedUid=uid||A;
   const h={Origin:origin,'Content-Type':'application/json',apikey:PUB};
   if(isBind&&authorization!=='absent')h.Authorization='Bearer '+(authorization||'mock-user-'+selectedUid);
   const req=new Request(BASE+'/functions/v1/mmh-n10-a740-username',{
    method:'POST',headers:h,body:JSON.stringify({
     action,username,
     password:password??('correct-'+selectedUid),
     captcha_token:token||fresh(isBind?'bind.':'login.')
    })
   });
   const response=await handler(req);
   return {status:response.status,body:await response.json()};
 };
 return {send,aliases,buckets,events};
}
(async()=>{
  // Entire production snapshot must stay closed even with valid mock environment values.
  {const t=instance({open:false});const a=await t.send();
   assert.equal(a.status,503);assert.equal(t.events.externalRequests,0);}
  {const t=instance({windowOpen:false});const a=await t.send();
   assert.equal(a.status,503);assert.equal(t.events.externalRequests,0);}
  {const t=instance({enabled:false});const a=await t.send();
   assert.equal(a.status,503);assert.equal(t.events.externalRequests,0);}

  const t=instance();
  // Existing, independently confirmed email account A binds to alias A.
  const aBind=await t.send({action:'bind',uid:A,username:'alice_test'});
  assert.equal(aBind.status,200);assert.equal(aBind.body.code,'bind_success');
  assert.equal(t.aliases.get('alice_test'),A);
  // B independently binds alias B. Both UIDs remain unchanged.
  const bBind=await t.send({action:'bind',uid:B,username:'bob_test'});
  assert.equal(bBind.status,200);assert.equal(bBind.body.code,'bind_success');
  assert.equal(t.aliases.get('bob_test'),B);assert.equal(t.events.claimCount,2);
  assert.equal(t.events.revokeCount,2,'Temporary password proof revoked after binding');

  // Attempt to steal A alias from authenticated B is rejected without changing either mapping.
  const collision=await t.send({action:'bind',uid:B,username:'alice_test'});
  assert.equal(collision.status,409);assert.deepEqual([...t.aliases.entries()].sort(),[['alice_test',A],['bob_test',B]]);
  const duplicateUid=await t.send({action:'bind',uid:A,username:'new_alice'});
  assert.equal(duplicateUid.status,409);assert.equal(t.aliases.size,2);
  const aLogin=await t.send({uid:A,username:'alice_test'});
  const bLogin=await t.send({uid:B,username:'bob_test'});
  for(const [r,u] of [[aLogin,A],[bLogin,B]]){
   assert.equal(r.status,200);assert.equal(r.body.code,'login_success');
   assert.equal(r.body.access_token,'mock-proof-'+u);
   assert.equal(r.body.refresh_token,'mock-refresh-'+u);
  }
  const wrongPerson=await t.send({uid:B,username:'alice_test'});
  assert.equal(wrongPerson.status,401,'B password cannot login to A username');
  assert.equal(wrongPerson.body.access_token,undefined);
  const badPassword=await t.send({uid:A,username:'alice_test',password:'bad-password'});
  assert.equal(badPassword.status,401);
  const unknown=await t.send({uid:A,username:'unknown_alias'});
  assert.equal(unknown.status,401);
  assert.equal(t.aliases.size,2);
  // Token replay is rejected before password exchange.
  const replayToken=fresh('login.');
  const first=await t.send({uid:A,username:'alice_test',token:replayToken});
  assert.equal(first.status,200);
  const before=t.events.authAttempts;
  const replay=await t.send({uid:A,username:'alice_test',token:replayToken});
  assert.equal(replay.status,403);assert.equal(t.events.authAttempts,before);
  // Wrong Origin is rejected before any downstream request.
  const externalBefore=t.events.externalRequests;
  assert.equal((await t.send({origin:'https://evil.example'})).status,403);
  assert.equal(t.events.externalRequests,externalBefore);
  // Wrong provider-issued UID must be rejected even with a correct password.
  const mismatch=instance({swapProof:true});
  const mBind=await mismatch.send({action:'bind',uid:A,username:'alice_test'});
  assert.equal(mBind.status,401);assert.equal(mismatch.aliases.size,0);
  assert.equal(mismatch.events.revokeCount,1);
  // Isolation of per-username limits: 9 wrong A attempts must not block valid B login.
  const rate=instance();
  assert.equal((await rate.send({action:'bind',uid:A,username:'alice_test'})).status,200);
  assert.equal((await rate.send({action:'bind',uid:B,username:'bob_test'})).status,200);
  for(let i=0;i<8;i++)assert.equal((await rate.send({uid:A,username:'alice_test',password:'wrong'})).status,401);
  assert.equal((await rate.send({uid:A,username:'alice_test'})).status,429);
  assert.equal((await rate.send({uid:B,username:'bob_test'})).status,200);
  assert.deepEqual([...t.aliases.entries()].sort(),[['alice_test',A],['bob_test',B]]);
  console.log('PASS N10-A7.52: closed production snapshot, distinct A/B UID binding, uniqueness, real-handler mock logins, password isolation, token replay, wrong origin, UID proof mismatch and per-name throttle.');
})().catch(e=>{console.error(e);process.exitCode=1;});
