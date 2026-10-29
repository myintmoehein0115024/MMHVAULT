/**
 * N10-A7.40: PRODUCTION CANDIDATE – SOURCE REVIEW ONLY, NEVER DEPLOY.
 * Based on N10-A7.39 Staging security model, but does not target Staging.
 * Explicitly hard-closed and time-expired. All private credentials are env-only.
 * This code has NOT passed live production security testing.
 */
const PRODUCTION_PROJECT_ID = 'vrypucmyrztxgiqhjspd';
const ORIGIN = 'https://mmhvault.com';
const HOSTNAME = 'mmhvault.com';
const CODE_GATE_OPEN = false; // MUST remain false in review-only source
const WINDOW_START_UTC = '1970-01-01T00:00:00.000Z';
const WINDOW_END_UTC = '1970-01-01T00:00:00.000Z';
const MAX_WINDOW_MS = 15 * 60 * 1000;
const NAME_RE = /^[a-z][a-z0-9_]{3,19}$/;
const RESERVED = new Set(['admin','administrator','root','system','support','mmhvault','security','billing','help']);
const enc = new TextEncoder();
const env = (name) => Deno.env.get(name) || '';
const BASE = env('SUPABASE_URL');
const PUBLISHABLE = env('SUPABASE_ANON_KEY');
const SERVICE = env('SUPABASE_SERVICE_ROLE_KEY');
const TURNSTILE_SECRET = env('N10A740_TURNSTILE_SECRET');
const RATE_SALT = env('N10A740_RATE_HMAC_KEY');
// N10-A7.54 CANDIDATE ONLY: two independently confirmed test UIDs.
// Never put identifiers, emails, passwords or JWTs into source code.
const QA_TEST_UID_A = env('N10A754_TEST_UID_A');
const QA_TEST_UID_B = env('N10A754_TEST_UID_B');
const QA_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function qaAllowlistReady() {
  return QA_UUID_RE.test(QA_TEST_UID_A) && QA_UUID_RE.test(QA_TEST_UID_B) &&
    QA_TEST_UID_A.toLowerCase() !== QA_TEST_UID_B.toLowerCase();
}
function qaUidAllowed(uid) {
  return qaAllowlistReady() && typeof uid==='string' &&
    (uid.toLowerCase()===QA_TEST_UID_A.toLowerCase() || uid.toLowerCase()===QA_TEST_UID_B.toLowerCase());
}

