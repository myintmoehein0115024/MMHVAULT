
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { wordlist } from 'npm:@scure/bip39@1.6.0/wordlists/english';
import { createEscrowedUsernameEnrollment } from '../n10-signup-escrow-review/immutable-signup-escrow.mjs';
const PROJECT='vrypucmyrztxgiqhjspd';
const RELEASE_ENABLED=false; // REVIEW ONLY. DO NOT DEPLOY OR ENABLE.
const BASE=Deno.env.get('SUPABASE_URL')||'';
const ORIGIN='https://mmhvault.com';
const SITE_HOST='mmhvault.com';
const SECRET=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const CAPTCHA=Deno.env.get('N10A740_TURNSTILE_SECRET')||'';
const HMAC=Deno.env.get('N10A740_RATE_HMAC_KEY')||'';
const ALIAS_DOMAIN='no-mail.mmhvault.invalid';
const RULE=/^[a-z][a-z0-9_]{3,19}$/;
// Public username registration: no cumulative account cap; rate limit and CAPTCHA remain mandatory.
const RESERVED=new Set(['admin','root','administrator','support','system','mmhvault','vault','official','security','help','staff','team','customer_service']);
const enc=new TextEncoder();
const WORDS=new Set(wordlist);
const admin=createClient(BASE||'https://invalid.supabase.co',SECRET||'placeholder',{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
function configured(){return BASE==='https://'+PROJECT+'.supabase.co'&&SECRET.length>20&&ANON.length>20&&CAPTCHA.length>12&&HMAC.length>=32&&wordlist.length===2048;}
function reply(origin,code,status=200,additional={}){return new Response(JSON.stringify({code,...additional}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store,private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Max-Age':'120'}:{})}});}
function nameKey(v){if(typeof v!=='string')return null;const n=v.trim().toLowerCase();return RULE.test(n)&&!RESERVED.has(n)?n:null;}
async function mac(v){const k=await crypto.subtle.importKey('raw',enc.encode(HMAC),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',k,enc.encode('mmh-a769-prod:'+v));return Array.from(new Uint8Array(sig),x=>x.toString(16).padStart(2,'0')).join('');}
async function quota(key,max,duration){const {data,error}=await admin.rpc('mmh_n10a769_take_attempt',{p_key:await mac('quota:'+key),p_limit:max,p_window_seconds:duration});if(error||typeof data!=='boolean')throw Error('rate_unavailable');return data;}
async function checkCaptcha(v,action){if(typeof v!=='string'||v.length<20||v.length>2048)return false;const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:CAPTCHA,response:v})});if(!r.ok)throw Error('captcha_unavailable');const j=await r.json();return j?.success===true&&j?.hostname===SITE_HOST&&j?.action===('mmh_n10a769_'+action);}
function makePhrase(){const nums=crypto.getRandomValues(new Uint16Array(10));return Array.from(nums,x=>wordlist[x&2047]).join(' ');}
function normalizedPhrase(v){if(typeof v!=='string'||v.length>250)return null;const words=v.trim().toLowerCase().split(/\s+/);return words.length===10&&words.every(w=>WORDS.has(w))?words.join(' '):null;}
function sameHex(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;let d=0;for(let i=0;i<64;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;}
async function parseBody(req){const length=req.headers.get('content-length');if(length&&(Number(length)>4000||!/^\d+$/.test(length)))throw Error('size');const reader=req.body?.getReader();if(!reader)throw Error('body');let n=0;const parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>4000){await reader.cancel();throw Error('size');}parts.push(value)}}finally{reader.releaseLock()}const bytes=new Uint8Array(n);let x=0;for(const p of parts){bytes.set(p,x);x+=p.length}const d=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!d||typeof d!=='object'||Array.isArray(d))throw Error('body');return d;}
function authClient(){return createClient(BASE,ANON,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});}
async function verifyPassword(email,pwd,uid){const client=authClient();const {data,error}=await client.auth.signInWithPassword({email,password:pwd});if(error||data.user?.id!==uid||!data.session)return null;const {data:check,error:bad}=await client.auth.getUser(data.session.access_token);if(bad||check.user?.id!==uid)return null;return data.session;}
async function findProductionUser(username,allowLinkedEmail=false){
  const {data:links,error:mapErr}=await admin.from('mmh_n10a740_username_links').select('user_id').eq('username_key',username).limit(2);
  if(mapErr||links?.length!==1)return null;
  const uid=links[0].user_id;
  const {data,error}=await admin.auth.admin.getUserById(uid);const user=data?.user;
  if(error||user?.id!==uid||user?.is_anonymous||!user.email)return null;
  const usernameOnly=user.app_metadata?.mmhvault_auth_kind==='username_only'&&user.email.endsWith('@'+ALIAS_DOMAIN);
  if(usernameOnly)return user;
  if(!allowLinkedEmail||user.app_metadata?.mmhvault_auth_kind)return null;
  if(!user.email_confirmed_at||!(user.identities||[]).some(i=>i.provider==='email'))return null;
  return user;
}
async function prepare(username){const {data:found,error}=await admin.from('mmh_n10a740_username_links').select('username_key').eq('username_key',username).limit(1);if(error)throw Error('db');if(found?.length)return {code:'username_unavailable',status:409};const phrase=makePhrase(),ticket=crypto.randomUUID();const {data:ok,error:e}=await admin.rpc('mmh_n10a769_reserve_username',{p_username:username,p_reservation_id:ticket,p_verifier:await mac('pending:'+username+':'+phrase)});if(e)throw Error('reserve');if(ok!==true)return {code:'username_unavailable',status:409};return {code:'phrase_prepared',status:200,recovery_words:phrase.split(' '),ticket};}
/**
 * REVIEW ONLY: the original ten words are encrypted and exact-read-back
 * BEFORE a new username account receives its first login session.
 * Do not run on Production or Staging without an explicit scoped approval.
 */
