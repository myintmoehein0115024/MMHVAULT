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
const signup=readFileSync(resolve(here,'username-signup-integration-NOT_DEPLOYED.ts'),'utf8');
const cases=[
 ['recovery Edge release disabled',()=>assert.match(edge,/const RECOVERY_RELEASE_ENABLED=false/)],
 ['signup candidate release disabled',()=>assert.match(signup,/const RELEASE_ENABLED=false/)],
 ['verified bearer proof',()=>assert.match(edge,/admin\.auth\.getUser\(m\[1\]\)/)],
 ['MFA assurance checked',()=>assert.match(edge,/evaluateVerifiedAuthUserMfa\(m\[1\]/)],
 ['owner restricted to username-only',()=>assert.match(edge,/mmhvault_auth_kind!=='username_only'/)],
 ['fresh password required',()=>assert.match(edge,/await provePassword\(user,body\.password\)/)],
 ['server-managed MFA rechecked after password proof',()=>{
   assert.equal((edge.match(/await verifiedUser\(req\)/g)||[]).length,2);
   assert.match(edge,/refreshedAssurance\.state==='required'/);
   assert.match(edge,/refreshedAssurance\.user\.id!==user\.id/);
   assert.match(edge,/refreshedAssurance\.sessionId!==sessionId/);
 }],
 ['three session validity checks',()=>assert.equal((edge.match(/await liveSession\(user\.id,sessionId\)/g)||[]).length,3)],
 ['rate limit uses keyed HMAC',()=>assert.match(edge,/p_bucket:await hmac\(/)],
 ['backup and reveal share 5-attempt / 15-min bucket',()=>{assert.match(edge,/n10-fixed-recovery:secret_proof:/);assert.match(edge,/p_limit:5,p_window_seconds:900/);assert.doesNotMatch(edge,/n10-fixed-recovery:'\+action/)}],
 ['maximum request body enforced during stream',()=>assert.match(edge,/if\(total>1200\)/)],
 ['original phrase verified against immutable HMAC',()=>assert.match(edge,/equal64\(records\.data\[0\]\.verifier,mac\)/)],
 ['no direct plaintext logs',()=>assert.doesNotMatch(edge,/console\.(?:log|error)\s*\(/)],
 ['SQL controlled transaction',()=>{assert.match(sql,/^BEGIN;/m);assert.match(sql,/^COMMIT;/m)}],
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