function boundedWindow() {
  const start = Date.parse(WINDOW_START_UTC);
  const end = Date.parse(WINDOW_END_UTC);
  const now = Date.now();
  return Number.isFinite(start) && Number.isFinite(end) && end > start &&
    end - start <= MAX_WINDOW_MS && now >= start && now < end;
}
function configured() {
  return BASE === 'https://' + PRODUCTION_PROJECT_ID + '.supabase.co' &&
    PUBLISHABLE.length > 20 && SERVICE.length > 20 &&
    TURNSTILE_SECRET.length > 12 && RATE_SALT.length >= 32;
}
function ready() {
  return CODE_GATE_OPEN && boundedWindow() && configured() && qaAllowlistReady() &&
    env('N10A740_PRODUCTION_ENABLED') === 'true';
}
function responseHeaders(origin) {
  return {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, private, max-age=0',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Pragma':'no-cache',
    'Vary':'Origin',
    ...(origin === ORIGIN ? {
      'Access-Control-Allow-Origin':ORIGIN,
      'Access-Control-Allow-Headers':'content-type,apikey,authorization,x-client-info,x-retry-count',
      'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Max-Age':'120'
    } : {})
  };
}
function respond(origin,status,code,additional={}) {
  return new Response(JSON.stringify({ok:status>=200 && status<300,code,...additional}),
    {status,headers:responseHeaders(origin)});
}
function nameKey(value) {
  if (typeof value !== 'string') return null;
  const v=value.trim().toLowerCase();
  return NAME_RE.test(v) && !RESERVED.has(v) ? v : null;
}
function adminHeaders(extra={}) {
  return {apikey:SERVICE,Authorization:'Bearer '+SERVICE,Accept:'application/json',...extra};
}
function clientHeaders(access='',extra={}) {
  return {apikey:PUBLISHABLE,...(access ? {Authorization:'Bearer '+access} : {}),
    Accept:'application/json',...extra};
}
function timeout(ms=8000) { return AbortSignal.timeout(ms); }
async function jsonResponse(resp) { return resp.json().catch(()=>null); }
async function hmacTag(input) {
  const key=await crypto.subtle.importKey('raw',enc.encode(RATE_SALT),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,enc.encode('n10a740:'+input));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
async function quota(bucket,max,seconds) {
  const r=await fetch(BASE+'/rest/v1/rpc/mmh_n10a740_take_attempt',{
    method:'POST',cache:'no-store',signal:timeout(),
    headers:adminHeaders({'Content-Type':'application/json'}),
    body:JSON.stringify({p_key:await hmacTag(bucket),p_limit:max,p_window_seconds:seconds})
  });
  if(!r.ok) throw Error('limiter_unavailable');
  const v=await jsonResponse(r);
  if(typeof v!=='boolean') throw Error('limiter_unavailable');
  return v;
}
// N10-A7.17: same token-HMAC namespace as the independent Siteverify QA.
// Atomic DB bucket means only one backend action can accept a given token.
// 600s protects beyond the five-minute Cloudflare token lifetime.
// Never persist raw token, JWT or account identifiers in this bucket.
async function claimSingleUseCaptcha(token) {
  const key=await crypto.subtle.importKey('raw',enc.encode(RATE_SALT),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,
    enc.encode('n10a15-token-single-use:'+token));
  const bucket=Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,'0')).join('');
  const r=await fetch(BASE+'/rest/v1/rpc/mmh_n10a740_take_attempt',{
    method:'POST',cache:'no-store',signal:timeout(),
    headers:adminHeaders({'Content-Type':'application/json'}),
    body:JSON.stringify({p_key:bucket,p_limit:1,p_window_seconds:600})
  });
  if(!r.ok) throw Error('single_use_unavailable');
  const v=await jsonResponse(r);
  if(typeof v!=='boolean') throw Error('single_use_unavailable');
  return v;
}
async function captcha(token,action) {
  if(typeof token!=='string' || token.length<20 || token.length>2048) return false;
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
    method:'POST',cache:'no-store',signal:timeout(),
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({secret:TURNSTILE_SECRET,response:token})
  });
  if(!r.ok) throw Error('captcha_unavailable');
  const j=await jsonResponse(r);
  return j?.success === true && j?.hostname === HOSTNAME && j?.action === action;
}
async function identity(access) {
  if(!access || typeof access!=='string' || access.length>8192) return null;
  const r=await fetch(BASE+'/auth/v1/user',{
    headers:clientHeaders(access),cache:'no-store',signal:timeout()
  });
  if(!r.ok) return null;
  const u=await jsonResponse(r);
  return typeof u?.id==='string' && u.id.length===36 ? u : null;
}
async function lookup(name) {
  const r=await fetch(BASE+'/rest/v1/mmh_n10a740_username_links?select=user_id&username_key=eq.'+
    encodeURIComponent(name)+'&limit=2',{
      headers:adminHeaders(),cache:'no-store',signal:timeout()
    });
  if(!r.ok) throw Error('lookup_unavailable');
  const rows=await jsonResponse(r);
  return Array.isArray(rows) && rows.length===1 && typeof rows[0]?.user_id==='string'
    ? rows[0].user_id : null;
}
async function verifiedEmail(uid) {
  const r=await fetch(BASE+'/auth/v1/admin/users/'+encodeURIComponent(uid),{
    headers:adminHeaders(),cache:'no-store',signal:timeout()
  });
  if(!r.ok) throw Error('user_lookup_unavailable');
  const u=await jsonResponse(r);
  if(u?.id!==uid || !u.email_confirmed_at || typeof u.email!=='string' || u.is_anonymous) return null;
  return u.email;
}
async function revokeProof(jwt) {
  if(!jwt) return;
  try {
    await fetch(BASE+'/auth/v1/logout?scope=local',{
      method:'POST',headers:clientHeaders(jwt),cache:'no-store',signal:timeout(5000)
    });
  } catch { /* best effort; access JWT may remain usable until expiry */ }
}
async function provePassword(email,password,expectedUid) {
  const r=await fetch(BASE+'/auth/v1/token?grant_type=password',{
    method:'POST',cache:'no-store',signal:timeout(10000),
    headers:clientHeaders('',{'Content-Type':'application/json'}),
    body:JSON.stringify({email,password})
  });
  if(!r.ok) return null;
  const grant=await jsonResponse(r);
  if(typeof grant?.access_token!=='string' || typeof grant?.refresh_token!=='string') return null;
  try {
    const verified=await identity(grant.access_token);
    return {grant,matches:verified?.id===expectedUid};
  } catch(err) {
    await revokeProof(grant.access_token);
    throw err;
  }
}
async function ownerProbe(jwt,uid) {
  // Production does not have Staging's QA probe fixture. This only checks
  // the AUTH identity; genuine RLS regression is a separate release gate.
  const actual=await identity(jwt);
  return actual?.id===uid;
}
async function claim(uid,name) {
  // One username per UID; uniqueness and reserved-name prevention are enforced
  // by both application and database. Caller MUST be a verified authenticated
  // account and must prove its own current password.
  const r=await fetch(BASE+'/rest/v1/mmh_n10a740_username_links',{
    method:'POST',headers:adminHeaders({
      'Content-Type':'application/json','Prefer':'return=minimal'
    }),
    body:JSON.stringify({user_id:uid,username_key:name}),
    cache:'no-store',signal:timeout()
  });
  if(r.status===409) return false; // collision never exposes existing user
  if(!r.ok) throw Error('claim_unavailable');
  return true;
}
// N10-A7.50: reuse existing MMHVAULT server-controlled admin membership.
 // Do NOT use user_metadata, user-provided email, or JWT role strings as admin proof.
