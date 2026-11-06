// Offline-only review of V2 Staging migration and emergency fail-closed
// disable. No SQL is executed and no Auth, Vault, or QA connections are made.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const upgrade=readFileSync('docs/sql/n10_staging_session_guard_V2_UPGRADE_REVIEW_ONLY.sql','utf8');
const emergency=readFileSync('docs/sql/n10_staging_session_guard_V2_EMERGENCY_DISABLE_REVIEW_ONLY.sql','utf8');
const synthetic=readFileSync('docs/sql/n10_staging_session_guard_V2_SYNTHETIC_READ_ONLY_TEST.sql','utf8');
const tests=[
 ['no unauthorized execution or production rollout',()=>{
  for(const sql of [upgrade,emergency]){
   assert.match(sql,/NOT APPROVED|DO NOT EXECUTE/);
   assert.doesNotMatch(sql,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\s+(?:INTO|FROM)?\s*(?:auth\.|vault\.|mmh_n10_privacy\.)/i);
   assert.doesNotMatch(sql,/DROP\s+\w+[^;]*\bCASCADE\b/i);
  }
  assert.match(upgrade,/ldivswlhtgmznzwhzsoi/);
  assert.doesNotMatch(upgrade,/vrypucmyrztxgiqhjspd/);
 }],
 ['preflight refuses schema drift and previously installed V2',()=>{
  assert.match(upgrade,/to_regprocedure\('public\.mmh_n10_recovery_session_active\(uuid,uuid\)'\)/);
  assert.match(upgrade,/to_regprocedure\('public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)'\) IS NOT NULL/);
  assert.match(upgrade,/md5\(v_src\) <> '4778bf3220e2faf29af54186c226e3ed'/);
  assert.match(upgrade,/v_dependents <> 0/);
  assert.match(upgrade,/has_function_privilege\('authenticated',v_old,'EXECUTE'\)/);
  assert.match(upgrade,/has_function_privilege\('anon',v_old,'EXECUTE'\)/);
  assert.match(upgrade,/to_regnamespace\('mmh_n10_qa_security'\)/);
 }],
 ['V2 enforces session ownership, strict current AAL, enrolled factor',()=>{
  assert.match(upgrade,/s\.id=p_session_id/);
  assert.match(upgrade,/s\.user_id=p_user_id/);
  assert.match(upgrade,/s\.not_after IS NULL OR s\.not_after>now\(\)/);
  assert.match(upgrade,/p_expected_aal='aal1'/);
  assert.match(upgrade,/s\.aal::text='aal1'/);
  assert.match(upgrade,/s\.factor_id IS NULL/);
  assert.match(upgrade,/NOT EXISTS\(/);
  assert.match(upgrade,/p_expected_aal='aal2'/);
  assert.match(upgrade,/s\.aal::text='aal2'/);
  assert.match(upgrade,/s\.factor_id IS NOT NULL/);
  assert.match(upgrade,/f\.id=s\.factor_id/);
  assert.match(upgrade,/f\.user_id=p_user_id/);
  assert.match(upgrade,/f\.status::text='verified'/);
 }],
 ['new function public EXECUTE is revoked and old signature removed atomically',()=>{
  assert.match(upgrade,/^BEGIN;/m);
  assert.match(upgrade,/^COMMIT;/m);
  assert.match(upgrade,/REVOKE ALL ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)\s+FROM PUBLIC,anon,authenticated;/);
  assert.match(upgrade,/GRANT EXECUTE ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)\s+TO service_role;/);
  assert.match(upgrade,/DROP FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid\) RESTRICT;/);
  assert.ok(upgrade.indexOf('CREATE FUNCTION public.mmh_n10_recovery_session_active')<
            upgrade.indexOf('DROP FUNCTION public.mmh_n10_recovery_session_active'));
 }],
 ['synthetic SQL truth table is SELECT-only, owner-scoped, negative-case complete',()=>{
  assert.match(synthetic,/WITH\s+factor_rows\(/);
  assert.match(synthetic,/session_rows\(/);
  assert.match(synthetic,/expectations\(label,session_id,claimed_uid,expected_aal,should_allow\)/);
  assert.match(synthetic,/cross-owner user claim denied/);
  assert.match(synthetic,/unverified factor denied/);
  assert.match(synthetic,/expired AAL2 denied/);
  assert.match(synthetic,/valid verified same-owner AAL2/);
  assert.match(synthetic,/missing AAL claim denied/);
  assert.match(synthetic,/unknown session ID denied/);
  const labelBlock=synthetic.split('expectations(label,session_id,claimed_uid,expected_aal,should_allow) AS (')[1]?.split('),\nevaluated AS (')[0]||'';
  assert.equal((labelBlock.match(/^\s*\('[^']+',/gm)||[]).length,16,'expected 16 invented scenarios');
  const sqlOnly=synthetic.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(sqlOnly,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|TRUNCATE|CALL|DO)\b/gmi);
  assert.doesNotMatch(sqlOnly,/\b(?:auth|vault|mmh_n10_privacy)\./i);
 }],
 ['emergency disable is fail closed, never restores weak RPC',()=>{
  assert.match(emergency,/REVOKE EXECUTE ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)\s+FROM service_role;/);
  assert.doesNotMatch(emergency,/^\s*CREATE\s+(?:OR REPLACE\s+)?FUNCTION\b/mi);
  assert.doesNotMatch(emergency,/^\s*GRANT\b/mi);
  assert.doesNotMatch(emergency,/^\s*DROP\b/mi);
  assert.match(emergency,/Legacy RPC unexpectedly present/);
 }],
];
let failed=0;
for(const [label,test] of tests){
 try{test();console.log('PASS',label)}
 catch(error){failed++;console.error('FAIL',label,error.message)}
}
console.log((tests.length-failed)+'/'+tests.length+' offline V2 migration contracts');
if(failed)process.exitCode=1;
