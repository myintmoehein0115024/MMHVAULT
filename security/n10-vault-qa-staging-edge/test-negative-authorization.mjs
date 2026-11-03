// OFFLINE fixtures ONLY. No JWT is signed or Auth-verified in this file.
// These helpers require independent Supabase Auth verification in the live Edge.
// The negative tests must NOT be described as live cross-owner access attempts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionIdFromVerifiedJwt} from './session-guard.mjs';
import {evaluateVerifiedAuthUserMfa} from './mfa-assurance.mjs';
import {sessionAalFromVerifiedFactors} from './session-aal.mjs';

const edge=readFileSync('security/n10-vault-qa-staging-edge/index.ts','utf8');
const base='https://ldivswlhtgmznzwhzsoi.supabase.co';
const a='00000000-0000-4000-8000-000000000001';
const b='00000000-0000-4000-8000-000000000002';
const sid='00000000-0000-4000-8000-000000000003';
const now=Math.floor(Date.now()/1000);
const totp=[{factor_type:'totp',status:'verified'}];
let checked=0;
function test(name,fn){fn();checked++;console.log('PASS '+name);}
function synthetic(payload={}){
 const p={sub:a,iss:base+'/auth/v1',exp:now+900,session_id:sid,aal:'aal2',...payload};
 return 'e30.'+Buffer.from(JSON.stringify(p)).toString('base64url')+'.unsigned-fixture';
}
const valid=synthetic();
test('only same owner may parse previously Auth-verified session claim',()=>{
 assert.equal(sessionIdFromVerifiedJwt(valid,a,base),sid);
 assert.equal(sessionIdFromVerifiedJwt(valid,b,base),null);
});
test('reject wrong issuer, expiry, missing or malformed session',()=>{
 assert.equal(sessionIdFromVerifiedJwt(synthetic({iss:'https://wrong.invalid/auth/v1'}),a,base),null);
 assert.equal(sessionIdFromVerifiedJwt(synthetic({exp:now-1}),a,base),null);
 assert.equal(sessionIdFromVerifiedJwt(synthetic({session_id:'not-uuid'}),a,base),null);
 assert.equal(sessionIdFromVerifiedJwt('not-a-jwt',a,base),null);
});
test('AAL2 requires current verified factor for signed Auth user',()=>{
 assert.equal(evaluateVerifiedAuthUserMfa(valid,{id:a,factors:totp},base),'allowed');
 assert.equal(evaluateVerifiedAuthUserMfa(synthetic({aal:'aal1'}),{id:a,factors:totp},base),'required');
 assert.equal(evaluateVerifiedAuthUserMfa(valid,{id:a,factors:[]},base),'unavailable');
 assert.equal(evaluateVerifiedAuthUserMfa(valid,{id:b,factors:totp},base),'unavailable');
});
test('malformed or missing server factors do not grant AAL2',()=>{
 assert.equal(sessionAalFromVerifiedFactors(totp),'aal2');
 assert.equal(sessionAalFromVerifiedFactors([]),'aal1');
 assert.equal(sessionAalFromVerifiedFactors([null]),null);
 assert.equal(sessionAalFromVerifiedFactors([{status:'other'}]),null);
});
test('candidate requires verified TOTP and refuses password-only downgrade',()=>{
 assert(edge.includes("if(expectedAal!=='aal2'||!factors.factors.some("));
 assert(edge.includes("f?.factor_type==='totp'&&f?.status==='verified'"));
 assert(edge.includes("return {state:'required' as const};"));
});
test('bind both verified owner ID and email, never client-supplied owner',()=>{
 assert(edge.includes("QA_IDENTITIES.get(user.id)!==user.email"));
 assert(edge.includes("admin.auth.getUser(m[1])"));
 assert(edge.includes("admin.auth.admin.mfa.listFactors({userId:user.id})"));
 for(const forbidden of ['body.user_id','body.userId','body.owner_id','body.p_user_id']){
  assert(!edge.includes(forbidden),forbidden);
 }
});
test('verifier, escrow, lookup and rate limit use authenticated owner',()=>{
 assert(edge.includes(".eq('user_id',user.id)"));
 assert(edge.includes("p_user_id:user.id"));
 assert(edge.includes("await quota(user.id)"));
 assert(edge.includes("await provePassword(user,body.password)"));
});
test('sensitive paths reverify the same live session and MFA',()=>{
 assert(edge.includes("const secondSessionCheck=await liveSession(user.id,sessionId,expectedAal);"));
 assert(edge.includes("const refreshedAssurance=await verifiedUser(req);"));
 assert(edge.includes("const initDisclosureSessionCheck=await liveSession(user.id,sessionId,expectedAal);"));
 assert(edge.includes("const finalSessionCheck=await liveSession(user.id,sessionId,expectedAal);"));
});
test('candidate remains closed until a separate short approved Staging release',()=>{
 assert(edge.includes("const RECOVERY_RELEASE_ENABLED=false;"));
 assert(edge.includes("const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';"));
 assert(edge.includes("const QA_IDENTITIES=new Map<string,string>([]);"));
 assert(!edge.includes('vrypucmyrztxgiqhjspd'));
});
console.log(checked+' synthetic negative authorization checks PASS; live cross-owner penetration remains UNTESTED.');
