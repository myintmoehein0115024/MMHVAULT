import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('security/n10-username-escrow-candidate/sql/staging_username_reservations_NOT_AUTHORIZED.sql','utf8');
test('SQL is a review-only staging candidate and never auto-approved',()=>{
 assert.match(sql,/STAGING-ONLY SCHEMA CANDIDATE — NOT AUTHORIZED TO EXECUTE/);
 assert.match(sql,/current_setting\('mmhvault\.n10_staging_schema_approved',true\)/);
 assert.match(sql,/IS DISTINCT FROM 'ldivswlhtgmznzwhzsoi-username-reservations-v1'/);
 assert.doesNotMatch(sql,/SET\s+(?:LOCAL\s+)?mmhvault\.n10_staging_schema_approved\s*=/i);
 assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
 assert.doesNotMatch(sql,/DROP\s+TABLE|TRUNCATE\s+|DELETE\s+FROM|CREATE\s+OR\s+REPLACE/i);
});
test('only three new invoker RPCs and two isolated tables are proposed',()=>{
 const funcs=[...sql.matchAll(/CREATE FUNCTION\s+(public\.\w+)/g)].map(m=>m[1]);
 const tables=[...sql.matchAll(/CREATE TABLE\s+(public\.\w+)/g)].map(m=>m[1]);
 assert.deepEqual(funcs.sort(),[
  'public.mmh_n10a769_claim_enrollment',
  'public.mmh_n10a769_reserve_username',
  'public.mmh_n10a769_take_attempt',
 ].sort());
 assert.deepEqual(tables.sort(),[
  'public.mmh_n10a769_rate_buckets',
  'public.mmh_n10a769_signup_reservations',
 ].sort());
 assert.equal((sql.match(/LANGUAGE plpgsql SECURITY INVOKER/g)||[]).length,3);
 assert.doesNotMatch(sql,/LANGUAGE plpgsql SECURITY DEFINER/);
});
test('all new tables have RLS enabled, no public table privilege',()=>{
 for(const table of ['mmh_n10a769_signup_reservations','mmh_n10a769_rate_buckets']){
  assert.ok(sql.includes('ALTER TABLE public.'+table+' ENABLE ROW LEVEL SECURITY;'));
  assert.ok(sql.includes('REVOKE ALL ON public.'+table+' FROM PUBLIC,anon,authenticated,service_role;'));
  assert.ok(sql.includes('GRANT SELECT,INSERT,UPDATE,DELETE'));
 }
 for(const fn of [
  'mmh_n10a769_reserve_username(text,uuid,text)',
  'mmh_n10a769_claim_enrollment(text,uuid,text)',
  'mmh_n10a769_take_attempt(text,integer,integer)']){
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.'+fn));
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.'+fn+' TO service_role;'));
 }
});
test('reject schema drift and require installed Vault/schema prerequisites',()=>{
 assert.match(sql,/to_regclass\('public\.mmh_n10a769_signup_reservations'\) IS NOT NULL/);
 assert.match(sql,/to_regprocedure\('public\.mmh_n10a769_take_attempt\(text,integer,integer\)'\) IS NOT NULL/);
 for(const name of ['mmh_n10a740_username_links','mmh_n10a769_recovery_phrases',
 'mmh_n10_recovery_backup_put','mmh_n10_recovery_backup_get','mmh_n10_recovery_backup_exists']){
  assert.ok(sql.includes(name),name);
 }
});
test('quota counter saturates rather than overflow',()=>{
 assert.ok(sql.includes('LEAST(r.hits,p_limit)+1'));
 assert.ok(sql.includes('RETURN v_hits<=p_limit;'));
});
