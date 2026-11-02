// Offline-only synthetic binding review. No live accounts, secrets,
// production/staging functions, auth requests or network operations.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {recheckBindSecurity} from './bind-guard.mjs';

const endpointPath='security/n10-username-bind-candidate/index.ts';
const endpoint=readFileSync(endpointPath,'utf8');
assert.match(endpoint,/const enabled=false; \/\/ REVIEW ONLY/);
assert.match(endpoint,/import \{ recheckBindSecurity \} from '\.\/bind-guard\.mjs'/);
const lastGuard=endpoint.indexOf('const fresh=await recheckBindSecurity(');
const insert=endpoint.indexOf("await admin.from('mmh_n10a740_username_links').insert(");
assert.ok(lastGuard>0&&insert>lastGuard,
  'Second verified session and MFA check must precede privileged alias insert');
assert.match(endpoint,/verifyUser:\(\)=>currentUser\(request\)/);
assert.match(endpoint,/verifyAssurance:\(\)=>requireAssuredSession\(request\)/);
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
 ['assurance unavailable',{throwAssurance:true},'verification_unavailable']
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
console.log('PASS: 8 pure final-auth binding outcomes.');

async function executeScenario(scenario='disabled'){
  // The deployed code never runs here. Load the disabled candidate into a
  // synthetic VM; only VM copies for allowed scenarios flip the release gate.
  let source=endpoint.replace(/^import[^\n]*\n/gm,'');
  if(scenario!=='disabled')
    source=source.replace('const enabled=false;','const enabled=true; // VM ONLY; NEVER DEPLOY');
  let handler=null,inserts=0,getCalls=0,aalCalls=0;
  const service='S'.repeat(28),publ='P'.repeat(28),key='R'.repeat(40);
  let publicClientCount=0;
  const authUser=(id=user.id)=>({...user,id});
  const admin={
   auth:{getUser:async()=>{getCalls++;
      if(scenario==='revoked'&&getCalls>1)return {data:{user:null},error:{message:'revoked'}};
      if(scenario==='owner-switch'&&getCalls>1)return {data:{user:authUser('synthetic-user-b')},error:null};
      return {data:{user:authUser()},error:null}}},
   rpc:async()=>({data:true,error:null}),
   from:table=>{
    assert.equal(table,'mmh_n10a740_username_links');
    return {
     select:()=>({eq:()=>({limit:async()=>({data:[],error:null})})}),
     insert:async row=>{inserts++;assert.equal(row.user_id,user.id);return {error:null}}
    };
   }
  };
  const anon={auth:{mfa:{
   getAuthenticatorAssuranceLevel:async(token)=>{
    assert.equal(token,'synthetic-bearer-token');
    aalCalls++;
    return {data:aalCalls>1&&scenario==='new-mfa'
      ?{currentLevel:'aal1',nextLevel:'aal2'}
      :{currentLevel:'aal1',nextLevel:'aal1'},error:null};
   }
  }}};
  const temp={auth:{
   signInWithPassword:async()=>({data:{user:authUser(),session:{access_token:'synthetic-pwd-session'}},error:null}),
   getUser:async()=>({data:{user:authUser()},error:null}),
   signOut:async()=>({error:null})
  }};
  const createClient=(_url,credential)=>{
   if(credential===service)return admin;
   if(credential===publ)return publicClientCount++===0?anon:temp;
   throw Error('Unexpected client');
  };
  const context={
   Deno:{env:{get:n=>({
    SUPABASE_SERVICE_ROLE_KEY:service,SUPABASE_ANON_KEY:publ,
    N10A740_TURNSTILE_SECRET:'T'.repeat(30),
    N10A740_RATE_HMAC_KEY:key
   }[n]||'')},serve:fn=>{handler=fn}},
   createClient,recheckBindSecurity,
   TextEncoder,TextDecoder,Uint8Array,Response,Request,Headers,AbortSignal,
   crypto:webcrypto,
   fetch:async()=>({ok:true,json:async()=>({
    success:true,hostname:'mmhvault.com',action:'mmh_n10a781_bind'
   })}),
   console:{error:(...args)=>{throw Error('Synthetic server caught: '+args.join(' '));}}
  };
  runInNewContext(source,context,{timeout:2000});
  assert.equal(typeof handler,'function','handler initialized');
  const request=new Request('https://example.invalid/',{
   method:'POST',headers:{Origin:'https://mmhvault.com',
     'Content-Type':'application/json',
     Authorization:'Bearer synthetic-bearer-token'},
   body:JSON.stringify({action:'bind',username:'audituser',
     password:'synthetic-password',captcha_token:'synthetic-captcha-token-for-test'})
  });
  const response=await handler(request);
  return {status:response.status,code:(await response.json()).code,
    inserts,getCalls,aalCalls};
}
{
 const result=await executeScenario('disabled');
 assert.equal(result.status,503);
 assert.equal(result.code,'binding_unavailable');
 assert.equal(result.inserts,0);
 assert.equal(result.getCalls,0);
}
const liveTests=[
 ['allowed',200,'bind_success',1],
 ['new-mfa',403,'additional_verification_required',0],
 ['owner-switch',401,'session_expired',0],
 ['revoked',401,'session_expired',0]
];
for(const [scenario,status,code,inserts] of liveTests){
 const result=await executeScenario(scenario);
 if(result.status!==status)console.error('Synthetic scenario diagnostics:',scenario,result);
 assert.equal(result.status,status,scenario);
 assert.equal(result.code,code,scenario);
 assert.equal(result.inserts,inserts,scenario+' privileged inserts');
 assert.equal(result.getCalls,2,scenario+' independent Auth getUser checks');
 if(scenario!=='owner-switch'&&scenario!=='revoked')
  assert.equal(result.aalCalls,2,scenario+' independent JWT AAL checks');
}
console.log('PASS: default OFF VM + four synthetic full handler scenarios (no network).');
