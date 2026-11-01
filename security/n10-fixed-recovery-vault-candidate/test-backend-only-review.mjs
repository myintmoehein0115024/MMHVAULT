// Offline-only Vault backend review contracts. Deliberately not a live
// authorization, secret, Auth, Vault, SQL migration or production test.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const backend=readFileSync('security/n10-fixed-recovery-vault-candidate/index.ts','utf8');
const sql=readFileSync('docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql','utf8');
const preflight=readFileSync('docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql','utf8');
const assurance=readFileSync('security/n10-fixed-recovery-vault-candidate/mfa-assurance.mjs','utf8');
const tests=[
 ['Vault release is hard OFF and pinned to the existing project',()=>{
  assert.match(backend,/const RECOVERY_RELEASE_ENABLED=false;/);
  assert.match(backend,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
  assert.match(backend,/if\(!RECOVERY_RELEASE_ENABLED\)return out\(origin,'recovery_service_not_released',503\)/);
  assert.match(backend,/BASE!==EXPECTED_BASE/);
 }],
 ['no unauthenticated backup, original word access or passwordless reveal',()=>{
  const steps=["const authenticated=await verifiedUser(req);","const firstSessionCheck=await liveSession(user.id,sessionId);",
   "const quotaStatus=await quota(user.id);","if(!await provePassword(user,body.password))",
   "const secondSessionCheck=await liveSession(user.id,sessionId);",
   "const refreshedAssurance=await verifiedUser(req);",
   "const stored=await admin.rpc('mmh_n10_recovery_backup_get'"];
  let index=-1;
  for(const step of steps){const next=backend.indexOf(step,index+1);assert.ok(next>index,'missing or reordered: '+step);index=next}
  assert.match(backend,/const finalAssurance=await verifiedUser\(req\)/);
  assert.match(backend,/const finalSessionCheck=await liveSession\(user.id,sessionId\)/);
 }],
 ['existing phrase verifier is required and revalidated before escrow',()=>{
  const blocks=["const records=await admin.from('mmh_n10a769_recovery_phrases')",
   "if(!equal64(records.data[0].verifier,mac))",
   "const backupAssurance=await verifiedUser(req);",
   "const backupSessionCheck=await liveSession(user.id,sessionId);",
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
 ['candidate excludes previously denied QA activation and production UI changes',()=>{
  assert.doesNotMatch(backend,/QA_RELEASED|QA_WINDOW_END_UTC|QA_IDENTITIES/);
  assert.doesNotMatch(backend,/N10_FIXED_VAULT_UI_RELEASED/);
 }]
];
let fail=0;
for(const [name,run] of tests){try{run();console.log('PASS',name)}catch(err){fail++;console.error('FAIL',name,err.message)}}
console.log((tests.length-fail)+'/'+tests.length+' backend-only offline review contracts');
if(fail)process.exitCode=1;
