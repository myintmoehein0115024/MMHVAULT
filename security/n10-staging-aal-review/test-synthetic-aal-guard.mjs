import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {evaluateSyntheticAalSession as ok} from './synthetic-aal-guard.mjs';

const uid='41111111-1111-4111-8111-111111111111';
const other='42222222-2222-4222-8222-222222222222';
const sid='51111111-1111-4111-8111-111111111111';
const fid='61111111-1111-4111-8111-111111111111';
const now=Date.parse('2026-11-02T08:00:00Z');
const session={id:sid,user_id:uid,not_after:'2026-11-03T00:00:00Z',aal:'aal1',factor_id:null};
const verified={id:fid,user_id:uid,status:'verified'};
function evaluate(props={}) {
 return ok({userId:uid,sessionId:sid,expectedAal:'aal1',session,factors:[],nowMs:now,...props});
}
test('AAL1 works only for the exact active owner and session, without a verified factor',()=>{
 assert.equal(evaluate(),true);
 assert.equal(evaluate({userId:other}),false);
 assert.equal(evaluate({sessionId:fid}),false);
 assert.equal(evaluate({session:{...session,id:fid}}),false);
 assert.equal(evaluate({session:{...session,user_id:other}}),false);
});
test('expired session or malformed expiry always fails closed',()=>{
 assert.equal(evaluate({session:{...session,not_after:'2026-11-01T00:00:00Z'}}),false);
 assert.equal(evaluate({session:{...session,not_after:'bad'}}),false);
 assert.equal(evaluate({session:{...session,not_after:'2026-11-02T08:00:00Z'}}),false);
});
test('AAL1 is denied immediately after a verified MFA factor appears',()=>{
 assert.equal(evaluate({factors:[verified]}),false);
 assert.equal(evaluate({factors:[{...verified,status:'unverified'}]}),true);
 assert.equal(evaluate({factors:[{...verified,user_id:other}]}),true);
});
test('AAL1 cannot use an AAL2 session or a bound factor ID',()=>{
 assert.equal(evaluate({session:{...session,aal:'aal2'}}),false);
 assert.equal(evaluate({session:{...session,factor_id:fid}}),false);
});
test('AAL2 accepts only a currently verified factor bound to the same session owner',()=>{
 const s={...session,aal:'aal2',factor_id:fid};
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:[verified]}),true);
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:[]}),false);
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:[{...verified,status:'unverified'}]}),false);
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:[{...verified,user_id:other}]}),false);
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:[{...verified,id:other}]}),false);
});
test('AAL2 rejects unknown expected levels, or an AAL1 session',()=>{
 assert.equal(evaluate({expectedAal:'aal2',factors:[verified]}),false);
 assert.equal(evaluate({expectedAal:'aal3',factors:[verified]}),false);
 assert.equal(evaluate({expectedAal:''}),false);
});
test('missing/deleted or cross-owner sessions are denied',()=>{
 assert.equal(evaluate({session:null}),false);
 assert.equal(evaluate({userId:undefined}),false);
 assert.equal(evaluate({sessionId:other}),false);
 assert.equal(evaluate({session:{...session,id:null}}),false);
});
test('malformed factor data fails closed for AAL2',()=>{
 const s={...session,aal:'aal2',factor_id:fid};
 assert.equal(evaluate({session:s,expectedAal:'aal2',factors:null}),false);
 assert.equal(evaluate({session:{...s,factor_id:'invalid'},expectedAal:'aal2',factors:[verified]}),false);
});
test('future staging SQL is blocked unconditionally and always rolls back',()=>{
 const sql=readFileSync(new URL('../../docs/sql/n10_staging_aal_v2_BLOCKED_REVIEW_20261102.sql',import.meta.url),'utf8');
 assert.match(sql,/BEGIN;\s*SET LOCAL statement_timeout/);
 assert.match(sql,/RAISE EXCEPTION 'N10 STAGING V2 REVIEW ONLY: database changes NOT authorized'/);
 assert.match(sql,/DO \$n10_never_execute\$/);
 assert.match(sql,/\bROLLBACK;\s*$/);
 assert.doesNotMatch(sql,/\bDROP\b\s+(?:TABLE|FUNCTION|SCHEMA|TRIGGER)/i);
 assert.doesNotMatch(sql,/\b(?:DELETE\s+FROM|TRUNCATE|UPDATE\s+auth\.)/i);
 assert.doesNotMatch(sql,/\bCREATE TABLE\b/i);
});
test('SQL defines a new three-argument overload and grants service role only',()=>{
 const sql=readFileSync(new URL('../../docs/sql/n10_staging_aal_v2_BLOCKED_REVIEW_20261102.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE FUNCTION public\.mmh_n10_recovery_session_active\(\s*p_user_id uuid, p_session_id uuid, p_expected_aal text/i);
 assert.match(sql,/STABLE SECURITY DEFINER/);
 assert.match(sql,/SET search_path=''/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)\s+FROM PUBLIC,anon,authenticated,service_role/i);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.mmh_n10_recovery_session_active\(uuid,uuid,text\)\s+TO service_role/i);
 assert.match(sql,/s\.id=p_session_id/);
 assert.match(sql,/s\.user_id=p_user_id/);
 assert.match(sql,/s\.not_after IS NULL OR s\.not_after>now\(\)/);
 assert.match(sql,/s\.aal::text='aal1'/);
 assert.match(sql,/s\.aal::text='aal2'/);
 assert.match(sql,/f\.id=s\.factor_id/);
 assert.match(sql,/f\.status::text='verified'/);
});
test('preflight is read-only and does not read sensitive user rows',()=>{
 const sql=readFileSync(new URL('../../docs/sql/n10_staging_aal_v2_READ_ONLY_PREFLIGHT_20261102.sql',import.meta.url),'utf8');
 assert.match(sql,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY/);
 assert.match(sql,/\bROLLBACK;\s*$/);
 assert.doesNotMatch(sql,/\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\s+(?:TABLE|FUNCTION|SCHEMA|INTO|auth\.|mmh_)/i);
 assert.doesNotMatch(sql,/\bSELECT\s+\*\s+FROM\s+(?:auth\.users|auth\.sessions|vault\.decrypted_secrets)/i);
});
