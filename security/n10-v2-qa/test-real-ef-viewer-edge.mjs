// N10 E/F real Auth Staging viewer: offline-only review.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./staging_real_ef_viewer_REVIEW_ONLY.ts',import.meta.url),'utf8');
const has=s=>assert.ok(src.includes(s),'missing '+s);
test('Hard OFF, Staging-only and separate service secrets',()=>{
 has("const PROJECT='ldivswlhtgmznzwhzsoi'");
 has("const RELEASE_ENABLED=false;");
 has("const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';");
 has('if(!open())return reply(origin,');
 has("const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';");
 assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd|https:\/\/mmhvault\.com|N10_FIXED_RECOVERY_HMAC_KEY/);
});
test('Requires real signed owner, server-verified factor, AAL2 and session ID',()=>{
 has('const {data,error}=await admin.auth.getUser(token)');
 has("payload.aal!=='aal2'");
 has("f?.factor_type==='totp'&&f?.status==='verified'");
 has('mmh_n10_realef_owner_slot');
 has('mmh_n10_realef_session_active');
 has("user.app_metadata?.mmhvault_qa_scope!==SCOPE");
});
test('No client-supplied owner selectors, fresh password and owner recheck',()=>{
 has("body.action==='status'?['action']");
 has("body.action==='reveal'?['action','password']");
 has('if(Object.keys(body).some(k=>!permitted.includes(k)))');
 has('await checkPassword(auth.user,body.password)');
 has('const afterPassword=await verifiedOwner(request)');
 has('const beforeResponse=await verifiedOwner(request)');
 has('if(!isSameOwner(beforeResponse,auth)');
 has('mmh_n10_realef_backup_get');
});
test('45-second response, no client/local storage, no destructive verbs',()=>{
 has("expires_in_seconds:45");
 has("Cache-Control':'no-store, private'");
 assert.doesNotMatch(src,/console\.|localStorage|sessionStorage|\.admin\.deleteUser\s*\(|\bvault\.create_secret/);
});
