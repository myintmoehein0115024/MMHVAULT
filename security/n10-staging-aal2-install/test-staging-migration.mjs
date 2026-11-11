import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('../../docs/sql/n10_staging_aal_v2_APPROVED_INSTALL_20261102.sql',import.meta.url),'utf8');
const postcheck=readFileSync(new URL('../../docs/sql/n10_staging_aal_v2_POSTCHECK_READ_ONLY_20261102.sql',import.meta.url),'utf8');
const report=readFileSync(new URL('../../docs/N10_STAGING_AAL_V2_INSTALL_REPORT_20261102.md',import.meta.url),'utf8');

test('this exact migration is Staging-only, never generic production',()=>{
  assert.match(migration,/Project ref MUST equal ldivswlhtgmznzwhzsoi/);
  assert.match(migration,/Never run on production vrypucmyrztxgiqhjspd/);
  assert.match(migration,/DO \$n10_stage_install\$/);
  assert.match(migration,/\$n10_stage_install\$;\s*$/);
});
test('legacy implementation is protected by an exact preflight fingerprint',()=>{
  assert.match(migration,/a9aff9c940d74a7a35134f84929334fd/);
  assert.match(migration,/pg_catalog\.pg_get_functiondef\(old_oid\)/);
  assert.match(migration,/legacy function or grants differ/);
  assert.match(migration,/AAL3 guard already exists: refusing overwrite/);
});
test('migration creates a new overload, never edits the two-arg function',()=>{
  assert.match(migration,/CREATE FUNCTION public\.mmh_n10_recovery_session_active\(/);
  assert.match(migration,/p_user_id uuid, p_session_id uuid, p_expected_aal text/);
  const withoutComments=migration.replace(/--[^\n]*/g,'');
  assert.doesNotMatch(withoutComments,/\bCREATE OR REPLACE FUNCTION\b/i);
  assert.doesNotMatch(withoutComments,/\bDROP (?:FUNCTION|TABLE|TRIGGER|SCHEMA)\b/i);
  assert.doesNotMatch(withoutComments,/\b(?:DELETE FROM|UPDATE auth\.|TRUNCATE|INSERT INTO)\b/i);
});
test('AAL1 fails when any verified factor exists; AAL2 requires same bound verified factor',()=>{
 assert.match(migration,/p_expected_aal='aal1'/);
 assert.match(migration,/s\.aal::text='aal1'/);
 assert.match(migration,/s\.factor_id IS NULL/);
 assert.match(migration,/NOT EXISTS\(/);
 assert.match(migration,/p_expected_aal='aal2'/);
 assert.match(migration,/s\.aal::text='aal2'/);
 assert.match(migration,/s\.factor_id IS NOT NULL/);
 assert.match(migration,/f\.id=s\.factor_id/);
 assert.match(migration,/f\.user_id=p_user_id/);
 assert.match(migration,/f\.status::text='verified'/);
 assert.match(migration,/s\.id=p_session_id/);
 assert.match(migration,/s\.user_id=p_user_id/);
 assert.match(migration,/s\.not_after IS NULL OR s\.not_after>now\(\)/);
});
test('new function is SECURITY DEFINER with private scoped execution and empty search_path',()=>{
 assert.match(migration,/STABLE SECURITY DEFINER/);
 assert.match(migration,/SET search_path = ''/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\) FROM PUBLIC,anon,authenticated,service_role/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\) TO service_role/);
 assert.match(migration,/has_function_privilege\('anon',new_oid,'EXECUTE'\)/);
 assert.match(migration,/has_function_privilege\('authenticated',new_oid,'EXECUTE'\)/);
 assert.match(migration,/has_function_privilege\('service_role',new_oid,'EXECUTE'\)/);
});
test('atomic migration checks both private tables, Vault, Auth MFA columns and original RPCs',()=>{
 assert.match(migration,/recovery_backup_index/);
 assert.match(migration,/recovery_rate_bucket/);
 assert.match(migration,/supabase_vault/);
 assert.match(migration,/mmh_n10_recovery_backup_get/);
 assert.match(migration,/mmh_n10_recovery_take_attempt/);
 assert.match(migration,/table_name='sessions'/);
 assert.match(migration,/table_name='mfa_factors'/);
 assert.match(migration,/atomic rollback/);
});
test('postcheck never writes to database or reveals words or tokens',()=>{
 assert.match(postcheck,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY/);
 assert.match(postcheck,/\bROLLBACK;\s*$/);
 const sansComments=postcheck.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(sansComments,/\b(?:CREATE|DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|GRANT|REVOKE)\b\s+(?:TABLE|FROM|INTO|FUNCTION|ON|SCHEMA)/i);
 assert.doesNotMatch(sansComments,/\bSELECT\s+\*\s+FROM\s+auth\./i);
 assert.doesNotMatch(sansComments,/\bSELECT\s+\*\s+FROM\s+vault\./i);
});
test('report never claims signed two-account AAL2 or production acceptance',()=>{
 assert.match(report,/Signed.*two-owner|signed two-owner/i);
 assert.match(report,/NOT APPROVED/);
 assert.match(report,/No Auth user, session, MFA factor, Vault secret/);
 assert.match(report,/No rollback was needed/);
 assert.match(report,/5\/5 allowed/);
 assert.match(report,/5 tested, 0 allowed/);
});
