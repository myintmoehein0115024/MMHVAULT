import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateInitialEscrowEnrollment} from './offline-enrollment.mjs';
import {OFFLINE_REVIEW_MARKER} from './atomic-auth-escrow.mjs';

const UUID='b7ec0820-778c-431b-a7ed-c43c017cb74f';
const WORDS='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const vocabulary=new Set(WORDS.split(' '));
const encryptionKey=webcrypto.getRandomValues(new Uint8Array(32));
function fixture({legacyNameFree,aliasFree,simulateCreate,simulateReadById,...changes}={}){
  const calls={preflight:0,create:0,read:0,issuedSessions:0,deletions:0,metadataUpdates:0};
  let stored;
  const input={
    marker:OFFLINE_REVIEW_MARKER,
    username:'n10review_new',
    password:'SyntheticPassword2!',
    originalWords:WORDS,
    keyId:'review-test-key-1',
    rawEncryptionKey:encryptionKey,
    verifyWordlist:w=>vocabulary.has(w),
    legacyNameFree:legacyNameFree||async()=>{calls.preflight++;return true;},
    aliasFree:aliasFree||async()=>{calls.preflight++;return true;},
    simulateCreate:simulateCreate||async attributes=>{
      calls.create++;
      stored={id:UUID,email:attributes.email,app_metadata:attributes.app_metadata};
      return {newlyCreated:true,id:UUID};
    },
    simulateReadById:simulateReadById||async id=>{calls.read++;return id===UUID?stored:null;},
    ...changes
  };
  return {calls,run:()=>simulateInitialEscrowEnrollment(input)};
}
test('offline model contains no Supabase, Auth session or deployment transport',()=>{
  const source=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)),'offline-enrollment.mjs'),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|\bcreateClient\s*\(|\.rpc\s*\(|\.auth\.|\bDeno\.serve\b/);
  assert.match(source,/OFFLINE_REVIEW_MARKER/);
});
test('new account only: requires both namespace checks, exact metadata readback and cryptographic proof before success',async()=>{
  const f=fixture();
  const result=await f.run();
  assert.deepEqual(result,{ok:true,code:'offline_encrypted_escrow_verified_no_session'});
  assert.equal(f.calls.preflight,2);
  assert.equal(f.calls.create,1);
  assert.equal(f.calls.read,1);
  assert.equal(f.calls.issuedSessions,0);
  assert.ok(!JSON.stringify(result).includes(WORDS));
  assert.ok(!('access_token' in result));
});
test('legacy username collision blocks create before any mutation',async()=>{
  const f=fixture({legacyNameFree:async()=>false});
  assert.equal((await f.run()).code,'offline_identity_collision');
  assert.equal(f.calls.create,0);
});
test('alias conflict blocks create before any mutation',async()=>{
  const f=fixture({aliasFree:async()=>false});
  assert.equal((await f.run()).code,'offline_identity_collision');
  assert.equal(f.calls.create,0);
});
test('preflight outage denies create and session',async()=>{
  const f=fixture({legacyNameFree:async()=>{throw Error('simulated outage')}});
  assert.equal((await f.run()).code,'offline_preflight_unavailable');
  assert.equal(f.calls.create,0);
});
test('ambiguous Auth creation is held for manual reconciliation; never retries or deletes',async()=>{
  let invoked=0;
  const f=fixture({simulateCreate:async()=>{invoked++;throw Error('timeout after unknown commit')}});
  assert.equal((await f.run()).code,'manual_reconciliation_required');
  assert.equal(invoked,1);
  assert.equal(f.calls.read,0);
  assert.equal(f.calls.deletions,0);
});
test('wrong or absent user id cannot establish successful backup',async()=>{
  const f=fixture({simulateCreate:async()=>({newlyCreated:true,id:'not-a-uuid'})});
  assert.equal((await f.run()).code,'manual_reconciliation_required');
  assert.equal(f.calls.read,0);
});
test('re-read with other owner, missing backup, changed ciphertext or wrong type is not accepted',async()=>{
  for(const change of [
    user=>({...user,email:'another@no-mail.mmhvault.invalid'}),
    user=>({...user,id:'b7ec0820-778c-431b-a7ed-c43c017cb750'}),
    user=>({...user,app_metadata:{...user.app_metadata,mmhvault_initial_recovery_envelope:null}}),
    user=>({...user,app_metadata:{...user.app_metadata,mmhvault_auth_kind:'email'}}),
    user=>({...user,app_metadata:{...user.app_metadata,mmhvault_initial_recovery_envelope:{
      ...user.app_metadata.mmhvault_initial_recovery_envelope,ct:'invalid'
    }}})
  ]){
    let record;
    const f=fixture({
      simulateCreate:async attrs=>{
        record={id:UUID,email:attrs.email,app_metadata:attrs.app_metadata};
        return {newlyCreated:true,id:UUID};
      },
      simulateReadById:async()=>change(record)
    });
    assert.equal((await f.run()).code,'manual_reconciliation_required');
  }
});
test('rejects missing review marker; never calls create on invalid phrase or reserved username',async()=>{
  const blocked=fixture({marker:'unsafe'});
  await assert.rejects(blocked.run(),/review_gate_closed/);
  assert.equal(blocked.calls.create,0);
  const words=fixture({originalWords:'not ten words'});
  await assert.rejects(words.run(),/invalid_review_phrase/);
  assert.equal(words.calls.create,0);
  const reserved=fixture({username:'admin'});
  await assert.rejects(reserved.run(),/invalid_review_username/);
  assert.equal(reserved.calls.create,0);
});
