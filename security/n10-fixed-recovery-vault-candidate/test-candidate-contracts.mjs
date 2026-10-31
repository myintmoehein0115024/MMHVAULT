// Static contract checks for an UNDEPLOYED, fail-closed recovery service.
// Run: node security/n10-fixed-recovery-vault-candidate/test-candidate-contracts.mjs
// No credentials, database connections, or production calls.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const edge=readFileSync(resolve(here,'index.ts'),'utf8');
const sql=readFileSync(resolve(root,'docs/sql/n10_fixed_recovery_vault_STAGING_CANDIDATE.sql'),'utf8');
const preflight=readFileSync(resolve(root,'docs/sql/n10_fixed_recovery_READ_ONLY_PREFLIGHT.sql'),'utf8');
const syntheticVerifier=readFileSync(resolve(root,'docs/sql/n10_fixed_recovery_verifier_SYNTHETIC_STAGING_ONLY.sql'),'utf8');
const signup=readFileSync(resolve(here,'username-signup-integration-NOT_DEPLOYED.ts'),'utf8');
const staging=readFileSync(resolve(here,'qa-staging-recovery-NOT_DEPLOYED.ts'),'utf8');
const retired=readFileSync(resolve(here,'qa-retired-tombstone-STAGING.ts'),'utf8');
const cases=[
 ['production recovery candidate is fail-closed and pinned to the only approved project',()=>{
   assert.match(edge,/const RECOVERY_RELEASE_ENABLED=false;/);
   assert.match(edge,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
   assert.match(edge,/const ORIGIN='https:\/\/mmhvault\.com';/);
   assert.match(edge,/if\(BASE!==EXPECTED_BASE\|\|SERVICE\.length<20/);
   assert.doesNotMatch(edge,/BASE\.includes\('ldivswlhtgmznzwhzsoi'\)/);
 }],
 ['retired QA service has no sensitive operations',()=>{
   assert.match(retired,/code:'qa_retired'/);
   assert.match(retired,/status:410/);
   assert.match(retired,/Deno\.serve\(/);
   assert.doesNotMatch(retired,/Deno\.env\.get\(/);
   assert.doesNotMatch(retired,/createClient\(/);
   assert.doesNotMatch(retired,/auth\.getUser\(/);
   assert.doesNotMatch(retired,/vault\.decrypted_secrets/);
   assert.doesNotMatch(retired,/Access-Control-Allow-Origin/);
   assert.doesNotMatch(retired,/\.rpc\(/);
 }],

 ['Staging QA adapter is disabled and hard-pinned to isolation',()=>{
   assert.match(staging,/const RECOVERY_RELEASE_ENABLED=false/);
   assert.match(staging,/const EXPECTED_BASE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co'/);
   assert.match(staging,/if\(BASE!==EXPECTED_BASE\|\|SERVICE\.length<20/);
   assert.match(staging,/const ORIGIN='https:\/\/myintmoehein0115024\.github\.io'/);
   assert.doesNotMatch(staging,/const ORIGIN=.*mmhvault\.com/);
   assert.match(staging,/N10_FIXED_RECOVERY_QA_HMAC_KEY/);
   assert.doesNotMatch(staging,/Deno\.env\.get\('N10A740_RATE_HMAC_KEY'\)/);
   assert.match(staging,/const QA_IDENTITIES=new Map<string,string>/);
   assert.match(staging,/bbfa4e52-2ad0-4c8f-a635-6bdcd89b6990/);
   assert.match(staging,/bda2b4a3-ffab-4b00-883b-8a31bb1c6129/);
   assert.match(staging,/n10-vault-qa-a-20261101@no-mail\.mmhvault\.invalid/);
   assert.match(staging,/n10-vault-qa-b-20261101@no-mail\.mmhvault\.invalid/);
   assert.match(staging,/QA_IDENTITIES\.get\(user\.id\)!==user\.email/);
   assert.match(staging,/!user\.email_confirmed_at/);
   assert.match(staging,/user\.app_metadata\?\.mmhvault_auth_kind!=null/);
   assert.doesNotMatch(staging,/N10_FIXED_RECOVERY_QA_UID_ALLOWLIST/);
   assert.equal((staging.match(/await verifiedUser\(req\)/g)||[]).length,3);
   assert.equal((staging.match(/await liveSession\(user\.id,sessionId\)/g)||[]).length,3);
 }],
 ['Staging QA synthetic 10-word initialization requires authenticated proof',()=>{
   assert.match(staging,/import \{wordlist\} from 'npm:@scure\/bip39@1\.6\.0\/wordlists\/english'/);
   assert.match(staging,/crypto\.getRandomValues\(new Uint16Array\(10\)\)/);
   assert.match(staging,/if\(action!=='backup_existing'&&action!=='reveal'&&action!=='qa_initialize'\)/);
   assert.match(staging,/const quotaStatus=await quota\(user\.id\)/);
   assert.match(staging,/if\(!await provePassword\(user,body\.password\)\)/);
   assert.match(staging,/const refreshedAssurance=await verifiedUser\(req\)/);
   assert.match(staging,/const prior=await admin\.from\('mmh_n10a769_recovery_phrases'\)/);
   assert.match(staging,/if\(prior\.data\?\.length\)return out\(origin,'qa_already_initialized',409\)/);
   assert.match(staging,/const phrase=createSyntheticPhrase\(\)/);
   assert.match(staging,/const verifier=await hmac\('phrase:'\+user\.id\+':'\+phrase\)/);
   assert.match(staging,/\.insert\(\{user_id:user\.id,verifier,version:1\}\)/);
   assert.match(staging,/return out\(origin,'qa_phrase_initialized',200/);
   assert.match(staging,/expires_in_seconds:45/);
   assert.match(staging,/const RECOVERY_RELEASE_ENABLED=false/);
 }],
 ['recovery Edge release disabled',()=>assert.match(edge,/const RECOVERY_RELEASE_ENABLED=false/)],
 ['signup candidate release disabled',()=>assert.match(signup,/const RELEASE_ENABLED=false/)],
 ['verified bearer proof',()=>assert.match(edge,/admin\.auth\.getUser\(m\[1\]\)/)],
 ['MFA assurance checked',()=>assert.match(edge,/evaluateVerifiedAuthUserMfa\(m\[1\]/)],
 ['owner restricted to username-only',()=>assert.match(edge,/mmhvault_auth_kind!=='username_only'/)],
 ['fresh password required',()=>assert.match(edge,/await provePassword\(user,body\.password\)/)],
 ['server-managed MFA rechecked after password proof',()=>{
   assert.equal((edge.match(/await verifiedUser\(req\)/g)||[]).length,3);
   assert.match(edge,/refreshedAssurance\.state==='required'/);
   assert.match(edge,/refreshedAssurance\.user\.id!==user\.id/);
   assert.match(edge,/refreshedAssurance\.sessionId!==sessionId/);
   assert.match(edge,/finalAssurance\.state==='required'/);
   assert.match(edge,/finalAssurance\.sessionId!==sessionId/);
 }],
 ['three session validity checks',()=>assert.equal((edge.match(/await liveSession\(user\.id,sessionId\)/g)||[]).length,3)],
 ['rate limit uses keyed HMAC',()=>assert.match(edge,/p_bucket:await hmac\(/)],
 ['backup and reveal share 5-attempt / 15-min bucket',()=>{assert.match(edge,/n10-fixed-recovery:secret_proof:/);assert.match(edge,/p_limit:5,p_window_seconds:900/);assert.doesNotMatch(edge,/n10-fixed-recovery:'\+action/)}],
 ['maximum request body enforced during stream',()=>assert.match(edge,/if\(total>1200\)/)],
 ['original phrase verified against immutable HMAC',()=>assert.match(edge,/equal64\(records\.data\[0\]\.verifier,mac\)/)],
 ['no direct plaintext logs',()=>assert.doesNotMatch(edge,/console\.(?:log|error)\s*\(/)],
 ['signup exception logger contains no SDK exception payload',()=>{
   assert.match(signup,/console\.error\('n10a766_service_error'\)/);
   assert.doesNotMatch(signup,/console\.error\('n10a766_service_error',/);
   assert.doesNotMatch(signup,/console\.(?:log|error)\s*\([^)]*String\(e\)/);
   assert.match(signup,/catch\(_\)\{console\.error\('n10a766_service_error'\);return reply\(origin,'auth_unavailable',503\)\}\}\);/);
 }],
 ['partial password grant revokes isolated session on failure',()=>{
   assert.match(signup,/async function verifyPassword\(email:string,pwd:string,uid:string\)/);
   assert.match(signup,/let keepSession=false/);
   assert.match(signup,/if\(bad\|\|check\.user\?\.id!==uid\)return null/);
   assert.match(signup,/keepSession=true;/);
   assert.match(signup,/if\(!keepSession\)\{try\{await client\.auth\.signOut\(\{scope:'local'\}\)/);
 }],
 ['failed signup cleanup quarantines before exposing account',()=>{
   assert.match(signup,/async function compensateFailedSignup\(uid:string\)/);
   assert.match(signup,/admin\.auth\.admin\.deleteUser\(uid\)/);
   assert.match(signup,/admin\.auth\.admin\.updateUserById\(uid,\{ban_duration:'876000h'\}\)/);
   assert.match(signup,/mmh_n10a740_username_links'\)\.delete\(\)\.eq\('user_id',uid\)/);
   assert.match(signup,/if\(!success&&uid\)await compensateFailedSignup\(uid\)/);
   assert.match(signup,/await releaseSignupReservation\(username,ticket\)/);
   assert.match(signup,/a766_orphan_cleanup_failed.*manual_intervention_required/);
 }],
 ['SQL controlled transaction',()=>{assert.match(sql,/^BEGIN;/m);assert.match(sql,/^COMMIT;/m)}],
 ['Staging synthetic verifier is isolated and data-free',()=>{
   assert.match(syntheticVerifier,/AUTH-STAGING SYNTHETIC VERIFIER FIXTURE/);
   assert.match(syntheticVerifier,/ldivswlhtgmznzwhzsoi/);
   assert.match(syntheticVerifier,/^CREATE TABLE public\.mmh_n10a769_recovery_phrases \(/m);
   assert.match(syntheticVerifier,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
   assert.match(syntheticVerifier,/ENABLE ROW LEVEL SECURITY/);
   assert.match(syntheticVerifier,/REVOKE ALL ON TABLE/);
   assert.match(syntheticVerifier,/GRANT SELECT, INSERT, DELETE ON TABLE/);
   assert.doesNotMatch(syntheticVerifier,/^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|CREATE USER|DROP)\s/mi);
   assert.doesNotMatch(syntheticVerifier,/CREATE TABLE IF NOT EXISTS/);
 }],
 ['Staging migration is collision-failing first install only',()=>{
   assert.match(sql,/^CREATE SCHEMA mmh_n10_privacy;/m);
   assert.match(sql,/^CREATE TABLE mmh_n10_privacy.recovery_backup_index\(/m);
   assert.doesNotMatch(sql,/\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:SCHEMA|TABLE|FUNCTION)\s+IF\s+NOT\s+EXISTS\b/i);
   assert.doesNotMatch(sql,/\bCREATE\s+OR\s+REPLACE\s+FUNCTION\b/i);
   assert.equal((sql.match(/^CREATE FUNCTION /gm)||[]).length,6);
 }],
 ['SQL function quotes are balanced',()=>assert.equal((sql.match(/\$\$/g)||[]).length%2,0)],
 ['SQL has no bare broken function delimiters',()=>{assert.doesNotMatch(sql,/\bAS \$(?!\$)\s*$/m);assert.doesNotMatch(sql,/^\$;\s*$/m)}],
 ['private recovery index RLS',()=>assert.match(sql,/recovery_backup_index ENABLE ROW LEVEL SECURITY/)],
 ['private rate bucket RLS',()=>assert.match(sql,/recovery_rate_bucket ENABLE ROW LEVEL SECURITY/)],
 ['original ten words cannot be changed',()=>assert.match(sql,/v_existing IS DISTINCT FROM p_phrase/)],
 ['Vault uses explicit optional 4th key ID',()=>assert.match(sql,/NULL::uuid\); -- Explicit optional key ID/)],
 ['user deletion cleans encrypted backup',()=>{assert.match(sql,/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);assert.match(sql,/cleanup_recovery_vault_secret/)}],
 ['five service-only RPC grants and revocations',()=>{
  for(const fn of ['backup_put','backup_get','backup_exists','take_attempt','session_active']){
   assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.mmh_n10_recovery_'+fn+'('));
   assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_'+fn+'('));
  }
 }],
 ['preflight is strictly SELECT only',()=>{
   assert.match(preflight,/WITH flags AS \(/);
   assert.doesNotMatch(preflight,/^\s*(?:CREATE|ALTER|UPDATE|INSERT|DELETE|DROP|GRANT|REVOKE)\s/mi);
 }],
];
let failure=0;
for(const [name,fn] of cases){try{fn();console.log('PASS',name)}catch(e){failure++;console.error('FAIL',name,e.message)}}
console.log(String(cases.length-failure)+'/'+String(cases.length)+' static security-contract checks');
if(failure)process.exitCode=1;
