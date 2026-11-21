/**
 * N10 isolated cross-module synthetic acceptance. NO Auth, SQL, network, secrets
 * or live account mutation. Exercises PR #50 + #43 contracts together.
 * Never implies Production or signed Staging cross-owner acceptance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createEscrowedUsernameEnrollment} from '../n10-signup-escrow-review/immutable-signup-escrow.mjs';
import {createRecoveryViewController} from '../n10-recovery-view/recovery-view-controller.mjs';
import {createRecoveryTransport} from '../n10-recovery-view/recovery-transport.mjs';

const ids=['41111111-1111-4111-8111-111111111111','42222222-2222-4222-8222-222222222222'];
const phraseA='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const phraseB='kilo lima mike november oscar papa quebec romeo sierra tango';
const tickets=['51111111-1111-4111-8111-111111111111','52222222-2222-4222-8222-222222222222'];
const pwd='synthetic-pass-9';

function setup() {
 const users=new Map(),callOrder=[],pending=new Map();
 let created=0,owner=null,viewStates=[];
 const adapters={
  vaultReady:async()=>{callOrder.push('vault_ready');return true;},
  claimReservation:async({username,ticket,phrase})=>{
   callOrder.push('reservation');
   if(!tickets.includes(ticket)||pending.has(ticket))return false;
   pending.set(ticket,{username,phrase});return true;
  },
  createNewUser:async({username,password})=>{
   callOrder.push('create_new');
   const id=ids[created++];
   if(!id)return null;
   users.set(id,{username,password,verifier:null,encrypted:null});
   return {id,newlyCreated:true};
  },
  saveLegacyVerifier:async({userId,phrase})=>{
   callOrder.push('save_verifier');
   const record=users.get(userId);if(!record||record.verifier)return false;
   record.verifier=phrase;return true;
  },
  encryptOriginalWords:async({userId,phrase})=>{
   callOrder.push('encrypt_original');
   const record=users.get(userId);
   if(!record||record.verifier!==phrase||record.encrypted)return false;
   record.encrypted=phrase;return true;
  },
  readBackOriginalWords:async({userId})=>{
   callOrder.push('read_back');
   return users.get(userId)?.encrypted||null;
  },
  linkUsername:async({userId,username})=>{
   callOrder.push('link_username');
   return users.get(userId)?.username===username;
  },
  createVerifiedSession:async({userId,password})=>{
   callOrder.push('issue_session');
   if(users.get(userId)?.password!==password)return null;
   return {userId,verified:true,accessToken:'SYNTHETIC-NON-JWT',refreshToken:'SYNTHETIC-NON-REFRESH'};
  },
  rollbackNewUser:async({newlyCreatedUserId})=>{
   callOrder.push('rollback_new');return users.delete(newlyCreatedUserId);
  },
  releaseReservation:async({ticket})=>{pending.delete(ticket);return true;},
 };
 const enroll=createEscrowedUsernameEnrollment(adapters);
 const requests=[];
 let deferReveal=null;
 const request=async(action,fields)=>{
   requests.push(action);
   const record=users.get(owner);
   if(action==='status')return {code:'backup_status',backed_up:!!record?.encrypted};
   if(action!=='reveal'||!record)return {code:'unavailable'};
   if(deferReveal)return await deferReveal();
   if(fields?.password!==record.password)return {code:'invalid_credentials'};
   if(!record.encrypted)return {code:'backup_not_ready'};
   return {code:'recovery_key',words:record.encrypted.split(' '),expires_in_seconds:45};
 };
 const timers=[];
 const controller=createRecoveryViewController({
  request,currentOwner:()=>owner,
  onChange:v=>{viewStates.push(v);},
  setTimer:fn=>{timers.push(fn);return timers.length;},
  clearTimer:()=>{},
 });
 return {
  enroll,users,callOrder,requests,timers,controller,
  get states(){return viewStates;},
  setOwner:id=>{owner=id;controller.ownerChanged();},
  getOwner:()=>owner,
  setDeferredReveal:fn=>{deferReveal=fn;},
  clearStates:()=>{viewStates=[];},
 };
}
function req(i){
 return {username:'synthetic_owner_'+(i+1),password:pwd,ticket:tickets[i],originalWords:i===0?phraseA:phraseB};
}
function latest(h){return h.states.at(-1);}
async function enrollOrFail(h,i){
 const result=await h.enroll(req(i));
 assert.equal(result.ok,true);
 assert.equal(result.userId,ids[i]);
 assert.equal('originalWords' in result,false);
 return result;
}

test('signup escrows exactly the original ten words BEFORE releasing a session',async()=>{
 const h=setup();
 await enrollOrFail(h,0);
 const pos=key=>h.callOrder.indexOf(key);
 assert.ok(pos('save_verifier')<pos('encrypt_original'));
 assert.ok(pos('encrypt_original')<pos('read_back'));
 assert.ok(pos('read_back')<pos('issue_session'));
 assert.equal(h.users.get(ids[0]).verifier,phraseA);
 assert.equal(h.users.get(ids[0]).encrypted,phraseA);
});

test('view immediately after signup returns SAME immutable words, never re-generates',async()=>{
 const h=setup();await enrollOrFail(h,0);h.setOwner(ids[0]);
 await h.controller.status();
 assert.equal(latest(h).phase,'ready');
 await h.controller.reveal(pwd);
 assert.equal(latest(h).phase,'visible');
 assert.deepEqual(latest(h).words,phraseA.split(' '));
 assert.deepEqual(h.requests,['status','reveal']);
 assert.equal(h.callOrder.filter(x=>x==='create_new').length,1);
 assert.equal(h.callOrder.filter(x=>x==='encrypt_original').length,1);
 h.controller.hide();
 assert.equal(latest(h).phase,'locked');
 assert.equal(latest(h).words,undefined);
});

test('two accounts keep independent fixed keys; no A words appear in B view',async()=>{
 const h=setup();await enrollOrFail(h,0);await enrollOrFail(h,1);
 h.setOwner(ids[0]);await h.controller.status();await h.controller.reveal(pwd);
 assert.deepEqual(latest(h).words,phraseA.split(' '));
 h.setOwner(ids[1]);
 assert.equal(latest(h).phase,'locked');
 await h.controller.status();await h.controller.reveal(pwd);
 assert.deepEqual(latest(h).words,phraseB.split(' '));
 assert.notDeepEqual(latest(h).words,phraseA.split(' '));
 assert.equal(h.users.get(ids[0]).encrypted,phraseA);
});

test('wrong password fails closed without replacing escrow',async()=>{
 const h=setup();await enrollOrFail(h,0);h.setOwner(ids[0]);
 await h.controller.status();await h.controller.reveal('incorrect-password');
 assert.equal(latest(h).phase,'password_required');
 assert.equal(latest(h).words,undefined);
 assert.equal(h.users.get(ids[0]).encrypted,phraseA);
});

test('historical verifier-only accounts cannot reconstruct old words',async()=>{
 const h=setup();h.users.set(ids[0],{username:'historical',password:pwd,verifier:phraseA,encrypted:null});
 h.setOwner(ids[0]);await h.controller.status();
 assert.equal(latest(h).phase,'not_recoverable');
 await h.controller.reveal(pwd);
 assert.equal(latest(h).phase,'locked');
 assert.equal(h.users.get(ids[0]).encrypted,null);
 assert.deepEqual(h.requests,['status']);
});

test('changing owner while a delayed reveal is in flight prevents disclosure',async()=>{
 const h=setup();await enrollOrFail(h,0);await enrollOrFail(h,1);
 h.setOwner(ids[0]);await h.controller.status();
 let release;h.setDeferredReveal(()=>new Promise(resolve=>{release=resolve}));
 const inflight=h.controller.reveal(pwd);
 await Promise.resolve();
 h.setOwner(ids[1]);
 release({code:'recovery_key',words:phraseA.split(' '),expires_in_seconds:45});
 await inflight;
 assert.equal(latest(h).phase,'locked');
 assert.equal(h.states.filter(v=>v.phase==='visible').length,0);
});

test('45-second disclosure timer locks and drops plaintext UI state',async()=>{
 const h=setup();await enrollOrFail(h,0);h.setOwner(ids[0]);
 await h.controller.status();await h.controller.reveal(pwd);
 assert.equal(latest(h).phase,'visible');
 assert.equal(h.timers.length,1);
 h.timers[0]();
 assert.equal(latest(h).phase,'locked');
 assert.equal(latest(h).words,undefined);
});

test('real browser transport stays HARD OFF even for trusted origin',async()=>{
 let called=0;
 const auth={getSession:async()=>{called++;return null;},getUser:async()=>{called++;return null;}};
 const request=createRecoveryTransport({auth,fetcher:async()=>{called++;throw Error('network forbidden');},origin:'https://mmhvault.com',releaseEnabled:false});
 assert.equal((await request('status')).code,'unavailable');
 assert.equal((await request('reveal',{password:pwd})).code,'unavailable');
 assert.equal(called,0);
});
