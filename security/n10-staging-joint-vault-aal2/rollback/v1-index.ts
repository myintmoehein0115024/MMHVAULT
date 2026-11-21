// MMHVAULT N10 — NEW, SEPARATE JOINT MFA+VAULT QA CANDIDATE ONLY.
// THIS FILE IS NOT DEPLOYED, NOT APPROVED FOR DEPLOYMENT OR LIVE TESTING.
// Never revive the retired mmh-n10-fixed-vault-qa-locked Edge.
// Its temporary name, 2 new signed synthetic accounts, SHA, expiry and rollback
// must receive separate owner approval before any potential staging deployment.
// This file intentionally refuses ALL requests with empty identity bindings,
// a past-dated test deadline and an OFF release flag.
// Production candidate and production auth/finance remain untouched.
// Requires an audited Vault-only SQL schema, private service-role RPC grants,
// real signed-token AAL1/AAL2 tests and an explicit production release gate.
// No plaintext recovery words or passwords may be logged or stored by the browser.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {wordlist} from 'npm:@scure/bip39@1.6.0/wordlists/english';
import {evaluateVerifiedAuthUserMfa} from './mfa-assurance.mjs';
import {sessionIdFromVerifiedJwt} from './session-guard.mjs';
const EXPECTED_BASE='https://ldivswlhtgmznzwhzsoi.supabase.co';
const BASE=Deno.env.get('SUPABASE_URL')||'';
// A reviewed code change alone must never enable secret disclosure.
const RECOVERY_RELEASE_ENABLED=false; // OFF. For approved Staging-only QA, never production.
const QA_WINDOW_END_UTC='1970-01-01T00:00:00.000Z'; // EXPIRED by default.

