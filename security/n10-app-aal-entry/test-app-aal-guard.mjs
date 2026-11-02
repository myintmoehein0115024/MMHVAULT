// N10 isolated app-entry AAL guard tests. No network, credentials or live Supabase.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../../app.html',import.meta.url),'utf8');
const extract=(before,after)=>{
  const start=html.indexOf(before);
  assert.ok(start>=0,'Missing start anchor: '+before);
  const end=html.indexOf(after,start+before.length);
  assert.ok(end>start,'Missing end anchor: '+after);
  return html.slice(start,end);
};

const decisionSource=extract('function mmhN10AalDecisionV20261102(data){','let activeEnterUserId=""');
const decision=vm.runInNewContext(decisionSource+'\nmmhN10AalDecisionV20261102;',Object.create(null));
const cases=[
  [null,'deny'],[undefined,'deny'],[{},'deny'],
  [{currentLevel:null,nextLevel:'aal1'},'deny'],
  [{currentLevel:'aal1',nextLevel:null},'deny'],
  [{currentLevel:undefined,nextLevel:'aal2'},'deny'],
  [{currentLevel:'unknown',nextLevel:'aal1'},'deny'],
  [{currentLevel:'aal1',nextLevel:'unknown'},'deny'],
  [{currentLevel:'aal1',nextLevel:'aal1'},'allow'],
  [{currentLevel:'aal1',nextLevel:'aal2'},'step_up'],
  [{currentLevel:'aal2',nextLevel:'aal2'},'allow'],
  [{currentLevel:'aal2',nextLevel:'aal1'},'allow']
];
for(const [input,expected] of cases)assert.equal(decision(input),expected,'Fail-closed AAL table');

const enter=extract('async function enter(session){','async function copyCustomerIdV375(){');
assert.ok(enter.includes('await db.auth.mfa.getAuthenticatorAssuranceLevel()'));
assert.ok(enter.includes('mmhN10AalDecisionV20261102(a783.data)'));
assert.ok(enter.includes("if(decision==='deny')throw"));
assert.ok(enter.includes("if(decision==='step_up')"));
assert.ok(enter.includes("location.replace('login.html?mfa=1')"));
assert.ok(enter.indexOf("if(decision==='deny')")<enter.indexOf('bootGuard.remove()'),'Must block before removing boot mask');
assert.ok(enter.includes('enterTicket!==mmhP947AuthGateTicket'),'Reject stale entry auth response');

const auth=extract("db.auth.onAuthStateChange((event,session)=>{","mmhvaultAuthBootTimerV3285=setTimeout(");
const same=auth.slice(auth.indexOf('if(liveOwner===nextOwner){'));
assert.ok(same.includes('++mmhP947AuthGateTicket'),'Invalidate prior account checks');
assert.ok(same.includes("mmhP947GuardV947('switch')"),'Mask previous financial contents synchronously');
assert.ok(same.includes('mmhVaultSessionCheckPromiseV1239'),'Wait for old session reconcile');
assert.ok(same.includes('mmhVaultReconcileSessionV1239'),'Recheck even on same-user event');
assert.ok(same.includes('authTicket!==mmhP947AuthGateTicket'),'Discard stale response');
assert.ok(!same.includes('try{applyUserProfile(session.user);}') ,'Do not treat profile paint as assurance');

const reconcile=extract("async function mmhVaultReconcileSessionV1239(","window.mmhVaultHandleOnlineV1239=");
assert.ok(reconcile.includes('const aal=await db.auth.mfa.getAuthenticatorAssuranceLevel()'));
assert.ok(reconcile.includes('mmhN10AalDecisionV20261102(aal.data)'));
assert.ok(reconcile.includes("if(decision==='deny')throw"));
assert.ok(reconcile.includes("if(decision==='step_up')"));
assert.ok(reconcile.includes('startTicket!==mmhP947AuthGateTicket'));
assert.ok(reconcile.indexOf("if(decision==='deny')")<reconcile.indexOf("if(masked)mmhP947UnlockV947()"),'Check assurance before unmask');
assert.ok(reconcile.includes("location.replace('login.html?mfa=1')"));

const target=html.indexOf('function mmhN10AalDecisionV20261102');
const scriptStart=html.lastIndexOf('<script',target),scriptOpen=html.indexOf('>',scriptStart)+1,scriptEnd=html.indexOf('</script>',target);
assert.ok(scriptStart>=0&&scriptOpen>scriptStart&&scriptEnd>scriptOpen,'Find actual inline app script');
new vm.Script(html.slice(scriptOpen,scriptEnd),{filename:'app-auth-inline.js'});
console.log('PASS: 12 offline AAL decision cases, entry, same-owner refresh, stale-request guard, reconcile/unmask ordering and app script syntax.');


