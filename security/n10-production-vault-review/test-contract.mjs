// REVIEW ONLY. Pure local source contracts; no network/credentials/data.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMfaAssurance} from './mfa-assurance.mjs';
import {sessionAalFromVerifiedFactors} from './session-aal.mjs';
const src=readFileSync('security/n10-production-vault-review/index.ts','utf8');

test('both independent review gates are hard OFF, exact production host',()=>{
 assert.match(src,/const RECOVERY_RELEASE_ENABLED=false;/);
 assert.match(src,/const PRIVATE_VAULT_SCHEMA_APPROVED=false;/);
 assert.match(src,/if\(!RECOVERY_RELEASE_ENABLED\|\|!PRIVATE_VAULT_SCHEMA_APPROVED\)/);
 assert.match(src,/const EXPECTED_BASE='https:\/\/vrypucmyrztxgiqhjspd\.supabase\.co';/);
 assert.match(src,/const ORIGIN='https:\/\/mmhvault\.com';/);
 assert.doesNotMatch(src,/ldivswlhtgmznzwhzsoi|n10qa_[ab]_20261103|QA_NAMES|ALLOWLIST_OK|staging\.pages\.dev/);
});
test('only status and reveal, no code path to replace or generate a key',()=>{
 assert.match(src,/body\.action==='status'\?\['action'\]/);
 assert.match(src,/body\.action==='reveal'\?\['action','password'\]/);
 assert.match(src,/unexpected_request_field/);
 assert.doesNotMatch(src,/backup_put|backup_existing|createUser|deleteUser|upsert\(|\.insert\(|\.update\(/);
});
test('owner is from verified JWT plus private username link, never request body',()=>{
 assert.match(src,/admin\.auth\.getUser\(m\[1\]\)/);
 assert.match(src,/user\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
 assert.match(src,/\.select\('username_key'\)\.eq\('user_id',user\.id\)\.limit\(2\)/);
 assert.match(src,/links\[0\]\.username_key!==boundName/);
 assert.match(src,/p_user_id:user\.id/g);
 assert.doesNotMatch(src,/p_user_id:body\.|user_id:body\.|target_username|target_user_id/);
});
test('password, rate limit, revocation and MFA rechecks precede release',()=>{
 const ordered=[
  "const authenticated=await verifiedUser(req);",
  "const firstSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "const quotaStatus=await quota(user.id);",
  "if(!await provePassword(user,body.password))",
  "const secondSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "const refreshedAssurance=await verifiedUser(req);",
  "const stored=await admin.rpc('mmh_n10_recovery_backup_get'",
  "const finalAssurance=await verifiedUser(req);",
  "const finalSessionCheck=await liveSession(user.id,sessionId,expectedAal);",
  "return out(origin,'recovery_key',200,{words:phrase.split(' '),expires_in_seconds:45});"
 ];
 let previous=-1;for(const s of ordered){const pos=src.indexOf(s,previous+1);assert.ok(pos>previous,s);previous=pos;}
 assert.match(src,/p_limit:5,p_window_seconds:900/);
});
test('password-only account can use AAL1; enrolled MFA needs AAL2',()=>{
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal1'},false),'allowed');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal2'},true),'required');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal2'},true),'allowed');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal1'},false),'unavailable');
 assert.equal(sessionAalFromVerifiedFactors([]),'aal1');
 assert.equal(sessionAalFromVerifiedFactors([{factor_type:'totp',status:'verified'}]),'aal2');
 assert.equal(sessionAalFromVerifiedFactors([{factor_type:'totp',status:'bogus'}]),null);
});