async function enroll(username,pwd,ticket,input){
 const phrase=normalizedPhrase(input);
 if(!phrase||typeof ticket!=='string'||!/^[0-9a-f-]{36}$/i.test(ticket))
  return {code:'invalid_enrollment',status:400};
 // Existing registration global quota is evaluated before reservation is claimed.
 if(!await quota('global:registration_create:day',100,86400))
  return {code:'registration_rate_limited',status:429};
 let createdUid=null,createdEmail=null,sessionAttempted=false;
 const deps={
  vaultReady:async()=>{
   // Service-role-only read-only preflight. An absent Production Vault
   // makes signup fail closed BEFORE Auth creates or modifies any user.
   const {data,error}=await admin.rpc('mmh_n10_recovery_backup_exists',
    {p_user_id:crypto.randomUUID()});
   return !error&&data===false;
  },
  claimReservation:async({username,ticket,phrase})=>{
   const {data,error}=await admin.rpc('mmh_n10a769_claim_enrollment',{
    p_username:username,p_reservation_id:ticket,
    p_verifier:await mac('pending:'+username+':'+phrase)
   });
   return !error&&data===true;
  },
  createNewUser:async({username,password})=>{
   const email='u-'+crypto.randomUUID().replaceAll('-','')+'@'+ALIAS_DOMAIN;
   const {data,error}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,
    app_metadata:{mmhvault_auth_kind:'username_only',mmhvault_username:username}
   });
   // Ambiguous error/timeout cannot safely authorize deletion of an old user.
   if(error||!data?.user?.id)return {newlyCreated:false};
   createdUid=data.user.id;
   createdEmail=email;
   return {id:createdUid,newlyCreated:true};
  },
  saveLegacyVerifier:async({userId,phrase})=>{
   if(userId!==createdUid)return false;
   const verifier=await mac('phrase:'+userId+':'+phrase);
   const {error}=await admin.from('mmh_n10a769_recovery_phrases')
    .insert({user_id:userId,verifier,version:1});
   return !error;
  },
  encryptOriginalWords:async({userId,phrase})=>{
   if(userId!==createdUid)return false;
   const {data,error}=await admin.rpc('mmh_n10_recovery_backup_put',{
    p_user_id:userId,p_phrase:phrase
   });
   return !error&&data===true;
  },
  readBackOriginalWords:async({userId})=>{
   if(userId!==createdUid)return null;
   const {data,error}=await admin.rpc('mmh_n10_recovery_backup_get',{p_user_id:userId});
   return error?null:data;
  },
  linkUsername:async({userId,username})=>{
   if(userId!==createdUid)return false;
   const {error}=await admin.from('mmh_n10a740_username_links')
    .insert({username_key:username,user_id:userId});
   return !error;
  },
  createVerifiedSession:async({userId,password})=>{
   if(userId!==createdUid||!createdEmail)return null;
   sessionAttempted=true;
   const session=await verifyPassword(createdEmail,password,userId);
   if(!session?.access_token||!session.refresh_token)return null;
   return {userId,verified:true,accessToken:session.access_token,
           refreshToken:session.refresh_token};
  },
  rollbackNewUser:async({newlyCreatedUserId})=>{
   if(!createdUid||createdUid!==newlyCreatedUserId||!createdEmail)return false;
   const {data,error}=await admin.auth.admin.getUserById(createdUid);
   const user=data?.user;
   if(error||!user||user.id!==createdUid||user.email!==createdEmail||
      user.app_metadata?.mmhvault_auth_kind!=='username_only'||
      user.app_metadata?.mmhvault_username!==username)return false;
   // If password verification could have minted a session, no guessed delete.
   // An operator must reconcile the account and any token revocation instead.
   if(sessionAttempted){
    await admin.auth.admin.updateUserById(createdUid,{ban_duration:'876000h'}).catch(()=>{});
    return false;
   }
   const {error:deleteError}=await admin.auth.admin.deleteUser(createdUid);
   return !deleteError;
  },
  releaseReservation:async({username,ticket})=>{
   const {error}=await admin.from('mmh_n10a769_signup_reservations')
    .delete().eq('username_key',username).eq('reservation_id',ticket);
   return !error;
  }
 };
 const out=await createEscrowedUsernameEnrollment(deps)({
  username,password:pwd,ticket,originalWords:phrase
 });
 if(out.ok!==true){
  return {code:out.code==='manual_reconciliation_required'?
   'auth_unavailable':out.code,status:out.code==='invalid_enrollment'?409:503};
 }
 // This is the only success path; the orchestrator already checked
 // Vault write, exact original-key readback and matched verified session.
 return {code:'signup_success',status:200,user_id:out.userId,
  access_token:out.session.accessToken,refresh_token:out.session.refreshToken};
}
async function loginPassword(username,pwd){const user=await findProductionUser(username,true);if(!user)return null;const session=await verifyPassword(user.email,pwd,user.id);return session?{session,uid:user.id}:null;}
async function loginPhrase(username,input){const phrase=normalizedPhrase(input);if(!phrase)return null;const user=await findProductionUser(username);if(!user)return null;const {data,error}=await admin.from('mmh_n10a769_recovery_phrases').select('verifier,version').eq('user_id',user.id).limit(2);if(error||data?.length!==1||data[0].version!==1)return null;const value=await mac('phrase:'+user.id+':'+phrase);if(!sameHex(value,data[0].verifier))return null;const {data:link,error:genErr}=await admin.auth.admin.generateLink({type:'magiclink',email:user.email});if(genErr||!link?.properties?.hashed_token||link.user?.id!==user.id)throw Error('grant_unavailable');const client=authClient();const {data:otp,error:otpErr}=await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'email'});if(otpErr||otp.user?.id!==user.id||!otp.session?.access_token||!otp.session?.refresh_token)throw Error('grant_unavailable');const {data:remote,error:remoteErr}=await client.auth.getUser(otp.session.access_token);if(remoteErr||remote.user?.id!==user.id)throw Error('identity_mismatch');return {uid:user.id,session:otp.session};}
Deno.serve(async req=>{const origin=req.headers.get('origin');if(origin!==ORIGIN)return reply(origin,'origin_denied',403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers:reply(origin,'ok').headers});if(req.method!=='POST')return reply(origin,'method_denied',405);if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('content-type')||''))return reply(origin,'json_required',415);let d;try{d=await parseBody(req)}catch{return reply(origin,'bad_json',400)}if(d.action==='preflight')return reply(origin,'preflight_ok',200,{enabled:RELEASE_ENABLED&&configured(),setup_complete:configured(),production:true,qa_only:false,limited_signup:false,public_signup:true});
if(!RELEASE_ENABLED)return reply(origin,'registration_not_released',503);if(!configured())return reply(origin,'staging_unavailable',503);if(!['prepare_signup','signup','login','phrase_login'].includes(d.action))return reply(origin,'unknown_action',400);const username=nameKey(d.username);if(!username)return reply(origin,'invalid_username',400);if(['signup','login'].includes(d.action)&&(typeof d.password!=='string'||d.password.length<6||d.password.length>20))return reply(origin,'invalid_request',400);if(d.action==='phrase_login'&&!normalizedPhrase(d.phrase))return reply(origin,'invalid_request',400);try{if(d.action!=='signup'){if(!await checkCaptcha(d.captcha_token,d.action))return reply(origin,'captcha_invalid',403);if(!await quota('token:'+d.captcha_token,1,600))return reply(origin,'captcha_replay',403);if(!await quota('username:'+username+':'+d.action,d.action==='phrase_login'?5:8,900))return reply(origin,'too_many_attempts',429);}else{if(!await quota('claim:'+d.ticket,5,900))return reply(origin,'too_many_attempts',429);}if(d.action==='prepare_signup'){if(!await quota('global:registration_prepare:hour',100,3600))return reply(origin,'registration_rate_limited',429);const r=await prepare(username);return reply(origin,r.code,r.status,r)}if(d.action==='signup'){const r=await enroll(username,d.password,d.ticket,d.phrase);return reply(origin,r.code,r.status,r)}if(d.action==='login'){const x=await loginPassword(username,d.password);return x?reply(origin,'login_success',200,{user_id:x.uid,access_token:x.session.access_token,refresh_token:x.session.refresh_token}):reply(origin,'invalid_credentials',401)}const x=await loginPhrase(username,d.phrase);return x?reply(origin,'phrase_login_success',200,{user_id:x.uid,access_token:x.session.access_token,refresh_token:x.session.refresh_token}):reply(origin,'invalid_credentials',401)}catch(e){console.error('n10a766_service_error',String(e).replace(/[A-Za-z0-9]{24,}/g,'[redacted]').slice(0,80));return reply(origin,'auth_unavailable',503)}});
