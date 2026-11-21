// REVIEW-ONLY N10 real E/F Auth backend contract. No network and no SQL execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./staging_real_ef_backend_NOT_AUTHORIZED.sql',import.meta.url),'utf8');
const schema='mmh_n10_realef_20261104';
const req=(s)=>assert.ok(src.includes(s),'Missing:'+s);
test('rejects incomplete, drifted or live E/F QA schema (not a project-identity guarantee)',()=>{
 req("to_regnamespace('"+schema+"') IS NULL");
 req("to_regnamespace('mmh_n10_v2qa_20261104') IS NULL");
 req("to_regprocedure('public.mmh_n10_recovery_backup_put(uuid,text,text)') IS NOT NULL");
 req("WHERE singleton AND enabled IS FALSE AND expires_at<'2000-01-01'");
 req('mmh_n10_realef_20261104.auth_bindings)<>0');
 req('mmh_n10_realef_20261104.backup_index)<>0');
 req('mmh_n10_v2qa_20261104.backup_index)<>2');
 req("l.username_key LIKE 'n10qa_%')<>4");
});
test('only eight isolated service functions; never edits any other schema',()=>{
 const noComment=src.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(noComment,/\b(?:INSERT INTO|UPDATE|DELETE FROM|ALTER TABLE|CREATE TABLE)\s+(?:auth|public|vault|mmh_n10_privacy|mmh_n10_v2qa_20261104)\./i);
 assert.doesNotMatch(noComment,/\b(?:DROP|TRUNCATE|DELETE FROM auth\.users)\b/i);
 for(const fn of [
  'claim(text,text)','backup_put(uuid,text,text,text)','owner_slot(uuid)','slot_user_id(text)',
  'session_active(uuid,uuid)','backup_get(uuid,uuid)',
  'backup_exists(uuid,uuid)','take_attempt(text,integer,integer)'
 ]) {
  assert.ok(src.replace(/\s+/g,' ').includes('GRANT EXECUTE ON FUNCTION public.mmh_n10_realef_'+fn+' TO service_role;'),'missing grant for '+fn);
 }
 req('REVOKE ALL ON ALL TABLES IN SCHEMA '+schema);
});
test('hard OFF gate required on EVERY callable secret path and AAL2 session',()=>{
 req("WHERE singleton AND enabled AND expires_at>now()");
 req('AND public.mmh_n10_realef_session_active(p_user_id,p_session_id)');
 req("s.aal::text='aal2'");
 req("f.factor_type::text='totp'");
 req("f.status::text='verified'");
 req('s.id=p_session_id');
});
test('original words immutable and exact Vault readback before first session',()=>{
 req('FROM auth.users u WHERE u.id=p_user_id FOR UPDATE');
 req('NOT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.user_id=u.id)');
 req("u.raw_app_meta_data->>'mmhvault_qa_scope'='n10_real_ef_20261104'");
 req('INSERT INTO mmh_n10_realef_20261104.backup_index');
 req('IF original_words IS DISTINCT FROM p_phrase');
 req('immutable_realef_verifiers BEFORE UPDATE OR DELETE');
 req('immutable_realef_claims BEFORE UPDATE OR DELETE');
 req('ON CONFLICT DO NOTHING');
});


