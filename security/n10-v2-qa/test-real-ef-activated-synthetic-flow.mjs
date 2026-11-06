/**
 * N10 real E/F contract: SYNTHETIC ACTIVATED FLOW, LOCAL MEMORY ONLY.
 * It reads the real hard-OFF handlers and temporarily replaces the release
 * constants ONLY inside a sandbox VM for fake Auth, fake Vault and fake MFA.
 * This test NEVER deploys, never modifies the source, never calls Supabase,
 * and can never prove a real Auth end-to-end test succeeded.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto,randomUUID} from 'node:crypto';

const BASE='https://ldivswlhtgmznzwhzsoi.supabase.co';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const PWD_E='StagePassE1!';
const PWD_F='StagePassF1!';
const WORDLIST=Array.from({length:2048},(_,i)=>{
 let x=i;let out='';
 for(let j=0;j<4;j++){out=String.fromCharCode(97+x%26)+out;x=Math.floor(x/26);}
 return out;
});
assert.equal(new Set(WORDLIST).size,2048);

function fakeWorld({failEscrow=false,revokeOnVaultRead=false,revokeOnStatusRead=false,malformedAuthResponse=false,closeGateOnSignin=false,failPasswordProofSignout=false,closeQAOnSessionCheck=0,expireQAOnOpenCheck=0,
 failAdminSessionSignout=false,throwAdminSessionSignout=false,
 mismatchPasswordAuthUserOnSignin=false,rejectPasswordGetUser=false}={}){
 const users=new Map(),byEmail=new Map(),slotOwners=new Map(),claims=new Set();
 const backups=new Map(),sessions=new Map(),tokens=new Map(),verifiedFactors=new Set(),events=[];
 let handlerCount=0,gateOpen=true,closeOnNextSignin=closeGateOnSignin;
 let windowExpired=false,sessionCheckCount=0,qaOpenChecks=0;
 let mismatchNextSignIn=false,closeAfterNextOwnerProof=false;
 let omitNextRefreshToken=false;
 function issueSession(uid,aal='aal1',overrides={}){
   const sid=randomUUID();
   const payload={iss:BASE+'/auth/v1',sub:uid,exp:4102444800,aal,session_id:sid,...overrides};
   const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
   const token=enc({alg:'HS256',typ:'JWT'})+'.'+enc(payload)+'.synthetic-not-real-signature';
   tokens.set(token,uid);
   sessions.set(sid,{uid,aal,live:true});
   return {access_token:token,refresh_token:'fake-refresh-'+sid,session_id:sid};
 }
 const userFromToken=token=>{
   const uid=tokens.get(token);
   return uid?users.get(uid):null;
 };
 function rpc(name,arg){
   if(!gateOpen&&['mmh_n10_realef_owner_slot','mmh_n10_realef_slot_user_id'].includes(name))
    return {data:null,error:{message:'QA window closed'}};
   switch(name){
    case 'mmh_n10_realef_take_attempt':return {data:true,error:null};
    case 'mmh_n10_realef_claim':
      if(!['E','F'].includes(arg.p_slot)||claims.has(arg.p_slot))return {data:false,error:null};
      claims.add(arg.p_slot);events.push('claim:'+arg.p_slot);return {data:true,error:null};
    case 'mmh_n10_realef_backup_put':{
      if(failEscrow)return {data:null,error:{message:'synthetic Vault readback failure'}};
      const uid=arg.p_user_id,u=users.get(uid),slot=arg.p_slot;
      if(!u||!claims.has(slot)||!['E','F'].includes(slot)||
       u.app_metadata.mmhvault_username!=='n10real_'+slot.toLowerCase()+'_20261104'||
       [...sessions.values()].some(s=>s.uid===uid))
        return {data:null,error:{message:'invalid synthetic slot'}};
      if(slotOwners.has(slot)&&slotOwners.get(slot)!==uid)
        return {data:null,error:{message:'other owner'}};
      if(backups.has(uid)&&backups.get(uid)!==arg.p_phrase)
        return {data:null,error:{message:'immutable'}};
      slotOwners.set(slot,uid);backups.set(uid,arg.p_phrase);
      events.push('backup:'+slot);return {data:true,error:null};
    }
    case 'mmh_n10_realef_slot_user_id':{
      const x=slotOwners.get(arg.p_slot);
      return x?{data:x,error:null}:{data:null,error:{message:'unbound'}};
    }
    case 'mmh_n10_realef_owner_slot':{
      for(const [slot,uid] of slotOwners)if(uid===arg.p_user_id){
       // Return the previously authorized slot, but close the shared DB gate
       // before the Edge has reached its final HTTP response boundary.
       if(closeAfterNextOwnerProof){
        gateOpen=false;closeAfterNextOwnerProof=false;
        events.push('db-gate-closed-after-owner-proof');
       }
       return {data:slot,error:null};
      }
      return {data:null,error:{message:'unbound'}};
    }
    case 'mmh_n10_realef_session_active':{
      const s=sessions.get(arg.p_session_id);
      const yes=gateOpen&&!!s&&s.uid===arg.p_user_id&&s.aal==='aal2'&&s.live&&verifiedFactors.has(s.uid);
      if(++sessionCheckCount===closeQAOnSessionCheck){
       // Simulate the QA deadline expiring *after* the final DB response was
       // computed, while the Edge handler is still about to return data.
       gateOpen=false;windowExpired=true;
      }
      return {data:yes,error:null};
    }
    case 'mmh_n10_realef_backup_exists':{
      const s=sessions.get(arg.p_session_id);
      const data=!!s&&s.uid===arg.p_user_id&&s.aal==='aal2'&&s.live&&backups.has(s.uid);
      if(revokeOnStatusRead&&s)s.live=false; // Revocation after DB check, before response
      return {data,error:null};
    }
    case 'mmh_n10_realef_backup_get':{
      const s=sessions.get(arg.p_session_id);
      if(!s||s.uid!==arg.p_user_id||s.aal!=='aal2'||!s.live||!verifiedFactors.has(s.uid))
       return {data:null,error:{message:'not authorized'}};
      const data=backups.get(s.uid)??null;
      if(revokeOnVaultRead)s.live=false; // Test a session revoked DURING decrypted Vault read.
      return {data,error:null};
    }
    default:throw Error('unexpected fake RPC '+name);
   }
 }
 function client(key){
  const admin=key.startsWith('synthetic-service-');
  let localSessionId=null;
  return {
   rpc:async(name,arg)=>rpc(name,arg),
   auth:{
    getUser:async token=>{
     if(!admin&&rejectPasswordGetUser)
      return {data:{user:null},error:{message:'synthetic password session verification failed'}};
     const user=userFromToken(token);
     return {data:{user:user??null},error:user?null:{message:'not authenticated'}};
    },
    signInWithPassword:async({email,password})=>{
     const uid=byEmail.get(email),u=users.get(uid);
     if(!u||u.password!==password)return {data:null,error:{message:'invalid password'}};
     events.push('signin:'+u.app_metadata.mmhvault_username);
     const session=issueSession(uid,'aal1');
     localSessionId=session.session_id;
     if(omitNextRefreshToken){
      session.refresh_token='';
      omitNextRefreshToken=false;
      events.push('auth-returned-empty-refresh');
     }
     if(closeOnNextSignin){gateOpen=false;closeOnNextSignin=false;}
     const responseUser=(mismatchPasswordAuthUserOnSignin||mismatchNextSignIn)?
      {...u,id:randomUUID()}:u;
     mismatchNextSignIn=false;
     return {data:{user:responseUser,session},error:null};
    },
    signOut:async()=>{
     if(failPasswordProofSignout&&localSessionId)
      return {error:{message:'synthetic local sign-out failed'}};
     if(localSessionId){
      const issued=sessions.get(localSessionId);
      if(issued)issued.live=false;
      localSessionId=null;
     }
     return {error:null};
    },
    admin:{
     createUser:async({email,password,email_confirm,app_metadata})=>{
      if(!admin)throw Error('unprivileged Auth createUser');
      const id=randomUUID();
      const user={id,email,password,app_metadata,email_confirmed_at:email_confirm?new Date().toISOString():null,
       deleted_at:null,is_anonymous:false,banned_until:null};
      if(byEmail.has(email))return {data:null,error:{message:'duplicate'}};
      users.set(id,user);byEmail.set(email,id);
      events.push('create:'+app_metadata.mmhvault_username);
      // Simulate a correct, newly stored identity returned with incorrect
      // metadata fields. The follow-up Admin lookup remains authoritative.
      const responseUser=malformedAuthResponse?
       {...user,app_metadata:{...app_metadata,mmhvault_qa_scope:'untrusted-response-scope'}}:user;
      return {data:{user:responseUser},error:null};
     },
     getUserById:async(id)=>{
      const user=users.get(id);
      return {data:{user:user??null},error:user?null:{message:'unknown'}};
     },
     updateUserById:async(id,update)=>{
      const user=users.get(id);if(!user)return {data:null,error:{message:'unknown'}};
      user.banned_until=update.ban_duration;
      return {data:{user},error:null};
     },
     signOut:async(token,scope)=>{
      assert.equal(admin,true,'scoped revocation must use service-only Admin API');
      assert.equal(scope,'local','never revoke other sessions');
      const uid=tokens.get(token);
      let sid;
      try{
       sid=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).session_id;
      }catch(_){return {error:{message:'unrecognized synthetic token'}};}
      const issued=sessions.get(sid);
      if(!uid||!issued||issued.uid!==uid)
       return {error:{message:'unrecognized synthetic session'}};
      events.push('admin-signout-local:'+uid);
      if(throwAdminSessionSignout)
       throw Error('synthetic scoped logout threw');
      if(failAdminSessionSignout)
       return {error:{message:'synthetic scoped logout failed'}};
      issued.live=false;
      return {error:null};
     },
     mfa:{
      listFactors:async({userId})=>({data:{factors:verifiedFactors.has(userId)?
       [{factor_type:'totp',status:'verified'}]:[]},error:null})
     }
    }
   }
  };
 }
 const fakeFetch=async(_url,{body})=>{
  const token=body.get('response');
  return {ok:true,json:async()=>({success:true,
   hostname:'mmhvault-n10-vault-staging.pages.dev',
   action:token.startsWith('signup-')?'mmh_n10_realef_signup':'mmh_n10_realef_login'})};
 };
 function handler(file){
  const real=readFileSync(new URL('./'+file,import.meta.url),'utf8');
  assert.match(real,/const RELEASE_ENABLED=false;/);
  assert.match(real,/const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';/);
  assert.match(real,/const PROJECT='ldivswlhtgmznzwhzsoi';/);
  let fake=real.replace('const RELEASE_ENABLED=false;','const RELEASE_ENABLED=true;')
    .replace("const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';",
             "const QA_WINDOW_END_UTC='2099-01-01T00:00:00.000Z';")
    .replace(/^import[^\r\n]*\r?\n/gm,'');
  let serve;
  const env={
   SUPABASE_URL:BASE,SUPABASE_ANON_KEY:'synthetic-anon-key-xxxxxxxxxxxxxxxx',
   SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key-xxxxxxxxxxxx',
   N10_REAL_EF_TURNSTILE_SECRET:'synthetic-captcha-secret-xxxx',
   N10_REAL_EF_HMAC_KEY:'synthetic-hmac-secret-xxxxxxxxxxxxxxxxxxxxxxxx'
  };
  vm.runInNewContext(fake,{
   Deno:{env:{get:name=>env[name]||''},serve:fn=>{serve=fn;handlerCount++;}},
   createClient:(_base,key)=>client(key),wordlist:WORDLIST,fetch:fakeFetch,
   TextEncoder,TextDecoder,Response,Request,Headers,URLSearchParams,AbortSignal,
   Uint8Array,Uint16Array,crypto:webcrypto,atob,
   Date:class FakeDate extends Date {
    static now(){
     if(expireQAOnOpenCheck>0&&++qaOpenChecks===expireQAOnOpenCheck)
      windowExpired=true;
     return windowExpired?Date.parse('2100-01-01T00:00:00.000Z'):Date.now();
    }
   }
  },{filename:file,timeout:5000});
  assert.equal(typeof serve,'function');
  return serve;
 }
 const signup=handler('staging_real_ef_signup_REVIEW_ONLY.ts');
 const viewer=handler('staging_real_ef_viewer_REVIEW_ONLY.ts');
 function request(h,body,token){
  return h(new Request(BASE+'/functions/v1/qa',{method:'POST',headers:{
   origin:ORIGIN,'content-type':'application/json',
   ...(token?{authorization:'Bearer '+token}:{})
  },body:JSON.stringify(body)}));
 }
 async function invoke(h,body,token){
  const response=await request(h,body,token);
  return {status:response.status,...await response.json()};
 }
 return {
  signup,viewer,invoke,events,users,backups,slotOwners,claims,
  closeGateOnNextSignin(){closeOnNextSignin=true;},
  closeGateAfterNextOwnerProof(){closeAfterNextOwnerProof=true;},
  mismatchNextPasswordAuthUser(){mismatchNextSignIn=true;},
  omitNextPasswordRefreshToken(){omitNextRefreshToken=true;},
  activeSessions(uid){return [...sessions.values()].filter(s=>s.uid===uid&&s.live).length;},
  isSessionLive(token){
   try{
    const sid=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).session_id;
    return sessions.get(sid)?.live===true;
   }catch(_){return false;}
  },
  mintAAL2(uid){verifiedFactors.add(uid);return issueSession(uid,'aal2');},
  mintAAL2WithoutFactor(uid){return issueSession(uid,'aal2');},
  mintAAL2WithClaims(uid,overrides){verifiedFactors.add(uid);return issueSession(uid,'aal2',overrides);},
  clearFactor(uid){verifiedFactors.delete(uid);},
  revoke(token){const parts=token.split('.');const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString());
   const session=sessions.get(payload.session_id);if(session)session.live=false;},
  get handlerCount(){return handlerCount;}
 };
}

test('synthetic E/F signup -> immutable words BEFORE first password session; AAL2 owner split',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-synthetic-token-for-E-only'});
 assert.equal(e.status,200,JSON.stringify(e));
 assert.equal(e.code,'signup_success');
 assert.equal(e.recovery_words.length,10);
 assert.equal(e.expires_in_seconds,45);
 const f=await x.invoke(x.signup,{
  action:'signup',username:'n10real_f_20261104',password:PWD_F,
  captcha_token:'signup-synthetic-token-for-F-only'});
 assert.equal(f.status,200,JSON.stringify(f));
 assert.equal(f.code,'signup_success');
 assert.equal(f.recovery_words.length,10);
 assert.notDeepEqual(e.recovery_words,f.recovery_words);
 assert.equal(x.users.size,2);
 assert.equal(x.backups.size,2);
 assert.equal(x.slotOwners.size,2);
 assert.equal(x.handlerCount,2);
 assert.deepEqual(x.events.filter(v=>v.startsWith('claim:')||v.startsWith('create:')||
  v.startsWith('backup:')||v.startsWith('signin:')).slice(0,8),[
  'claim:E','create:n10real_e_20261104','backup:E','signin:n10real_e_20261104',
  'claim:F','create:n10real_f_20261104','backup:F','signin:n10real_f_20261104'
 ]);
 const duplicate=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-synthetic-second-token'});
 assert.equal(duplicate.status,409);
 assert.equal(x.users.size,2);

 const beforeMFA=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},e.access_token);
 assert.equal(beforeMFA.status,403);
 assert.equal(beforeMFA.code,'mfa_required');

 const e2=x.mintAAL2(e.user_id),f2=x.mintAAL2(f.user_id);
 const status=await x.invoke(x.viewer,{action:'status'},e2.access_token);
 assert.equal(status.status,200);assert.equal(status.backed_up,true);
 const invalid=await x.invoke(x.viewer,{action:'reveal',password:'bad-password'},e2.access_token);
 assert.equal(invalid.status,401);
 assert.equal(invalid.code,'invalid_credentials');
 assert.equal(invalid.words,undefined);
 const forbidden=await x.invoke(x.viewer,{
   action:'reveal',password:PWD_E,user_id:f.user_id
 },e2.access_token);
 assert.equal(forbidden.status,400);
 assert.equal(forbidden.code,'unexpected_request_field');
 const eReveal=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},e2.access_token);
 assert.equal(eReveal.status,200,JSON.stringify(eReveal));
 assert.equal(eReveal.code,'recovery_key');
 assert.deepEqual(eReveal.words,e.recovery_words);
 const fReveal=await x.invoke(x.viewer,{action:'reveal',password:PWD_F},f2.access_token);
 assert.equal(fReveal.status,200,JSON.stringify(fReveal));
 assert.deepEqual(fReveal.words,f.recovery_words);
 assert.notDeepEqual(eReveal.words,fReveal.words);
 const crossPass=await x.invoke(x.viewer,{action:'reveal',password:PWD_F},e2.access_token);
 assert.equal(crossPass.status,401);
 x.revoke(e2.access_token);
 const afterRevoke=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},e2.access_token);
 assert.equal(afterRevoke.status,401);
 assert.equal(afterRevoke.code,'session_expired');
});


test('synthetic Vault write failure quarantines newly created E, returns no key or token, and cannot retry slot',async()=>{
 const x=fakeWorld({failEscrow:true});
 const failed=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-synthetic-vault-failure-token'
 });
 assert.equal(failed.status,503);
 assert.equal(failed.code,'manual_reconciliation_required');
 assert.equal(failed.access_token,undefined);
 assert.equal(failed.refresh_token,undefined);
 assert.equal(failed.recovery_words,undefined);
 assert.equal(x.users.size,1,'only the newly created synthetic E should exist');
 assert.equal(x.backups.size,0,'failed Vault write must not claim a successful backup');
 assert.equal(x.slotOwners.size,0,'failed Vault write must not bind the owner');
 assert.ok(x.claims.has('E'),'single-use claim must remain consumed');
 const onlyUser=[...x.users.values()][0];
 assert.equal(onlyUser.app_metadata.mmhvault_username,'n10real_e_20261104');
 assert.equal(onlyUser.banned_until,'876000h','newly created owner must be quarantined');
 assert.ok(!x.events.some(v=>v.startsWith('signin:')),'no first login session issued after failure');
 const retry=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-synthetic-repeat-after-failure'
 });
 assert.equal(retry.status,409);
 assert.equal(retry.code,'qa_slot_unavailable');
 assert.equal(x.users.size,1,'ambiguous failed slot must never silently create a replacement user');
});



test('synthetic forged, downgraded, stale, and cross-session JWTs never disclose E words',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-attack-synthetic-token'
 });
 assert.equal(e.status,200);
 const wrongAAL2=x.mintAAL2WithoutFactor(e.user_id);
 const noFactor=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},wrongAAL2.access_token);
 assert.equal(noFactor.status,403);
 assert.equal(noFactor.code,'mfa_required');
 const valid=x.mintAAL2(e.user_id);
 const signedStatus=await x.invoke(x.viewer,{action:'status'},valid.access_token);
 assert.equal(signedStatus.status,200);

 // Modifying the JWT's unsigned-looking payload does not create a valid Auth session.
 const components=valid.access_token.split('.');
 const altered={...JSON.parse(Buffer.from(components[1],'base64url').toString()),aal:'aal2',sub:randomUUID()};
 const tampered=components[0]+'.'+Buffer.from(JSON.stringify(altered)).toString('base64url')+'.'+components[2];
 const forged=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},tampered);
 assert.equal(forged.status,401);
 assert.equal(forged.code,'sign_in_required');
 assert.equal(forged.words,undefined);

 const cases=[
  {name:'wrong issuer',claims:{iss:'https://not-this-staging.supabase.co/auth/v1'},status:403,code:'mfa_required'},
  {name:'expired token',claims:{exp:1},status:403,code:'mfa_required'},
  {name:'different sub',claims:{sub:randomUUID()},status:403,code:'mfa_required'},
  {name:'unbound session',claims:{session_id:randomUUID()},status:401,code:'session_expired'}
 ];
 for(const c of cases){
  const token=x.mintAAL2WithClaims(e.user_id,c.claims);
  const result=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},token.access_token);
  assert.equal(result.status,c.status,c.name);
  assert.equal(result.code,c.code,c.name);
  assert.equal(result.words,undefined,c.name+' must not disclose original words');
 }
 x.clearFactor(e.user_id);
 const removed=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},valid.access_token);
 assert.equal(removed.status,403);
 assert.equal(removed.code,'mfa_required');
 assert.equal(removed.words,undefined);
 // Security checks fail closed; the E escrow must remain unchanged.
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});



test('revoked session during decrypted Vault read cannot return original recovery words',async()=>{
 const x=fakeWorld({revokeOnVaultRead:true});
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-ef-read-race-test'
 });
 assert.equal(e.status,200);
 const aal2=x.mintAAL2(e.user_id);
 const result=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},aal2.access_token);
 assert.equal(result.status,401);
 assert.equal(result.code,'session_expired');
 assert.equal(result.words,undefined);
 assert.equal(result.recovery_words,undefined);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});

test('corrupt ten-word Vault readback fails closed and never invents a replacement',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-ef-corrupt-backup-test'
 });
 assert.equal(e.status,200);
 const aal2=x.mintAAL2(e.user_id);
 x.backups.set(e.user_id,'synthetic incorrect vault payload');
 const result=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},aal2.access_token);
 assert.equal(result.status,409);
 assert.equal(result.code,'backup_not_ready');
 assert.equal(result.words,undefined);
 assert.equal(result.recovery_words,undefined);
 assert.equal(x.backups.get(e.user_id),'synthetic incorrect vault payload');
 assert.equal(x.users.size,1);
});



test('ambiguous Auth createUser response quarantines exact fresh E, never issues tokens',async()=>{
 const x=fakeWorld({malformedAuthResponse:true});
 const result=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-synthetic-malformed-admin-response'
 });
 assert.equal(result.status,503);
 assert.equal(result.code,'manual_reconciliation_required');
 assert.equal(result.recovery_words,undefined);
 assert.equal(result.access_token,undefined);
 assert.equal(result.refresh_token,undefined);
 assert.equal(x.users.size,1);
 assert.equal(x.backups.size,0);
 assert.equal(x.slotOwners.size,0);
 assert.equal(x.claims.has('E'),true);
 const owner=[...x.users.values()][0];
 assert.equal(owner.app_metadata.mmhvault_qa_scope,'n10_real_ef_20261104',
  'the stored QA identity must be checked independently of malformed response');
 assert.equal(owner.banned_until,'876000h',
  'the exact newly created user should be quarantined after ambiguous Auth response');
 assert.ok(!x.events.some(v=>v.startsWith('signin:')));
});

test('gate closing during initial signup session denies tokens, signs out, and quarantines only new E',async()=>{
 const x=fakeWorld({closeGateOnSignin:true});
 const failed=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-gate-closes-during-first-session'
 });
 assert.equal(failed.status,503);
 assert.equal(failed.code,'manual_reconciliation_required');
 assert.equal(failed.recovery_words,undefined);
 assert.equal(failed.access_token,undefined);
 assert.equal(failed.refresh_token,undefined);
 assert.equal(x.users.size,1);
 assert.equal(x.backups.size,1,'immutable original escrow retained for manual review');
 assert.equal(x.claims.has('E'),true);
 const only=[...x.users.values()][0];
 assert.equal(only.banned_until,'876000h');
 assert.equal(x.activeSessions(only.id),0,'temporary login must be revoked');
});

test('gate closing during repeat login returns no token and revokes only new session',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-for-later-gate-closure'
 });
 assert.equal(e.status,200);
 assert.equal(x.activeSessions(e.user_id),1);
 x.closeGateOnNextSignin();
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-gate-closes-during-signin'
 });
 assert.equal(denied.status,401);
 assert.equal(denied.code,'invalid_credentials');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(x.activeSessions(e.user_id),1,
  'original test session remains; late temporary session is signed out');
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});

test('revoked AAL2 session during backup-status read never reveals backup existence',async()=>{
 const x=fakeWorld({revokeOnStatusRead:true});
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-status-session-race-test'
 });
 assert.equal(e.status,200);
 const aal2=x.mintAAL2(e.user_id);
 const status=await x.invoke(x.viewer,{action:'status'},aal2.access_token);
 assert.equal(status.status,401);
 assert.equal(status.code,'session_expired');
 assert.equal(status.backed_up,undefined,'revoked session must not learn whether a key exists');
 assert.equal(status.words,undefined);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '),
  'original fixed escrow must remain unchanged');
});

test('correct password but failed server-scoped temporary-session sign-out cannot reveal fixed words',async()=>{
 const x=fakeWorld({failAdminSessionSignout:true});
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-password-proof-cleanup-fail'
 });
 assert.equal(e.status,200,'first-session escrow and signup stay unchanged');
 const valid=x.mintAAL2(e.user_id);
 const status=await x.invoke(x.viewer,{action:'status'},valid.access_token);
 assert.equal(status.status,200,'owner and AAL2 are valid before proof failure');
 assert.equal(status.backed_up,true);
 const denied=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},valid.access_token);
 assert.equal(denied.status,401,'unclosed proof session must fail closed');
 assert.equal(denied.code,'invalid_credentials');
 assert.equal(denied.words,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '),
  'escrow remains unchanged after sign-out failure');
 assert.equal(x.isSessionLive(valid.access_token),true,
  'the calling AAL2 session must not be globally signed out on proof failure');
 assert.equal(x.activeSessions(e.user_id),3,
  'mocked failure leaves the extra unshared proof session pending reconciliation');
 assert.equal(x.events.filter(v=>v==='admin-signout-local:'+e.user_id).length,1,
  'cleanup must attempt an exact local-scope Admin revocation');
});

test('successful recovery proof uses server-scoped logout and retains caller AAL2 session',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-for-scoped-proof-cleanup'
 });
 assert.equal(e.status,200);
 const valid=x.mintAAL2(e.user_id);
 const before=x.activeSessions(e.user_id);
 assert.equal(before,2,'pre-existing signup and caller AAL2 sessions');
 const result=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},valid.access_token);
 assert.equal(result.status,200);
 assert.equal(result.code,'recovery_key');
 assert.deepEqual(result.words,e.recovery_words);
 assert.equal(x.activeSessions(e.user_id),before,'no extra live password proof session');
 assert.equal(x.isSessionLive(valid.access_token),true,'the authorized caller remains signed in');
 assert.equal(x.isSessionLive(e.access_token),true,'older signup session remains signed in');
 assert.equal(x.events.filter(v=>v==='admin-signout-local:'+e.user_id).length,1,
  'the password proof was locally revoked by Admin, never globally');
});

test('mismatched user in Recovery password-proof response revokes only fresh proof session',async()=>{
 const x=fakeWorld();
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-for-mismatched-proof-identity'
 });
 assert.equal(e.status,200);
 const caller=x.mintAAL2(e.user_id);
 x.mismatchNextPasswordAuthUser();
 const denied=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},caller.access_token);
 assert.equal(denied.status,401);
 assert.equal(denied.code,'invalid_credentials');
 assert.equal(denied.words,undefined);
 assert.equal(x.activeSessions(e.user_id),2,'failed proof session was revoked');
 assert.equal(x.isSessionLive(caller.access_token),true);
 assert.equal(x.events.filter(v=>v==='admin-signout-local:'+e.user_id).length,1);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});

test('QA deadline closing after final status session check never returns backup existence',async()=>{
 const x=fakeWorld({closeQAOnSessionCheck:2});
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-for-expired-final-status-check'
 });
 assert.equal(e.status,200);
 const token=x.mintAAL2(e.user_id);
 const result=await x.invoke(x.viewer,{action:'status'},token.access_token);
 assert.equal(result.status,503);
 assert.equal(result.code,'qa_not_released');
 assert.equal(result.backed_up,undefined);
 assert.equal(result.words,undefined);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});

test('QA deadline closing after final reveal session check never returns ten words',async()=>{
 const x=fakeWorld({closeQAOnSessionCheck:3});
 const e=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-for-expired-final-reveal-check'
 });
 assert.equal(e.status,200);
 const token=x.mintAAL2(e.user_id);
 const result=await x.invoke(x.viewer,{action:'reveal',password:PWD_E},token.access_token);
 assert.equal(result.status,503);
 assert.equal(result.code,'qa_not_released');
 assert.equal(result.words,undefined);
 assert.equal(result.recovery_words,undefined);
 assert.equal(x.backups.get(e.user_id),e.recovery_words.join(' '));
});


test('closing QA at signup completion quarantines new E and withholds words and tokens',async()=>{
 // Open checks: request=1; owner proof=2,3; final enroll check=4.
 const x=fakeWorld({expireQAOnOpenCheck:4});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-expires-at-enroll-completion'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required',
  'new user escrow must remain under manual reconciliation');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.users.size,1);
 assert.equal(x.backups.size,1,'original immutable backup must be retained for review');
 assert.equal([...x.users.values()][0].banned_until,'876000h');
 assert.equal(x.activeSessions([...x.users.values()][0].id),0,
  'late signup rejection must revoke its unissued refreshable session');
});

test('closing QA after successful signup helper still withholds all credentials at response',async()=>{
 // 1 entry + 2 owner proofs + 1 enroll completion + 1 final HTTP response.
 const x=fakeWorld({expireQAOnOpenCheck:5});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-expires-at-http-response'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'qa_not_released');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.users.size,1);
 assert.equal(x.backups.size,1,'fixed key must not be rotated or erased');
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h',
  'newly created identity must be quarantined after final HTTP expiry');
 assert.equal(x.activeSessions(owner.id),0,
  'late HTTP expiry must revoke fresh signup session');
 assert.equal(x.events.filter(e=>e==='admin-signout-local:'+owner.id).length,1);
});

test('closing QA after successful repeat password login cannot return tokens',async()=>{
 // Signup open() calls 1..6 (final database read adds 2);
 // repeat login entry=7, owner proof=8/9, final database check=10/11.
 const x=fakeWorld({expireQAOnOpenCheck:10});
 const enrolled=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-before-login-window-expires'
 });
 assert.equal(enrolled.status,200);
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-expires-at-final-response'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'qa_not_released');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.users.size,1);
 assert.equal(x.backups.get(enrolled.user_id),enrolled.recovery_words.join(' '));
 assert.equal(x.activeSessions(enrolled.user_id),1,
  'the newly created repeat-login session was revoked, original session preserved');
 assert.equal(x.isSessionLive(enrolled.access_token),true,
  'an older session from the same E/F owner must remain live');
 assert.equal(x.users.get(enrolled.user_id).banned_until,null,
  'existing owners must not be quarantined on repeat-login expiry');
 assert.equal(x.events.filter(e=>e==='admin-signout-local:'+enrolled.user_id).length,1);
});

test('late signup Admin signOut failure requires manual reconciliation but never leaks secrets',async()=>{
 const x=fakeWorld({expireQAOnOpenCheck:5,failAdminSessionSignout:true});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-expired-with-scoped-revoke-failure'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h');
 assert.equal(x.activeSessions(owner.id),1,
  'mocked server revocation failure cannot be falsely called a successful cleanup');
 assert.equal(x.backups.get(owner.id)?.split(' ').length,10,
  'original immutable escrow is retained while access is held');
});

test('late repeat login Admin signOut failure preserves existing owner and flags manual review',async()=>{
 const x=fakeWorld({expireQAOnOpenCheck:10,failAdminSessionSignout:true});
 const enrolled=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-before-failed-cleanup-repeat'
 });
 assert.equal(enrolled.status,200);
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-expired-with-scoped-revoke-failure'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(x.isSessionLive(enrolled.access_token),true);
 assert.equal(x.activeSessions(enrolled.user_id),2,
  'failed revocation is flagged, not incorrectly reported as cleaned');
 assert.equal(x.users.get(enrolled.user_id).banned_until,null,
  'do not quarantine an already-existing E/F owner after repeat login');
});

test('first signup: mismatched Auth response identity revokes the issued session and quarantines only E',async()=>{
 const x=fakeWorld({mismatchPasswordAuthUserOnSignin:true});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-auth-response-identity-mismatch'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h');
 assert.equal(x.activeSessions(owner.id),0);
 assert.equal(x.events.filter(v=>v==='admin-signout-local:'+owner.id).length,1);
 assert.equal(x.backups.get(owner.id)?.split(' ').length,10,'original words retained');
});

test('repeat login: mismatched Auth response identity revokes only fresh session and preserves older E session',async()=>{
 const x=fakeWorld();
 const enrolled=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-before-auth-mismatch-repeat'
 });
 assert.equal(enrolled.status,200);
 // This control is injected by a second world in the factory; use a
 // mutable one-shot flag on the existing world for the actual repeat login.
 x.mismatchNextPasswordAuthUser();
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-auth-identity-mismatch'
 });
 assert.equal(denied.status,401);
 assert.equal(denied.code,'invalid_credentials');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(x.activeSessions(enrolled.user_id),1);
 assert.equal(x.isSessionLive(enrolled.access_token),true);
 assert.equal(x.users.get(enrolled.user_id).banned_until,null);
});

test('getUser failure after issuing signup token revokes that session and retains original escrow',async()=>{
 const x=fakeWorld({rejectPasswordGetUser:true});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-getuser-fails-after-session-issue'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h');
 assert.equal(x.activeSessions(owner.id),0);
 assert.equal(x.backups.get(owner.id)?.split(' ').length,10);
});

test('a thrown scoped Auth Admin signOut never produces an incorrect successful cleanup response',async()=>{
 const x=fakeWorld({expireQAOnOpenCheck:5,throwAdminSessionSignout:true});
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-scoped-signout-throws'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h');
 assert.equal(x.activeSessions(owner.id),1,
  'revocation throw must be reported as unresolved, not simulated as success');
});

test('private QA gate closing after signup password proof denies tokens and quarantines new E',async()=>{
 const x=fakeWorld();
 x.closeGateAfterNextOwnerProof();
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-private-gate-closes-after-first-owner-proof'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'qa_not_released',
  'verified local revoke plus exact new-owner quarantine is a safe closed-gate outcome');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.events.filter(e=>e==='db-gate-closed-after-owner-proof').length,1);
 const e=[...x.users.values()][0];
 assert.equal(e.banned_until,'876000h');
 assert.equal(x.activeSessions(e.id),0,'undelivered signup session was revoked');
 assert.equal(x.backups.get(e.id)?.split(' ').length,10,'immutable original words retained');
});

test('private QA gate closing after repeat-login password proof denies only new login',async()=>{
 const x=fakeWorld();
 const enrolled=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-before-private-gate-shutdown'
 });
 assert.equal(enrolled.status,200);
 x.closeGateAfterNextOwnerProof();
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-private-gate-closes-after-auth-proof'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'qa_not_released');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.events.filter(e=>e==='db-gate-closed-after-owner-proof').length,1);
 assert.equal(x.activeSessions(enrolled.user_id),1);
 assert.equal(x.isSessionLive(enrolled.access_token),true,'older E session not revoked');
 assert.equal(x.users.get(enrolled.user_id).banned_until,null,
  'preexisting user not quarantined due to DB gate shutdown');
 assert.equal(x.backups.get(enrolled.user_id),enrolled.recovery_words.join(' '));
});

test('fresh E signup: issued Auth session with empty refresh token is revoked and exact owner quarantined',async()=>{
 const x=fakeWorld();
 x.omitNextPasswordRefreshToken();
 const denied=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-incomplete-auth-refresh-response'
 });
 assert.equal(denied.status,503);
 assert.equal(denied.code,'manual_reconciliation_required');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.users.size,1);
 const owner=[...x.users.values()][0];
 assert.equal(owner.banned_until,'876000h');
 assert.equal(x.activeSessions(owner.id),0,'the server-created but undelivered session must be revoked');
 assert.equal(x.backups.get(owner.id)?.split(' ').length,10,'original escrow must survive');
 assert.equal(x.events.filter(e=>e==='auth-returned-empty-refresh').length,1);
 assert.equal(x.events.filter(e=>e==='admin-signout-local:'+owner.id).length,1);
});

test('existing E login: incomplete Auth refresh response cannot affect older valid session',async()=>{
 const x=fakeWorld();
 const enrolled=await x.invoke(x.signup,{
  action:'signup',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'signup-before-incomplete-repeat-refresh'
 });
 assert.equal(enrolled.status,200);
 const oldToken=enrolled.access_token,originalWords=enrolled.recovery_words.join(' ');
 x.omitNextPasswordRefreshToken();
 const denied=await x.invoke(x.signup,{
  action:'login',username:'n10real_e_20261104',password:PWD_E,
  captcha_token:'login-incomplete-auth-refresh-response'
 });
 assert.equal(denied.status,401);
 assert.equal(denied.code,'invalid_credentials');
 assert.equal(denied.access_token,undefined);
 assert.equal(denied.refresh_token,undefined);
 assert.equal(denied.recovery_words,undefined);
 assert.equal(x.activeSessions(enrolled.user_id),1,'only undelivered new login session was revoked');
 assert.equal(x.isSessionLive(oldToken),true,'earlier delivered E session must remain active');
 assert.equal(x.users.get(enrolled.user_id).banned_until,null,'existing owner must not be quarantined');
 assert.equal(x.backups.get(enrolled.user_id),originalWords);
 assert.equal(x.events.filter(e=>e==='auth-returned-empty-refresh').length,1);
 assert.equal(x.events.filter(e=>e==='admin-signout-local:'+enrolled.user_id).length,1);
});
