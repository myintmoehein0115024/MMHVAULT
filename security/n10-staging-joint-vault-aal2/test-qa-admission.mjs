import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateStagingQAAdmission as admit,closeStagingQAAndCleanup as clean} from './qa-admission.mjs';

const runTag='n10-staging-qa-synthetic-20261102';
const idA='41111111-1111-4111-8111-111111111111';
const idB='42222222-2222-4222-8222-222222222222';
const now=Date.parse('2026-11-02T13:00:00.000Z');
const fixture=(id,email)=>({
 userId:id,authEmail:email,provisionedForRun:runTag,
 newlyCreated:true,creationConfirmedByAuth:true,
 authEmailConfirmed:true,signedAccessTokenValidatedByAuth:true,
 validLiveSession:true,verifiedTotpFactor:true,
 currentSessionAal:'aal2',passwordProofCompleted:true,
 isUsernameOnly:false
});
const a=fixture(idA,'qa-a@example.invalid'),b=fixture(idB,'qa-b@example.invalid');
const params={
 projectId:'ldivswlhtgmznzwhzsoi',edgeSlug:'mmh-n10-qa-joint-mfa-vault-20261101',
 verifyJwt:true,deployedHardOff:true,releaseDeadlineExpired:true,allowlistEmpty:true,
 runTag,fixtureA:a,fixtureB:b,vaultOwnerIsolationPass:true,baselineGuardPass:true,
 nowMs:now,windowEndMs:now+10*60*1000
};
test('complete synthetic readiness does not itself open QA or reveal words',()=>{
 const x=admit(params);
 assert.equal(x.verdict,'ADMISSION_PREFLIGHT_OK__STAGING_ONLY');
 assert.equal(x.canOpen,false);assert.equal(x.canReveal,false);
 assert.equal(x.canModifyProduction,false);
});
test('production project and a different QA service are never admitted',()=>{
 for(const changed of [
 {projectId:'vrypucmyrztxgiqhjspd'}, {edgeSlug:'mmh-n10a769-username'},
 {verifyJwt:false},{deployedHardOff:false},
 {releaseDeadlineExpired:false},{allowlistEmpty:false}]){
  const x=admit({...params,...changed});
  assert.equal(x.verdict,'HOLD_STAGING_QA_OFF');
 }
});
test('two DIFFERENT freshly Auth-confirmed synthetic owners are required',()=>{
 for(const changed of [
 {fixtureB:{...b,userId:idA}},{fixtureB:{...b,authEmail:a.authEmail}},
 {fixtureA:{...a,newlyCreated:false}},
 {fixtureB:{...b,provisionedForRun:'another-run'}},
 {fixtureB:{...b,authEmailConfirmed:false}},
 {fixtureA:{...a,isUsernameOnly:true}},
 {fixtureA:null},{fixtureB:undefined}]){
  assert.equal(admit({...params,...changed}).verdict,'HOLD_STAGING_QA_OFF');
 }
});
test('unsigned JWT, stale session, missing MFA or missing password proof cannot open QA',()=>{
 for(const bad of [
 {signedAccessTokenValidatedByAuth:false},{validLiveSession:false},
 {verifiedTotpFactor:false},{currentSessionAal:'aal1'},
 {currentSessionAal:undefined},{passwordProofCompleted:false}
 ]){
  assert.equal(admit({...params,fixtureA:{...a,...bad}}).verdict,'HOLD_STAGING_QA_OFF');
 }
});
test('QA window must remain at most ten minutes and strictly in the future',()=>{
 for(const end of [now,now-1,now+10*60*1000+1,NaN]){
  assert.equal(admit({...params,windowEndMs:end}).verdict,'HOLD_STAGING_QA_OFF');
 }
});
test('unverified Vault ownership and guard permissions fail closed',()=>{
 for(const key of ['vaultOwnerIsolationPass','baselineGuardPass'])
  assert.equal(admit({...params,[key]:false}).verdict,'HOLD_STAGING_QA_OFF');
});
test('no secret-bearing values ever appear in readiness verdict',()=>{
 const x=admit(params);
 assert.deepEqual(Object.keys(x).sort(),['canModifyProduction','canOpen','canReveal','verdict'].sort());
 assert.ok(!JSON.stringify(x).includes(idA));
 assert.ok(!JSON.stringify(x).includes('@example.invalid'));
});
test('cleanup disables QA first, then revokes and deletes ONLY both newly-created user IDs',async()=>{
 const actions=[];
 const x=await clean({
  runTag,fixtures:[a,b],
  disableQA:async()=>{actions.push('disable');return true},
  verifyClosed:async()=>{actions.push('verify');return true},
  revokeFixture:async id=>{actions.push('revoke:'+id);return true},
  deleteFixture:async id=>{actions.push('delete:'+id);return true}
 });
 assert.deepEqual(x,{closed:true,cleaned:2,needsManualReconciliation:false});
 assert.deepEqual(actions,['disable','verify','revoke:'+idA,'delete:'+idA,'revoke:'+idB,'delete:'+idB]);
});
test('failed QA closure blocks ALL account deletion',async()=>{
 const actions=[];
 const x=await clean({
  runTag,fixtures:[a,b],disableQA:async()=>false,
  verifyClosed:async()=>{actions.push('verify');return true},
  revokeFixture:async()=>{actions.push('revoke');return true},
  deleteFixture:async()=>{actions.push('delete');return true}
 });
 assert.equal(x.closed,false);assert.equal(x.cleaned,0);
 assert.equal(x.needsManualReconciliation,true);
 assert.deepEqual(actions,[]);
});
test('never delete a pre-existing, wrong-run, unknown or nonconfirmed user',async()=>{
 let removed=0;
 const x=await clean({
  runTag,fixtures:[{...a,newlyCreated:false},{...b,provisionedForRun:'wrong'}],
  disableQA:async()=>true,verifyClosed:async()=>true,
  revokeFixture:async()=>{throw Error('must not be called')},
  deleteFixture:async()=>{removed++;return true},
 });
 assert.equal(removed,0);assert.equal(x.cleaned,0);
 assert.equal(x.needsManualReconciliation,true);
});
test('revoke failure blocks deletion and flags manual reconciliation',async()=>{
 let deletes=0;
 const x=await clean({
  runTag,fixtures:[a],disableQA:async()=>true,verifyClosed:async()=>true,
  revokeFixture:async()=>false,
  deleteFixture:async()=>{deletes++;return true}
 });
 assert.equal(deletes,0);assert.equal(x.closed,true);
 assert.equal(x.needsManualReconciliation,true);
});
test('uncertain delete error never claims clean state',async()=>{
 const x=await clean({
  runTag,fixtures:[a],disableQA:async()=>true,verifyClosed:async()=>true,
  revokeFixture:async()=>true,
  deleteFixture:async()=>{throw Error('synthetic network error')}
 });
 assert.equal(x.cleaned,0);assert.equal(x.needsManualReconciliation,true);
});
