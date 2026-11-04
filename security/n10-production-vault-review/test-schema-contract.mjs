// OFFLINE / REVIEW ONLY. Zero SQL execution and no Production credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('security/n10-production-vault-review/sql/production_private_vault_NOT_AUTHORIZED.sql','utf8');
const names=['backup_put(uuid,text)','backup_exists(uuid)','backup_get(uuid)',
'session_active(uuid,uuid,text)','take_attempt(text,integer,integer)'];
test('Production migration requires two independent externally supplied guards',()=>{
 assert.match(src,/NOT AUTHORIZED/);
 assert.match(src,/current_setting\('mmhvault\.n10_private_vault_schema_approved',true\)/);
 assert.match(src,/current_setting\('mmhvault\.n10_private_vault_project_ref',true\)/);
 assert.match(src,/IS DISTINCT FROM 'vrypucmyrztxgiqhjspd'/);
 assert.ok(src.includes("to_regclass('public.mmh_n10a740_username_links') IS NULL"));
 assert.doesNotMatch(src,/\bSET\s+(?:LOCAL\s+)?mmhvault\.n10_private_vault_/i);
 assert.match(src,/BEGIN;[\s\S]*COMMIT;/);
 assert.doesNotMatch(src,/\bDROP\s+|\bTRUNCATE\s+|DELETE\s+FROM|CREATE\s+OR\s+REPLACE/i);
});
test('private RLS, secret index immutable, no direct client privileges',()=>{
 assert.match(src,/CREATE SCHEMA mmh_n10_privacy/);
 assert.match(src,/user_id uuid PRIMARY KEY REFERENCES auth\.users\(id\) ON DELETE RESTRICT/);
 assert.match(src,/secret_id uuid NOT NULL UNIQUE/);
 for(const table of ['recovery_backup_index','recovery_rate_bucket'])
   assert.ok(src.includes('ALTER TABLE mmh_n10_privacy.'+table+' ENABLE ROW LEVEL SECURITY;'));
 assert.match(src,/REVOKE ALL ON SCHEMA mmh_n10_privacy FROM PUBLIC,anon,authenticated,service_role/);
 assert.match(src,/REVOKE ALL ON ALL TABLES IN SCHEMA mmh_n10_privacy FROM PUBLIC,anon,authenticated,service_role/);
 assert.doesNotMatch(src,/CREATE\s+POLICY|GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\b/i);
});
test('five RPCs are restricted to service_role, no client EXECUTE grants',()=>{
 assert.equal((src.match(/SECURITY DEFINER SET search_path = ''/g)||[]).length,5);
 for(const name of names){
  assert.ok(src.includes('REVOKE ALL ON FUNCTION public.mmh_n10_recovery_'+name+' FROM PUBLIC,anon,authenticated;'),name);
  assert.ok(src.includes('GRANT EXECUTE ON FUNCTION public.mmh_n10_recovery_'+name+' TO service_role;'),name);
 }
 assert.equal((src.match(/TO service_role;/g)||[]).length,5);
});
test('fresh signup only, encrypted once, exact original immutable',()=>{
 assert.match(src,/JOIN public\.mmh_n10a769_recovery_phrases r ON r\.user_id=u\.id/);
 assert.ok(src.includes("AND r.version=1 AND r.verifier ~ '^[a-f0-9]{64}$'"));
 assert.ok(src.includes("AND NOT EXISTS(SELECT 1 FROM auth.sessions AS prior WHERE prior.user_id=p_user_id)"));
 assert.ok(src.includes("AND NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links AS link"));
 assert.match(src,/u\.created_at>=now\(\)-interval '30 minutes'/);
 assert.match(src,/r\.created_at>=now\(\)-interval '30 minutes'/);
 assert.match(src,/u\.raw_app_meta_data->>'mmhvault_auth_kind'='username_only'/);
 assert.match(src,/pg_catalog\.pg_advisory_xact_lock/);
 assert.match(src,/FOR UPDATE/);
 assert.match(src,/v_existing IS DISTINCT FROM p_phrase/);
 assert.match(src,/vault\.create_secret\(/);
 assert.doesNotMatch(src,/ON CONFLICT[^;]*DO UPDATE[^;]*recovery_backup_index/i);
});
test('server sessions enforce MFA AAL2, AAL1 only without enrolled factors',()=>{
 assert.match(src,/FROM auth\.sessions s/);
 assert.match(src,/s\.user_id=p_user_id/);
 assert.match(src,/s\.not_after IS NULL OR s\.not_after>now\(\)/);
 assert.match(src,/p_expected_aal='aal1'/);
 assert.match(src,/s\.factor_id IS NULL/);
 assert.match(src,/p_expected_aal='aal2'/);
 assert.match(src,/f\.id=s\.factor_id/);
 assert.match(src,/f\.status::text='verified'/);
});
test('rate limiter saturates without overflow and words stay inside Vault',()=>{
 assert.match(src,/LEAST\(rb\.attempts,p_limit\)\+1/);
 assert.match(src,/RETURN v_attempts<=p_limit/);
 assert.match(src,/JOIN vault\.decrypted_secrets v ON v\.id=i\.secret_id/);
});
