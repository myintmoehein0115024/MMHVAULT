import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionAalFromVerifiedFactors as derive} from './session-aal.mjs';
import {evaluateMfaAssurance} from './mfa-assurance.mjs';

const load=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const code=load('./index.ts'), legacy=load('./rollback/v1-index.ts');
const count=(s,x)=>s.split(x).length-1;
test('locked site, expired QA window and empty whitelist are identical to v1',()=>{
 for(const s of [code,legacy]){
  assert.match(s,/const RECOVERY_RELEASE_ENABLED=false;/);
  assert.match(s,/const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'/);
  assert.match(s,/const QA_IDENTITIES=new Map<string,string>\(\[\]\)/);
  assert.match(s,/const ALLOWLIST_OK=QA_IDENTITIES\.size===2/);
  assert.match(s,/const EXPECTED_BASE='https:\/\/ldivswlhtgmznzwhzsoi\.supabase\.co'/);
  assert.match(s,/const ORIGIN='https:\/\/myintmoehein0115024\.github\.io'/);
  const g=s.indexOf('if(!RECOVERY_RELEASE_ENABLED)');
  const t=s.indexOf('if(!(Date.parse(QA_WINDOW_END_UTC)>Date.now()))');
  const u=s.indexOf('const authenticated=await verifiedUser(req)');
  assert.ok(g>=0 && t>g && u>t);
 }
});
test('all 6 session DB checks now require server-derived AAL',()=>{
 assert.equal(count(legacy,'liveSession(user.id,sessionId)'),6);
 assert.equal(count(code,'liveSession(user.id,sessionId,expectedAal)'),6);
 assert.equal(count(code,'p_expected_aal:expectedAal'),1);
 assert.equal(count(code,'const expectedAal=authenticated.expectedAal;'),1);
 assert.doesNotMatch(code,/liveSession\(user\.id,sessionId\)/);
});
test('AAL derived from Auth-verified factors, never browser body',()=>{
 assert.match(code,/const expectedAal=sessionAalFromVerifiedFactors\(factors\.factors\)/);
 assert.match(code,/if\(!expectedAal\)return \{state:'unavailable' as const\}/);
 assert.match(code,/return \{state:'ok' as const,user,sessionId,expectedAal\}/);
 assert.doesNotMatch(code,/body\.(?:expectedAal|aal|user_id|userId|sessionId)/);
});
test('all 5 multi-step assurance rechecks reject owner, session and MFA change',()=>{
 for(const x of ['refreshedAssurance','initAssurance','initDisclosureAssurance','backupAssurance','finalAssurance']){
  assert.equal(count(code,x+'.expectedAal!==expectedAal'),1,x);
  assert.equal(count(code,x+'.sessionId!==sessionId'),1,x);
  assert.equal(count(code,x+'.user.id!==user.id'),1,x);
 }
});
test('malformed factor state fails closed',()=>{
 for(const v of [null,undefined,{},'verified',[null],[{}],[{status:'unknown'}],[{status:1}]])
  assert.equal(derive(v),null);
});
test('AAL1 when no verified factor',()=>{
 assert.equal(derive([]),'aal1');
 assert.equal(derive([{status:'unverified'}]),'aal1');
});
test('AAL2 when a verified factor exists',()=>{
 assert.equal(derive([{status:'verified'}]),'aal2');
 assert.equal(derive([{status:'unverified'},{status:'verified'}]),'aal2');
});
test('AAL1 JWT must complete MFA if user has verified factor',()=>{
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal2'},true),'required');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal2'},true),'allowed');
});
test('AAL2 JWT following factor removal is rejected',()=>{
 assert.equal(evaluateMfaAssurance({currentLevel:'aal2',nextLevel:'aal1'},false),'unavailable');
 assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal1'},false),'allowed');
});
test('malformed JWT assurance is rejected',()=>{
 for(const x of [null,{currentLevel:null,nextLevel:null},{currentLevel:'aal3',nextLevel:'aal2'}])
  assert.equal(evaluateMfaAssurance(x,false),'unavailable');
});
test('v2 source is an exact minimal transform of deployed v1 code',()=>{
 let s=code;
 const remove="import {sessionAalFromVerifiedFactors} from './session-aal.mjs';\n";
 assert.equal(count(s,remove),1);s=s.replace(remove,'');
 const currentFn="async function liveSession(userId:string,sessionId:string,expectedAal:'aal1'|'aal2'){\n const {data,error}=await admin.rpc('mmh_n10_recovery_session_active',{\n  p_user_id:userId,p_session_id:sessionId,p_expected_aal:expectedAal\n });";
 const originalFn="async function liveSession(userId:string,sessionId:string){\n const {data,error}=await admin.rpc('mmh_n10_recovery_session_active',{\n  p_user_id:userId,p_session_id:sessionId\n });";
 assert.equal(count(s,currentFn),1);s=s.replace(currentFn,originalFn);
 const snippet="\n // The database guard must receive the AAL derived from SERVER-VERIFIED\n // Auth factors, never from an untrusted client-controlled request field.\n const expectedAal=sessionAalFromVerifiedFactors(factors.factors);\n if(!expectedAal)return {state:'unavailable' as const};";
 assert.equal(count(s,snippet),1);s=s.replace(snippet,'');
 const currentReturn="return {state:'ok' as const,user,sessionId,expectedAal};";
 assert.equal(count(s,currentReturn),1);
 s=s.replace(currentReturn,"return {state:'ok' as const,user,sessionId};");
 const session="const sessionId=authenticated.sessionId;\n const expectedAal=authenticated.expectedAal;";
 assert.equal(count(s,session),1);s=s.replace(session,"const sessionId=authenticated.sessionId;");
 assert.equal(count(s,"liveSession(user.id,sessionId,expectedAal)"),6);
 s=s.replaceAll("liveSession(user.id,sessionId,expectedAal)","liveSession(user.id,sessionId)");
 for(const name of ['refreshedAssurance','initAssurance','initDisclosureAssurance','backupAssurance','finalAssurance']){
  const fragment="\n    ||"+name+".expectedAal!==expectedAal";
  assert.equal(count(s,fragment),1,name);s=s.replace(fragment,'');
 }
 assert.equal(s,legacy,'any unrelated QA behavior change must fail review');
});
