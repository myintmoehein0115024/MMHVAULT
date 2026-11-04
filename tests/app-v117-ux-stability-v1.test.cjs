/* APP V11.7 UX stability: same-owner privacy gate contracts, no credentials/network. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.html'),'utf8');
const hierarchy=fs.readFileSync(require('node:path').join(__dirname,'../js/mmhvault-v11-manage-hierarchy-live.mjs'),'utf8');
const begin=app.indexOf('function mmhVaultCanQuietVerifyV1239(owner){');
const end=app.indexOf('// Keep the callback synchronous;',begin);
assert.ok(begin>=0&&end>begin,'quiet verification helper is present');
const source=app.slice(begin,end);
const NOW=1800000000000, OWNER='test-owner-a';
function guard({owner=OWNER,profile=OWNER,config=OWNER,wallet=OWNER,history=[{user_id:OWNER}],
 cloudAge=10000,offline=false,mask=false}={}){
 const scope={
  currentSessionUser:profile?{id:profile}:null,
  MMHVAULT_CONFIG_OWNER:config,
  window:{mmhWalletDataOwnerV191:wallet,transactions:history,
    __mmhLastCloudLoadAtV1235:NOW-cloudAge},
  document:{getElementById:()=>mask?{hidden:false,style:{display:'flex'}}:null},
  navigator:{onLine:!offline},
  Date:{now:()=>NOW},
  Array,Number
 };
 const fn=vm.runInNewContext(source+'\nmmhVaultCanQuietVerifyV1239',scope);
 return fn(owner);
}
test('same owner with verified recent cloud and all owned rows may quietly refresh',()=>{
 assert.equal(guard(),true);
});
test('owner mismatch, stale graph or cross-owner rows always use privacy mask',()=>{
 assert.equal(guard({profile:'test-owner-b'}),false);
 assert.equal(guard({config:'test-owner-b'}),false);
 assert.equal(guard({wallet:'test-owner-b'}),false);
 assert.equal(guard({history:[{user_id:'test-owner-b'}]}),false);
 assert.equal(guard({history:null}),false);
});
test('unverified, old, offline or already guarded sessions cannot quietly resume',()=>{
 assert.equal(guard({cloudAge:16*60*1000}),false);
 assert.equal(guard({cloudAge:0,mask:true}),false);
 assert.equal(guard({offline:true}),false);
 assert.equal(guard({profile:null}),false);
});
test('focus and token-refresh still call full Auth + MFA verification',()=>{
 assert.match(app,/event==='SIGNED_IN'\|\|event==='TOKEN_REFRESHED'/);
 assert.match(app,/const quietResume=!fromBackForwardCache/);
 assert.match(app,/const requiresFreshMask=fromBackForwardCache/);
 assert.match(app,/await db\.auth\.getUser\(\)/);
 assert.match(app,/getAuthenticatorAssuranceLevel\(\)/);
 assert.match(app,/if\(cloud\?\.ok!==true\)\{mmhP947GuardV947\('error'\)/);
 assert.match(app,/if\(quietResume\)Promise\.resolve\(reconcile\)/);
 assert.match(app,/if\(!quietRefresh\)mmhP947GuardV947\('switch'\)/);
 assert.match(app,/const switchTicket=\+\+mmhP947AuthGateTicket;[\s\S]{0,240}mmhP947GuardV947\('switch'\)/);
});
test('auto paths only read existing complete active owner choices; no silent inserts',()=>{
 assert.match(hierarchy,/function firstLinkedPath\(direction,typeId='',transactionId=''\)/);
 assert.match(hierarchy,/if\(!ledgerKind\(txn.kindId\)\?\.group\)continue/);
 assert.match(hierarchy,/const cat=controller\.list\('category',txn.id\)\[0\]/);
 assert.match(hierarchy,/selection=firstLinkedPath\(next\)\|\|\{type:'',transaction:'',category:''\}/);
 assert.match(hierarchy,/selection=firstLinkedPath\(picked\?\.ledgerType\|\|'',id\)/);
 assert.match(hierarchy,/selection=firstLinkedPath\(directionFilter,selection.type,id\)/);
 assert.doesNotMatch(source,/\b(?:insert|upsert|signOut|update)\s*\(/);
});
