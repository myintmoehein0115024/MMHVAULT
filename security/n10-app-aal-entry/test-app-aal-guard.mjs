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
  [{currentLevel:null,nextLevel:'aal1'},'legacy'],
  [{currentLevel:null,nextLevel:'aal2'},'step_up'],
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
assert.ok(enter.includes("if(decision==='legacy')"),'Legacy AAL1 must be conditionally verified');
assert.ok(enter.includes('mmhN10ConfirmLegacyAalV20261102(session.user.id'),'Legacy AAL1 cannot unlock without fresh identity checks');

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
assert.ok(reconcile.includes("if(decision==='legacy')"),'Legacy AAL1 must reverify account and MFA');
assert.ok(reconcile.includes('mmhN10ConfirmLegacyAalV20261102(owner'),'Legacy AAL1 must use the verified owner');
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
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:level}),
        listFactors:async()=>({data:{all:[]}})
      }
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
for(const invalid of [null,{}, {currentLevel:undefined,nextLevel:'aal1'},{currentLevel:'aal1',nextLevel:null},{currentLevel:'surprise',nextLevel:'aal1'}]){
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

{
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'});
  assert.equal((await run()).ok,true,'Legacy null AAL1 plus server-verified owner/session may pass');
  assert.equal(record.unlocked,1,'Verified legacy AAL1 may unmask');
}
{
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal2'});
  assert.equal((await run()).mfaRequired,true,'Legacy null AAL must never bypass a verified MFA requirement');
  assert.equal(record.unlocked,0,'MFA pending must remain masked');
}
{
  let checks=0;
  const owner={id:'synthetic-owner'},stranger={id:'synthetic-stranger'};
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:owner}}}),
      getUser:async()=>({data:{user:++checks===1?owner:stranger}}),
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}})}
    }}
  });
  assert.equal((await run()).ok,false,'Fresh second owner check must match for legacy allowance');
  assert.equal(record.unlocked,0);
}
{
  let checks=0;
  const owner={id:'synthetic-owner'},stranger={id:'synthetic-stranger'};
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:++checks===1?owner:stranger}}}),
      getUser:async()=>({data:{user:owner}}),
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}})}
    }}
  });
  assert.equal((await run()).ok,false,'Fresh second session check must match for legacy allowance');
  assert.equal(record.unlocked,0);
}
{
  let checks=0;
  const owner={id:'synthetic-owner'};
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:owner}}}),
      getUser:async()=>({data:{user:owner}}),
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:++checks===1?
          {currentLevel:null,nextLevel:'aal1'}:{currentLevel:'aal1',nextLevel:'aal2'}}),
        listFactors:async()=>({data:{all:[]}})
      }
    }}
  });
  assert.equal((await run()).ok,false,'MFA becoming required during legacy checks must deny unlock');
  assert.equal(record.unlocked,0);
}
{
  let checks=0;
  const deferredIdentity=deferred(),owner={id:'synthetic-owner'};
  const {run,record,ctx}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:owner}}}),
      getUser:()=>++checks===1?Promise.resolve({data:{user:owner}}):deferredIdentity.promise,
      mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}})}
    }}
  });
  const pending=run();
  await flush();
  ctx.mmhP947AuthGateTicket++;
  deferredIdentity.resolve({data:{user:owner}});
  assert.equal((await pending).superseded,true,'A newer auth event invalidates old legacy recheck');
  assert.equal(record.unlocked,0,'Expired legacy check must not unmask');
}

{
  const owner={id:'synthetic-owner'};
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:owner}}}),
      getUser:async()=>({data:{user:owner}}),
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}}),
        listFactors:async()=>({data:{all:[{id:'synthetic-factor',status:'verified'}]}})
      }
    }}
  });
  assert.equal((await run()).ok,false,'Old AAL cannot bypass a newly verified MFA factor');
  assert.equal(record.unlocked,0);
}
for(const inventory of [{data:{}},{data:null},{error:Error('temporary MFA inventory unavailable')}]) {
  const owner={id:'synthetic-owner'};
  const {run,record}=makeReconcile({currentLevel:null,nextLevel:'aal1'},{
    db:{auth:{
      getSession:async()=>({data:{session:{user:owner}}}),
      getUser:async()=>({data:{user:owner}}),
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}}),
        listFactors:async()=>inventory
      }
    }}
  });
  assert.equal((await run()).ok,false,'Missing or failed factor inventory must deny legacy allowance');
  assert.equal(record.unlocked,0);
}

