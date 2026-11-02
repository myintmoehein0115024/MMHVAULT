// N10 MFA phrase verification v4 security review COPY — NOT DEPLOYED.
// This source is taken from an ACTIVE production Edge and hard-disabled for isolated QA.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { evaluateVerifiedAuthUserMfa } from "./mfa-assurance.mjs";
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co',ORIGIN='https://mmhvault.com';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const RATEKEY=Deno.env.get('N10A740_RATE_HMAC_KEY')||'';
const admin=createClient(BASE,SERVICE||'placeholder',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const CANDIDATE_RELEASE_ENABLED=false; // REVIEW-ONLY: NEVER DEPLOY
// N10 candidate ONLY; not deployed. Conditional MFA must guard both status
// and phrase verification because this is a sensitive account-recovery endpoint.
// The service-role Auth client has already validated this bearer in getUser.
// Its verified factors are server-owned; SDK nextLevel can be unavailable in
// stateless Edge calls. The helper checks JWT subject, issuer, expiry and AAL.
async function checkMfa(jwt:string,user:any){
 // Supabase Auth User.factors is optional for accounts with no enrolled factor.
 // Never treat a missing field as evidence that the user has no MFA.
 // Read the server-owned factor inventory through the service-role Admin API,
 // after getUser(jwt) has verified the exact bearer and user identity.
 let factors:any;
 try{
   const {data,error}=await admin.auth.admin.mfa.listFactors({userId:user.id});
   if(error||!Array.isArray(data?.factors))return 'unavailable';
   factors=data.factors;
 }catch(_){return 'unavailable';}
 // An inconsistent snapshot must not silently downgrade an MFA user.
 if(Array.isArray(user.factors)&&user.factors.some((f:any)=>f?.status==='verified')&&!factors.some((f:any)=>f?.status==='verified'))
   return 'unavailable';
 return evaluateVerifiedAuthUserMfa(jwt,{...user,factors},BASE);
}

const enc=new TextEncoder();
function out(origin,status,code,extra={}){return new Response(JSON.stringify({code,...extra}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store,private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type'}:{})}})}
async function mac(v,prefix){const key=await crypto.subtle.importKey('raw',enc.encode(RATEKEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(prefix+v)));return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('')}
function sameHex(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==64||b.length!==64)return false;let d=0;for(let i=0;i<64;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function words(v){if(typeof v!=='string'||v.length>240)return null;let a=v.trim().toLowerCase().split(/\s+/);return a.length===10&&a.every(x=>/^[a-z]{2,13}$/.test(x))?a.join(' '):null}
// Every sensitive result is invalidated if the ORIGINAL bearer changes owner,
// is rejected by Auth, or requires fresh MFA during DB/crypto awaits.
async function recheckOriginalBearer(jwt:string,expectedUid:string){
 try{
   const {data,error}=await admin.auth.getUser(jwt);
   const user=data?.user;
   if(error||!user?.id||user.id!==expectedUid||user.is_anonymous)
     return 'session_expired';
   return await checkMfa(jwt,user);
 }catch(_){return 'unavailable';}
}
function denyFresh(origin:string|null,decision:string){
 if(decision==='required')return out(origin,403,'mfa_required');
 if(decision==='session_expired')return out(origin,401,'sign_in_required');
 return out(origin,503,'mfa_state_unavailable');
}
// Strict upper bound on request bytes, including streaming without Content-Length.
async function readLimitedText(req:Request,maxBytes:number){
 const contentLength=req.headers.get('Content-Length');
 if(contentLength!==null&&(!/^\d+$/.test(contentLength)||Number(contentLength)>maxBytes))
   throw Error('bad_request');
 if(!req.body)throw Error('bad_request');
 const reader=req.body.getReader();const chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   total+=value.byteLength;
   if(total>maxBytes){await reader.cancel('oversize');throw Error('bad_request');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin');if(origin!==ORIGIN)return out(origin,403,'origin_denied');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:out(origin,200,'ok').headers});
 if(req.method!=='POST')return out(origin,405,'method_denied');
 if(!CANDIDATE_RELEASE_ENABLED)return out(origin,503,'review_not_released');
 if(SERVICE.length<20||RATEKEY.length<32)return out(origin,503,'unavailable');
 const match=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('authorization')||'');if(!match||match[1].length>8192)return out(origin,401,'sign_in_required');
 const {data,error}=await admin.auth.getUser(match[1]);const user=data?.user;
 if(error||!user?.id||user.is_anonymous)return out(origin,401,'sign_in_required');
 const mfaDecision=await checkMfa(match[1],user);
 if(mfaDecision==='unavailable')return out(origin,503,'mfa_state_unavailable');
 if(mfaDecision==='required')return out(origin,403,'mfa_required');
 let body;try{const raw=await readLimitedText(req,700);body=JSON.parse(raw)}catch{return out(origin,400,'bad_request')}
 if(body?.action==='status'){
   const {data:matches,error:e1}=await admin.from('mmh_n10a740_username_links').select('username_key').eq('user_id',user.id).limit(2);
   if(e1)return out(origin,503,'unavailable');
   const finalAuth=await recheckOriginalBearer(match[1],user.id);
   if(finalAuth!=='allowed')return denyFresh(origin,finalAuth);
   const usernameOnly=user.app_metadata?.mmhvault_auth_kind==='username_only';
   return out(origin,200,'account_status',{username:matches?.length===1?matches[0].username_key:null,username_only:usernameOnly,has_recovery_key:usernameOnly});
 }
 if(body?.action!=='verify_saved_phrase')return out(origin,400,'unknown_action');
 if(user.app_metadata?.mmhvault_auth_kind!=='username_only')return out(origin,403,'username_account_required');
 const {data:quota,error:qe}=await admin.rpc('mmh_n10a769_take_attempt',{p_key:await mac('phrase_verify:'+user.id,'mmh-a783-rate:'),p_limit:5,p_window_seconds:900});
 if(qe||quota!==true)return out(origin,429,'too_many_attempts');
 const phrase=words(body.phrase);if(!phrase)return out(origin,400,'invalid_phrase');
 const {data:records,error:dbErr}=await admin.from('mmh_n10a769_recovery_phrases').select('verifier,version').eq('user_id',user.id).limit(2);
 if(dbErr||records?.length!==1||records[0].version!==1)return out(origin,503,'unavailable');
 const verifier=await mac('phrase:'+user.id+':'+phrase,'mmh-a769-prod:');
 if(!sameHex(verifier,records[0].verifier))return out(origin,401,'incorrect_words');
 const finalAuth=await recheckOriginalBearer(match[1],user.id);
 if(finalAuth!=='allowed')return denyFresh(origin,finalAuth);
 return out(origin,200,'phrase_verified',{verified:true});
});
