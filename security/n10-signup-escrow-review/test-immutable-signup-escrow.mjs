import test from 'node:test';
import assert from 'node:assert/strict';
import {createEscrowedUsernameEnrollment} from './immutable-signup-escrow.mjs';

const userId = '41111111-1111-4111-8111-111111111111';
const ticket = '51111111-1111-4111-8111-111111111111';
const phrase = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const req = {username:'new_account_1',password:'syntheticPassword8',ticket,originalWords:phrase};
const session = {userId,verified:true,accessToken:'synthetic-access',refreshToken:'synthetic-refresh'};
function setup(failAt = '', override={}) {
  const calls = [];
  const make = (name,returns) => async args => {
    calls.push({name,args});
    if (name === failAt) throw Error('synthetic failure of '+name);
    return typeof override[name] === 'function' ? await override[name](args) :
      Object.prototype.hasOwnProperty.call(override,name) ? override[name] : returns;
  };
  const d={
    vaultReady: make('vaultReady',true),
    claimReservation:make('claimReservation',true),
    createNewUser:make('createNewUser',{id:userId,newlyCreated:true}),
    saveLegacyVerifier:make('saveLegacyVerifier',true),
    encryptOriginalWords:make('encryptOriginalWords',true),
    readBackOriginalWords:make('readBackOriginalWords',phrase),
    linkUsername:make('linkUsername',true),
    createVerifiedSession:make('createVerifiedSession',session),
    rollbackNewUser:make('rollbackNewUser',true),
    releaseReservation:make('releaseReservation',true),
  };
  return {enroll:createEscrowedUsernameEnrollment(d),calls};
}
const actions=h=>h.calls.map(x=>x.name);
test('success escrows original before username link and session',async()=>{
 const h=setup();const result=await h.enroll(req);
 assert.equal(result.ok,true);assert.equal(result.code,'signup_success');
 assert.deepEqual(actions(h),[
  'vaultReady','claimReservation','createNewUser','saveLegacyVerifier',
  'encryptOriginalWords','readBackOriginalWords','linkUsername',
  'createVerifiedSession','releaseReservation']);
 assert.equal(h.calls.find(x=>x.name==='encryptOriginalWords').args.phrase,phrase);
 assert.ok(!actions(h).includes('rollbackNewUser'));
 assert.ok(!('originalWords' in result));
});
test('invalid enrollment cannot create, claim, or change a user',async()=>{
 for(const invalid of [{...req,username:'a'}, {...req,password:'short'},
   {...req,ticket:'not-ticket'}, {...req,originalWords:'alpha bravo'},
   {...req,originalWords:'alpha bravo charlie delta echo foxtrot golf hotel india 4'}]){
  const h=setup();assert.deepEqual(await h.enroll(invalid),{ok:false,code:'invalid_enrollment'});
  assert.equal(h.calls.length,0);
 }
});
test('Vault unavailable fails before reservation claim or user creation',async()=>{
 const h=setup('',{vaultReady:false});
 assert.deepEqual(await h.enroll(req),{ok:false,code:'encrypted_backup_unavailable'});
 assert.deepEqual(actions(h),['vaultReady']);
});
test('duplicate or used reservation never creates a new user',async()=>{
 const h=setup('',{claimReservation:false});
 assert.deepEqual(await h.enroll(req),{ok:false,code:'invalid_enrollment'});
 assert.deepEqual(actions(h),['vaultReady','claimReservation']);
});
for (const stage of ['saveLegacyVerifier','encryptOriginalWords','readBackOriginalWords','linkUsername','createVerifiedSession']) {
 test('failed '+stage+' rolls back only this newly created account and issues no success',async()=>{
  const h=setup(stage);
  const out=await h.enroll(req);
  assert.deepEqual(out,{ok:false,code:'registration_not_completed'});
  assert.deepEqual(h.calls.find(x=>x.name==='rollbackNewUser').args,{newlyCreatedUserId:userId});
  assert.equal(actions(h).at(-1),'releaseReservation');
  if(stage!=='createVerifiedSession')assert.ok(!actions(h).includes('createVerifiedSession'));
 });
}
test('false escrow result prevents session issuance',async()=>{
 const h=setup('',{encryptOriginalWords:false});
 assert.equal((await h.enroll(req)).ok,false);
 assert.ok(!actions(h).includes('createVerifiedSession'));
 assert.ok(actions(h).includes('rollbackNewUser'));
});
test('different readback phrase is rejected, existing verifier untouched',async()=>{
 const h=setup('',{readBackOriginalWords:'alpha bravo charlie delta echo foxtrot golf hotel india kilo'});
 assert.equal((await h.enroll(req)).ok,false);
 assert.ok(!actions(h).includes('linkUsername'));
 assert.ok(actions(h).includes('rollbackNewUser'));
});
test('ambiguous create response never deletes a pre-existing user',async()=>{
 const h=setup('',{createNewUser:{id:userId,newlyCreated:false}});
 assert.deepEqual(await h.enroll(req),{ok:false,code:'registration_not_completed'});
 assert.ok(!actions(h).includes('rollbackNewUser'));
});
test('unexpectedly malformed user ID cannot trigger deletion',async()=>{
 const h=setup('',{createNewUser:{id:'known-user',newlyCreated:true}});
 assert.equal((await h.enroll(req)).ok,false);
 assert.ok(!actions(h).includes('rollbackNewUser'));
});
test('failed rollback never claims successful account creation',async()=>{
 const h=setup('',{encryptOriginalWords:false,rollbackNewUser:false});
 assert.deepEqual(await h.enroll(req),{ok:false,code:'manual_reconciliation_required'});
 assert.ok(!actions(h).includes('createVerifiedSession'));
});
test('session user mismatch causes rollback',async()=>{
 const h=setup('',{createVerifiedSession:{...session,userId:'other-id'}});
 assert.equal((await h.enroll(req)).ok,false);
 assert.ok(actions(h).includes('rollbackNewUser'));
});
test('unverified or incomplete session never produces signup success',async()=>{
 for(const bad of [{...session,verified:false},{...session,refreshToken:''},{...session,accessToken:''}]){
  const h=setup('',{createVerifiedSession:bad});
  assert.equal((await h.enroll(req)).ok,false);
  assert.ok(actions(h).includes('rollbackNewUser'));
 }
});
test('reservation release failure does not delete a successfully created user',async()=>{
 const h=setup('releaseReservation');
 const out=await h.enroll(req);
 assert.equal(out.ok,true);
 assert.ok(!actions(h).includes('rollbackNewUser'));
});
test('normalizes spacing without generating new words',async()=>{
 const h=setup();const out=await h.enroll({...req,originalWords:'  ALPHA   bravo   charlie delta echo foxtrot golf hotel india juliet  '});
 assert.equal(out.ok,true);
 assert.equal(h.calls.find(x=>x.name==='encryptOriginalWords').args.phrase,phrase);
});