test('exactly eight narrowly allowlisted service RPCs; no accidental ninth public endpoint',()=>{
 const expected=[
  'mmh_n10_realef_claim',
  'mmh_n10_realef_backup_put',
  'mmh_n10_realef_owner_slot',
  'mmh_n10_realef_slot_user_id',
  'mmh_n10_realef_session_active',
  'mmh_n10_realef_backup_get',
  'mmh_n10_realef_backup_exists',
  'mmh_n10_realef_take_attempt'
 ].sort();
 const withoutComments=src.replace(/--[^\n]*/g,'');
 const introduced=[...withoutComments.matchAll(/\bCREATE\s+FUNCTION\s+public\.(mmh_n10_realef_\w+)\s*\(/gi)]
  .map(m=>m[1]).sort();
 const granted=[...withoutComments.matchAll(/\bGRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.(mmh_n10_realef_\w+)\s*\([^;]*\)\s*TO\s+service_role\s*;/gi)]
  .map(m=>m[1]).sort();
 const revoked=[...withoutComments.matchAll(/\bREVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.(mmh_n10_realef_\w+)\s*\([^;]*\)\s*FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*;/gi)]
  .map(m=>m[1]).sort();
 assert.deepEqual(introduced,expected,'no extra or missing real E/F public functions');
 assert.deepEqual(granted,expected,'no extra or missing service-role RPC grants');
 assert.deepEqual(revoked,expected,'each function explicitly denies PUBLIC/anon/authenticated');
 assert.match(withoutComments,/^\s*BEGIN\s*;/,'grant revocation must share one transaction');
 assert.match(withoutComments,/\bCOMMIT\s*;\s*$/,'grant revocation must precede commit');
 assert.doesNotMatch(withoutComments,/\bGRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.[^;]*\bTO\s+(?:PUBLIC|anon|authenticated)\s*;/i);
 assert.doesNotMatch(withoutComments,/\bGRANT\s+(?:USAGE|ALL|SELECT|INSERT|UPDATE|DELETE)\b[^;]*\bTO\s+(?:PUBLIC|anon|authenticated)\s*;/i);
});


// Cross-layer consistency audit only. SQL in the NOT_AUTHORIZED file is read
// as UTF-8 text; neither this test nor CI may execute the migration.
test('every real E/F Edge RPC has an exact candidate backend signature',()=>{
 const edges=[
  readFileSync(new URL('./staging_real_ef_signup_REVIEW_ONLY.ts',import.meta.url),'utf8'),
  readFileSync(new URL('./staging_real_ef_viewer_REVIEW_ONLY.ts',import.meta.url),'utf8')
 ];
 const functionPattern=/\bCREATE\s+FUNCTION\s+public\.(mmh_n10_realef_\w+)\s*\(([\s\S]*?)\)\s*RETURNS\s+\w+\s+LANGUAGE\s+\w+\s+(?:STABLE\s+)?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*''/gi;
 const sqlSigs=new Map();
 for(const match of src.matchAll(functionPattern)){
  const [,name,args]=match;
  assert.ok(!sqlSigs.has(name),'no overloaded/duplicate E/F function: '+name);
  const names=args.split(',').map(part=>part.trim().split(/\s+/)[0]);
  assert.ok(names.every(x=>/^p_[a-z_]+$/.test(x)),'all SQL RPC args must be explicitly named: '+name);
  sqlSigs.set(name,names.sort());
 }
 assert.equal(sqlSigs.size,8,'exactly eight privileged SQL functions with fixed search_path');

 const invoked=new Set();
 const rpcPattern=/\badmin\.rpc\(\s*['"](mmh_n10_realef_\w+)['"]\s*,\s*\{([\s\S]*?)\}\s*\)/g;
 for(const [i,edge] of edges.entries()){
  assert.match(edge,/const RELEASE_ENABLED=false;/,'Edge candidate '+i+' must remain hard OFF');
  assert.match(edge,/const QA_WINDOW_END_UTC='1970-01-01T00:00:00\.000Z';/);
  for(const match of edge.matchAll(rpcPattern)){
   const [,name,body]=match;
   assert.ok(sqlSigs.has(name),'Edge references missing backend RPC: '+name);
   const keys=[...body.matchAll(/\b(p_[a-z_]+)\s*:/g)].map(x=>x[1]).sort();
   assert.equal(new Set(keys).size,keys.length,'duplicate RPC key: '+name);
   assert.deepEqual(keys,sqlSigs.get(name),'Edge/SQL parameter mismatch for '+name);
   invoked.add(name);
  }
  const everyReference=[...edge.matchAll(/\badmin\.rpc\(\s*['"](mmh_n10_realef_\w+)['"]/g)];
  const parsed=[...edge.matchAll(rpcPattern)];
  assert.equal(parsed.length,everyReference.length,
   'review every real E/F admin.rpc object, never ignore an unparseable call');
 }
 assert.deepEqual([...invoked].sort(),[...sqlSigs.keys()].sort(),
  'all eight proposed backend RPCs must be exercised by the two Edge candidates');
});
