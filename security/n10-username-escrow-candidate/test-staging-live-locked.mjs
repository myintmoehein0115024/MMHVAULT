/**
 * Real HTTP negative-only QA against the separately deployed, hard-OFF
 * Staging registration Edge. No credentials, QA words, user records or Auth
 * mutations. Only call after confirming verify_jwt=false and RELEASE=false.
 * The test intentionally fails if a release was accidentally enabled.
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
test('new anonymous user can see a hard-OFF Staging preflight without a signed JWT',async()=>{
 const {response,payload}=await request();
 assert.equal(response.status,200);
 assert.equal(payload?.code,'preflight_ok');
 assert.equal(payload?.enabled,false);
 assert.equal(payload?.setup_complete,true,'Staging enrollment secrets or exact two-user allowlist are not yet ready');
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
test('disabled signup cannot create an Auth user even with a shaped request',async()=>{
 const {response,payload}=await request({
  body:{action:'signup',username:'n10qa_offline',password:'dummy-not-a-real-credential'}
 });
 assert.equal(response.status,503);
 assert.equal(payload?.code,'registration_not_released');
 assert.equal(payload?.access_token,undefined);
 assert.equal(payload?.refresh_token,undefined);
});
test('GET method rejected and private response is not cached',async()=>{
 const {response,payload}=await request({method:'GET'});
 assert.equal(response.status,405);
 assert.equal(payload?.code,'method_denied');
});
