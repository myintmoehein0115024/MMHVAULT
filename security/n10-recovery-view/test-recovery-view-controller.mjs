import assert from 'node:assert/strict';
import test from 'node:test';
import {createRecoveryViewController,validOriginalWords,recoveryViewMessage} from './recovery-view-controller.mjs';
const words='alpha bravo charlie delta echo foxtrot golf hotel india juliet'.split(' ');
function harness({backedUp=true,result={code:'recovery_key',words,expires_in_seconds:45}}={}){
 let owner='account-a',scheduled=null;const events=[],calls=[];
 const controller=createRecoveryViewController({
  currentOwner:()=>owner,onChange:x=>events.push(x),
  request:async(action,body)=>{
   calls.push({action,passwordPresent:Object.prototype.hasOwnProperty.call(body,'password')});
   return action==='status'?{code:'backup_status',backed_up:backedUp}:result;
  },
  setTimer:(fn,ms)=>{scheduled={fn,ms};return 1},clearTimer:()=>{scheduled=null}
 });
 return {controller,events,calls,schedule:()=>scheduled,changeOwner:x=>{owner=x}};
}
test('requires exactly 10 original words',()=>{
 assert.equal(validOriginalWords(words),true);
 assert.equal(validOriginalWords(words.slice(1)),false);
 assert.equal(validOriginalWords([...words.slice(0,9),'A1']),false);
 assert.equal(validOriginalWords('alpha bravo'),false);
});
test('legacy account without escrow never calls reveal or replacement',async()=>{
 const h=harness({backedUp:false});await h.controller.status();
 assert.equal(h.controller.getPhase(),'not_recoverable');
 await h.controller.reveal('synthetic-password');
 assert.deepEqual(h.calls.map(c=>c.action),['status']);
});
test('only status and reveal are invoked; original words hide after 45s',async()=>{
 const h=harness();await h.controller.status();await h.controller.reveal('synthetic-password');
 assert.deepEqual(h.calls.map(c=>c.action),['status','reveal']);
 assert.deepEqual(h.events.at(-1).words,words);
 assert.equal(h.schedule().ms,45000);
 h.schedule().fn();
 assert.equal(h.controller.getPhase(),'locked');
 assert.ok(!('words' in h.events.at(-1)));
});
test('invalid password length never goes to server',async()=>{
 const h=harness();await h.controller.status();await h.controller.reveal('short');
 assert.equal(h.controller.getPhase(),'password_required');
 assert.deepEqual(h.calls.map(c=>c.action),['status']);
});
for(const [code,expected] of [['invalid_credentials','password_required'],['mfa_required','mfa_required'],['session_expired','login_required'],['sign_in_required','login_required'],['backup_not_ready','not_recoverable'],['unknown','unavailable']]){
 test('error '+code+' is safely handled',async()=>{
  const h=harness({result:{code}});await h.controller.status();await h.controller.reveal('synthetic-password');
  assert.equal(h.controller.getPhase(),expected);
  assert.ok(!('words' in h.events.at(-1)));
 });
}
test('wrong password can be retried without changing key',async()=>{
 let count=0;const events=[];
 const c=createRecoveryViewController({currentOwner:()=> 'account-a',onChange:x=>events.push(x),
  request:async action=>action==='status'?{code:'backup_status',backed_up:true}:
   (++count===1?{code:'invalid_credentials'}:{code:'recovery_key',words,expires_in_seconds:45})});
 await c.status();await c.reveal('synthetic-password');
 assert.equal(c.getPhase(),'password_required');
 await c.reveal('correctPASS12');
 assert.equal(c.getPhase(),'visible');assert.equal(count,2);c.hide();
});
test('reject malformed or altered reveal payloads',async()=>{
 for(const result of [
  {code:'recovery_key',words:words.slice(0,9),expires_in_seconds:45},
  {code:'recovery_key',words,expires_in_seconds:9999},
  {code:'recovery_key',words:null,expires_in_seconds:45}
 ]){
  const h=harness({result});await h.controller.status();await h.controller.reveal('synthetic-password');
  assert.equal(h.controller.getPhase(),'unavailable');
 }
});
test('owner switch invalidates pending words',async()=>{
 let finish,owner='account-a';const events=[];
 const c=createRecoveryViewController({currentOwner:()=>owner,onChange:x=>events.push(x),
  request:async a=>a==='status'?{code:'backup_status',backed_up:true}:new Promise(resolve=>{finish=resolve})});
 await c.status();const pending=c.reveal('synthetic-password');
 owner='account-b';c.ownerChanged();finish({code:'recovery_key',words,expires_in_seconds:45});await pending;
 assert.equal(c.getPhase(),'locked');assert.ok(!events.some(e=>e.phase==='visible'));
});
test('closing dialog invalidates pending words',async()=>{
 let finish;const events=[];
 const c=createRecoveryViewController({currentOwner:()=> 'account-a',onChange:x=>events.push(x),
  request:async a=>a==='status'?{code:'backup_status',backed_up:true}:new Promise(resolve=>{finish=resolve})});
 await c.status();const pending=c.reveal('synthetic-password');c.hide();
 finish({code:'recovery_key',words,expires_in_seconds:45});await pending;
 assert.equal(c.getPhase(),'locked');assert.ok(!events.some(e=>e.phase==='visible'));
});
test('messages provide English Chinese and Burmese',()=>{
 assert.match(recoveryViewMessage('not_recoverable','zh'),/无法重新还原/);
 assert.match(recoveryViewMessage('ready','my'),/စကားဝှက်/);
 assert.match(recoveryViewMessage('ready','en'),/original ten words/);
});

test('synchronous close during words-visible event does not rearm display timer', async()=>{
 let current='account-a',timerCount=0,controller;
 const states=[];
 controller=createRecoveryViewController({
  currentOwner:()=>current,
  onChange:e=>{states.push(e.phase); if(e.phase==='visible')controller.hide();},
  request:async action=>action==='status'
   ? {code:'backup_status',backed_up:true}
   : {code:'recovery_key',words,expires_in_seconds:45},
  setTimer:()=>{timerCount++;return 1},clearTimer:()=>{},
 });
 await controller.status();
 await controller.reveal('synthetic-password');
 assert.equal(controller.getPhase(),'locked');
 assert.equal(timerCount,0,'closed key must never re-arm the display timer');
 assert.deepEqual(states.slice(-2),['visible','locked']);
});
