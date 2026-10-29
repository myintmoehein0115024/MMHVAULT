/* N10-A7.50 — local-only closed Edge administrator health endpoint regression.
 * NO network: all auth, RPC, and env data are mocks.
 * Production endpoint must remain closed for login and bind.
 */
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const s=fs.readFileSync('review/N10-A7.50-EDGE-ADMIN-HEALTH-CLOSED.ts','utf8');
const prodOriginal=fs.readFileSync('review/N10-A7.40-PRODUCTION-EDGE-CANDIDATE-NEVER-DEPLOY.ts','utf8');
assert.match(s,/const CODE_GATE_OPEN = false;/);
assert.match(s,/const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(s,/const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';/);
assert.match(s,/mmh_is_admin/);
assert.match(s,/if\(data.action==='configuration_health'\)/);
assert.match(s,/return new Response\(JSON.stringify\(configured\(\)\)/);
assert.equal(s.split('CODE_GATE_OPEN = false;').length,2);
assert.ok(prodOriginal.includes("if(data.action==='preflight')"));
const uid='11111111-1111-4111-8111-111111111111';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co';
const PUB='MOCK_PUBLIC_KEY_0000000000000',SERVICE='MOCK_SERVICE_KEY_0000000000000';
const envBase={
 SUPABASE_URL:BASE,SUPABASE_ANON_KEY:PUB,SUPABASE_SERVICE_ROLE_KEY:SERVICE,
 N10A740_TURNSTILE_SECRET:'mock_fake_secret_not_real',
 N10A740_RATE_HMAC_KEY:'mock_fake_hmac_key_000000000000000000000000',
 N10A740_PRODUCTION_ENABLED:'true'
};
function backend({isAdmin=true,authUser=true,anonymous=false,authFailure=false,rpcFailure=false,envOverride={}}={}){
 const calls=[],environment={...envBase,...envOverride};
 let handler;
 const fakeFetch=async (url,opts={})=>{
   const u=new URL(url);calls.push({path:u.pathname,headers:opts.headers});
   assert.equal(u.origin,BASE,'Never leave mock project');
   if(u.pathname==='/auth/v1/user'){
     assert.equal(opts.headers?.Authorization,'Bearer MOCK_USER_JWT');
     assert.equal(opts.headers?.apikey,PUB);
     return authFailure?new Response('{}',{status:401}):
       new Response(JSON.stringify(authUser?{id:uid,is_anonymous:anonymous}:{}),{status:200});
   }
   if(u.pathname==='/rest/v1/rpc/mmh_is_admin'){
     assert.equal(opts.method,'POST');
     assert.equal(opts.headers?.Authorization,'Bearer MOCK_USER_JWT');
     assert.equal(opts.headers?.apikey,PUB);
     assert.notEqual(opts.headers?.apikey,SERVICE);
     assert.equal(opts.body,'{}');
     return new Response(JSON.stringify(isAdmin),{status:rpcFailure?503:200});
   }
   throw Error('Unexpected network call '+u.pathname);
 };
 vm.runInNewContext(s,{
  Deno:{env:{get:n=>environment[n]||''},serve:fn=>handler=fn},
  TextEncoder,TextDecoder,Request,Response,AbortSignal,URL,URLSearchParams,
  Uint8Array,Date,Set,Map,Number,String,Array,JSON,RegExp,crypto:webcrypto,
  fetch:fakeFetch
 },{timeout:2000,filename:'A7.50-MOCK-ONLY.ts'});
 assert.equal(typeof handler,'function');
 const send=async({action='configuration_health',token='MOCK_USER_JWT',origin='https://mmhvault.com',method='POST',bodyOverride}={})=>{
  const headers={'Origin':origin,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  const req=new Request(BASE+'/functions/v1/mmh-n10-a740-username',{
   method,headers,...(method==='POST'?{body:bodyOverride??JSON.stringify({action})}:{})
  });
  const r=await handler(req);
  return {status:r.status,result:await r.json()};
 };
 return {send,calls};
}
(async()=>{
 const good=backend();const ok=await good.send();
 assert.equal(ok.status,200);assert.equal(ok.result,true);assert.equal(typeof ok.result,'boolean');
 assert.deepEqual(good.calls.map(c=>c.path),['/auth/v1/user','/rest/v1/rpc/mmh_is_admin']);
 assert.equal((await good.send({action:'login',bodyOverride:JSON.stringify({action:'login',username:'tester',password:'mock',captcha_token:'abc'})})).status,503,'Login always locked');
 assert.equal((await good.send({action:'bind',bodyOverride:JSON.stringify({action:'bind',username:'tester',password:'mock',captcha_token:'abc'})})).status,503,'Binding always locked');
 const preflight=await good.send({action:'preflight'});
 assert.equal(preflight.status,200);assert.equal(preflight.result.enabled,false);
 const noJwt=backend();assert.equal((await noJwt.send({token:''})).status,403);assert.equal(noJwt.calls.length,0);
 const noAdmin=backend({isAdmin:false});assert.equal((await noAdmin.send()).status,403);
 const noUser=backend({authUser:false});assert.equal((await noUser.send()).status,403);
 assert.deepEqual(noUser.calls.map(c=>c.path),['/auth/v1/user']);
 const anon=backend({anonymous:true});assert.equal((await anon.send()).status,403);assert.equal(anon.calls.length,1);
 const invalid=backend({authFailure:true});assert.equal((await invalid.send()).status,403);
 const rpc=backend({rpcFailure:true});assert.equal((await rpc.send()).status,503);
 const noHmac=backend({envOverride:{N10A740_RATE_HMAC_KEY:''}});
 const hmac=await noHmac.send();assert.equal(hmac.status,200);assert.equal(hmac.result,false);
 const noCaptcha=backend({envOverride:{N10A740_TURNSTILE_SECRET:''}});
 const turn=await noCaptcha.send();assert.equal(turn.status,200);assert.equal(turn.result,false);
 const hostile=backend();assert.equal((await hostile.send({origin:'https://evil.example'})).status,403);assert.equal(hostile.calls.length,0);
 const badContent=backend();assert.equal((await badContent.send({bodyOverride:'malformed{'})).status,400);assert.equal(badContent.calls.length,0);
 for(const result of [ok,hmac,turn]){
   const asText=JSON.stringify(result.result);
   assert.doesNotMatch(asText,/mock_fake|MOCK_USER_JWT|secret|hmac|service/i);
 }
 console.log('PASS N10-A7.50: live-source offline admin Auth+membership, bool-only, locked login and 12 negative paths.');
})().catch(e=>{console.error(e);process.exitCode=1;});