console.log('PASS: verified legacy null AAL1, MFA enrollment race, cross-owner/session denial and stale-identity denial.');

{
  // Execute the actual app entry prefix before any financial boot or visible UI.
  const enterPrefix=enter.slice(0,enter.indexOf('  const expectedLinkedUid='));
  assert.ok(enterPrefix.includes("if(decision==='legacy')"),'Entry contains legacy recheck');
  const entryRuntime=enterPrefix+'\n    return {ok:true,entryPassed:true};\n  }';
  const runEntry=async (level,options={})=>{
    const record={redirects:[],guard:[],remoteChecks:0,sessionChecks:0,factorChecks:0};
    const user={id:'synthetic-owner'};
    const ctx={
      Promise,
      mmhP947AuthGateTicket:4,
      db:{auth:{
        getUser:async()=>{record.remoteChecks++;return {data:{user:options.wrongOwner?{id:'other-owner'}:user}};},
        getSession:async()=>{record.sessionChecks++;return {data:{session:{user:options.wrongSession?{id:'other-owner'}:user}}};},
        mfa:{
          getAuthenticatorAssuranceLevel:async()=>({data:level}),
          listFactors:async()=>{record.factorChecks++;return options.factorError?{error:Error('unavailable')}:{data:{all:options.factors??[]}};}
        }
      }},
      mmhP947GuardV947:phase=>record.guard.push(phase),
      location:{replace:path=>record.redirects.push(path)}
    };
    vm.runInNewContext(decisionSource+'\n'+entryRuntime,ctx,{timeout:2000});
    const res=await ctx.enter({user});
    return {res,record,ctx};
  };
  {
    const {res,record}=await runEntry({currentLevel:'aal1',nextLevel:'aal1'});
    assert.equal(res.entryPassed,true,'Normal AAL1 app entry is unaffected');
    assert.equal(record.factorChecks,0,'Normal signed AAL1 does not require legacy-only factor RPC');
  }
  {
    const {res}=await runEntry({currentLevel:'aal2',nextLevel:'aal2'});
    assert.equal(res.entryPassed,true,'Normal signed AAL2 app entry is unaffected');
  }
  {
    const {res,record}=await runEntry({currentLevel:null,nextLevel:'aal1'});
    assert.equal(res.entryPassed,true,'Verified legacy null+AAL1 app entry succeeds');
    assert.equal(record.remoteChecks,1,'Legacy entry revalidates server user');
    assert.equal(record.sessionChecks,1,'Legacy entry checks exact current session');
    assert.equal(record.factorChecks,1,'Legacy entry must inspect live MFA factors');
  }
  {
    const {res,record}=await runEntry({currentLevel:null,nextLevel:'aal2'});
    assert.equal(res.mfaRequired,true,'Legacy null with enrolled MFA must challenge');
    assert.deepEqual(record.redirects,['login.html?mfa=1']);
  }
  for(const opts of [{wrongOwner:true},{wrongSession:true},{factors:[{status:'verified'}]},{factorError:true}]){
    const user={id:'synthetic-owner'};
    let denied=false;
    const ctx={
      Promise,mmhP947AuthGateTicket:4,
      db:{auth:{
        getUser:async()=>({data:{user:opts.wrongOwner?{id:'other-owner'}:user}}),
        getSession:async()=>({data:{session:{user:opts.wrongSession?{id:'other-owner'}:user}}}),
        mfa:{
          getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:null,nextLevel:'aal1'}}),
          listFactors:async()=>opts.factorError?{error:Error('unavailable')}:{data:{all:opts.factors??[]}}
        }
      }},
      location:{replace:()=>{throw Error('Unexpected navigation on denied legacy entry');}},
      mmhP947GuardV947:()=>{}
    };
    vm.runInNewContext(decisionSource+'\n'+entryRuntime,ctx,{timeout:2000});
    try{await ctx.enter({user});}catch(e){denied=e.message==='mfa_status_unavailable';}
    assert.equal(denied,true,'Legacy app entry must throw on mismatched identity/session/factor error');
  }
  {
    const delayed=deferred();
    const ctx={
      Promise,mmhP947AuthGateTicket:4,
      db:{auth:{
        mfa:{getAuthenticatorAssuranceLevel:()=>delayed.promise},
        getUser:async()=>{throw Error('Stale entry must not check user');}
      }},
      location:{replace:()=>{throw Error('Stale entry must not redirect');}},
      mmhP947GuardV947:()=>{}
    };
    vm.runInNewContext(decisionSource+'\n'+entryRuntime,ctx,{timeout:2000});
    const run=ctx.enter({user:{id:'synthetic-owner'}});
    ctx.mmhP947AuthGateTicket++;
    delayed.resolve({data:{currentLevel:'aal2',nextLevel:'aal2'}});
    assert.equal((await run).superseded,true,'Stale first-entry assurance must be discarded');
  }
  const login=readFileSync(new URL('../../login.html',import.meta.url),'utf8');
  const loginStart=login.indexOf('async function verifiedRedirectV946(');
  assert.ok(loginStart>=0,'Find actual login redirect');
  const redirect=login.slice(loginStart,login.indexOf('function openForm(',loginStart));
  assert.ok(redirect.includes("if(nextLevel==='aal2'&&currentLevel!=='aal2')"),'Login must challenge for legacy null + required MFA');
  assert.ok(redirect.includes('await mmhShowMfaChallengeV783(expectedUserId)'),'Login must open MFA challenge');
  assert.ok(redirect.includes("if(nextLevel!=='aal1'&&nextLevel!=='aal2')throw"),'Login must reject missing next AAL');
}
console.log('PASS: synthetic app entry for normal/legacy AAL, invalid users, factor state, stale responses, and login MFA routing.');



