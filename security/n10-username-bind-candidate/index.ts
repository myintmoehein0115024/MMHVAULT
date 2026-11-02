
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { recheckBindSecurity, verifiedJwtMfaDecision } from './bind-guard.mjs';
const BASE='https://vrypucmyrztxgiqhjspd.supabase.co',ORIGIN='https://mmhvault.com';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const PUBLIC=Deno.env.get('SUPABASE_ANON_KEY')||'';
const TURNSTILE=Deno.env.get('N10A740_TURNSTILE_SECRET')||'';
const HMAC_SECRET=Deno.env.get('N10A740_RATE_HMAC_KEY')||'';
const enabled=false; // REVIEW ONLY: NEVER DEPLOY or flip without signed QA and approval
const re=/^[a-z][a-z0-9_]{3,19}$/,reserved=new Set(['admin','administrator','root','system','support','mmhvault','security','billing','help','official','staff','customer_service']);
const admin=createClient(BASE,SERVICE||'placeholder',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const encoder=new TextEncoder();
function response(origin:string|null,status:number,code:string,extra:Record<string,unknown>={}){
 return new Response(JSON.stringify({code,...extra}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin',...(origin===ORIGIN?{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'120'}:{})}});
}
async function jsonBody(req:Request){const len=req.headers.get('content-length');if(len&&(Number(len)>3000||!/^\d+$/.test(len)))throw Error('body');const reader=req.body?.getReader();if(!reader)throw Error('body');let size=0;const b:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>3000){await reader.cancel();throw Error('body');}b.push(value)}}finally{reader.releaseLock()}const raw=new Uint8Array(size);let off=0;for(const item of b){raw.set(item,off);off+=item.length}const obj=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('body');return obj;}
async function hmac(value:string){const k=await crypto.subtle.importKey('raw',encoder.encode(HMAC_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const arr=new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode('n10a781:'+value)));return Array.from(arr,n=>n.toString(16).padStart(2,'0')).join('');}
async function quota(key:string,limit=5,window=900){const {data,error}=await admin.rpc('mmh_n10a769_take_attempt',{p_key:await hmac(key),p_limit:limit,p_window_seconds:window});if(error||typeof data!=='boolean')throw Error('quota');return data;}
async function verifyCaptcha(token:unknown){if(typeof token!=='string'||token.length<20||token.length>2048)return false;const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},cache:'no-store',signal:AbortSignal.timeout(8500),body:new URLSearchParams({secret:TURNSTILE,response:token})});if(!r.ok)throw Error('captcha');const j=await r.json();return j?.success===true&&j.hostname==='mmhvault.com'&&j.action==='mmh_n10a781_bind';}
async function currentUser(req:Request){const bearer=/^Bearer\s+([^\s]+)$/i.exec(req.headers.get('Authorization')||'')?.[1];if(!bearer||bearer.length>8192)return null;const {data,error}=await admin.auth.getUser(bearer);if(error||!data.user?.id||data.user.is_anonymous||!data.user.email_confirmed_at||!data.user.email)return null;
 const user=data.user;
 // Username-only accounts cannot bind a second alias. A verified, actual email
 // identity is required, not a synthetic Auth email alias.
 if(typeof user.email!=='string'||user.app_metadata?.mmhvault_auth_kind||user.email.endsWith('@no-mail.mmhvault.invalid')||!(user.identities||[]).some(i=>i.provider==='email'))return null;
 return user;
}
async function requireAssuredSession(request:Request,expectedUserId:string){
 const match=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('Authorization')||'');
 if(!match||match[1].length>8192||!expectedUserId)return false;
 // Require the original signed bearer to pass Auth.getUser(jwt) FIRST.
 const {data:authenticated,error:identityError}=await admin.auth.getUser(match[1]);
 const liveUser=authenticated?.user;
 if(identityError||!liveUser?.id||liveUser.id!==expectedUserId||liveUser.is_anonymous)return false;
 // Verify current factors from the Auth admin API rather than client metadata.
 const {data:inventory,error:factorError}=await admin.auth.admin.mfa.listFactors({userId:expectedUserId});
 if(factorError||!Array.isArray(inventory?.factors))return false;
 if(Array.isArray(liveUser.factors)&&liveUser.factors.some(f=>f?.status==='verified')&&
    !inventory.factors.some(f=>f?.status==='verified'))return false;
 return verifiedJwtMfaDecision(match[1],{...liveUser,factors:inventory.factors},BASE)==='allowed';
}
async function provePassword(user:{id:string;email?:string},password:string){
 if(typeof user.email!=='string')return false;const temp=createClient(BASE,PUBLIC,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await temp.auth.signInWithPassword({email:user.email,password});if(error||data.user?.id!==user.id||!data.session?.access_token)return false;const {data:verified,error:verifiedError}=await temp.auth.getUser(data.session.access_token);
 // Tokens obtained for a password check are never returned to the browser.
 try{await temp.auth.signOut({scope:'local'});}catch(_){}
 return !verifiedError&&verified.user?.id===user.id;
}
Deno.serve(async request=>{
 const origin=request.headers.get('Origin');if(origin!==ORIGIN)return response(origin,403,'origin_denied');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:response(origin,200,'ok').headers});
 if(request.method!=='POST')return response(origin,405,'method_denied');
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))return response(origin,415,'json_required');
 let body;try{body=await jsonBody(request);}catch{return response(origin,400,'invalid_request');}
 if(body.action==='preflight')return response(origin,200,'preflight_ok',{enabled:enabled&&SERVICE.length>20&&PUBLIC.length>20&&TURNSTILE.length>12&&HMAC_SECRET.length>=32,username_linking:true});
 if(body.action!=='bind')return response(origin,400,'unknown_action');
 const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
 if(!re.test(username)||reserved.has(username)||typeof body.password!=='string'||body.password.length<1||body.password.length>128)return response(origin,400,'invalid_request');
 if(!enabled||SERVICE.length<20||PUBLIC.length<20||TURNSTILE.length<12||HMAC_SECRET.length<32)return response(origin,503,'binding_unavailable');
 try{
  const user=await currentUser(request);
  if(!user)return response(origin,401,'verified_email_session_required');
  if(!await requireAssuredSession(request,user.id))return response(origin,403,'additional_verification_required');
  if(!await quota('bind:user:'+user.id,5,900)||!await quota('bind:username:'+username,6,900))return response(origin,429,'too_many_attempts');
  if(!await verifyCaptcha(body.captcha_token))return response(origin,403,'verification_required');
  if(!await quota('bind:captcha:'+body.captcha_token,1,600))return response(origin,403,'verification_required');
  const {data:existing,error:readError}=await admin.from('mmh_n10a740_username_links').select('username_key').eq('user_id',user.id).limit(2);
  if(readError)throw Error('lookup');
  if(existing?.length)return response(origin,409,'already_linked');
  if(!await provePassword(user,body.password))return response(origin,401,'invalid_credentials');
  // A password/captcha round-trip can outlast a session revocation, owner
  // change, newly verified MFA factor or email/identity change.
  // Revalidate the SAME bearer and its MFA requirements immediately before
  // the privileged insert. Any missing/unavailable evidence denies the bind.
  const fresh=await recheckBindSecurity({
    expectedUser:user,
    verifyUser:()=>currentUser(request),
    verifyAssurance:()=>requireAssuredSession(request,user.id)
  });
  if(fresh!=='allowed')return response(origin,
    fresh==='verification_unavailable'?503:fresh==='session_expired'?401:403,
    fresh);
  // DB UNIQUE(user_id), PRIMARY KEY(username_key) guarantee atomic ownership.
  const {error:insertError}=await admin.from('mmh_n10a740_username_links').insert({username_key:username,user_id:user.id});
  if(insertError?.code==='23505')return response(origin,409,'username_unavailable');
  if(insertError)throw Error('insert');
  return response(origin,200,'bind_success',{username});
 }catch(e){
  console.error('n10a781_bind_error',String(e).replace(/[a-z0-9_\-]{20,}/ig,'[redacted]').slice(0,70));
  return response(origin,503,'binding_unavailable');
 }
});