// Dynamic tests execute the actual isolated callback and reconciler with synthetic Auth.
// They never access live users, tokens, storage, network or the Supabase service.
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function deferred(){
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  return {promise,resolve,reject};
}
function makeReconcile(level, overrides={}){
  const record={guard:[],unlocked:0,redirect:[],loaded:0,profile:0};
  const identity={id:'synthetic-owner'};
  const ctx={
    Promise,Date,console:{warn(){}},
    currentSessionUser:identity,
    mmhP947AuthGateTicket:3,
    mmhVaultSessionCheckPromiseV1239:null,
    window:{__mmhSessionEpochV1239:7,__mmhLastCloudLoadAtV1235:Date.now(),loadAll:async()=>{record.loaded++;return {ok:true};}},
    navigator:{onLine:true},
    db:{auth:{
      getSession:async()=>({data:{session:{user:identity}}}),
      getUser:async()=>({data:{user:identity}}),
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:level})}
    }},
    document:{getElementById:()=>({hidden:false,style:{display:'flex'}})},
    mmhP947GuardV947:phase=>record.guard.push(phase),
    mmhP947UnlockV947:()=>{record.unlocked++;},
    mmhVaultSignOutCleanupV1239:()=>{throw Error('Unexpected signout');},
    applyUserProfile:()=>{record.profile++;},
    subscribeRealtime:()=>{throw Error('Unexpected realtime reconnect');},
    realtimeReady:true,
    realtimeChannelOwnerV1235:identity.id,
    location:{replace:path=>record.redirect.push(path)}
  };
  Object.assign(ctx,overrides);
  vm.runInNewContext(decisionSource+'\n'+reconcile,ctx,{timeout:2000});
  return {ctx,record,run:()=>ctx.mmhVaultReconcileSessionV1239('synthetic')};
}
{
  const {run,record}=makeReconcile({currentLevel:'aal1',nextLevel:'aal1'});
  assert.equal((await run()).ok,true,'AAL1 without step-up may complete');
  assert.equal(record.unlocked,1,'Valid assurance can release mask');
  assert.equal(record.loaded,1,'Existing mask requires cloud reload');
}
{
  const {run,record}=makeReconcile({currentLevel:'aal2',nextLevel:'aal2'});
  assert.equal((await run()).ok,true,'Verified AAL2 can complete');
  assert.equal(record.unlocked,1);
}
for(const invalid of [null,{}, {currentLevel:null,nextLevel:'aal1'},{currentLevel:'aal1',nextLevel:null},{currentLevel:'surprise',nextLevel:'aal1'}]){
  const {run,record}=makeReconcile(invalid);
  assert.equal((await run()).ok,false,'Malformed assurance must fail closed');
  assert.equal(record.unlocked,0,'Never unlock on malformed assurance');
  assert.ok(record.guard.includes('error'),'Malformed assurance must keep error mask');
}
{
  const {run,record}=makeReconcile({currentLevel:'aal1',nextLevel:'aal2'});
  const result=await run();
  assert.equal(result.mfaRequired,true,'AAL1 with verified-factor requirement must step up');
  assert.deepEqual(record.redirect,['login.html?mfa=1']);
  assert.equal(record.unlocked,0,'Never unlock pending MFA');
}
{
  const gate=deferred();
  const {run,record,ctx}=makeReconcile(null,{
    db:{auth:{
      getSession:async()=>({data:{session:{user:{id:'synthetic-owner'}}}}),
      getUser:async()=>({data:{user:{id:'synthetic-owner'}}}),
      mfa:{getAuthenticatorAssuranceLevel:()=>gate.promise}
    }}
  });
  const task=run();
  await flush();
  ctx.mmhP947AuthGateTicket++;
  gate.resolve({data:{currentLevel:'aal2',nextLevel:'aal2'}});
  assert.equal((await task).superseded,true,'Late assurance after a newer auth event must be discarded');
  assert.equal(record.unlocked,0,'Late assurance cannot unmask previously rendered private data');
}
{
  const gate=deferred();
  const {run,record,ctx}=makeReconcile({currentLevel:'aal1',nextLevel:'aal1'});
  ctx.window.loadAll=()=>gate.promise;
  const task=run();
  await flush();
  ctx.window.__mmhSessionEpochV1239++;
  gate.resolve({ok:true});
  assert.equal((await task).superseded,true,'Late cloud data after session switch must be discarded');
  assert.equal(record.unlocked,0,'Late cloud load cannot unlock a new session');
}
{
  let callback;
  const record={guards:[],rechecks:0,profile:0};
  const authSource=auth;
  const ctx={
    Promise,console:{warn(){}},
    db:{auth:{onAuthStateChange:cb=>{callback=cb;}}},
    currentSessionUser:{id:'synthetic-owner'},
    mmhP947AuthGateTicket:0,
    mmhVaultSessionCheckPromiseV1239:null,
    mmhP947GuardV947:phase=>record.guards.push(phase),
    mmhVaultReconcileSessionV1239:async()=>{record.rechecks++;return {ok:true};},
    applyUserProfile:()=>{record.profile++;},
    mmhvaultFinishAuthBootV3285:()=>{throw Error('Unexpected boot');},
    mmhvaultAuthBootSettledV3285:true,
    sessionStorage:{removeItem(){}},
    location:{replace(){}},
    window:{mmhVaultSwitchSessionV1239:async()=>({ok:true})}
  };
  vm.runInNewContext(authSource,ctx,{timeout:2000});
  assert.equal(typeof callback,'function');
  callback('TOKEN_REFRESHED',{user:{id:'synthetic-owner'}});
  assert.deepEqual(record.guards,['switch'],'Same-owner refresh must synchronously mask');
  assert.equal(record.profile,0,'Do not repaint profile as proof of MFA assurance');
  await flush();
  assert.equal(record.rechecks,1,'Same-owner refresh must actually re-evaluate session');
  const pending=deferred();
  ctx.mmhVaultSessionCheckPromiseV1239=pending.promise;
  callback('TOKEN_REFRESHED',{user:{id:'synthetic-owner'}});
  callback('SIGNED_IN',{user:{id:'synthetic-owner'}});
  pending.resolve({ok:true});
  await flush();
  assert.equal(record.rechecks,2,'Obsolete concurrent refresh must not trigger redundant recheck');
  assert.equal(record.guards.filter(x=>x==='switch').length,3,'Each auth transition must mask synchronously');
}
console.log('PASS: dynamic synthetic session reconciliation, malformed AAL, MFA step-up, stale async results and same-owner refresh.');