{
  // Cross-owner events must cancel an in-flight AAL check synchronously,
  // not wait until the queued switch function starts in a microtask.
  let callback;
  const guards=[],switches=[];
  let owner={id:'synthetic-owner-a'};
  const ctx={
    Promise,
    console:{warn(){}},
    currentSessionUser:owner,
    mmhP947AuthGateTicket:7,
    mmhvaultAuthBootSettledV3285:true,
    db:{auth:{onAuthStateChange:cb=>{callback=cb;}}},
    mmhP947GuardV947:phase=>guards.push(phase),
    mmhVaultReconcileSessionV1239:async()=>({ok:true}),
    mmhvaultFinishAuthBootV3285:()=>{},
    mmhVaultSignOutCleanupV1239:()=>{},
    mmhVaultSessionCheckPromiseV1239:null,
    window:{mmhVaultSwitchSessionV1239:async ses=>{switches.push(ses.user.id);return {ok:false};}},
    applyUserProfile:()=>{},
    sessionStorage:{removeItem(){}},
    location:{replace(){}}
  };
  vm.runInNewContext(auth,ctx,{timeout:2000});
  assert.equal(typeof callback,'function','Install synthetic Auth observer');
  callback('SIGNED_IN',{user:{id:'synthetic-owner-b'}});
  assert.equal(ctx.mmhP947AuthGateTicket,8,'Switch invalidates prior verification before first microtask');
  assert.deepEqual(guards,['switch'],'Switch must cover private DOM immediately');
  assert.deepEqual(switches,[],'Switch is scheduled asynchronously');
  await flush();
  assert.deepEqual(switches,['synthetic-owner-b'],'Switch eventually runs with new owner');
  ctx.currentSessionUser=null;
  callback('SIGNED_IN',{user:{id:'synthetic-owner-c'}});
  assert.equal(ctx.mmhP947AuthGateTicket,9,'Ownerless resume invalidates old checks immediately');
  assert.deepEqual(guards,['switch','switch'],'Ownerless resume masks pending data immediately');
  await flush();
  assert.deepEqual(switches,['synthetic-owner-b','synthetic-owner-c']);
}

console.log('PASS: dynamic synthetic session reconciliation, malformed AAL, MFA step-up, stale async results and same-owner refresh.');
