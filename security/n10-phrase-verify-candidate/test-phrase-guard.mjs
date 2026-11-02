// Synthetic and offline ONLY. No tokens, actual accounts, network or Supabase.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {createHmac,webcrypto} from 'node:crypto';
import {evaluateVerifiedAuthUserMfa} from './mfa-assurance.mjs';

const path='security/n10-phrase-verify-candidate/index.ts';
const text=readFileSync(path,'utf8');
const permitted=new Set([
 '.github/workflows/n10-phrase-final-auth-review.yml',
 'docs/N10_PHRASE_VERIFY_REVIEW_20261102.md',
 path,
 'security/n10-phrase-verify-candidate/mfa-assurance.mjs',
 'security/n10-phrase-verify-candidate/test-phrase-guard.mjs'
]);
const lines=execFileSync('git',['diff','--name-status','--no-renames','origin/main...HEAD'],
 {encoding:'utf8'}).trim().split('\n');
assert.equal(lines.length,permitted.size,'exact review-only five-file scope');
for(const line of lines){
 const [action,path]=line.split('\t');
 assert.equal(action,'A','no existing production files modified');
 assert.ok(permitted.delete(path),'out of review scope: '+path);
}
assert.equal(permitted.size,0);
const base=execFileSync('git',['merge-base','origin/main','HEAD'],{encoding:'utf8'}).trim();
const drift=new Set(execFileSync('git',['diff','--name-only',base,'origin/main'],
 {encoding:'utf8'}).trim().split('\n').filter(Boolean));
for(const line of lines)assert.ok(!drift.has(line.split('\t')[1]),'main drift overlap');
assert.match(text,/const CANDIDATE_RELEASE_ENABLED=false;/);
assert.match(text,/if\(!CANDIDATE_RELEASE_ENABLED\)return out\(origin,503,'review_not_released'\)/);
assert.match(text,/readLimitedText\(req,700\)/);
assert.match(text,/if\(total>maxBytes\)/);
assert.equal((text.match(/recheckOriginalBearer\(match\[1\],user\.id\)/g)||[]).length,2);
assert.match(text,/admin\.auth\.admin\.mfa\.listFactors/);
console.log('PASS: strict five-file scope, default OFF, bounded input and two post-await rechecks.');

const uid='123e4567-e89b-12d3-a456-426614174000';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co';
const exp=Math.floor(Date.now()/1000)+900;
const fakeJwt=(extra={})=>'header.'+Buffer.from(JSON.stringify({
 sub:uid,iss:BASE+'/auth/v1',exp,aal:'aal1',...extra
})).toString('base64url')+'.signature';
for(const [claim,factors,decision] of [
 [{},[],'allowed'],
 [{},[{status:'verified'}],'required'],
 [{aal:'aal2'},[{status:'verified'}],'allowed'],
 [{aal:'aal2'},[],'unavailable'],
 [{aal:null},[],'unavailable'],
 [{sub:'foreign-owner'},[],'unavailable'],
 [{exp:1},[],'unavailable']
]){
 assert.equal(evaluateVerifiedAuthUserMfa(fakeJwt(claim),
   {id:uid,factors,is_anonymous:false},BASE),decision);
}
console.log('PASS: 7 explicit JWT / MFA decision contracts (tokens are unsigned test data).');

const key='K'.repeat(40),words='alpha bravo charlie delta echo foxtrot golf hotel india juliet';
const verifier=createHmac('sha256',key)
 .update('mmh-a769-prod:phrase:'+uid+':'+words).digest('hex');

