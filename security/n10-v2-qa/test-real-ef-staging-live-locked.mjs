/**
 * N10 REAL E/F Staging V1 LIVE HARD-OFF rejection smoke.
 * Sends only non-credential requests to the independently deployed two Edges.
 * Never requests signup with a username/password, never reads recovery words,
 * never sends a JWT, never changes Auth/DB/QA settings.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const BASE='https://ldivswlhtgmznzwhzsoi.supabase.co/functions/v1';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const SIGNUP=BASE+'/mmh-n10-realef-signup-staging-20261104';
const VIEWER=BASE+'/mmh-n10-realef-viewer-staging-20261104';

async function probe(url,{origin=ORIGIN,method='POST'}={}){
 const response=await fetch(url,{
  method,
  headers:{origin,'content-type':'application/json'},
  ...(method==='POST'?{body:'{"action":"healthcheck_only"}'}:{}),
  redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 const body=await response.json().catch(()=>null);
 return {response,body};
}

test('signup Edge rejects every POST while release is hard-OFF',async()=>{
 const {response,body}=await probe(SIGNUP);
 assert.equal(response.status,503,'E/F Auth signup MUST remain hard-OFF');
 assert.equal(body?.code,'qa_not_released');
 assert.match(response.headers.get('cache-control')||'',/no-store/);
 assert.equal(response.headers.get('access-control-allow-origin'),ORIGIN);
 for(const secret of ['user_id','access_token','refresh_token','recovery_words','words'])
  assert.equal(body?.[secret],undefined,'response must not disclose '+secret);
});
test('signup Edge denies foreign origin before any work',async()=>{
 const {response,body}=await probe(SIGNUP,{origin:'https://mmhvault.com'});
 assert.equal(response.status,403);
 assert.equal(body?.code,'origin_denied');
 assert.equal(response.headers.get('access-control-allow-origin'),null);
});
test('signup Edge rejects GET from legitimate origin',async()=>{
 const {response,body}=await probe(SIGNUP,{method:'GET'});
 assert.equal(response.status,405);
 assert.equal(body?.code,'method_denied');
});
test('recovery viewer denies requests lacking user JWT at platform gateway',async()=>{
 const {response,body}=await probe(VIEWER);
 assert.equal(response.status,401,'MFA recovery viewer must require a valid signed JWT');
 // The Supabase platform gateway adds CORS before invoking the handler;
 // 401 is the security boundary, not a specific gateway CORS header value.
 for(const secret of ['user_id','access_token','refresh_token','recovery_words','words'])
  assert.equal(body?.[secret],undefined,'unauthenticated response must not disclose '+secret);
});
