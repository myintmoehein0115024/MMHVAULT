// Offline-only Vault backend review contracts. Deliberately not a live
// authorization, secret, Auth, Vault, SQL migration or production test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const backend=readFileSync('security/n10-fixed-recovery-vault-candidate/index.ts','utf8');
const sql=readFileSync('docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql','utf8');
const preflight=readFileSync('docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql','utf8');
const installedAudit=readFileSync('docs/sql/n10_installed_staging_vault_READ_ONLY_AUDIT_20261101.sql','utf8');
const assurance=readFileSync('security/n10-fixed-recovery-vault-candidate/mfa-assurance.mjs','utf8');
const qaRlsAudit=readFileSync('docs/sql/n10_staging_qa_rls_READ_ONLY_ASSERTIONS_20261101.sql','utf8');
const qaDmlRevoke=readFileSync('docs/sql/n10_staging_qa_excess_dml_REVOKE_REVIEW_ONLY.sql','utf8');
const v2Upgrade=readFileSync('docs/sql/n10_staging_session_guard_V2_UPGRADE_REVIEW_ONLY.sql','utf8');
const tests=[
 ['Vault release is hard OFF and pinned to the existing project',()=>{
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
  assert.match(backend,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
  assert.match(backend,/if\(!RECOVERY_RELEASE_ENABLED\)return out\(origin,'recovery_service_not_released',503\)/);
  assert.match(backend,/BASE!==EXPECTED_BASE/);
 }],
 ['no unauthenticated backup, original word access or passwordless reveal',()=>{
  const steps=["const authenticated=await verifiedUser(req);","const firstSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const quotaStatus=await quota(user.id);","if(!await provePassword(user,body.password))",
   "const secondSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const refreshedAssurance=await verifiedUser(req);",
   "const stored=await admin.rpc('mmh_n10_recovery_backup_get'"];
  let index=-1;
  for(const step of steps){const next=backend.indexOf(step,index+1);assert.ok(next>index,'missing or reordered: '+step);index=next}
  assert.match(backend,/const finalAssurance=await verifiedUser\(req\)/);
  assert.match(backend,/const finalSessionCheck=await liveSession\(user\.id,sessionId,sessionAal\)/);
 }],
 ['existing phrase verifier is required and revalidated before escrow',()=>{
  const blocks=["const records=await admin.from('mmh_n10a769_recovery_phrases')",
   "if(!equal64(records.data[0].verifier,mac))",
   "const backupAssurance=await verifiedUser(req);",
   "const backupSessionCheck=await liveSession(user.id,sessionId,sessionAal);",
   "const saved=await admin.rpc('mmh_n10_recovery_backup_put'"];
  let index=-1;
  for(const step of blocks){const next=backend.indexOf(step,index+1);assert.ok(next>index,step);index=next}
 }],
 ['SQL migration is non-running and keeps Vault owner and RLS restrictions',()=>{
  assert.match(sql,/STAGING CANDIDATE, NOT PRODUCTION AUTHORIZED/);
  assert.match(sql,/NOT AUTHORIZED TO RUN/);
  assert.match(sql,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/cleanup_recovery_vault_secret/);
  assert.match(sql,/DELETE FROM vault\.secrets WHERE id=OLD\.secret_id/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mmh_n10_recovery_backup_get\(uuid\) TO service_role/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.mmh_n10_recovery_backup_get\(uuid\) FROM PUBLIC,anon,authenticated/);
  assert.doesNotMatch(sql,/DROP SCHEMA.*CASCADE/i);
 }],
 ['SQL function bodies use valid balanced dollar quoting, session V2 matches upgrade contract',()=>{
  const firstInstallFunctions=(sql.match(/^CREATE FUNCTION /gm)||[]).length;
  const bodyOpeners=(sql.match(/\bAS\s+\$\$/g)||[]).length;
  const bodyClosers=(sql.match(/\$\$;/g)||[]).length;
  assert.ok(firstInstallFunctions>=6,'missing SQL function definitions');
  assert.equal(bodyOpeners,firstInstallFunctions,'missing dollar-quoted CREATE FUNCTION body');
  assert.equal(bodyClosers,firstInstallFunctions,'unbalanced SQL function body quotes');
  assert.doesNotMatch(sql,/\bAS\s+\$(?!\$)/,'broken single-dollar function opener');
  assert.doesNotMatch(sql,/^\$;$/m,'broken single-dollar function closer');
  assert.match(sql,/p_user_id uuid,p_session_id uuid,p_expected_aal text\)\s+RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS \$\$/);
  assert.match(v2Upgrade,/p_user_id uuid,p_session_id uuid,p_expected_aal text\)\s+RETURNS boolean\s+LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS \$\$/);
  for(const stmt of ["s.id=p_session_id","s.user_id=p_user_id","s.aal::text='aal1'","s.aal::text='aal2'","f.id=s.factor_id","f.user_id=p_user_id","f.status::text='verified'"]){
    assert.ok(sql.includes(stmt),'first install missing '+stmt);
    assert.ok(v2Upgrade.includes(stmt),'V2 upgrade missing '+stmt);
  }
  assert.match(sql,/vault\.create_secret\(p_phrase,[\s\S]*?NULL::uuid\)/);
 }],
 ['preflight is read-only, not an authorization to apply SQL',()=>{
  assert.match(preflight,/READ-ONLY PREFLIGHT/);
  assert.match(preflight,/WITH flags AS \(/);
  assert.doesNotMatch(preflight,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE)\s/mi);
 }],
 ['JWT assurance must be explicitly present; no implicit AAL1 fallback',()=>{
  assert.match(assurance,/const current = payload\.aal;/);
  assert.doesNotMatch(assurance,/payload\.aal\s*==\s*null\s*\?\s*['"]aal1['"]/);
  assert.match(assurance,/currentLevel !== "aal1" && currentLevel !== "aal2"/);
 }],
 ['installed Staging Vault audit checks orphan metadata, trigger and retention without writes',()=>{
  assert.match(installedAudit,/INSTALLED Auth-Staging privacy\/Vault metadata audit/);
  assert.match(installedAudit,/currently_unlinked_n10_secret_rows/);
  assert.match(installedAudit,/vault_delete_trigger_enabled/);
  assert.match(installedAudit,/owner_delete_cascades/);
  assert.match(installedAudit,/daily_rate_cleanup_job_enabled/);
  assert.match(installedAudit,/no_authenticated_secret_rpc_access/);
  assert.match(installedAudit,/no_authenticated_decrypted_view_select/);
  assert.match(installedAudit,/no_anon_decrypted_view_select/);
  assert.match(installedAudit,/no_authenticated_vault_schema_access/);
  assert.match(installedAudit,/no_anon_vault_schema_access/);
  // Metadata-only privilege checks must never read plaintext from the view.
  assert.doesNotMatch(installedAudit,/\b(?:FROM|JOIN)\s+vault\.decrypted_secrets\b/i);
  const executableSql=installedAudit.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|TRUNCATE|CALL|DO)\b/gmi);
 }],
 ['SQL + Edge require current factor bound to exact session and AAL',()=>{
  assert.match(sql,/p_user_id uuid,p_session_id uuid,p_expected_aal text/);
  assert.match(sql,/s\.aal::text='aal2'/);
  assert.match(sql,/s\.factor_id IS NOT NULL/);
  assert.match(sql,/f\.id=s\.factor_id/);
  assert.match(sql,/f\.user_id=p_user_id/);
  assert.match(sql,/f\.status::text='verified'/);
  assert.match(sql,/p_expected_aal='aal1'/);
  assert.match(sql,/NOT EXISTS \(/);
  assert.match(sql,/s\.factor_id IS NULL/);
  assert.match(backend,/p_expected_aal:expectedAal/);
  assert.match(backend,/const sessionAal=authenticated\.sessionAal/);
  assert.equal((backend.match(/await liveSession\(user\.id,sessionId,sessionAal\)/g)||[]).length,4);
  assert.doesNotMatch(backend,/await liveSession\(user\.id,sessionId\)/);
  assert.match(preflight,/legacy_session_guard_present/);
  assert.match(preflight,/mmh_n10_recovery_session_active\(uuid,uuid,text\)/);
  assert.match(preflight,/mmh_n10_recovery_session_active\(uuid,uuid\)/);
 }],
 ['rate-bucket counter saturates without integer overflow (candidate only)',()=>{
  assert.match(sql,/attempts=CASE WHEN bucket\.reset_at<=now\(\) THEN 1\s+ELSE LEAST\(bucket\.attempts,p_limit\)\+1 END/);
  assert.doesNotMatch(sql,/ELSE bucket\.attempts\+1 END/);
  for(const limit of [1,5,10]){
   for(const attempts of [0,1,limit,limit+1,2_147_483_647]){
    const next=Math.min(attempts,limit)+1;
    assert.ok(next>=1 && next<=limit+1 && Number.isSafeInteger(next));
    if(attempts>=limit) assert.equal(next,limit+1);
   }
  }
 }],
 ['production-only username marker is not automatically expanded to staging test identities',()=>{
  assert.match(backend,/user\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
  assert.doesNotMatch(backend,/user\.app_metadata\?\.mmhvault_auth_kind\s*\?\?/);
  assert.doesNotMatch(backend,/username_only_staging/);
  assert.match(backend,/BASE!==EXPECTED_BASE/);
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
 }],
 ['Staging QA policies must compose owner permissive AND MFA restrictive',()=>{
  assert.match(qaRlsAudit,/polname='mmh_n10_qa_owner_select'/);
  assert.match(qaRlsAudit,/polname='mmh_n10_qa_mfa_select'/);
  assert.match(qaRlsAudit,/AND polpermissive/);
  assert.match(qaRlsAudit,/AND NOT polpermissive/);
  assert.match(qaRlsAudit,/exactly_two_select_policies/);
  assert.match(qaRlsAudit,/mfa_guard_validates_uid_and_factors/);
  assert.match(qaRlsAudit,/no_authenticated_qa_privileged_rpc/);
  assert.match(qaRlsAudit,/all_checks_pass/);
  const executableSql=qaRlsAudit.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|GRANT|REVOKE|TRUNCATE|CALL|DO)\b/gmi);
  assert.doesNotMatch(executableSql,/vault\.decrypted_secrets|FROM\s+auth\.users\b/i);
 }],
 ['optional Staging DML hardening proposal only revokes excess authenticated writes',()=>{
  assert.match(qaDmlRevoke,/REVIEW ONLY \/ DO NOT RUN/);
  assert.match(qaDmlRevoke,/ldivswlhtgmznzwhzsoi/);
  assert.match(qaDmlRevoke,/REVOKE INSERT, UPDATE, DELETE ON TABLE public\.mmh_n10_signed_qa_entries\s+FROM authenticated;/);
  assert.match(qaDmlRevoke,/NOT p\.polpermissive/);
  assert.match(qaDmlRevoke,/p\.polpermissive/);
  const executableSql=qaDmlRevoke.replace(/^\s*--[^\n]*$/gm,'');
  assert.doesNotMatch(executableSql,/^\s*(?:DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|GRANT)\b/gmi);
  assert.doesNotMatch(executableSql,/FROM\s+(?:service_role|anon)\s*;/i);
  assert.doesNotMatch(executableSql,/vault\.secrets|auth\.users|RECOVERY_RELEASE_ENABLED/i);
 }],
 ['candidate excludes previously denied QA activation and production UI changes',()=>{
  assert.doesNotMatch(backend,/QA_RELEASED|QA_WINDOW_END_UTC|QA_IDENTITIES/);
  assert.doesNotMatch(backend,/N10_FIXED_VAULT_UI_RELEASED/);
 }]
];
let fail=0;
for(const [name,run] of tests){try{run();console.log('PASS',name)}catch(err){fail++;console.error('FAIL',name,err.message)}}
console.log((tests.length-fail)+'/'+tests.length+' backend-only offline review contracts');
if(fail)process.exitCode=1;
