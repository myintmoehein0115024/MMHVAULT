/* APP V11.7: local-only contract of the real-JWT Staging QA utility.
 * No real login, network, credentials or production actions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const path=new URL('./app-v117-staging-signed-ab-qa.html',import.meta.url);
const html=fs.readFileSync(path,'utf8');
const match=html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match,'Staging QA has one self-contained script');

test('all JS parses without external libraries or live credentials',()=>{
  assert.doesNotThrow(()=>new vm.Script(match[1],{filename:'staging-ab-qa'}));
  assert.match(html,/STAGING_PUBLISHABLE_KEY_FOR_LOCAL_QA_ONLY/);
  assert.doesNotMatch(html,/sb_publishable_[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(html,/eyJhbGci[A-Za-z0-9._-]+/);
  assert.doesNotMatch(html,/<script\s+src=/i);
});
test('all network requests locked to one exact Staging project',()=>{
  assert.match(html,/const BASE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co'/);
  assert.match(html,/connect-src https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co/);
  assert.doesNotMatch(html,/vrypucmyrztxgiqhjspd|mmhvault\.com/i);
  assert.doesNotMatch(html,/\bservice_role\b|sb_secret_/);
  assert.doesNotMatch(html,/auth\/v1\/signup|auth\/v1\/admin/i);
});
test('Auth stays in memory, passwords cleared and no N10 account used',()=>{
  assert.match(html,/const sessions=\{A:null,B:null\}/);
  assert.match(html,/requireTestEmail=email=>/);
  assert.match(html,/v117qa/);
  assert.match(html,/el\('password'\+who\)\.value=''/);
  assert.doesNotMatch(match[1],/localStorage|sessionStorage|indexedDB|document\.cookie/i);
});
test('both real signed owners must have empty financial tables before any fixture insert',()=>{
  assert.match(html,/for\(const who of \['A','B'\]\)\{[\s\S]*?const \[tx,cfg\]=await Promise\.all/);
  assert.match(html,/tx\.data\.length===0/);
  assert.match(html,/cfg\.data\.length===0/);
  assert.match(html,/created\[who\]\.note=runId/);
  assert.match(html,/created\[who\]\.cfg=true/);
});
test('owner RLS, stale CAS and immutable archived link acceptance',()=>{
  assert.match(html,/crossTx\.data\?\.length===0/);
  assert.match(html,/crossConfig\.data\?\.length===0/);
  assert.match(html,/crossUpdate\.data\?\.length===0/);
  assert.match(html,/crossConfigUpdate\.data\?\.length===0/);
  assert.match(html,/crossDelete\.data\?\.length===0/);
  assert.match(html,/!crossInsert\.ok/);
  assert.match(html,/stale\.data\?\.length===0/);
  assert.match(html,/remote\?\.links\?\.\[String\(aId\)\]/);
});
test('cleanup targets only exact synthetic data and failed tests never show pass',()=>{
  assert.match(html,/note:'eq\.'\+x\.note,user_id:'eq\.'\+sessions\[who\]\.id/);
  assert.match(html,/personal_configuration\?'\+queryString\(\{user_id:'eq\.'\+sessions\[who\]\.id\}\)/);
  assert.match(html,/const cleared=await cleanup\(true\)/);
  assert.match(html,/if\(cleared&&passed\)/);
  assert.match(html,/else if\(cleared\).*验收未通过/);
  assert.match(html,/return failed===0/);
});
