/**
 * Real HTTP negative-only QA against the separately deployed Staging Edge.
 * No credentials, QA words, user records or Auth mutations.
 * A temporary opening is accepted ONLY if the exact reviewed expiry is present.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const URL='https://ldivswlhtgmznzwhzsoi.supabase.co/functions/v1/mmh-n10-staging-username-escrow-20261103';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
async function request({origin=ORIGIN,method='POST',body={action:'preflight'}}={}){
 const response=await fetch(URL,{
  method,headers:{Origin:origin,'Content-Type':'application/json'},
  ...(method==='POST'?{body:JSON.stringify(body)}:{}),
  signal:AbortSignal.timeout(12000),redirect:'error',cache:'no-store'
 });
 const payload=await response.json().catch(()=>null);
 assert.equal(response.headers.get('cache-control')?.includes('no-store'),true);
 return {response,payload};
}
test('anonymous preflight is locked or uses only an explicit expiring two-user QA window',async()=>{
 const {response,payload}=await request();
 assert.equal(response.status,200);
 assert.equal(payload?.code,'preflight_ok');
 assert.ok(payload?.enabled===false || (payload?.enabled===true &&
   payload?.qa_window_expires_at==='2026-11-04T13:00:00.000Z' &&
   Date.now()<Date.parse(payload.qa_window_expires_at)),'unreviewed anonymous signup release');
 assert.equal(payload?.setup_complete,true,'Staging enrollment secrets or exact two-user allowlist are not yet ready');
 console.log('N10 Staging live preflight:',payload?.enabled?'QA_WINDOW_OPEN':'SAFE_CLOSED');
 assert.equal(payload?.qa_only,true);
 assert.equal(payload?.production,false);
 assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
});
test('Staging foreign origin is rejected before parsing signup data',async()=>{
 const {response,payload}=await request({origin:'https://mmhvault.com'});
 assert.equal(response.status,403);
 assert.equal(payload?.code,'origin_denied');
 assert.equal(response.headers.get('access-control-allow-origin'),null);
});
test('unknown QA username is always rejected without Auth mutation',async()=>{
 const {response,payload}=await request({
  body:{action:'signup',username:'n10qa_offline',password:'dummy-not-a-real-credential'}
 });
 assert.ok((response.status===503&&payload?.code==='registration_not_released')||
   (response.status===403&&payload?.code==='staging_qa_only'));
 assert.equal(payload?.user_id,undefined);
 assert.equal(payload?.access_token,undefined);
 assert.equal(payload?.refresh_token,undefined);
});
test('GET method rejected and private response is not cached',async()=>{
 const {response,payload}=await request({method:'GET'});
 assert.equal(response.status,405);
 assert.equal(payload?.code,'method_denied');
});