const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const RATEKEY=Deno.env.get('N10_FIXED_RECOVERY_QA_HMAC_KEY')||'';
// INERT FIXTURE — no previous user IDs or emails are authorized for reuse.
// AFTER owner approval and creation of NEW Staging-only synthetic accounts,
// review and bind exactly two brand-new Auth-verified UID+email pairs.
// Never read values from user-editable metadata or inbound request bodies.
const QA_IDENTITIES=new Map<string,string>([]);
const ALLOWLIST_OK=QA_IDENTITIES.size===2;
const ORIGIN='https://myintmoehein0115024.github.io';
// This QA service never accepts the production origin, even in configuration errors.
const admin=createClient(BASE||'https://invalid.supabase.co',SERVICE||'placeholder',{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const enc=new TextEncoder();
function out(origin:string,code:string,status=200,details:Record<string,unknown>={}){
 const allowed=origin===ORIGIN;
 return new Response(JSON.stringify({code,...details}),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'none'",'Vary':'Origin',
  ...(allowed?{'Access-Control-Allow-Origin':ORIGIN,
   'Access-Control-Allow-Methods':'POST, OPTIONS',
   'Access-Control-Allow-Headers':'authorization, apikey, content-type'}:{})}});
}
function createSyntheticPhrase(){
 // 65536 is exactly divisible by 2048, so each BIP39 word has equal probability.
 const indices=crypto.getRandomValues(new Uint16Array(10));
 return Array.from(indices,x=>wordlist[x&2047]).join(' ');
}
function normalizePhrase(v:unknown){
 if(typeof v!=='string'||v.length>240)return null;
 const normalized=v.trim().toLowerCase().replace(/\s+/g,' ');
 return /^([a-z]{2,13} ){9}[a-z]{2,13}$/.test(normalized)?normalized:null;
}
function hex(bytes:Uint8Array){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
async function hmac(value:string){
 const key=await crypto.subtle.importKey('raw',enc.encode(RATEKEY),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('mmh-a769-prod:'+value))));
}
function equal64(a:unknown,b:unknown){
 if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;
 let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
async function quota(userId:string){
 const {data,error}=await admin.rpc('mmh_n10_recovery_take_attempt',{
  // One shared password-proof bucket for backup + reveal: never grant 5 attempts each.
  p_bucket:await hmac('n10-fixed-recovery:secret_proof:'+userId),
  p_limit:5,p_window_seconds:900
 });
 // Fail closed if rate infrastructure is unavailable; do not return a
 // misleading "too many attempts" response for an infrastructure error.
 if(error||typeof data!=='boolean')return 'unavailable';
 return data===true?'allowed':'exceeded';
}
async function readBoundedJson(req:Request):Promise<Record<string,unknown>>{
 const h=req.headers.get('content-length');
 if(h!==null&&(!/^\d+$/.test(h)||Number(h)>1200))throw Error('oversize');
 if(!req.body)throw Error('missing_body');
 const reader=req.body.getReader();const chunks:Uint8Array[]=[];
 let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>1200){await reader.cancel('too_large');throw Error('oversize');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;
 for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength;}
 const body:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_json');
 return body as Record<string,unknown>;
}
async function liveSession(userId:string,sessionId:string){
 const {data,error}=await admin.rpc('mmh_n10_recovery_session_active',{
  p_user_id:userId,p_session_id:sessionId
 });
 if(error||typeof data!=='boolean')return 'unavailable';
 return data?'active':'revoked';
}
async function provePassword(user:{id:string,email?:string|null},password:unknown){
 if(typeof password!=='string'||password.length<6||password.length>20||!user.email||!ANON)return false;
 const client=createClient(BASE,ANON,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 try{
  const {data,error}=await client.auth.signInWithPassword({email:user.email,password});
  if(error||data?.user?.id!==user.id||!data.session?.access_token)return false;
  const checked=await client.auth.getUser(data.session.access_token);
  return !checked.error&&checked.data?.user?.id===user.id;
 }catch(_){return false;}
 finally{try{await client.auth.signOut({scope:'local'});}catch(_){}}
}
async function verifiedUser(req:Request){
 const m=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('Authorization')||'');
 if(!m||m[1].length>8192)return {state:'unauthorized' as const};
 const {data,error}=await admin.auth.getUser(m[1]);
 const user=data?.user;
 if(error||!user?.id||user.is_anonymous)return {state:'unauthorized' as const};
 // Auth verified the signed bearer; independently read real server-side factors.
 const {data:factors,error:factorError}=await admin.auth.admin.mfa.listFactors({userId:user.id});
 if(factorError||!Array.isArray(factors?.factors))return {state:'unavailable' as const};
 if(Array.isArray(user.factors)&&user.factors.some((f:any)=>f?.status==='verified')
  &&!factors.factors.some((f:any)=>f?.status==='verified'))return {state:'unavailable' as const};
 const assurance=evaluateVerifiedAuthUserMfa(m[1],{...user,factors:factors.factors},BASE);
 if(assurance!=='allowed')return {state:assurance as 'required'|'unavailable'};
 // No user-editable metadata, usernames or claimed emails authorize access.
 // Match BOTH Auth-verified UID and exact email against two preapproved fixtures.
 // A/B have no username-only app metadata; do not change their Auth records.
 if(!ALLOWLIST_OK
    ||QA_IDENTITIES.get(user.id)!==user.email
    ||!user.email_confirmed_at
    ||user.app_metadata?.mmhvault_auth_kind!=null
    ||user.app_metadata?.mmhvault_username!=null)
  return {state:'not_supported' as const};
 const sessionId=sessionIdFromVerifiedJwt(m[1],user.id,BASE);
 if(!sessionId)return {state:'unauthorized' as const};
 return {state:'ok' as const,user,sessionId};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('Origin')||'';
 if(origin!==ORIGIN)return out(origin,'origin_denied',403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:out(origin,'ok').headers});
 if(req.method!=='POST')return out(origin,'method_denied',405);
 if(!RECOVERY_RELEASE_ENABLED)return out(origin,'recovery_service_not_released',503);
 if(!(Date.parse(QA_WINDOW_END_UTC)>Date.now()))
  return out(origin,'qa_window_closed',503);

 if(BASE!==EXPECTED_BASE||SERVICE.length<20||ANON.length<20||RATEKEY.length<32||!ALLOWLIST_OK)
  return out(origin,'unavailable',503);
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('Content-Type')||''))
  return out(origin,'json_required',415);
 let body:Record<string,unknown>;
 try{body=await readBoundedJson(req)}
 catch(_){return out(origin,'bad_request',400);}
 const authenticated=await verifiedUser(req);
 if(authenticated.state==='unauthorized')return out(origin,'sign_in_required',401);
 if(authenticated.state==='required')return out(origin,'mfa_required',403);
 if(authenticated.state==='not_supported')return out(origin,'synthetic_qa_account_required',403);
 if(authenticated.state!=='ok')return out(origin,'mfa_unavailable',503);
 const user=authenticated.user;
 const sessionId=authenticated.sessionId;
 const firstSessionCheck=await liveSession(user.id,sessionId);
 if(firstSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
 if(firstSessionCheck!=='active')return out(origin,'session_expired',401);
 const action=body.action;
 if(action==='status'){
  const {data,error}=await admin.rpc('mmh_n10_recovery_backup_exists',{p_user_id:user.id});
  return error||typeof data!=='boolean'?out(origin,'unavailable',503):out(origin,'backup_status',200,{backed_up:data});
 }
 if(action!=='backup_existing'&&action!=='reveal'&&action!=='qa_initialize')return out(origin,'unknown_action',400);
 const quotaStatus=await quota(user.id);
 if(quotaStatus==='unavailable')return out(origin,'rate_unavailable',503);
 if(quotaStatus!=='allowed')return out(origin,'too_many_attempts',429);
 if(!await provePassword(user,body.password))return out(origin,'invalid_credentials',401);
 // Fresh password proof alone is not enough. The JWT session could have
 // been revoked during password verification; recheck just before escrow
 // or plaintext disclosure.
 const secondSessionCheck=await liveSession(user.id,sessionId);
 if(secondSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
 if(secondSessionCheck!=='active')return out(origin,'session_expired',401);
 // MFA enrollment can change in another session during password re-auth.
 // Recheck signed bearer identity, server-managed factors and the original AAL.
 const refreshedAssurance=await verifiedUser(req);
 if(refreshedAssurance.state==='required')return out(origin,'mfa_required',403);
 if(refreshedAssurance.state==='unavailable')return out(origin,'mfa_unavailable',503);
 if(refreshedAssurance.state!=='ok'||refreshedAssurance.user.id!==user.id
    ||refreshedAssurance.sessionId!==sessionId)
   return out(origin,'session_expired',401);
 if(action==='qa_initialize'){
  // Only the two hard-pinned confirmed synthetic accounts may call this,
  // after signed Auth JWT, server-owned MFA, live session and current password.
  // Unlike the production path, this prepares a new SYNTHETIC verifier.
  // It does not reveal, import, replace or reset any historical recovery key.
  const prior=await admin.from('mmh_n10a769_recovery_phrases')
   .select('user_id').eq('user_id',user.id).limit(1);
  if(prior.error)return out(origin,'unavailable',503);
  if(prior.data?.length)return out(origin,'qa_already_initialized',409);
  // Revalidate synthetic-only initialization immediately before writing the
  // verifier; Auth factors or session revocation may have changed during SELECT.
  const initAssurance=await verifiedUser(req);
  if(initAssurance.state==='required')return out(origin,'mfa_required',403);
  if(initAssurance.state==='unavailable')return out(origin,'mfa_unavailable',503);
  if(initAssurance.state!=='ok'||initAssurance.user.id!==user.id
     ||initAssurance.sessionId!==sessionId)
    return out(origin,'session_expired',401);
  const initSessionCheck=await liveSession(user.id,sessionId);
  if(initSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
  if(initSessionCheck!=='active')return out(origin,'session_expired',401);
  const phrase=createSyntheticPhrase();
  const verifier=await hmac('phrase:'+user.id+':'+phrase);
  const created=await admin.from('mmh_n10a769_recovery_phrases')
   .insert({user_id:user.id,verifier,version:1});
  if(created.error)return out(origin,'qa_initialize_unavailable',503);
  // This QA-only response contains freshly created recovery words. Do not
  // disclose them if the authenticated session or MFA state just changed.
  // A mid-flight failure may leave an initialized synthetic verifier: require
  // explicit synthetic-account cleanup rather than silently resetting it.
  const initDisclosureAssurance=await verifiedUser(req);
  if(initDisclosureAssurance.state==='required')return out(origin,'mfa_required',403);
  if(initDisclosureAssurance.state==='unavailable')return out(origin,'mfa_unavailable',503);
  if(initDisclosureAssurance.state!=='ok'||initDisclosureAssurance.user.id!==user.id
     ||initDisclosureAssurance.sessionId!==sessionId)
    return out(origin,'session_expired',401);
  const initDisclosureSessionCheck=await liveSession(user.id,sessionId);
  if(initDisclosureSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
  if(initDisclosureSessionCheck!=='active')return out(origin,'session_expired',401);
  return out(origin,'qa_phrase_initialized',200,{
   words:phrase.split(' '),expires_in_seconds:45
  });
 }
 if(action==='backup_existing'){
  const phrase=normalizePhrase(body.phrase);
  if(!phrase)return out(origin,'invalid_recovery_key',400);
  // The original one-way verifier must be checked before adding Vault escrow.
  const records=await admin.from('mmh_n10a769_recovery_phrases')
   .select('verifier,version').eq('user_id',user.id).limit(2);
  if(records.error||records.data?.length!==1||records.data[0].version!==1)
   return out(origin,'unavailable',503);
  const mac=await hmac('phrase:'+user.id+':'+phrase);
  if(!equal64(records.data[0].verifier,mac))return out(origin,'invalid_recovery_key',401);
  // Match the production candidate's precommit guard: while reading the
  // immutable verifier, the factor enrollment or original session may change.
  const backupAssurance=await verifiedUser(req);
  if(backupAssurance.state==='required')return out(origin,'mfa_required',403);
  if(backupAssurance.state==='unavailable')return out(origin,'mfa_unavailable',503);
  if(backupAssurance.state!=='ok'||backupAssurance.user.id!==user.id
     ||backupAssurance.sessionId!==sessionId)
    return out(origin,'session_expired',401);
  const backupSessionCheck=await liveSession(user.id,sessionId);
  if(backupSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
  if(backupSessionCheck!=='active')return out(origin,'session_expired',401);
  const saved=await admin.rpc('mmh_n10_recovery_backup_put',{p_user_id:user.id,p_phrase:phrase});
  if(saved.error||saved.data!==true)return out(origin,'backup_unavailable',503);
  return out(origin,'backup_ready');
 }
 // Nothing is revealed without *both* a verified session and fresh password proof.
 const stored=await admin.rpc('mmh_n10_recovery_backup_get',{p_user_id:user.id});
 if(stored.error)return out(origin,'unavailable',503);
 const phrase=normalizePhrase(stored.data);
 if(!phrase)return out(origin,'backup_not_ready',409);
 // The user's MFA enrollment may change while Vault is decrypting.
 // Recheck the same authenticated bearer and server-managed factors before
 // releasing plaintext. Changes, missing data or a new AAL2 requirement fail closed.
 const finalAssurance=await verifiedUser(req);
 if(finalAssurance.state==='required')return out(origin,'mfa_required',403);
 if(finalAssurance.state==='unavailable')return out(origin,'mfa_unavailable',503);
 if(finalAssurance.state!=='ok'||finalAssurance.user.id!==user.id
    ||finalAssurance.sessionId!==sessionId)
   return out(origin,'session_expired',401);
 // Recheck after the asynchronous decrypted Vault read. This closes the
 // logout/revocation window between the earlier check and plaintext response.
 const finalSessionCheck=await liveSession(user.id,sessionId);
 if(finalSessionCheck==='unavailable')return out(origin,'session_check_unavailable',503);
 if(finalSessionCheck!=='active')return out(origin,'session_expired',401);
 return out(origin,'recovery_key',200,{words:phrase.split(' '),expires_in_seconds:45});
});
