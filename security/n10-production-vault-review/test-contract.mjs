// REVIEW ONLY. Pure local source contracts; no network/credentials/data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {evaluateMfaAssurance} from './mfa-assurance.mjs';
import {sessionAalFromVerifiedFactors} from './session-aal.mjs';
const src=readFileSync('security/n10-production-vault-review/index.ts','utf8');

test('both independent review gates are hard OFF, exact production host',()=>{
 assert.match(src,/const RECOVERY_RELEASE_ENABLED=false;/);
 assert.match(src,/const PRIVATE_VAULT_SCHEMA_APPROVED=false;/);
 assert.match(src,/if\(!RECOVERY_RELEASE_ENABLED\|\|!PRIVATE_VAULT_SCHEMA_APPROVED\)/);
 assert.match(src,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
 assert.match(src,/const ORIGIN='https:\/\/mmhvault\.com';/);
 assert.doesNotMatch(src,/ldivswlhtgmznzwhzsoi|n10qa_[ab]_20261103|QA_NAMES|ALLOWLIST_OK|staging\.pages\.dev/);
});
test('only status and reveal, no code path to replace or generate a key',()=>{
 assert.match(src,/body\.action==='status'\?\['action'\]/);
 assert.match(src,/body\.action==='reveal'\?\['action','password'\]/);
 assert.match(src,/unexpected_request_field/);
 assert.doesNotMatch(src,/backup_put|backup_existing|createUser|deleteUser|upsert\(|\.insert\(|\.update\(/);
});
test('owner is from verified JWT plus private username link, never request body',()=>{
 assert.match(src,/admin\.auth\.getUser\(m\[1\]\)/);
 assert.ok(src.includes("if(error||!user?.id||user.is_anonymous||user.deleted_at)"));
 assert.match(src,/user\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
 assert.match(src,/\.select\('username_key'\)\.eq\('user_id',user\.id\)\.limit\(2\)/);
 assert.match(src,/links\[0\]\.username_key!==boundName/);
 assert.match(src,/p_user_id:user\.id/g);
 assert.doesNotMatch(src,/p_user_id:body\.|user_id:body\.|target_username|target_user_id/);
});
test('password, rate limit, revocation and MFA rechecks precede release',()=>{
 const ordered=[
  "const authenticated=await verifiedUser(req);",
  "const firstSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "const quotaStatus=await quota(user.id);",
  "if(!await provePassword(user,body.password))",
  "const secondSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "const refreshedAssurance=await verifiedUser(req);",
  "const stored=await admin.rpc('mmh_n10_recovery_backup_get'",
  "const finalAssurance=await verifiedUser(req);",
  "const finalSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "return out(origin,'recovery_key',200,{words:phrase.split(' '),expires_in_seconds:45});"
 ];
 let previous=-1;for(const s of ordered){const pos=src.indexOf(s,previous+1);assert.ok(pos>previous,s);previous=pos;}
 assert.match(src,/p_limit:5,p_window_seconds:900/);
});
test('password-only account can use AAL1; enrolled MFA needs AAL2',()=>{
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal1'},false),'allowed');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal2'},true),'required');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal2'},true),'allowed');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal1'},false),'unavailable');
 assert.equal(sessionAalFromVerifiedFactors([]),'aal1');
 assert.equal(sessionAalFromVerifiedFactors([{factor_type:'totp',status:'verified'}]),'aal2');
 assert.equal(sessionAalFromVerifiedFactors([{factor_type:'totp',status:'bogus'}]),null);
});

