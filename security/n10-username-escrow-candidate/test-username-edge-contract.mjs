// Synthetic tests for REVIEW-ONLY registration handler extracted from the
// current Production v8-shaped candidate. Nothing calls Auth or Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {createEscrowedUsernameEnrollment} from '../n10-signup-escrow-review/immutable-signup-escrow.mjs';
const source=readFileSync(new URL('./username-edge-REVIEW-ONLY.ts',import.meta.url),'utf8');
const start=source.indexOf('async function enroll(username,pwd,ticket,input){');
const end=source.indexOf('async function loginPassword(username,pwd){');
assert.ok(start>0&&end>start&&end-start>3000);
const handler=source.slice(start,end);
const phrases=[
 'alpha bravo charlie delta echo foxtrot golf hotel india juliet',
 'kilo lima mike november oscar papa quebec romeo sierra tango'
];
const ticket='51111111-1111-4111-8111-111111111111';
const uid='41111111-1111-4111-8111-111111111111';
const password='synthetic-password-9';
const userName='synthetic_owner';
const origin='https://mmhvault.com';

function fake(overrides={}){
 const calls=[],state={user:null,verifier:null,backup:null,linked:false,deleted:false,banned:false};
 const call=(name,args)=>{calls.push(name);return args;};
 const admin={
  auth:{admin:{
   createUser:async({email,password,app_metadata})=>{
    call('createUser');
    if(overrides.createError)return {error:Error('synthetic ambiguous'),data:null};
    state.user={id:uid,email,app_metadata,password};
    return {data:{user:{id:uid,email:overrides.returnOtherEmail?'someone-else@invalid.test':email,app_metadata:overrides.returnWrongAuthKind?{mmhvault_auth_kind:'email'}:app_metadata}},error:null};
   },
   getUserById:async(id)=>({data:{user:state.user?.id===id?state.user:null},error:null}),
   deleteUser:async(id)=>{call('deleteUser');state.deleted=id===uid;return {error:null};},
   updateUserById:async()=>{call('banUser');state.banned=true;return {error:null}}
  }},
  rpc:async(name,args)=>{
   call(name,args);
   switch(name){
    case 'mmh_n10_recovery_backup_exists':return overrides.vaultDown?
      {data:null,error:Error('missing vault')}:{data:false,error:null};
    case 'mmh_n10a769_claim_enrollment':return {data:overrides.claimDenied!==true,error:null};
    case 'mmh_n10_recovery_backup_put':
     if(args.p_user_id!==uid||args.p_verifier!==state.verifier||
        typeof args.p_verifier!=='string'||!/^[0-9a-f]{64}$/.test(args.p_verifier))
      return {data:null,error:Error('enrollment verifier mismatch')};
     if(overrides.putDown)return {data:null,error:Error('write failed')};
     state.backup=args.p_phrase;return {data:true,error:null};
    case 'mmh_n10_recovery_backup_get':return {data:overrides.readbackWrong?phrases[1]:state.backup,error:null};
    default:throw Error('unexpected RPC '+name);
   }
  },
  from:table=>({
   insert:async data=>{
    call('insert:'+table);
    if(overrides.insertFail===table)return {error:Error('synthetic constraint')};
    if(table==='mmh_n10a769_recovery_phrases')state.verifier=overrides.verifierDrift?
     (data.verifier[0]==='0'?'1':'0')+data.verifier.slice(1):data.verifier;
    else if(table==='mmh_n10a740_username_links')state.linked=true;
    else throw Error('unexpected table insert');
    return {error:null};
   },
   delete:()=>({
    eq:()=>({eq:()=>({then(resolve){call('releaseReservation');resolve({error:null});}})})
   })
  })
 };
 const ctx={
  normalizedPhrase:input=>typeof input==='string'&&phrases.includes(input)?input:null,
  quota:async()=>{call('quota');return true},
  admin,mac:async val=>{call('mac');return createHash('sha256').update(val,'utf8').digest('hex')},
  crypto:{randomUUID:()=> '00000000-0000-4000-8000-000000000002'},
  ALIAS_DOMAIN:'no-mail.mmhvault.invalid',
  verifyPassword:async(email,pwd,id)=>{
   call('verifyPassword');
   if(overrides.sessionFail)return null;
   return state.user?.email===email&&state.user.id===id&&state.user.password===pwd?
    {access_token:'syntheticAccess',refresh_token:'syntheticRefresh'}:null;
  },
  createEscrowedUsernameEnrollment
 };
 const enroll=runInNewContext('('+handler.trim()+')',ctx);
 return {enroll,calls,state};
}
test('candidate is default OFF with exact Production owner and origin',()=>{
 assert.match(source,/const RELEASE_ENABLED=false;/);
 assert.doesNotMatch(source,/const RELEASE_ENABLED=true;/);
 assert.match(source,/if\(!RELEASE_ENABLED\)return reply\(origin,'registration_not_released',503\);/);
 assert.match(source,/const PROJECT='vrypucmyrztxgiqhjspd';/);
 assert.match(source,/const ORIGIN='https:\/\/mmhvault.com';/);
 assert.doesNotMatch(source,/ldivswlhtgmznzwhzsoi/);
});
test('uses exact current username APIs, unchanged prepare/password/recovery paths',()=>{
 for(const s of ["'prepare_signup'","'signup'","'login'","'phrase_login'",
  'mmh_n10a769_reserve_username','mmh_n10a769_claim_enrollment',
  'mmh_n10a769_recovery_phrases','mmh_n10a740_username_links',
  'mmh_n10_recovery_backup_put','mmh_n10_recovery_backup_get']){
  assert.ok(source.includes(s),s);
 }
 assert.ok(handler.includes('createEscrowedUsernameEnrollment(deps)'));
 assert.ok(!handler.includes('newRecoveryWords'));
});
test('success only after exact encrypted readback and verified session',async()=>{
 const h=fake();const result=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(result.code,'signup_success');assert.equal(result.user_id,uid);
 assert.equal(h.state.backup,phrases[0]);assert.equal(h.state.linked,true);
 const pos=key=>h.calls.indexOf(key);
 assert.ok(pos('mmh_n10_recovery_backup_exists')<pos('createUser'));
 assert.ok(pos('mmh_n10_recovery_backup_put')<pos('mmh_n10_recovery_backup_get'));
 assert.ok(pos('mmh_n10_recovery_backup_get')<pos('verifyPassword'));
 assert.ok(!h.calls.includes('deleteUser'));
});
test('missing Production Vault prevents account creation',async()=>{
 const h=fake({vaultDown:true});
 const result=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(result.code,'encrypted_backup_unavailable');
 assert.ok(!h.calls.includes('createUser'));
});
test('reservation denial cannot create a user',async()=>{
 const h=fake({claimDenied:true});
 const result=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(result.code,'invalid_enrollment');
 assert.ok(!h.calls.includes('createUser'));
});
test('wrong or missing key denies before registration mutation',async()=>{
 const h=fake();
 const result=await h.enroll(userName,password,ticket,'unapproved ten words');
 assert.equal(result.code,'invalid_enrollment');
 assert.equal(h.calls.length,0);
});
test('ambiguous Vault write must quarantine the newly-created owner, never delete',async()=>{
 const h=fake({putDown:true});const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'auth_unavailable');
 assert.equal(h.state.deleted,false);assert.equal(h.state.banned,true);
 assert.ok(!h.calls.includes('deleteUser'));
 assert.ok(!h.calls.includes('verifyPassword'));
 assert.ok(!h.calls.includes('releaseReservation'));
});
test('verifier drift between insert and Vault write fails closed and quarantines owner',async()=>{
 const h=fake({verifierDrift:true});const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'auth_unavailable');
 assert.equal(h.state.backup,null);
 assert.equal(h.state.banned,true);
 assert.equal(h.state.deleted,false);
 assert.ok(!h.calls.includes('verifyPassword'));
 assert.ok(!h.calls.includes('releaseReservation'));
});
test('readback mismatch after encrypted write never deletes a backed-up owner',async()=>{
 const h=fake({readbackWrong:true});const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'auth_unavailable');
 assert.equal(h.state.deleted,false);assert.equal(h.state.banned,true);
 assert.ok(!h.calls.includes('deleteUser'));
 assert.ok(!h.calls.includes('verifyPassword'));
 assert.ok(!h.calls.includes('releaseReservation'));
});
test('verifier insert failure before any Vault write allows exact new-user rollback',async()=>{
 const h=fake({insertFail:'mmh_n10a769_recovery_phrases'});
 const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'registration_not_completed');
 assert.equal(h.state.deleted,true);assert.equal(h.state.backup,null);
 assert.ok(!h.calls.includes('mmh_n10_recovery_backup_put'));
 assert.ok(h.calls.includes('releaseReservation'));
});
test('ambiguous createUser response never guesses a delete target',async()=>{
 const h=fake({createError:true});const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'auth_unavailable');assert.ok(!h.calls.includes('deleteUser'));
 assert.ok(!h.calls.includes('releaseReservation'));
});
test('unexpected returned email or account type stops ambiguous creation without deletion',async()=>{
 for(const bad of [{returnOtherEmail:true},{returnWrongAuthKind:true}]){
  const h=fake(bad);const out=await h.enroll(userName,password,ticket,phrases[0]);
  assert.equal(out.code,'auth_unavailable');
  assert.ok(!h.calls.includes('deleteUser'));
  assert.ok(!h.calls.includes('verifyPassword'));
  assert.ok(!h.calls.includes('releaseReservation'));
 }
});
test('unverified temporary login never releases a signed session',()=>{
 assert.match(source,/const client=authClient\(\);let grant=false;/);
 assert.match(source,/if\(!grant\)\{try\{await client\.auth\.signOut\(\{scope:'local'\}\);\}catch\{\}\}/);
});
test('post-session failure is quarantined for review, not deleted',async()=>{
 const h=fake({sessionFail:true});const out=await h.enroll(userName,password,ticket,phrases[0]);
 assert.equal(out.code,'auth_unavailable');
 assert.ok(h.calls.includes('banUser'));assert.ok(!h.calls.includes('deleteUser'));
});
test('the candidate does not silently rotate or overwrite an existing key',()=>{
 assert.match(handler,/mmh_n10_recovery_backup_put/);
 assert.match(handler,/mmh_n10_recovery_backup_get/);
 assert.match(handler,/createEscrowedUsernameEnrollment/);
 assert.doesNotMatch(handler,/\.update\(\{.*verifier/);
 assert.doesNotMatch(handler,/rotateKey|resetKey|regenerate/);
});
console.log('Only synthetic candidate tests; no live registration, data access or deployment.');


test('password Auth grants exact fresh session and revokes only failed new sessions',async()=>{
 const start=source.indexOf('async function verifyPassword(email,pwd,uid){');
 const end=source.indexOf('async function findProductionUser(',start);
 assert.ok(start>0&&end>start);
 const proofCode=source.slice(start,end);
 assert.match(proofCode,/admin\.auth\.admin\.signOut\(proofToken,'local'\)/);
 assert.doesNotMatch(proofCode,/client\.auth\.signOut\(/);
 function fixture({mismatch=false,emptyRefresh=false,missingToken=false,getUserFailure=false,revokeFailure=false,revokeThrows=false}={}){
  const session={access_token:'synthetic-new-password-token',refresh_token:emptyRefresh?'':'synthetic-refresh'};
  let freshSessionLive=true,existingSessionLive=true;
  const calls=[];
  const ctx={
   authClient:()=>({auth:{
    signInWithPassword:async()=>({data:{user:{id:mismatch?'different-uid':uid},
      session:missingToken?null:session},error:null}),
    getUser:async()=>getUserFailure?{error:{message:'untrusted'},data:null}:
      {error:null,data:{user:{id:uid,is_anonymous:false}}},
    signOut:()=>{throw Error('transient client cannot claim server logout');}
   }}),
   admin:{auth:{admin:{signOut:async(token,scope)=>{
    calls.push({token,scope});
    assert.equal(token,session.access_token);
    assert.equal(scope,'local');
    if(revokeThrows)throw Error('synthetic server logout exception');
    if(revokeFailure)return {error:{message:'synthetic failure'}};
    freshSessionLive=false;
    return {error:null};
   }}}}
  };
  const verify=runInNewContext('('+proofCode.trim()+')',ctx);
  return {run:()=>verify('test@invalid.example','synthetic-password',uid),
    calls, get existingLive(){return existingSessionLive},get freshLive(){return freshSessionLive}};
 }
 for(const flags of [{mismatch:true},{emptyRefresh:true},{getUserFailure:true}]){
  const h=fixture(flags);
  assert.equal(await h.run(),null,'malformed Auth credentials must not be delivered');
  assert.equal(h.calls.length,1,'one targeted server revocation');
  assert.equal(h.freshLive,false,'fresh failed Auth session revoked');
  assert.equal(h.existingLive,true,'prior owner session preserved');
 }
 for(const flags of [{revokeFailure:true},{revokeThrows:true}]){
  const h=fixture({...flags,mismatch:true});
  await assert.rejects(h.run(),/n10_auth_session_reconciliation_required/);
  assert.equal(h.calls.length,1);
  assert.equal(h.existingLive,true);
 }
 const h=fixture();
 const result=await h.run();
 assert.equal(result.access_token,'synthetic-new-password-token');
 assert.equal(h.calls.length,0,'only successful fresh session may be delivered');
 assert.equal(h.existingLive,true);
 const noToken=fixture({missingToken:true});
 assert.equal(await noToken.run(),null);
 assert.equal(noToken.calls.length,0,'never revoke unrelated session when no proof JWT was issued');
});