async function runScenario(action,scenario='allowed'){
 let code=text.replace(/^import[^\n]*\n/gm,'');
 if(scenario!=='hard-off')code=code.replace('const CANDIDATE_RELEASE_ENABLED=false;',
   'const CANDIDATE_RELEASE_ENABLED=true; // SYNTHETIC VM ONLY, NEVER DEPLOY');
 let handler=null,authChecks=0,factorChecks=0,readCalls=0,writes=0;
 const token=fakeJwt({aal:scenario==='aal2'?'aal2':'aal1'});
 const user={id:uid,is_anonymous:false,app_metadata:{mmhvault_auth_kind:'username_only'}};
 const admin={
  auth:{
   getUser:async value=>{
    assert.equal(value,token,'verify the exact caller token');
    authChecks++;
    if(authChecks>=2&&scenario==='revoked')
      return {data:null,error:{message:'expired'}};
    if(authChecks>=2&&scenario==='switched-owner')
      return {data:{user:{...user,id:'foreign'}},error:null};
    return {data:{user},error:null};
   },
   admin:{mfa:{listFactors:async ({userId})=>{
     assert.ok(userId===uid||scenario==='switched-owner');
     factorChecks++;
     if(factorChecks>=2&&scenario==='factor-unavailable')
       return {data:null,error:{message:'unavailable'}};
     const verified=scenario==='aal2'||(factorChecks>=2&&scenario==='new-factor');
     return {data:{factors:verified?[{status:'verified'}]:[]},error:null};
   }}}
  },
  rpc:async()=>({data:scenario!=='quota-rejected',error:null}),
  from:table=>{
    assert.ok(['mmh_n10a740_username_links','mmh_n10a769_recovery_phrases'].includes(table));
    return {select:()=>({eq:()=>({limit:async()=>{
      readCalls++;
      if(table==='mmh_n10a740_username_links')
        return {data:[{username_key:'synthetic'}],error:null};
      return {data:[{verifier,version:1}],error:null};
    }})})};
  }
 };
 const env={
  SUPABASE_SERVICE_ROLE_KEY:'S'.repeat(32),
  N10A740_RATE_HMAC_KEY:key
 };
 const context={
  Deno:{env:{get:name=>env[name]||''},serve:fn=>{handler=fn}},
  createClient:()=>admin,
  evaluateVerifiedAuthUserMfa,
  TextEncoder,TextDecoder,Uint8Array,Response,Request,Headers,AbortSignal,
  crypto:webcrypto
 };
 runInNewContext(stripTypeScriptTypes(code,{mode:'strip'}),context,{timeout:2500});
 const payload=action==='status'?{action:'status'}:
    {action:'verify_saved_phrase',phrase:scenario==='wrong-phrase'?
      'alpha bravo charlie delta echo foxtrot golf hotel india kappa':words};
 const body=JSON.stringify(payload)+(scenario==='oversize'?'x'.repeat(750):'');
 const request=new Request('https://example.invalid',{method:'POST',
  headers:{Origin:'https://mmhvault.com',Authorization:'Bearer '+token,
   'Content-Type':'application/json'},
  body
 });
 const result=await handler(request);
 return {status:result.status,code:(await result.json()).code,
  authChecks,factorChecks,readCalls,writes};
}
const checks=[
 ['status','hard-off',503,'review_not_released',0],
 ['status','allowed',200,'account_status',2],
 ['status','aal2',200,'account_status',2],
 ['status','revoked',401,'sign_in_required',2],
 ['status','switched-owner',401,'sign_in_required',2],
 ['status','new-factor',403,'mfa_required',2],
 ['status','factor-unavailable',503,'mfa_state_unavailable',2],
 ['status','oversize',400,'bad_request',1],
 ['verify','allowed',200,'phrase_verified',2],
 ['verify','aal2',200,'phrase_verified',2],
 ['verify','revoked',401,'sign_in_required',2],
 ['verify','new-factor',403,'mfa_required',2],
 ['verify','factor-unavailable',503,'mfa_state_unavailable',2],
 ['verify','wrong-phrase',401,'incorrect_words',1],
 ['verify','quota-rejected',429,'too_many_attempts',1],
 ['verify','oversize',400,'bad_request',1]
];
for(const [act,scenario,status,expected,authReads] of checks){
 const actual=await runScenario(act==='verify'?'verify_saved_phrase':act,scenario);
 assert.equal(actual.status,status,act+' '+scenario);
 assert.equal(actual.code,expected,act+' '+scenario);
 assert.equal(actual.authChecks,authReads,act+' '+scenario+' bearer checks');
 assert.equal(actual.writes,0,'no handler writes in tests');
}
console.log('PASS: '+checks.length+' full synthetic endpoint cases; no live Supabase/HTTP calls.');
