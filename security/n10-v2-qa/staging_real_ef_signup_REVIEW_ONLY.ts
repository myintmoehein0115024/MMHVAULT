// MMHVAULT N10 REAL E/F — STAGING-ONLY AUTH ENTRY. REVIEW ONLY / HARD OFF.
// No service is deployed by this source, and no Auth user can be created while
// RELEASE_ENABLED=false and expiry is in 1970. Separate staging deployment
// and short-lived QA activation require a new explicit owner authorization.
// This does NOT import/write existing A/B/C/D or synthetic E/F.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {wordlist} from 'npm:@scure/bip39@1.6.0/wordlists/english';

const PROJECT='ldivswlhtgmznzwhzsoi';
const BASE=Deno.env.get('SUPABASE_URL')||'';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const SITE_HOST='mmhvault-n10-vault-staging.pages.dev';
const RELEASE_ENABLED=false;
const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';
const QA_SCOPE='n10_real_ef_20261104';
const ALIAS_DOMAIN='no-mail.n10-staging.mmhvault.invalid';
const ALLOWED_NAMES=Object.freeze({
 n10real_e_20261104:'E',
 n10real_f_20261104:'F'
});
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const CAPTCHA=Deno.env.get('N10_REAL_EF_TURNSTILE_SECRET')||'';
const HMAC=Deno.env.get('N10_REAL_EF_HMAC_KEY')||'';
const WORDS=new Set(wordlist);
const enc=new TextEncoder();
const admin=createClient(BASE||'https://invalid.supabase.co',SERVICE||'missing',{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
function reply(origin,code,status=200,extra={}){
 const allowed=origin===ORIGIN;
 return new Response(JSON.stringify({code,...extra}),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, private',
  'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'",
  'Vary':'Origin',
  ...(allowed?{
   'Access-Control-Allow-Origin':ORIGIN,
   'Access-Control-Allow-Methods':'POST,OPTIONS',
   'Access-Control-Allow-Headers':'content-type,apikey,authorization'
  }:{})
 }});
}
function slotOf(name){
 if(typeof name!=='string')return null;
 return Object.hasOwn(ALLOWED_NAMES,name)?ALLOWED_NAMES[name]:null;
}
function configured(){
 return BASE==='https://'+PROJECT+'.supabase.co' &&
  SERVICE.length>20 && ANON.length>20 &&
  CAPTCHA.length>12 && HMAC.length>=32 && WORDS.size===2048;
}
function open(){return RELEASE_ENABLED && Date.now()<Date.parse(QA_WINDOW_END_UTC);}
function normalize(v){
 if(typeof v!=='string'||v.length>250)return null;
 const words=v.trim().toLowerCase().split(/\s+/);
 return words.length===10&&words.every(w=>WORDS.has(w))?words.join(' '):null;
}
function generateWords(){
 const values=crypto.getRandomValues(new Uint16Array(10));
 return Array.from(values,v=>wordlist[v&2047]).join(' ');
}
function hex(bytes){return Array.from(bytes,x=>Number(x).toString(16).padStart(2,'0')).join('');}
async function mac(input){
 const key=await crypto.subtle.importKey('raw',enc.encode(HMAC),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(
  'n10-real-ef-20261104:'+input))));
}
async function readRequest(request){
 const len=request.headers.get('content-length');
 if(len!==null&&(!/^\d+$/.test(len)||Number(len)>2400))throw Error('size');
 const reader=request.body?.getReader();
 if(!reader)throw Error('body');
 const chunks=[];let total=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>2400){await reader.cancel();throw Error('size');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const all=new Uint8Array(total);let pos=0;
 for(const part of chunks){all.set(part,pos);pos+=part.length;}
 const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
 if(!body||Array.isArray(body)||typeof body!=='object')throw Error('json');
 return body;
}
async function verifyCaptcha(token,action){
 if(typeof token!=='string'||token.length<20||token.length>2048)return false;
 const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
  method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({secret:CAPTCHA,response:token})
 });
 if(!res.ok)return false;
 const data=await res.json();
 return data?.success===true&&data?.hostname===SITE_HOST &&
  data?.action==='mmh_n10_realef_'+action;
}
async function limit(key,max,windowSeconds){
 const {data,error}=await admin.rpc('mmh_n10_realef_take_attempt',{
  p_bucket:await mac('quota:'+key),p_limit:max,p_window_seconds:windowSeconds
 });
 return !error&&data===true;
}
function authClient(){
 return createClient(BASE,ANON,{auth:{
  persistSession:false,autoRefreshToken:false,detectSessionInUrl:false
 }});
}
// Recheck the database QA gate after Auth creates its temporary session.
// If the window closes mid-login, finally signs out and returns no token.
async function ownerGateOpen(uid,expectedSlot){
  if(!open())return false;
  const {data,error}=await admin.rpc('mmh_n10_realef_owner_slot',{
    p_user_id:uid
  });
  return !error&&data===expectedSlot&&open();
}
async function verifiedPasswordSession(email,password,expectedId,expectedSlot){
 const client=authClient();
 let result=null;
 try{
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||data?.user?.id!==expectedId||!data.session?.access_token||
    !data.session.refresh_token)return null;
  const checked=await client.auth.getUser(data.session.access_token);
  if(checked.error||checked.data?.user?.id!==expectedId)return null;
    if(!await ownerGateOpen(expectedId,expectedSlot))return null;
  result=data.session;
  return result;
 }finally{
  if(!result)try{await client.auth.signOut({scope:'local'});}catch(_){}
 }
}
async function quarantineNewUser(userId,email,name){
 // Quarantine only the EXACT newly created Auth user; never delete, rotate
 // a phrase, revoke an older owner's session, or touch existing A/B/C/D.
 const {data,error}=await admin.auth.admin.getUserById(userId);
 const owner=data?.user;
 if(error||!owner||owner.id!==userId||owner.email!==email||
    owner.app_metadata?.mmhvault_auth_kind!=='username_only'||
    owner.app_metadata?.mmhvault_qa_scope!==QA_SCOPE||
    owner.app_metadata?.mmhvault_username!==name)return false;
 const changed=await admin.auth.admin.updateUserById(userId,{
  ban_duration:'876000h'
 });
 return !changed.error;
}
async function enroll(name,password){
 const slot=slotOf(name);
 if(!slot)return {code:'qa_only',status:403};
 if(!await limit('signup:'+slot,2,900)||!await limit('global:signup',5,900))
  return {code:'too_many_attempts',status:429};
 // Single-use CLAIM before any Auth Admin createUser. Never recycle E/F slots
 // after ambiguous failures, which could leave a real Auth user or Vault key.
 const {data:claimed,error:claimError}=await admin.rpc('mmh_n10_realef_claim',{
  p_slot:slot,p_claim_hash:await mac('claim:'+slot+':'+crypto.randomUUID())
 });
 if(claimError||claimed!==true)return {code:'qa_slot_unavailable',status:409};
 const phrase=generateWords();
 if(!normalize(phrase))return {code:'qa_unavailable',status:503};
 const email='u-'+crypto.randomUUID().replaceAll('-','')+'@'+ALIAS_DOMAIN;
 let newUserId=null;let completed=false;
 try{
  const {data,error}=await admin.auth.admin.createUser({
   email,password,email_confirm:true,
   app_metadata:{
    mmhvault_auth_kind:'username_only',
    mmhvault_username:name,
    mmhvault_qa_scope:QA_SCOPE
   }
  });
  const user=data?.user;
  // Track the returned Auth UUID BEFORE validating the response metadata.
  // Even an incomplete/ambiguous Admin response may refer to a new identity;
  // quarantineNewUser() independently checks exact generated email AND QA
  // app_metadata on the server before banning only that new E/F identity.
  if(typeof user?.id==='string')newUserId=user.id;
  if(error||!user?.id||user.email!==email||
    user.app_metadata?.mmhvault_qa_scope!==QA_SCOPE||
    user.app_metadata?.mmhvault_username!==name)throw Error('auth_ambiguous');
  const {data:backed,error:backupError}=await admin.rpc(
   'mmh_n10_realef_backup_put',{
    p_user_id:newUserId,p_slot:slot,p_phrase:phrase,
    p_verifier:await mac('phrase:'+newUserId+':'+phrase)
   });
  if(backupError||backed!==true)throw Error('escrow_failed');
  // The private SQL completed same-transaction exact Vault readback before
  // this user is eligible to receive a first Auth session.
  const session=await verifiedPasswordSession(email,password,newUserId,slot);
  if(!session)throw Error('first_session_failed');
  // Authentication can finish at the exact end of the short QA window.
  // Quarantine this *new* staging identity rather than return its tokens.
  if(!open())throw Error('qa_window_closed_before_signup_completion');
  completed=true;
  return {
   code:'signup_success',status:200,user_id:newUserId,
   recovery_words:phrase.split(' '),expires_in_seconds:45,
   access_token:session.access_token,refresh_token:session.refresh_token
  };
 }catch(_){
  if(newUserId){
   try{await quarantineNewUser(newUserId,email,name);}catch(_){}
  }
  return {code:'manual_reconciliation_required',status:503};
 }finally{
  // Intentionally never print passwords, original words or Auth tokens.
  // Claims are permanent and require manual review after ambiguous errors.
  if(!completed)void 0;
 }
}
async function login(name,password){
 const slot=slotOf(name);if(!slot)return null;
 if(!await limit('login:'+slot,5,900))return null;
 const {data:userId,error:slotError}=await admin.rpc('mmh_n10_realef_slot_user_id',{
  p_slot:slot
 });
 if(slotError||typeof userId!=='string')return null;
 const {data,error}=await admin.auth.admin.getUserById(userId);
 const user=data?.user;
 if(error||user?.id!==userId||user?.app_metadata?.mmhvault_qa_scope!==QA_SCOPE||
   user?.app_metadata?.mmhvault_username!==name||
   user?.is_anonymous===true||!user?.email?.endsWith('@'+ALIAS_DOMAIN))return null;
 const session=await verifiedPasswordSession(user.email,password,userId,slot);
 return session?{user_id:userId,access_token:session.access_token,
  refresh_token:session.refresh_token}:null;
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(origin!==ORIGIN)return reply(origin,'origin_denied',403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:reply(origin,'ok').headers});
 if(request.method!=='POST')return reply(origin,'method_denied',405);
 // Even perfectly valid secrets or browser requests cannot bypass hard-OFF.
 if(!open())return reply(origin,'qa_not_released',503);
 if(!configured())return reply(origin,'qa_unavailable',503);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))
  return reply(origin,'json_required',415);
 let data;
 try{data=await readRequest(request);}catch(_){return reply(origin,'bad_request',400);}
 const action=data.action;
 if(action!=='signup'&&action!=='login')return reply(origin,'unknown_action',400);
 if(Object.keys(data).some(k=>!['action','username','password','captcha_token'].includes(k)))
  return reply(origin,'unexpected_request_field',400);
 if(!slotOf(data.username)||typeof data.password!=='string'||
   data.password.length<6||data.password.length>20)
  return reply(origin,'invalid_credentials',401);
 try{
  if(!await verifyCaptcha(data.captcha_token,action))
   return reply(origin,'captcha_invalid',403);
  // Rate-limit a CAPTCHA token across both actions to prevent replay.
  if(!await limit('captcha:'+data.captcha_token,1,600))
   return reply(origin,'captcha_replayed',403);
  if(action==='signup'){
   const result=await enroll(data.username,data.password);
   // The last async signup step may finish after QA expiry: never return
   // new account credentials or original words outside the release window.
   if(!open())return reply(origin,'qa_not_released',503);
   const {status,...body}=result;
   return reply(origin,body.code,status,body);
  }
  const x=await login(data.username,data.password);
  // The password was valid at an earlier point, but the temporary QA
  // window must remain open immediately before any token leaves the Edge.
  if(!open())return reply(origin,'qa_not_released',503);
  return x?reply(origin,'login_success',200,x):reply(origin,'invalid_credentials',401);
 }catch(_){
  return reply(origin,'qa_unavailable',503);
 }
});
