// Offline-only: never execute the retired QA service. No network or credentials.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('security/n10-fixed-recovery-vault-candidate/retire-joint-qa-edge-REVIEW_ONLY.ts','utf8');
const code=src.replace(/^\s*\/\/[^\n]*$/gm,'');
const cases=[
 ['retirement is scoped to the exact previously disabled Staging Edge',()=>{
  assert.match(src,/mmh-n10-qa-joint-mfa-vault-20261101/);
  assert.match(src,/ldivswlhtgmznzwhzsoi/);
  assert.match(src,/NOT DEPLOYED/);
  assert.match(src,/verify_jwt=true/);
  assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd/);
 }],
 ['all authorized requests return 410 with no user/session-dependent content',()=>{
  assert.match(code,/Deno\.serve\(/);
  assert.match(code,/code:'qa_retired'/);
  assert.match(code,/status:410/);
  assert.match(code,/Cache-Control':'no-store/);
  assert.match(code,/Content-Security-Policy/);
  assert.match(code,/Cross-Origin-Resource-Policy/);
  assert.doesNotMatch(code,/Access-Control-Allow-Origin|Access-Control-Allow-Credentials/);
 }],
 ['no API, JWT, Vault, database, environment, QA unlock or outbound network',()=>{
  assert.doesNotMatch(code,/\b(?:fetch|createClient|import|await|new WebSocket|console\.|eval\()\b/);
  assert.doesNotMatch(code,/Deno\.env|\.rpc\(|auth\.|vault\.|supabase|secret|token|password|RECOVERY_RELEASE_ENABLED|QA_IDENTITIES|QA_WINDOW_END_UTC|verify_jwt\s*[:=]\s*false/i);
  assert.doesNotMatch(code,/mmh_n10_recovery_session_active/);
 }],
];
let fail=0;
for(const [name,run] of cases){
 try{run();console.log('PASS',name);}
 catch(e){fail++;console.error('FAIL',name,e.message);}
}
console.log((cases.length-fail)+'/'+cases.length+' inert retirement contracts');
if(fail)process.exitCode=1;
