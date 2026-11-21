// Offline-only synthetic binding review. No live accounts, secrets,
// production/staging functions, auth requests or network operations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {recheckBindSecurity,verifiedJwtMfaDecision} from './bind-guard.mjs';

const endpointPath='security/n10-username-bind-candidate/index.ts';
const endpoint=readFileSync(endpointPath,'utf8');
assert.match(endpoint,/const enabled=false; \/\/ REVIEW ONLY/);
assert.match(endpoint,/import \{ recheckBindSecurity, verifiedJwtMfaDecision \} from '\.\/bind-guard\.mjs'/);
assert.doesNotMatch(endpoint,/getAuthenticatorAssuranceLevel/,'old pinned SDK does not accept JWT');
assert.match(endpoint,/admin\.auth\.admin\.mfa\.listFactors/);
const lastGuard=endpoint.indexOf('const fresh=await recheckBindSecurity(');
const insert=endpoint.indexOf("await admin.from('mmh_n10a740_username_links').insert(");
assert.ok(lastGuard>0&&insert>lastGuard,
  'Second verified session and MFA check must precede privileged alias insert');
assert.match(endpoint,/verifyUser:\(\)=>currentUser\(request\)/);
assert.match(endpoint,/verifyAssurance:\(\)=>requireAssuredSession\(request,user\.id\)/);
assert.match(endpoint,/fresh==='verification_unavailable'\?503:fresh==='session_expired'\?401:403/);

const allow=new Set([
  '.github/workflows/n10-username-bind-fresh-auth-review.yml',
  'docs/N10_USERNAME_BIND_REVIEW_20261102.md',
  endpointPath,
  'security/n10-username-bind-candidate/bind-guard.mjs',
  'security/n10-username-bind-candidate/test-bind-guard.mjs'
]);
const diff=execFileSync('git',['diff','--name-status','--no-renames','origin/main...HEAD'],{encoding:'utf8'}).trim();
const changed=diff.split('\n').filter(Boolean).map(s=>s.split('\t'));
assert.equal(changed.length,allow.size,'exactly five approved review files');
for(const [status,path] of changed){
  assert.equal(status,'A','review must not modify/delete deployed production files');
  assert.ok(allow.delete(path),'unexpected path '+path);
}
assert.equal(allow.size,0,'all approved review files must exist');
const base=execFileSync('git',['merge-base','origin/main','HEAD'],{encoding:'utf8'}).trim();
const mainChanged=new Set(execFileSync('git',['diff','--name-only',base,'origin/main'],{encoding:'utf8'}).trim().split('\n').filter(Boolean));
assert.ok([...changed].every(([,path])=>!mainChanged.has(path)),
  'main drift conflicts with review-only paths');
console.log('PASS: isolated five-file source-only scope and release-hard-off contract.');

const user=Object.freeze({
 id:'synthetic-user-a',email:'synthetic-a@example.invalid',
 email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},
 identities:[{provider:'email'}],is_anonymous:false
});
const cases=[
 ['allowed',{},'allowed'],
 ['MFA suddenly required',{assurance:false},'additional_verification_required'],
 ['wrong owner',{user:{...user,id:'synthetic-user-b'}},'session_expired'],
 ['changed email',{user:{...user,email:'changed@example.invalid'}},'session_expired'],
 ['email became unconfirmed',{user:{...user,email_confirmed_at:null}},'session_expired'],
 ['token no longer valid',{user:null},'session_expired'],
 ['auth unavailable',{throwUser:true},'verification_unavailable'],
 ['assurance unavailable',{throwAssurance:true},'verification_unavailable'],
 ['MFA assurance is null',{assurance:null},'additional_verification_required'],
 ['Auth user became anonymous',{user:{...user,is_anonymous:true}},'session_expired']
];
for(const [label,opt,expected] of cases){
 const val=await recheckBindSecurity({
  expectedUser:user,
  verifyUser:async()=>{if(opt.throwUser)throw Error('synthetic unavailable');
    return Object.hasOwn(opt,'user')?opt.user:user},
  verifyAssurance:async()=>{if(opt.throwAssurance)throw Error('synthetic unavailable');
    return Object.hasOwn(opt,'assurance')?opt.assurance:true}
 });
 assert.equal(val,expected,label);
}
console.log('PASS: 10 pure final-auth binding outcomes.');
const authBase='https://vrypucmyrztxgiqhjspd.supabase.co';
// Invented UNSIGNED tokens, accepted only by this synthetic Auth mock.
const fakeJWT=(change={})=>'header.'+Buffer.from(JSON.stringify({
 sub:user.id,iss:authBase+'/auth/v1',aal:'aal1',
 exp:Math.floor(Date.now()/1000)+300,...change
})).toString('base64url')+'.signature';
const casesJWT=[
 [fakeJWT(),[],'allowed'],
 [fakeJWT(),[{status:'verified'}],'required'],
 [fakeJWT({aal:'aal2'}),[{status:'verified'}],'allowed'],
 [fakeJWT({aal:'aal2'}),[],'unavailable'],
 [fakeJWT({sub:'other-owner'}),[],'unavailable'],
 [fakeJWT({iss:'https://wrong.invalid/auth/v1'}),[],'unavailable'],
 [fakeJWT({exp:1}),[],'unavailable'],
 [fakeJWT({aal:null}),[],'unavailable'],
 ['bad-jwt',[],'unavailable'],
 [fakeJWT(),null,'unavailable']
];
for(const [token,factors,expected] of casesJWT)
 assert.equal(verifiedJwtMfaDecision(token,{...user,factors},authBase),expected);
console.log('PASS: 10 synthetic post-verified JWT/MFA decisions.');

