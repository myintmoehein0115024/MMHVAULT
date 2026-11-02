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