test('Recovery password proof revokes exact freshly issued session before returning success',async()=>{
 const srcStart=src.indexOf('async function provePassword(');
 const srcEnd=src.indexOf('async function verifiedUser(',srcStart);
 assert.ok(srcStart>0&&srcEnd>srcStart,'production candidate proof must exist');
 const code=src.slice(srcStart,srcEnd)
  .replace('user:{id:string,email?:string|null},password:unknown','user,password')
  .replace('let proofToken:string|null=null,verified=false;','let proofToken=null,verified=false;');
 assert.match(code,/admin\.auth\.admin\.signOut\(proofToken,'local'\)/);
 assert.doesNotMatch(code,/client\.auth\.signOut\(/,'never rely on client-memory logout');
 const events=[];
 const owner={id:'synthetic-owner-a',email:'owner-a@invalid.example'};
 const currentSession={id:'original-owner-session',live:true};
 const proof={access_token:'new-synthetic-proof-jwt',refresh_token:'new-synthetic-refresh'};
 const admin={auth:{admin:{signOut:async(jwt,scope)=>{
  events.push('revoke:'+jwt+':'+scope);
  assert.equal(jwt,proof.access_token,'must revoke new proof session only');
  assert.equal(scope,'local','must not revoke existing owner sessions');
  return {error:null};
 }}}};
 const createClient=()=>({auth:{
  signInWithPassword:async()=>({data:{user:owner,session:proof},error:null}),
  getUser:async jwt=>({data:{user:jwt===proof.access_token?owner:null},error:null}),
  signOut:()=>{throw Error('client signOut must never be used');}
 }});
 const sandbox={BASE:'https://synthetic.invalid',ANON:'synthetic-anon-key',createClient,admin};
 runInNewContext(code+'\nthis.provePassword=provePassword;',sandbox);
 assert.equal(await sandbox.provePassword(owner,'SyntheticPassword1'),true);
 assert.deepEqual(events,['revoke:new-synthetic-proof-jwt:local']);
 assert.equal(currentSession.live,true,'original authenticated session must remain intact');
});

test('Recovery password proof fails closed for unsuccessful revocation and malformed Auth data',async()=>{
 const start=src.indexOf('async function provePassword(');
 const end=src.indexOf('async function verifiedUser(',start);
 const code=src.slice(start,end)
  .replace('user:{id:string,email?:string|null},password:unknown','user,password')
  .replace('let proofToken:string|null=null,verified=false;','let proofToken=null,verified=false;');
 const owner={id:'synthetic-owner-a',email:'owner-a@invalid.example'};
 async function run({logoutError=false,logoutThrow=false,mismatch=false,noRefresh=false,getUserFail=false,noToken=false,signInFail=false}={}){
  const calls=[];
  const proofToken='fresh-unshared-synthetic-token';
  const ctx={
   BASE:'https://synthetic.invalid',ANON:'synthetic-anon-key',
   createClient:()=>({auth:{
    signInWithPassword:async()=>signInFail?{data:null,error:{message:'wrong password'}}:
      {data:{user:{...owner,id:mismatch?'other-owner':owner.id},
       session:noToken?null:{access_token:proofToken,refresh_token:noRefresh?'':'synthetic-refresh'}},error:null},
    getUser:async()=>getUserFail?{data:{user:null},error:{message:'unverified'}}:
      {data:{user:owner},error:null},
    signOut:()=>{throw Error('client signOut must not be used');}
   }}),
   admin:{auth:{admin:{signOut:async(token,scope)=>{
    calls.push({token,scope});
    if(logoutThrow)throw Error('scoped service logout failed');
    return {error:logoutError?{message:'server returned failure'}:null};
   }}}}
  };
  runInNewContext(code+'\nthis.provePassword=provePassword;',ctx);
  const result=await ctx.provePassword(owner,'SyntheticPassword1');
  return {result,calls};
 }
 for(const flags of [
  {logoutError:true}, {logoutThrow:true}, {mismatch:true},
  {noRefresh:true}, {getUserFail:true}
 ]){
  const testCase=await run(flags);
  assert.equal(testCase.result,false,'must withhold recovery key when proof fails or revocation fails');
  assert.equal(testCase.calls.length,1,'revoke every issued session even on malformed response');
  assert.equal(testCase.calls[0].token,'fresh-unshared-synthetic-token');
  assert.equal(testCase.calls[0].scope,'local');
 }
 for(const flags of [{noToken:true},{signInFail:true}]){
  const denied=await run(flags);
  assert.equal(denied.result,false);
  assert.equal(denied.calls.length,0,'never revoke other sessions if no proof token was issued');
 }
});
