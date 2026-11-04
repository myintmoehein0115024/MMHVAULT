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

test('rendering failure while showing words locks and clears sensitive view',async()=>{
 const states=[];let closeCount=0;
 const c=createRecoveryViewController({
  currentOwner:()=> 'account-a',
  onChange:e=>{
   states.push(e.phase);
   if(e.phase==='visible')throw Error('synthetic render failure');
   if(e.phase==='locked')closeCount++;
  },
  request:async action=>action==='status'?
   {code:'backup_status',backed_up:true}:
   {code:'recovery_key',words,expires_in_seconds:45},
 });
 await c.status();
 await c.reveal('synthetic-password');
 assert.equal(c.getPhase(),'unavailable');
 assert.ok(closeCount>=2,'locked event must clear the visible partial DOM');
 assert.deepEqual(states.slice(-3),['visible','locked','unavailable']);
});
test('a throwing timer setup never leaves recovery words visible',async()=>{
 const states=[];
 const c=createRecoveryViewController({
  currentOwner:()=> 'account-a',
  onChange:e=>states.push(e.phase),
  request:async action=>action==='status'?
   {code:'backup_status',backed_up:true}:
   {code:'recovery_key',words,expires_in_seconds:45},
  setTimer:()=>{throw Error('synthetic timer unavailable')},
 });
 await c.status();
 await c.reveal('synthetic-password');
 assert.equal(c.getPhase(),'unavailable');
 assert.deepEqual(states.slice(-3),['visible','locked','unavailable']);
});
test('renderer failure on lock cannot keep controller unlocked',()=>{
 const c=createRecoveryViewController({
  currentOwner:()=> 'account-a',
  onChange:e=>{if(e.phase==='locked')throw Error('synthetic DOM failure')},
  request:async()=>({code:'unavailable'}),
 });
 assert.doesNotThrow(()=>c.hide());
 assert.equal(c.getPhase(),'locked');
});

test('password rate limits show a clear safe message in three languages',async()=>{
 const events=[];
 const controller=createRecoveryViewController({
  currentOwner:()=> 'account-a', onChange:x=>events.push(x),
  request:async action=>action==='status'
   ?{code:'backup_status',backed_up:true}:{code:'too_many_attempts'}
 });
 await controller.status();await controller.reveal('synthetic-password');
 assert.equal(controller.getPhase(),'rate_limited');
 assert.ok(!('words' in events.at(-1)));
 assert.match(recoveryViewMessage('rate_limited','zh'),/稍后再试/);
 assert.match(recoveryViewMessage('rate_limited','en'),/try again later/);
 assert.match(recoveryViewMessage('rate_limited','my'),/နောက်မှ/);
});
test('non-username login method shows non-applicable status, not a false backup',async()=>{
 const events=[];
 const controller=createRecoveryViewController({
  currentOwner:()=> 'account-a',onChange:x=>events.push(x),
  request:async()=>({code:'username_only_required'})
 });
 await controller.status();
 assert.equal(controller.getPhase(),'not_supported');
 assert.ok(!('words' in events.at(-1)));
 assert.match(recoveryViewMessage('not_supported','zh'),/独立用户名/);
});


test('late A backup status cannot reset B ready state after account switch',async()=>{
 let owner='account-a',finishA;
 const events=[];
 const c=createRecoveryViewController({
  currentOwner:()=>owner,onChange:e=>events.push(e),
  request:async action=>{
   assert.equal(action,'status');
   if(owner==='account-a')return new Promise(resolve=>{finishA=resolve});
   return {code:'backup_status',backed_up:true};
  }
 });
 const pendingA=c.status();
 owner='account-b';await c.status();
 const afterB=events.length;
 assert.equal(c.getPhase(),'ready');
 finishA({code:'backup_status',backed_up:false});
 await pendingA;
 assert.equal(c.getPhase(),'ready','late A must not lock B view');
 assert.equal(events.length,afterB,'late A must not emit any B-affecting update');
});

test('late rejected status from A cannot report an error in B account',async()=>{
 let owner='account-a',rejectA;const events=[];
 const c=createRecoveryViewController({
  currentOwner:()=>owner,onChange:e=>events.push(e),
  request:async()=>owner==='account-a'?
    new Promise((_,reject)=>{rejectA=reject}):
    {code:'backup_status',backed_up:true}
 });
 const pendingA=c.status();
 owner='account-b';await c.status();
 const afterB=events.length;
 rejectA(Error('A request cancelled'));
 await pendingA;
 assert.equal(c.getPhase(),'ready');
 assert.equal(events.length,afterB,'A error must not replace B ready state');
});

test('late A plaintext response cannot hide or replace B visible Recovery Key',async()=>{
 let owner='account-a',finishA;
 const wordsB='lima mike november oscar papa quebec romeo sierra tango uniform'.split(' ');
 const events=[];let timer;
 const c=createRecoveryViewController({
  currentOwner:()=>owner,onChange:e=>events.push(e),
  request:async action=>{
   if(action==='status')return {code:'backup_status',backed_up:true};
   if(owner==='account-a')return new Promise(resolve=>{finishA=resolve});
   return {code:'recovery_key',words:wordsB,expires_in_seconds:45};
  },
  setTimer:(fn,ms)=>{timer={fn,ms};return 1},clearTimer:()=>{timer=null}
 });
 await c.status();const pendingA=c.reveal('password-for-account-a');
 owner='account-b';await c.status();await c.reveal('password-for-account-b');
 assert.equal(c.getPhase(),'visible');
 assert.deepEqual(events.at(-1).words,wordsB);
 assert.equal(timer.ms,45000);
 const afterB=events.length;
 finishA({code:'recovery_key',words,expires_in_seconds:45});
 await pendingA;
 assert.equal(c.getPhase(),'visible');
 assert.equal(events.length,afterB,'old plaintext response must be ignored entirely');
 assert.deepEqual(events.at(-1).words,wordsB);
 assert.equal(timer.ms,45000,'B auto-hide timer must not be cleared by A');
 c.hide();
});

test('late rejected reveal from A cannot cancel newer B ready state',async()=>{
 let owner='account-a',rejectA;const events=[];
 const c=createRecoveryViewController({
  currentOwner:()=>owner,onChange:e=>events.push(e),
  request:async action=>action==='status'?
   {code:'backup_status',backed_up:true}:
   new Promise((_,reject)=>{rejectA=reject})
 });
 await c.status();
 const pendingA=c.reveal('password-for-account-a');
 owner='account-b';await c.status();
 const afterB=events.length;
 rejectA(Error('old A request failed'));
 await pendingA;
 assert.equal(c.getPhase(),'ready');
 assert.equal(events.length,afterB,'old failure must not change B state');
});
