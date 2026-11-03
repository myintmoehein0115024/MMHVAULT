// N10 Staging: offline checks only. Never access Auth, Vault or recovery words.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('./username-vault-review-only.ts',import.meta.url),'utf8');
test('username Vault QA is a separate hard-OFF, expiring, review-only service',()=>{
 assert.match(edge,/const RECOVERY_RELEASE_ENABLED=false;/);
 assert.match(edge,/const QA_WINDOW_END_UTC='1970-01-01T00:00:00\.000Z'/);
 assert.match(edge,/const EXPECTED_BASE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co'/);
 assert.match(edge,/const QA_NAMES=new Set\(\['n10qa_a_20261103','n10qa_b_20261103'\]\)/);
 assert.match(edge,/const ORIGIN='https:\/\/mmhvault-n10-vault-staging\.pages\.dev'/);
 assert.doesNotMatch(edge,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com\b/);
});
test('never mutate recovery word records or Auth factors',()=>{
 for(const bad of [/qa_initialize/,/backup_existing/,/mmh_n10_recovery_backup_put/,/createSyntheticPhrase/,/generateRecoveryWords/,/\.insert\(/,/\.upsert\(/,/\.update\(/,/\.delete\(/,/admin\.auth\.admin\.deleteUser\(/])
  assert.doesNotMatch(edge,bad);
 assert.match(edge,/mmh_n10_recovery_backup_exists/);
 assert.match(edge,/mmh_n10_recovery_backup_get/);
});
test('bind verified JWT UID and real MFA to authoritative username link before Vault RPC',()=>{
 assert.match(edge,/admin\.auth\.getUser\(m\[1\]\)/);
 assert.match(edge,/admin\.auth\.admin\.mfa\.listFactors\(\{userId:user\.id\}\)/);
 assert.match(edge,/evaluateVerifiedAuthUserMfa\(m\[1\],\{\.\.\.user,factors:factors\.factors\},BASE\)/);
 assert.match(edge,/if\(expectedAal!=='aal2'\|\|!factors\.factors\.some\(/);
 assert.match(edge,/sessionIdFromVerifiedJwt\(m\[1\],user\.id,BASE\)/);
 assert.match(edge,/user\.app_metadata\?\.mmhvault_auth_kind!=='username_only'/);
 assert.match(edge,/\.select\('username_key'\)\.eq\('user_id',user\.id\)\.limit\(2\)/);
 assert.match(edge,/links\[0\]\.username_key!==boundName\|\|!QA_NAMES\.has\(boundName\)/);
 assert.match(edge,/mmh_n10_recovery_session_active/);
 assert.match(edge,/const secondSessionCheck=await liveSession\(user\.id,sessionId,expectedAal\)/);
 assert.match(edge,/const refreshedAssurance=await verifiedUser\(req\)/);
 assert.match(edge,/const finalSessionCheck=await liveSession\(user\.id,sessionId,expectedAal\)/);
 assert.match(edge,/await provePassword\(user,body\.password\)/);
 assert.match(edge,/await quota\(user\.id\)/);
});
test('B attempting to target A with body owner fields always hits strict deny',()=>{
 assert.match(edge,/const permitted=body\.action==='status'\?\['action'\]:/);
 assert.match(edge,/body\.action==='reveal'\?\['action','password'\]:\[\]/);
 assert.match(edge,/if\(Object\.keys\(body\)\.some\(key=>!permitted\.includes\(key\)\)\)/);
 assert.match(edge,/return out\(origin,'unexpected_request_field',400\)/);
 const keys=['action','password'];
 for(const k of ['user_id','p_user_id','owner','target_username','target_user_id','account_id'])
  assert.equal(keys.includes(k),false);
 for(const unsafe of [/body\.user_id/,/body\.p_user_id/,/body\.owner_id/,/body\.target_user_id/,/body\.target_username/])
  assert.doesNotMatch(edge,unsafe);
 assert.match(edge,/p_user_id:user\.id/);
 assert.match(edge,/const stored=await admin\.rpc\('mmh_n10_recovery_backup_get',\{p_user_id:user\.id\}\)/);
});
test('reveal response is uncached and never issued without final same-session check',()=>{
 assert.match(edge,/Cache-Control':'no-store, private'/);
 assert.match(edge,/return out\(origin,'recovery_key',200,\{words:phrase\.split\(' '\),expires_in_seconds:45\}\)/);
 const lastCheck=edge.indexOf("const finalSessionCheck=await liveSession(user.id,sessionId,expectedAal)");
 const disclosure=edge.indexOf("return out(origin,'recovery_key',200");
 assert.ok(lastCheck>0&&lastCheck<disclosure);
});
