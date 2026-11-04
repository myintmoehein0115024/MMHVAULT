// Staging-only real E/F review Edge contract; OFFLINE ONLY.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./staging_real_ef_signup_REVIEW_ONLY.ts',import.meta.url),'utf8');
const has=s=>assert.ok(src.includes(s),'missing: '+s);
test('no deployment, hard-OFF time gate and fixed Staging origin',()=>{
 has("const PROJECT='ldivswlhtgmznzwhzsoi'");
 has("const RELEASE_ENABLED=false;");
 has("const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';");
 has('if(!open())return reply(origin,');
 has("const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';");
 assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com|Deno\.env\.get\('N10A740_TURNSTILE_SECRET'\)/);
});
test('strict E/F identities and safe Auth Admin create API only',()=>{
 has("n10real_e_20261104:'E'");
 has("n10real_f_20261104:'F'");
 has("mmhvault_qa_scope:QA_SCOPE");
 has("const QA_SCOPE='n10_real_ef_20261104'");
 has('await admin.auth.admin.createUser({');
 has("p_slot:slot,p_claim_hash:await mac('claim:'+slot+':'+crypto.randomUUID())");
 assert.doesNotMatch(src,/\.admin\.deleteUser\s*\(|UPDATE\s+auth\.users|INSERT INTO\s+auth\.users/);
});
test('immutable original escrow before first session grant',()=>{
 has('const phrase=generateWords()');
 has('mmh_n10_realef_backup_put');
 has("p_verifier:await mac('phrase:'+newUserId+':'+phrase)");
 const backup=src.indexOf("mmh_n10_realef_backup_put");
 const session=src.indexOf("const session=await verifiedPasswordSession(email,password,newUserId,slot)");
 assert.ok(backup>0&&session>backup);
 has('await quarantineNewUser(newUserId,email,name)');
 has('return {code:');
 has("expires_in_seconds:45");
});
test('signup/login isolated RPC, rate, captcha and request safeguards',()=>{
 has('mmh_n10_realef_claim');
 has('mmh_n10_realef_slot_user_id');
 has('mmh_n10_realef_take_attempt');
 has("data?.hostname===SITE_HOST");
 has("data?.action==='mmh_n10_realef_'+action");
 has("!['action','username','password','captcha_token'].includes(k)");
 has("if(!slotOf(data.username)||typeof data.password!=='string'");
 has("Cache-Control':'no-store, private'");
 assert.doesNotMatch(src,/console\.log|localStorage|sessionStorage|function resetRecovery|function rotateRecovery/i);
});

test('new Auth sessions re-check the private E/F gate and sign out if it closes mid-login',()=>{
 has('async function ownerGateOpen(uid,expectedSlot)');
 has("admin.rpc('mmh_n10_realef_owner_slot'");
 has('if(!await ownerGateOpen(expectedId,expectedSlot))return null;');
 has("if(!result)try{await client.auth.signOut({scope:'local'});}");
 has('verifiedPasswordSession(email,password,newUserId,slot)');
 has('verifiedPasswordSession(user.email,password,userId,slot)');
});
