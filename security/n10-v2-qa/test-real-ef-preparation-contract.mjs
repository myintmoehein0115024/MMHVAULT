// N10 real E/F Staging Auth readiness; OFFLINE ONLY. Never calls Supabase.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('./staging_real_ef_preparation_20261104.sql',import.meta.url),'utf8');
const schema='mmh_n10_realef_20261104';
function has(v){assert.ok(src.includes(v),'Required guard missing: '+v);}

test('Staging-only preflight pins old E/F hard-OFF and four prior QA backups',()=>{
  has("to_regnamespace('mmh_n10_v2qa_20261104') IS NULL");
  has("to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL");
  has('mmh_n10_v2qa_20261104.qa_window WHERE singleton AND enabled IS FALSE');
  has('mmh_n10_v2qa_20261104.backup_index) <> 2');
  has("l.username_key LIKE 'n10qa_%') <> 4");
  has('CREATE SCHEMA '+schema+';');
});

test('Only two reserved slots, zero Auth creations/secret or session writes',()=>{
  for(const name of ['n10real_e_20261104','n10real_f_20261104'])has(name);
  has("VALUES ('E','n10real_e_20261104'),('F','n10real_f_20261104');");
  has('REFERENCES auth.users(id) ON DELETE RESTRICT');
  has('REFERENCES '+schema+'.auth_bindings(user_id) ON DELETE RESTRICT');
  const noComment=src.replace(/--[^\n]*/g,'');
  assert.doesNotMatch(noComment,/\b(?:INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE|CREATE TABLE|CREATE FUNCTION)\s+(?:auth|public|vault|mmh_n10_privacy|mmh_n10_v2qa_20261104)\./i);
  assert.doesNotMatch(noComment,/\bvault\.(?:create_secret|update_secret)\s*\(/i);
  assert.doesNotMatch(noComment,/\bGRANT\b/i);
});

test('Hard OFF gate, RLS and no table/function grants to any client',()=>{
  has("VALUES(true,false,'1970-01-01T00:00:00Z'::timestamptz);");
  for(const name of ['qa_gate','expected_identity','auth_bindings','backup_index'])
    has('ALTER TABLE '+schema+'.'+name+' ENABLE ROW LEVEL SECURITY;');
  has('REVOKE ALL ON ALL TABLES IN SCHEMA '+schema+' FROM PUBLIC,anon,authenticated,service_role;');
  has('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA '+schema+' FROM PUBLIC,anon,authenticated,service_role;');
  has('REVOKE ALL ON SCHEMA '+schema+' FROM PUBLIC,anon,authenticated,service_role;');
});

test('Future Auth binding proves fresh server-side owner and never rotates original key',()=>{
  for(const a of [
    "u.raw_app_meta_data->>'mmhvault_auth_kind'='username_only'",
    "u.raw_app_meta_data->>'mmhvault_username'=expected_name",
    "u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'",
    'u.created_at >= (SELECT g.created_at',
    'NOT EXISTS(SELECT 1 FROM auth.sessions',
    'NOT EXISTS(SELECT 1 FROM public.mmh_n10a740_username_links',
    'immutable_auth_bindings BEFORE UPDATE OR DELETE',
    'immutable_backup_index BEFORE UPDATE OR DELETE'
  ])has(a);
});