async function executeScenario(scenario='disabled'){
 let source=endpoint.replace(/^import[^\n]*\n/gm,'');
 if(scenario!=='disabled')source=source.replace('const enabled=false;','const enabled=true; // VM ONLY, NEVER DEPLOY');
 let handler=null,inserts=0,getCalls=0,factorCalls=0;
 const service='S'.repeat(28),publ='P'.repeat(28),key='R'.repeat(40);
 const bearer=fakeJWT({aal:scenario==='aal2'?'aal2':'aal1'});
 const authUser=(id=user.id)=>({...user,id});
 const admin={
  auth:{
   getUser:async token=>{
    assert.equal(token,bearer,'the original bearer must be rechecked');
    getCalls++;
    if(scenario==='revoked'&&getCalls>2)return {data:{user:null},error:{message:'revoked'}};
    if(scenario==='owner-switch'&&getCalls>2)return {data:{user:authUser('other-owner')},error:null};
    if(scenario==='auth-unavailable'&&getCalls>2)return {data:{user:null},error:{message:'unavailable'}};
    return {data:{user:authUser()},error:null};
   },
   admin:{mfa:{listFactors:async({userId})=>{
    assert.equal(userId,user.id);
    factorCalls++;
    if(scenario==='aal-unavailable'&&factorCalls>1)return {data:null,error:{message:'unavailable'}};
    const verified=scenario==='aal2'||(scenario==='new-mfa'&&factorCalls>1);
    return {data:{factors:verified?[{status:'verified',id:'synthetic-factor'}]:[]},error:null};
   }}}
  },
  rpc:async()=>({data:scenario!=='rate-limited',error:null}),
  from:table=>{
   assert.equal(table,'mmh_n10a740_username_links');
   return {
    select:()=>({eq:()=>({limit:async()=>({
     data:scenario==='already-linked'?[{username_key:'prior'}]:[],error:null
    })})}),
    insert:async row=>{
     inserts++;assert.equal(row.user_id,user.id);
     return {error:scenario==='username-taken'?{code:'23505'}:null};
    }
   };
  }
 };
 const temp={auth:{
  signInWithPassword:async()=>scenario==='bad-password'
   ?{data:{},error:{message:'invalid credentials'}}
   :{data:{user:authUser(),session:{access_token:'synthetic-pwd-session'}},error:null},
  getUser:async token=>{
   assert.equal(token,'synthetic-pwd-session');
   return {data:{user:authUser()},error:null};
  },
  signOut:async()=>({error:null})
 }};
 const context={
  Deno:{env:{get:n=>({
   SUPABASE_SERVICE_ROLE_KEY:service,SUPABASE_ANON_KEY:publ,
   N10A740_TURNSTILE_SECRET:'T'.repeat(30),
   N10A740_RATE_HMAC_KEY:key
  }[n]||'')},serve:fn=>{handler=fn}},
  createClient:(_url,credential)=>{
   if(credential===service)return admin;
   if(credential===publ)return temp;
   throw Error('Unexpected credential in synthetic VM');
  },
  recheckBindSecurity,verifiedJwtMfaDecision,
  TextEncoder,TextDecoder,Uint8Array,Response,Request,Headers,URLSearchParams,AbortSignal,
  crypto:webcrypto,
  fetch:async()=>({ok:true,json:async()=>({
   success:scenario!=='captcha-denied',hostname:'mmhvault.com',action:'mmh_n10a781_bind'
  })}),
  console:{error:(...args)=>{throw Error('Mock exception: '+args.join(' '));}}
 };
 runInNewContext(stripTypeScriptTypes(source,{mode:'strip'}),context,{timeout:2000});
 assert.equal(typeof handler,'function');
 const request=new Request('https://example.invalid/',{
  method:'POST',headers:{Origin:'https://mmhvault.com','Content-Type':'application/json',
   Authorization:'Bearer '+bearer},
  body:JSON.stringify({action:'bind',username:'audituser',
   password:'synthetic-password',captcha_token:'synthetic-captcha-token-for-test'})
 });
 const response=await handler(request);
 return {status:response.status,code:(await response.json()).code,
  inserts,getCalls,factorCalls};
}
{
 const result=await executeScenario('disabled');
 assert.equal(result.status,503);
 assert.equal(result.code,'binding_unavailable');
 assert.equal(result.inserts,0);
 assert.equal(result.getCalls,0);
}
const liveTests=[
 // case, HTTP status, response code, attempted writes, Auth reads, factor reads
 ['allowed',200,'bind_success',1,4,2],
 ['aal2',200,'bind_success',1,4,2],
 ['new-mfa',403,'additional_verification_required',0,4,2],
 ['aal-unavailable',403,'additional_verification_required',0,4,2],
 ['owner-switch',401,'session_expired',0,3,1],
 ['revoked',401,'session_expired',0,3,1],
 ['auth-unavailable',401,'session_expired',0,3,1],
 ['already-linked',409,'already_linked',0,2,1],
 ['bad-password',401,'invalid_credentials',0,2,1],
 ['captcha-denied',403,'verification_required',0,2,1],
 ['rate-limited',429,'too_many_attempts',0,2,1],
 ['username-taken',409,'username_unavailable',1,4,2]
];
for(const [scenario,status,code,inserts,authReads,factorReads] of liveTests){
 const r=await executeScenario(scenario);
 assert.equal(r.status,status,scenario);
 assert.equal(r.code,code,scenario);
 assert.equal(r.inserts,inserts,scenario+' insert attempts');
 assert.equal(r.getCalls,authReads,scenario+' verified-bearer Auth reads');
 assert.equal(r.factorCalls,factorReads,scenario+' server-factor reads');
}
console.log('PASS: hard-OFF handler + 12 exact-bearer, factor-backed synthetic binding cases.');
