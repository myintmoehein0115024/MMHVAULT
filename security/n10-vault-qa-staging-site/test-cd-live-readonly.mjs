// C/D signed-out LIVE Staging preflight. No passwords, recovery words, tokens,
// TOTP seeds, accounts or database mutations. Runs only against the QA origin.
import test from 'node:test';
import assert from 'node:assert/strict';
const origin='https://mmhvault-n10-vault-staging.pages.dev';
const base='https://ldivswlhtgmznzwhzsoi.supabase.co/functions/v1';
const signup=base+'/mmh-n10-staging-username-escrow-cd-20261104';
const vault=base+'/mmh-n10-username-vault-qa-cd-20261104';
async function post(url,body){
 const response=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
  body:JSON.stringify(body)});
 const text=await response.text();
 assert.ok(text.length<3000,'unexpected large response');
 let data;try{data=JSON.parse(text);}catch{data={code:'non_json'};}
 assert.equal(Object.prototype.hasOwnProperty.call(data,'words'),false,'never return secret without authentication');
 return {status:response.status,data};
}
test('public Staging C/D pages and clients are reachable, no production',async()=>{
 for(const [path,marker] of [
  ['/preview/cd-signup.html','../cd-signup.js'],
  ['/preview/cd-mfa.html','../cd-mfa.js'],
  ['/cd-signup.js','mmh-n10-staging-username-escrow-cd-20261104'],
  ['/cd-mfa.js','mmh-n10-username-vault-qa-cd-20261104']]){
  const r=await fetch(origin+path,{signal:AbortSignal.timeout(12000),redirect:'error'});
  assert.equal(r.status,200,path);
  const html=await r.text();
  assert.ok(html.includes(marker),path+' missing marker');
  assert.doesNotMatch(html,/vrypucmyrztxgiqhjspd/);
 }
});
test('only time-limited Staging C/D enrollment preflight is enabled',async()=>{
 const r=await post(signup,{action:'preflight'});
 assert.equal(r.status,200);
 assert.equal(r.data.code,'preflight_ok');
 assert.equal(r.data.production,false);
 assert.equal(r.data.qa_only,true);
 assert.equal(r.data.enabled,true,'C/D server configuration or expiry closed');
 assert.equal(r.data.qa_window_expires_at,'2026-11-04T13:00:00.000Z');
});
test('historical A/B names are rejected at C/D Edge before password/CAPTCHA',async()=>{
 for(const username of ['n10qa_a_20261103','n10qa_b_20261103']){
  const r=await post(signup,{action:'login',username});
  assert.equal(r.status,403);
  assert.equal(r.data.code,'staging_qa_only');
 }
});
test('C/D Vault refuses unsigned callers without disclosing words',async()=>{
 const r=await post(vault,{action:'status'});
 assert.ok([401,403].includes(r.status));
});
