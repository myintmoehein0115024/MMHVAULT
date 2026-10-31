// MMHVAULT N10 fixed recovery-key escrow — REVIEW ONLY, NOT DEPLOYED.
// Requires an audited Vault-only SQL schema, private service-role RPC grants,
// real signed-token AAL1/AAL2 tests and an explicit production release gate.
// No plaintext recovery words or passwords may be logged or stored by the browser.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {evaluateVerifiedAuthUserMfa} from './mfa-assurance.mjs';
const BASE=Deno.env.get('SUPABASE_URL')||'';
const ANON=Deno.env.get('SUPABASE_ANON_KEY')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const RATEKEY=Deno.env.get('N10A740_RATE_HMAC_KEY')||'';
const ORIGIN=BASE.includes('ldivswlhtgmznzwhzsoi')
 ?'https://myintmoehein0115024.github.io':'https://mmhvault.com';
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
function normalizePhrase(v:unknown){
 if(typeof v!=='string'||v.length>240)return null;
 const normalized=v.trim().toLowerCase().replace(/\s+/g,' ');
 return /^([a-z]{2,13} ){9}[a-z]{2,13}$/.test(normalized)?normalized:null;
}
function hex(bytes:Uint8Array){return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
async function hash(value:string){
 return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));
}
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
async function quota(userId:string,action:string){
 const {data,error}=await admin.rpc('mmh_n10_recovery_take_attempt',{
  p_bucket:await hash('n10-fixed-recovery:'+action+':'+userId),
  p_limit:5,p_window_seconds:900
 });
 return !error&&data===true;
}
async function provePassword(user:{id:string,email?:string|null},password:unknown){
 if(typeof password!=='string'||password.length<6||password.length>128||!user.email||!ANON)return false;
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
 if(user.app_metadata?.mmhvault_auth_kind!=='username_only')
  return {state:'not_supported' as const};
 return {state:'ok' as const,user};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('Origin')||'';
 if(origin!==ORIGIN)return out(origin,'origin_denied',403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:out(origin,'ok').headers});
 if(req.method!=='POST')return out(origin,'method_denied',405);
 if(SERVICE.length<20||ANON.length<20||RATEKEY.length<32||!BASE.startsWith('https://'))
  return out(origin,'unavailable',503);
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get('Content-Type')||''))
  return out(origin,'json_required',415);
 const len=Number(req.headers.get('content-length')||0);
 if(len>1200)return out(origin,'bad_request',400);
 let body:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>1200)return out(origin,'bad_request',400);
  body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('bad');
 }catch(_){return out(origin,'bad_request',400);}
 const authenticated=await verifiedUser(req);
 if(authenticated.state==='unauthorized')return out(origin,'sign_in_required',401);
 if(authenticated.state==='required')return out(origin,'mfa_required',403);
 if(authenticated.state==='not_supported')return out(origin,'username_only_required',403);
 if(authenticated.state!=='ok')return out(origin,'mfa_unavailable',503);
 const user=authenticated.user;
 const action=body.action;
 if(action==='status'){
  const {data,error}=await admin.rpc('mmh_n10_recovery_backup_exists',{p_user_id:user.id});
  return error||typeof data!=='boolean'?out(origin,'unavailable',503):out(origin,'backup_status',200,{backed_up:data});
 }
 if(action!=='backup_existing'&&action!=='reveal')return out(origin,'unknown_action',400);
 if(!await quota(user.id,String(action)))return out(origin,'too_many_attempts',429);
 if(!await provePassword(user,body.password))return out(origin,'invalid_credentials',401);
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
  const saved=await admin.rpc('mmh_n10_recovery_backup_put',{p_user_id:user.id,p_phrase:phrase});
  if(saved.error||saved.data!==true)return out(origin,'backup_unavailable',503);
  return out(origin,'backup_ready');
 }
 // Nothing is revealed without *both* a verified session and fresh password proof.
 const stored=await admin.rpc('mmh_n10_recovery_backup_get',{p_user_id:user.id});
 if(stored.error)return out(origin,'unavailable',503);
 const phrase=normalizePhrase(stored.data);
 if(!phrase)return out(origin,'backup_not_ready',409);
 return out(origin,'recovery_key',200,{words:phrase.split(' '),expires_in_seconds:45});
});
