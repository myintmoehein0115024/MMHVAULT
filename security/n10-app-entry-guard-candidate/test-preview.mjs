// N10 standalone workspace MFA gate candidate — offline review only.
// No real account, endpoint, Auth credential, financial data, SQL or deploy.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {assessWorkspaceMfa} from './guard.mjs';
import {generateAppEntryPreview} from './preview.mjs';

const uid='synthetic-A',other='synthetic-B';
function fakeAuth(overrides={}) {
  const settings={
    currentLevel:'aal1',nextLevel:'aal1',factors:[],user:uid,
    firstToken:'TOKEN_A',secondToken:'TOKEN_A',...overrides
  };
  let sessions=0;
  return {
    getSession:async()=>{
      sessions++;
      return settings.sessionError?{error:new Error('offline')}:
        {data:{session:{user:{id:settings.sessionOwner||uid},
           access_token:sessions>1?settings.secondToken:settings.firstToken}}};
    },
    getUser:async()=>settings.userError?{error:new Error('auth_unavailable')}:
      {data:{user:{id:settings.user,is_anonymous:!!settings.anonymous}}},
    mfa:{
      listFactors:async()=>settings.factorsError?{error:new Error('factors_unavailable')}:
        {data:settings.inventoryMissing?{totp:[]}:{all:settings.factors}},
      getAuthenticatorAssuranceLevel:async()=>settings.aalError?{error:new Error('aal_unavailable')}:
        {data:{currentLevel:settings.currentLevel,nextLevel:settings.nextLevel}}
    }
  };
}
const verified={id:'synthetic-factor',status:'verified',factor_type:'totp'};
const unknown={id:'other',status:'new-status'};
const cases=[
  ['ordinary no-MFA login allowed',{},'allow'],
  ['verified MFA + fresh AAL2 allowed',{currentLevel:'aal2',nextLevel:'aal2',factors:[verified]},'allow'],
  ['verified factor with AAL1 requires challenge',{nextLevel:'aal2',factors:[verified]},'challenge'],
  ['legacy null AAL with verified factor requires challenge',{currentLevel:null,nextLevel:'aal2',factors:[verified]},'challenge'],
  ['missing nextLevel refused',{nextLevel:null},'deny'],
  ['unknown nextLevel refused',{nextLevel:'aal3'},'deny'],
  ['missing currentLevel without MFA refused',{currentLevel:null},'deny'],
  ['verified factor conflicting with AAL1 refused',{factors:[verified]},'deny'],
  ['claimed next AAL2 without verified factor refused',{nextLevel:'aal2'},'deny'],
  ['stale AAL2 after factor removal refused',{currentLevel:'aal2'},'deny'],
  ['unknown verified-factor status refused',{factors:[unknown]},'deny'],
  ['unknown factors inventory refused',{inventoryMissing:true},'deny'],
  ['Auth is unavailable refused',{userError:true},'deny'],
  ['MFA lookup unavailable refused',{aalError:true},'deny'],
  ['factor listing unavailable refused',{factorsError:true},'deny'],
  ['session lookup unavailable refused',{sessionError:true},'deny'],
  ['user identity mismatch refused',{user:other},'deny'],
  ['cached session owner mismatch refused',{sessionOwner:other},'deny'],
  ['anonymous user refused',{anonymous:true},'deny'],
  ['signout/refresh while checking refused',{secondToken:null},'deny'],
  ['new same-UID token during check refused',{secondToken:'CHANGED_TOKEN'},'deny'],
];
for(const [name,opts,result] of cases) {
  assert.equal(await assessWorkspaceMfa(fakeAuth(opts),uid),result,name);
  console.log('PASS',name);
}
assert.equal(await assessWorkspaceMfa(fakeAuth(),other),'deny');
assert.equal(await assessWorkspaceMfa(null,uid),'deny');

