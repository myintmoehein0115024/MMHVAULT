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
const PWD_E='SyntheticStrongPassE1';
const PWD_F='SyntheticStrongPassF1';
const WORDLIST=Array.from({length:2048},(_,i)=>{
 let x=i;let out='';
 for(let j=0;j<4;j++){out=String.fromCharCode(97+x%26)+out;x=Math.floor(x/26);}
 return out;
});
assert.equal(new Set(WORDLIST).size,2048);

function fakeWorld(){
 const users=new Map(),byEmail=new Map(),slotOwners=new Map(),claims=new Set();
 const backups=new Map(),sessions=new Map(),tokens=new Map(),verifiedFactors=new Set(),events=[];
 let handlerCount=0;
 function issueSession(uid,aal='aal1'){
   const sid=randomUUID();
   const payload={iss:BASE+'/auth/v1',sub:uid,exp:4102444800,aal,session_id:sid};
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
   switch(name){
    case 'mmh_n10_realef_take_attempt':return {data:true,error:null};
    case 'mmh_n10_realef_claim':
      if(!['E','F'].includes(arg.p_slot)||claims.has(arg.p_slot))return {data:false,error:null};
      claims.add(arg.p_slot);events.push('claim:'+arg.p_slot);return {data:true,error:null};
    case 'mmh_n10_realef_backup_put':{
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
      for(const [slot,uid] of slotOwners)if(uid===arg.p_user_id)return {data:slot,error:null};
      return {data:null,error:{message:'unbound'}};
    }
    case 'mmh_n10_realef_session_active':{
      const s=sessions.get(arg.p_session_id);
      const yes=!!s&&s.uid===arg.p_user_id&&s.aal==='aal2'&&s.live&&verifiedFactors.has(s.uid);
      return {data:yes,error:null};
    }
    case 'mmh_n10_realef_backup_exists':{
      const s=sessions.get(arg.p_session_id);
      return {data:!!s&&s.uid===arg.p_user_id&&s.aal==='aal2'&&s.live&&backups.has(s.uid),error:null};
    }
    case 'mmh_n10_realef_backup_get':{
      const s=sessions.get(arg.p_session_id);
      if(!s||s.uid!==arg.p_user_id||s.aal!=='aal2'||!s.live||!verifiedFactors.has(s.uid))
       return {data:null,error:{message:'not authorized'}};
      return {data:backups.get(s.uid)??null,error:null};
    }
    default:throw Error('unexpected fake RPC '+name);
   }
 }
 function client(key){
  const admin=key.startsWith('synthetic-service-');
  return {
   rpc:async(name,arg)=>rpc(name,arg),
   auth:{
    getUser:async token=>{
     const user=userFromToken(token);
     return {data:{user:user??null},error:user?null:{message:'not authenticated'}};
    },
    signInWithPassword:async({email,password})=>{
     const uid=byEmail.get(email),u=users.get(uid);
     if(!u||u.password!==password)return {data:null,error:{message:'invalid password'}};
     events.push('signin:'+u.app_metadata.mmhvault_username);
     const session=issueSession(uid,'aal1');
     return {data:{user:u,session},error:null};
    },
    signOut:async()=>({error:null}),
    admin:{
     createUser:async({email,password,email_confirm,app_metadata})=>{
      if(!admin)throw Error('unprivileged Auth createUser');
      const id=randomUUID();
      const user={id,email,password,app_metadata,email_confirmed_at:email_confirm?new Date().toISOString():null,
       deleted_at:null,is_anonymous:false,banned_until:null};
      if(byEmail.has(email))return {data:null,error:{message:'duplicate'}};
      users.set(id,user);byEmail.set(email,id);
      events.push('create:'+app_metadata.mmhvault_username);
      return {data:{user},error:null};
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
   Uint8Array,Uint16Array,crypto:webcrypto,atob
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
  mintAAL2(uid){verifiedFactors.add(uid);return issueSession(uid,'aal2');},
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
