// N10 E/F V2 Staging schema: offline-only contract, zero Supabase / Auth I/O.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=readFileSync(new URL('./staging_ef_20261104.sql',import.meta.url),'utf8');
const schema='mmh_n10_v2qa_20261104';
function assertIncludes(value){assert.ok(src.includes(value),value);}
test('Staging-only preflight is explicitly pinned to C/D synthetic sentinels and V1 RPC',()=>{
 assertIncludes("to_regnamespace('mmh_n10_privacy') IS NULL");
 assertIncludes("to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text)') IS NULL");
 assertIncludes("to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL");
 for(const n of ['n10qa_c_20261104','n10qa_d_20261104'])
  assertIncludes("username_key='"+n+"'");
 assertIncludes('CREATE SCHEMA '+schema+';');
 assert.doesNotMatch(src,/vrypucmyrztxgiqhjspd|SUPABASE_SERVICE_ROLE_KEY/);
});
test('Only two isolated synthetic E/F owners and no existing Auth/APP writes',()=>{
 for(const n of ['n10v2qa_e_20261104','n10v2qa_f_20261104'])assertIncludes(n);
 assertIncludes('CREATE TABLE '+schema+'.owners (');
 assertIncludes('INSERT INTO '+schema+'.owners(username_key)');
 const noComment=src.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(noComment,/\b(?:DROP|TRUNCATE)\b/i);
 assert.doesNotMatch(noComment,/\b(?:INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE|CREATE TABLE|CREATE FUNCTION)\s+(?:auth|public|vault)\./i);
});
test('Protected backend-only functions, all seven private tables RLS',()=>{
 for(const n of ['qa_window','owners','verifiers','sessions','username_links','backup_index','rate_buckets'])
  assertIncludes('ALTER TABLE '+schema+'.'+n+' ENABLE ROW LEVEL SECURITY;');
 assertIncludes('REVOKE ALL ON ALL TABLES IN SCHEMA '+schema+' FROM PUBLIC,anon,authenticated,service_role;');
 assertIncludes('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA '+schema+' FROM PUBLIC,anon,authenticated,service_role;');
 assertIncludes('GRANT USAGE ON SCHEMA '+schema+' TO service_role;');
 for(const fn of ['backup_put(uuid,text,text)','recovery_matches(uuid,uuid,uuid,text)','take_attempt(text,integer,integer)'])
   assertIncludes('GRANT EXECUTE ON FUNCTION '+schema+'.'+fn+' TO service_role;');
 assert.equal((src.match(/\bRETURNS boolean\b/g)||[]).length,3);
 assert.doesNotMatch(src,/\bRETURNS text\b/i);
});
test('First escrow is locked and signed-in/link reuse is forbidden',()=>{
 const body=src.split('CREATE FUNCTION '+schema+'.backup_put(')[1]?.split('CREATE FUNCTION '+schema+'.recovery_matches(')[0]||'';
 assert.ok(body.length>2500);
 const lock=body.indexOf('PERFORM 1 FROM '+schema+'.owners locked_owner');
 const firstSession=body.indexOf('NOT EXISTS(SELECT 1 FROM '+schema+'.sessions prior');
 const firstLink=body.indexOf('NOT EXISTS(SELECT 1 FROM '+schema+'.username_links link');
 const encrypted=body.indexOf('vault.create_secret(');
 assert.ok(lock>0&&lock<firstSession&&lock<firstLink&&lock<encrypted);
 for(const value of ['p_verifier !~','r.verifier=p_verifier','FOR UPDATE;','Fixed synthetic key immutable'])
  assert.ok(body.includes(value),value);
 assertIncludes('WHERE win.singleton AND win.enabled AND win.expires_at>now()');
});
test('Time-boxed, no client plaintext recovery and owner + MFA boundary',()=>{
 assertIncludes("VALUES(true,true,'2026-11-04T16:00:00Z'::timestamptz)");
 assertIncludes('p_requester=p_owner AND owner.id=p_owner');
 assertIncludes("s.aal='aal2'");
 assertIncludes('s.factor_verified AND NOT s.revoked');
 assertIncludes('v.decrypted_secret=p_expected_phrase');
 assert.doesNotMatch(src,/https?:\/\/[^\s]+\.supabase\.co/);
});
