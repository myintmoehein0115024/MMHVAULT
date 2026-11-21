// OFFLINE / SYNTHETIC. Extracts the actual (hard-OFF) Security Center Vault
// request guard and runs it against injected Auth/fetch doubles. Zero network.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('js/mmhvault-n10-a7-83-security-center.js','utf8');
const start=source.indexOf('async function vaultBoundedResponse(response){');
const end=source.indexOf('function vaultStatusMode(mode){',start);
assert.ok(start>0&&end>start&&end-start>3000,'missing hardened candidate');
const candidate=source.slice(start,end);
const account='41111111-1111-4111-8111-111111111111';
const words='alpha bravo charlie delta echo foxtrot golf hotel india juliet'.split(' ');
const token='SYNTHETIC-UNSIGNED-NOT-A-JWT';
function response(body,{ok=true,type='application/json; charset=utf-8',len=null,redirected=false}={}){
 const data=new TextEncoder().encode(JSON.stringify(body));
 return {
  ok,redirected,headers:{get:key=>key==='content-type'?type:key==='content-length'?len:null},
  body:{getReader:()=>{let sent=false;return {
   read:async()=>sent?{done:true}:{done:false,value:data,then:undefined},
   cancel:async()=>{},
   releaseLock(){}
  }}}
 };
}
function setup({release=false,status={code:'backup_status',backed_up:true},
                 mutation=null,origin='https://mmhvault.com',responseOptions={}}={}){
 let calls=0,authCalls=0,activeId=account,activeToken=token;
 const auth={
  getUser:async jwt=>{authCalls++;return {data:{user:{id:jwt===activeToken?activeId:'other',is_anonymous:false}},error:null}},
  getSession:async()=>({data:{session:{access_token:activeToken,user:{id:activeId}}},error:null})
 };
 // Simulated state changes occur while the request is in flight.
 const fetcher=async()=>{
  calls++;
  if(mutation==='switchOwner')activeId='42222222-2222-4222-8222-222222222222';
  if(mutation==='rotateToken')activeToken='DIFFERENT-UNSIGNED-TOKEN';
  const result=response(status,responseOptions);
  let readCount=0;
  result.body.getReader=()=>({
   read:async()=>{readCount++;return readCount===1?
    {done:false,value:new TextEncoder().encode(JSON.stringify(status))}:{done:true}},
   cancel:async()=>{},releaseLock(){}
  });
  return result;
 };
 const ctx={
  N10_FIXED_VAULT_UI_RELEASED:release,
  VAULT_API:'https://vrypucmyrztxgiqhjspd.supabase.co/functions/v1/mmh-n10-fixed-recovery',
  location:{origin},verifiedUser:async()=>({user:{id:account},jwt:token}),
  client:()=>({auth}),fetch:fetcher,TextDecoder,Uint8Array,
  AbortController,setTimeout,clearTimeout
 };
 runInNewContext(candidate+'\nthis.callVault=vaultApi;',ctx);
 return {callVault:(action,fields)=>ctx.callVault(action,fields),get fetchCount(){return calls;},get authCount(){return authCalls;}};
}
test('review candidate remains hard-OFF at source entry',()=>{
 assert.match(source,/const N10_FIXED_VAULT_UI_RELEASED=false;/);
 assert.match(source,/async function vaultApi\(action,extra=\{\}\)\{\s*if\(!N10_FIXED_VAULT_UI_RELEASED\)throw Error\('vault_release_locked'\)/);
});
test('disabled flag prevents credentials and any fetch',async()=>{
 const h=setup();
 await assert.rejects(h.callVault('status'),/vault_release_locked/);
 assert.equal(h.fetchCount,0);assert.equal(h.authCount,0);
});
test('valid signed-account synthetic status does not accept plaintext words',async()=>{
 const h=setup({release:true});
 const r=await h.callVault('status');
 assert.equal(r.ok,true);assert.equal(r.body.code,'backup_status');
 assert.equal(r.body.backed_up,true);assert.equal(h.fetchCount,1);
 assert.equal(h.authCount,2);
});
test('revealed words are allowed only for reveal response in a stable session',async()=>{
 const h=setup({release:true,status:{code:'recovery_key',words,expires_in_seconds:45}});
 const r=await h.callVault('reveal',{password:'synthetic-password'});
 assert.equal(r.ok,true);assert.deepEqual(Array.from(r.body.words),words);
});
test('status action must reject any attempted recovery-key disclosure',async()=>{
 const h=setup({release:true,status:{code:'recovery_key',words,expires_in_seconds:45}});
 await assert.rejects(h.callVault('status'),/vault_unexpected_disclosure/);
});
test('no backup status can be accepted as reveal',async()=>{
 const h=setup({release:true,status:{code:'backup_status',backed_up:true}});
 await assert.rejects(h.callVault('reveal',{password:'synthetic-password'}),/vault_response_mismatch/);
});
test('owner switching during response fails closed',async()=>{
 const h=setup({release:true,mutation:'switchOwner'});
 await assert.rejects(h.callVault('reveal',{password:'synthetic-password'}),/vault_session_changed/);
});
test('rotating a session token during response fails closed',async()=>{
 const h=setup({release:true,mutation:'rotateToken'});
 await assert.rejects(h.callVault('status'),/vault_session_changed/);
});
test('oversized content-length fails even before parsing',async()=>{
 const h=setup({release:true,responseOptions:{len:'2501'}});
 await assert.rejects(h.callVault('status'),/vault_bad_response/);
});
test('wrong content type and origin are rejected',async()=>{
 const h=setup({release:true,responseOptions:{type:'text/html'}});
 await assert.rejects(h.callVault('status'),/vault_bad_response/);
 const other=setup({release:true,origin:'https://example.invalid'});
 await assert.rejects(other.callVault('status'),/vault_bad_action/);
 assert.equal(other.fetchCount,0);
});
test('invalid action never transmits',async()=>{
 const h=setup({release:true});
 await assert.rejects(h.callVault('rotate',{password:'synthetic-password'}),/vault_bad_action/);
 assert.equal(h.fetchCount,0);
});
console.log('Browser Vault transport: synthetic evidence only; no signed E2E or release.');
