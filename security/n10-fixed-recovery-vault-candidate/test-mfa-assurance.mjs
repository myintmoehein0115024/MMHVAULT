// Offline synthetic tests only; no real accounts, passwords, JWTs or recovery phrases.
// Run: node security/n10-fixed-recovery-vault-candidate/test-mfa-assurance.mjs
import assert from 'node:assert/strict';
import {evaluateMfaAssurance,evaluateVerifiedAuthUserMfa} from './mfa-assurance.mjs';
const project='https://ldivswlhtgmznzwhzsoi.supabase.co';
const id='123e4567-e89b-12d3-a456-426614174000';
const future=Math.floor(Date.now()/1000)+600;
const user=(factors=[])=>({id,is_anonymous:false,factors});
const factor={id:'synthetic-factor',status:'verified'};
const token=(aal='aal1',overrides={})=>'x.'+
 Buffer.from(JSON.stringify({sub:id,iss:project+'/auth/v1',exp:future,aal,...overrides})).toString('base64url')+'.x';
// Decoded unsigned bytes ONLY for offline logic QA. Production MUST validate
// the exact signed JWT using Supabase Auth before calling the evaluator.
const cases=[
 ['no MFA + aal1',()=>assert.equal(evaluateVerifiedAuthUserMfa(token(),user(),project),'allowed')],
 ['verified MFA + aal1 requires TOTP',()=>assert.equal(evaluateVerifiedAuthUserMfa(token(),user([factor]),project),'required')],
 ['verified MFA + aal2',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal2'),user([factor]),project),'allowed')],
 ['expired JWT',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal2',{exp:1}),user([factor]),project),'unavailable')],
 ['wrong owner',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal2',{sub:'wrong'}),user([factor]),project),'unavailable')],
 ['wrong issuer',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal2',{iss:'wrong'}),user([factor]),project),'unavailable')],
 ['missing factors',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal1'),{id},project),'unavailable')],
 ['anonymous owner',()=>assert.equal(evaluateVerifiedAuthUserMfa(token(),{...user(),is_anonymous:true},project),'unavailable')],
 ['bad JWT syntax',()=>assert.equal(evaluateVerifiedAuthUserMfa('bad',user(),project),'unavailable')],
 ['unknown aal',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal3'),user([factor]),project),'unavailable')],
 ['missing next aal',()=>assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:null}),'unavailable')],
 ['verified factor mismatch',()=>assert.equal(evaluateMfaAssurance({currentLevel:'aal1',nextLevel:'aal1'},true),'unavailable')],
 ['old aal2 after factor unenrolled',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal2'),user(),project),'allowed')],
 ['missing expiry',()=>assert.equal(evaluateVerifiedAuthUserMfa(token('aal1',{exp:undefined}),user(),project),'unavailable')],
];
let failed=0;
for(const [name,run] of cases){try{run();console.log('PASS',name)}catch(error){failed++;console.error('FAIL',name,error.message)}}
console.log(cases.length-failed+'/'+cases.length+' checks passed');
if(failed)process.exitCode=1;