const source=readFileSync('app.html','utf8');
assert.ok(source.length>1000000,'must review the full actual main app.html');
const patched=generateAppEntryPreview(source);
assert.ok(patched.length>source.length,'candidate should only add guards');
assert.equal(source.includes('mmhN10AssessWorkspaceMfaV1100'),false,
  'app.html must remain unchanged in branch');
assert.match(patched,/if\(n10Decision!=='allow'\)throw Error\('n10_app_mfa_unverified'\)/);
assert.match(patched,/const n10Version=\+\+mmhN10GateVersionV1100/);
assert.match(patched,/const n10Ticket=\+\+mmhP947AuthGateTicket/);
assert.match(patched,/if\(currentSessionUser\?\.id\)mmhP947GuardV947\('switch'\)/);
assert.match(patched,/const n10Result=await mmhN10AssessWorkspaceMfaV1100\(db\.auth,owner\)/);
assert.match(patched,/if\(n10Result!=='allow'\)\{mmhP947GuardV947\('error'\)/);
assert.doesNotMatch(patched,/\bconst a783=await db\.auth\.mfa\.getAuthenticatorAssuranceLevel\(\);/);

// Exercise the exact guard that would be injected, not a separate duplicate.
const beg=patched.indexOf('async function mmhN10AssessWorkspaceMfaV1100(');
const end=patched.indexOf('let mmhN10GateVersionV1100=0;',beg);
assert.ok(beg>=0&&end>beg,'missing pasted helper');
const helper=runInNewContext('('+patched.slice(beg,end).trim()+')');
for(const [name,opts,result] of cases) {
  assert.equal(await helper(fakeAuth(opts),uid),result,'injected helper: '+name);
}
// This test performs no writeFile or fs mutation. Finance content is unchanged.
for(const marker of [
  'function balance(a){','function totalAssetMMK(){',
  'function expenseMMK(){','function mmhVaultAccountMeta('
]) {
  const i=source.indexOf(marker);
  assert.ok(i>=0, 'missing untouched finance anchor '+marker);
  assert.equal(patched.slice(patched.indexOf(marker),patched.indexOf(marker)+1400),
    source.slice(i,i+1400),'finance source must not change: '+marker);
}

// Run the real patched same-UID branch in an isolated VM. Verify the
// privacy mask is synchronous and only the current owner may unlock.
const sameStart=patched.indexOf('    if(liveOwner===nextOwner){');
const sameEnd=patched.indexOf('    if(mmhvaultAuthBootSettledV3285)',sameStart);
assert.ok(sameStart>=0&&sameEnd>sameStart);
const sameBranch=patched.slice(sameStart,sameEnd);
assert.match(sameBranch,/mmhP947GuardV947\('switch'\)/);
async function exerciseSameOwner(decision, invalidate=false, invalidateVersion=false) {
  const events=[];
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const env={
    mmhP947AuthGateTicket:0,
    mmhN10GateVersionV1100:0,
    currentSessionUser:{id:uid},
    db:{auth:{}},
    mmhP947GuardV947:phase=>events.push('mask:'+phase),
    mmhP947UnlockV947:()=>events.push('unlock'),
    mmhN10AssessWorkspaceMfaV1100:async()=>gate,
    applyUserProfile:user=>events.push('profile:'+user.id),
    location:{replace:()=>events.push('redirect')},
    console,Promise
  };
  const handle=runInNewContext(
    '(function(liveOwner,nextOwner,session){'+sameBranch+'})',env);
  handle(uid,uid,{user:{id:uid}});
  assert.deepEqual(events,['mask:switch'],'account must mask before async verification');
  if(invalidate) {
    env.mmhP947AuthGateTicket+=1;
    env.currentSessionUser={id:other};
  }
  if(invalidateVersion) env.mmhN10GateVersionV1100+=1;
  release(decision);
  await new Promise(setImmediate);
  return events;
}
assert.deepEqual(await exerciseSameOwner('allow'),
  ['mask:switch','profile:'+uid,'unlock']);
assert.deepEqual(await exerciseSameOwner('challenge'),
  ['mask:switch','redirect']);
assert.deepEqual(await exerciseSameOwner('deny'),
  ['mask:switch','mask:error']);
assert.deepEqual(await exerciseSameOwner('allow',true),
  ['mask:switch'],'stale owner must not unlock');
assert.deepEqual(await exerciseSameOwner('allow',false,true),
  ['mask:switch'],'a newer resume check must not be overridden by old same-owner result');
assert.deepEqual(await exerciseSameOwner('deny',false,true),
  ['mask:switch'],'stale failed request must not overwrite the current resume mask');
const startResume=patched.indexOf("async function mmhVaultReconcileSessionV1239(reason='resume'");
const endResume=patched.indexOf('window.mmhVaultHandleOnlineV1239=',startResume);
const resume=patched.slice(startResume,endResume);
assert.ok(startResume>=0&&endResume>startResume);
assert.match(resume,/const n10Version=\+\+mmhN10GateVersionV1100/);
assert.match(resume,/if\(n10Version!==mmhN10GateVersionV1100\|\|startTicket!==mmhP947AuthGateTicket/);
console.log('PASS same-owner mask, AAL2 challenge, fail-closed and stale owner races');

// Exercise the actual preview's LAST resume decision as a live VM function.
// A concurrent sign-in must not unmask private UI even after AAL succeeded.
const finalStart=patched.indexOf('      // Last check before painting private account UI or releasing the mask.');
const finalEnd=patched.indexOf('      return {ok:true};',finalStart);
assert.ok(finalStart>=0&&finalEnd>finalStart,'missing final resume guard');
const finalBody=patched.slice(finalStart,finalEnd);
assert.match(finalBody,/n10Version!==mmhN10GateVersionV1100/);
assert.match(finalBody,/startTicket!==mmhP947AuthGateTicket/);
assert.match(finalBody,/startEpoch!==/);
assert.match(finalBody,/currentSessionUser\?\.id!==owner/);
function exerciseResumeFinal(options={}) {
  const events=[];
  const env={
    n10Version:10,mmhN10GateVersionV1100:10,
    startTicket:6,mmhP947AuthGateTicket:6,
    startEpoch:15,window:{__mmhSessionEpochV1239:15},
    currentSessionUser:{id:uid},owner:uid,
    verified:{user:{id:uid}},navigator:{onLine:true},
    opts:{forceRealtime:false},realtimeReady:true,realtimeChannelOwnerV1235:uid,
    reason:'test',masked:true,
    applyUserProfile:user=>events.push('profile:'+user.id),
    subscribeRealtime:()=>events.push('realtime'),
    mmhP947UnlockV947:()=>events.push('unlock'),
    ...options
  };
  const fn=runInNewContext('(()=>{'+finalBody+'})',env);
  const result=fn();
  return {events,result};
}
assert.deepEqual(exerciseResumeFinal().events,['profile:'+uid,'unlock']);
for(const [name,overrides] of [
  ['a newer same-account verification', {mmhN10GateVersionV1100:11}],
  ['session switch started during cloud read', {mmhP947AuthGateTicket:7}],
  ['cloud owner epoch changed', {window:{__mmhSessionEpochV1239:16}}],
  ['owner switched', {currentSessionUser:{id:other}}]
]) {
  const x=exerciseResumeFinal(overrides);
  assert.deepEqual(x.events,[],'stale '+name+' must not paint/unlock');
  assert.equal(x.result?.superseded,true,'stale '+name+' must be discarded');
}
console.log('PASS final resume unlock rejects overlapping refresh, owner and epoch changes');

const drift=source.replace('  const a783=await db.auth.mfa.getAuthenticatorAssuranceLevel();',
  '  const a783=/* changed upstream */ await db.auth.mfa.getAuthenticatorAssuranceLevel();');
assert.throws(()=>generateAppEntryPreview(drift),/drift|patch/);
assert.throws(()=>generateAppEntryPreview('short'),/full app/);
console.log((cases.length+2)+' synthetic MFA verdict checks passed');
console.log('In-memory entry/same-owner/resume guards and finance scope check PASS');