async function verifiedAdmin(access) {
  const user=await identity(access); // live Auth server, not unverified JWT payload
  if(!user?.id || user.is_anonymous===true) return false;
  const r=await fetch(BASE+'/rest/v1/rpc/mmh_is_admin',{
    method:'POST',cache:'no-store',signal:timeout(6000),
    headers:clientHeaders(access,{'Content-Type':'application/json'}),
    body:'{}'
  });
  if(!r.ok) throw Error('admin_check_unavailable');
  return (await jsonResponse(r))===true;
}

async function handle(request) {
  const origin=request.headers.get('Origin');
  if(request.method==='OPTIONS' && origin!==ORIGIN) return respond(origin,403,'origin_not_allowed');
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers:responseHeaders(origin)});
  if(origin!==ORIGIN) return respond(origin,403,'origin_not_allowed');
  if(request.method!=='POST') return respond(origin,405,'method_not_allowed');
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')||''))
    return respond(origin,415,'json_required');
  // N10-A7.11: bound the byte count BEFORE assembling/parsing JSON.
  // Content-Length alone is untrusted; enforce the cap on streamed chunks too.
  let data;
  const contentLength=request.headers.get('content-length');
  if(contentLength!==null && (!/^\d+$/.test(contentLength) || Number(contentLength)>4000))
    return respond(origin,413,'payload_too_large');
  if(!request.body) return respond(origin,400,'bad_json');
  const reader=request.body.getReader();
  const parts=[];let bytes=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      bytes += value?.byteLength||0;
      if(bytes>4000) {
        await reader.cancel().catch(()=>{});
        return respond(origin,413,'payload_too_large');
      }
      parts.push(value);
    }
  } catch {
    return respond(origin,400,'bad_json');
  } finally {
    reader.releaseLock();
  }
  try {
    const buffer=new Uint8Array(bytes);
    let offset=0;
    for(const part of parts) { buffer.set(part,offset); offset+=part.byteLength; }
    data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));
    if(!data || typeof data!=='object' || Array.isArray(data)) throw Error('invalid');
  } catch {return respond(origin,400,'bad_json');}
  if(data.action==='preflight') return respond(origin,200,'preflight_ok',{
    enabled:ready(),scope:'production_candidate_disabled',version:'N10-A7.41',registration_enabled:false
  });
  // N10-A7.50 admin-only structural Secret-readiness check; this is NOT login readiness.
  // Invoked only with a user JWT accepted by platform verify_jwt=true, verified
  // again by Auth /user, and permitted by mmh_admin.members via mmh_is_admin().
  // Response body is a bare JSON boolean, with no secret/key names or values.
  if(data.action==='configuration_health') {
    const bearer=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('Authorization')||'')?.[1]||'';
    if(!bearer || bearer.length>8192) return respond(origin,403,'not_authorized');
    try {
      if(!await verifiedAdmin(bearer)) return respond(origin,403,'not_authorized');
      return new Response(JSON.stringify(configured()),{status:200,headers:responseHeaders(origin)});
    } catch {
      return respond(origin,503,'health_check_unavailable');
    }
  }
  if(!['login','bind'].includes(data.action)) return respond(origin,400,'unsupported_action');
  if(!ready()) return respond(origin,503,'n10a740_disabled');
  const username=nameKey(data.username);
  const password=data.password;
  if(!username || typeof password!=='string' || password.length<1 || password.length>128)
    return respond(origin,401,'invalid_credentials');
  let issued=null,handoff=false;
  try {
    // N10-A7.10 P1 fix: malformed/missing/failed Turnstile never consumes
    // an account or shared limiter bucket. Use independent HMAC'd username
    // buckets only; a global bucket would let one attacker block all users.
    // Note: CAPTCHA is single-use, validated server-side with hostname/action.
    if(!await captcha(data.captcha_token,
       data.action==='login'?'mmh_n10a740_login':'mmh_n10a740_bind'))
      return respond(origin,403,'verification_required');
    // Siteverify must pass before allocating a DB row. Atomic shared token
    // claim occurs BEFORE password exchange, username bind, and owner lookup.
    if(!await claimSingleUseCaptcha(data.captcha_token))
      return respond(origin,403,'verification_required');
    if(!ready()) return respond(origin,503,'n10a740_window_closed');
    if(!await quota(data.action+':username:'+username,8,900))
      return respond(origin,429,'too_many_attempts');
    if(data.action==='login') {
      const uid=await lookup(username);
      if(!uid || !qaUidAllowed(uid)) return respond(origin,401,'invalid_credentials');
      const email=await verifiedEmail(uid);
      if(!email) return respond(origin,401,'invalid_credentials');
      const proof=await provePassword(email,password,uid);
      if(!proof) return respond(origin,401,'invalid_credentials');
      issued=proof.grant;
      if(!proof.matches || !await ownerProbe(issued.access_token,uid))
        return respond(origin,503,'identity_check_unavailable');
      if(!ready()) return respond(origin,503,'n10a740_window_closed');
      handoff=true;
      return respond(origin,200,'login_success',{
        access_token:issued.access_token,refresh_token:issued.refresh_token,
        expires_in:issued.expires_in,token_type:'bearer'
      });
    }
    const bearer=/^Bearer\s+([^\s]+)$/i.exec(request.headers.get('Authorization')||'')?.[1]||'';
    const user=await identity(bearer);
    if(!user?.id || !user.email_confirmed_at || user.is_anonymous || !qaUidAllowed(user.id))
      return respond(origin,401,'authentication_required');
    if(!await quota('bind:user:'+user.id,5,900)) return respond(origin,429,'too_many_attempts');
    const email=await verifiedEmail(user.id);
    if(!email || email.toLowerCase()!==String(user.email||'').toLowerCase())
      return respond(origin,401,'authentication_required');
    const proof=await provePassword(email,password,user.id);
    if(!proof) return respond(origin,401,'invalid_credentials');
    issued=proof.grant;
    if(!proof.matches) return respond(origin,401,'invalid_credentials');
    if(!ready()) return respond(origin,503,'n10a740_window_closed');
    const claimed=await claim(user.id,username);
    return respond(origin,claimed?200:409,claimed?'bind_success':'username_unavailable');
  } catch {
    return respond(origin,503,'auth_service_unavailable');
  } finally {
    if(issued?.access_token && !handoff) await revokeProof(issued.access_token);
  }
}
Deno.serve(handle);
