// N10 E/F STAGING REAL AUTH MFA RECOVERY VIEW — REVIEW ONLY / HARD OFF.
// Never deploy or enable without new scoped Staging Edge + private backend approval.
// No Production settings, old Vault handler, A/B/C/D or synthetic E/F operations.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const PROJECT='ldivswlhtgmznzwhzsoi';
const BASE=Deno.env.get('SUPABASE_URL')||'';
const ORIGIN='https://mmhvault-n10-vault-staging.pages.dev';
const RELEASE_ENABLED=false;
const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z';
const SCOPE='n10_real_ef_20261104';
const ALIAS='@no-mail.n10-staging.mmhvault.invalid';
const EXPECTED={
 n10real_e_20261104:'E',
 n10real_f_20261104:'F'
};
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const HMAC=Deno.env.get('N10_REAL_EF_HMAC_KEY')||'';
const enc=new TextEncoder();
const admin=createClient(BASE||'https://invalid.supabase.co',SERVICE||'missing',{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
function reply(origin,code,status=200,extra={}){
 return new Response(JSON.stringify({code,...extra}),{status,headers:{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',
  'Content-Security-Policy':"default-src 'none'",
  'Referrer-Policy':'no-referrer','Vary':'Origin',
  ...(origin===ORIGIN?{
   'Access-Control-Allow-Origin':ORIGIN,
   'Access-Control-Allow-Methods':'POST,OPTIONS',
   'Access-Control-Allow-Headers':'authorization,apikey,content-type'
  }:{})
 }});
}
function open(){return RELEASE_ENABLED&&Date.now()<Date.parse(QA_WINDOW_END_UTC);}
function configured(){
 return BASE==='https://'+PROJECT+'.supabase.co'&&
   SERVICE.length>20&&ANON.length>20&&HMAC.length>=32;
}
async function parseJson(req){
 const h=req.headers.get('content-length');
 if(h!==null&&(!/^\d+$/.test(h)||Number(h)>1200))throw Error('size');
 const reader=req.body?.getReader();if(!reader)throw Error('body');
 let n=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;
  n+=value.byteLength;if(n>1200){await reader.cancel();throw Error('size');}
  chunks.push(value);}}
 finally{reader.releaseLock();}
 const all=new Uint8Array(n);let i=0;
 for(const part of chunks){all.set(part,i);i+=part.length;}
 const obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('invalid');
 return obj;
}
// JWT payload is inspected only AFTER Supabase Auth signed-token getUser succeeds;
// this helper is NOT a signature verifier and never trusts a raw request claim.
function verifiedClaims(token,uid){
 if(typeof token!=='string'||token.length>8192)return null;
 const segments=token.split('.');
 if(segments.length!==3||segments[1].length>8192)return null;
 try{
  const b64=segments[1].replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(b64+'='.repeat((4-b64.length%4)%4));
  const payload=JSON.parse(new TextDecoder().decode(
   Uint8Array.from(raw,ch=>ch.charCodeAt(0))));
  if(payload?.sub!==uid||payload?.iss!==BASE+'/auth/v1'||
    !Number.isSafeInteger(payload?.exp)||
    payload.exp<=Math.floor(Date.now()/1000)||
    payload.aal!=='aal2'||typeof payload.session_id!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(payload.session_id))return null;
  return {sessionId:payload.session_id.toLowerCase()};
 }catch(_){return null;}
}
async function verifiedOwner(request){
 const match=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')||'');
 if(!match||match[1].length>8192)return {state:'unauthorized'};
 const token=match[1];
 const {data,error}=await admin.auth.getUser(token);
 const user=data?.user;
 if(error||!user?.id||user.is_anonymous===true||user.deleted_at||
   !user.email_confirmed_at||user.app_metadata?.mmhvault_auth_kind!=='username_only'||
   user.app_metadata?.mmhvault_qa_scope!==SCOPE||
   !user.email?.endsWith(ALIAS))return {state:'unauthorized'};
 const name=user.app_metadata?.mmhvault_username;
 if(!Object.hasOwn(EXPECTED,name))return {state:'unauthorized'};
 const {data:slot,error:slotError}=await admin.rpc('mmh_n10_realef_owner_slot',{
  p_user_id:user.id
 });
 if(slotError||slot!==EXPECTED[name])return {state:'unauthorized'};
 const claims=verifiedClaims(token,user.id);
 if(!claims)return {state:'mfa_required'};
 const {data:factors,error:factorsError}=await admin.auth.admin.mfa.listFactors({
  userId:user.id
 });
 if(factorsError||!Array.isArray(factors?.factors))return {state:'unavailable'};
 if(!factors.factors.some(f=>f?.factor_type==='totp'&&f?.status==='verified'))
  return {state:'mfa_required'};
 return {state:'ok',user,sessionId:claims.sessionId,token};
}
async function liveSession(uid,sid){
 const {data,error}=await admin.rpc('mmh_n10_realef_session_active',{
  p_user_id:uid,p_session_id:sid
 });
 return !error&&data===true;
}
async function hexMac(value){
 const key=await crypto.subtle.importKey('raw',enc.encode(HMAC),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(
  'n10-real-ef-20261104:'+value)));
 return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
}
async function quota(uid){
 const {data,error}=await admin.rpc('mmh_n10_realef_take_attempt',{
  p_bucket:await hexMac('password-proof:'+uid),
  p_limit:5,p_window_seconds:900
 });
 return !error&&data===true;
}
async function checkPassword(user,password){
 if(typeof password!=='string'||password.length<6||password.length>20||!user.email)
  return false;
 const auth=createClient(BASE,ANON,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 let passwordVerified=false;
 try{
  const {data,error}=await auth.auth.signInWithPassword({
   email:user.email,password
  });
  if(!error&&data?.user?.id===user.id&&data.session?.access_token){
   const check=await auth.auth.getUser(data.session.access_token);
   passwordVerified=!check.error&&check.data?.user?.id===user.id;
  }
 }catch(_){passwordVerified=false;}
 // A password proof creates a separate temporary Auth session. Never release
 // the original words if local sign-out cannot confirm that session ended.
 try{
  const {error:logoutError}=await auth.auth.signOut({scope:'local'});
  if(logoutError)return false;
 }catch(_){return false;}
 return passwordVerified;
}
function isSameOwner(next,prior){
 return next.state==='ok'&&next.user.id===prior.user.id&&
  next.sessionId===prior.sessionId&&next.token===prior.token;
}
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 if(origin!==ORIGIN)return reply(origin,'origin_denied',403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:reply(origin,'ok').headers});
 if(request.method!=='POST')return reply(origin,'method_denied',405);
 if(!open())return reply(origin,'qa_not_released',503);
 if(!configured())return reply(origin,'qa_unavailable',503);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))
  return reply(origin,'json_required',415);
 let body;try{body=await parseJson(request);}catch(_){return reply(origin,'bad_request',400);}
 const permitted=body.action==='status'?['action']:
   body.action==='reveal'?['action','password']:[];
 if(!permitted.length)return reply(origin,'unknown_action',400);
 if(Object.keys(body).some(k=>!permitted.includes(k)))
  return reply(origin,'unexpected_request_field',400);
 try{
  const auth=await verifiedOwner(request);
  if(auth.state==='mfa_required')return reply(origin,'mfa_required',403);
  if(auth.state==='unavailable')return reply(origin,'qa_unavailable',503);
  if(auth.state!=='ok')return reply(origin,'sign_in_required',401);
  if(!await liveSession(auth.user.id,auth.sessionId))
   return reply(origin,'session_expired',401);
  if(body.action==='status'){
   const result=await admin.rpc('mmh_n10_realef_backup_exists',{
    p_user_id:auth.user.id,p_session_id:auth.sessionId
   });
   if(result.error||typeof result.data!=='boolean')
    return reply(origin,'qa_unavailable',503);
   // As with key reveal, status must not report owner-specific Vault
   // information after a logout, MFA downgrade, or QA gate expiry.
   const beforeStatus=await verifiedOwner(request);
   if(!isSameOwner(beforeStatus,auth)||
     !await liveSession(auth.user.id,auth.sessionId))
    return reply(origin,'session_expired',401);
   // The QA window can expire after the last asynchronous DB session check.
   // Never disclose even owner-specific backup status past its deadline.
   if(!open())return reply(origin,'qa_not_released',503);
   return reply(origin,'backup_status',200,{backed_up:result.data});
  }
  if(!await quota(auth.user.id))return reply(origin,'too_many_attempts',429);
  if(!await checkPassword(auth.user,body.password))
   return reply(origin,'invalid_credentials',401);
  // Password re-authentication creates a temporary session. Re-check that
  // the caller's ORIGINAL AAL2 JWT and DB session remain current.
  const afterPassword=await verifiedOwner(request);
  if(!isSameOwner(afterPassword,auth)||
    !await liveSession(auth.user.id,auth.sessionId))
   return reply(origin,'session_expired',401);
  const result=await admin.rpc('mmh_n10_realef_backup_get',{
   p_user_id:auth.user.id,p_session_id:auth.sessionId
  });
  if(result.error||typeof result.data!=='string')
   return reply(origin,'backup_not_ready',409);
  const words=result.data.split(' ');
  if(words.length!==10||words.some(w=>!/^[a-z]{2,13}$/.test(w)))
   return reply(origin,'backup_not_ready',409);
  // Secret remains inside response body only. Never log, cache, persist,
  // or offer another owner's words via user-controlled identifiers.
  const beforeResponse=await verifiedOwner(request);
  if(!isSameOwner(beforeResponse,auth)||
    !await liveSession(auth.user.id,auth.sessionId))
   return reply(origin,'session_expired',401);
  // The signed owner can remain valid while this short-lived QA release
  // expires. Re-check immediately before returning any plaintext words.
  if(!open())return reply(origin,'qa_not_released',503);
  return reply(origin,'recovery_key',200,{words,expires_in_seconds:45});
 }catch(_){return reply(origin,'qa_unavailable',503);}
});
